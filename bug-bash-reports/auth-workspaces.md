# Auth & Workspaces Module Bug Report

**Audit Date:** 2026-02-09
**Scope:** Auth & Workspaces module
**Auditor:** Claude (Sonnet 4.5)

---

## Critical Bugs

### 1. Invite Page Missing Authentication Check
**File:** `apps/web/app/(auth)/invite/[token]/page.tsx`
**Lines:** 1-104
**Severity:** CRITICAL - Auth Bypass

**Issue:**
The invite acceptance page does NOT require authentication before attempting to accept an invite. The page is in the `(auth)` route group, which middleware does NOT protect (middleware only protects dashboard routes). An unauthenticated user can visit `/invite/[token]` and the page will attempt to call `acceptInvite.mutateAsync(token)` which makes an authenticated API call, but the page itself never checks if the user is logged in first.

**Impact:**
- Users who are not logged in will see a loading spinner indefinitely or get a cryptic error
- Poor UX: users clicking invite links while logged out won't be prompted to log in first
- The API call will fail with 401, but the page doesn't handle this properly

**Expected Behavior:**
The page should check authentication status first and redirect to `/login?redirect=/invite/[token]` if not authenticated.

**Actual Behavior:**
Page loads and immediately tries to accept invite without checking auth status.

**Code:**
```typescript
// apps/web/app/(auth)/invite/[token]/page.tsx
// NO authentication check before calling accept()
useEffect(() => {
  if (!token) {
    setStatus("error");
    setError("Invalid invite link");
    return;
  }
  accept(); // ❌ Called without checking if user is authenticated
}, [token, accept]);
```

---

### 2. Middleware Does Not Protect Invite Route
**File:** `apps/web/middleware.ts`
**Lines:** 58-91
**Severity:** CRITICAL - Auth Bypass

**Issue:**
The middleware's protected paths list does NOT include `/invite` routes. This means invite acceptance pages are completely unprotected at the middleware level.

**Code:**
```typescript
// middleware.ts lines 58-70
const protectedPaths = [
  "/today",
  "/upcoming",
  "/board",
  "/list",
  "/calendar",
  "/projects",
  "/publications",
  "/grants",
  "/personnel",
  "/teaching",
  "/settings",
]; // ❌ Missing "/invite"
```

**Impact:**
Invite routes are accessible without authentication at the middleware level, relying solely on API-level protection.

**Recommendation:**
Add `/invite` to the protected paths OR add explicit auth check in the invite page component.

---

### 3. Insecure Invite Token Storage in Response
**File:** `apps/web/app/api/workspaces/[id]/invites/route.ts`
**Lines:** 162-172
**Severity:** MEDIUM - Information Disclosure

**Issue:**
When creating an invite, the code attempts to exclude the token from the response but the comment says "Email sending is pending implementation", which means tokens might be exposed to API consumers in the interim.

**Code:**
```typescript
// Line 165-168
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { token: _token, ...safeInvite } = invite;
return NextResponse.json({
  ...safeInvite,
  message: "Invite created. Email sending is pending implementation.",
}, { status: 201 });
```

**Analysis:**
The code DOES properly strip the token, but the "pending implementation" message suggests the invite system is incomplete. If email sending is not implemented, how are tokens delivered to invitees? This could lead to tokens being logged, exposed in responses, or shared insecurely.

**Recommendation:**
- Implement email sending before deploying invite system
- Add rate limiting to invite creation
- Add audit logging for all invite operations

---

## Medium Bugs

### 4. Missing Admin Role Check in Member Removal
**File:** `apps/web/app/api/workspaces/[id]/members/[memberId]/route.ts`
**Lines:** 100-114
**Severity:** MEDIUM - RBAC Weakness

**Issue:**
The DELETE endpoint only checks if the user is an "owner" to remove other members. However, the policy at line 39 of `20241217000001_workspace_invites.sql` suggests both "owner" and "admin" should be able to delete invites. This inconsistency could be intentional but should be verified.

**Code:**
```typescript
// Line 109
const isOwner = currentMembership?.role === "owner";
```

