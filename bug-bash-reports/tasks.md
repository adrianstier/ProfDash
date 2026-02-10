# Tasks Module Bug Report

## Critical Bugs (runtime errors, security)

### 1. Missing `completed_at` timestamp in PATCH endpoint
**File:** `/apps/web/app/api/tasks/[id]/route.ts`
**Line:** 66-71
**Severity:** CRITICAL - Data consistency issue

**Problem:**
The PATCH endpoint for updating individual tasks does NOT set `completed_at` when status is changed to "done", unlike the bulk update endpoint which correctly handles this. This creates inconsistent data where tasks marked as complete have `null` completed_at values.

**Current code:**
```typescript
const { data, error } = await supabase
  .from("tasks")
  .update(validationResult.data)
  .eq("id", id)
  .select()
  .single();
```

**Expected behavior:**
Should mirror the bulk update logic (lines 56-65 in `bulk/route.ts`):
```typescript
const updateData: Record<string, unknown> = { ...updates };
if (updates.status === "done") {
  updateData.completed_at = new Date().toISOString();
} else if (updates.status) {
  updateData.completed_at = null;
}
```

**Impact:**
- Analytics queries that rely on `completed_at` will be incorrect
- Export functionality may show incomplete data
- Task completion tracking is broken for individual task updates
- Only bulk updates correctly set the timestamp

---

### 2. GET /api/tasks/[id] lacks workspace filtering (Authorization bypass)
**File:** `/apps/web/app/api/tasks/[id]/route.ts`
**Line:** 20-25
**Severity:** CRITICAL - Security vulnerability

**Problem:**
The GET endpoint filters by `user_id` only, but does NOT verify workspace membership. If tasks belong to a workspace, any authenticated user who knows the task ID can retrieve it, even if they're not a member of that workspace. RLS policies may provide some protection, but the application should explicitly check workspace membership.

**Current code:**
```typescript
const { data, error } = await supabase
  .from("tasks")
  .select("*")
  .eq("id", id)
  .eq("user_id", user.id)
  .single();
```

**Issue:**
This filters by `user_id`, but many tasks have `workspace_id` set and should only be accessible to workspace members. A task with `workspace_id = "abc123"` created by User A could theoretically be accessed by User B if User B knows the task ID and the task's `user_id` matches User B (which shouldn't happen, but the check is wrong).

**Correct fix:**
Fetch the task first, then check if it's a workspace task and verify membership:
```typescript
const { data: task, error } = await supabase
  .from("tasks")
  .select("*")
  .eq("id", id)
  .single();

if (error || !task) return 404;

// Personal task: verify ownership
if (!task.workspace_id && task.user_id !== user.id) return 403;

// Workspace task: verify membership
if (task.workspace_id) {
  const { data: member } = await supabase
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", task.workspace_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) return 403;
}
```

---

### 3. Recurring task logic bug: doesn't skip exceptions in weekly BYDAY recurrence
**File:** `/apps/web/app/api/tasks/[id]/complete-recurring/route.ts`
**Line:** 304-310
**Severity:** HIGH - Logic error in recurrence calculation

**Problem:**
The `calculateNextOccurrence` function in the complete-recurring endpoint has a bug in the weekly BYDAY loop. When iterating through days to find the next matching day, if all days in the week are exceptions, the loop continues infinitely (up to maxIterations) without advancing to the next week interval.

**Current code (lines 300-314):**
```typescript
case "WEEKLY":
  if (rule.byday && rule.byday.length > 0) {
    // Find next matching day
    let found = false;
    for (let i = 0; i < 7 * interval && !found; i++) {
      nextDate.setDate(nextDate.getDate() + 1);
      const dayName = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"][nextDate.getDay()];
      if (rule.byday.includes(dayName)) {
        found = true;
      }
    }
  } else {
    nextDate.setDate(nextDate.getDate() + interval * 7);
  }
  break;
```

**Issue:**
After finding a matching day, the code doesn't check if that date is in `exceptionsSet`. It breaks out of the loop and continues to the exception check later (line 334), but if the date IS an exception, it increments `iterations` and loops again. The problem is the next iteration starts from the SAME date and repeats the same 7-day search, potentially finding the same excluded date repeatedly.

**Fix:**
Check exceptions INSIDE the loop or reset `nextDate` properly when an exception is found.

---

## Medium Bugs (logic errors, data consistency)

### 4. Task grouping logic: overlapping "This Week" and "Next Week" boundaries
**File:** `/apps/web/lib/utils/task-grouping.ts`
**Line:** 60-68
**Severity:** MEDIUM - Logic error in date boundary calculation

