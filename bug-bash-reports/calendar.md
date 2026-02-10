# Calendar & Integrations Module Bug Report

## Critical Bugs

### 1. API Response Mismatch - Events Hook Returns Wrong Data Structure
**File:** `/Users/adrianstier/ProfDash/scholaros/apps/web/lib/hooks/use-calendar.ts`
**Lines:** 46-64
**Severity:** CRITICAL

**Description:**
The `fetchCalendarEvents()` function declares its return type as `Promise<CalendarEventFromAPI[]>`, but the API endpoint `/api/calendar/events` returns a wrapped object with structure `{ data: events[], pagination: {...}, syncStatus: {...} }`. The hook is calling `return response.json()` directly without extracting the `data` field, causing a type mismatch and runtime errors in consuming code.

**Evidence:**
- Line 63: `return response.json();` - returns entire response object
- API route (events/route.ts line 374-387): Returns `{ data: events, pagination: {...}, syncStatus: {...} }`
- Expected return type: `CalendarEventFromAPI[]`
- Actual return: `{ data: CalendarEventFromAPI[], pagination: {...}, syncStatus: {...} }`

**Impact:**
When the calendar page tries to iterate over `calendarEvents` (line 371 in calendar/page.tsx), it will fail because it receives an object instead of an array. This breaks the calendar view when events are loaded from the API.

**Fix Required:**
Change line 63 to:
```typescript
const result = await response.json();
return result.data || [];
```

---

### 2. Missing Error Handling for Token Decryption Failures
**File:** `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/calendar/events/route.ts`
**Lines:** 192, 48
**Severity:** CRITICAL

**Description:**
The `decryptToken()` calls at lines 192 and 48 can throw errors (e.g., invalid auth tag, corrupted data), but there's no try-catch wrapper around them. If decryption fails due to key rotation, corrupted tokens, or tampering, the entire API route will crash with a 500 error instead of gracefully handling the failure.

**Evidence:**
- Line 192: `let accessToken = decryptToken(connection.access_token_encrypted);` - no error handling
- Line 48: `const refreshToken = decryptToken(encryptedRefreshToken);` - no error handling
- crypto.ts line 92: `decrypted += decipher.final("utf8");` - can throw if auth tag verification fails

**Impact:**
Users with corrupted tokens or after key rotation will get 500 errors and cannot reconnect their calendar. The connection record remains in the database but is unusable.

**Fix Required:**
Wrap decryption calls in try-catch and delete the connection on failure:
```typescript
try {
  accessToken = decryptToken(connection.access_token_encrypted);
} catch (error) {
  console.error("Token decryption failed:", error);
  await supabase.from("calendar_connections").delete().eq("id", connection.id);
  return NextResponse.json({
    error: "Calendar token corrupted",
    message: "Your calendar connection is corrupted. Please reconnect in Settings.",
    needsReconnect: true,
  }, { status: 401 });
}
```

---

### 3. Same Decryption Error Handling Missing in Calendars Route
**File:** `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/calendar/calendars/route.ts`
**Lines:** 80, 28
**Severity:** CRITICAL

**Description:**
Identical issue to bug #2, but in the calendars list endpoint. No try-catch around `decryptToken()` calls.

**Evidence:**
- Line 80: `let accessToken = decryptToken(connection.access_token_encrypted);` - no error handling
- Line 28: `const refreshToken = decryptToken(encryptedRefreshToken);` - no error handling

**Impact:**
Same as bug #2 - users cannot view their calendar list if tokens are corrupted.

**Fix Required:**
Same solution as bug #2.

---

## Medium Bugs

### 4. Weak State Token Validation - Missing CSRF Protection
**File:** `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/auth/google/callback/route.ts`
**Lines:** 69
**Severity:** MEDIUM

**Description:**
The state validation only checks `user.id !== stateData.userId` but doesn't prevent replay attacks or validate the state was actually issued by the server. An attacker could forge a state token with any userId and timestamp as long as it's within 15 minutes.

**Evidence:**
- Line 30-33: State is just base64-encoded JSON `{ userId, timestamp }` - no signature or MAC
- Line 69: Only checks if current user matches state userId - doesn't validate token authenticity
- No server-side storage or signature verification

**Impact:**
Potential for session fixation or CSRF attacks. An attacker could craft a state token and trick a user into completing the OAuth flow, potentially linking the attacker's Google account to the victim's ScholarOS account.

**Fix Required:**
Use a cryptographically secure state token with HMAC or store state server-side:
```typescript
// Generate
const state = randomBytes(32).toString('hex');
await redis.set(`oauth:state:${state}`, user.id, 'EX', 900); // 15 min expiry

// Validate
const userId = await redis.get(`oauth:state:${state}`);
if (!userId || userId !== user.id) { /* reject */ }
```

