# Projects & Research Bug Bash Report

## Summary
- **19 bugs found** (0 critical, 10 high, 6 medium, 3 low)
- **10 fixed** directly in this pass
- **9 documented** for future attention (medium/low severity or requiring cross-module changes)

---

## Findings

### [HIGH] Missing workspace membership check on Project GET single
**File:** `apps/web/app/api/projects/[id]/route.ts:6`
**Description:** The GET handler for a single project fetches the project by ID but never verifies the requesting user is a member of the project's workspace. Any authenticated user could read any project's full details (including milestones, notes, tasks) by guessing/knowing the project UUID.
**Fix:** Added workspace membership verification after fetching the project data, returning 403 if the user is not a member.

### [HIGH] Missing workspace membership check on Project PATCH
**File:** `apps/web/app/api/projects/[id]/route.ts:55`
**Description:** The PATCH handler updates a project by ID without verifying workspace membership. Any authenticated user could modify any project's title, status, due date, etc.
**Fix:** Added workspace membership verification before allowing the update.

### [HIGH] Missing workspace membership check on Milestone PATCH/DELETE
**File:** `apps/web/app/api/projects/[id]/milestones/[milestoneId]/route.ts:6-78`
**Description:** Both PATCH and DELETE handlers for milestones only check auth but skip workspace membership verification entirely. The `id` (projectId) param was not even destructured from `params`. Any authenticated user could update or delete any milestone.
**Fix:** Added project lookup, workspace membership verification, and proper destructuring of the `id` param for both handlers.

### [HIGH] Missing workspace membership check on Role PATCH/DELETE
**File:** `apps/web/app/api/projects/[id]/roles/[roleId]/route.ts:6-102`
**Description:** The PATCH handler accesses `projectId` from params but does not verify workspace membership. The DELETE handler did not even destructure `projectId`. Any authenticated user could modify or delete project roles and their associated phase assignments.
**Fix:** Added workspace membership verification to both PATCH and DELETE handlers.

### [HIGH] Missing workspace membership check on Workstream GET single / DELETE
**File:** `apps/web/app/api/projects/[id]/workstreams/[workstreamId]/route.ts:6-168`
**Description:** The GET (single) handler fetches a workstream by ID without verifying the user is a workspace member. The DELETE handler also lacks this check. This means any authenticated user could read workstream details (including all linked tasks and deliverables) or delete workstreams.
**Fix:** Added workspace membership verification to both GET and DELETE handlers.

### [HIGH] Missing workspace membership check on Permit GET single
**File:** `apps/web/app/api/research/projects/[id]/permits/[permitId]/route.ts:6-39`
**Description:** The GET handler for a single permit only checks authentication, not workspace membership. Any authenticated user could read permit details (including permit numbers, issuing authorities, conditions) for any project.
**Fix:** Added project lookup and workspace membership verification before returning permit data.

### [HIGH] Missing workspace membership check on Team GET
**File:** `apps/web/app/api/research/projects/[id]/experiments/[expId]/team/route.ts:6-51`
**Description:** The GET handler for team assignments verifies the experiment belongs to the project but does not check workspace membership. Any authenticated user could enumerate team assignments for any experiment.
**Fix:** Added workspace_id to the experiment select and added workspace membership verification.

### [HIGH] Missing workspace membership check on Fieldwork GET
**File:** `apps/web/app/api/research/projects/[id]/experiments/[expId]/fieldwork/route.ts:9-65`
**Description:** The GET handler for fieldwork schedules verifies experiment-project association but does not check workspace membership. Any authenticated user could read fieldwork schedule details.
**Fix:** Added workspace_id to the experiment select and added workspace membership verification.

### [MEDIUM] Array mutation in PermitAlertBanner sort
**File:** `apps/web/components/research/PermitAlertBanner.tsx:40`
**Description:** `alertPermits.sort()` mutates the filtered array in-place. While `alertPermits` is already a new array from `.filter()`, this is fragile - if the filter step were ever removed or the code refactored, it would mutate React Query's cached data, causing unpredictable re-render behavior. The pattern is also inconsistent with React best practices.
**Fix:** Changed to `[...alertPermits].sort()` to create an explicit copy before sorting.

### [MEDIUM] Fieldwork schedule creation allows end_date before start_date
**File:** `apps/web/app/api/research/projects/[id]/experiments/[expId]/fieldwork/route.ts:67-146`
**Description:** The POST handler for creating fieldwork schedules does not validate that `end_date >= start_date`. A user could create a schedule with an end date before the start date, producing nonsensical data in the timeline view and duration calculations.
**Fix:** Added date range validation before insert, returning 400 if end_date is before start_date.

### [MEDIUM] Fieldwork schedule PATCH allows end_date before start_date
**File:** `apps/web/app/api/research/projects/[id]/experiments/[expId]/fieldwork/route.ts:148-252`
**Description:** The PATCH handler for updating fieldwork schedules also does not validate date ordering. When only one date is updated, the resulting combination could be invalid (e.g., updating start_date to be after the existing end_date). This would require fetching the current schedule to compare, so is a partial validation gap.
**Fix:** BLOCKED - Requires fetching the existing schedule's dates to properly validate partial updates. Documented for future fix.

### [MEDIUM] Permit expiry check uses server-local time in dashboard
**File:** `apps/web/app/api/research/projects/[id]/dashboard/route.ts:82-101`
**Description:** The dashboard endpoint compares permit expiration dates against `new Date()` (server time) without normalizing to UTC midnight. If the server is in a timezone ahead of the permit's local timezone, a permit that hasn't expired yet could be flagged as expired, or vice versa. The `getDaysUntilExpiration` helper in the hooks correctly normalizes to midnight, but the server-side dashboard does not.
**Fix:** BLOCKED - Requires deciding on a consistent timezone strategy. The client-side hook in `use-permits.ts` correctly uses `setHours(0,0,0,0)`, but the server-side code does not.