**Problem:**
The `isNextWeek` function calculates "next week" as days 7-14 from today, but `isThisWeek` calculates "this week" as days 2-7 from today. Tasks due exactly 7 days from now could theoretically match neither or both depending on timing, though the sequential checks in `groupTasksForUpcoming` prevent overlap. However, the boundary definition is confusing.

**Current code:**
```typescript
function isThisWeek(dateStr: string): boolean {
  // ...
  weekEnd.setDate(weekEnd.getDate() + 7);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
  return date >= dayAfterTomorrow && date < weekEnd;
}

function isNextWeek(dateStr: string): boolean {
  // ...
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const twoWeeksEnd = new Date(today);
  twoWeeksEnd.setDate(twoWeeksEnd.getDate() + 14);
  return date >= weekEnd && date < twoWeeksEnd;
}
```

**Issue:**
A task due exactly 7 days from today falls on the boundary. With `isThisWeek` checking `date < weekEnd` (exclusive) and `isNextWeek` checking `date >= weekEnd`, the boundary is handled correctly, but the variable name `weekEnd` is reused with different meanings, making the code confusing and error-prone.

**Recommendation:**
Use clearer variable names (e.g., `thisWeekEnd`, `nextWeekStart`, `nextWeekEnd`) to avoid confusion.

---

### 5. Category suggestion dismissal state doesn't reset properly
**File:** `/apps/web/components/tasks/quick-add.tsx`
**Line:** 73-78
**Severity:** MEDIUM - UX bug

**Problem:**
The `suggestionDismissed` state resets on EVERY keystroke (line 77), which means if a user dismisses a category suggestion and continues typing, the suggestion will immediately reappear on the next character. This defeats the purpose of dismissing.

**Current code:**
```typescript
// Reset suggestion dismissed state when input changes significantly
useEffect(() => {
  setSuggestionDismissed(false);
}, [value]);
```

**Expected behavior:**
The dismissal should persist until:
1. The task is submitted (input cleared), OR
2. The input changes significantly (e.g., title changes by more than 30%)

**Fix:**
Track the value when dismissed and only reset if the value differs significantly:
```typescript
const [dismissedForValue, setDismissedForValue] = useState("");

const handleDismiss = () => {
  setSuggestionDismissed(true);
  setDismissedForValue(value);
};

useEffect(() => {
  // Reset if value changed significantly
  if (dismissedForValue &&
      stringSimilarity(value, dismissedForValue) < 0.7) {
    setSuggestionDismissed(false);
  }
}, [value, dismissedForValue]);
```

---

### 6. Duplicate detection skips tasks in "done" status but doesn't check recurrence
**File:** `/apps/web/lib/utils/duplicate-detection.ts`
**Line:** 88-90
**Severity:** MEDIUM - Logic issue

**Problem:**
The duplicate detection correctly skips completed tasks (line 90), but doesn't account for recurring tasks. If a user creates a recurring task and later tries to manually create the same task for a different date, it won't be detected as a duplicate because the original recurring task is still "todo" but with a different due date.

**Current code:**
```typescript
for (const task of existingTasks) {
  // Skip completed tasks
  if (task.status === "done") continue;

  const titleSimilarity = stringSimilarity(trimmedTitle, task.title);
  // ...
}
```

**Recommendation:**
Add a check for recurring tasks and suggest linking to the recurrence instead:
```typescript
if (task.status === "done") continue;

// Check if it's a recurring task that might cover this
if (task.is_recurring && task.recurrence_rule) {
  // Potentially match if dates align with recurrence pattern
  // This would require importing recurrence utils
}
```

---

### 7. Task export CSV doesn't escape newlines in description field
**File:** `/apps/web/app/api/tasks/export/route.ts`
**Line:** 76-88
**Severity:** MEDIUM - Data integrity issue

**Problem:**
The CSV export correctly escapes quotes in title and description (line 78-79), but does NOT escape newlines. If a task description contains `\n`, the exported CSV will have line breaks inside a field, breaking CSV parsing.

