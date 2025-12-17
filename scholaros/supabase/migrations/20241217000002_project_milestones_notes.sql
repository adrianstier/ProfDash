-- ScholarOS Project Milestones and Notes
-- This migration adds milestones and notes functionality to projects

-- =============================================================================
-- PROJECT MILESTONES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS project_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX idx_project_milestones_project_id ON project_milestones(project_id);
CREATE INDEX idx_project_milestones_due_date ON project_milestones(due_date);

-- Enable RLS
ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;

-- Milestones inherit access from parent project
CREATE POLICY "Users can view milestones for their projects"
  ON project_milestones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE p.id = project_milestones.project_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create milestones for their projects"
  ON project_milestones FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE p.id = project_milestones.project_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update milestones for their projects"
  ON project_milestones FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE p.id = project_milestones.project_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete milestones for their projects"
  ON project_milestones FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE p.id = project_milestones.project_id
      AND wm.user_id = auth.uid()
    )
  );

-- =============================================================================
-- PROJECT NOTES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS project_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX idx_project_notes_project_id ON project_notes(project_id);
CREATE INDEX idx_project_notes_user_id ON project_notes(user_id);
CREATE INDEX idx_project_notes_is_pinned ON project_notes(is_pinned);

-- Enable RLS
ALTER TABLE project_notes ENABLE ROW LEVEL SECURITY;

-- Notes inherit access from parent project
CREATE POLICY "Users can view notes for their projects"
  ON project_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE p.id = project_notes.project_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create notes for their projects"
  ON project_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE p.id = project_notes.project_id
      AND wm.user_id = auth.uid()
    )
    AND auth.uid() = user_id
  );

-- Users can only update their own notes
CREATE POLICY "Users can update their own notes"
  ON project_notes FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can only delete their own notes
CREATE POLICY "Users can delete their own notes"
  ON project_notes FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- PROJECT COLLABORATORS TABLE (for project-specific team members)
-- =============================================================================
CREATE TABLE IF NOT EXISTS project_collaborators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT, -- e.g., 'co-author', 'contributor', 'advisor'
  is_external BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX idx_project_collaborators_project_id ON project_collaborators(project_id);
CREATE INDEX idx_project_collaborators_user_id ON project_collaborators(user_id);

-- Enable RLS
ALTER TABLE project_collaborators ENABLE ROW LEVEL SECURITY;

-- Collaborators inherit access from parent project
CREATE POLICY "Users can view collaborators for their projects"
  ON project_collaborators FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE p.id = project_collaborators.project_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage collaborators for their projects"
  ON project_collaborators FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE p.id = project_collaborators.project_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin', 'member')
    )
  );

-- =============================================================================
-- TRIGGERS: Auto-update updated_at
-- =============================================================================
CREATE TRIGGER update_project_milestones_updated_at
  BEFORE UPDATE ON project_milestones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_notes_updated_at
  BEFORE UPDATE ON project_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- UPDATE PROJECTS POLICIES: Add delete policy
-- =============================================================================
CREATE POLICY "Admins can delete projects"
  ON projects FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = projects.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin')
    )
  );
