-- Migration: Project Hierarchy (Phases, Workstreams, Deliverables, Roles, Templates)
-- Enables RSE-style hierarchical project management with blocking logic

-- =============================================================================
-- NEW TABLES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Project Phases - Sequential stages with blocking (PROJECT-level, shared)
-- -----------------------------------------------------------------------------
CREATE TABLE project_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',  -- pending, in_progress, blocked, completed
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    due_date DATE,
    blocked_by UUID[] DEFAULT ARRAY[]::UUID[],  -- Phase IDs that must complete first
    assigned_role TEXT,  -- Primary role name (e.g., 'Business Analyst')
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT valid_phase_status CHECK (status IN ('pending', 'in_progress', 'blocked', 'completed'))
);

-- Indexes for project_phases
CREATE INDEX idx_project_phases_project ON project_phases(project_id);
CREATE INDEX idx_project_phases_sort ON project_phases(project_id, sort_order);
CREATE INDEX idx_project_phases_status ON project_phases(status);
CREATE INDEX idx_project_phases_due ON project_phases(due_date) WHERE due_date IS NOT NULL;

-- Updated_at trigger
CREATE TRIGGER update_project_phases_updated_at
    BEFORE UPDATE ON project_phases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 2. Project Workstreams - Organizational groupings (parallel tracks)
-- -----------------------------------------------------------------------------
CREATE TABLE project_workstreams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT 'bg-blue-500',
    sort_order INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',  -- active, paused, completed
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT valid_workstream_status CHECK (status IN ('active', 'paused', 'completed'))
);

-- Indexes for project_workstreams
CREATE INDEX idx_project_workstreams_project ON project_workstreams(project_id);
CREATE INDEX idx_project_workstreams_sort ON project_workstreams(project_id, sort_order);
CREATE INDEX idx_project_workstreams_owner ON project_workstreams(owner_id) WHERE owner_id IS NOT NULL;

-- Updated_at trigger
CREATE TRIGGER update_project_workstreams_updated_at
    BEFORE UPDATE ON project_workstreams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 3. Project Deliverables - Artifacts per phase (optionally workstream-specific)
-- -----------------------------------------------------------------------------
CREATE TABLE project_deliverables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_id UUID NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    workstream_id UUID REFERENCES project_workstreams(id) ON DELETE SET NULL,  -- NULL = shared across workstreams
    title TEXT NOT NULL,
    description TEXT,
    artifact_type TEXT,  -- document, code, data, report, presentation, other
    file_path TEXT,  -- e.g., /docs/PROBLEM_DEFINITION.md
    sort_order INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',  -- pending, in_progress, review, completed
    completed_at TIMESTAMPTZ,
    due_date DATE,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT valid_deliverable_status CHECK (status IN ('pending', 'in_progress', 'review', 'completed')),
    CONSTRAINT valid_artifact_type CHECK (artifact_type IS NULL OR artifact_type IN ('document', 'code', 'data', 'report', 'presentation', 'other'))
);

-- Indexes for project_deliverables
CREATE INDEX idx_project_deliverables_phase ON project_deliverables(phase_id);
CREATE INDEX idx_project_deliverables_project ON project_deliverables(project_id);
CREATE INDEX idx_project_deliverables_workstream ON project_deliverables(workstream_id) WHERE workstream_id IS NOT NULL;
CREATE INDEX idx_project_deliverables_status ON project_deliverables(status);
CREATE INDEX idx_project_deliverables_sort ON project_deliverables(phase_id, sort_order);

-- Updated_at trigger
CREATE TRIGGER update_project_deliverables_updated_at
    BEFORE UPDATE ON project_deliverables
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 4. Project Roles - Project-specific roles (including AI agents)
-- -----------------------------------------------------------------------------
CREATE TABLE project_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT 'bg-gray-500',
    is_ai_agent BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT unique_role_per_project UNIQUE (project_id, name)
);

-- Indexes for project_roles
CREATE INDEX idx_project_roles_project ON project_roles(project_id);

