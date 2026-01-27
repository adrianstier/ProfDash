-- Migration: Research Projects Feature
-- Enables multi-experiment research project management with field sites, permits, and fieldwork scheduling

-- =============================================================================
-- PROJECT TYPE EXTENSION
-- =============================================================================

-- Add 'research' to project types (checking if type column allows it)
-- Note: projects.type is TEXT with CHECK constraint, need to update it
ALTER TABLE projects DROP CONSTRAINT IF EXISTS valid_project_type;
ALTER TABLE projects ADD CONSTRAINT valid_project_type
    CHECK (type IN ('manuscript', 'grant', 'general', 'research'));

-- =============================================================================
-- NEW TABLES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Field Sites - Workspace-level reusable field locations
-- -----------------------------------------------------------------------------
CREATE TABLE field_sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,  -- Short code e.g., "MOR", "PAL"
    location JSONB DEFAULT '{}'::jsonb,  -- {lat, lng, address, country, region}
    timezone TEXT DEFAULT 'UTC',
    description TEXT,
    logistics_notes TEXT,
    access_requirements JSONB DEFAULT '[]'::jsonb,  -- ["IACUC", "collection", "CITES"]
    contacts JSONB DEFAULT '[]'::jsonb,  -- [{name, role, email, phone}]
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT unique_site_name_per_workspace UNIQUE (workspace_id, name),
    CONSTRAINT unique_site_code_per_workspace UNIQUE (workspace_id, code)
);

