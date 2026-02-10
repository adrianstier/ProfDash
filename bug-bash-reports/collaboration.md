# Collaboration Module Bug Report

**Module:** Collaboration (Chat, Messages, Activity, Presence, Search, Analytics)
**Auditor:** Bug Bash Agent
**Date:** 2026-02-09
**Scope:** API routes, hooks, stores, realtime, components

---

## Critical Bugs

### 1. **Race Condition: Concurrent Message Read Updates**
**Location:** `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/messages/[id]/read/route.ts:48-62`
**Severity:** Critical
**Type:** Race condition / Data corruption

**Issue:**
The bulk mark-as-read endpoint (PUT) at `/api/messages/read` has a critical race condition when multiple users concurrently mark the same message as read. The operation is:
1. Fetch current `read_by` array
2. Filter out user if already present
3. Add user to array
4. Update message

If two users mark the same message as read simultaneously, one user's read status can be lost due to the read-modify-write pattern without atomic operations.

**Code:**
```typescript
// Line 48-56 in read/route.ts - POST /api/messages/[id]/read
const currentReadBy = message.read_by || [];
if (!currentReadBy.includes(user.id)) {
  const newReadBy = [...currentReadBy, user.id];

  const { error } = await supabase
    .from("workspace_messages")
    .update({ read_by: newReadBy })
    .eq("id", id);
```

**Impact:**
- User read receipts can be lost in high-traffic workspaces
- Unread badge counts become incorrect
- Users may see messages as unread when they've already read them

**Recommendation:**
Use PostgreSQL array operations with `array_append` to make the update atomic, or use Supabase's RPC to handle this server-side.

---

### 2. **Security: Missing Workspace Authorization Check in PUT /api/messages/read**
**Location:** `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/messages/[id]/read/route.ts:75-156`
**Severity:** Critical
**Type:** Security / Authorization bypass

**Issue:**
The `PUT /api/messages/read` endpoint (bulk mark as read) has an incomplete authorization check. While it verifies workspace membership for each message, it does NOT verify that the `message_ids` array submitted by the client actually contains valid message IDs. An attacker could submit an empty array or manipulated IDs, or the endpoint could be used to determine which workspace IDs exist by observing the 403 vs 404 responses.

Additionally, line 121 checks `unauthorizedMessages.length > 0`, but there's a logic gap: if `memberWorkspaceIds` is empty (the user is not a member of ANY workspace), ALL messages will be considered unauthorized, but the error message doesn't distinguish between "you're not in this workspace" and "these messages don't exist."

**Code:**
```typescript
// Line 112-128
const workspaceIds = [...new Set(messages.map((m) => m.workspace_id))];
const { data: memberships } = await supabase
  .from("workspace_members")
  .select("workspace_id")
  .eq("user_id", user.id)
  .in("workspace_id", workspaceIds);

const memberWorkspaceIds = new Set(memberships?.map((m) => m.workspace_id) || []);
const unauthorizedMessages = messages.filter((m) => !memberWorkspaceIds.has(m.workspace_id));

if (unauthorizedMessages.length > 0) {
  return NextResponse.json(
    { error: "Not authorized to access some messages" },
    { status: 403 }
  );
}
```

**Impact:**
- Information disclosure: Attackers can probe for valid workspace IDs
- Confusing error messages for legitimate users

**Recommendation:**
1. Validate that all `message_ids` are valid UUIDs before querying
2. Return consistent error messages that don't leak existence information
3. Consider rate limiting this endpoint

---

### 3. **Memory Leak: Realtime Channel Not Cleaned Up on Workspace Switch**
**Location:** `/Users/adrianstier/ProfDash/scholaros/apps/web/lib/hooks/use-presence.ts:387`
**Severity:** Critical
**Type:** Memory leak / Resource exhaustion

**Issue:**
The `useRealtimePresence` hook properly cleans up channels on unmount, but if the `workspaceId` prop changes while the component remains mounted, the old channel is never disconnected. The cleanup function uses `removeWorkspaceChannel(workspaceId)`, but `workspaceId` in the cleanup closure refers to the CURRENT value, not the value when the channel was created.

