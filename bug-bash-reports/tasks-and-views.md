# Tasks & Views Bug Bash Report

## Critical Bugs

- [apps/web/app/api/tasks/[id]/complete-recurring/route.ts:61-65] **Missing ownership check on recurring task fetch.** The `complete-recurring` endpoint fetches the task with `.eq("id", id).single()` but does NOT filter by `user_id` or rely on RLS with a user_id filter. If RLS policies are permissive for workspace tasks, any workspace member could complete another user's recurring task. Compare with `[id]/route.ts:24` which correctly adds `.eq("user_id", user.id)`.

- [apps/web/app/api/tasks/[id]/route.ts:65-71] **PATCH update missing user_id/ownership filter.** The comment says "RLS policy enforces ownership" but the update query does `.eq("id", id)` without `.eq("user_id", user.id)`. If RLS allows workspace members to read each other's tasks (common for collaboration), any member could update any task they can read. The GET handler at line 24 correctly adds the user_id check but PATCH does not.

- [apps/web/app/api/tasks/[id]/route.ts:101-104] **DELETE missing user_id filter.** Same issue as PATCH -- deletes by `id` only without `user_id` filter. Any user who can read the task via RLS could delete it.

- [apps/web/app/api/tasks/bulk/route.ts:69-73] **Bulk PATCH missing user_id filter.** The bulk update uses `.in("id", taskIds)` without any `user_id` or ownership check. The comment says "RLS will handle workspace-level permissions" but this allows any workspace member to bulk-update tasks they don't own.

- [apps/web/app/api/tasks/bulk/route.ts:123-126] **Bulk DELETE missing user_id filter.** Same as above -- `.in("id", taskIds)` with no ownership check.

- [apps/web/app/api/task-templates/route.ts:111] **SQL pattern injection via unsanitized ILIKE.** The duplicate check uses `.ilike("name", validationResult.data.name)` directly. If the user submits a name containing `%` or `_` (SQL wildcard characters), the ILIKE will match unintended rows. For example, a name of `%` would match all templates, incorrectly reporting a duplicate. The `name` field is user-controlled from the Zod-validated input but Zod does not strip `%` or `_`.

- [apps/web/app/api/templates/route.ts:79] **Same SQL pattern injection via unsanitized ILIKE** in the project templates duplicate check.

- [apps/web/app/api/task-templates/route.ts:203] **Broken authorization logic for PATCH.** Line 203: `if (template.created_by !== user.id && !template.is_builtin)` -- this condition is inverted. It returns 403 when the user is NOT the creator AND the template is NOT builtin. This means built-in templates CAN be updated by anyone. The intent was likely to prevent non-creators from editing, and separately prevent editing built-in templates. The correct check should be `if (template.is_builtin || template.created_by !== user.id)`.

- [apps/web/app/api/tasks/import/route.ts:62] **No validation on workspace_id from multipart form data.** When importing via CSV (multipart), `workspace_id` is extracted as a raw string from `formData.get("workspace_id")` without UUID validation. A malicious client could send an arbitrary string that gets passed directly to the Supabase insert. The JSON path validates via `ImportRequestSchema` but the CSV path does not validate `workspace_id`.

## Medium Issues

- [apps/web/app/api/tasks/route.ts:68-81] **Default query shows only user's own tasks, missing workspace tasks.** When no `workspace_id` is provided (line 79), the query filters by `user_id` only. This means workspace tasks where the current user is NOT the `user_id` (e.g., tasks assigned to them but created by someone else) will not appear. The "all tasks the user has access to" comment is misleading.

- [apps/web/app/api/tasks/route.ts:104-107] **"Today" filter includes tasks with no due date.** Line 106: `query.or('due.eq.${today},due.is.null')` -- the "today" API filter returns ALL tasks with no due date alongside today's tasks. This is a surprising API behavior; the hook `useTodayTasks()` at use-tasks.ts:126 will get tasks with no due date mixed in, which may lead to confusion in the Today view where the client-side also applies date logic.

- [apps/web/app/api/tasks/[id]/complete-recurring/route.ts:97-107] **Non-atomic recurring task completion.** Marking the task as done and creating the next occurrence are separate database operations with no transaction. If the server crashes between the update (line 99-102) and the insert (line 167-171), the recurring chain breaks -- the task is marked done but no next occurrence is created.

- [apps/web/app/api/tasks/[id]/complete-recurring/route.ts:110-117] **Unchecked error on stop-recurrence update.** The `await supabase.from("tasks").update(...)` for stopping recurrence doesn't check the returned error. If this update fails, the function returns success anyway with stale data (returns `{ ...task, status: "done" }` which is a spread of the original task, not the actual DB state).

- [apps/web/app/api/tasks/[id]/complete-recurring/route.ts:135-140] **Same unchecked error on end-of-series update.** The update to set `is_recurring: false` doesn't check the error result.