-- Indexes for field_sites
CREATE INDEX idx_field_sites_workspace ON field_sites(workspace_id);
CREATE INDEX idx_field_sites_active ON field_sites(workspace_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_field_sites_code ON field_sites(workspace_id, code) WHERE code IS NOT NULL;

-- Updated_at trigger
CREATE TRIGGER update_field_sites_updated_at
    BEFORE UPDATE ON field_sites
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 2. Experiments - Children of research projects
-- -----------------------------------------------------------------------------
CREATE TABLE experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    code TEXT,  -- Short code e.g., "EXP-001"
    description TEXT,
    site_id UUID REFERENCES field_sites(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'planning',  -- planning, active, fieldwork, analysis, completed, on_hold
    lead_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    start_date DATE,
    end_date DATE,
    fieldwork_start DATE,
    fieldwork_end DATE,
    protocols JSONB DEFAULT '[]'::jsonb,  -- [{name, version, url}]
    equipment_needs JSONB DEFAULT '[]'::jsonb,  -- [{item, quantity, notes}]
    sample_targets JSONB DEFAULT '{}'::jsonb,  -- {species: count, ...}
    hypothesis TEXT,
    objectives JSONB DEFAULT '[]'::jsonb,  -- ["objective 1", "objective 2"]
    color TEXT DEFAULT 'bg-blue-500',
    sort_order INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT valid_experiment_status CHECK (
        status IN ('planning', 'active', 'fieldwork', 'analysis', 'completed', 'on_hold')
    ),
    CONSTRAINT unique_experiment_code_per_project UNIQUE (project_id, code)
);

-- Indexes for experiments
CREATE INDEX idx_experiments_project ON experiments(project_id);
CREATE INDEX idx_experiments_workspace ON experiments(workspace_id);
CREATE INDEX idx_experiments_site ON experiments(site_id) WHERE site_id IS NOT NULL;
CREATE INDEX idx_experiments_lead ON experiments(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX idx_experiments_status ON experiments(status);
CREATE INDEX idx_experiments_sort ON experiments(project_id, sort_order);
CREATE INDEX idx_experiments_fieldwork_dates ON experiments(fieldwork_start, fieldwork_end)
    WHERE fieldwork_start IS NOT NULL;

-- Updated_at trigger
CREATE TRIGGER update_experiments_updated_at
    BEFORE UPDATE ON experiments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 3. Permits - Research permits with expiration tracking
-- -----------------------------------------------------------------------------
CREATE TABLE permits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    experiment_id UUID REFERENCES experiments(id) ON DELETE SET NULL,
    site_id UUID REFERENCES field_sites(id) ON DELETE SET NULL,
    permit_type TEXT NOT NULL,  -- IACUC, IBC, collection, CITES, export, IRB, MOU, institutional, other
    permit_number TEXT,
    title TEXT NOT NULL,
    issuing_authority TEXT,
    pi_name TEXT,
    start_date DATE,
    expiration_date DATE,
    status TEXT NOT NULL DEFAULT 'pending',  -- pending, active, expired, renewal_pending, suspended
    renewal_reminder_days INTEGER DEFAULT 60,
    documents JSONB DEFAULT '[]'::jsonb,  -- [{name, url, uploaded_at}]
    notes TEXT,
    conditions TEXT,
    coverage_scope TEXT,  -- What species/activities/locations are covered
    linked_permits UUID[] DEFAULT ARRAY[]::UUID[],  -- Related permits
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT valid_permit_type CHECK (
        permit_type IN ('IACUC', 'IBC', 'collection', 'CITES', 'export', 'import', 'IRB', 'MOU', 'institutional', 'other')
    ),
    CONSTRAINT valid_permit_status CHECK (
        status IN ('pending', 'active', 'expired', 'renewal_pending', 'suspended')
    )
);

-- Indexes for permits
CREATE INDEX idx_permits_workspace ON permits(workspace_id);
CREATE INDEX idx_permits_project ON permits(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_permits_experiment ON permits(experiment_id) WHERE experiment_id IS NOT NULL;
CREATE INDEX idx_permits_site ON permits(site_id) WHERE site_id IS NOT NULL;
CREATE INDEX idx_permits_type ON permits(permit_type);
CREATE INDEX idx_permits_status ON permits(status);
CREATE INDEX idx_permits_expiration ON permits(expiration_date) WHERE expiration_date IS NOT NULL;
CREATE INDEX idx_permits_expiring_soon ON permits(expiration_date, renewal_reminder_days)
    WHERE status = 'active' AND expiration_date IS NOT NULL;

-- Updated_at trigger
CREATE TRIGGER update_permits_updated_at
    BEFORE UPDATE ON permits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 4. Experiment Team Assignments - Link personnel to experiments
-- -----------------------------------------------------------------------------
CREATE TABLE experiment_team_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    personnel_id UUID NOT NULL REFERENCES personnel(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'contributor',  -- lead, co_lead, contributor, field_assistant, data_analyst
    site_access UUID[] DEFAULT ARRAY[]::UUID[],  -- site_ids they can access for this experiment
    start_date DATE,
    end_date DATE,
    time_commitment TEXT,  -- "50%", "full-time", "as needed"
    responsibilities TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT valid_team_role CHECK (
        role IN ('lead', 'co_lead', 'contributor', 'field_assistant', 'data_analyst', 'consultant')
    ),
    CONSTRAINT unique_personnel_per_experiment UNIQUE (experiment_id, personnel_id)
);

-- Indexes for experiment_team_assignments
CREATE INDEX idx_exp_team_experiment ON experiment_team_assignments(experiment_id);
CREATE INDEX idx_exp_team_personnel ON experiment_team_assignments(personnel_id);
CREATE INDEX idx_exp_team_role ON experiment_team_assignments(role);
CREATE INDEX idx_exp_team_active ON experiment_team_assignments(experiment_id)
    WHERE end_date IS NULL OR end_date >= CURRENT_DATE;

-- Updated_at trigger
CREATE TRIGGER update_experiment_team_updated_at
    BEFORE UPDATE ON experiment_team_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 5. Fieldwork Schedules - Planned fieldwork trips
-- -----------------------------------------------------------------------------
CREATE TABLE fieldwork_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    site_id UUID REFERENCES field_sites(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'planned',  -- planned, confirmed, in_progress, completed, cancelled
    team_member_ids UUID[] DEFAULT ARRAY[]::UUID[],  -- personnel_ids participating
    objectives JSONB DEFAULT '[]'::jsonb,  -- ["Collect samples", "Deploy sensors"]
    logistics_notes TEXT,
    travel_booked BOOLEAN DEFAULT FALSE,
    accommodation_booked BOOLEAN DEFAULT FALSE,
    permits_verified BOOLEAN DEFAULT FALSE,
    equipment_checklist JSONB DEFAULT '[]'::jsonb,  -- [{item, packed, notes}]
    daily_schedule JSONB DEFAULT '[]'::jsonb,  -- [{date, activities: [...]}]
    weather_contingency TEXT,
    emergency_contacts JSONB DEFAULT '[]'::jsonb,  -- [{name, phone, role}]
    budget_estimate DECIMAL(10, 2),
    actual_cost DECIMAL(10, 2),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT valid_fieldwork_status CHECK (
        status IN ('planned', 'confirmed', 'in_progress', 'completed', 'cancelled')
    ),
    CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Indexes for fieldwork_schedules
CREATE INDEX idx_fieldwork_experiment ON fieldwork_schedules(experiment_id);
CREATE INDEX idx_fieldwork_site ON fieldwork_schedules(site_id) WHERE site_id IS NOT NULL;
CREATE INDEX idx_fieldwork_status ON fieldwork_schedules(status);
CREATE INDEX idx_fieldwork_dates ON fieldwork_schedules(start_date, end_date);
CREATE INDEX idx_fieldwork_upcoming ON fieldwork_schedules(start_date)
    WHERE status IN ('planned', 'confirmed') AND start_date >= CURRENT_DATE;

-- Updated_at trigger
CREATE TRIGGER update_fieldwork_schedules_updated_at
    BEFORE UPDATE ON fieldwork_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- MODIFICATIONS TO EXISTING TABLES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Add experiment_id to tasks for linking tasks to experiments
-- -----------------------------------------------------------------------------
ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS experiment_id UUID REFERENCES experiments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_experiment
    ON tasks(experiment_id) WHERE experiment_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- Add experiment-related activity actions
-- -----------------------------------------------------------------------------
ALTER TYPE activity_action ADD VALUE IF NOT EXISTS 'experiment_created';
ALTER TYPE activity_action ADD VALUE IF NOT EXISTS 'experiment_updated';
ALTER TYPE activity_action ADD VALUE IF NOT EXISTS 'experiment_status_changed';
ALTER TYPE activity_action ADD VALUE IF NOT EXISTS 'fieldwork_scheduled';
ALTER TYPE activity_action ADD VALUE IF NOT EXISTS 'fieldwork_completed';
ALTER TYPE activity_action ADD VALUE IF NOT EXISTS 'permit_expiring';
ALTER TYPE activity_action ADD VALUE IF NOT EXISTS 'permit_renewed';
ALTER TYPE activity_action ADD VALUE IF NOT EXISTS 'team_member_added';

-- Add experiment_id to workspace_activity
ALTER TABLE workspace_activity
    ADD COLUMN IF NOT EXISTS experiment_id UUID REFERENCES experiments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_activity_experiment
    ON workspace_activity(experiment_id) WHERE experiment_id IS NOT NULL;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on all new tables
ALTER TABLE field_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_team_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fieldwork_schedules ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- RLS for field_sites
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view sites in their workspaces"
    ON field_sites FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = field_sites.workspace_id
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage sites in their workspaces"
    ON field_sites FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = field_sites.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('owner', 'admin', 'member')
        )
    );

-- -----------------------------------------------------------------------------
-- RLS for experiments
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view experiments in their workspaces"
    ON experiments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = experiments.workspace_id
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage experiments in their workspaces"
    ON experiments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = experiments.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('owner', 'admin', 'member')
        )
    );

