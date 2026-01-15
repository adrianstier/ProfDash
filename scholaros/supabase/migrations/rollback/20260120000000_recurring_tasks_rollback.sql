-- Rollback Migration: 20260120000000_recurring_tasks.sql
-- Purpose: Remove recurrence support from tasks table
-- Use only if critical issues discovered post-deployment
-- WARNING: This will lose recurrence data for any tasks created after migration

BEGIN;

-- Drop helper functions first
DROP FUNCTION IF EXISTS add_recurrence_exception(UUID, DATE);
DROP FUNCTION IF EXISTS is_recurrence_exception(UUID, DATE);
DROP FUNCTION IF EXISTS get_task_recurrence_info(UUID);

-- Drop indexes
DROP INDEX IF EXISTS idx_tasks_recurring_parents;
DROP INDEX IF EXISTS idx_tasks_recurrence_instances;
DROP INDEX IF EXISTS idx_tasks_recurrence_due;

-- Drop constraints
ALTER TABLE tasks
DROP CONSTRAINT IF EXISTS chk_recurrence_rule_format,
DROP CONSTRAINT IF EXISTS chk_recurring_has_rule,
DROP CONSTRAINT IF EXISTS chk_instance_has_parent,
DROP CONSTRAINT IF EXISTS chk_recurrence_exceptions_array;

-- Remove columns
-- Note: This must be done after dropping the foreign key constraint
ALTER TABLE tasks
DROP COLUMN IF EXISTS recurrence_parent_id,
DROP COLUMN IF EXISTS is_recurring,
DROP COLUMN IF EXISTS recurrence_rule,
DROP COLUMN IF EXISTS recurrence_date,
DROP COLUMN IF EXISTS recurrence_exceptions;

COMMIT;
