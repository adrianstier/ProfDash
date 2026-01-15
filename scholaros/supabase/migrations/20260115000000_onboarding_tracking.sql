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

-- Ensure logical consistency: completed implies step = 5 or skipped
ALTER TABLE profiles
ADD CONSTRAINT chk_onboarding_completed_consistency
CHECK (
  (onboarding_completed = FALSE) OR
  (onboarding_completed = TRUE AND (onboarding_step = 5 OR onboarding_skipped = TRUE))
);

-- ============================================================================
-- STEP 3: Create indexes for onboarding analytics queries
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