-- -----------------------------------------------------------------------------
-- 5. Project Phase Assignments - Link roles/users to phases
-- -----------------------------------------------------------------------------
CREATE TABLE project_phase_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_id UUID NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,
    role_id UUID REFERENCES project_roles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    assignment_type TEXT NOT NULL DEFAULT 'contributor',  -- owner, contributor, reviewer
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT phase_assignment_check CHECK (role_id IS NOT NULL OR user_id IS NOT NULL),
    CONSTRAINT valid_assignment_type CHECK (assignment_type IN ('owner', 'contributor', 'reviewer'))
);

-- Indexes for project_phase_assignments
CREATE INDEX idx_phase_assignments_phase ON project_phase_assignments(phase_id);
CREATE INDEX idx_phase_assignments_role ON project_phase_assignments(role_id) WHERE role_id IS NOT NULL;
CREATE INDEX idx_phase_assignments_user ON project_phase_assignments(user_id) WHERE user_id IS NOT NULL;

-- Prevent duplicate assignments
CREATE UNIQUE INDEX idx_phase_assignments_unique_role
    ON project_phase_assignments(phase_id, role_id)
    WHERE role_id IS NOT NULL;
CREATE UNIQUE INDEX idx_phase_assignments_unique_user
    ON project_phase_assignments(phase_id, user_id)
    WHERE user_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 6. Project Templates - Reusable templates for phase/deliverable structures
-- -----------------------------------------------------------------------------
CREATE TABLE project_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,  -- NULL = global template
    name TEXT NOT NULL,
    description TEXT,
    phase_definitions JSONB NOT NULL DEFAULT '[]'::jsonb,  -- Array of phase definitions
    role_definitions JSONB DEFAULT '[]'::jsonb,  -- Array of role definitions
    is_public BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for project_templates
