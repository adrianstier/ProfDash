-- Migration: 20260120000000_recurring_tasks.sql
-- Purpose: Add recurrence support to tasks table
-- Sprint: 5 (Recurring Tasks)
-- Estimated Runtime: < 30 seconds (depends on task count)
-- Risk Level: Medium (ALTER on frequently accessed table)

BEGIN;

-- ============================================================================
-- STEP 1: Add recurrence columns to tasks table
-- ============================================================================

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN IF NOT EXISTS recurrence_rule TEXT,
ADD COLUMN IF NOT EXISTS recurrence_parent_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS recurrence_date DATE,
ADD COLUMN IF NOT EXISTS recurrence_exceptions JSONB DEFAULT '[]'::jsonb NOT NULL;

-- ============================================================================
-- STEP 2: Add constraints for data integrity
-- ============================================================================

-- Ensure recurrence_rule is valid RRULE format (basic validation)
ALTER TABLE tasks
ADD CONSTRAINT chk_recurrence_rule_format
CHECK (
  recurrence_rule IS NULL OR
  recurrence_rule ~ '^RRULE:'
);

-- Ensure parent recurring tasks have recurrence_rule
ALTER TABLE tasks
ADD CONSTRAINT chk_recurring_has_rule
CHECK (
  (is_recurring = FALSE) OR
  (is_recurring = TRUE AND recurrence_rule IS NOT NULL)
);

-- Ensure instances have parent reference and date
ALTER TABLE tasks
ADD CONSTRAINT chk_instance_has_parent
CHECK (
  (recurrence_parent_id IS NULL) OR
  (recurrence_parent_id IS NOT NULL AND recurrence_date IS NOT NULL)
);

-- Ensure exceptions is valid JSON array
ALTER TABLE tasks
ADD CONSTRAINT chk_recurrence_exceptions_array
CHECK (
  jsonb_typeof(recurrence_exceptions) = 'array'
);

-- ============================================================================
-- STEP 3: Create indexes for efficient recurrence queries
-- ============================================================================

-- Find all recurring parent tasks in a workspace
CREATE INDEX IF NOT EXISTS idx_tasks_recurring_parents
ON tasks(workspace_id, is_recurring)
WHERE is_recurring = TRUE AND recurrence_parent_id IS NULL;

-- Find all instances of a recurring task
CREATE INDEX IF NOT EXISTS idx_tasks_recurrence_instances
ON tasks(recurrence_parent_id, recurrence_date)
WHERE recurrence_parent_id IS NOT NULL;

-- Efficient lookup for generating next occurrence
CREATE INDEX IF NOT EXISTS idx_tasks_recurrence_due
ON tasks(recurrence_parent_id, due DESC)
WHERE recurrence_parent_id IS NOT NULL;

-- ============================================================================
-- STEP 4: Add column comments for documentation
-- ============================================================================

COMMENT ON COLUMN tasks.is_recurring IS
'Whether this is a recurring task parent (has recurrence_rule)';

COMMENT ON COLUMN tasks.recurrence_rule IS
'RRULE string (RFC 5545) defining recurrence pattern. Format: RRULE:FREQ=DAILY;INTERVAL=1';

COMMENT ON COLUMN tasks.recurrence_parent_id IS
'For instances: references the parent recurring task. NULL for parents and non-recurring tasks.';

COMMENT ON COLUMN tasks.recurrence_date IS
'For instances: the specific date this instance represents in the recurrence series.';

COMMENT ON COLUMN tasks.recurrence_exceptions IS
'JSON array of ISO date strings to skip in the recurrence pattern. Example: ["2026-01-20", "2026-02-14"]';

-- ============================================================================
-- STEP 5: Create helper function for adding recurrence exceptions
-- ============================================================================

CREATE OR REPLACE FUNCTION add_recurrence_exception(
  p_task_id UUID,
  p_exception_date DATE
)
RETURNS VOID AS $$
BEGIN
  UPDATE tasks
  SET recurrence_exceptions = recurrence_exceptions || to_jsonb(p_exception_date::text)
  WHERE id = p_task_id
    AND is_recurring = TRUE
    AND NOT recurrence_exceptions ? p_exception_date::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION add_recurrence_exception(UUID, DATE) TO authenticated;

-- ============================================================================
-- STEP 6: Create function to check if date is excluded
-- ============================================================================

CREATE OR REPLACE FUNCTION is_recurrence_exception(
  p_task_id UUID,
  p_check_date DATE
)
RETURNS BOOLEAN AS $$
DECLARE
  v_exceptions JSONB;
BEGIN
  SELECT recurrence_exceptions INTO v_exceptions
  FROM tasks
  WHERE id = p_task_id;

  RETURN v_exceptions ? p_check_date::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_recurrence_exception(UUID, DATE) TO authenticated;

-- ============================================================================
-- STEP 7: Create function to get recurrence summary
-- ============================================================================

CREATE OR REPLACE FUNCTION get_task_recurrence_info(p_task_id UUID)
RETURNS TABLE (
  is_parent BOOLEAN,
  is_instance BOOLEAN,
  parent_id UUID,
  rule TEXT,
  instance_date DATE,
  exception_count INT,
  instance_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.is_recurring AND t.recurrence_parent_id IS NULL AS is_parent,
    t.recurrence_parent_id IS NOT NULL AS is_instance,
    COALESCE(t.recurrence_parent_id, t.id) AS parent_id,
    COALESCE(parent.recurrence_rule, t.recurrence_rule) AS rule,
    t.recurrence_date AS instance_date,
    COALESCE(jsonb_array_length(COALESCE(parent.recurrence_exceptions, t.recurrence_exceptions)), 0) AS exception_count,
    (
      SELECT COUNT(*) FROM tasks inst
      WHERE inst.recurrence_parent_id = COALESCE(t.recurrence_parent_id, t.id)
    ) AS instance_count
  FROM tasks t
  LEFT JOIN tasks parent ON t.recurrence_parent_id = parent.id
  WHERE t.id = p_task_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_task_recurrence_info(UUID) TO authenticated;

-- ============================================================================
-- STEP 8: Note on RLS
-- ============================================================================

-- Note: Existing RLS policies already cover recurrence queries because:
-- 1. Parent tasks are regular tasks with workspace_id
-- 2. Instances inherit workspace_id from parent
-- 3. All recurrence columns are on the tasks table
-- No additional RLS changes required.

COMMIT;
