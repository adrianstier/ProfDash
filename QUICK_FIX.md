# Quick Fix: Board Not Showing Tasks

## The Problem

**Today page** shows ALL tasks (doesn't filter by workspace)
**Board page** only shows tasks from the currently selected workspace

This creates an inconsistency where tasks visible in Today don't appear in Board.

## Quick Test

Open browser console and run:
```javascript
// Check current workspace
const store = JSON.parse(localStorage.getItem('workspace-store') || '{}');
console.log('Current Workspace ID:', store.state?.currentWorkspaceId);

// Fetch with workspace filter (what Board does)
fetch(`/api/tasks?workspace_id=${store.state?.currentWorkspaceId}`)
  .then(r => r.json())
  .then(d => console.log('Board tasks:', d.data?.length));

// Fetch without filter (what Today does currently)
fetch('/api/tasks')
  .then(r => r.json())
  .then(d => console.log('All tasks:', d.data?.length));
```

If "Board tasks" shows 0 but "All tasks" shows some number, that confirms the issue.

## The Fix

Make Today page also filter by workspace for consistency.

**File to modify:** `apps/web/app/(dashboard)/today/page.tsx`

Currently (lines 33-50), it's server-side and doesn't respect workspace.

We need to either:
1. Make it client-side to use the workspace store, OR
2. Add workspace filtering to the server-side query

## Recommended Solution

Since you want the board to show the tasks from today, the easiest fix is to **make sure you have a workspace selected** and that your tasks are **assigned to that workspace**.

### Check Your Tasks

Run this in the browser console on the Today page:
```javascript
// This will show you which workspace each task belongs to
fetch('/api/tasks')
  .then(r => r.json())
  .then(d => {
    d.data?.forEach(task => {
      console.log(`Task: "${task.title}" - Workspace: ${task.workspace_id || 'PERSONAL'}`);
    });
  });
```

If the tasks show `workspace_id: null` or `PERSONAL`, they won't appear in the Board view because Board is filtered by workspace.

### Quick Solution:

**Option 1: Remove workspace filter from Board** (shows all tasks):
Change line 266 in `apps/web/app/(dashboard)/board/page.tsx`:
```typescript
// From:
const { data: tasks = [], isLoading } = useTasks({
  workspace_id: currentWorkspaceId,
});

// To:
const { data: tasks = [], isLoading } = useTasks();
```

**Option 2: Assign tasks to workspace** (proper fix):
1. Go to Today page
2. Edit each task
3. Assign it to your workspace

Which would you prefer?