---

### 5. Token Expiry Check Has Edge Case with Null Values
**File:** `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/calendar/events/route.ts`
**Lines:** 194-198
**Severity:** MEDIUM

**Description:**
Line 196 checks `!tokenExpiresAt || tokenExpiresAt < fiveMinutesFromNow` but `tokenExpiresAt` is derived from `connection.token_expires_at` which can be `null` according to the schema (line 11 of migration). If it's null, the code correctly attempts refresh, but there's no check if `connection.refresh_token_encrypted` is also null before attempting refresh.

**Evidence:**
- Line 196: `const tokenExpiresAt = connection.token_expires_at ? new Date(...) : null;`
- Line 200: `if (connection.refresh_token_encrypted)` - checks for refresh token
- Migration shows `token_expires_at TIMESTAMPTZ` (nullable) and `refresh_token_encrypted TEXT` (nullable)

**Impact:**
If both `token_expires_at` and `refresh_token_encrypted` are null (edge case from incomplete OAuth flow or data migration), the code will try to use an expired access token without attempting refresh, leading to 401 errors from Google.

**Fix Required:**
More explicit null handling:
```typescript
if (!tokenExpiresAt && !connection.refresh_token_encrypted) {
  // Connection is incomplete - delete and force reconnect
  await supabase.from("calendar_connections").delete().eq("id", connection.id);
  return NextResponse.json({ error: "Incomplete connection", needsReconnect: true }, { status: 401 });
}
```

---

### 6. Race Condition in Token Refresh Logic
**File:** `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/calendar/events/route.ts`
**Lines:** 199-220
**Severity:** MEDIUM

**Description:**
If multiple requests hit the API simultaneously when the token is expired, they will all try to refresh the token concurrently. This can lead to multiple refresh requests to Google, wasted API quota, and potential rate limiting.

**Evidence:**
- No mutex or lock around the refresh logic (lines 199-220)
- No check if another request is already refreshing
- Calendar page likely makes multiple API calls on mount (connection status + events)

**Impact:**
Unnecessary load on Google's OAuth servers, potential rate limiting, and wasted refresh token usage. In extreme cases, Google might revoke the refresh token for suspicious activity.

**Fix Required:**
Implement distributed locking (Redis/Postgres advisory lock) or at minimum check `last_sync_at` timestamp:
```typescript
// Only refresh if last attempt was >30s ago
const lastAttempt = connection.last_sync_at ? new Date(connection.last_sync_at) : null;
if (lastAttempt && Date.now() - lastAttempt.getTime() < 30000) {
  // Another request likely refreshed recently, retry with current token
}
```

---

## Low Bugs

### 7. Inconsistent Error Response Format
**File:** `/Users/adrianstier/ProfDash/scholaros/apps/web/lib/hooks/use-calendar.ts`
**Lines:** 56-64
**Severity:** LOW

**Description:**
The `fetchCalendarEvents()` function returns an empty array on 404 (line 59) but throws an error for all other failure statuses (line 61). This is inconsistent - a 404 is still an error condition that might need to display a message to the user.

**Evidence:**
- Line 58-60: Special case for 404 returns `[]`
- Line 61: All other errors throw generic message
- No extraction of error details from response body (e.g., `needsReconnect` flag)

**Impact:**
When the API returns a 401 with `needsReconnect: true`, the hook throws a generic error instead of providing actionable feedback. The calendar page can't distinguish between "not connected" and "connection expired".

**Fix Required:**
Parse error responses and include structured error info:
```typescript
if (!response.ok) {
  const errorBody = await response.json().catch(() => ({}));
  const error = new Error(errorBody.message || "Failed to fetch events");
  (error as any).statusCode = response.status;
  (error as any).needsReconnect = errorBody.needsReconnect;
  throw error;
}
```

---

### 8. Missing Timezone Context for All-Day Events
**File:** `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/calendar/events/route.ts`
**Lines:** 344
**Severity:** LOW

**Description:**
All-day events use hardcoded UTC times (`T00:00:00Z` and `T23:59:59Z`) regardless of user timezone. This means an all-day event on Jan 15 might display on Jan 14 or Jan 16 depending on the user's local timezone.

**Evidence:**
- Line 344: `start_time: event.start.dateTime || \`${event.start.date}T00:00:00Z\``
- Line 345: `end_time: event.end.dateTime || \`${event.end.date}T23:59:59Z\``
- No timezone information from user profile or request

**Impact:**
All-day events display on wrong dates for users not in UTC timezone. An event on "Jan 15" in California (UTC-8) will show as starting at 4pm on Jan 14.