- [apps/web/app/api/tasks/[id]/complete-recurring/route.ts:317] **MONTHLY recurrence date can silently shift.** `nextDate.setMonth(nextDate.getMonth() + interval)` without pinning the day -- if the current date is Jan 31 and interval is 1, JavaScript's Date will roll to Mar 2 or 3 (February overflow). This causes recurring monthly tasks to drift forward by days.

- [apps/web/app/api/tasks/export/route.ts:38-42] **Export with workspace_id only filters by workspace, not user ownership.** When exporting with a workspace_id, there's no check that the user is a member of that workspace. RLS may cover this, but there's no explicit membership verification like the task-templates route does.

- [apps/web/app/api/tasks/export/route.ts:41] **Export without workspace_id requires both null workspace AND matching user_id.** Line 41: `.is("workspace_id", null).eq("user_id", user.id)`. This only exports personal tasks. If the user expects "export all my tasks" (including workspace tasks), they must explicitly provide each workspace_id.

- [apps/web/app/api/tasks/bulk/route.ts:138] **Inaccurate delete count fallback.** Line 138: `deleted: count || taskIds.length` -- if `count` is 0 (no tasks deleted, e.g., all failed RLS), this falls back to `taskIds.length`, falsely reporting all tasks as deleted.

- [apps/web/app/api/tasks/import/route.ts:286-306] **Ambiguous date parsing favors MM/DD/YYYY over DD/MM/YYYY.** The `normalizeDate` function tries MM/DD/YYYY first. For dates like "01/02/2024", it will always interpret as January 2 (US format), which is wrong for international users expecting February 1. There's no way for the user to specify which format their CSV uses.

- [apps/web/lib/hooks/use-tasks.ts:42-44] **workspace_id null filter is overridden.** Lines 43-44: `if (filters?.workspace_id) params.set(...)` runs first, but then line 44 checks `if (filters?.workspace_id === null)`. However, `null` is falsy, so line 43's check `if (filters?.workspace_id)` would never be true when workspace_id is null. Line 44 then correctly catches the null case. BUT if workspace_id is an empty string `""`, line 43 is false and line 44 is also false, so it's silently dropped -- no workspace_id parameter is sent, which returns all tasks for the user instead of personal tasks.

- [apps/web/lib/hooks/use-tasks.ts:106] **useTasks select discards pagination info.** The `useTasks` hook uses `select: (response) => response.data` which strips out the pagination metadata. The sibling `useTasksWithPagination` returns it, but `useTasks` is used far more widely. Components using `useTasks` have no way to know total count or whether more pages exist.

- [apps/web/lib/utils/recurrence.ts:204-273] **getNextOccurrences includes the start date itself.** The function starts from `startDate` and on the first iteration for non-byDay rules, it adds `current` (which is the start date) as the first occurrence. If called with the task's due date as `startDate`, the first "next occurrence" is the due date itself rather than the following one.

- [apps/web/components/tasks/task-card.tsx:251-253] **Overdue detection uses Date comparison without timezone normalization.** `new Date(task.due) < new Date()` compares a date string (YYYY-MM-DD) parsed as UTC midnight against the local time `new Date()`. In timezones behind UTC (e.g., US Pacific), a task due today could appear overdue before midnight local time because UTC midnight has already passed.

- [apps/web/components/tasks/task-list.tsx:137] **Fallback to mock data in production.** Line 137: `fetchedTasks || mockTasks` -- if the API returns an empty array (user has zero tasks), `fetchedTasks` is `[]` which is truthy so this is fine. But if `fetchedTasks` is `undefined` (query disabled or not yet loaded), mock data with fake IDs is shown. This could lead to "Task not found" errors if the user tries to interact with mock tasks in production.

- [apps/web/components/tasks/task-detail-drawer.tsx:116] **Using `confirm()` blocks the UI.** The `handleDelete` function uses `window.confirm()` which is a blocking browser dialog. This is inconsistent with the `BulkActionsToolbar` which uses a proper `AlertDialog` component. The blocking dialog can cause issues in some mobile browsers.

- [apps/web/components/tasks/task-detail-drawer.tsx:61-62] **Projects hook called with empty string when no workspace.** `useProjects({ workspace_id: currentWorkspaceId ?? "" })` -- when `currentWorkspaceId` is null, this passes an empty string as workspace_id, which will fail UUID validation on the API side or return no results. Should be conditionally enabled.

- [apps/web/app/api/task-templates/route.ts:30-32] **RPC call without error handling.** The `seed_builtin_task_templates` RPC call doesn't check the returned error. If the function doesn't exist or fails, the error is silently swallowed and the subsequent query may return incomplete data.

- [apps/web/app/api/task-templates/route.ts:268] **DELETE proceeds even if template not found.** When `template` is null (not found), the code falls through to the delete query at line 275, which will silently delete nothing and return success. Should return 404.

- [apps/web/app/api/templates/route.ts:149-153] **PATCH proceeds if template not found.** When `template` is null (not found), the condition `template && template.created_by !== user.id` is false, so it falls through to the update. The update will likely fail with a Supabase error, but returning a proper 404 would be clearer.

