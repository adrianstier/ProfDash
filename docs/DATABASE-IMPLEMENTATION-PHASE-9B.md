# Database Implementation: Phase 9B
## Database Engineer Specifications

**Document Version:** 1.0
**Created:** January 14, 2026
**Author:** Database Engineer
**Status:** Ready for Implementation
**Input Document:** [TECH-LEAD-ARCHITECTURE-PHASE-9B.md](./TECH-LEAD-ARCHITECTURE-PHASE-9B.md)

---

## Executive Summary

This document provides the complete database implementation specifications for Phase 9B of ScholarOS. It includes optimized migration scripts, comprehensive indexing strategies, Row Level Security (RLS) policies, stored procedures, performance considerations, and operational runbooks.

### Database Changes Overview

| Sprint | Migration | Tables Affected | Type | Risk Level |
|--------|-----------|-----------------|------|------------|
| 2 | `20260115000000_onboarding_tracking.sql` | `profiles` | ALTER | Low |
| 3 | `20260118000000_search_history.sql` | `search_history` (NEW) | CREATE | Low |
| 5 | `20260120000000_recurring_tasks.sql` | `tasks` | ALTER | Medium |

### Estimated Impact

- **Total New Columns:** 10 (5 on profiles, 5 on tasks)
- **Total New Tables:** 1 (search_history)
- **Total New Indexes:** 6
- **Total New Triggers:** 2
- **Total New Functions:** 3
- **Migration Runtime:** < 5 minutes (production)

---

## Table of Contents

