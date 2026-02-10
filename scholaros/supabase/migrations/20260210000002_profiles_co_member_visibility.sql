-- Migration: Profiles Co-Member Visibility
-- Updates the profiles SELECT policy so workspace co-members can see each other's
-- profiles (names, avatars, etc.), which is needed for displaying team members
-- in workspace views.

-- Drop the old restrictive SELECT policy that only allowed users to see their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;

-- Create a new SELECT policy that allows:
-- 1. Users to always see their own profile
-- 2. Users to see profiles of anyone who shares a workspace with them
CREATE POLICY "Workspace co-members can view profiles"
ON profiles
FOR SELECT
USING (
  id = auth.uid()
  OR id IN (
    SELECT wm2.user_id
    FROM workspace_members wm1
    JOIN workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
    WHERE wm1.user_id = auth.uid()
  )
);