**RLS Policy (for comparison):**
```sql
-- Line 235-245 in workspace_invites migration
-- Owners can remove members (except themselves)
CREATE POLICY "Owners can remove members"
  ON workspace_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role = 'owner'
    )
    AND user_id != auth.uid()
  );
```

**Recommendation:**
Document whether this restriction is intentional. If admins should be able to remove members, update the API route to allow `role === 'admin'` as well.

---

### 5. Potential Race Condition in Workspace Creation
**File:** `apps/web/app/api/workspaces/route.ts`
**Lines:** 76-88
**Severity:** MEDIUM - Race Condition

**Issue:**
The slug uniqueness check is performed BEFORE calling the RPC function. If two requests with the same slug arrive simultaneously, both could pass the check and attempt to create workspaces with the same slug.

**Code:**
```typescript
// Lines 76-88
const { data: existing } = await supabase
  .from("workspaces")
  .select("id")
  .eq("slug", slug)
  .single();

if (existing) {
  return NextResponse.json(
    { error: "Workspace with this slug already exists" },
    { status: 409 }
  );
}

// Race window here - another request could create the same slug
const { data: workspaceId, error: createError } = await supabase.rpc(
  "create_workspace_with_owner",
  { workspace_name: name, workspace_slug: slug }
);
```

**Recommendation:**
- Rely on the database UNIQUE constraint (which exists: line 45 in initial schema: `slug TEXT UNIQUE NOT NULL`)
- Catch the unique violation error from the RPC call and return a 409 with an appropriate message
- OR use a database transaction to lock the row during the check

---

### 6. Google OAuth State Token Not Stored Server-Side
**File:** `apps/web/app/api/auth/google/route.ts`
**Lines:** 29-33
**Severity:** MEDIUM - Security Weakness

**Issue:**
The OAuth state token is generated but not stored server-side before being sent to Google. In the callback handler (`google/callback/route.ts` lines 49-64), the state is validated by decoding it and checking the timestamp, but there's no verification that this state was actually generated by the server. An attacker could craft a valid-looking state token.

**Code:**
```typescript
// google/route.ts line 29-33
const state = Buffer.from(JSON.stringify({
  userId: user.id,
  timestamp: Date.now(),
})).toString("base64");
// ❌ Not stored in database or session
```

**Callback validation:**
```typescript
// google/callback/route.ts line 50-64
let stateData: { userId: string; timestamp: number };
try {
  stateData = JSON.parse(Buffer.from(state, "base64").toString());
} catch {
  return NextResponse.redirect(
    new URL("/settings?error=invalid_state", request.url)
  );
}

// Check state isn't too old (15 minutes max)
if (Date.now() - stateData.timestamp > 15 * 60 * 1000) {
  // ...
}
```

**Issue:**
An attacker could:
1. Create a state token with a recent timestamp and any user ID
2. Use that in a CSRF attack to link their Google account to a victim's ScholarOS account

**Mitigation Already Present:**
The code DOES check that `user.id !== stateData.userId` (line 69), which prevents the most obvious attack. However, best practice is to store state tokens server-side.

**Recommendation:**
- Store state tokens in database/cache with TTL
- Validate that the state exists and hasn't been used before accepting it
- Delete state token after use to prevent replay

---

### 7. Token Encryption Key Optional in Production
**File:** `apps/web/lib/crypto.ts`
**Lines:** 18-29
**Severity:** MEDIUM - Security Weakness

**Issue:**
The encryption system returns `null` if `TOKEN_ENCRYPTION_KEY` is not set in production, but then the `encryptToken` function returns the plaintext token (line 46). This means if the env var is missing, OAuth tokens will be stored unencrypted in the database.

**Code:**
```typescript
// Lines 18-29
function getEncryptionKey(): Buffer | null {
  const keyHex = process.env.TOKEN_ENCRYPTION_KEY;

  if (!keyHex) {
    if (process.env.NODE_ENV === "production") {
      console.error("TOKEN_ENCRYPTION_KEY is required in production");
      return null; // ❌ Returns null instead of throwing
    }
    console.warn("TOKEN_ENCRYPTION_KEY not set - tokens will NOT be encrypted");
    return null;
  }

  return Buffer.from(keyHex, "hex");
}

// Lines 41-47
export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey();

  if (!key) {
    // Return plaintext if no key (dev mode only)
    return plaintext; // ❌ Also happens in production if key is missing
  }
  // ...
}
```

