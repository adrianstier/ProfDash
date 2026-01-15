-- Rollback Migration: 20260118000000_search_history.sql
-- Purpose: Remove search history table and related objects
-- Use only if critical issues discovered post-deployment
-- WARNING: This will delete all search history data

BEGIN;

-- Drop function first (used by trigger and application)
DROP FUNCTION IF EXISTS get_recent_searches(UUID, UUID, INT);

-- Drop trigger
DROP TRIGGER IF EXISTS trigger_cleanup_search_history ON search_history;

-- Drop cleanup function
DROP FUNCTION IF EXISTS cleanup_search_history();

-- Drop table (includes indexes and policies via CASCADE)
DROP TABLE IF EXISTS search_history CASCADE;

COMMIT;
