-- Migration: Fix Agent Framework RLS
-- Adds missing get_user_workspace_ids() function and fixes RLS policies

-- =============================================================================
-- Helper Function: Get User Workspace IDs
-- =============================================================================

-- Create the missing helper function
CREATE OR REPLACE FUNCTION get_user_workspace_ids()
RETURNS SETOF UUID AS $$
BEGIN
    RETURN QUERY
    SELECT workspace_id
    FROM workspace_members
    WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_workspace_ids() TO authenticated;

-- =============================================================================
-- Fix RLS Policies (recreate with proper function)
-- =============================================================================

-- Drop and recreate policies to ensure they work correctly
DROP POLICY IF EXISTS agent_sessions_workspace_policy ON agent_sessions;
CREATE POLICY agent_sessions_workspace_policy ON agent_sessions
    FOR ALL USING (
        workspace_id IN (SELECT get_user_workspace_ids())
        OR user_id = auth.uid()
    );

DROP POLICY IF EXISTS agent_messages_session_policy ON agent_messages;
CREATE POLICY agent_messages_session_policy ON agent_messages
    FOR ALL USING (
        session_id IN (
            SELECT id FROM agent_sessions
            WHERE workspace_id IN (SELECT get_user_workspace_ids())
            OR user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS agent_tasks_workspace_policy ON agent_tasks;
CREATE POLICY agent_tasks_workspace_policy ON agent_tasks
    FOR ALL USING (
        workspace_id IN (SELECT get_user_workspace_ids())
        OR user_id = auth.uid()
    );

DROP POLICY IF EXISTS agent_memory_workspace_policy ON agent_memory;
CREATE POLICY agent_memory_workspace_policy ON agent_memory
    FOR ALL USING (
        workspace_id IN (SELECT get_user_workspace_ids())
        OR user_id = auth.uid()
    );

-- agent_feedback policy is fine (uses user_id = auth.uid())

DROP POLICY IF EXISTS agent_metrics_workspace_policy ON agent_metrics;
CREATE POLICY agent_metrics_workspace_policy ON agent_metrics
    FOR ALL USING (
        workspace_id IS NULL  -- Allow global metrics
        OR workspace_id IN (SELECT get_user_workspace_ids())
    );

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON FUNCTION get_user_workspace_ids() IS 'Returns all workspace IDs the current user is a member of';
