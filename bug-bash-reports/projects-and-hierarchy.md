# Projects & Hierarchy Bug Bash Report

## Critical Bugs

- **[app/api/projects/[id]/route.ts:19-29] GET fetches ALL tasks for project detail, causing unbounded data load and potential OOM.** The `GET /api/projects/[id]` endpoint eagerly selects `tasks:tasks(*)` with no limit or pagination. A project with thousands of tasks would return an enormous payload, causing slow responses, excessive memory use, and potential timeouts. The task data is only used for counting (lines 40-41), so `tasks:tasks(count)` should be used instead (like the list endpoint does).

- **[app/api/projects/[id]/milestones/[milestoneId]/route.ts:6-78] PATCH and DELETE on milestones have no workspace membership check (IDOR vulnerability).** Unlike the parent `milestones/route.ts` GET/POST which verify workspace membership, the `[milestoneId]` PATCH (line 6) and DELETE (line 50) operations only check auth, then directly update/delete by milestoneId. An authenticated user could update or delete milestones belonging to any project in any workspace by guessing/enumerating milestone UUIDs. While RLS provides a backstop, the code comment on line 30 "enforced by RLS" in the notes route shows the team is aware of this pattern but chose defense-in-depth for notes -- milestones lack it entirely, and the `id` param from the URL path is never even used to cross-check the milestone belongs to the claimed project.

- **[app/api/projects/[id]/notes/[noteId]/route.ts:6-85] PATCH and DELETE on notes lack workspace membership verification.** Same IDOR pattern as milestones. The `[noteId]` endpoints check auth and add a `user_id` filter (defense-in-depth for ownership), but never verify the note belongs to the project in the URL or that the user has workspace membership. A user could manipulate the URL project ID freely.

- **[app/api/projects/[id]/roles/[roleId]/route.ts:6-102] PATCH and DELETE on roles have no workspace membership check (IDOR vulnerability).** The PATCH handler (line 6) and DELETE handler (line 68) only check auth, then operate directly on `roleId` without verifying the user is a member of the project's workspace. DELETE even cascades to remove all phase assignments for that role (line 82-85). An authenticated user could delete roles and their assignments in any project.

- **[app/api/projects/[id]/workstreams/[workstreamId]/route.ts:6-168] GET and DELETE on single workstreams have no workspace membership check.** GET (line 6) directly fetches by workstreamId without any workspace check. DELETE (line 127) unlinks tasks and deliverables then deletes the workstream with only auth verification. The PATCH handler (line 62) also lacks upfront workspace membership verification, though it does fetch the project for activity logging.

- **[app/api/projects/route.ts:27-35] GET endpoint lacks workspace membership verification.** The list endpoint accepts any `workspace_id` query parameter and queries projects filtered by that ID. While Supabase RLS protects the data, the API route itself performs no server-side check that the authenticated user is a member of the requested workspace. If RLS were ever misconfigured, this would be a full data exposure.

- **[app/api/projects/[id]/apply-template/route.ts:85-163] Template application is not atomic -- partial failures leave orphaned data.** Roles are created in a loop (line 85), then phases (line 112), then deliverables (line 139), then blocking relationships (line 166). If any step fails midway (e.g., a phase creation fails at line 130 with `continue`), the operation leaves behind orphaned roles and partial phases with no rollback. The `continue` on errors at lines 100, 131 silently swallows failures, creating inconsistent state.

## Medium Issues

- **[app/api/projects/[id]/apply-template/route.ts:176-178] Redundant status check in blocking relationship update.** Line 178 checks `blockedBy.length > 0 ? "blocked" : "pending"` but this code is only reached when `blockedBy.length > 0` (line 176 already confirms this), so the ternary will always evaluate to `"blocked"`. This is dead logic but not harmful.

- **[app/api/projects/[id]/phases/route.ts:136] Sort order auto-increment has a race condition.** The `POST /phases` endpoint fetches the max `sort_order` (line 137-143) then inserts with `max + 1` (line 145). Two concurrent phase creation requests could read the same max value and assign the same `sort_order`, violating the intended ordering. Same issue exists in `deliverables/route.ts:122-133` and `workstreams/route.ts:143-155`.

- **[app/api/projects/[id]/phases/[phaseId]/route.ts:45-57] GET single phase does not verify phase belongs to the specified project.** The handler verifies workspace membership using `projectId`, but then fetches the phase only by `phaseId` (line 56: `.eq("id", phaseId)`) without also filtering by `project_id`. A user could pass a valid `projectId` they have access to but fetch a `phaseId` from a different project they don't own. RLS would still protect cross-workspace access, but within the same workspace, phases from one project could be viewed through another project's URL.