CREATE INDEX idx_project_templates_workspace ON project_templates(workspace_id) WHERE workspace_id IS NOT NULL;
CREATE INDEX idx_project_templates_public ON project_templates(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_project_templates_creator ON project_templates(created_by) WHERE created_by IS NOT NULL;

-- Updated_at trigger
CREATE TRIGGER update_project_templates_updated_at
    BEFORE UPDATE ON project_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- MODIFICATIONS TO EXISTING TABLES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Add component linking to workspace_messages
-- -----------------------------------------------------------------------------
ALTER TABLE workspace_messages
    ADD COLUMN IF NOT EXISTS related_phase_id UUID REFERENCES project_phases(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS related_workstream_id UUID REFERENCES project_workstreams(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS related_deliverable_id UUID REFERENCES project_deliverables(id) ON DELETE SET NULL;

-- Indexes for component-linked messages
CREATE INDEX IF NOT EXISTS idx_messages_phase
    ON workspace_messages(related_phase_id) WHERE related_phase_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_workstream
    ON workspace_messages(related_workstream_id) WHERE related_workstream_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_deliverable
    ON workspace_messages(related_deliverable_id) WHERE related_deliverable_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- Add component linking to workspace_activity
-- -----------------------------------------------------------------------------
ALTER TABLE workspace_activity
    ADD COLUMN IF NOT EXISTS phase_id UUID REFERENCES project_phases(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS workstream_id UUID REFERENCES project_workstreams(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS deliverable_id UUID REFERENCES project_deliverables(id) ON DELETE SET NULL;

-- Indexes for component activity
CREATE INDEX IF NOT EXISTS idx_activity_phase
    ON workspace_activity(phase_id) WHERE phase_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activity_workstream
    ON workspace_activity(workstream_id) WHERE workstream_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activity_deliverable
    ON workspace_activity(deliverable_id) WHERE deliverable_id IS NOT NULL;

-- Add new activity action types
ALTER TYPE activity_action ADD VALUE IF NOT EXISTS 'phase_created';
ALTER TYPE activity_action ADD VALUE IF NOT EXISTS 'phase_started';
ALTER TYPE activity_action ADD VALUE IF NOT EXISTS 'phase_completed';
ALTER TYPE activity_action ADD VALUE IF NOT EXISTS 'phase_blocked';
ALTER TYPE activity_action ADD VALUE IF NOT EXISTS 'workstream_created';
ALTER TYPE activity_action ADD VALUE IF NOT EXISTS 'workstream_updated';
ALTER TYPE activity_action ADD VALUE IF NOT EXISTS 'deliverable_created';
ALTER TYPE activity_action ADD VALUE IF NOT EXISTS 'deliverable_completed';
ALTER TYPE activity_action ADD VALUE IF NOT EXISTS 'role_assigned';
ALTER TYPE activity_action ADD VALUE IF NOT EXISTS 'template_applied';

-- -----------------------------------------------------------------------------
-- Add component linking to tasks
-- -----------------------------------------------------------------------------
ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS phase_id UUID REFERENCES project_phases(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS workstream_id UUID REFERENCES project_workstreams(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS deliverable_id UUID REFERENCES project_deliverables(id) ON DELETE SET NULL;

-- Indexes for component-linked tasks
CREATE INDEX IF NOT EXISTS idx_tasks_phase
    ON tasks(phase_id) WHERE phase_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_workstream
    ON tasks(workstream_id) WHERE workstream_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_deliverable
    ON tasks(deliverable_id) WHERE deliverable_id IS NOT NULL;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on all new tables
ALTER TABLE project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_workstreams ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_phase_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_templates ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- RLS for project_phases
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view phases for their projects"
    ON project_phases FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
            WHERE p.id = project_phases.project_id
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage phases for their projects"
    ON project_phases FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
            WHERE p.id = project_phases.project_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('owner', 'admin', 'member')
        )
    );

-- -----------------------------------------------------------------------------
-- RLS for project_workstreams
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view workstreams for their projects"
    ON project_workstreams FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
            WHERE p.id = project_workstreams.project_id
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage workstreams for their projects"
    ON project_workstreams FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
            WHERE p.id = project_workstreams.project_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('owner', 'admin', 'member')
        )
    );

-- -----------------------------------------------------------------------------
-- RLS for project_deliverables
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view deliverables for their projects"
    ON project_deliverables FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
            WHERE p.id = project_deliverables.project_id
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage deliverables for their projects"
    ON project_deliverables FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
            WHERE p.id = project_deliverables.project_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('owner', 'admin', 'member')
        )
    );

-- -----------------------------------------------------------------------------
-- RLS for project_roles
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view roles for their projects"
    ON project_roles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
            WHERE p.id = project_roles.project_id
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage roles for their projects"
    ON project_roles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
            WHERE p.id = project_roles.project_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('owner', 'admin', 'member')
        )
    );

-- -----------------------------------------------------------------------------
-- RLS for project_phase_assignments
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view assignments for their projects"
    ON project_phase_assignments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM project_phases ph
            JOIN projects p ON p.id = ph.project_id
            JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
            WHERE ph.id = project_phase_assignments.phase_id
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage assignments for their projects"
    ON project_phase_assignments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM project_phases ph
            JOIN projects p ON p.id = ph.project_id
            JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
            WHERE ph.id = project_phase_assignments.phase_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('owner', 'admin', 'member')
        )
    );

-- -----------------------------------------------------------------------------
-- RLS for project_templates
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view their workspace templates and public templates"
    ON project_templates FOR SELECT
    USING (
        is_public = TRUE
        OR workspace_id IS NULL
        OR EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = project_templates.workspace_id
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create templates in their workspaces"
    ON project_templates FOR INSERT
    WITH CHECK (
        workspace_id IS NULL  -- Global templates (admin only in practice)
        OR EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = project_templates.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('owner', 'admin', 'member')
        )
    );

