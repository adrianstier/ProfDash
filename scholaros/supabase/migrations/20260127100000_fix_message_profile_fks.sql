-- Migration: Fix workspace_messages foreign keys to profiles
-- Adds explicit FKs to profiles table for proper PostgREST joins

-- Add FK from workspace_messages.user_id to profiles.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'workspace_messages_user_id_profiles_fkey'
    ) THEN
        ALTER TABLE workspace_messages
        ADD CONSTRAINT workspace_messages_user_id_profiles_fkey
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END$$;

-- Add FK from workspace_messages.reply_to_user_id to profiles.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'workspace_messages_reply_to_user_id_profiles_fkey'
    ) THEN
        ALTER TABLE workspace_messages
        ADD CONSTRAINT workspace_messages_reply_to_user_id_profiles_fkey
        FOREIGN KEY (reply_to_user_id) REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
END$$;

-- Add FK from workspace_messages.recipient_id to profiles.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'workspace_messages_recipient_id_profiles_fkey'
    ) THEN
        ALTER TABLE workspace_messages
        ADD CONSTRAINT workspace_messages_recipient_id_profiles_fkey
        FOREIGN KEY (recipient_id) REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
END$$;

-- Add FK from workspace_messages.pinned_by to profiles.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'workspace_messages_pinned_by_profiles_fkey'
    ) THEN
        ALTER TABLE workspace_messages
        ADD CONSTRAINT workspace_messages_pinned_by_profiles_fkey
        FOREIGN KEY (pinned_by) REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
END$$;

-- Add FK from workspace_activity.user_id to profiles.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'workspace_activity_user_id_profiles_fkey'
    ) THEN
        ALTER TABLE workspace_activity
        ADD CONSTRAINT workspace_activity_user_id_profiles_fkey
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END$$;

-- Add FK from user_presence.user_id to profiles.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'user_presence_user_id_profiles_fkey'
    ) THEN
        ALTER TABLE user_presence
        ADD CONSTRAINT user_presence_user_id_profiles_fkey
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END$$;
