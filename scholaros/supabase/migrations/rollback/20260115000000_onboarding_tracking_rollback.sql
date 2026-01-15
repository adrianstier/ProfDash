-- Rollback Migration: 20260115000000_onboarding_tracking.sql
-- Purpose: Revert onboarding tracking columns from profiles table
-- Use only if critical issues discovered post-deployment
-- WARNING: This will lose all onboarding progress data

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
