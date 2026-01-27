-- Migration: Workspace Messages (Chat)
-- Creates tables for real-time team chat and direct messaging

-- Reaction type enum (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_reaction_type') THEN
        CREATE TYPE message_reaction_type AS ENUM (
            'heart',
            'thumbsup',
            'thumbsdown',
            'haha',
            'exclamation',
            'question'
        );
    END IF;
END$$;

-- Main messages table
CREATE TABLE IF NOT EXISTS workspace_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Message content
    text TEXT NOT NULL,

    -- Conversation type: NULL = workspace chat, user_id = DM
    recipient_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Task/project linking
    related_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    related_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

    -- Threading
    reply_to_id UUID REFERENCES workspace_messages(id) ON DELETE SET NULL,
    reply_to_preview TEXT, -- Cached preview of parent message (first 100 chars)
    reply_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Reactions (JSONB array: [{user_id, reaction, created_at}])
    reactions JSONB DEFAULT '[]'::jsonb,

    -- Read receipts (array of user_ids who have read)
    read_by UUID[] DEFAULT ARRAY[]::UUID[],

    -- @mentions (array of user_ids mentioned)
    mentions UUID[] DEFAULT ARRAY[]::UUID[],

    -- Message state
    edited_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ, -- Soft delete

    -- Pinning
    is_pinned BOOLEAN DEFAULT FALSE,
    pinned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    pinned_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workspace_messages_workspace ON workspace_messages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_messages_user ON workspace_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_messages_recipient ON workspace_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_workspace_messages_created ON workspace_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workspace_messages_reply_to ON workspace_messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_workspace_messages_task ON workspace_messages(related_task_id) WHERE related_task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workspace_messages_project ON workspace_messages(related_project_id) WHERE related_project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workspace_messages_read_by ON workspace_messages USING GIN(read_by);
CREATE INDEX IF NOT EXISTS idx_workspace_messages_mentions ON workspace_messages USING GIN(mentions);
CREATE INDEX IF NOT EXISTS idx_workspace_messages_pinned ON workspace_messages(workspace_id, is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX IF NOT EXISTS idx_workspace_messages_not_deleted ON workspace_messages(workspace_id, created_at DESC) WHERE deleted_at IS NULL;

-- Composite index for conversation queries
CREATE INDEX IF NOT EXISTS idx_workspace_messages_conversation ON workspace_messages(workspace_id, recipient_id, created_at DESC) WHERE deleted_at IS NULL;

-- Enable Row Level Security
ALTER TABLE workspace_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies (workspace-based isolation)
DROP POLICY IF EXISTS "Users can view messages in their workspaces" ON workspace_messages;
CREATE POLICY "Users can view messages in their workspaces"
    ON workspace_messages FOR SELECT
    USING (
        workspace_id IN (
            SELECT wm.workspace_id
            FROM workspace_members wm
            WHERE wm.user_id = auth.uid()
        )
        AND deleted_at IS NULL
    );

DROP POLICY IF EXISTS "Users can view their own deleted messages" ON workspace_messages;
CREATE POLICY "Users can view their own deleted messages"
    ON workspace_messages FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert messages in their workspaces" ON workspace_messages;
CREATE POLICY "Users can insert messages in their workspaces"
    ON workspace_messages FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT wm.workspace_id
            FROM workspace_members wm
            WHERE wm.user_id = auth.uid()
        )
        AND user_id = auth.uid()
    );

DROP POLICY IF EXISTS "Users can update their own messages" ON workspace_messages;
CREATE POLICY "Users can update their own messages"
    ON workspace_messages FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can soft delete their own messages" ON workspace_messages;
CREATE POLICY "Users can soft delete their own messages"
    ON workspace_messages FOR DELETE
    USING (user_id = auth.uid());

-- Enable Realtime (safe if already added)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE workspace_messages;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END$$;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_workspace_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_workspace_messages_updated_at ON workspace_messages;
CREATE TRIGGER trigger_workspace_messages_updated_at
    BEFORE UPDATE ON workspace_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_workspace_messages_updated_at();

-- Comments
COMMENT ON TABLE workspace_messages IS 'Team and direct messages with support for replies, reactions, read receipts, pinning, and mentions';
COMMENT ON COLUMN workspace_messages.recipient_id IS 'NULL for workspace chat, user_id for DM';
COMMENT ON COLUMN workspace_messages.reactions IS 'Array of {user_id, reaction, created_at} objects';
COMMENT ON COLUMN workspace_messages.read_by IS 'Array of user_ids who have read this message';
COMMENT ON COLUMN workspace_messages.reply_to_id IS 'ID of the message being replied to';
COMMENT ON COLUMN workspace_messages.deleted_at IS 'Soft delete timestamp - NULL means not deleted';
COMMENT ON COLUMN workspace_messages.is_pinned IS 'Whether message is pinned to conversation';
COMMENT ON COLUMN workspace_messages.mentions IS 'Array of user_ids mentioned in this message';
