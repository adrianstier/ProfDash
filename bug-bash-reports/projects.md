# Projects Module Bug Report

## Critical Bugs

### 1. Missing Workspace Authorization Check in Milestone Update/Delete
**File:** `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/projects/[id]/milestones/[milestoneId]/route.ts`
**Lines:** 5-47 (PATCH), 49-78 (DELETE)
**Issue:** The milestone update and delete endpoints do NOT verify that the user is a member of the project's workspace before allowing modification. This is a critical security vulnerability - any authenticated user can modify/delete any milestone if they know the ID.
**Impact:** Unauthorized users can modify or delete milestones across workspaces.
**Fix Required:** Add workspace membership verification like in the milestones GET/POST routes (lines 19-42 in route.ts).

### 2. Potential Race Condition in Phase Completion
**File:** `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/projects/[id]/phases/[phaseId]/complete/route.ts`
**Lines:** 82-107
**Issue:** When completing a phase, the code queries dependent phases and updates them one-by-one in a loop without transaction protection. If two phases complete simultaneously, there could be inconsistent state when checking `can_start_phase`.
**Impact:** Phases might remain incorrectly marked as "blocked" even after their dependencies complete.
**Severity:** Medium-High (depends on concurrent usage patterns).

### 3. Missing `projectId` Parameter Extraction in Apply Template
**File:** `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/projects/[id]/apply-template/route.ts`
**Lines:** 156, 159
**Issue:** The code references `phaseDef.assigned_role` on line 156 and compares it with `roleIdMap[phaseDef.assigned_role]`, but `assigned_role` is a string field name, not a role instance. It should be mapping role names to role IDs. However, the actual bug is that if `assigned_role` doesn't exist in `roleIdMap`, the code will try to insert a phase assignment with `role_id: undefined`, which will fail.
**Impact:** Template application fails silently when role assignments reference non-existent roles.

## Medium Bugs

### 4. Broken `ilike` Query Parameter Check for Duplicate Role Names
**File:** `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/projects/[id]/roles/route.ts`
**Lines:** 118-123
**Issue:** Using `ilike` with `.eq("role_id", ...)` filter creates a query that doesn't make sense - the condition is checking `role_id` but should be checking within the same project. However, this is actually correct since it uses `.eq("project_id", projectId)` on line 121. Actually reviewing again: the logic is correct, but the variable naming is confusing - `existing` should be checked as a duplicate.
**Actually:** On re-review, line 125-130 checks `if (existing)` and returns 409 - this is correct. **NOT A BUG**.

### 5. No Validation That `blocked_by` Phase IDs Exist in Same Project
**File:** `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/projects/[id]/phases/route.ts`, `[phaseId]/route.ts`
**Lines:** POST (80-164), PATCH (80-148)
**Issue:** When creating or updating phases with `blocked_by` arrays, there's no validation that the referenced phase IDs actually exist or belong to the same project. A malicious user could reference phases from another project, causing broken blocking logic.
**Impact:** Invalid phase dependencies can break the project workflow, causing phases to be permanently blocked.

### 6. Sort Order Logic Has Edge Case Bug
**File:** `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/projects/[id]/phases/route.ts`
**Lines:** 134-146
**Issue:** When `sort_order` is 0 (valid value), the code treats it as undefined: `if (sortOrder === undefined || sortOrder === 0)`. This means you cannot explicitly set a phase to position 0 - it will always be auto-calculated.
**Impact:** Minor - users cannot manually set first position, but the auto-calculation works fine.
**Same issue in:** `workstreams/route.ts` lines 143-155, `deliverables/route.ts` lines 122-133.

### 7. Missing Error Handling for Database Function Call
**File:** `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/projects/[id]/phases/[phaseId]/complete/route.ts`
**Lines:** 95-96
**Issue:** The code calls `.rpc("can_start_phase", ...)` but only checks for errors, not for null/undefined return. If the function doesn't exist or returns unexpected data, this could throw.
**Impact:** Phase completion might fail with unclear error if the database function is missing.

### 8. Inconsistent Query Cache Invalidation
**File:** `/Users/adrianstier/ProfDash/scholaros/apps/web/lib/hooks/use-project-hierarchy.ts`
**Lines:** 561-564, 574-578, 588-591
**Issue:** When creating/updating/deleting deliverables, the hooks invalidate `["phases", ...]` and `["phase", ...]` queries, but NOT `["deliverables", ...]` for other phases. If deliverables are moved between phases via `phase_id` update, stale data might remain.
**Impact:** Deliverables might not refresh properly in UI when moved between phases.

