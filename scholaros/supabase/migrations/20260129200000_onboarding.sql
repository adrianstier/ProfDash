-- Migration: 20260129200000_onboarding.sql
-- Purpose: Progressive Onboarding Wizard support
-- Description: Add onboarding tracking columns to profiles table for the
--              Progressive Onboarding Wizard implementation.
--
-- NOTE: This migration adds columns that may already exist from a previous
--       migration (20260115000000_onboarding_tracking.sql). The IF NOT EXISTS
--       clause ensures idempotency.

BEGIN;

-- ============================================================================
-- STEP 1: Add onboarding columns to profiles table (if not exists)
-- ============================================================================

-- Add onboarding_completed column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Add onboarding_step column (0 = not started, 1-5 = wizard steps)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;

-- Add onboarding_completed_at timestamp column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- ============================================================================
-- STEP 2: Add additional onboarding metadata (if needed for enhanced tracking)
-- ============================================================================

-- Add onboarding_skipped column if not exists
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_skipped BOOLEAN DEFAULT FALSE;

-- Add onboarding_started_at column if not exists
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_started_at TIMESTAMPTZ;

-- ============================================================================
-- STEP 3: Ensure constraints exist (skip if already present)
-- ============================================================================

-- Add constraint for valid step range (0-5)
-- Using DO block to handle case where constraint already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_onboarding_step_range'
    AND conrelid = 'profiles'::regclass
  ) THEN
    ALTER TABLE profiles
    ADD CONSTRAINT chk_onboarding_step_range
    CHECK (onboarding_step >= 0 AND onboarding_step <= 5);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- STEP 4: Create or update indexes for onboarding queries
-- ============================================================================

-- Index for finding incomplete onboarding users
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_status
ON profiles(onboarding_completed, onboarding_step)
WHERE onboarding_completed = FALSE;

-- ============================================================================
-- STEP 5: Add column comments for documentation
-- ============================================================================

COMMENT ON COLUMN profiles.onboarding_completed IS
'Whether user has completed the onboarding wizard (reached step 5 or skipped)';

COMMENT ON COLUMN profiles.onboarding_step IS
'Current onboarding wizard step (0=not started, 1=welcome, 2=workspace setup, 3=first task, 4=features tour, 5=complete)';

COMMENT ON COLUMN profiles.onboarding_completed_at IS
'Timestamp when user completed the onboarding wizard';

COMMIT;
