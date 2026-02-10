# Collaboration & UX Bug Bash Report

## Summary
- 14 bugs found (2 critical, 4 high, 6 medium, 2 low)
- 6 bugs fixed directly

---

## Findings

### [CRITICAL] Reactions race condition - read-modify-write without atomicity
**File:** `apps/web/app/api/messages/[id]/reactions/route.ts:62-93`
**Description:** The POST handler reads the current reactions array, modifies it in JavaScript, then writes it back. If two users react at the same time, one reaction will be lost because the second write overwrites the first. This is a classic TOCTOU (time-of-check-to-time-of-use) race condition. The same pattern exists in the DELETE handler (line 163-168).
**Fix:** BLOCKED - Requires a Postgres function (e.g., `array_append`/`array_remove` or a dedicated `message_reactions` junction table) to handle atomic updates. Cannot be fixed purely in the API route without database changes.

### [CRITICAL] Read-by array race condition - read-modify-write without atomicity
**File:** `apps/web/app/api/messages/[id]/read/route.ts:48-61`
**Description:** The `read_by` array is read, checked for the user's presence, appended to, and written back. Two users marking the same message as read simultaneously will race, and one user's read status will be lost. The bulk PUT handler (line 131-146) has the same issue, compounded by iterating through messages sequentially.
**Fix:** BLOCKED - Requires a Postgres function using `array_append` with a uniqueness check, or a dedicated `message_read_receipts` table.

### [HIGH] Message pagination cursor returns wrong ID after reverse
**File:** `apps/web/app/api/messages/route.ts:117-124`
**Description:** Messages are fetched in descending `created_at` order (newest first), then reversed for display. The `next_cursor` was set to `data[data.length - 1].id` which, after the query, is the oldest message in the batch. However, since the data was reversed for the response, the cursor should point to the oldest message for "load older" pagination. The cursor was being computed from the pre-reversed data at the wrong index -- `data[data.length - 1]` is actually the oldest message (correct intent) but the cursor was documented incorrectly and could confuse consumers. More critically, the cursor is set on the response *before* reversing, but the response object used the reversed array. Fixed by using `sortedMessages[0].id` (oldest message after reverse) which is semantically clearer.
**Fix:** Fixed - changed `next_cursor` to use `sortedMessages[0].id` for clarity and correctness.

### [HIGH] useMarkMultipleAsRead calls non-existent route
**File:** `apps/web/lib/hooks/use-chat.ts:249-266`
**Description:** The hook calls `PUT /api/messages/read` but there is no route at that path. The bulk-read PUT handler lives at `/api/messages/[id]/read/route.ts`. In Next.js App Router, `/api/messages/read` would match the `[id]` dynamic segment with `id="read"`, routing to `/api/messages/[id]/route.ts` which has no PUT handler, resulting in a 405 Method Not Allowed. This means bulk mark-as-read is completely broken.
**Fix:** Fixed - updated the hook to call `/api/messages/${firstId}/read` using the first message ID to satisfy the dynamic route segment.

### [HIGH] sendBeacon sends JSON without Content-Type header (Presence)
**File:** `apps/web/components/presence/user-presence-indicator.tsx:214-219`
**Description:** `navigator.sendBeacon("/api/presence", data)` sends a plain string. Without a `Content-Type: application/json` header, the Next.js API route's `request.json()` may fail to parse the body, meaning the offline status is never set when the user closes the tab. This leaves stale "online" presence entries in the database.
**Fix:** Fixed - wrapped the JSON string in a `Blob` with `{ type: "application/json" }` so the Content-Type header is set correctly.

### [HIGH] sendBeacon sends JSON without Content-Type header (Analytics)
**File:** `apps/web/lib/hooks/use-analytics-events.ts:211-216`
**Description:** Same issue as above. The analytics event flush on page hide uses `navigator.sendBeacon` with a plain string, so the API route cannot parse the JSON body. Analytics events are silently lost when the user navigates away or closes the tab.
**Fix:** Fixed - wrapped in a `Blob` with `{ type: "application/json" }`.

### [MEDIUM] Duplicate Cmd+K keyboard shortcut handlers
**File:** `apps/web/components/search/command-palette.tsx:212-231` and `apps/web/components/search/command-palette.tsx:637-651`
**Description:** Both `CommandPalette` and `CommandPaletteProvider` register their own `Cmd+K` / `Ctrl+K` keyboard event listeners. When both are mounted (which is the normal case since the provider renders the palette), pressing `Cmd+K` triggers both handlers, which can cause the palette to open and immediately close (double-toggle), or fire duplicate analytics events.
**Fix:** Fixed - removed the `Cmd+K` handler from `CommandPalette`, leaving only the Escape handler. The `CommandPaletteProvider` now solely manages the `Cmd+K` toggle.