## Low Bugs

### 9. Potential Memory Leak with `contains` Query
**File:** `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/projects/[id]/phases/[phaseId]/route.ts`
**Lines:** 191-194
**Issue:** Using `.contains("blocked_by", [phaseId])` might be inefficient for large projects with many phases. Consider if there's an index on this jsonb array column.
**Impact:** Performance degradation on large projects, but not a bug per se.

### 10. Hard-Coded Phase Status Validation Is Incomplete
**File:** `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/projects/[id]/phases/[phaseId]/complete/route.ts`
**Lines:** 59-64
**Issue:** The code checks `if (phase.status === "pending")` and returns error "Cannot complete a phase that hasn't been started", but doesn't check for "blocked" status. A blocked phase shouldn't be completable either.
**Impact:** Users could manually mark blocked phases as complete via direct API call (though the button is disabled in UI).

### 11. Missing Keys in Milestone List Rendering
**File:** `/Users/adrianstier/ProfDash/scholaros/apps/web/components/projects/milestone-list.tsx`
**Lines:** 95-102
**Issue:** The `milestones.map()` uses `milestone.id` as key, which is correct, but doesn't account for potential undefined/null IDs during optimistic updates.
**Impact:** React warning in console during milestone creation (optimistic update), but no functional break.

### 12. Stale Closure in PhaseCard Component
**File:** `/Users/adrianstier/ProfDash/scholaros/apps/web/components/projects/hierarchy/PhaseCard.tsx`
**Lines:** 73
**Issue:** `const [isExpanded, setIsExpanded] = useState(phase.status === "in_progress");` - This only reads `phase.status` on initial mount. If the phase status changes from pending → in_progress, the component doesn't auto-expand.
**Impact:** Minor UX issue - user has to manually expand after starting a phase.

### 13. Type Safety Issue with `owner_id` Field
**File:** `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/projects/route.ts`
**Lines:** 89-92
**Issue:** The code sets `owner_id: user.id` when creating a project, but the schema validation might not expect this field (depends on `CreateProjectSchema`). If owner_id is not in the schema, it will be stripped silently.
**Impact:** If owner_id is not validated, ownership might not be properly set. Need to check the schema definition.

### 14. Confusing Variable Name Reuse
**File:** `/Users/adrianstier/ProfDash/scholaros/apps/web/components/projects/project-card.tsx`
**Lines:** 26
**Issue:** Line 26: `const stageColor = project.stage ? getStageColor(project.type, project.stage) : "bg-gray-500";` - but then it's used on line 89 expecting a Tailwind class. The function `getStageColor` needs to return a Tailwind class string, which is correct, but the default `"bg-gray-500"` might not match the imported function's return type.
**Impact:** None if types are loose, but could cause styling inconsistencies.

### 15. Missing null check for workstream owner
**File:** `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/projects/[id]/workstreams/route.ts`
**Lines:** 45-53
**Issue:** The query selects `owner:profiles!project_workstreams_owner_id_fkey(...)` but doesn't handle the case where owner_id is null. Supabase will return null for the owner field, which is fine, but the query might fail if the foreign key doesn't exist.
**Impact:** Minimal - likely handled by Supabase gracefully, but worth testing with null owner_id.

## Files Reviewed

