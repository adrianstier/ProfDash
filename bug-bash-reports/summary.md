# Bug Bash Review Summary

**Date:** 2026-02-09
**Reviewer:** Review Agent
**Codebase:** ScholarOS (Next.js 15 + Supabase)

---

## Overall Stats

| Metric | Count |
|--------|-------|
| Total bugs found | 85 |
| Bugs fixed | 46 |
| Bugs documented (not fixed) | 39 |
| Files modified by fixes | 38+ |
| Test failures introduced | 17 (across 8 test files) |
| Test failures resolved by review | 17 (all fixed) |

### By Scope Agent

| Scope | Found | Fixed | Remaining |
|-------|-------|-------|-----------|
| Auth & Middleware | 7 | 3 | 4 |
| Tasks Core | 16 | 9 | 7 |
| Projects & Research | 19 | 10 | 9 |
| AI & Agents | 17 | 10 | 7 |
| Collaboration & UX | 14 | 6 | 8 |
| Grants, Pubs & Shared | 12 | 8 | 4 |

### By Severity

| Severity | Found | Fixed | Remaining |
|----------|-------|-------|-----------|
| Critical | 4 | 3 | 1 |
| High | 36 | 33 | 3 |
| Medium | 34 | 5 | 29 |
| Low | 11 | 5 | 6 |

---

## Typecheck & Test Results After All Fixes

- **Typecheck:** PASS (0 errors across shared + web packages)
- **Unit Tests:** 72 files, 2384 tests -- ALL PASSING
- **Test failures fixed by review agent:** 17 tests across 8 files were updated to match the new (correct) behavior introduced by bug bash fixes

### Tests Fixed by Review Agent

The bug bash agents fixed real bugs but did not update the corresponding tests. The review agent updated these tests to reflect the new behavior:

1. **`__tests__/api/research-team.test.ts`** (3 tests) -- GET route now requires workspace membership check; added mock for `workspace_members` query
2. **`__tests__/api/task-templates.test.ts`** (1 test) -- Built-in templates are now correctly blocked from modification; changed test from expecting 200 to expecting 403
3. **`__tests__/hooks/ai-hooks.test.ts`** (1 test) -- `useMarkMultipleAsRead` now calls `/api/messages/:firstId/read` instead of `/api/messages/read`; updated expected URL
4. **`__tests__/api/agents.test.ts`** (3 tests) -- Execute and orchestrate routes now verify workspace membership; added mock for `workspace_members` query
5. **`__tests__/api/auth.test.ts`** (3 tests) -- OAuth state is now HMAC-signed; added mock for `oauth-state` module and updated state token creation in tests
6. **`__tests__/api/grants.test.ts`** (1 test) -- Amount max filter now correctly uses `award_ceiling` instead of `award_floor`; updated assertion
7. **`__tests__/api/research-fieldwork.test.ts`** (4 tests) -- GET route now requires workspace membership check; added mock for `workspace_members` query
8. **`__tests__/api/research-permits.test.ts`** (1 test) -- GET single permit now requires project lookup + workspace membership; added mocks for both queries

---

## Cross-Cutting Patterns Identified

### Pattern 1: Missing Workspace Membership Checks (Found in 5/6 scopes)

**The most pervasive bug class.** Routes would authenticate the user but not verify they belonged to the workspace owning the resource. This was found in:

- **Projects & Research:** 8 endpoints (project GET/PATCH, milestone PATCH/DELETE, role PATCH/DELETE, workstream GET/DELETE, permit GET, team GET, fieldwork GET)
- **AI & Agents:** 2 endpoints (agents/execute, agents/orchestrate)
- **Grants:** 4 endpoints (watchlist GET/POST, saved-searches GET/POST)
- **Tasks:** 1 endpoint (complete-recurring)
- **Auth:** 1 endpoint (analytics path not in middleware)

