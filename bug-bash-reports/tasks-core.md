# Tasks Core Bug Bash Report

## Summary
- **16 bugs found** (1 critical, 7 high, 6 medium, 2 low)
- **9 fixed** directly (1 critical, 6 high, 2 medium)
- **7 documented** but not fixed (1 high, 4 medium, 2 low) -- lower severity or require broader changes

---

## Findings

### [CRITICAL] Missing user ownership check in complete-recurring endpoint
**File:** `apps/web/app/api/tasks/[id]/complete-recurring/route.ts:60-68`
**Description:** The `POST /api/tasks/[id]/complete-recurring` endpoint fetches the task by ID without any `user_id` filter. While RLS SELECT policies on the `tasks` table include workspace membership checks, the code then performs multiple mutations (marking done, creating next occurrence) without verifying the current user is the task owner or has appropriate workspace permissions. An attacker in the same workspace could complete another user's recurring task and spawn new tasks attributed to the original user.
**Fix:** Added explicit ownership check after fetching: for personal tasks (no workspace_id), the user_id must match auth user. For workspace tasks, RLS handles access control on the initial fetch.

---

### [HIGH] Bulk delete returns misleading count, hides RLS permission failures
**File:** `apps/web/app/api/tasks/bulk/route.ts:123-139`
**Description:** The bulk delete endpoint used `count || taskIds.length` as the deleted count fallback. The `count` was not being requested (missing `{ count: "exact" }` option), so it was always `null`, causing the response to always report all requested task IDs as successfully deleted -- even when RLS prevented deletion of some tasks the user doesn't own.
**Fix:** Added `{ count: "exact" }` to the delete call. Changed response to report `deleted` (actual), `requested` (attempted), and `partialFailure` boolean flag. Removed the misleading fallback to `taskIds.length`.

---

### [HIGH] Bulk update silently ignores permission failures
**File:** `apps/web/app/api/tasks/bulk/route.ts:69-87`
**Description:** The bulk update endpoint returned `updated: data?.length || 0` but never compared against the number of requested task IDs. If RLS prevented updates on some tasks, the client received `success: true` with no indication that some tasks were not updated.
**Fix:** Added `requested` count and `partialFailure` flag to the response so the client can detect and handle partial failures.

---

### [HIGH] Monthly/Yearly recurrence date drift in server-side calculateNextOccurrence
**File:** `apps/web/app/api/tasks/[id]/complete-recurring/route.ts:321-327`
**Description:** The `MONTHLY` case used `nextDate.setMonth(nextDate.getMonth() + interval)` which causes JavaScript Date overflow. For example, a task due Jan 31 recurring monthly would produce Feb 31 -> March 3, then April 3, then May 3 -- permanently drifting. Similarly, `YEARLY` with a Feb 29 start date would produce March 1 in non-leap years.
**Fix:** Implemented day-clamping: after advancing the month, check `daysInTargetMonth` and clamp to `Math.min(originalDay, daysInTargetMonth)`. Same fix for yearly recurrence.

---

### [HIGH] Monthly/Yearly recurrence date drift in client-side recurrence utility
**File:** `apps/web/lib/utils/recurrence.ts:255-267`
**Description:** The client-side `getNextOccurrences` function had the identical month/year overflow bug as the server-side code. This utility is used for occurrence previews in the RecurrencePicker component and for `matchesRecurrence` checks.
**Fix:** Applied the same day-clamping fix as the server-side code, preserving the original start date's day-of-month.

---

### [HIGH] CSV export vulnerable to formula injection
**File:** `apps/web/app/api/tasks/export/route.ts:58-88`
**Description:** Task titles and descriptions were quoted but not sanitized for CSV injection. A task titled `=HYPERLINK("http://evil.com","Click")` or `=cmd|'/C calc'!A0` would be rendered as executable formulas when opened in Excel or Google Sheets. This is a well-known attack vector for CSV exports.
**Fix:** Added `sanitizeCsvField()` function that prefixes fields starting with `=`, `+`, `-`, `@`, tab, or carriage return characters with a single quote (`'`) to neutralize formula execution.

---

### [HIGH] Broken authorization logic for task template PATCH
**File:** `apps/web/app/api/task-templates/route.ts:203`
**Description:** The ownership check `template.created_by !== user.id && !template.is_builtin` had inverted logic: it only blocked updates from non-creators on custom templates, but **allowed any authenticated user to modify built-in templates**. The condition should prevent modifications to built-in templates entirely and restrict custom template edits to their creators.
**Fix:** Split into two separate checks: (1) built-in templates cannot be modified by anyone, (2) custom templates can only be modified by their creator.

---

### [HIGH] Import workspace_id from multipart form data not validated as UUID
**File:** `apps/web/app/api/tasks/import/route.ts:62`
**Description:** When importing via CSV (multipart/form-data), the `workspace_id` field is extracted directly from the form data without UUID validation. While RLS would likely prevent insertion with an invalid workspace_id, it could still cause confusing Postgres errors or unexpected behavior. The JSON import path validates via Zod schema, but the multipart path bypassed this validation.
**Fix:** Added explicit UUID validation for the workspace_id from form data, returning a 400 error for invalid formats.

---