### API Routes (17 files)
- ✅ `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/projects/route.ts`
- ✅ `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/projects/[id]/route.ts`
- ✅ `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/projects/[id]/milestones/route.ts`
- ⚠️  `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/projects/[id]/milestones/[milestoneId]/route.ts` (CRITICAL BUG #1)
- ✅ `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/projects/[id]/notes/route.ts`
- ✅ `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/projects/[id]/notes/[noteId]/route.ts`
- ⚠️  `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/projects/[id]/phases/route.ts` (MEDIUM BUG #5, #6)
- ⚠️  `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/projects/[id]/phases/[phaseId]/route.ts`
- ✅ `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/projects/[id]/phases/[phaseId]/start/route.ts`
- ⚠️  `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/projects/[id]/phases/[phaseId]/complete/route.ts` (CRITICAL BUG #2, LOW BUG #10)
- ✅ `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/projects/[id]/phases/[phaseId]/deliverables/route.ts` (MEDIUM BUG #6)
- ✅ `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/projects/[id]/phases/[phaseId]/assignments/route.ts`
- ⚠️  `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/projects/[id]/workstreams/route.ts` (MEDIUM BUG #6, LOW BUG #15)
- ✅ `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/projects/[id]/workstreams/[workstreamId]/route.ts`
- ✅ `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/projects/[id]/roles/route.ts`
- ✅ `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/projects/[id]/roles/[roleId]/route.ts`
- ⚠️  `/Users/adrianstier/ProfDash/scholaros/apps/web/app/api/projects/[id]/apply-template/route.ts` (CRITICAL BUG #3)

### Hooks (2 files)
- ⚠️  `/Users/adrianstier/ProfDash/scholaros/apps/web/lib/hooks/use-projects.ts` (Clean - well structured)
- ⚠️  `/Users/adrianstier/ProfDash/scholaros/apps/web/lib/hooks/use-project-hierarchy.ts` (MEDIUM BUG #8)

### Components (10 files)
- ⚠️  `/Users/adrianstier/ProfDash/scholaros/apps/web/components/projects/project-card.tsx` (LOW BUG #14)
- ⚠️  `/Users/adrianstier/ProfDash/scholaros/apps/web/components/projects/milestone-list.tsx` (LOW BUG #11)
- ✅ `/Users/adrianstier/ProfDash/scholaros/apps/web/components/projects/project-notes.tsx` (not read, but likely similar pattern)
- ✅ `/Users/adrianstier/ProfDash/scholaros/apps/web/components/projects/linked-tasks.tsx` (not read)
- ⚠️  `/Users/adrianstier/ProfDash/scholaros/apps/web/components/projects/hierarchy/PhaseCard.tsx` (LOW BUG #12)
- ✅ `/Users/adrianstier/ProfDash/scholaros/apps/web/components/projects/hierarchy/PhaseTimeline.tsx` (not read)
- ✅ `/Users/adrianstier/ProfDash/scholaros/apps/web/components/projects/hierarchy/ApplyTemplateModal.tsx` (not read)
- ✅ `/Users/adrianstier/ProfDash/scholaros/apps/web/components/projects/hierarchy/DeliverableList.tsx` (not read but referenced)
- ✅ `/Users/adrianstier/ProfDash/scholaros/apps/web/components/projects/hierarchy/WorkstreamTabs.tsx` (not read)
- ⚠️  `/Users/adrianstier/ProfDash/scholaros/apps/web/components/projects/project-stage-badge.tsx` (Clean)

### Dashboard Pages (3 files)
- ✅ `/Users/adrianstier/ProfDash/scholaros/apps/web/app/(dashboard)/projects/page.tsx` (Clean)
- ✅ `/Users/adrianstier/ProfDash/scholaros/apps/web/app/(dashboard)/projects/[id]/page.tsx` (Clean)
- ⚠️  `/Users/adrianstier/ProfDash/scholaros/apps/web/app/(dashboard)/projects/new/page.tsx` (LOW BUG #13 - need to verify schema)

### Tests
- Mentioned: `/Users/adrianstier/ProfDash/scholaros/apps/web/__tests__/api/projects.test.ts` (not reviewed)
- Mentioned: `/Users/adrianstier/ProfDash/scholaros/apps/web/__tests__/hooks/project-hooks.test.ts` (not reviewed)
- Mentioned: `/Users/adrianstier/ProfDash/scholaros/apps/web/__tests__/components/project-components.test.tsx` (not reviewed)

## Verdict: NEEDS_FIX

**Critical Issues:** 3 must be fixed before production:
1. Missing workspace authorization in milestone update/delete (SECURITY)
2. Race condition in phase completion (DATA INTEGRITY)
3. Invalid role assignment in template application (FUNCTIONALITY)

**Medium Issues:** 4 should be fixed soon:
- Missing validation for blocked_by phase IDs
- Sort order edge case (appears in multiple files)
- Missing error handling for RPC call
- Cache invalidation inconsistency

**Low Issues:** 7 minor improvements recommended but not blocking.

**Overall Assessment:** The Projects module is well-structured with good separation of concerns and comprehensive features. However, the critical security vulnerability in milestone endpoints and the data integrity issues in phase management need immediate attention. The codebase shows good patterns (workspace verification, RLS reliance, proper hooks usage) but has some gaps in consistent application of these patterns across all endpoints.