-- -----------------------------------------------------------------------------
-- RLS for permits
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view permits in their workspaces"
    ON permits FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = permits.workspace_id
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage permits in their workspaces"
    ON permits FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = permits.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('owner', 'admin', 'member')
        )
    );

-- -----------------------------------------------------------------------------
-- RLS for experiment_team_assignments
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view team assignments for their experiments"
    ON experiment_team_assignments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM experiments e
            JOIN workspace_members wm ON wm.workspace_id = e.workspace_id
            WHERE e.id = experiment_team_assignments.experiment_id
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage team assignments for their experiments"
    ON experiment_team_assignments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM experiments e
            JOIN workspace_members wm ON wm.workspace_id = e.workspace_id
            WHERE e.id = experiment_team_assignments.experiment_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('owner', 'admin', 'member')
        )
    );

-- -----------------------------------------------------------------------------
-- RLS for fieldwork_schedules
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view fieldwork schedules for their experiments"
    ON fieldwork_schedules FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM experiments e
            JOIN workspace_members wm ON wm.workspace_id = e.workspace_id
            WHERE e.id = fieldwork_schedules.experiment_id
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage fieldwork schedules for their experiments"
    ON fieldwork_schedules FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM experiments e
            JOIN workspace_members wm ON wm.workspace_id = e.workspace_id
            WHERE e.id = fieldwork_schedules.experiment_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('owner', 'admin', 'member')
        )
    );

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to get permits expiring within N days
CREATE OR REPLACE FUNCTION get_expiring_permits(p_workspace_id UUID, p_days INTEGER DEFAULT 60)
RETURNS TABLE (
    id UUID,
    title TEXT,
    permit_type TEXT,
    expiration_date DATE,
    days_until_expiration INTEGER,
    project_id UUID,
    experiment_id UUID,
    site_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.title,
        p.permit_type,
        p.expiration_date,
        (p.expiration_date - CURRENT_DATE)::INTEGER as days_until_expiration,
        p.project_id,
        p.experiment_id,
        p.site_id
    FROM permits p
    WHERE p.workspace_id = p_workspace_id
    AND p.status = 'active'
    AND p.expiration_date IS NOT NULL
    AND p.expiration_date <= (CURRENT_DATE + p_days)
    ORDER BY p.expiration_date ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get upcoming fieldwork
CREATE OR REPLACE FUNCTION get_upcoming_fieldwork(p_workspace_id UUID, p_days INTEGER DEFAULT 90)
RETURNS TABLE (
    id UUID,
    title TEXT,
    experiment_id UUID,
    experiment_title TEXT,
    site_id UUID,
    site_name TEXT,
    start_date DATE,
    end_date DATE,
    status TEXT,
    days_until_start INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        f.id,
        f.title,
        f.experiment_id,
        e.title as experiment_title,
        f.site_id,
        s.name as site_name,
        f.start_date,
        f.end_date,
        f.status,
        (f.start_date - CURRENT_DATE)::INTEGER as days_until_start
    FROM fieldwork_schedules f
    JOIN experiments e ON e.id = f.experiment_id
    LEFT JOIN field_sites s ON s.id = f.site_id
    WHERE e.workspace_id = p_workspace_id
    AND f.status IN ('planned', 'confirmed')
    AND f.start_date >= CURRENT_DATE
    AND f.start_date <= (CURRENT_DATE + p_days)
    ORDER BY f.start_date ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get experiment stats for a research project
CREATE OR REPLACE FUNCTION get_research_project_stats(p_project_id UUID)
RETURNS TABLE (
    total_experiments BIGINT,
    planning_count BIGINT,
    active_count BIGINT,
    fieldwork_count BIGINT,
    analysis_count BIGINT,
    completed_count BIGINT,
    on_hold_count BIGINT,
    total_team_members BIGINT,
    upcoming_fieldwork_count BIGINT,
    expiring_permits_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(e.id) as total_experiments,
        COUNT(e.id) FILTER (WHERE e.status = 'planning') as planning_count,
        COUNT(e.id) FILTER (WHERE e.status = 'active') as active_count,
        COUNT(e.id) FILTER (WHERE e.status = 'fieldwork') as fieldwork_count,
        COUNT(e.id) FILTER (WHERE e.status = 'analysis') as analysis_count,
        COUNT(e.id) FILTER (WHERE e.status = 'completed') as completed_count,
        COUNT(e.id) FILTER (WHERE e.status = 'on_hold') as on_hold_count,
        (
            SELECT COUNT(DISTINCT eta.personnel_id)
            FROM experiment_team_assignments eta
            JOIN experiments exp ON exp.id = eta.experiment_id
            WHERE exp.project_id = p_project_id
        ) as total_team_members,
        (
            SELECT COUNT(f.id)
            FROM fieldwork_schedules f
            JOIN experiments exp ON exp.id = f.experiment_id
            WHERE exp.project_id = p_project_id
            AND f.status IN ('planned', 'confirmed')
            AND f.start_date >= CURRENT_DATE
            AND f.start_date <= (CURRENT_DATE + 90)
        ) as upcoming_fieldwork_count,
        (
            SELECT COUNT(p.id)
            FROM permits p
            WHERE p.project_id = p_project_id
            AND p.status = 'active'
            AND p.expiration_date IS NOT NULL
            AND p.expiration_date <= (CURRENT_DATE + 60)
        ) as expiring_permits_count
    FROM experiments e
    WHERE e.project_id = p_project_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- ENABLE REALTIME
-- =============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE experiments;
ALTER PUBLICATION supabase_realtime ADD TABLE permits;
ALTER PUBLICATION supabase_realtime ADD TABLE fieldwork_schedules;

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON TABLE field_sites IS 'Workspace-level field research locations with logistics and access info';
COMMENT ON COLUMN field_sites.code IS 'Short code for quick reference (e.g., MOR for Moorea)';
COMMENT ON COLUMN field_sites.access_requirements IS 'Array of permit types required for site access';
COMMENT ON COLUMN field_sites.contacts IS 'Local contacts at the field site';

COMMENT ON TABLE experiments IS 'Individual experiments within a research project';
COMMENT ON COLUMN experiments.code IS 'Short experiment code (e.g., EXP-001)';
COMMENT ON COLUMN experiments.protocols IS 'Array of research protocols with versions and links';
COMMENT ON COLUMN experiments.sample_targets IS 'Target sample counts by species or type';

COMMENT ON TABLE permits IS 'Research permits with expiration tracking and renewal reminders';
COMMENT ON COLUMN permits.permit_type IS 'Type of permit: IACUC, IBC, collection, CITES, export, import, IRB, MOU, institutional, other';
COMMENT ON COLUMN permits.linked_permits IS 'UUIDs of related permits (e.g., CITES requires collection permit)';

COMMENT ON TABLE experiment_team_assignments IS 'Team member assignments to experiments with roles and site access';
COMMENT ON COLUMN experiment_team_assignments.site_access IS 'Array of field_site IDs this person can access for this experiment';

COMMENT ON TABLE fieldwork_schedules IS 'Planned fieldwork trips with logistics tracking';
COMMENT ON COLUMN fieldwork_schedules.equipment_checklist IS 'JSON array of equipment items with packing status';
COMMENT ON COLUMN fieldwork_schedules.daily_schedule IS 'JSON array of daily activity plans';

COMMENT ON FUNCTION get_expiring_permits IS 'Returns permits expiring within specified days for a workspace';
COMMENT ON FUNCTION get_upcoming_fieldwork IS 'Returns upcoming fieldwork trips within specified days for a workspace';
COMMENT ON FUNCTION get_research_project_stats IS 'Returns experiment statistics for a research project';