- [apps/web/app/api/templates/route.ts:202] **DELETE proceeds if template not found.** Same issue -- when `template` is null, the ownership check `template && template.created_by !== user.id` is false, so deletion proceeds on a non-existent row.

## Low / Code Quality

- [apps/web/lib/hooks/use-tasks.ts:3-4] **Unused type imports.** `TaskCategory`, `TaskPriority`, `TaskStatus` are imported as types but are also re-defined inline in the `TaskFilters` interface using string literals that match those types. This is technically fine but creates a maintenance risk if the types diverge.

- [apps/web/app/api/tasks/import/route.ts:1] **Unused import.** `NextRequest` is imported but could use `Request` consistently with other routes (though `NextRequest` is functionally fine).

- [apps/web/app/api/tasks/bulk/route.ts:1] **Inconsistent Request type.** Uses `NextRequest` while other task routes use `Request`. Not a bug but inconsistent.

- [apps/web/components/tasks/task-list.tsx:16-65] **Mock data hardcoded in production component.** The `mockTasks` array with fake user IDs ("user-1") and simple string IDs ("1", "2", "3") is always present in the bundle. This adds dead weight and could surface in production as a fallback (see medium issue above).

- [apps/web/lib/hooks/use-task-templates.ts:116] **No update hook for task templates.** There is an `updateTaskTemplate` API endpoint (PATCH) in the route file, but no corresponding `useUpdateTaskTemplate` hook. The template picker and save modal have no way to update existing templates from the client.

- [apps/web/lib/stores/task-store.ts:3] **Unused import.** `sortByUrgency` is imported from `task-grouping` but is only used by the `sortTasks` helper function that's also defined in this file. The import is used, but the function `sortTasks` re-delegates to it, which is fine -- not actually unused.

- [apps/web/components/tasks/task-card.tsx:98-137] **categoryConfig has extra categories not in API validation.** The `categoryConfig` object includes `meeting`, `analysis`, `submission`, `revision`, `presentation`, `writing`, `reading`, `coursework` -- which match the shared schema's extended `TaskCategorySchema`. However, the bulk operations `BulkUpdateSchema` in `bulk/route.ts:11-19` only allows the original 7 categories, not the academic ones. A user who has tasks with academic categories cannot bulk-update them to those categories.

- [apps/web/app/api/tasks/[id]/complete-recurring/route.ts:227-231] **Unreachable code.** The final `return NextResponse.json(...)` at line 227-231 after the `isRecurringInstance` block is unreachable. All code paths (non-recurring at line 76-93, parent at line 97-188, instance at line 191-225) have already returned.

- [apps/web/components/tasks/today-progress.tsx:9] **TodayProgress fetches ALL tasks without filters.** `useTasks()` is called with no arguments, which fetches all tasks for the user. This is then client-side filtered for "today" tasks. For users with many tasks, this fetches and transfers unnecessary data.

- [apps/web/lib/utils/task-grouping.ts:29-33] **Date parsing creates dates at UTC midnight, causing timezone issues.** `new Date(dateStr)` where `dateStr` is "YYYY-MM-DD" is parsed as UTC midnight. `startOfDay(new Date())` uses local time. In `isToday()`, if `dateStr` is "2024-02-09", `new Date("2024-02-09")` gives UTC midnight, but `startOfDay(new Date())` gives local midnight. These differ by the timezone offset, causing incorrect grouping for users in non-UTC timezones.

- [apps/web/lib/utils/recurrence.ts:314-316] **Potential off-by-one in weekly+byDay match.** `matchesRecurrence` for WEEKLY with byDay checks `diffWeeks % interval === 0` but `diffDays / 7` is a rough division that doesn't account for the actual week boundaries. If the start date is a Wednesday and you check a Monday 8 days later, `diffDays=8`, `diffWeeks=1`, which passes the check. But the actual week number depends on the start day of the week.

- [apps/web/app/api/tasks/route.ts:26-36] **Rate limiting only on GET, not POST.** The GET handler applies rate limiting but the POST handler at line 151 does not. A client could rapidly create tasks without throttling.

- [apps/web/components/tasks/focus-mode-toggle.tsx:36] **Keyboard shortcut Ctrl+Shift+F conflicts with browser Find.** The `(e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "f"` shortcut conflicts with browser "Find in Page" (Cmd+F / Ctrl+F) on some browsers where Shift+Cmd+F triggers advanced find. This could prevent users from using browser search.

- [apps/web/app/api/tasks/[id]/complete-recurring/route.ts:304] **WEEKLY BYDAY iteration logic can skip valid days.** When `rule.byday` is set, the loop iterates `7 * interval` days (line 304). But for interval > 1, this scans across weeks that should be skipped. For example, with BYDAY=MO and INTERVAL=2, the loop might find a Monday in the intermediate (non-matching) week.

## Summary

8 critical, 18 medium, 13 low
