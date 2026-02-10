# Grants, Publications & Shared Package Bug Bash Report

## Summary
- 12 bugs found (0 critical, 5 high, 5 medium, 2 low)
- 5 bugs fixed directly
- 2 bugs noted as BLOCKED (cross-module / architecture decision needed)

---

## Findings

### [HIGH] Inverted Amount Range Filter in Grant Search
**File:** `scholaros/apps/web/app/api/grants/search/route.ts:59-61`
**Description:** The `amount_max` filter was checking `award_floor <= amountMax` instead of `award_ceiling <= amountMax`. This meant a user searching for grants up to $500K would match grants whose *floor* was below $500K, even if the ceiling was $10M. The correct semantic is: the grant's maximum possible award (`award_ceiling`) should not exceed the user's maximum budget.
**Fix:** Changed `.lte("award_floor", parseFloat(amountMax))` to `.lte("award_ceiling", parseFloat(amountMax))`.

### [HIGH] Unvalidated Author Data in Publication POST
**File:** `scholaros/apps/web/app/api/publications/route.ts:110`
**Description:** The `authors` field was extracted directly from the raw `body` object (`const { authors } = body`) rather than from `validationResult.data`. The `CreatePublicationSchema` does not include an `authors` field, so author data bypassed all Zod validation. A malicious client could inject arbitrary fields into the `publication_authors` table (e.g., extra columns, wrong types).
**Fix:** Added explicit validation/sanitization of each author object before insertion -- checking that `name` is a non-empty string, and safely extracting only known fields (`name`, `email`, `affiliation`, `orcid`, `author_role`, `is_corresponding`, `author_order`).

### [HIGH] Unvalidated Author Data in Publication PATCH
**File:** `scholaros/apps/web/app/api/publications/[id]/route.ts:109`
**Description:** Same issue as the POST route -- `const { authors } = body` reads from the raw unvalidated body. This is particularly dangerous in the PATCH route because it first deletes all existing authors then inserts new ones, so a malformed payload could wipe authors without properly replacing them.
**Fix:** Applied the same validation/sanitization pattern as the POST route fix.

### [HIGH] TOCTOU Race Condition in Personnel PATCH/DELETE
**File:** `scholaros/apps/web/app/api/personnel/[id]/route.ts:93-105` (PATCH) and `:150-167` (DELETE)
**Description:** Both PATCH and DELETE routes used a two-step pattern: first fetch the record to verify `user_id` ownership, then separately perform the mutation without the `user_id` filter. This creates a time-of-check-time-of-use (TOCTOU) vulnerability -- if RLS is misconfigured or bypassed, an attacker could exploit the race window. Additionally, the double query is wasteful.
**Fix:** Consolidated into single atomic queries: `.update(...).eq("id", id).eq("user_id", user.id)` and `.delete().eq("id", id).eq("user_id", user.id)`. Added PGRST116 error handling for "not found" cases.

### [HIGH] ActivityAction Type/Schema Mismatch
**File:** `scholaros/packages/shared/src/types/chat.ts:133-159` vs `scholaros/packages/shared/src/schemas/index.ts:738-780`
**Description:** The `ActivityAction` TypeScript type was missing 10 action values that the `ActivityActionSchema` Zod schema already defined: `phase_created`, `phase_started`, `phase_completed`, `phase_blocked`, `workstream_created`, `workstream_updated`, `deliverable_created`, `deliverable_completed`, `role_assigned`, `template_applied`. This means the TypeScript compiler would reject valid activity actions that the runtime Zod schema would accept, causing a type mismatch between compile-time and runtime validation.
**Fix:** Added all 10 missing action values to the `ActivityAction` type union, and added corresponding entries to the `ACTIVITY_ACTION_CONFIG` record so they render properly in the activity feed.

### [MEDIUM] isOverdue() Mutates Input Date Object
**File:** `scholaros/packages/shared/src/utils/index.ts:208-215`
**Description:** When a `Date` object is passed to `isOverdue()`, the function calls `d.setHours(0, 0, 0, 0)` directly on the input, mutating it. Any code holding a reference to that Date would silently have its time component zeroed out. This is a common source of subtle bugs in date-heavy applications.
**Fix:** Changed to create a copy: `const d = new Date(typeof date === "string" ? date : date.getTime())`.