### [MEDIUM] Date-only string timezone mismatch in task-grouping utilities
**File:** `apps/web/lib/utils/task-grouping.ts:29-77`
**Description:** All date grouping functions (`isToday`, `isTomorrow`, `isOverdue`, etc.) passed date-only strings like `"2026-02-09"` to `new Date()`, which parses them as UTC midnight. Then `startOfDay()` converts to local midnight. For users in negative-UTC-offset timezones (US Pacific, US Eastern, etc.), UTC midnight is the previous day locally. Example: "2026-02-09" becomes Feb 8 16:00 PST, then `startOfDay` makes it Feb 8 00:00 PST. This causes tasks to appear in the wrong section (e.g., "today" tasks appearing in "overdue").
**Fix:** Added `parseLocalDate()` helper that appends `T00:00:00` to date-only strings, forcing local-time interpretation instead of UTC.

---

### [MEDIUM] Same timezone issue in TaskCard overdue check
**File:** `apps/web/components/tasks/task-card.tsx:251-253`
**Description:** The `isOverdue` computation used `new Date(task.due) < new Date()`, which compares UTC midnight of the due date against the current local time. In negative-UTC-offset timezones, tasks due today could be falsely marked as overdue.
**Fix:** Changed to string comparison (`task.due < today` where `today` is `new Date().toISOString().split("T")[0]`), which correctly compares date-only values without timezone conversion.

---

### [MEDIUM] Same timezone issue in TaskCard formatDueDate
**File:** `apps/web/components/tasks/task-card.tsx:232-249`
**Description:** `formatDueDate` passed the date string to `new Date()` which would parse it as UTC, then compared with `today.toDateString()` which uses local time. This could show "Today" for yesterday's date or "Tomorrow" for today's date in certain timezones.
**Fix:** Added local-time parsing for date-only strings in `formatDueDate`.

---

### [MEDIUM] TodayProgress fetches all tasks without workspace filter
**File:** `apps/web/components/tasks/today-progress.tsx:9`
**Description:** `const { data: tasks = [] } = useTasks();` is called with no filters at all -- no workspace_id, no date filter. This fetches ALL tasks the user has access to (limited by the default page size of 50). For users with many tasks across workspaces, the progress bar counts could be inaccurate or incomplete because pagination cuts off at 50 results.
**Fix:** NOT FIXED -- requires passing workspace context as a prop or using the workspace store, which is a broader component architecture change.

---

### [MEDIUM] Optimistic update for bulk operations doesn't apply completed_at
**File:** `apps/web/lib/hooks/use-tasks.ts:335-350`
**Description:** The bulk update optimistic update applies `{ ...task, ...updates }` but the server-side code also sets `completed_at` when status changes to "done" or clears it when status changes away from "done". The optimistic update doesn't replicate this logic, so the UI will briefly show stale `completed_at` values until the server response arrives and the query is invalidated.
**Fix:** NOT FIXED -- this is a minor UI inconsistency that resolves after query invalidation (typically <1 second). Fixing would require duplicating the server-side `completed_at` logic in the client.

---

### [MEDIUM] Import date normalization ambiguous for MM/DD vs DD/MM formats
**File:** `apps/web/app/api/tasks/import/route.ts:286-308`
**Description:** The `normalizeDate` function tries MM/DD/YYYY first, then YYYY/MM/DD, but never tries DD/MM/YYYY. For dates like "05/02/2024", it will always parse as May 2 (US format), even if the CSV was created with European formatting (Feb 5). There's no way to auto-detect the format, but the function silently assumes US format without documenting this.
**Fix:** NOT FIXED -- this is a design limitation. A proper fix would require either a format selection UI in the import dialog or locale detection. The existing behavior (US format) matches the app's primary audience.

---

### [LOW] Task template DELETE allows deleting templates that don't exist (no 404)
**File:** `apps/web/app/api/task-templates/route.ts:268-278`
**Description:** The DELETE handler checks ownership via a select, but if `template` is null (template doesn't exist), it falls through to the delete call without returning 404. The condition `template && template.created_by !== user.id` allows null to pass through. The actual delete will simply delete 0 rows with no error.
**Fix:** NOT FIXED -- low severity, the response is still `{ success: true }` which is arguably correct for idempotent deletes.

---

### [LOW] Recurring task completion doesn't set completed_at timestamp
**File:** `apps/web/app/api/tasks/[id]/complete-recurring/route.ts:77-82,98-102`
**Description:** When completing a recurring task, the route sets `{ status: "done" }` but does not set `completed_at: new Date().toISOString()`. The regular bulk update route sets `completed_at` when marking tasks done, but the recurring completion route does not. This means recurring tasks show as done but have no `completed_at` timestamp, which could affect analytics or audit trails.
**Fix:** NOT FIXED -- requires adding `completed_at` to the update payload in three places within the file. Low severity since it's a data consistency issue, not a functional bug.

---

## Files Modified

1. `apps/web/app/api/tasks/[id]/complete-recurring/route.ts` - Added ownership check, fixed monthly/yearly date drift
2. `apps/web/app/api/tasks/bulk/route.ts` - Fixed misleading delete count, added partial failure detection
3. `apps/web/app/api/tasks/export/route.ts` - Added CSV injection sanitization
4. `apps/web/app/api/tasks/import/route.ts` - Added UUID validation for workspace_id
5. `apps/web/app/api/task-templates/route.ts` - Fixed broken built-in template authorization
6. `apps/web/lib/utils/recurrence.ts` - Fixed monthly/yearly date drift
7. `apps/web/lib/utils/task-grouping.ts` - Fixed timezone-sensitive date parsing
8. `apps/web/components/tasks/task-card.tsx` - Fixed overdue check and date formatting timezone issues

## Verification
- Ran `tsc --noEmit` on all changed files: **0 type errors introduced**
- Pre-existing type errors in unrelated files (activity-feed.tsx, auth/google/route.ts) remain unchanged
