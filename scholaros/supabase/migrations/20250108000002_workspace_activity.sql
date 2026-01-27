-- Migration: Workspace Activity (Audit Trail)
-- Tracks all significant actions for activity feed

-- Activity action enum (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_action') THEN
        CREATE TYPE activity_action AS ENUM (
            -- Task actions
            'task_created',
            'task_updated',
            'task_deleted',
            'task_completed',
            'task_reopened',
            'task_assigned',
            'task_priority_changed',
            'task_due_date_changed',
            'task_status_changed',
            'subtask_added',
            'subtask_completed',
            'subtask_deleted',
            'notes_updated',

            -- Project actions
            'project_created',
            'project_updated',
            'project_stage_changed',
            'project_milestone_completed',

            -- Chat actions
            'message_sent',
            'message_pinned',

            -- AI actions
            'ai_tasks_extracted',
            'ai_task_enhanced',
            'ai_task_breakdown'
        );
    END IF;
END$$;

-- Activity log table
CREATE TABLE IF NOT EXISTS workspace_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    action activity_action NOT NULL,

    -- Related entities (polymorphic)
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    message_id UUID REFERENCES workspace_messages(id) ON DELETE SET NULL,

    -- Snapshot of entity at time of action
    entity_title TEXT,

    -- Additional context (old/new values, etc.)
    details JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workspace_activity_workspace ON workspace_activity(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_activity_user ON workspace_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_activity_created ON workspace_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workspace_activity_action ON workspace_activity(action);
CREATE INDEX IF NOT EXISTS idx_workspace_activity_task ON workspace_activity(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workspace_activity_project ON workspace_activity(project_id) WHERE project_id IS NOT NULL;

-- Composite index for feed queries
CREATE INDEX IF NOT EXISTS idx_workspace_activity_feed ON workspace_activity(workspace_id, created_at DESC);

-- Enable RLS
ALTER TABLE workspace_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view activity in their workspaces" ON workspace_activity;
CREATE POLICY "Users can view activity in their workspaces"
    ON workspace_activity FOR SELECT
    USING (
        workspace_id IN (
            SELECT wm.workspace_id
            FROM workspace_members wm
            WHERE wm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert activity in their workspaces" ON workspace_activity;
CREATE POLICY "Users can insert activity in their workspaces"
    ON workspace_activity FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT wm.workspace_id
            FROM workspace_members wm
            WHERE wm.user_id = auth.uid()
        )
        AND user_id = auth.uid()
    );

-- Enable Realtime (safe if already added)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE workspace_activity;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END$$;

-- Comments
COMMENT ON TABLE workspace_activity IS 'Audit trail of all significant actions in a workspace';
COMMENT ON COLUMN workspace_activity.details IS 'JSONB containing action-specific details like old/new values';