**Recommendation:** Create a shared `verifyWorkspaceMembership(supabase, userId, workspaceId)` helper that all API routes use. Consider adding workspace verification as middleware rather than repeating it in every handler.

### Pattern 2: Date/Timezone Handling Bugs (Found in 3 scopes)

Date-only strings (`"2026-02-09"`) parsed with `new Date()` are interpreted as UTC midnight, causing off-by-one-day errors in negative-UTC timezones (all US timezones). Found in:

- **Tasks Core:** `task-grouping.ts`, `task-card.tsx` (isOverdue, formatDueDate, isToday, isTomorrow)
- **Projects & Research:** `FieldworkModal.tsx`, dashboard route permit expiry check
- **Shared:** `isOverdue()` in shared utils

**Recommendation:** Standardize on a `parseLocalDate()` helper or use `date-fns` with explicit timezone handling. Add this to the CLAUDE.md conventions.

### Pattern 3: Read-Modify-Write Race Conditions (Found in 2 scopes)

Array fields updated via JavaScript read-modify-write instead of atomic database operations:

- **Collaboration:** Message reactions (`read_by` array, `reactions` array)
- **Grants/Pubs:** Personnel PATCH/DELETE TOCTOU (fixed by consolidating to atomic queries)

**Recommendation:** Use Postgres functions (`array_append`, `array_remove`) or junction tables for array operations. The personnel fix (single atomic query) is the correct pattern to follow elsewhere.

### Pattern 4: Missing Input Validation on Non-JSON Routes (Found in 3 scopes)

When data arrives via FormData/multipart instead of JSON, Zod validation is bypassed:

- **Tasks Core:** Import route `workspace_id` from form data not validated as UUID
- **AI & Agents:** `parse-file` route `workspace_id` from form data not validated
- **Grants/Pubs:** Publication author data from raw body instead of Zod-validated data

**Recommendation:** Always extract from `validationResult.data`, never from raw `body`. For FormData routes, apply Zod validation to the extracted fields before use.

### Pattern 5: Missing Rate Limiting on LLM/External API Routes (Found in 1 scope, systemic risk)

7 AI routes that call the Anthropic API had no rate limiting despite a rate limiting module existing with pre-configured AI limits. All were fixed by the AI & Agents agent.

**Recommendation:** Audit all routes that call external APIs (AI service, Google Calendar, CrossRef) for rate limiting. Consider adding rate limiting as middleware.

### Pattern 6: Leaked Internal Data in Error Responses (Found in 2 scopes)

- **AI & Agents:** Raw AI response text included in error JSON when parsing failed
- **Auth:** Supabase auth error messages exposed directly to client

**Recommendation:** Never include raw external service responses in client-facing errors. Log them server-side and return generic messages.

---

## Remaining BLOCKED Items

### Requires Database Migration

1. **Invite acceptance not restricted to invited email** (Auth) -- Need to modify `accept_workspace_invite` RPC function to verify email match
2. **Profiles RLS blocks workspace member display** (Auth) -- Need new RLS policy allowing workspace co-members to view each other's profiles
3. **Message reactions race condition** (Collab) -- Need Postgres function for atomic array operations or a junction table
4. **Read-by array race condition** (Collab) -- Same as above
5. **Project deletion cascade cleanup** (Projects) -- Need to verify CASCADE constraints exist or add explicit cleanup

### Requires Architecture Decision

6. **Calendar token refresh too aggressive** (Collab) -- Should retry before deleting connection; needs `refresh_failures` column
7. **Presence redundancy** (Collab) -- Three parallel update mechanisms (API polling, API heartbeat, realtime); needs decision on primary
8. **Custom grant opportunities scoping** (Grants) -- Whether custom opportunities should be workspace-scoped
9. **Fieldwork PATCH date validation** (Projects) -- Partial updates need existing dates to validate properly

### Requires Cross-Module Coordination

