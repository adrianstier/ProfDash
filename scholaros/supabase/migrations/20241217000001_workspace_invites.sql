-- ScholarOS Workspace Invites and Enhanced Multi-Tenancy
-- This migration adds invite functionality and improves workspace access control

-- =============================================================================
-- WORKSPACE INVITES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS workspace_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role workspace_role NOT NULL DEFAULT 'member',
  token TEXT UNIQUE NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- Create indexes
CREATE INDEX idx_workspace_invites_token ON workspace_invites(token);
CREATE INDEX idx_workspace_invites_email ON workspace_invites(email);
CREATE INDEX idx_workspace_invites_workspace_id ON workspace_invites(workspace_id);

-- Enable RLS
ALTER TABLE workspace_invites ENABLE ROW LEVEL SECURITY;

-- Invite policies
CREATE POLICY "Workspace admins can view invites"
  ON workspace_invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_invites.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Workspace admins can create invites"
  ON workspace_invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_invites.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Workspace admins can delete invites"
  ON workspace_invites FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_invites.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin')
    )
  );

-- =============================================================================
-- HELPER FUNCTION: Get user's role in a workspace
-- =============================================================================
CREATE OR REPLACE FUNCTION get_user_workspace_role(ws_id UUID, usr_id UUID DEFAULT auth.uid())
RETURNS workspace_role AS $$
  SELECT role FROM workspace_members
  WHERE workspace_id = ws_id AND user_id = usr_id
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- =============================================================================
-- HELPER FUNCTION: Check if user is member of workspace
-- =============================================================================
CREATE OR REPLACE FUNCTION is_workspace_member(ws_id UUID, usr_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = ws_id AND user_id = usr_id
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- =============================================================================
-- FUNCTION: Create workspace with owner
-- =============================================================================
CREATE OR REPLACE FUNCTION create_workspace_with_owner(
  workspace_name TEXT,
  workspace_slug TEXT
)
RETURNS UUID AS $$
DECLARE
  new_workspace_id UUID;
BEGIN
  -- Create workspace
  INSERT INTO workspaces (name, slug, created_by)
  VALUES (workspace_name, workspace_slug, auth.uid())
  RETURNING id INTO new_workspace_id;

  -- Add creator as owner
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (new_workspace_id, auth.uid(), 'owner');

  RETURN new_workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- FUNCTION: Accept workspace invite
-- =============================================================================
CREATE OR REPLACE FUNCTION accept_workspace_invite(invite_token TEXT)
RETURNS JSONB AS $$
DECLARE
  invite_record workspace_invites%ROWTYPE;
  result JSONB;
BEGIN
  -- Find valid invite
  SELECT * INTO invite_record
  FROM workspace_invites
  WHERE token = invite_token
  AND expires_at > NOW();

  IF invite_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invite');
  END IF;

  -- Check if user already member
  IF is_workspace_member(invite_record.workspace_id) THEN
    -- Delete the invite since user is already a member
    DELETE FROM workspace_invites WHERE id = invite_record.id;
    RETURN jsonb_build_object('success', false, 'error', 'Already a member of this workspace');
  END IF;

  -- Add user to workspace
  INSERT INTO workspace_members (workspace_id, user_id, role, invited_by)
  VALUES (invite_record.workspace_id, auth.uid(), invite_record.role, invite_record.invited_by);

  -- Delete the invite
  DELETE FROM workspace_invites WHERE id = invite_record.id;

  -- Return success with workspace details
  SELECT jsonb_build_object(
    'success', true,
    'workspace_id', invite_record.workspace_id,
    'role', invite_record.role
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- FUNCTION: Create default workspace on user signup
-- =============================================================================
CREATE OR REPLACE FUNCTION create_default_workspace_for_user()
RETURNS TRIGGER AS $$
DECLARE
  new_workspace_id UUID;
  user_name TEXT;
  slug_base TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Get user's name or email prefix for workspace name
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );

  -- Generate slug base from name
  slug_base := lower(regexp_replace(user_name, '[^a-zA-Z0-9]+', '-', 'g'));
  slug_base := trim(both '-' from slug_base);

  -- Ensure unique slug
  final_slug := slug_base;
  WHILE EXISTS (SELECT 1 FROM workspaces WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := slug_base || '-' || counter;
  END LOOP;

  -- Create default workspace
  INSERT INTO workspaces (name, slug, created_by)
  VALUES (user_name || '''s Workspace', final_slug, NEW.id)
  RETURNING id INTO new_workspace_id;

  -- Add user as owner
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (new_workspace_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-creating workspace on signup
CREATE TRIGGER on_auth_user_created_workspace
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_workspace_for_user();

-- =============================================================================
-- UPDATE WORKSPACE POLICIES: Allow workspace creation
-- =============================================================================
CREATE POLICY "Authenticated users can create workspaces"
  ON workspaces FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- =============================================================================
-- UPDATE WORKSPACE MEMBER POLICIES
-- =============================================================================

-- Admins can add members
CREATE POLICY "Admins can add workspace members"
  ON workspace_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
    OR
    -- Allow user to be added by invite function (they won't be admin yet)
    auth.uid() = user_id
  );

-- Owners can update member roles (except changing owner)
CREATE POLICY "Owners can update member roles"
  ON workspace_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role = 'owner'
    )
  );

-- Owners can remove members (except themselves)
CREATE POLICY "Owners can remove members"
  ON workspace_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role = 'owner'
    )
    AND user_id != auth.uid()
  );

-- Users can leave workspaces (but not if they're the only owner)
CREATE POLICY "Users can leave workspaces"
  ON workspace_members FOR DELETE
  USING (
    user_id = auth.uid()
    AND (
      role != 'owner'
      OR EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.user_id != auth.uid()
        AND wm.role = 'owner'
      )
    )
  );

-- =============================================================================
-- UPDATE TASK POLICIES: Workspace-based access
-- =============================================================================

-- Drop existing task policies
DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can create their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;

-- New workspace-aware policies
-- Personal tasks (no workspace) - user can CRUD their own
CREATE POLICY "Users can view personal tasks"
  ON tasks FOR SELECT
  USING (
    auth.uid() = user_id
    AND workspace_id IS NULL
  );

CREATE POLICY "Users can create personal tasks"
  ON tasks FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND workspace_id IS NULL
  );

CREATE POLICY "Users can update personal tasks"
  ON tasks FOR UPDATE
  USING (
    auth.uid() = user_id
    AND workspace_id IS NULL
  );

CREATE POLICY "Users can delete personal tasks"
  ON tasks FOR DELETE
  USING (
    auth.uid() = user_id
    AND workspace_id IS NULL
  );

-- Workspace tasks - members can view
CREATE POLICY "Workspace members can view workspace tasks"
  ON tasks FOR SELECT
  USING (
    workspace_id IS NOT NULL
    AND is_workspace_member(workspace_id)
  );

-- Workspace tasks - members (not limited) can create
CREATE POLICY "Workspace members can create workspace tasks"
  ON tasks FOR INSERT
  WITH CHECK (
    workspace_id IS NOT NULL
    AND auth.uid() = user_id
    AND get_user_workspace_role(workspace_id) IN ('owner', 'admin', 'member')
  );

-- Workspace tasks - creators and admins can update
CREATE POLICY "Task creators and admins can update workspace tasks"
  ON tasks FOR UPDATE
  USING (
    workspace_id IS NOT NULL
    AND (
      auth.uid() = user_id
      OR get_user_workspace_role(workspace_id) IN ('owner', 'admin')
    )
  );

-- Workspace tasks - creators and admins can delete
CREATE POLICY "Task creators and admins can delete workspace tasks"
  ON tasks FOR DELETE
  USING (
    workspace_id IS NOT NULL
    AND (
      auth.uid() = user_id
      OR get_user_workspace_role(workspace_id) IN ('owner', 'admin')
    )
  );
