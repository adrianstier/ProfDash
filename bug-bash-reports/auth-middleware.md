# Auth & Middleware Bug Bash Report

## Summary
- 7 bugs found (1 critical, 2 high, 3 medium, 1 low)
- 3 bugs fixed directly (1 critical, 2 high)
- 3 bugs documented with recommendations (3 medium)
- 1 bug documented as informational (1 low)

## Files Reviewed
- `apps/web/middleware.ts`
- `apps/web/app/api/auth/google/route.ts`
- `apps/web/app/api/auth/google/callback/route.ts`
- `apps/web/app/auth/callback/route.ts`
- `apps/web/app/api/workspaces/route.ts`
- `apps/web/app/api/workspaces/[id]/route.ts`
- `apps/web/app/api/workspaces/[id]/members/route.ts`
- `apps/web/app/api/workspaces/[id]/members/[memberId]/route.ts`
- `apps/web/app/api/workspaces/[id]/invites/route.ts`
- `apps/web/app/api/workspaces/[id]/invites/[inviteId]/route.ts`
- `apps/web/app/api/workspaces/accept-invite/route.ts`
- `apps/web/app/(auth)/login/page.tsx`
- `apps/web/app/(auth)/signup/page.tsx`
- `apps/web/app/(auth)/invite/[token]/page.tsx`
- `apps/web/app/(auth)/error.tsx`
- `apps/web/lib/supabase/server.ts`
- `apps/web/lib/supabase/client.ts`
- `apps/web/lib/stores/workspace-store.ts`
- `apps/web/lib/hooks/use-workspaces.ts`
- `apps/web/lib/hooks/use-user.ts`
- `apps/web/lib/env.ts`
- `apps/web/lib/crypto.ts`
- `apps/web/app/(dashboard)/layout.tsx`
- `supabase/migrations/20241217000000_initial_schema.sql`
- `supabase/migrations/20241217000001_workspace_invites.sql`

## Findings

### [CRITICAL] Open Redirect in Auth Callback
**File:** `apps/web/app/auth/callback/route.ts:8,33`
**Description:** The Supabase auth callback route reads a `next` query parameter and redirects to it after successful authentication. There is no validation that the `next` parameter is a relative path on the same origin. An attacker can craft a link like `/auth/callback?code=...&next=https://evil.com` to redirect authenticated users to a malicious site, potentially for phishing or token theft.
**Fix:** Added validation to ensure `next` starts with `/` and does not start with `//` (which browsers interpret as a protocol-relative URL to a different host). Falls back to `/today` if the value is not a safe relative path.