1. [Pre-Implementation Analysis](#1-pre-implementation-analysis)
2. [Migration 1: Onboarding Tracking](#2-migration-1-onboarding-tracking)
3. [Migration 2: Search History](#3-migration-2-search-history)
4. [Migration 3: Recurring Tasks](#4-migration-3-recurring-tasks)
5. [Row Level Security Policies](#5-row-level-security-policies)
6. [Indexing Strategy](#6-indexing-strategy)
7. [Stored Procedures & Functions](#7-stored-procedures--functions)
8. [Performance Optimization](#8-performance-optimization)
9. [Data Migration & Backfill](#9-data-migration--backfill)
10. [Rollback Procedures](#10-rollback-procedures)
11. [Monitoring & Alerting](#11-monitoring--alerting)
12. [Operational Runbook](#12-operational-runbook)
13. [Integration Guidelines](#13-integration-guidelines)

---

## 1. Pre-Implementation Analysis

### 1.1 Current Schema Assessment

**Profiles Table (Current State):**
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  institution TEXT,
  department TEXT,
  title TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

**Tasks Table (Current State - Relevant Columns):**
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category task_category NOT NULL DEFAULT 'misc',
  priority task_priority NOT NULL DEFAULT 'p3',
  status task_status NOT NULL DEFAULT 'todo',
  due DATE,
  project_id UUID,
  assignees UUID[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

### 1.2 Data Volume Estimates

| Table | Current Rows (Est.) | Growth Rate | Phase 9B Impact |
|-------|---------------------|-------------|-----------------|
| profiles | ~500 | ~10/day | +5 columns, no row growth |
| tasks | ~15,000 | ~100/day | +5 columns, moderate row growth from recurrence |
| search_history | 0 (NEW) | ~500/day | New table, capped at 50 rows/user |

### 1.3 Query Pattern Analysis

**Onboarding Queries (Sprint 2):**
- Frequency: 1-5 per user session
- Pattern: Single row read/update by `user_id`
- Index requirement: Primary key sufficient

**Search History Queries (Sprint 3):**
- Frequency: 5-20 per user session
- Pattern: Recent searches by `user_id`, ordered by `created_at DESC`
- Index requirement: Composite index on `(user_id, created_at DESC)`

**Recurring Tasks Queries (Sprint 5):**
- Frequency: 10-50 per workspace view
- Pattern: Find recurring tasks, find instances by parent
- Index requirement: Partial indexes on `is_recurring` and `recurrence_parent_id`

---

## 2. Migration 1: Onboarding Tracking

### 2.1 Full Migration Script

```sql
-- Migration: 20260115000000_onboarding_tracking.sql
-- Purpose: Add onboarding progress tracking to profiles table
-- Sprint: 2 (Progressive Onboarding)
-- Estimated Runtime: < 10 seconds
-- Risk Level: Low (ALTER only, no data loss risk)

BEGIN;

-- ============================================================================
-- STEP 1: Add onboarding columns to profiles table
-- ============================================================================

-- Add onboarding tracking columns with sensible defaults
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN IF NOT EXISTS onboarding_step SMALLINT DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS onboarding_skipped BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN IF NOT EXISTS onboarding_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- ============================================================================
-- STEP 2: Add constraints for data integrity
-- ============================================================================

-- Ensure onboarding_step is within valid range (0-5)
ALTER TABLE profiles
ADD CONSTRAINT chk_onboarding_step_range
CHECK (onboarding_step >= 0 AND onboarding_step <= 5);

-- Ensure logical consistency: completed implies step = 5
-- Note: Using a permissive check - completed can be true at any step if skipped
ALTER TABLE profiles
ADD CONSTRAINT chk_onboarding_completed_consistency
CHECK (
  (onboarding_completed = FALSE) OR
  (onboarding_completed = TRUE AND (onboarding_step = 5 OR onboarding_skipped = TRUE))
);

-- ============================================================================
-- STEP 3: Create index for onboarding analytics queries
-- ============================================================================

-- Partial index for finding users who haven't completed onboarding
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_incomplete
ON profiles(onboarding_step, created_at)
WHERE onboarding_completed = FALSE AND onboarding_skipped = FALSE;

-- Index for onboarding completion analytics
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_analytics
ON profiles(onboarding_completed, onboarding_skipped, onboarding_completed_at);

-- ============================================================================
-- STEP 4: Add column comments for documentation
-- ============================================================================

COMMENT ON COLUMN profiles.onboarding_completed IS
'Whether user has completed the onboarding wizard (step 5 or skipped)';

COMMENT ON COLUMN profiles.onboarding_step IS
'Current onboarding step: 0=not started, 1=welcome, 2=profile, 3=workspace, 4=first task, 5=completed';

COMMENT ON COLUMN profiles.onboarding_skipped IS
'Whether user explicitly skipped the onboarding wizard';

COMMENT ON COLUMN profiles.onboarding_started_at IS
'Timestamp when user first entered the onboarding wizard';

COMMENT ON COLUMN profiles.onboarding_completed_at IS
'Timestamp when user completed or skipped the onboarding wizard';

-- ============================================================================
-- STEP 5: Backfill existing users as "completed" (they're already onboarded)
-- ============================================================================

-- Existing users should be marked as having completed onboarding
-- to avoid showing them the wizard
UPDATE profiles
SET
  onboarding_completed = TRUE,
  onboarding_step = 5,
  onboarding_completed_at = created_at
WHERE onboarding_completed = FALSE
  AND created_at < NOW() - INTERVAL '1 day';

COMMIT;
```

### 2.2 Validation Queries

```sql
-- Verify migration success
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name LIKE 'onboarding%'
ORDER BY ordinal_position;

-- Verify constraints
SELECT
  constraint_name,
  constraint_type,
  check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'profiles'
  AND tc.constraint_name LIKE '%onboarding%';

-- Verify index creation
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'profiles'
  AND indexname LIKE '%onboarding%';

-- Verify backfill
SELECT
  COUNT(*) AS total_profiles,
  COUNT(*) FILTER (WHERE onboarding_completed = TRUE) AS completed,
  COUNT(*) FILTER (WHERE onboarding_completed = FALSE) AS pending
FROM profiles;
```

---

## 3. Migration 2: Search History

### 3.1 Full Migration Script

```sql
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
```

### 3.2 Validation Queries

```sql
-- Verify table creation
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default,
  generation_expression
FROM information_schema.columns
WHERE table_name = 'search_history'
ORDER BY ordinal_position;

-- Verify indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'search_history';

-- Verify RLS policies
SELECT
  polname AS policy_name,
  polcmd AS command,
  pg_get_expr(polqual, polrelid) AS using_expression,
  pg_get_expr(polwithcheck, polrelid) AS with_check_expression
FROM pg_policy
WHERE polrelid = 'search_history'::regclass;

-- Verify trigger
SELECT
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'search_history';

-- Test cleanup trigger (insert 55 rows, verify only 50 remain)
-- DO NOT RUN IN PRODUCTION - TEST ONLY
/*
DO $$
DECLARE
  test_user_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  FOR i IN 1..55 LOOP
    INSERT INTO search_history (user_id, query)
    VALUES (test_user_id, 'test query ' || i);
  END LOOP;

  ASSERT (SELECT COUNT(*) FROM search_history WHERE user_id = test_user_id) <= 50,
    'Cleanup trigger failed: more than 50 rows exist';
END $$;
*/
```

---

## 4. Migration 3: Recurring Tasks

### 4.1 Full Migration Script

```sql
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
-- STEP 8: Update RLS to handle recurrence queries
-- ============================================================================

-- Note: Existing RLS policies already cover recurrence queries because:
-- 1. Parent tasks are regular tasks with workspace_id
-- 2. Instances inherit workspace_id from parent
-- 3. All recurrence columns are on the tasks table
-- No additional RLS changes required.

COMMIT;
```

### 4.2 Validation Queries

```sql
-- Verify columns added
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'tasks'
  AND column_name LIKE 'recurrence%' OR column_name = 'is_recurring'
ORDER BY ordinal_position;

-- Verify constraints
SELECT
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'tasks'
  AND constraint_name LIKE '%recurrence%';

-- Verify indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'tasks'
  AND indexname LIKE '%recurr%';

-- Verify functions
SELECT
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%recurrence%';

-- Test constraint: invalid RRULE should fail
-- DO $$
-- BEGIN
--   INSERT INTO tasks (user_id, title, is_recurring, recurrence_rule)
--   VALUES (auth.uid(), 'Test', TRUE, 'invalid');
-- EXCEPTION WHEN check_violation THEN
--   RAISE NOTICE 'Constraint working correctly';
-- END $$;
```

---

## 5. Row Level Security Policies

### 5.1 Policy Summary

| Table | Policy Name | Command | Description |
|-------|-------------|---------|-------------|
| `profiles` | (existing) | ALL | User can only access own profile |
| `search_history` | Users can view own search history | SELECT | User-scoped |
| `search_history` | Users can insert own search history | INSERT | User-scoped |
| `search_history` | Users can delete own search history | DELETE | User-scoped |
| `tasks` | (existing) | ALL | Workspace + personal task access |

### 5.2 Policy Verification Script

```sql
-- Comprehensive RLS verification for Phase 9B tables
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('profiles', 'search_history', 'tasks')
ORDER BY tablename, policyname;
```

### 5.3 Security Considerations

**Search History:**
- No cross-user access allowed
- No UPDATE policy (history is append-only)
- Cleanup trigger prevents unbounded growth
- Workspace_id is optional (allows global searches)

**Recurring Tasks:**
- Inherit existing task RLS (no changes needed)
- Instances share workspace_id with parent
- Deletion of parent sets instances' parent_id to NULL

---

## 6. Indexing Strategy

### 6.1 Index Summary

| Table | Index Name | Columns | Type | Purpose |
|-------|------------|---------|------|---------|
| `profiles` | idx_profiles_onboarding_incomplete | (step, created_at) | Partial | Find pending onboarding |
| `profiles` | idx_profiles_onboarding_analytics | (completed, skipped, completed_at) | Standard | Analytics queries |
| `search_history` | idx_search_history_user_recent | (user_id, created_at DESC) | Standard | Recent searches |
| `search_history` | idx_search_history_workspace_recent | (workspace_id, created_at DESC) | Partial | Workspace searches |
| `search_history` | idx_search_history_query_normalized | (query_normalized, user_id) | Standard | Popular searches |
| `search_history` | idx_search_history_selected | (user_id, result_type, selected) | Partial | Ranking data |
| `tasks` | idx_tasks_recurring_parents | (workspace_id, is_recurring) | Partial | Find recurring parents |
| `tasks` | idx_tasks_recurrence_instances | (parent_id, date) | Partial | Find instances |
| `tasks` | idx_tasks_recurrence_due | (parent_id, due DESC) | Partial | Next occurrence |

### 6.2 Index Effectiveness Metrics

Expected query performance after indexing:

```sql
-- Query 1: Get onboarding status (Sprint 2)
-- Index: Primary key (id)
-- Expected: Index Scan, < 1ms
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT onboarding_step, onboarding_completed
FROM profiles
WHERE id = 'user-uuid-here';

-- Query 2: Recent searches (Sprint 3)
-- Index: idx_search_history_user_recent
-- Expected: Index Scan Backward, < 5ms
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT query, result_type, result_title, created_at
FROM search_history
WHERE user_id = 'user-uuid-here'
ORDER BY created_at DESC
LIMIT 10;

-- Query 3: Find recurring task instances (Sprint 5)
-- Index: idx_tasks_recurrence_instances
-- Expected: Index Scan, < 10ms for 100 instances
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id, title, due, recurrence_date, status
FROM tasks
WHERE recurrence_parent_id = 'parent-uuid-here'
ORDER BY recurrence_date DESC;

-- Query 4: Get recurring parents in workspace (Sprint 5)
-- Index: idx_tasks_recurring_parents
-- Expected: Bitmap Index Scan, < 20ms for 1000 tasks
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id, title, recurrence_rule
FROM tasks
WHERE workspace_id = 'workspace-uuid-here'
  AND is_recurring = TRUE
  AND recurrence_parent_id IS NULL;
```

### 6.3 Index Maintenance

```sql
-- Monitor index usage (run weekly)
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan AS times_used,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE tablename IN ('profiles', 'search_history', 'tasks')
  AND indexname LIKE '%onboarding%' OR indexname LIKE '%search%' OR indexname LIKE '%recurr%'
ORDER BY idx_scan DESC;

-- Identify unused indexes (run monthly)
SELECT
  indexname,
  tablename,
  idx_scan AS times_used
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexname NOT LIKE 'pg_%'
ORDER BY pg_relation_size(indexrelid) DESC;
```

---

## 7. Stored Procedures & Functions

### 7.1 Function Reference

| Function | Purpose | Parameters | Returns |
|----------|---------|------------|---------|
| `cleanup_search_history()` | Trigger: Limit history to 50/user | Trigger context | TRIGGER |
| `get_recent_searches()` | Get unique recent searches | user_id, workspace_id?, limit? | TABLE |
| `add_recurrence_exception()` | Add date to exception list | task_id, date | VOID |
| `is_recurrence_exception()` | Check if date is excluded | task_id, date | BOOLEAN |
| `get_task_recurrence_info()` | Get recurrence metadata | task_id | TABLE |

### 7.2 Function Usage Examples

```sql
-- Get recent searches for command palette
SELECT * FROM get_recent_searches(
  'user-uuid-here',
  'workspace-uuid-here',
  10
);

-- Add exception when user skips an occurrence
SELECT add_recurrence_exception(
  'task-uuid-here',
  '2026-02-14'::DATE
);

-- Check if date is an exception before generating occurrence
SELECT is_recurrence_exception(
  'task-uuid-here',
  '2026-02-14'::DATE
);

-- Get complete recurrence info for UI display
SELECT * FROM get_task_recurrence_info('task-uuid-here');
```

---

## 8. Performance Optimization

### 8.1 Query Optimization Guidelines

**Onboarding Queries:**
```sql
-- GOOD: Uses primary key
SELECT onboarding_step, onboarding_completed
FROM profiles
WHERE id = $1;

-- AVOID: Full table scan for analytics (use batch job instead)
SELECT COUNT(*) FROM profiles WHERE onboarding_completed = FALSE;
```

**Search History Queries:**
```sql
-- GOOD: Uses composite index with LIMIT
SELECT query, result_type, result_title
FROM search_history
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT 10;

-- AVOID: Selecting all columns when only query needed
SELECT * FROM search_history WHERE user_id = $1;
```

**Recurring Tasks Queries:**
```sql
-- GOOD: Uses partial index, specific columns
SELECT id, title, due, recurrence_date
FROM tasks
WHERE recurrence_parent_id = $1
  AND status != 'done'
ORDER BY recurrence_date;

-- AVOID: N+1 queries - fetch parent and instances together
-- BAD:
--   SELECT * FROM tasks WHERE id = $1;
--   SELECT * FROM tasks WHERE recurrence_parent_id = $1;
-- GOOD:
WITH parent AS (
  SELECT * FROM tasks WHERE id = $1
)
SELECT
  p.*,
  COALESCE(json_agg(i.*) FILTER (WHERE i.id IS NOT NULL), '[]') AS instances
FROM parent p
LEFT JOIN tasks i ON i.recurrence_parent_id = p.id
GROUP BY p.id, p.title /* ... all parent columns */;
```

### 8.2 Connection Pool Recommendations

```sql
-- Verify current connection settings
SHOW max_connections;
SHOW shared_buffers;
SHOW work_mem;

-- Recommended settings for Phase 9B workload:
-- max_connections: 100 (Supabase default)
-- shared_buffers: 256MB minimum
-- work_mem: 4MB per connection
-- effective_cache_size: 1GB
```

### 8.3 Vacuum and Analyze Schedule

```sql
-- Auto-vacuum settings (verify)
SELECT
  relname,
  n_live_tup,
  n_dead_tup,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE relname IN ('profiles', 'search_history', 'tasks');

-- Manual analyze after migration (run once)
ANALYZE profiles;
ANALYZE search_history;
ANALYZE tasks;
```

---

## 9. Data Migration & Backfill

### 9.1 Onboarding Backfill Strategy

Existing users should be marked as having completed onboarding to avoid showing them the wizard.

```sql
-- Backfill existing users (included in migration)
UPDATE profiles
SET
  onboarding_completed = TRUE,
  onboarding_step = 5,
  onboarding_completed_at = created_at
WHERE onboarding_completed = FALSE
  AND created_at < NOW() - INTERVAL '1 day';

-- Verification
SELECT
  COUNT(*) FILTER (WHERE onboarding_completed = TRUE) AS backfilled,
  COUNT(*) FILTER (WHERE onboarding_completed = FALSE) AS new_users
FROM profiles;
```

### 9.2 Search History (No Backfill Needed)

New table - no existing data to migrate.

### 9.3 Recurring Tasks (No Backfill Needed)

All existing tasks default to `is_recurring = FALSE` - no migration required.

---

## 10. Rollback Procedures

### 10.1 Rollback: Onboarding Tracking

```sql
-- Rollback Migration: 20260115000000_onboarding_tracking.sql
-- Use only if critical issues discovered post-deployment

BEGIN;

-- Drop constraints first
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS chk_onboarding_step_range,
DROP CONSTRAINT IF EXISTS chk_onboarding_completed_consistency;

-- Drop indexes
DROP INDEX IF EXISTS idx_profiles_onboarding_incomplete;
DROP INDEX IF EXISTS idx_profiles_onboarding_analytics;

-- Remove columns
ALTER TABLE profiles
DROP COLUMN IF EXISTS onboarding_completed,
DROP COLUMN IF EXISTS onboarding_step,
DROP COLUMN IF EXISTS onboarding_skipped,
DROP COLUMN IF EXISTS onboarding_started_at,
DROP COLUMN IF EXISTS onboarding_completed_at;

COMMIT;
```

### 10.2 Rollback: Search History

```sql
-- Rollback Migration: 20260118000000_search_history.sql

BEGIN;

-- Drop function first (used by trigger)
DROP FUNCTION IF EXISTS get_recent_searches(UUID, UUID, INT);

-- Drop trigger
DROP TRIGGER IF EXISTS trigger_cleanup_search_history ON search_history;

-- Drop function
DROP FUNCTION IF EXISTS cleanup_search_history();

-- Drop table (includes indexes and policies)
DROP TABLE IF EXISTS search_history CASCADE;

COMMIT;
```

### 10.3 Rollback: Recurring Tasks

```sql
-- Rollback Migration: 20260120000000_recurring_tasks.sql
-- WARNING: This will lose recurrence data for any tasks created after migration

BEGIN;

-- Drop functions first
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
ALTER TABLE tasks
DROP COLUMN IF EXISTS is_recurring,
DROP COLUMN IF EXISTS recurrence_rule,
DROP COLUMN IF EXISTS recurrence_parent_id,
DROP COLUMN IF EXISTS recurrence_date,
DROP COLUMN IF EXISTS recurrence_exceptions;

COMMIT;
```

---

## 11. Monitoring & Alerting

### 11.1 Key Metrics to Monitor

| Metric | Table | Threshold | Alert Level |
|--------|-------|-----------|-------------|
| Table size growth | search_history | > 100MB | Warning |
| Rows per user | search_history | > 60 | Critical (trigger broken) |
| Index bloat | all Phase 9B indexes | > 30% | Warning |
| Dead tuples | tasks | > 10% of live | Warning |
| Query latency | recurring task queries | > 100ms | Warning |

### 11.2 Monitoring Queries

```sql
-- Monitor search_history table health
SELECT
  relname AS table_name,
  n_live_tup AS live_rows,
  n_dead_tup AS dead_rows,
  ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_pct,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
  last_autovacuum,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE relname IN ('profiles', 'search_history', 'tasks');

-- Check max rows per user in search_history (should be <= 50)
SELECT
  user_id,
  COUNT(*) AS row_count
FROM search_history
GROUP BY user_id
HAVING COUNT(*) > 50
ORDER BY row_count DESC;

-- Monitor recurring task growth
SELECT
  COUNT(*) FILTER (WHERE is_recurring = TRUE AND recurrence_parent_id IS NULL) AS recurring_parents,
  COUNT(*) FILTER (WHERE recurrence_parent_id IS NOT NULL) AS instances,
  ROUND(
    COUNT(*) FILTER (WHERE recurrence_parent_id IS NOT NULL)::NUMERIC /
    NULLIF(COUNT(*) FILTER (WHERE is_recurring = TRUE AND recurrence_parent_id IS NULL), 0),
    2
  ) AS avg_instances_per_parent
FROM tasks;

-- Long-running queries involving Phase 9B tables
SELECT
  pid,
  now() - pg_stat_activity.query_start AS duration,
  query,
  state
FROM pg_stat_activity
WHERE (query ILIKE '%search_history%' OR query ILIKE '%recurrence%' OR query ILIKE '%onboarding%')
  AND state != 'idle'
  AND now() - pg_stat_activity.query_start > interval '5 seconds'
ORDER BY duration DESC;
```

### 11.3 Dashboard Queries (Supabase)

```sql
-- Daily active users by onboarding status
SELECT
  DATE(created_at) AS date,
  COUNT(DISTINCT user_id) FILTER (WHERE onboarding_completed = TRUE) AS completed_onboarding,
  COUNT(DISTINCT user_id) FILTER (WHERE onboarding_skipped = TRUE) AS skipped_onboarding,
  COUNT(DISTINCT user_id) FILTER (WHERE onboarding_completed = FALSE AND onboarding_skipped = FALSE) AS pending_onboarding
FROM profiles
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Search usage metrics
SELECT
  DATE(created_at) AS date,
  COUNT(*) AS total_searches,
  COUNT(DISTINCT user_id) AS unique_users,
  COUNT(*) FILTER (WHERE selected = TRUE) AS searches_with_selection,
  ROUND(100.0 * COUNT(*) FILTER (WHERE selected = TRUE) / COUNT(*), 2) AS selection_rate
FROM search_history
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Recurring task adoption
SELECT
  DATE(created_at) AS date,
  COUNT(*) FILTER (WHERE is_recurring = TRUE AND recurrence_parent_id IS NULL) AS new_recurring_tasks,
  COUNT(*) FILTER (WHERE recurrence_parent_id IS NOT NULL) AS generated_instances
FROM tasks
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## 12. Operational Runbook

### 12.1 Pre-Deployment Checklist

- [ ] Backup production database
- [ ] Verify migration scripts in staging environment
- [ ] Run migration validation queries in staging
- [ ] Confirm rollback scripts are ready
- [ ] Schedule maintenance window (if needed)
- [ ] Notify development team of deployment

### 12.2 Deployment Steps

```bash
# 1. Connect to Supabase project
supabase link --project-ref <project-id>

# 2. Check current migration status
supabase db migrations list

# 3. Apply migrations (dry run first)
supabase db push --dry-run

# 4. Apply migrations
supabase db push

# 5. Verify migrations applied
supabase db migrations list

# 6. Run validation queries (see sections 2.2, 3.2, 4.2)
```

### 12.3 Post-Deployment Verification

```sql
-- Run all validation queries from sections 2.2, 3.2, 4.2

-- Additional health checks
SELECT
  'profiles' AS table_name,
  COUNT(*) AS row_count,
  pg_size_pretty(pg_total_relation_size('profiles')) AS total_size
UNION ALL
SELECT
  'search_history',
  COUNT(*),
  pg_size_pretty(pg_total_relation_size('search_history'))
FROM search_history
UNION ALL
SELECT
  'tasks',
  COUNT(*),
  pg_size_pretty(pg_total_relation_size('tasks'))
FROM tasks;
```

### 12.4 Incident Response

**Issue: Migration fails mid-execution**
1. Check Supabase logs for error details
2. Do NOT retry migration immediately
3. Assess which steps completed successfully
4. Apply targeted fixes or rollback
5. Document issue for post-mortem

**Issue: Performance degradation after migration**
1. Check query execution plans for new queries
2. Run ANALYZE on affected tables
3. Verify indexes are being used
4. Check for lock contention
5. Consider index rebuild if bloated

**Issue: Cleanup trigger not firing**
1. Verify trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'trigger_cleanup_search_history';`
2. Check for trigger errors in logs
3. Manually run cleanup if needed:
```sql
DELETE FROM search_history
WHERE id NOT IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
    FROM search_history
  ) ranked
  WHERE rn <= 50
);
```

---

## 13. Integration Guidelines

### 13.1 API Integration Patterns

**Onboarding Status (Frontend/Backend):**
```typescript
// Read onboarding status
const { data: profile } = await supabase
  .from('profiles')
  .select('onboarding_step, onboarding_completed, onboarding_skipped')
  .eq('id', user.id)
  .single();

// Update onboarding progress
const { error } = await supabase
  .from('profiles')
  .update({
    onboarding_step: nextStep,
    onboarding_started_at: isFirstStep ? new Date().toISOString() : undefined
  })
  .eq('id', user.id);

// Complete onboarding
const { error } = await supabase
  .from('profiles')
  .update({
    onboarding_completed: true,
    onboarding_step: 5,
    onboarding_completed_at: new Date().toISOString()
  })
  .eq('id', user.id);
```

**Search History (Backend):**
```typescript
// Record search with selection
const { error } = await supabase
  .from('search_history')
  .insert({
    user_id: user.id,
    workspace_id: workspaceId,
    query: searchQuery,
    result_type: 'task',
    result_id: selectedTaskId,
    result_title: selectedTaskTitle,
    selected: true
  });

// Get recent searches (using RPC)
const { data: recentSearches } = await supabase
  .rpc('get_recent_searches', {
    p_user_id: user.id,
    p_workspace_id: workspaceId,
    p_limit: 10
  });
```

**Recurring Tasks (Backend):**
```typescript
// Create recurring task
const { data: recurringTask, error } = await supabase
  .from('tasks')
  .insert({
    user_id: user.id,
    workspace_id: workspaceId,
    title: 'Weekly team meeting',
    is_recurring: true,
    recurrence_rule: 'RRULE:FREQ=WEEKLY;BYDAY=MO;INTERVAL=1',
    due: '2026-01-20',
    // ... other fields
  })
  .select()
  .single();

// Generate next occurrence after completion
const nextOccurrenceDate = calculateNextFromRRule(task.recurrence_rule);

const { data: nextInstance } = await supabase
  .from('tasks')
  .insert({
    user_id: user.id,
    workspace_id: task.workspace_id,
    title: task.title,
    description: task.description,
    category: task.category,
    priority: task.priority,
    status: 'todo',
    due: nextOccurrenceDate,
    recurrence_parent_id: task.id,
    recurrence_date: nextOccurrenceDate
  })
  .select()
  .single();

// Add exception when skipping occurrence
await supabase.rpc('add_recurrence_exception', {
  p_task_id: parentTaskId,
  p_exception_date: skippedDate
});

// Check if date is an exception
const { data: isException } = await supabase.rpc('is_recurrence_exception', {
  p_task_id: parentTaskId,
  p_check_date: checkDate
});
```

### 13.2 Type Definitions for Application Layer

```typescript
// packages/shared/src/types/database.ts

// Onboarding types
export interface OnboardingProgress {
  step: 0 | 1 | 2 | 3 | 4 | 5;
  completed: boolean;
  skipped: boolean;
  startedAt: string | null;
  completedAt: string | null;
}

export interface ProfileWithOnboarding extends Profile {
  onboarding_completed: boolean;
  onboarding_step: number;
  onboarding_skipped: boolean;
  onboarding_started_at: string | null;
  onboarding_completed_at: string | null;
}

// Search history types
export interface SearchHistoryEntry {
  id: string;
  user_id: string;
  workspace_id: string | null;
  query: string;
  query_normalized: string;
  result_type: 'task' | 'project' | 'grant' | 'publication' | 'navigation' | 'action' | null;
  result_id: string | null;
  result_title: string | null;
  source: 'command_palette' | 'quick_search' | 'navigation';
  selected: boolean;
  created_at: string;
}

export interface RecentSearch {
  query: string;
  result_type: string | null;
  result_id: string | null;
  result_title: string | null;
  last_searched_at: string;
}

// Recurring task types
export interface RecurringTaskFields {
  is_recurring: boolean;
  recurrence_rule: string | null;
  recurrence_parent_id: string | null;
  recurrence_date: string | null;
  recurrence_exceptions: string[];
}

export interface TaskWithRecurrence extends Task, RecurringTaskFields {}

export interface RecurrenceInfo {
  is_parent: boolean;
  is_instance: boolean;
  parent_id: string;
  rule: string | null;
  instance_date: string | null;
  exception_count: number;
  instance_count: number;
}

export type RecurrenceEditScope = 'this' | 'this_and_future' | 'all';
```

### 13.3 Zod Schemas for Validation

```typescript
// packages/shared/src/schemas/index.ts

import { z } from 'zod';

// Onboarding schemas
export const onboardingProgressSchema = z.object({
  step: z.number().min(0).max(5),
  completed: z.boolean(),
  skipped: z.boolean(),
  startedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
});

export const updateOnboardingSchema = z.object({
  step: z.number().min(0).max(5).optional(),
  completed: z.boolean().optional(),
  skipped: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided'
});

// Search history schemas
export const searchHistoryInsertSchema = z.object({
  query: z.string().min(1).max(200),
  workspace_id: z.string().uuid().optional(),
  result_type: z.enum(['task', 'project', 'grant', 'publication', 'navigation', 'action']).optional(),
  result_id: z.string().uuid().optional(),
  result_title: z.string().max(500).optional(),
  selected: z.boolean().default(false),
});

// Recurring task schemas
export const recurrenceRuleSchema = z.object({
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  interval: z.number().min(1).max(365),
  byDay: z.array(z.enum(['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'])).optional(),
  byMonthDay: z.array(z.number().min(1).max(31)).optional(),
  byMonth: z.array(z.number().min(1).max(12)).optional(),
  until: z.string().datetime().optional(),
  count: z.number().min(1).max(999).optional(),
});

export const createRecurringTaskSchema = z.object({
  title: z.string().min(1).max(500),
  recurrence_rule: z.string().startsWith('RRULE:'),
  due: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  // ... other task fields
});

export const updateRecurrenceSchema = z.object({
  scope: z.enum(['this', 'this_and_future', 'all']),
  updates: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    recurrence_rule: z.string().startsWith('RRULE:').optional(),
    // ... other updatable fields
  }),
});
```

---

## Appendix A: Complete Migration Scripts

All migration scripts are included in their respective sections:
- Section 2.1: `20260115000000_onboarding_tracking.sql`
- Section 3.1: `20260118000000_search_history.sql`
- Section 4.1: `20260120000000_recurring_tasks.sql`

## Appendix B: Performance Test Results

To be populated after staging deployment with actual metrics.

## Appendix C: Glossary

| Term | Definition |
|------|------------|
| RRULE | Recurrence Rule - RFC 5545 standard for defining recurring events |
| RLS | Row Level Security - PostgreSQL feature for row-based access control |
| Partial Index | Index with WHERE clause that only indexes subset of rows |
| SECURITY DEFINER | Function executes with privileges of owner, not caller |

---

**Document Complete**

Database Engineer
January 14, 2026

---

*Implementation Notes:*
1. Apply migrations in order: Sprint 2 → Sprint 3 → Sprint 5
2. Run validation queries after each migration
3. Monitor metrics for 48 hours post-deployment
4. Keep rollback scripts ready but DO NOT apply unless critical issue