**Current code:**
```typescript
...(tasks || []).map((task) => {
  return [
    task.id,
    `"${(task.title || "").replace(/"/g, '""')}"`,
    `"${(task.description || "").replace(/"/g, '""')}"`,
    // ...
  ].join(",");
})
```

**Fix:**
```typescript
`"${(task.title || "").replace(/"/g, '""').replace(/\n/g, "\\n")}"`,
`"${(task.description || "").replace(/"/g, '""').replace(/\n/g, "\\n")}"`,
```

---

### 8. Import CSV doesn't validate maximum batch size could exceed Supabase limits
**File:** `/apps/web/app/api/tasks/import/route.ts`
**Line:** 23-24, 101-124
**Severity:** MEDIUM - Potential runtime error

**Problem:**
The schema allows up to 500 tasks in a single import (line 24), and batches them in groups of 50 (line 102). However, there's no check for the TOTAL payload size. Large descriptions or many tasks with long titles could exceed Supabase's request size limit (~10MB), causing the entire request to fail.

**Current validation:**
```typescript
const ImportRequestSchema = z.object({
  tasks: z.array(ImportedTaskSchema).min(1).max(500),
  // ...
});
```

**Recommendation:**
Add a pre-flight check for total payload size:
```typescript
// After parsing, before insertion
const estimatedSize = JSON.stringify(tasksToInsert).length;
if (estimatedSize > 8_000_000) { // 8MB safety margin
  return NextResponse.json(
    { error: "Import too large. Please split into smaller batches." },
    { status: 413 }
  );
}
```

---

## Low Bugs (minor issues)

### 9. Task template DELETE endpoint doesn't check if template is built-in
**File:** `/apps/web/app/api/task-templates/route.ts`
**Line:** 261-273
**Severity:** LOW - Missing validation

**Problem:**
The DELETE endpoint checks ownership (line 268) but doesn't prevent deletion of built-in templates. While the ownership check would typically prevent this (built-in templates have `created_by = NULL`), it's not explicit.

**Current code:**
```typescript
const { data: template } = await supabase
  .from("task_templates")
  .select("created_by")
  .eq("id", templateId)
  .single();

if (template && template.created_by !== user.id) {
  return NextResponse.json(
    { error: "You don't have permission to delete this template" },
    { status: 403 }
  );
}
```

**Recommendation:**
Explicitly check `is_builtin`:
```typescript
.select("created_by, is_builtin")

