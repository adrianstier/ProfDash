# Auth & Collaboration Bug Bash Report

## Critical Bugs

- **[apps/web/app/auth/callback/route.ts:8]** Open redirect vulnerability via `next` query parameter. The `next` parameter is read from the URL and used directly in `NextResponse.redirect(new URL(next, requestUrl.origin))` without any validation. An attacker can craft a URL like `/auth/callback?code=VALID_CODE&next=//evil.com` or `/auth/callback?code=VALID_CODE&next=https://evil.com` to redirect users to a malicious site after authentication. The `new URL(next, requestUrl.origin)` constructor resolves protocol-relative and absolute URLs, bypassing the origin.

- **[apps/web/app/api/messages/[id]/read/route.ts:48-56]** Race condition in read receipts causes data loss. The read-by array is read, checked for the user ID, then written back with the user appended. If two users mark the same message as read concurrently, the second write overwrites the first's update (lost update). This is a classic read-modify-write race condition without any optimistic locking or database-level append. Same issue on lines 131-145 in the bulk PUT handler, compounded by the sequential `for` loop.

- **[apps/web/app/api/messages/[id]/reactions/route.ts:62-93]** Same race condition pattern for reactions. The reactions JSON array is read, modified in-memory, then written back. Concurrent reaction additions by different users will cause one reaction to be silently dropped.

- **[apps/web/app/api/messages/[id]/route.ts:119-128]** RBAC bypass for pinning messages. The PATCH handler allows the message author to update `is_pinned` via the `UpdateMessageSchema`, but there is no role check. Any workspace member who authored a message can pin/unpin it. However, the separate `/pin` endpoint also allows any member to pin. The inconsistency means pinning policy is not enforced: the PATCH route only checks `existingMessage.user_id !== user.id` for text edits, but the `is_pinned` field update goes through the same author-only check on line 105, meaning non-authors cannot pin via PATCH. This creates inconsistent behavior between the two endpoints.

- **[apps/web/app/api/workspaces/[id]/members/[memberId]/route.ts:47-51]** IDOR in target member lookup. The `targetMember` is fetched by `memberId` alone (line 48-51) without filtering by `workspace_id`. An owner of workspace A could change the role of a member record from workspace B if they guess the `memberId` UUID, because the initial lookup does not include `.eq("workspace_id", id)`. The subsequent update on line 57-61 does filter by `workspace_id`, but the self-change check on line 53 uses the un-scoped result, which could match a member from a different workspace.

- **[apps/web/middleware.ts:58-76]** Missing protected routes. The `protectedPaths` array does not include `/analytics`, `/research`, `/agents`, `/chat`, or any API routes. While API routes have their own auth checks, dashboard routes like `/analytics` and `/research` are accessible without authentication because the middleware does not redirect unauthenticated users. If those pages are server-rendered with client-side data fetching, the page shell loads for unauthenticated users.

## Medium Issues

- **[apps/web/app/api/messages/route.ts:76-78]** Potential SQL injection via Supabase `.or()` filter. The `recipientId` and `user.id` values are interpolated directly into the `.or()` string template: `` `and(user_id.eq.${user.id},recipient_id.eq.${recipientId})` ``. While `user.id` comes from the auth token, `recipientId` comes from the query parameter `searchParams.get("recipient_id")`. If `recipientId` contains special characters like `)`, it could break the filter syntax. Supabase's PostgREST may reject malformed filters, but this is not validated input.

- **[apps/web/lib/hooks/use-chat.ts:250-265]** `useMarkMultipleAsRead` sends requests to wrong URL. The hook calls `fetch("/api/messages/read", { method: "PUT" })`, but the bulk read endpoint is defined at `/api/messages/[id]/read/route.ts` as a PUT handler. The URL `/api/messages/read` does not match any route file; it would need to be `/api/messages/[id]/read` with a specific ID. This means the bulk mark-as-read feature is broken -- it will always return 404.

- **[apps/web/app/api/messages/route.ts:121-124]** Incorrect cursor for pagination. After reversing the messages array on line 118, the `next_cursor` is taken from `data[data.length - 1].id` (line 123), which is the **oldest** message in the page (since `data` is sorted descending before reverse). For cursor-based backward pagination (`before` parameter), the cursor should be the ID of the oldest message to fetch the next older page. However, the cursor lookup on lines 99-107 fetches `created_at` from the cursor message and uses `lt("created_at", ...)`. If two messages share the same `created_at` timestamp, one could be skipped. This is a data-loss pagination edge case.