### [MEDIUM] Missing Workspace Membership Verification in Grant Routes
**File:** `scholaros/apps/web/app/api/grants/watchlist/route.ts:28-35`, `scholaros/apps/web/app/api/grants/saved-searches/route.ts:39-47`
**Description:** The watchlist GET, watchlist POST, saved-searches GET, and saved-searches POST routes accept a `workspace_id` from the client but never verify that the authenticated user is actually a member of that workspace. An authenticated user could pass any workspace_id to read/write another workspace's watchlist or saved searches. This is partially mitigated if RLS policies on `opportunity_watchlist` and `saved_searches` tables enforce workspace membership, but the API layer should not rely solely on database-level enforcement.
**Fix:** BLOCKED -- requires verifying `workspace_members` table membership. This pattern should be standardized across all API routes as middleware or a shared helper. Recommend adding a `verifyWorkspaceMembership(supabase, userId, workspaceId)` helper.

### [MEDIUM] Missing Ownership Check in Watchlist/Saved-Search DELETE
**File:** `scholaros/apps/web/app/api/grants/watchlist/[id]/route.ts:69-103`, `scholaros/apps/web/app/api/grants/saved-searches/[id]/route.ts:4-38`
**Description:** The DELETE routes for watchlist items and saved searches only check authentication, not ownership. Any authenticated user can delete any other user's watchlist item or saved search by guessing or enumerating IDs. The delete query uses only `.eq("id", id)` with no workspace or user scope.
**Fix:** BLOCKED -- same as above, needs a pattern for verifying workspace membership or adding `created_by = user.id` to DELETE where clauses. Depends on whether these tables enforce access via RLS.

### [MEDIUM] Quick-Add Parser Returns Empty Title on Empty Input
**File:** `scholaros/packages/shared/src/utils/index.ts:81-151`
**Description:** `parseQuickAdd("")` returns `{ title: "" }` instead of throwing or returning a sentinel value. `parseQuickAdd("p1 #grants")` also returns `{ title: "", priority: "p1", category: "grants" }` -- a task with no title but other metadata, which would fail downstream validation. Callers must independently check for empty titles.
**Fix:** NOT FIXED (low risk, callers do check). Consider adding a title validation or returning `null` for empty input in a future pass.

### [MEDIUM] DOI Import: Minimal Validation of DOI Format
**File:** `scholaros/apps/web/app/api/publications/import/route.ts:5-8`
**Description:** The `ImportDOISchema` validates DOI as `z.string().min(1)`, accepting any non-empty string. A value like "hello" would pass validation and trigger a wasted CrossRef API call that returns 404. While the error handling for 404 is present, the unnecessary API call is wasteful and could be avoided with basic format validation (DOIs always contain a `/`).
**Fix:** NOT FIXED (low impact -- the 404 case is handled gracefully). Consider adding `.regex(/\//)` or similar basic check.

### [LOW] Grant Search Missing RLS for Custom Opportunities
**File:** `scholaros/apps/web/app/api/grants/search/route.ts:32-34`
**Description:** The `funding_opportunities` table is queried with `select("*")` and no user/workspace scoping. While official grant data (source: "grants.gov") is public, the `POST /api/grants/opportunities` route creates custom entries (source: "custom") that have no `workspace_id` or `user_id` column. These custom entries are visible to all authenticated users in search results. This may be intentional (shared discovery), but it means User A's custom grant opportunity is visible to User B.
**Fix:** NOT FIXED -- requires architecture decision on whether custom opportunities should be workspace-scoped. If so, the `funding_opportunities` table needs a `workspace_id` column and corresponding RLS policy.

### [LOW] Duplicate PersonnelRoleSchema Definitions
**File:** `scholaros/apps/web/app/api/personnel/route.ts:5-11` and `scholaros/apps/web/app/api/personnel/[id]/route.ts:5-11`
**Description:** The `PersonnelRoleSchema` is defined identically in both route files instead of being imported from the shared package. If a new role is added (e.g., "visiting-researcher"), it must be updated in three places (shared types + both route files), creating a maintenance risk.
**Fix:** NOT FIXED (low risk, cosmetic). Recommend importing from shared package or creating a shared API validation module.

---

## Files Modified

1. `scholaros/apps/web/app/api/grants/search/route.ts` -- Fixed inverted amount range filter
2. `scholaros/apps/web/app/api/publications/route.ts` -- Added author data validation in POST
3. `scholaros/apps/web/app/api/publications/[id]/route.ts` -- Added author data validation in PATCH
4. `scholaros/apps/web/app/api/personnel/[id]/route.ts` -- Fixed TOCTOU race condition in PATCH/DELETE
5. `scholaros/packages/shared/src/utils/index.ts` -- Fixed isOverdue Date mutation
6. `scholaros/packages/shared/src/types/chat.ts` -- Added missing ActivityAction values and config entries
7. `scholaros/apps/web/components/activity/activity-feed.tsx` -- Added missing action icons/labels for type completeness
8. `scholaros/apps/web/components/activity/ActivityFeed.tsx` -- Added missing action icons/labels for type completeness

## Build Verification

All changes pass `pnpm build` successfully (shared package + Next.js web app).