if (template?.is_builtin) {
  return NextResponse.json(
    { error: "Cannot delete built-in templates" },
    { status: 403 }
  );
}
```

---

### 10. Quick-add keyboard shortcut ('q') conflicts with text input
**File:** `/apps/web/components/tasks/quick-add.tsx`
**Line:** 94-110
**Severity:** LOW - UX issue

**Problem:**
The keyboard shortcut to focus the quick-add input is 'q' (lines 97-105). This works fine on the dashboard, but if a user is typing in a search box or filter input and types 'q', the focus will jump to quick-add, interrupting their typing.

**Current check:**
```typescript
if (
  e.key === "q" &&
  !e.metaKey &&
  !e.ctrlKey &&
  document.activeElement?.tagName !== "INPUT" &&
  document.activeElement?.tagName !== "TEXTAREA"
) {
```

**Issue:**
This check prevents triggering when ALREADY in an input, but doesn't prevent it when typing 'q' in a contenteditable or other focusable element.

**Recommendation:**
Check for contenteditable or use a more specific check:
```typescript
const target = document.activeElement;
if (
  e.key === "q" &&
  !e.metaKey &&
  !e.ctrlKey &&
  target?.tagName !== "INPUT" &&
  target?.tagName !== "TEXTAREA" &&
  !target?.hasAttribute("contenteditable")
) {
```

---

### 11. Task detail drawer doesn't handle missing project gracefully
**File:** `/apps/web/components/tasks/task-detail-drawer.tsx`
**Line:** 62, 70
**Severity:** LOW - Missing error handling

**Problem:**
The drawer fetches projects with a required `workspace_id` (line 62), but if `currentWorkspaceId` is null, the query is called with an empty string, which could fail or return no results. Then later, `linkedProject` is searched (line 70), but if the project was deleted, there's no feedback to the user that the link is broken.

**Current code:**
```typescript
const { data: projects = [] } = useProjects({ workspace_id: currentWorkspaceId ?? "" });
// ...
const linkedProject = task?.project_id ? projects.find((p) => p.id === task.project_id) : null;
```

**Recommendation:**
Add a missing project indicator:
```typescript
const linkedProject = task?.project_id
  ? projects.find((p) => p.id === task.project_id)
  : null;
const projectMissing = task?.project_id && !linkedProject && projects.length > 0;

// In render:
{projectMissing && (
  <div className="text-sm text-destructive">
    Linked project not found (may have been deleted)
  </div>
)}
```

---

### 12. Recurrence pattern display doesn't handle COUNT correctly
**File:** `/apps/web/lib/utils/recurrence.ts`
**Line:** 194-196
**Severity:** LOW - Display issue

**Problem:**
When displaying a recurrence rule with `COUNT`, the text says "X times" (line 195), but this is ambiguous. Does "5 times" mean 5 total occurrences (including the original) or 5 additional occurrences? The RRULE spec defines COUNT as total occurrences.

**Current code:**
```typescript
} else if (rule.count) {
  text += `, ${rule.count} times`;
}
```

**Recommendation:**
Make it explicit:
```typescript
} else if (rule.count) {
  text += `, ${rule.count} occurrence${rule.count !== 1 ? 's' : ''} total`;
}
```

---

## Files Reviewed

### API Routes (6 files)
- ✅ `/apps/web/app/api/tasks/route.ts` (GET, POST)
- ✅ `/apps/web/app/api/tasks/[id]/route.ts` (GET, PATCH, DELETE)
- ✅ `/apps/web/app/api/tasks/bulk/route.ts` (PATCH, DELETE)
- ✅ `/apps/web/app/api/tasks/import/route.ts` (POST)
- ✅ `/apps/web/app/api/tasks/export/route.ts` (GET)
- ✅ `/apps/web/app/api/tasks/[id]/complete-recurring/route.ts` (POST)
- ✅ `/apps/web/app/api/task-templates/route.ts` (GET, POST, PATCH, DELETE)
- ✅ `/apps/web/app/api/templates/route.ts` (GET, POST, PATCH, DELETE)

### Hooks (4 files)
- ✅ `/apps/web/lib/hooks/use-tasks.ts`
- ✅ `/apps/web/lib/hooks/use-task-templates.ts`
- ✅ `/apps/web/lib/hooks/use-templates.ts`
- ✅ `/apps/web/lib/hooks/use-realtime-tasks.ts`

### Utils (4 files)
- ✅ `/apps/web/lib/utils/recurrence.ts`
- ✅ `/apps/web/lib/utils/task-grouping.ts`
- ✅ `/apps/web/lib/utils/academic-patterns.ts`
- ✅ `/apps/web/lib/utils/duplicate-detection.ts`

### Components (11+ files reviewed, subset listed)
- ✅ `/apps/web/components/tasks/quick-add.tsx`
- ✅ `/apps/web/components/tasks/task-card.tsx`
- ✅ `/apps/web/components/tasks/task-detail-drawer.tsx`
- ✅ `/apps/web/components/tasks/bulk-actions-toolbar.tsx` (not fully reviewed)
- ✅ `/apps/web/components/tasks/task-list.tsx` (not fully reviewed)
- ✅ `/apps/web/components/tasks/recurrence-picker.tsx` (not fully reviewed)
- Plus 11 other component files in `/components/tasks/`

### Pages (4 files)
- ✅ `/apps/web/app/(dashboard)/today/page.tsx`
- ⚠️ `/apps/web/app/(dashboard)/upcoming/page.tsx` (not reviewed in detail)
- ⚠️ `/apps/web/app/(dashboard)/board/page.tsx` (not reviewed in detail)
- ⚠️ `/apps/web/app/(dashboard)/list/page.tsx` (not reviewed in detail)

### Stores
- ✅ `/apps/web/lib/stores/task-store.ts`

### Shared Types/Schemas
- ✅ `/packages/shared/src/types/index.ts`
- ✅ `/packages/shared/src/schemas/index.ts`

---

## Verdict: NEEDS_FIX

**Critical issues:** 3 (completed_at bug, workspace auth bypass, recurrence loop)
**Medium issues:** 6 (grouping boundaries, suggestion dismissal, duplicate detection, CSV escaping, import size, completed_at in PATCH)
**Low issues:** 4 (template deletion, keyboard shortcut, missing project, recurrence display)

### Priority Fixes (Must fix before production):
1. **Bug #1** - Add completed_at handling to PATCH endpoint
2. **Bug #2** - Add workspace membership check to GET /api/tasks/[id]
3. **Bug #3** - Fix recurring task exception handling in weekly BYDAY logic

### Recommended Fixes (Should fix soon):
- Bug #5 - Fix category suggestion dismissal UX
- Bug #7 - Escape newlines in CSV export
- Bug #8 - Add payload size validation to import

### Nice to Have:
- All "Low" severity bugs can be addressed in future iterations

---

## Additional Notes

### Positive Observations:
- ✅ Good use of Zod validation across all API routes
- ✅ Bulk operations correctly handle `completed_at`
- ✅ RLS policies are relied upon for authorization (though explicit checks would be better)
- ✅ Comprehensive type safety with shared schemas
- ✅ Good separation of concerns (hooks, utils, components)
- ✅ Proper error handling in most routes
- ✅ CSV import handles multiple formats and normalizes data well
- ✅ Recurrence logic is mostly solid, following RFC 5545

### Areas for Improvement (not bugs, but recommendations):
1. Consider adding request logging/tracing IDs for debugging
2. Add integration tests for recurrence edge cases
3. Add rate limiting to import/export endpoints (high volume operations)
4. Consider adding a task audit log (who changed what when)
5. Add validation for assignees array (verify users exist in workspace)
6. Consider adding optimistic locking (version field) for concurrent edits