**Recommendation:**
Throw an error in production if `TOKEN_ENCRYPTION_KEY` is missing:
```typescript
if (!keyHex) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("TOKEN_ENCRYPTION_KEY is required in production");
  }
  // ...
}
```

---

## Low Bugs

### 8. Missing CSRF Protection on OAuth Callback
**File:** `apps/web/app/api/auth/google/callback/route.ts`
**Lines:** 66-73
**Severity:** LOW - Defense in Depth

**Issue:**
The OAuth callback verifies that the state's `userId` matches the authenticated user (line 69), which is good. However, the state token itself could be intercepted and replayed if an attacker can MitM the OAuth callback redirect.

**Code:**
```typescript
// Lines 66-73
const supabase = await createClient();
const { data: { user }, error: authError } = await supabase.auth.getUser();

if (authError || !user || user.id !== stateData.userId) {
  return NextResponse.redirect(
    new URL("/settings?error=unauthorized", request.url)
  );
}
```

**Recommendation:**
- Serve the entire app over HTTPS (should already be the case on Vercel)
- Use SameSite=Lax cookies (already configured in `lib/supabase/client.ts` line 11)
- Consider adding a nonce to the state token

**Status:** This is already well-protected but worth noting for defense in depth.

---

### 9. Workspace Store Persists to localStorage
**File:** `apps/web/lib/stores/workspace-store.ts`
**Lines:** 15-37
**Severity:** LOW - Privacy Concern

**Issue:**
The workspace store uses `persist` middleware with default storage (localStorage), which means the current workspace ID and role are stored in the browser's localStorage. If a user's device is compromised, an attacker could read the workspace ID.

**Code:**
```typescript
export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      currentWorkspaceId: null,
      currentWorkspaceRole: null,
      // ...
    }),
    {
      name: "workspace-storage", // Stored in localStorage
    }
  )
);
```

**Recommendation:**
- This is probably acceptable for workspace ID (not sensitive)
- Do NOT persist sensitive data like tokens in localStorage
- Consider using sessionStorage instead of localStorage if workspace context should be cleared on tab close

---

### 10. Missing Rate Limiting on Auth Routes
**File:** `apps/web/app/api/auth/google/route.ts`, `apps/web/app/api/workspaces/accept-invite/route.ts`
**Severity:** LOW - DoS Risk

**Issue:**
There's no rate limiting on authentication-related routes. An attacker could:
- Spam Google OAuth initiation requests
- Attempt brute-force on invite tokens
- Exhaust server resources with invite acceptance attempts

**Recommendation:**
- Implement rate limiting using the `rate-limit.ts` utility
- Apply limits to:
  - `/api/auth/google` (GET)
  - `/api/workspaces/accept-invite` (POST)
  - `/api/workspaces/[id]/invites` (POST)

---

### 11. Invite Token Length May Be Insufficient
**File:** `apps/web/app/api/workspaces/[id]/invites/route.ts`
**Line:** 141
**Severity:** LOW - Security Hardening

**Issue:**
Invite tokens are 32 bytes (64 hex characters), which is good. However, with no rate limiting, an attacker could potentially brute-force tokens if they know a target email address.

**Code:**
```typescript
const token = crypto.randomBytes(32).toString("hex");
```

**Analysis:**
32 bytes = 256 bits of entropy, which is cryptographically strong. With rate limiting, this is sufficient. Without rate limiting, consider:
- Increasing to 48 bytes
- Adding per-workspace rate limits
- Logging failed acceptance attempts