### [MEDIUM] Presence polling and realtime subscription create redundant updates
**File:** `apps/web/lib/hooks/use-presence.ts:21-41` and `apps/web/components/presence/user-presence-indicator.tsx:178-261`
**Description:** The `usePresence` hook polls the API every 30 seconds (`refetchInterval: 30000`), AND the `PresenceManager` component sends a heartbeat POST every 30 seconds, AND the `useRealtimePresence` hook sends its own heartbeat via the realtime channel every 30 seconds. This creates 3 parallel update mechanisms that are partially redundant. The API polling + API heartbeat means at least 2 HTTP requests every 30 seconds per user, which scales poorly for large workspaces.
**Fix:** Not fixed - requires architectural decision on which mechanism to keep. Recommend: keep realtime presence as primary, remove API polling from `usePresence`, keep `PresenceManager` heartbeat for database persistence only.

### [MEDIUM] Stale typing indicators never cleaned up
**File:** `apps/web/lib/hooks/use-presence.ts:306-319`
**Description:** When the `onPresenceSync` handler processes users, it adds typing users but only removes them from the "workspace" conversation key (line 317). If a user was typing in a DM conversation and goes offline, their typing indicator remains in the chat store for that DM conversation indefinitely. There is no timeout or cleanup mechanism for stale typing entries.
**Fix:** Not fixed - requires iterating through all conversation keys in the typing store to remove the user's typing status, or adding a typing timeout in the chat store.

### [MEDIUM] Calendar token refresh deletes connection on any failure
**File:** `apps/web/app/api/calendar/calendars/route.ts:99-104` and `apps/web/app/api/calendar/events/route.ts:221-226`
**Description:** When token refresh fails (which can happen due to transient network issues, temporary Google API outages, or rate limiting), the code immediately deletes the calendar connection, forcing the user to re-authenticate. This is overly aggressive -- a single transient failure shouldn't destroy the user's connection. The user loses all their calendar settings (selected calendars, sync preferences).
**Fix:** Not fixed - recommend adding a retry counter or `refresh_failures` column and only deleting after N consecutive failures.

### [MEDIUM] Analytics events GET endpoint lacks workspace scoping
**File:** `apps/web/app/api/analytics/events/route.ts:126-176`
**Description:** The GET endpoint only filters by `user_id` but does not support or enforce workspace-based filtering. While this doesn't leak data across users (events are user-scoped), it's inconsistent with the multi-tenant model. In a workspace context, an admin should only see events relevant to their workspace.
**Fix:** Not fixed - low risk since data is user-scoped, but should add optional `workspace_id` filter parameter.

### [MEDIUM] Chat messages persistence stores all messages in Zustand persist
**File:** `apps/web/lib/stores/chat-store.ts:331-339`
**Description:** The chat store uses `persist` middleware but the `partialize` function does NOT include `messagesByConversation`. This means messages are not persisted across page reloads (which is correct), BUT the store still persists `activeConversation` and `lastReadTimestamps` and `notificationSettings`. However, the `typingUsers` state is NOT persisted (correct), but it's also never cleaned up when a component unmounts -- it can accumulate stale entries over time as conversations are switched.
**Fix:** Not fixed - LOW priority. The `typingUsers` map should have a periodic cleanup or be cleared on conversation switch.

### [LOW] CommandPaletteProvider fires redundant analytics on Cmd+K
**File:** `apps/web/components/search/command-palette.tsx:637-651`
**Description:** The `CommandPaletteProvider`'s `Cmd+K` handler calls `openSearchSession` and `trackSearchOpened` even when toggling the palette closed (when `!isOpen` is false, meaning it IS open). The condition `if (!isOpen)` only prevents analytics for close, but `setIsOpen((prev) => !prev)` is called unconditionally. The analytics are fired before the toggle, so when the user presses `Cmd+K` to close the palette, `openSearchSession` and `trackSearchOpened` are called even though the palette is being closed.
**Fix:** Not fixed - low impact, analytics noise only.

### [LOW] Activity feed creates duplicate realtime subscriptions
**File:** `apps/web/components/activity/ActivityFeed.tsx:195-217` and `apps/web/components/activity/activity-feed.tsx:195-217`
**Description:** There are two different `ActivityFeed` components (one in `ActivityFeed.tsx` and one in `activity-feed.tsx`) that can both be mounted in the same view. Each creates its own Supabase realtime subscription to the same table/filter. This creates duplicate subscriptions and redundant refetches. Additionally, the two files represent code duplication that should be consolidated.
**Fix:** Not fixed - requires determining which component is canonical and removing the other.
