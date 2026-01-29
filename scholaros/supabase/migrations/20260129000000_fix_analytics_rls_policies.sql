-- Migration: Fix Overly Permissive Analytics RLS Policies
-- Version: 1.0.0
-- Created: January 29, 2026
-- Purpose: Replace overly permissive RLS policies that allow any authenticated user
--          to insert/update analytics data. Policies named "Service role can..."
--          actually use USING(true) which grants access to ALL authenticated users,
--          since service_role bypasses RLS entirely.

-- ============================================================================
-- Fix analytics_events RLS Policies
-- ============================================================================

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Service role can insert analytics events" ON analytics_events;
DROP POLICY IF EXISTS "Service role can update analytics events" ON analytics_events;

-- Create proper user-scoped INSERT policy
-- Users can only insert events for themselves
CREATE POLICY "Users can insert own analytics events" ON analytics_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Analytics events should be immutable - no user updates allowed
-- (Service role bypasses RLS for batch processing)
CREATE POLICY "No direct user updates to analytics events" ON analytics_events
  FOR UPDATE
  USING (false);

-- Add DELETE policy - users cannot delete analytics events
CREATE POLICY "No direct user deletes from analytics events" ON analytics_events
  FOR DELETE
  USING (false);

-- ============================================================================
-- Fix experiment_assignments RLS Policies
-- ============================================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role can manage experiment assignments" ON experiment_assignments;

-- Users can only view their own assignments (keep existing)
-- CREATE POLICY "Users can view own experiment assignments" ON experiment_assignments
--   FOR SELECT
--   USING (auth.uid() = user_id);
-- (Already exists)

-- No direct user writes - only service role should manage assignments
CREATE POLICY "No direct user inserts to experiment assignments" ON experiment_assignments
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "No direct user updates to experiment assignments" ON experiment_assignments
  FOR UPDATE
  USING (false);

CREATE POLICY "No direct user deletes from experiment assignments" ON experiment_assignments
  FOR DELETE
  USING (false);

-- ============================================================================
-- Fix feature_metrics RLS Policies
-- ============================================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role can manage feature metrics" ON feature_metrics;

-- Users can view workspace metrics (keep existing SELECT policy)
-- (Already exists)

-- No direct user writes - only service role should manage metrics
CREATE POLICY "No direct user inserts to feature metrics" ON feature_metrics
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "No direct user updates to feature metrics" ON feature_metrics
  FOR UPDATE
  USING (false);

CREATE POLICY "No direct user deletes from feature metrics" ON feature_metrics
  FOR DELETE
  USING (false);

-- ============================================================================
-- Add Comments Explaining Security Model
-- ============================================================================

COMMENT ON POLICY "Users can insert own analytics events" ON analytics_events IS
  'Users can only insert analytics events with their own user_id. Service role bypasses RLS for batch operations.';

COMMENT ON POLICY "No direct user updates to analytics events" ON analytics_events IS
  'Analytics events are immutable for data integrity. Only service role can update (e.g., marking as processed).';

COMMENT ON POLICY "No direct user deletes from analytics events" ON analytics_events IS
  'Users cannot delete analytics events. Only service role can delete (e.g., retention cleanup).';

COMMENT ON POLICY "No direct user inserts to experiment assignments" ON experiment_assignments IS
  'Experiment assignments are managed by service role only to ensure consistent variant assignment.';

COMMENT ON POLICY "No direct user inserts to feature metrics" ON feature_metrics IS
  'Feature metrics are computed and inserted by service role batch jobs only.';

-- ============================================================================
-- Add Missing DELETE Policies for Documents/AI Tables
-- ============================================================================

-- document_extractions: Users can delete extractions for their own documents
CREATE POLICY "Users can delete extractions for their documents" ON document_extractions
  FOR DELETE
  USING (
    document_id IN (
      SELECT id FROM documents WHERE user_id = auth.uid()
    )
  );

-- ai_interactions: Users can delete their own AI interactions
CREATE POLICY "Users can delete own AI interactions" ON ai_interactions
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- Add Missing DELETE Policy for Workspaces
-- ============================================================================

-- Check if workspaces DELETE policy exists, if not create it
-- Only workspace owners can delete workspaces
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'workspaces'
    AND policyname = 'Owners can delete workspaces'
  ) THEN
    CREATE POLICY "Owners can delete workspaces" ON workspaces
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM workspace_members
          WHERE workspace_members.workspace_id = workspaces.id
          AND workspace_members.user_id = auth.uid()
          AND workspace_members.role = 'owner'
        )
      );
  END IF;
END $$;