- **[app/api/projects/[id]/phases/[phaseId]/route.ts:131-136] PATCH on phase does not verify phase belongs to specified project.** The update at line 134 only filters by `.eq("id", phaseId)`, not also by `project_id`. Similar cross-project issue within the same workspace.

- **[app/api/projects/[id]/phases/[phaseId]/route.ts:207-210] DELETE on phase does not verify phase belongs to specified project.** The delete at line 209 only filters by `.eq("id", phaseId)`.

- **[app/api/projects/[id]/phases/[phaseId]/start/route.ts:45-53] Start phase does not verify phase belongs to specified project.** Fetches phase by `phaseId` only (line 48), no `project_id` filter. User could start a phase from a different project within the same workspace.

- **[app/api/projects/[id]/phases/[phaseId]/complete/route.ts:45-53] Complete phase does not verify phase belongs to specified project.** Same issue -- fetches by `phaseId` alone.

- **[app/api/projects/[id]/phases/[phaseId]/complete/route.ts:59-63] Blocked phases can be completed.** The status check at line 59 only prevents completing `pending` phases and already-completed phases. A phase with status `"blocked"` would pass both checks (it's not `"completed"`, and it's not `"pending"`) and could be completed directly, skipping the blocking constraint entirely.

- **[app/api/projects/[id]/phases/[phaseId]/deliverables/route.ts:228-232] PATCH and DELETE on deliverables use query param `deliverableId` with no validation that the deliverable belongs to the specified phase.** The PATCH (line 231) and DELETE (line 310) update/delete by `deliverableId` alone, not also filtering by `phase_id`. A user could manipulate deliverables across phases within the same project.

- **[app/api/projects/[id]/phases/[phaseId]/assignments/route.ts:120-127] Duplicate assignment check uses `.eq()` with `null` which may not match SQL NULL.** Lines 125-126 use `.eq("role_id", validationResult.data.role_id || null)` and `.eq("user_id", validationResult.data.user_id || null)`. In PostgreSQL/Supabase, `column = NULL` is never true (it should be `IS NULL`). So when `role_id` or `user_id` is null/undefined, the duplicate check will never find an existing match, allowing unlimited duplicate assignments with null role/user combinations.

- **[app/api/projects/[id]/phases/[phaseId]/assignments/route.ts:228-231] DELETE on assignments has no verification that assignment belongs to the specified phase.** Deletes by `assignmentId` alone with no `phase_id` filter.

- **[app/api/projects/[id]/route.ts:112-130] DELETE only allows project owner, not workspace admins.** The check at line 123 (`project.owner_id !== user.id`) restricts deletion to the owner. However, the RLS policy (migration `20241217000002`) allows workspace `owner` and `admin` roles to delete. The API route is more restrictive than the database policy, which may confuse workspace admins who can't delete projects through the API but could through direct DB access.

- **[app/api/projects/[id]/route.ts:19-29] GET single project selects `collaborators:project_collaborators(*)` -- potential N+1 or large payload.** The query joins collaborators alongside milestones, notes, and all tasks. Combined with the full tasks select, this creates a very large, deeply nested response. If the `project_collaborators` table has many rows, this amplifies the problem.

- **[components/projects/linked-tasks.tsx:17-19] useTasks called with undefined filter when initialTasks provided.** When `initialTasks` is truthy, `useTasks` is called with `undefined` as the filter. Since `useTasks` has no `enabled` guard, it will still fire a fetch request to `/api/tasks` with no filters, loading ALL tasks for no reason. This is a wasted network request.

- **[components/projects/linked-tasks.tsx:151] LinkTaskModal fetches ALL workspace tasks without pagination.** Line 151 fetches all tasks in the workspace to find unlinked ones. In workspaces with many tasks, this could be very slow and load excessive data into memory.

- **[lib/hooks/use-project-hierarchy.ts:170-172] startPhase error handler uses JSON.parse on error message, fragile.** Line 171 serializes the error response as JSON string, then line 95-96 in PhaseCard.tsx tries to `JSON.parse(error.message)`. This is a brittle contract; if the API error format changes, it will silently fall through to `alert(error.message)` which would show raw JSON.

- **[components/projects/hierarchy/PhaseTimeline.tsx:38-39] New phases always blocked by the last phase, even if that phase is completed.** When adding a new phase (line 38-39), it's automatically set to be blocked by the last existing phase. If that phase is already completed, the new phase will be immediately created as "pending" but with a `blocked_by` containing a completed phase. The server would need to evaluate this, but the initial status is set to "pending" by default in the schema, which is correct -- however, the blocking relationship is misleading.

