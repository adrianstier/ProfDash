-- Fix RLS policy gap for task visibility in workspaces
-- Tasks should be visible to workspace members, not just the task creator

-- Drop existing task policies
DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can create their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;

-- Create new comprehensive policies

-- SELECT: Users can view tasks they own OR tasks in workspaces they're members of
CREATE POLICY "Users can view accessible tasks"
  ON tasks FOR SELECT
  USING (
    auth.uid() = user_id
    OR (
      workspace_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_members.workspace_id = tasks.workspace_id
        AND workspace_members.user_id = auth.uid()
      )
    )
  );

-- INSERT: Users can create personal tasks OR tasks in workspaces where they have member/admin/owner role
CREATE POLICY "Users can create accessible tasks"
  ON tasks FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      workspace_id IS NULL
      OR EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_members.workspace_id = tasks.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role IN ('owner', 'admin', 'member')
      )
    )
  );

-- UPDATE: Users can update their own tasks OR workspace tasks where they have edit permissions
CREATE POLICY "Users can update accessible tasks"
  ON tasks FOR UPDATE
  USING (
    auth.uid() = user_id
    OR (
      workspace_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_members.workspace_id = tasks.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role IN ('owner', 'admin', 'member')
      )
    )
  );

-- DELETE: Users can delete their own tasks OR workspace tasks where they have owner/admin role
CREATE POLICY "Users can delete accessible tasks"
  ON tasks FOR DELETE
  USING (
    auth.uid() = user_id
    OR (
      workspace_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_members.workspace_id = tasks.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role IN ('owner', 'admin')
      )
    )
  );

-- Add composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_tasks_user_status_due
  ON tasks(user_id, status, due);

CREATE INDEX IF NOT EXISTS idx_tasks_workspace_status_due
  ON tasks(workspace_id, status, due)
  WHERE workspace_id IS NOT NULL;