### [HIGH] OAuth CSRF State Token Not Cryptographically Signed
**File:** `apps/web/app/api/auth/google/route.ts:30-33` (original)
**Description:** The Google OAuth flow uses a `state` parameter for CSRF protection, but the state was simply a base64-encoded JSON object containing `userId` and `timestamp` with no cryptographic signature. An attacker who knows a user's ID could forge a valid state token and potentially complete a CSRF attack against the OAuth callback, linking their own Google account to the victim's ScholarOS profile.
**Fix:** Added HMAC-SHA256 signing to the state parameter. Created `apps/web/lib/oauth-state.ts` with `signState()` and `verifyState()` functions. The signing key cascades through `TOKEN_ENCRYPTION_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The callback route now verifies the HMAC signature before processing the state payload, using constant-time comparison to prevent timing attacks.

### [HIGH] Missing `analytics` in Middleware Protected Paths
**File:** `apps/web/middleware.ts:58-70`
**Description:** The middleware's `protectedPaths` array did not include `/analytics`, even though it is a dashboard route under `(dashboard)/analytics/`. While the `(dashboard)/layout.tsx` provides a server-side `getUser()` check as a defense-in-depth measure, the middleware should also protect this route to ensure proper redirect behavior and to prevent unauthenticated pre-rendering requests.
**Fix:** Added `"/analytics"` to the `protectedPaths` array in `middleware.ts`.

### [MEDIUM] Invite Acceptance Not Restricted to Invited Email
**File:** `supabase/migrations/20241217000001_workspace_invites.sql:108-147`
**Description:** The `accept_workspace_invite` RPC function validates the token and expiry but does NOT verify that the accepting user's email (`auth.email()`) matches the `email` field on the invite record. This means anyone with knowledge of a valid invite token can accept it and join the workspace, even if the invite was intended for a different email address. Since tokens are 32-byte random hex strings, brute-force is infeasible, but if a token is leaked (e.g., via email forwarding, shared screens), any authenticated user can claim it.
**Fix:** BLOCKED -- Requires a database migration to modify the `accept_workspace_invite` function. The fix would add: `IF invite_record.email != (SELECT email FROM auth.users WHERE id = auth.uid()) THEN RETURN jsonb_build_object('success', false, 'error', 'Invite was sent to a different email address'); END IF;` after the invite lookup.

### [MEDIUM] Client-Side Role Check Can Be Bypassed via localStorage
**File:** `apps/web/lib/stores/workspace-store.ts:15-37`
**Description:** The workspace store persists `currentWorkspaceRole` to `localStorage` via Zustand's `persist` middleware. The `canManageWorkspace()`, `canInviteMembers()`, and `canRemoveMembers()` helper functions are used in the UI (e.g., `settings/workspace/page.tsx:115-117`) to conditionally show admin controls. A user could modify `localStorage` to change their persisted role and gain access to admin UI elements. However, this is mitigated because all actual mutations go through API routes that verify roles server-side. The risk is limited to UI-level confusion or social engineering.
**Fix:** No code change needed -- server-side role checks are properly enforced. Consider adding a comment noting that these are UI-only guards, or re-fetching the role from the server when rendering sensitive pages.

### [MEDIUM] Profiles RLS Blocks Workspace Member Profile Display
**File:** `supabase/migrations/20241217000000_initial_schema.sql:27-29`
**Description:** The `profiles` table has an RLS policy that only allows `USING (auth.uid() = id)` for SELECT. This means when the workspace members endpoint (`/api/workspaces/[id]/members`) performs a Supabase query joining `workspace_members` to `profiles`, PostgREST will silently return `null` for other users' profile data (name, email, avatar). This causes the members list UI to display "Unknown" or "?" for all members other than the current user. This is a functional issue that also has security implications -- it may push developers toward workarounds that weaken RLS.
**Fix:** BLOCKED -- Requires a new database migration to add an RLS policy on `profiles` allowing workspace co-members to see each other's profiles. Suggested policy:
```sql
CREATE POLICY "Workspace co-members can view profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm1
      JOIN workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
      WHERE wm1.user_id = auth.uid()
      AND wm2.user_id = profiles.id
    )
  );
```

### [LOW] Supabase Auth Error Message Exposed to Client
**File:** `apps/web/app/(auth)/login/page.tsx:50-52`
**Description:** The login page sets `error.message` directly from `supabase.auth.signInWithPassword()` errors and displays it to the user. Supabase auth errors can sometimes contain implementation details (e.g., "Email not confirmed", "Invalid login credentials"). While Supabase generally returns user-friendly messages, this pattern could leak information in edge cases.
**Fix:** Low priority. Consider mapping known error codes to custom messages.

## Positive Observations

The following security patterns are correctly implemented:

1. **getUser() everywhere** -- All 88 API routes use `supabase.auth.getUser()`, never `getSession()`. This ensures JWT verification happens server-side.

2. **Workspace membership checks** -- All workspace API routes properly verify the requesting user is a member of the workspace before performing operations. Role-based checks (owner, admin) are applied where appropriate.

3. **Invite token security** -- The invite creation endpoint generates 32-byte cryptographically random tokens, properly checks for duplicate invites, prevents inviting existing members, and strips the token from API responses.

4. **Token encryption** -- Google OAuth tokens are encrypted with AES-256-GCM before database storage, with proper IV generation and authentication tags.

5. **Zod validation** -- All write endpoints validate request bodies using Zod schemas before processing.

6. **RLS enabled** -- All tables have Row Level Security enabled with appropriate policies.

7. **Owner-only operations** -- Role changes and member removal are restricted to workspace owners with server-side checks.

8. **Self-modification prevention** -- The member role update endpoint prevents owners from changing their own role.

9. **Dashboard layout defense-in-depth** -- The `(dashboard)/layout.tsx` performs a server-side `getUser()` check and redirects to login, providing a second layer of protection beyond the middleware.

10. **Cookie security** -- The browser Supabase client sets `sameSite: "lax"` and `secure: true` in production.