**Code:**
```typescript
// Line 296-387 in use-presence.ts
useEffect(() => {
  if (!workspaceId || !currentUser) {
    return;
  }

  const channel = getWorkspaceChannel(workspaceId);
  // ... setup code ...

  return () => {
    // BUG: workspaceId here is the CURRENT value, not the value when channel was created
    removeWorkspaceChannel(workspaceId);
    setIsConnected(false);
  };
}, [workspaceId, currentUser, parsePresenceState, addTypingUser, removeTypingUser, trackActivity]);
```

**Impact:**
- Memory leak: Old channels accumulate in the `workspaceChannels` Map
- WebSocket connections remain open, eventually exhausting browser limits
- Performance degradation over time
- Potential state corruption if old channels fire events

**Recommendation:**
Capture the `workspaceId` in a ref or variable within the effect:
```typescript
useEffect(() => {
  if (!workspaceId || !currentUser) return;

  const channelWorkspaceId = workspaceId; // Capture in closure
  const channel = getWorkspaceChannel(channelWorkspaceId);

  // ... setup ...

  return () => {
    removeWorkspaceChannel(channelWorkspaceId); // Use captured value
    setIsConnected(false);
  };
}, [workspaceId, currentUser, ...]);
```

---

## Medium Bugs

### 4. **SQL Injection: Missing LIKE Pattern Escaping in Search**
**Location:** `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/search/route.ts:34-36`
**Severity:** Medium
**Type:** Security / SQL pattern injection