10. **Workspace membership verification in grant routes** (Grants) -- Same pattern as the workspace check fixes applied elsewhere; needs the shared helper
11. **Watchlist/saved-search DELETE ownership** (Grants) -- Same pattern
12. **Voice transcribe workspace check** (AI) -- Inconsistent with other AI routes that do check workspace
13. **Agent feedback session ownership** (AI) -- Need to query `agent_executions` to verify session ownership
14. **Stale typing indicators** (Collab) -- Need cross-store cleanup or timeout mechanism
15. **Duplicate ActivityFeed components** (Collab) -- Two files (`ActivityFeed.tsx` and `activity-feed.tsx`) need consolidation

### Low Priority / Cosmetic

16. **TodayProgress fetches all tasks without workspace filter** (Tasks)
17. **Optimistic update doesn't replicate completed_at logic** (Tasks)
18. **Import date format ambiguity (MM/DD vs DD/MM)** (Tasks)
19. **Quick-add parser returns empty title on empty input** (Shared)
20. **DOI format validation** (Pubs)
21. **Duplicate PersonnelRoleSchema definitions** (Pubs)
22. **OPENAI_API_KEY not in env validation** (AI)
23. **AI Service URL defaults to localhost in production** (AI)
24. **Agent store unbounded message array** (AI)

---

## Recommendations for Systemic Improvements

### 1. Create Shared Workspace Authorization Middleware

The single highest-impact improvement. A `verifyWorkspaceMembership()` helper or middleware would have prevented 15+ of the 85 bugs found.

```typescript
// lib/auth/workspace.ts
export async function verifyWorkspaceMembership(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string
): Promise<{ role: string } | null> {
  const { data } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .single();
  return data;
}
```

### 2. Standardize Date Handling

Create a `parseLocalDate()` utility in the shared package and mandate its use for all date-only strings. Add to CLAUDE.md conventions.

### 3. Add API Route Testing Template

The test failures were all caused by bug bash fixes adding new Supabase queries (workspace checks) that tests didn't account for. A standardized test template with workspace membership mocks would prevent this.

### 4. Audit Remaining Routes for Workspace Checks

The bug bash was thorough but time-boxed. The "BLOCKED" items in Grants (watchlist, saved-searches) and AI (voice/transcribe, agent feedback) still need workspace membership verification.

### 5. Add Pre-Commit Hook for Rate Limiting

Any route that calls an external API (Anthropic, OpenAI, Google, CrossRef) should be required to have rate limiting. Consider a lint rule or pre-commit check.

### 6. Replace Array-Based Patterns with Junction Tables

The `reactions` and `read_by` arrays on messages are race-condition-prone. Migrate to `message_reactions` and `message_read_receipts` junction tables for atomic operations.

---

## Files Modified by Review Agent

1. `apps/web/__tests__/api/research-team.test.ts` -- Added workspace membership mocks to 3 GET tests
2. `apps/web/__tests__/api/task-templates.test.ts` -- Updated built-in template test to expect 403
3. `apps/web/__tests__/hooks/ai-hooks.test.ts` -- Updated useMarkMultipleAsRead URL assertion
4. `apps/web/__tests__/api/agents.test.ts` -- Added workspace membership mocks to 3 tests
5. `apps/web/__tests__/api/auth.test.ts` -- Added oauth-state mock, updated state token creation in 3 tests
6. `apps/web/__tests__/api/grants.test.ts` -- Updated amount_max filter assertion
7. `apps/web/__tests__/api/research-fieldwork.test.ts` -- Added workspace membership mocks to 4 GET tests
8. `apps/web/__tests__/api/research-permits.test.ts` -- Added project/workspace mocks to 1 GET test

---

## Final Status

The codebase is in a clean state:
- **Typecheck:** PASS
- **Tests:** 72 files, 2384 tests, ALL PASSING
- **No regressions introduced** by the bug bash fixes (after test updates)
- **46 bugs fixed** with correct implementations
- **39 bugs documented** with clear remediation paths