**Recommendation:**
Add rate limiting (see bug #10) rather than increasing token size.

---

### 12. Login Page Allows Unlimited OAuth Attempts
**File:** `apps/web/app/(auth)/login/page.tsx`
**Lines:** 64-85
**Severity:** LOW - DoS Risk

**Issue:**
The `handleOAuthLogin` function has no rate limiting or cooldown. A malicious actor could repeatedly trigger OAuth flows.

**Code:**
```typescript
const handleOAuthLogin = async (provider: OAuthProvider) => {
  setError(null);
  setOauthLoading(provider);

  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    // ...
  }
}
```

**Recommendation:**
- Add client-side cooldown (e.g., disable button for 5 seconds after click)
- Add server-side rate limiting on OAuth initiation endpoint

---

## Files Reviewed

### API Routes (11 files)
- ✅ `apps/web/app/api/auth/google/route.ts`
- ✅ `apps/web/app/api/auth/google/callback/route.ts`
- ✅ `apps/web/app/api/workspaces/route.ts` (GET, POST)
- ✅ `apps/web/app/api/workspaces/[id]/route.ts` (GET, PATCH)
- ✅ `apps/web/app/api/workspaces/[id]/members/route.ts` (GET)
- ✅ `apps/web/app/api/workspaces/[id]/members/[memberId]/route.ts` (PATCH, DELETE)
- ✅ `apps/web/app/api/workspaces/[id]/invites/route.ts` (GET, POST)
- ✅ `apps/web/app/api/workspaces/[id]/invites/[inviteId]/route.ts` (DELETE)
- ✅ `apps/web/app/api/workspaces/accept-invite/route.ts` (POST)
- ✅ `apps/web/app/api/onboarding/route.ts` (GET, PATCH)

### Middleware & Core (3 files)
- ✅ `apps/web/middleware.ts`
- ✅ `apps/web/lib/supabase/server.ts`
- ✅ `apps/web/lib/supabase/client.ts`

### Auth Pages (3 files)
- ✅ `apps/web/app/(auth)/login/page.tsx`
- ✅ `apps/web/app/(auth)/signup/page.tsx`
- ✅ `apps/web/app/(auth)/invite/[token]/page.tsx`

### Hooks & Stores (3 files)
- ✅ `apps/web/lib/hooks/use-workspaces.ts`
- ✅ `apps/web/lib/hooks/use-user.ts`
- ✅ `apps/web/lib/stores/workspace-store.ts`

### Security Utilities (2 files)
- ✅ `apps/web/lib/crypto.ts`
- ✅ `apps/web/lib/env.ts`

### Database Migrations (2 files)
- ✅ `supabase/migrations/20241217000000_initial_schema.sql`
- ✅ `supabase/migrations/20241217000001_workspace_invites.sql`

### Tests (2 files)
- ✅ `apps/web/__tests__/api/workspaces.test.ts`
- ✅ `apps/web/__tests__/lib/middleware.test.ts`

**Total Files Reviewed:** 26

---

## Verdict: NEEDS_FIX

**Critical Issues:** 3
**Medium Issues:** 7
**Low Issues:** 5

### Summary

The Auth & Workspaces module has **three critical bugs** that should be addressed before production:

1. **Invite page missing authentication check** - Users clicking invite links while logged out will have a poor experience and see errors
2. **Middleware does not protect invite routes** - Invite pages are unprotected at the middleware level
3. **Insecure invite token storage** - Token security depends on proper email implementation which is marked as "pending"

### Positive Findings

✅ All API routes properly check authentication with `supabase.auth.getUser()`
✅ RLS policies are comprehensive and well-designed
✅ OAuth state validation includes timestamp checks
✅ Token encryption is implemented (though needs hardening)
✅ RBAC checks are present on all workspace mutation operations
✅ Workspace slug uniqueness is enforced at database level
✅ Comprehensive test coverage for workspace APIs

### Recommendations

**High Priority:**
1. Add authentication check to invite page OR add `/invite` to middleware protected paths
2. Implement email sending for invites before deploying invite system
3. Make `TOKEN_ENCRYPTION_KEY` required in production (throw error if missing)

**Medium Priority:**
4. Add rate limiting to all auth and invite endpoints
5. Store OAuth state tokens server-side with TTL
6. Document whether admins can remove members (inconsistency between code and docs)

**Low Priority:**
7. Add client-side cooldowns on OAuth buttons
8. Consider sessionStorage instead of localStorage for workspace context
9. Add audit logging for all sensitive operations (invite accept, member removal, role changes)

---

**Audit Completed:** 2026-02-09
**Recommendation:** Address critical and high-priority issues before production deployment