**Fix Required:**
Store all-day events as dates only, or use user's timezone from profile:
```typescript
// Option 1: Store as date-only string and handle in frontend
all_day: isAllDay,
start_date: isAllDay ? event.start.date : null,

// Option 2: Use user timezone offset
const userTz = userProfile.timezone || 'UTC';
start_time: event.start.dateTime || moment.tz(event.start.date, userTz).toISOString()
```

---

### 9. No Validation of selected_calendars Array Contents
**File:** `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/calendar/connection/route.ts`
**Lines:** 79-81
**Severity:** LOW

**Description:**
The PATCH endpoint validates that `selected_calendars` is an array of strings (line 7), but doesn't validate that the calendar IDs actually exist or belong to the user. A malicious user could set arbitrary calendar IDs.

**Evidence:**
- Line 7: `selected_calendars: z.array(z.string()).optional()` - only validates type
- No verification against actual calendars from Google API
- No length limit on the array

**Impact:**
Users could set invalid calendar IDs, causing silent failures in sync. They could also set a very large array (DoS). The actual impact is limited since the calendar IDs are only used for filtering, not access control.

**Fix Required:**
Add length validation and optionally validate against available calendars:
```typescript
selected_calendars: z.array(z.string()).max(50).optional()
```

---

### 10. Hardcoded "primary" Calendar ID in Events Route
**File:** `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/calendar/events/route.ts`
**Lines:** 251
**Severity:** LOW

**Description:**
The events fetch always uses `calendars/primary/events` (line 251) instead of respecting the user's `selected_calendars` setting. This means users can select multiple calendars in settings, but only events from their primary calendar are synced.

**Evidence:**
- Line 251: `const calendarUrl = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");`
- Line 130 of callback route sets `selected_calendars: ["primary"]` as default
- No loop or iteration over `connection.selected_calendars`

**Impact:**
Users cannot actually sync multiple calendars despite the UI suggesting they can. Feature is half-implemented.

**Fix Required:**
Loop over selected calendars and fetch events from each:
```typescript
const calendarsToSync = connection.selected_calendars || ["primary"];
const allEvents = [];
for (const calendarId of calendarsToSync) {
  const calendarUrl = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
  // fetch and merge events
}
```

---

## Files Reviewed

1. `/Users/adrianstier/ProfDash/scholaros/apps/web/lib/crypto.ts` - Token encryption utilities
2. `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/auth/google/route.ts` - OAuth initiation
3. `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/auth/google/callback/route.ts` - OAuth callback handler
4. `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/calendar/connection/route.ts` - Connection status/settings
5. `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/calendar/calendars/route.ts` - Calendar list fetching
6. `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/calendar/events/route.ts` - Event syncing and caching
7. `/Users/adrianstier/ProfDash/scholaros/apps/web/lib/hooks/use-calendar.ts` - React Query hooks for calendar data
8. `/Users/adrianstier/ProfDash/scholaros/apps/web/app/(dashboard)/calendar/page.tsx` - Calendar UI page
9. `/Users/adrianstier/ProfDash/scholaros/apps/web/__tests__/api/calendar.test.ts` - API route tests
10. `/Users/adrianstier/ProfDash/scholaros/apps/web/__tests__/lib/crypto.test.ts` - Crypto utility tests
11. `/Users/adrianstier/ProfDash/scholaros/supabase/migrations/20241217000003_calendar_integrations.sql` - Database schema
12. `/Users/adrianstier/ProfDash/scholaros/apps/web/lib/env.ts` - Environment variable validation

---

## Verdict: NEEDS_FIX

**Summary:**
Found **3 critical bugs** that will cause immediate runtime failures:
- API response mismatch breaks calendar event display
- Missing error handling for token decryption causes crashes
- Multiple routes affected by same decryption issue

Found **3 medium bugs** affecting security and reliability:
- Weak OAuth state validation (CSRF risk)
- Token expiry edge cases
- Race conditions in token refresh

Found **4 low bugs** affecting UX and feature completeness:
- Inconsistent error handling
- Timezone issues for all-day events
- Missing validation
- Incomplete multi-calendar support

**Priority Fixes:**
1. Fix bug #1 (API response mismatch) - blocks calendar functionality entirely
2. Fix bugs #2 and #3 (decryption error handling) - causes 500 errors and bad UX
3. Fix bug #4 (state validation) - security issue
4. Consider fixing bug #6 (race condition) - reliability issue

**Test Coverage Assessment:**
Tests exist but are limited to happy path scenarios. Missing tests for:
- Token decryption failures
- Concurrent refresh attempts
- All-day event timezone handling
- Error response parsing in hooks
