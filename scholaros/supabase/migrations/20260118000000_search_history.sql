-- Migration: 20260118000000_search_history.sql
-- Purpose: Create search history table for command palette
-- Sprint: 3 (Command Palette)
-- Estimated Runtime: < 5 seconds
-- Risk Level: Low (CREATE only, no existing data affected)

BEGIN;

-- ============================================================================
-- STEP 1: Create search_history table
-- ============================================================================

CREATE TABLE IF NOT EXISTS search_history (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User and workspace context
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Search content
  query TEXT NOT NULL,
  query_normalized TEXT GENERATED ALWAYS AS (LOWER(TRIM(query))) STORED,

  -- Result context
  result_type TEXT CHECK (result_type IN ('task', 'project', 'grant', 'publication', 'navigation', 'action')),
  result_id UUID,
  result_title TEXT,

  -- Metadata
  source TEXT DEFAULT 'command_palette' CHECK (source IN ('command_palette', 'quick_search', 'navigation')),
  selected BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- STEP 2: Create indexes for efficient queries
-- ============================================================================

-- Primary query pattern: recent searches by user
CREATE INDEX IF NOT EXISTS idx_search_history_user_recent
ON search_history(user_id, created_at DESC);

-- Workspace-scoped recent searches
CREATE INDEX IF NOT EXISTS idx_search_history_workspace_recent
ON search_history(workspace_id, created_at DESC)
WHERE workspace_id IS NOT NULL;

-- Popular searches analysis (for suggestions)
CREATE INDEX IF NOT EXISTS idx_search_history_query_normalized
ON search_history(query_normalized, user_id);

-- Selected results for ML ranking (future)
CREATE INDEX IF NOT EXISTS idx_search_history_selected
ON search_history(user_id, result_type, selected)
WHERE selected = TRUE;

-- ============================================================================
-- STEP 3: Create cleanup function and trigger
-- ============================================================================

-- Function to limit search history per user (max 50 entries)
CREATE OR REPLACE FUNCTION cleanup_search_history()
RETURNS TRIGGER AS $$
DECLARE
  max_history_per_user CONSTANT INT := 50;
  excess_count INT;
BEGIN
  -- Count entries beyond the limit
  SELECT COUNT(*) - max_history_per_user INTO excess_count
  FROM search_history
  WHERE user_id = NEW.user_id;

  -- Delete oldest entries if over limit
  IF excess_count > 0 THEN
    DELETE FROM search_history
    WHERE id IN (
      SELECT id FROM search_history
      WHERE user_id = NEW.user_id
      ORDER BY created_at ASC
      LIMIT excess_count
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to run cleanup after each insert
CREATE TRIGGER trigger_cleanup_search_history
AFTER INSERT ON search_history
FOR EACH ROW
EXECUTE FUNCTION cleanup_search_history();

-- ============================================================================
-- STEP 4: Enable Row Level Security
-- ============================================================================

ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

-- Users can only see their own search history
CREATE POLICY "Users can view own search history"
ON search_history FOR SELECT
USING (auth.uid() = user_id);

-- Users can only insert their own search history
CREATE POLICY "Users can insert own search history"
ON search_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own search history
CREATE POLICY "Users can delete own search history"
ON search_history FOR DELETE
USING (auth.uid() = user_id);

-- No UPDATE policy - search history is immutable

-- ============================================================================
-- STEP 5: Add table and column comments
-- ============================================================================

COMMENT ON TABLE search_history IS
'Stores user search queries and selected results for command palette. Limited to 50 entries per user via trigger.';

COMMENT ON COLUMN search_history.query_normalized IS
'Lowercase trimmed version of query for deduplication and analytics';

COMMENT ON COLUMN search_history.result_type IS
'Type of result: task, project, grant, publication, navigation, action';

COMMENT ON COLUMN search_history.selected IS
'Whether user selected a result from this search (for relevance ranking)';

COMMENT ON COLUMN search_history.source IS
'Where the search originated: command_palette, quick_search, navigation';

-- ============================================================================
-- STEP 6: Create helper function for recent searches
-- ============================================================================

-- Function to get recent unique searches for a user
CREATE OR REPLACE FUNCTION get_recent_searches(
  p_user_id UUID,
  p_workspace_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  query TEXT,
  result_type TEXT,
  result_id UUID,
  result_title TEXT,
  last_searched_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (sh.query_normalized)
    sh.query,
    sh.result_type,
    sh.result_id,
    sh.result_title,
    sh.created_at AS last_searched_at
  FROM search_history sh
  WHERE sh.user_id = p_user_id
    AND (p_workspace_id IS NULL OR sh.workspace_id = p_workspace_id OR sh.workspace_id IS NULL)
    AND sh.selected = TRUE
  ORDER BY sh.query_normalized, sh.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_recent_searches(UUID, UUID, INT) TO authenticated;

COMMIT;