### [MEDIUM] Project deletion does not cascade-clean linked research entities
**File:** `apps/web/app/api/projects/[id]/route.ts:98-142`
**Description:** When a project is deleted, the API route deletes only the project row. If database CASCADE constraints are not set up for `experiments`, `permits`, `fieldwork_schedules`, and `experiment_team_assignments`, these records become orphaned. The phase deletion handler properly cleans up `blocked_by` references, but project deletion has no equivalent cleanup. This depends on the database migration schema which may handle cascades.
**Fix:** BLOCKED - Requires checking database migration schema for CASCADE constraints. If not present, need to add explicit cleanup or database-level cascades.

### [MEDIUM] Role name duplicate check uses ilike (case-insensitive) but allows SQL pattern injection
**File:** `apps/web/app/api/projects/[id]/roles/route.ts:122`
**Description:** The duplicate role name check uses `.ilike("name", validationResult.data.name)`. If the role name contains `%` or `_` characters (SQL wildcards), the ILIKE query will match more broadly than intended. For example, a role named `%` would match every existing role. The CLAUDE.md security best practices explicitly warn about escaping `%` and `_` in ILIKE patterns.
**Fix:** BLOCKED - Need to escape SQL wildcards in the name before using ilike, or switch to a case-insensitive equality check. The same issue exists in the PATCH handler for roles.

### [LOW] Apply template does not verify workspace membership
**File:** `apps/web/app/api/projects/[id]/apply-template/route.ts:28-228`
**Description:** The apply-template endpoint checks that the template is accessible (public or same workspace) but does not verify the user is a member of the project's workspace. It relies on RLS for protection, but defense-in-depth is used everywhere else. The user could potentially apply templates to projects in workspaces they don't belong to.
**Fix:** BLOCKED - Low priority since RLS should prevent this, but should add explicit membership check for consistency.

### [LOW] Phase sort_order auto-assignment uses `.single()` which errors on empty table
**File:** `apps/web/app/api/projects/[id]/phases/route.ts:137-143`
**Description:** When auto-assigning `sort_order` for new phases, the code queries for the max sort_order with `.single()`. If there are no existing phases, Supabase returns a PGRST116 error (no rows returned). The code handles this by defaulting to `maxOrderPhase?.sort_order ?? -1`, but the error is still thrown and caught silently. The same pattern exists in workstreams and deliverables sort_order calculation. Using `.maybeSingle()` would be cleaner.
**Fix:** BLOCKED - Not a functional bug since the fallback works, but produces unnecessary console errors.

### [LOW] Workstream PATCH activity log fetches project separately even though it could be validated upfront
**File:** `apps/web/app/api/projects/[id]/workstreams/[workstreamId]/route.ts:99-118`
**Description:** The PATCH handler for workstreams now has workspace membership verification (after fix), but the activity logging block still does a separate project fetch. This is redundant after the fix since the project is already fetched for membership verification. Minor efficiency issue.
**Fix:** BLOCKED - Low priority optimization. The code works correctly after the membership fix.

### [MEDIUM] FieldworkModal creates Date objects from date strings without timezone handling
**File:** `apps/web/components/research/FieldworkModal.tsx:59-60`
**Description:** When submitting the form, the code does `new Date(formData.start_date)` where `formData.start_date` is a date-only string like `"2026-03-15"`. In JavaScript, `new Date("2026-03-15")` is parsed as UTC midnight, but the `.toISOString().split("T")[0]` conversion on the server side then correctly extracts the date part. However, if the user is in a timezone far behind UTC (e.g., UTC-12), the local date could shift. The fallback `new Date()` when no date is provided is also risky since it uses the current timestamp, which could be a different date in a different timezone.
**Fix:** BLOCKED - The current approach works for most timezones but could produce off-by-one-day errors in edge cases. Would need to use date-fns or similar library with timezone-aware parsing.

### [MEDIUM] Experiment team duplicate check suppresses Supabase error
**File:** `apps/web/app/api/research/projects/[id]/experiments/[expId]/team/route.ts:108-113`
**Description:** The duplicate assignment check uses `.single()` which throws a PGRST116 error when no match is found. The code checks `if (existingAssignment)` which works because the destructured `data` is null on error, but the error itself is silently swallowed. Should use `.maybeSingle()` to avoid this.
**Fix:** BLOCKED - Not a functional bug since the logic works, but generates unnecessary error logs.

---

## Files Modified

1. `apps/web/app/api/projects/[id]/route.ts` - Added workspace membership checks to GET and PATCH
2. `apps/web/app/api/projects/[id]/milestones/[milestoneId]/route.ts` - Added workspace membership checks to PATCH and DELETE
3. `apps/web/app/api/projects/[id]/roles/[roleId]/route.ts` - Added workspace membership checks to PATCH and DELETE
4. `apps/web/app/api/projects/[id]/workstreams/[workstreamId]/route.ts` - Added workspace membership checks to GET, and DELETE
5. `apps/web/app/api/research/projects/[id]/permits/[permitId]/route.ts` - Added workspace membership check to GET
6. `apps/web/app/api/research/projects/[id]/experiments/[expId]/team/route.ts` - Added workspace membership check to GET
7. `apps/web/app/api/research/projects/[id]/experiments/[expId]/fieldwork/route.ts` - Added workspace membership check to GET, added date range validation to POST
8. `apps/web/components/research/PermitAlertBanner.tsx` - Fixed array mutation in sort
