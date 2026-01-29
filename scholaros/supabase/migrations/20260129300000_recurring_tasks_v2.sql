-- Migration: 20260129300000_recurring_tasks_v2.sql
-- Purpose: Ensure recurrence columns exist on tasks table (idempotent)
-- Note: This migration is safe to run even if columns already exist from 20260120000000_recurring_tasks.sql

BEGIN;

-- ============================================================================
-- STEP 1: Add recurrence columns to tasks table (if they don't exist)
-- ============================================================================

-- Check and add is_recurring column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'is_recurring'
  ) THEN
    ALTER TABLE tasks ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE NOT NULL;
  END IF;
END $$;

-- Check and add recurrence_rule column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'recurrence_rule'
  ) THEN
    ALTER TABLE tasks ADD COLUMN recurrence_rule TEXT;
  END IF;
END $$;

-- Check and add recurrence_parent_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'recurrence_parent_id'
  ) THEN
    ALTER TABLE tasks ADD COLUMN recurrence_parent_id UUID REFERENCES tasks(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Check and add recurrence_date column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'recurrence_date'
  ) THEN
    ALTER TABLE tasks ADD COLUMN recurrence_date DATE;
  END IF;
END $$;

-- Check and add recurrence_exceptions column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'recurrence_exceptions'
  ) THEN
    ALTER TABLE tasks ADD COLUMN recurrence_exceptions JSONB DEFAULT '[]'::jsonb NOT NULL;
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Add constraints for data integrity (if they don't exist)
-- ============================================================================

-- Ensure recurrence_rule is valid RRULE format (basic validation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'chk_recurrence_rule_format' AND table_name = 'tasks'
  ) THEN
    ALTER TABLE tasks
    ADD CONSTRAINT chk_recurrence_rule_format
    CHECK (
      recurrence_rule IS NULL OR
      recurrence_rule ~ '^RRULE:'
    );
  END IF;
END $$;

-- Ensure parent recurring tasks have recurrence_rule
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'chk_recurring_has_rule' AND table_name = 'tasks'
  ) THEN
    ALTER TABLE tasks
    ADD CONSTRAINT chk_recurring_has_rule
    CHECK (
      (is_recurring = FALSE) OR
      (is_recurring = TRUE AND recurrence_rule IS NOT NULL)
    );
  END IF;
END $$;

-- Ensure instances have parent reference and date
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'chk_instance_has_parent' AND table_name = 'tasks'
  ) THEN
    ALTER TABLE tasks
    ADD CONSTRAINT chk_instance_has_parent
    CHECK (
      (recurrence_parent_id IS NULL) OR
      (recurrence_parent_id IS NOT NULL AND recurrence_date IS NOT NULL)
    );
  END IF;
END $$;

-- Ensure exceptions is valid JSON array
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'chk_recurrence_exceptions_array' AND table_name = 'tasks'
  ) THEN
    ALTER TABLE tasks
    ADD CONSTRAINT chk_recurrence_exceptions_array
    CHECK (
      jsonb_typeof(recurrence_exceptions) = 'array'
    );
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Create indexes for efficient recurrence queries (if they don't exist)
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
-- STEP 5: Create or replace helper functions
-- ============================================================================

-- Function to add recurrence exception
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

-- Function to check if date is excluded
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

-- Function to get recurrence summary
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

COMMIT;