**Issue:**
While the search API correctly escapes LIKE pattern special characters (`%`, `_`, `\`) on line 128, the implementation is correct. However, there's a potential issue in how the escaped query is used: the function `escapeLikePattern` is called, but then the pattern is wrapped with `%` on both sides in lines 241-292. This means a user searching for `%admin%` will have it escaped to `\%admin\%`, then wrapped to `%\%admin\%`, which will NOT match the literal string `%admin%`.

Actually, on closer inspection, this is CORRECT behavior - the escaping prevents the user's `%` from acting as a wildcard, and the wrapping `%` makes it a substring search. This is NOT a bug.

**Status:** False alarm - implementation is correct.

---

### 5. **Performance: Missing Index on workspace_messages.read_by**
**Location:** N/A (database schema)
**Severity:** Medium
**Type:** Performance

**Issue:**
The `workspace_messages` table has a `read_by` JSONB array column, but there's no GIN index on it. Queries like "find all unread messages for user X" require a sequential scan of the entire table and array unpacking.

**Impact:**
- Slow query performance for "mark all as read" operations
- Slow unread count calculations
- Database CPU usage spikes with many messages

**Recommendation:**
Add a GIN index:
```sql
CREATE INDEX idx_workspace_messages_read_by ON workspace_messages USING GIN(read_by);
```

---

### 6. **Stale Closure: Typing Indicator Timeout Uses Stale Refs**
**Location:** `/Users/adrianstier/ProfDash/scholaros/apps/web/lib/hooks/use-presence.ts:123-171`
**Severity:** Medium (Fixed)
**Type:** Stale closure

**Issue:**
This bug has already been FIXED. The code uses refs (`workspaceIdRef`, `conversationKeyRef`) to avoid stale closures in the `setTimeout` callback. Lines 127-130 keep the refs in sync with props.

**Code (Fixed):**
```typescript
// Lines 123-130 - Refs prevent stale closures
const workspaceIdRef = useRef(workspaceId);
const conversationKeyRef = useRef(conversationKey);

useEffect(() => {
  workspaceIdRef.current = workspaceId;
  conversationKeyRef.current = conversationKey;
}, [workspaceId, conversationKey]);
```

**Status:** Already fixed - no action needed.

---

### 7. **Missing Error Handling: Search History Graceful Degradation**
**Location:** `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/search/history/route.ts:104-115`
**Severity:** Medium
**Type:** Error handling

**Issue:**
The GET endpoint gracefully handles missing tables (42P01 error), but returns inconsistent response shapes. Sometimes it returns `{ searches: [], message: "..." }`, other times just `{ searches: [] }`. The POST endpoint has similar inconsistency.

**Code:**
```typescript
// Line 104-115
if (error) {
  if (error.code === "42P01" || error.message?.includes("does not exist")) {
    return NextResponse.json({
      searches: [],
      message: "Search history not yet available",
    });
  }
  // ...
}

// Line 135-138 - No message field
return NextResponse.json({
  searches: uniqueSearches,
  count: uniqueSearches.length,
});
```

**Impact:**
- Frontend code needs to handle multiple response shapes
- Inconsistent API contracts

**Recommendation:**
Always include both `searches` and `count` fields. Use `message` as an optional field consistently.

---

### 8. **Missing Validation: Analytics Events User ID Mismatch**
**Location:** `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/analytics/events/route.ts:66-72`
**Severity:** Medium
**Type:** Security / Data integrity

**Issue:**
The analytics events endpoint validates that all `event.user_id` fields match the authenticated user (line 66), but doesn't check if the `workspace_id` in each event is valid or if the user is a member of that workspace. A malicious user could submit events for workspaces they don't belong to.

**Code:**
```typescript
// Line 66-72
const invalidEvents = events.filter((event) => event.user_id !== user.id);
if (invalidEvents.length > 0) {
  return NextResponse.json(
    { error: "Events must belong to authenticated user" },
    { status: 403 }
  );
}
```

**Impact:**
- Analytics data pollution
- Users can inject events into other workspaces
- Skewed metrics and reports

**Recommendation:**
Add workspace membership validation:
```typescript
const workspaceIds = [...new Set(events.map(e => e.workspace_id).filter(Boolean))];
if (workspaceIds.length > 0) {
  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .in("workspace_id", workspaceIds);

  const validWorkspaces = new Set(memberships?.map(m => m.workspace_id));
  const invalidWorkspace = events.some(e =>
    e.workspace_id && !validWorkspaces.has(e.workspace_id)
  );

  if (invalidWorkspace) {
    return NextResponse.json({ error: "Invalid workspace" }, { status: 403 });
  }
}
```

---

## Low Bugs

### 9. **UX: Message Cursor Pagination May Skip Messages**
**Location:** `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/messages/route.ts:98-108`
**Severity:** Low
**Type:** Data consistency

**Issue:**
The cursor-based pagination uses `created_at` for ordering, but then filters by `created_at < beforeMessage.created_at`. If multiple messages have the exact same `created_at` timestamp (which can happen with bulk sends or rapid submissions), messages may be skipped or duplicated across pages.

**Code:**
```typescript
// Line 98-108
if (before) {
  const { data: beforeMessage } = await supabase
    .from("workspace_messages")
    .select("created_at")
    .eq("id", before)
    .single();

  if (beforeMessage) {
    query = query.lt("created_at", beforeMessage.created_at);
  }
}
```

**Impact:**
- Edge case: Messages with identical timestamps may be skipped
- Rare occurrence but possible in high-frequency chat

**Recommendation:**
Use `id` as a tiebreaker in the `ORDER BY` clause and cursor comparison:
```typescript
query = query
  .order("created_at", { ascending: false })
  .order("id", { ascending: false });

if (beforeMessage) {
  query = query.or(`created_at.lt.${beforeMessage.created_at},and(created_at.eq.${beforeMessage.created_at},id.lt.${before})`);
}
```

---

### 10. **Missing Null Check: Activity Feed User Profile**
**Location:** `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/activity/route.ts:64-65`
**Severity:** Low
**Type:** Potential null reference

**Issue:**
The activity feed query joins profiles via foreign key (line 64), but doesn't handle cases where the profile might be null (e.g., if a user is deleted). The frontend may crash when trying to access `activity.user.full_name`.

**Code:**
```typescript
// Line 64-65
user:profiles!workspace_activity_user_id_fkey(id, full_name, avatar_url)
```

**Impact:**
- Frontend crashes on deleted user activities
- Missing activity entries in the feed

**Recommendation:**
Use left join syntax or handle null profiles in the frontend. Add a database constraint to cascade-delete or set-null on profile deletion.

---

### 11. **Missing Debounce: Typing Indicator API Spam**
**Location:** `/Users/adrianstier/ProfDash/scholaros/apps/web/lib/hooks/use-presence.ts:150-171`
**Severity:** Low
**Type:** Performance / Rate limiting

**Issue:**
The `startTyping` function calls the API (`updateTyping.mutate`) on every keystroke without debouncing. In rapid typing, this can send dozens of API requests per second.

**Code:**
```typescript
// Line 150-171
const startTyping = useCallback(() => {
  if (typingTimeoutRef.current) {
    clearTimeout(typingTimeoutRef.current);
  }

  const channel = getWorkspaceChannel(workspaceIdRef.current);
  channel.broadcastTyping(conversationKeyRef.current, true);

  // This hits the API on every call
  updateTyping.mutate({
    workspaceId: workspaceIdRef.current,
    isTyping: true,
    typingInConversation: conversationKeyRef.current,
  });

  typingTimeoutRef.current = setTimeout(() => {
    stopTyping();
  }, 3000);
}, [updateTyping, stopTyping]);
```

**Impact:**
- Unnecessary API load
- Potential rate limiting triggers
- Database write amplification

**Recommendation:**
Only call the API once per typing session or every N seconds:
```typescript
const lastApiCallRef = useRef(0);
const MIN_API_INTERVAL = 2000; // 2 seconds

const startTyping = useCallback(() => {
  const now = Date.now();

  // Realtime broadcast (no debounce needed)
  const channel = getWorkspaceChannel(workspaceIdRef.current);
  channel.broadcastTyping(conversationKeyRef.current, true);

  // API call (debounced)
  if (now - lastApiCallRef.current > MIN_API_INTERVAL) {
    lastApiCallRef.current = now;
    updateTyping.mutate({ /* ... */ });
  }

  // ... rest of function
}, [updateTyping, stopTyping]);
```

---

### 12. **Code Quality: Inconsistent Error Responses**
**Location:** Multiple API routes
**Severity:** Low
**Type:** API consistency

**Issue:**
Error responses across the collaboration module use inconsistent formats:
- `/api/messages/route.ts` returns `{ error: "message" }`
- `/api/search/history/route.ts` returns `{ error: "message", details: {...} }` OR `{ message: "..." }`
- `/api/analytics/events/route.ts` returns `{ error: "message", retry_after: N }`

**Impact:**
- Frontend error handling is complex
- Harder to debug issues
- Poor developer experience

**Recommendation:**
Standardize on:
```typescript
{
  error: string,           // Always present on errors
  code?: string,           // Optional error code (e.g., "RATE_LIMIT_EXCEEDED")
  details?: object,        // Optional validation details
  metadata?: object        // Optional context (retry_after, etc.)
}
```

---

### 13. **Missing Test Coverage: Realtime Presence State Sync**
**Location:** `/Users/adrianstier/ProfDash/scholaros/apps/web/lib/realtime/workspace-channel.ts`
**Severity:** Low
**Type:** Test coverage

**Issue:**
The `WorkspaceChannel` class has no unit tests. The realtime presence sync logic (lines 88-113) is complex and involves state management that could have race conditions or edge cases.

**Impact:**
- Untested code paths
- Harder to refactor safely
- Potential bugs in production

**Recommendation:**
Add tests for:
- Channel connection and disconnection
- Presence state sync and updates
- Typing indicator broadcast
- Multiple concurrent users
- Network disconnection and reconnection

---

## Files Reviewed

### API Routes (11 files)
- ✅ `/app/api/messages/route.ts` (GET, POST)
- ✅ `/app/api/messages/[id]/route.ts` (GET, PATCH, DELETE)
- ✅ `/app/api/messages/[id]/pin/route.ts` (POST, DELETE)
- ✅ `/app/api/messages/[id]/read/route.ts` (POST, PUT) ⚠️ BUGS FOUND
- ✅ `/app/api/messages/[id]/reactions/route.ts` (POST, DELETE)
- ✅ `/app/api/activity/route.ts` (GET, POST)
- ✅ `/app/api/presence/route.ts` (GET, POST, PATCH)
- ✅ `/app/api/search/route.ts` (GET)
- ✅ `/app/api/search/history/route.ts` (GET, POST, DELETE)
- ✅ `/app/api/analytics/route.ts` (GET)
- ✅ `/app/api/analytics/events/route.ts` (GET, POST) ⚠️ BUG FOUND

### Hooks (6 files)
- ✅ `/lib/hooks/use-chat.ts` (14 hooks)
- ✅ `/lib/hooks/use-activity.ts` (2 hooks)
- ✅ `/lib/hooks/use-presence.ts` (6 hooks) ⚠️ BUGS FOUND
- ✅ `/lib/hooks/use-search.ts` (4 hooks)
- ✅ `/lib/hooks/use-analytics.ts` (1 hook)
- ✅ `/lib/hooks/use-analytics-events.ts` (1 hook + 12 event trackers)

### Stores (2 files)
- ✅ `/lib/stores/chat-store.ts` (27 actions, 4 selectors)
- ✅ `/lib/stores/analytics-store.ts` (12 actions)

### Realtime (2 files)
- ✅ `/lib/realtime/workspace-channel.ts` ⚠️ MEMORY LEAK FOUND
- ✅ `/lib/realtime/index.ts`

### Tests (5 files reviewed)
- ✅ `__tests__/api/messages.test.ts` (118 test cases)
- ✅ `__tests__/api/presence.test.ts` (12 test cases)
- ✅ `__tests__/api/search.test.ts` (schema and utility tests)
- ✅ `__tests__/stores/chat-store.test.ts`
- ✅ `__tests__/stores/analytics-store.test.ts`

### Database Migrations (2 files)
- ✅ `supabase/migrations/20260122000000_analytics_events.sql`
- ✅ `supabase/migrations/20260129000000_fix_analytics_rls_policies.sql` (Security fixes already applied ✓)

---

## Verdict: NEEDS_FIX

**Summary:**
The Collaboration module has **3 critical bugs** that must be fixed before production use:

1. **Critical:** Race condition in concurrent message read updates (data corruption)
2. **Critical:** Missing workspace authorization in bulk mark-as-read endpoint (security)
3. **Critical:** Memory leak from uncleaned realtime channels on workspace switch

Additionally, there are **5 medium-severity bugs** that should be addressed:
- Missing database index on `read_by` (performance)
- Missing workspace validation in analytics events (data integrity)
- Inconsistent error response shapes (UX)
- Potential null reference in activity feed (stability)
- Typing indicator API spam (performance)

The good news:
- Test coverage is good (118 tests for messages API alone)
- Recent security fixes (analytics RLS policies) show active maintenance
- Most of the code is well-structured and follows best practices
- Error handling is generally robust with graceful degradation

**Priority Fixes (in order):**
1. Fix race condition in message read updates (Critical - data loss)
2. Fix realtime channel memory leak (Critical - resource exhaustion)
3. Add workspace authorization to bulk mark-as-read (Critical - security)
4. Add GIN index on `workspace_messages.read_by` (Medium - performance)
5. Validate workspace membership in analytics events (Medium - data integrity)
6. Debounce typing indicator API calls (Low - optimization)

**Test Recommendations:**
1. Add tests for concurrent message read operations
2. Add tests for workspace switching with realtime channels
3. Add tests for analytics workspace validation
4. Add integration tests for search LIKE pattern escaping

**Overall Assessment:**
The collaboration module is feature-complete and mostly well-implemented, but has critical production-readiness issues that must be addressed. The architecture is sound (separation of concerns, proper use of stores and hooks), and the recent security fixes show good awareness of common pitfalls. With the recommended fixes, this module would be production-ready.
