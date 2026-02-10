-- Migration: Invite Email Verification
-- Adds a safe invite acceptance function that verifies the accepting user's email
-- matches the invited email, preventing unauthorized invite acceptance.

-- =============================================================================
-- FUNCTION: Accept workspace invite with email verification
-- =============================================================================
CREATE OR REPLACE FUNCTION accept_workspace_invite_safe(
  invite_token TEXT,
  accepting_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  invite_record workspace_invites%ROWTYPE;
  user_email TEXT;
  result JSONB;
BEGIN
  -- Look up the invite by token
  SELECT * INTO invite_record
  FROM workspace_invites
  WHERE token = invite_token;

  -- Check invite exists
  IF invite_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid invite token');
  END IF;

  -- Check invite is not expired
  IF invite_record.expires_at <= NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invite has expired');
  END IF;

  -- Look up the accepting user's email from auth.users
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = accepting_user_id;

  IF user_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Verify the accepting user's email matches the invite email
  IF lower(user_email) != lower(invite_record.email) THEN
    RAISE EXCEPTION 'Email does not match invitation. Invite was sent to %, but accepting user has email %',
      invite_record.email, user_email;
  END IF;

  -- Check if user is already a member
  IF is_workspace_member(invite_record.workspace_id, accepting_user_id) THEN
    -- Delete the invite since user is already a member
    DELETE FROM workspace_invites WHERE id = invite_record.id;
    RETURN jsonb_build_object('success', false, 'error', 'Already a member of this workspace');
  END IF;

  -- Add user to workspace
  INSERT INTO workspace_members (workspace_id, user_id, role, invited_by)
  VALUES (invite_record.workspace_id, accepting_user_id, invite_record.role, invite_record.invited_by);

  -- Delete the invite
  DELETE FROM workspace_invites WHERE id = invite_record.id;

  -- Return success with workspace details
  RETURN jsonb_build_object(
    'success', true,
    'workspace_id', invite_record.workspace_id,
    'role', invite_record.role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add a comment explaining the function
COMMENT ON FUNCTION accept_workspace_invite_safe(TEXT, UUID) IS
  'Safely accepts a workspace invite after verifying the accepting user email matches the invited email. Raises an exception on email mismatch.';