- **[app/api/projects/[id]/apply-template/route.ts:117-128] Phase creation in template does not set `assigned_role` field correctly.** Line 124 sets `assigned_role: phaseDef.assigned_role` which is a string like "Business Analyst", but line 156-162 creates a separate phase assignment record using the roleIdMap. The `assigned_role` text field on the phase will not correspond to any role ID, only a display name. This creates a disconnect between the phase's `assigned_role` text and the actual assignment records.

## Low / Code Quality

- **[app/api/projects/[id]/route.ts:11] `id` param destructured but project `id` is already available from params.** Minor: the variable naming is fine, but the GET handler could be more consistent with other routes that alias `id` as `projectId`.

- **[app/api/projects/[id]/phases/[phaseId]/start/route.ts:108-116] Activity log inserts non-standard fields.** Line 113 inserts `phase_id: phaseId` as a direct column on `workspace_activity`, and line 115 duplicates it in the `details` JSON. This redundancy is harmless but inconsistent with other activity logs.

- **[app/api/projects/[id]/phases/[phaseId]/deliverables/route.ts:147-155] Activity log inserts `deliverable_id` as a column.** Line 152 tries to set `deliverable_id` on `workspace_activity`. This column may not exist as a direct column; it would fail silently if the column doesn't exist but Supabase would return an error.

- **[app/api/projects/[id]/workstreams/route.ts:72] `overdueTasks` is always 0 -- dead placeholder code.** Line 72 hardcodes `const overdueTasks = 0` with a comment "Would need to check due dates". The `overdue_task_count` is always 0, making the entire overdue feature in WorkstreamTabs (line 217-222) non-functional dead code.

- **[components/projects/hierarchy/ApplyTemplateModal.tsx:34-41] Built-in template application is a stub.** The `useBuiltIn` code path (line 34-41) shows an `alert()` and returns, making the "Built-in Templates" section of the modal non-functional. It's effectively dead UI that confuses users.

- **[components/projects/project-card.tsx:42] Color class string manipulation is fragile.** Line 42 does `typeConfig.color.replace("bg-", "text-")` to derive a text color from a background color. This string manipulation assumes all color values follow the `bg-X` pattern and would break with custom or different format color strings.

- **[components/projects/project-notes.tsx:57-61] Client-side re-sorting duplicates server-side sort.** The notes API already sorts by `is_pinned DESC, created_at DESC`. The component re-sorts with the same logic at lines 57-61. This is redundant.

- **[lib/hooks/use-projects.ts:331-353] useToggleMilestoneComplete spreads updateMilestone but doesn't properly forward isPending/isError.** The spread `...updateMilestone` works at the top level, but the custom `mutate` method shadows the original, and `mutateAsync` is not provided, making async usage impossible from consumers of `useToggleMilestoneComplete`.

- **[lib/hooks/use-projects.ts:483-502] useToggleNotePin same issue as useToggleMilestoneComplete.** Same pattern: spreads the underlying mutation but shadows `mutate` and doesn't expose `mutateAsync`.

- **[lib/hooks/use-project-hierarchy.ts:597-620] useCompleteDeliverable same spread-and-shadow pattern.** Same issue as the toggle hooks above.

- **[app/api/projects/[id]/workstreams/[workstreamId]/route.ts:68] `projectId` destructured but never used for workspace verification in PATCH.** Line 68 destructures `projectId` from params and uses it only for the workspace activity log (lines 101-117), but the update at line 88-91 has no workspace membership check before executing. The workspace verification only happens inside the activity logging conditional block.

- **[app/api/projects/[id]/roles/[roleId]/route.ts:11] `projectId` used for duplicate name check but no workspace membership check.** The PATCH handler checks for duplicate role names within the project (line 35) but never verifies the user has workspace membership before allowing the update.

- **[components/projects/linked-tasks.tsx:3-4] Unused imports.** `Plus` and `Link2` are imported from lucide-react -- `Plus` is used on line 68 but `Link2` is only used in LinkTaskModal. Both are used, so this is actually fine. However, the `ExternalLink` icon import is used.

- **[app/api/projects/[id]/phases/[phaseId]/route.ts:156] `projectId` destructured but DELETE does not verify the phase belongs to that project.** The `projectId` is used for workspace membership check but the actual delete operates on any `phaseId` without verifying it belongs to `projectId`.

## Summary

7 critical, 17 medium, 12 low
