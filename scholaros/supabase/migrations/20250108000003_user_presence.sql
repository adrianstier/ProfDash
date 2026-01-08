-- Migration: User Presence (Online/Typing Status)
-- Tracks user online status and typing indicators for chat

-- Presence status enum
CREATE TYPE presence_status AS ENUM ('online', 'away', 'dnd', 'offline');

-- User presence table
CREATE TABLE user_presence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

    status presence_status DEFAULT 'offline',
    is_typing BOOLEAN DEFAULT FALSE,
    typing_in_conversation TEXT, -- 'workspace' or recipient user_id for DMs

    last_seen TIMESTAMPTZ DEFAULT NOW(),
    last_active TIMESTAMPTZ DEFAULT NOW(),

    -- Custom status message (optional)
    custom_status TEXT,

    UNIQUE(user_id, workspace_id)
);

-- Indexes
CREATE INDEX idx_user_presence_workspace ON user_presence(workspace_id);
CREATE INDEX idx_user_presence_user ON user_presence(user_id);
CREATE INDEX idx_user_presence_status ON user_presence(workspace_id, status);
CREATE INDEX idx_user_presence_typing ON user_presence(workspace_id, is_typing) WHERE is_typing = TRUE;

-- Enable RLS
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view presence in their workspaces"
    ON user_presence FOR SELECT
    USING (
        workspace_id IN (
            SELECT wm.workspace_id
            FROM workspace_members wm
            WHERE wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own presence"
    ON user_presence FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own presence"
    ON user_presence FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own presence"
    ON user_presence FOR DELETE
    USING (user_id = auth.uid());

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;

-- Function to update presence on activity
CREATE OR REPLACE FUNCTION update_user_presence_on_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Update last_active when user sends a message
    UPDATE user_presence
    SET last_active = NOW(), last_seen = NOW(), status = 'online'
    WHERE user_id = NEW.user_id AND workspace_id = NEW.workspace_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update presence when user sends message
CREATE TRIGGER trigger_update_presence_on_message
    AFTER INSERT ON workspace_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_user_presence_on_activity();

-- Function to auto-set users as away after inactivity (to be called by cron)
CREATE OR REPLACE FUNCTION set_inactive_users_away()
RETURNS void AS $$
BEGIN
    UPDATE user_presence
    SET status = 'away'
    WHERE status = 'online'
    AND last_active < NOW() - INTERVAL '5 minutes';

    UPDATE user_presence
    SET status = 'offline'
    WHERE status = 'away'
    AND last_active < NOW() - INTERVAL '15 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE user_presence IS 'Tracks user online status and typing indicators';
COMMENT ON COLUMN user_presence.typing_in_conversation IS 'workspace for team chat, or user_id for DMs';