- **[apps/web/app/api/workspaces/route.ts:77-88]** TOCTOU race in slug uniqueness check. The slug is checked for uniqueness via a SELECT, then the workspace is created via RPC. Between the check and the create, another request could claim the same slug. The RPC function `create_workspace_with_owner` should handle uniqueness atomically via a UNIQUE constraint on the `slug` column; the pre-check gives a nice error message but is not authoritative.

- **[apps/web/app/api/presence/route.ts:82-83]** Missing validation of `workspace_id` before schema validation. The `workspace_id` is destructured from the body before Zod validation, meaning the field is excluded from the validated data. If `UpdatePresenceSchema` does not include `workspace_id`, an attacker could pass extra fields in the body that get spread into the upsert via `...validationResult.data` (line 123). The `workspace_id` is manually handled, but any extra validated fields go directly to the database.

- **[apps/web/app/api/presence/route.ts:167-168]** PATCH handler does not validate `is_typing` and `typing_in_conversation` with Zod. These values are taken directly from the request body without schema validation: `const { workspace_id, is_typing, typing_in_conversation } = body;`. A malicious client could send arbitrary types for these fields.

- **[apps/web/app/api/analytics/route.ts:9-14]** Analytics GET endpoint does not check for `authError`. Unlike other endpoints that check `if (authError || !user)`, this one only checks `if (!user)`. If `getUser()` returns an error but also returns a stale user object, the error is silently ignored.

- **[apps/web/app/api/analytics/events/route.ts:30-31]** Same pattern: analytics events POST does not check `authError` from `getUser()`.

- **[apps/web/app/api/analytics/events/route.ts:126-131]** Analytics events GET endpoint also does not check `authError`.

- **[apps/web/app/api/workspaces/[id]/invites/route.ts:141]** Invite token generated with `crypto.randomBytes(32).toString("hex")` is stored in plaintext in the database. If the database is compromised, all pending invite tokens are exposed. Best practice is to store a hash of the token and compare against the hash during acceptance.

- **[apps/web/app/api/workspaces/[id]/invites/route.ts:44-47]** Expired invites are not cleaned up. The GET handler filters by `expires_at > now` but expired invites remain in the database indefinitely. This is a data hygiene issue rather than a security bug, but large numbers of expired invites could accumulate.

- **[apps/web/components/chat/ChatPanel.tsx:321]** Supabase client created in component render body (`const supabase = createClient()`) rather than in a `useMemo` or as a stable reference. This creates a new client on every render, which could cause issues with channel subscriptions and reference equality checks.

- **[apps/web/components/chat/ChatPanel.tsx:393-398]** `supabase.auth.getUser()` called in a `useEffect` in a client component. The project's CLAUDE.md states "Always use `supabase.auth.getUser()` in server components, never `getSession()`". Using `getUser()` in a client component makes a network call on every mount. This should use `getSession()` for client-side or get the user from a context/provider.

- **[apps/web/components/chat/ChatPanel.tsx:447-448]** Real-time `postgres_changes` payload is cast to `ChatMessageWithUser` but the payload from Supabase does not include joined relations (like `user` and `reply_to_user`). The `payload.new` only contains the raw row, not the joined profile data. This means `message.user` will be `undefined` for real-time messages, causing "Unknown" to display until the next full fetch.

- **[apps/web/app/(auth)/invite/[token]/page.tsx:39-47]** The invite page automatically accepts the invite on mount via `useEffect`. If a user is not logged in, the `useAcceptInvite` hook calls `/api/workspaces/accept-invite` which returns 401, and the user sees a generic error. There is no redirect to login with a return URL, so the invite flow is broken for unauthenticated users -- they must manually log in first, then re-visit the invite link.

- **[apps/web/middleware.ts:72-76]** The `isProtectedPath` logic has a confusing condition: `request.nextUrl.pathname === "/" && !request.nextUrl.pathname.includes("login") && !request.nextUrl.pathname.includes("signup")`. Since `"/"` will never include `"login"` or `"signup"`, the `&&` conditions are always true, making them dead code. The intention seems to be protecting `/`, but line 80 immediately negates this with `request.nextUrl.pathname !== "/"`.

- **[apps/web/components/chat/ChatPanel.tsx:417-430]** The `useEffect` for marking messages as read has `markAsRead` in its dependency array. Since `markAsRead` is the return value of `useMarkMultipleAsRead()` (a `useMutation` hook), it gets a new reference on each render, causing this effect to fire on every render. This triggers repeated API calls to mark messages as read.