CREATE POLICY "Users can update their own templates"
    ON project_templates FOR UPDATE
    USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = project_templates.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Users can delete their own templates"
    ON project_templates FOR DELETE
    USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = project_templates.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('owner', 'admin')
        )
    );

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to check if a phase can be started (all blockers completed)
CREATE OR REPLACE FUNCTION can_start_phase(p_phase_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_blocked_by UUID[];
    v_blocker_id UUID;
    v_blocker_status TEXT;
BEGIN
    -- Get the blocked_by array for this phase
    SELECT blocked_by INTO v_blocked_by
    FROM project_phases
    WHERE id = p_phase_id;

    -- If no blockers, can start
    IF v_blocked_by IS NULL OR array_length(v_blocked_by, 1) IS NULL THEN
        RETURN TRUE;
    END IF;

    -- Check each blocker
    FOREACH v_blocker_id IN ARRAY v_blocked_by
    LOOP
        SELECT status INTO v_blocker_status
        FROM project_phases
        WHERE id = v_blocker_id;

        IF v_blocker_status IS NULL OR v_blocker_status != 'completed' THEN
            RETURN FALSE;
        END IF;
    END LOOP;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get blocking phases (phases this one is waiting on)
CREATE OR REPLACE FUNCTION get_blocking_phases(p_phase_id UUID)
RETURNS TABLE (
    id UUID,
    title TEXT,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT ph.id, ph.title, ph.status
    FROM project_phases ph
    WHERE ph.id = ANY(
        SELECT unnest(blocked_by)
        FROM project_phases
        WHERE project_phases.id = p_phase_id
    )
    AND ph.status != 'completed';
END;
$$ LANGUAGE plpgsql;

-- Function to get phases blocked by this one
CREATE OR REPLACE FUNCTION get_blocked_phases(p_phase_id UUID)
RETURNS TABLE (
    id UUID,
    title TEXT,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT ph.id, ph.title, ph.status
    FROM project_phases ph
    WHERE p_phase_id = ANY(ph.blocked_by);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- ENABLE REALTIME
-- =============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE project_phases;
ALTER PUBLICATION supabase_realtime ADD TABLE project_workstreams;
ALTER PUBLICATION supabase_realtime ADD TABLE project_deliverables;

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON TABLE project_phases IS 'Sequential project phases with blocking logic - shared across all workstreams';
COMMENT ON COLUMN project_phases.blocked_by IS 'Array of phase IDs that must be completed before this phase can start';
COMMENT ON COLUMN project_phases.assigned_role IS 'Primary role responsible for this phase (e.g., Business Analyst)';

COMMENT ON TABLE project_workstreams IS 'Parallel organizational tracks within a project (e.g., Mote, FUNDMAR)';
COMMENT ON COLUMN project_workstreams.color IS 'Tailwind CSS color class for visual differentiation';

COMMENT ON TABLE project_deliverables IS 'Named artifacts to be produced within a phase';
COMMENT ON COLUMN project_deliverables.workstream_id IS 'If NULL, deliverable is shared across all workstreams';
COMMENT ON COLUMN project_deliverables.file_path IS 'Expected file path for the deliverable (e.g., /docs/PRD.md)';

COMMENT ON TABLE project_roles IS 'Project-specific roles that can be assigned to phases';
COMMENT ON COLUMN project_roles.is_ai_agent IS 'Whether this role represents an AI agent rather than a human';

COMMENT ON TABLE project_phase_assignments IS 'Links roles or users to phases with assignment type';

COMMENT ON TABLE project_templates IS 'Reusable templates that define phase and deliverable structures';
COMMENT ON COLUMN project_templates.phase_definitions IS 'JSON array defining phases with their deliverables and blocking relationships';
COMMENT ON COLUMN project_templates.role_definitions IS 'JSON array defining roles to be created when template is applied';

COMMENT ON FUNCTION can_start_phase IS 'Returns TRUE if all blocking phases are completed';
COMMENT ON FUNCTION get_blocking_phases IS 'Returns phases that are blocking this phase (not yet completed)';
COMMENT ON FUNCTION get_blocked_phases IS 'Returns phases that are waiting on this phase to complete';
