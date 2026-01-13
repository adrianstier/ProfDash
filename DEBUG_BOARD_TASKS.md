# Debug: Tasks Not Showing in Board View

## Issue
Tasks that appear in "Today" view are not showing in the "Board" view.

## Investigation Steps

### 1. Check Current Workspace ID

Open browser console on the board page and run:
```javascript
// Check if workspace store has a workspace selected
console.log('Current Workspace:', localStorage.getItem('workspace-store'));
```

### 2. Check API Response

In the browser console:
```javascript
// Fetch tasks directly to see what the API returns
fetch('/api/tasks?workspace_id=YOUR_WORKSPACE_ID_HERE')
  .then(r => r.json())
  .then(d => console.log('API Response:', d));
```

### 3. Check Network Tab

1. Open DevTools → Network tab
2. Navigate to Board page
3. Look for request to `/api/tasks`
4. Check:
   - Request URL parameters
   - Response body
   - Any errors

## Potential Causes

### A. Workspace ID Not Set
**Board page** (line 265-266):
```typescript
const { currentWorkspaceId } = useWorkspaceStore();
const { data: tasks = [], isLoading } = useTasks({
  workspace_id: currentWorkspaceId,
});
```

If `currentWorkspaceId` is `null` or `undefined`, the API will show ALL user tasks instead of workspace tasks.

**Fix**: Ensure workspace is selected before board loads.

### B. RLS Policy Issue
The API endpoint (line 74) relies on RLS when workspace_id is provided:
```typescript
else if (workspaceId) {
  query = query.eq("workspace_id", workspaceId);
  countQuery = countQuery.eq("workspace_id", workspaceId);
}
```

**Check**: Are the RLS policies correctly configured for the tasks table?

### C. Today vs Board Query Difference

**Today page** uses server-side query:
```typescript
const { data, error } = await supabase
  .from("tasks")
  .select("*")
  .or(`due.eq.${today},due.is.null`)
  .order("priority", { ascending: true });
```
This doesn't filter by workspace at all!

**Board page** uses client-side with workspace filter:
```typescript
useTasks({ workspace_id: currentWorkspaceId })
```

**This is likely the issue!** Today page shows ALL tasks (personal + workspace) while Board page only shows workspace tasks.

## Solution

The today page needs to also respect the workspace filter. Two options:

### Option 1: Make Today Page Respect Workspace
Update today/page.tsx to filter by current workspace.

### Option 2: Make Board Page Show All Tasks
Remove workspace filter from board page.

### Option 3: Add Workspace Toggle
Add a toggle to switch between "All Tasks" and "Workspace Tasks" on both pages.

## Recommended Fix

**Update today page to be client-side and use the same query as board:**

```typescript
// Remove server-side query
// Add client-side hook
const { currentWorkspaceId } = useWorkspaceStore();
const { data: tasks = [] } = useTasks({
  workspace_id: currentWorkspaceId,
  due: "today"
});
```

This ensures consistency across all views.