- **[apps/web/app/api/search/route.ts:283-299]** `searchProjects` does not filter by `user_id` when `workspaceId` is not provided. Unlike `searchTasks` and `searchPublications` which fall back to `.eq("user_id", userId)`, `searchProjects` has no fallback, potentially returning projects from all workspaces the user can access via RLS. This is inconsistent behavior and could leak cross-workspace project titles.

## Low / Code Quality

- **[apps/web/lib/hooks/use-workspaces.ts:31-40]** `WorkspaceInviteFromAPI` interface includes `token: string` (line 36), but the server never returns the token in list responses (it's excluded on line 168 of the invites route). The type is misleading and will cause TypeScript to believe `token` is always available.

- **[apps/web/components/activity/activity-feed.tsx and ActivityFeed.tsx]** Two files exist with different casings: `activity-feed.tsx` and `ActivityFeed.tsx`. On case-insensitive filesystems (macOS default), this could cause build conflicts or import confusion. On case-sensitive filesystems (Linux CI/CD), they are separate files which may cause confusion.

- **[apps/web/lib/hooks/use-presence.ts:6]** Unused import: `RealtimePresenceState` is imported from `@supabase/supabase-js` but the type annotation using it on line 216 receives it via the callback parameter already. The import may trigger unused-import lint warnings depending on configuration.

- **[apps/web/app/api/analytics/events/route.ts:214-215]** `navigator.sendBeacon` in `use-analytics-events.ts` sends raw JSON string but the `/api/analytics/events` POST endpoint expects the body to be parsed as JSON. `sendBeacon` with a string sets `Content-Type` to `text/plain`, which means Next.js `request.json()` may fail to parse the body, silently dropping analytics events on page hide.

- **[apps/web/lib/stores/analytics-store.ts:163]** `recordSearchSelection` method signature declares `(resultType: SearchResultType)` in the interface (line 71) but the implementation on line 163 ignores the parameter entirely: `recordSearchSelection: () => { ... }`. The `resultType` argument is accepted by the caller but unused.

- **[apps/web/components/search/command-palette.tsx:211-231]** Duplicate Cmd+K keyboard listener. Both the `CommandPalette` component (line 212-231) and `CommandPaletteProvider` (line 637-651) register their own `keydown` listeners for Cmd+K. When both are mounted, pressing Cmd+K triggers both handlers, which could cause the palette to open and immediately close (toggle twice).

- **[apps/web/app/api/workspaces/[id]/route.ts:10-12]** `UpdateWorkspaceSchema` allows arbitrary `settings: z.record(z.unknown())`. This allows any JSON to be stored in workspace settings without structure validation, which could be abused to store excessively large payloads.

- **[apps/web/app/api/onboarding/route.ts:172-176]** Dead code: the state transition validation block on lines 172-176 has an empty `if` body with only a comment. The check `if (currentProfile?.onboarding_completed && !updates.completed)` performs no action, making the validation a no-op.

- **[apps/web/components/presence/user-presence-indicator.tsx:172-236]** `PresenceManager` component creates `supabase = createClient()` in the render body and uses `updatePresence.mutate()` in the cleanup function of `useEffect`. The cleanup fires after the component unmounts, at which point the mutation may fail silently since the component is unmounted.

- **[apps/web/lib/hooks/use-presence.ts:148]** `useCallback` for `stopTyping` has `updateTyping` in its dependency array. Since `updateTyping` is the result of `useMutation()`, it gets a new identity on each render, which means `stopTyping` is recreated on every render, defeating the purpose of `useCallback`. This then cascades to `startTyping` which depends on `stopTyping`.

- **[apps/web/app/api/messages/[id]/route.ts:172-177]** Message DELETE does not verify the user is a member of the workspace. It only checks if the user is the message author. While this is acceptable for authorization (only author can delete), it means the workspace membership check is skipped, unlike the GET and PATCH handlers.

- **[apps/web/app/(auth)/signup/page.tsx:95-99]** The "Resend email" button on the signup success screen sets `setSuccess(false)` which takes the user back to the signup form. It does not actually resend the confirmation email. This is misleading UX.

- **[apps/web/middleware.ts:96-107]** The middleware matcher regex does not exclude API routes, meaning every API call also goes through the middleware and triggers a `getUser()` call for session refresh. This adds latency to all API requests. While not a bug, it is a performance concern since API routes already call `getUser()` themselves.

## Summary

6 critical, 17 medium, 13 low
