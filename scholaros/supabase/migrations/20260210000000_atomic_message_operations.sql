-- Migration: Atomic Message Operations
-- Fixes race conditions in reactions and read receipts by moving
-- read-modify-write logic into Postgres functions that execute atomically.

-- Atomic add reaction
-- Adds a reaction to a message. If the user already reacted with the same
-- emoji, the function is idempotent and returns the current reactions unchanged.
-- A user may only have one reaction per message (adding a new one replaces the old).
CREATE OR REPLACE FUNCTION add_message_reaction(
  p_message_id UUID,
  p_user_id UUID,
  p_reaction TEXT
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  -- Remove any existing reaction from this user, then append the new one.
  -- This runs as a single UPDATE so it is atomic.
  UPDATE workspace_messages
  SET reactions = (
    SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
    FROM jsonb_array_elements(COALESCE(reactions, '[]'::jsonb)) elem
    WHERE elem->>'user_id' <> p_user_id::TEXT
  ) || jsonb_build_array(
    jsonb_build_object(
      'user_id', p_user_id,
      'reaction', p_reaction,
      'created_at', NOW()
    )
  ),
  updated_at = NOW()
  WHERE id = p_message_id
  RETURNING reactions INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic remove reaction
-- Removes a specific reaction (by user + reaction type) from a message.
-- If the reaction does not exist, the function is a no-op.
CREATE OR REPLACE FUNCTION remove_message_reaction(
  p_message_id UUID,
  p_user_id UUID,
  p_reaction TEXT
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  UPDATE workspace_messages
  SET reactions = (
    SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
    FROM jsonb_array_elements(COALESCE(reactions, '[]'::jsonb)) elem
    WHERE NOT (elem->>'user_id' = p_user_id::TEXT AND elem->>'reaction' = p_reaction)
  ),
  updated_at = NOW()
  WHERE id = p_message_id
  RETURNING reactions INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic remove all reactions by user
-- Removes every reaction a given user has on a message.
CREATE OR REPLACE FUNCTION remove_all_user_reactions(
  p_message_id UUID,
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  UPDATE workspace_messages
  SET reactions = (
    SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
    FROM jsonb_array_elements(COALESCE(reactions, '[]'::jsonb)) elem
    WHERE elem->>'user_id' <> p_user_id::TEXT
  ),
  updated_at = NOW()
  WHERE id = p_message_id
  RETURNING reactions INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic mark message as read
-- Appends p_user_id to read_by if not already present.
-- Idempotent: calling twice has no additional effect.
CREATE OR REPLACE FUNCTION mark_message_read(
  p_message_id UUID,
  p_user_id UUID
) RETURNS UUID[] AS $$
DECLARE
  result UUID[];
BEGIN
  UPDATE workspace_messages
  SET read_by = CASE
    WHEN p_user_id = ANY(COALESCE(read_by, ARRAY[]::UUID[]))
    THEN read_by
    ELSE array_append(COALESCE(read_by, ARRAY[]::UUID[]), p_user_id)
  END,
  updated_at = NOW()
  WHERE id = p_message_id
  RETURNING read_by INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON FUNCTION add_message_reaction IS 'Atomically adds a reaction to a message, replacing any existing reaction by the same user';
COMMENT ON FUNCTION remove_message_reaction IS 'Atomically removes a specific reaction (user + reaction type) from a message';
COMMENT ON FUNCTION remove_all_user_reactions IS 'Atomically removes all reactions by a user from a message';
COMMENT ON FUNCTION mark_message_read IS 'Atomically adds a user to the read_by array if not already present';
