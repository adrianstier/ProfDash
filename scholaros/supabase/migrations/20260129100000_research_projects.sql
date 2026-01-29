-- Migration: Research Projects Infrastructure
-- Version: 1.0.0
-- Created: January 29, 2026
-- Purpose: Add tables for multi-experiment research projects with field sites,
--          experiments, permits, team assignments, and fieldwork scheduling.

-- ============================================================================
-- Add 'research' to project_type enum if not exists
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'research'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'project_type')
  ) THEN
    ALTER TYPE project_type ADD VALUE 'research';
  END IF;
END $$;

-- ============================================================================
-- Field Sites Table (workspace-level, reusable across projects)
-- ============================================================================

CREATE TABLE IF NOT EXISTS field_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,  -- Short code e.g., "MOR", "PAL"
  location JSONB DEFAULT '{}',  -- {lat, lng, address, country, region}
  timezone TEXT DEFAULT 'UTC',
  description TEXT,
  logistics_notes TEXT,
  access_requirements JSONB DEFAULT '[]',  -- ["IACUC", "collection_permit", "export_permit"]
  contacts JSONB DEFAULT '[]',  -- [{name, role, email, phone, organization}]
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for workspace queries
CREATE INDEX IF NOT EXISTS idx_field_sites_workspace ON field_sites(workspace_id);
CREATE INDEX IF NOT EXISTS idx_field_sites_active ON field_sites(workspace_id, is_active);

-- ============================================================================
-- Experiments Table (children of research projects)
-- ============================================================================

CREATE TABLE IF NOT EXISTS experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  code TEXT,  -- Short code e.g., "EXP-001"
  description TEXT,
  site_id UUID REFERENCES field_sites(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'planning' CHECK (status IN (
    'planning', 'active', 'fieldwork', 'analysis', 'completed', 'on_hold', 'cancelled'
  )),
  lead_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  start_date DATE,
  end_date DATE,
  fieldwork_start DATE,
  fieldwork_end DATE,
  protocols JSONB DEFAULT '[]',  -- [{name, version, url, description}]
  equipment_needs JSONB DEFAULT '[]',  -- [{item, quantity, status, notes}]
  sample_targets JSONB DEFAULT '{}',  -- {species: count, total: count, etc.}
  color TEXT DEFAULT '#3b82f6',  -- For UI display
  sort_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_experiments_project ON experiments(project_id);
CREATE INDEX IF NOT EXISTS idx_experiments_workspace ON experiments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_experiments_site ON experiments(site_id);
CREATE INDEX IF NOT EXISTS idx_experiments_lead ON experiments(lead_id);
CREATE INDEX IF NOT EXISTS idx_experiments_status ON experiments(project_id, status);

-- ============================================================================
-- Permits Table (can link to project, experiment, or site)
-- ============================================================================

CREATE TABLE IF NOT EXISTS permits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  experiment_id UUID REFERENCES experiments(id) ON DELETE SET NULL,
  site_id UUID REFERENCES field_sites(id) ON DELETE SET NULL,
  permit_type TEXT NOT NULL CHECK (permit_type IN (
    'IACUC', 'IBC', 'IRB', 'collection', 'export', 'import', 'CITES', 'MOU', 'land_access', 'other'
  )),
  permit_number TEXT,
  title TEXT NOT NULL,
  issuing_authority TEXT,
  pi_name TEXT,
  start_date DATE,
  expiration_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'submitted', 'active', 'expired', 'renewal_pending', 'rejected', 'revoked'
  )),
  renewal_reminder_days INTEGER DEFAULT 60,
  documents JSONB DEFAULT '[]',  -- [{name, url, uploaded_at, type}]
  notes TEXT,
  conditions TEXT,
  covered_species JSONB DEFAULT '[]',  -- For collection permits
  covered_activities JSONB DEFAULT '[]',  -- ["capture", "sample", "tag", etc.]
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_permits_workspace ON permits(workspace_id);
CREATE INDEX IF NOT EXISTS idx_permits_project ON permits(project_id);
CREATE INDEX IF NOT EXISTS idx_permits_experiment ON permits(experiment_id);
CREATE INDEX IF NOT EXISTS idx_permits_site ON permits(site_id);
CREATE INDEX IF NOT EXISTS idx_permits_expiration ON permits(expiration_date);
CREATE INDEX IF NOT EXISTS idx_permits_status ON permits(workspace_id, status);

-- ============================================================================
-- Experiment Team Assignments
-- ============================================================================

CREATE TABLE IF NOT EXISTS experiment_team_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'contributor' CHECK (role IN (
    'lead', 'co_lead', 'contributor', 'field_assistant', 'analyst', 'advisor'
  )),
  responsibilities TEXT,
  site_access UUID[] DEFAULT '{}',  -- Array of site_ids they can access
  start_date DATE,
  end_date DATE,
  time_commitment TEXT,  -- e.g., "50%", "full-time", "as needed"
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(experiment_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_experiment_team_experiment ON experiment_team_assignments(experiment_id);
CREATE INDEX IF NOT EXISTS idx_experiment_team_user ON experiment_team_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_experiment_team_workspace ON experiment_team_assignments(workspace_id);

-- ============================================================================
-- Fieldwork Schedules
-- ============================================================================

CREATE TABLE IF NOT EXISTS fieldwork_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  site_id UUID REFERENCES field_sites(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'planned' CHECK (status IN (
    'planned', 'confirmed', 'in_progress', 'completed', 'cancelled', 'postponed'
  )),
  team_member_ids UUID[] DEFAULT '{}',
  objectives JSONB DEFAULT '[]',  -- [{objective, priority, completed}]
  logistics_notes TEXT,
  travel_booked BOOLEAN DEFAULT FALSE,
  accommodation_booked BOOLEAN DEFAULT FALSE,
  permits_verified BOOLEAN DEFAULT FALSE,
  equipment_prepared BOOLEAN DEFAULT FALSE,
  budget_approved BOOLEAN DEFAULT FALSE,
  estimated_cost DECIMAL(10, 2),
  actual_cost DECIMAL(10, 2),
  weather_contingency TEXT,
  emergency_contacts JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fieldwork_experiment ON fieldwork_schedules(experiment_id);
CREATE INDEX IF NOT EXISTS idx_fieldwork_site ON fieldwork_schedules(site_id);
CREATE INDEX IF NOT EXISTS idx_fieldwork_dates ON fieldwork_schedules(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_fieldwork_status ON fieldwork_schedules(workspace_id, status);

-- ============================================================================
-- Add experiment_id to tasks table for linking tasks to experiments
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'experiment_id'
  ) THEN
    ALTER TABLE tasks ADD COLUMN experiment_id UUID REFERENCES experiments(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_tasks_experiment ON tasks(experiment_id);
  END IF;
END $$;

-- ============================================================================
-- Updated timestamp triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS update_field_sites_updated_at ON field_sites;
CREATE TRIGGER update_field_sites_updated_at
  BEFORE UPDATE ON field_sites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_experiments_updated_at ON experiments;
CREATE TRIGGER update_experiments_updated_at
  BEFORE UPDATE ON experiments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_permits_updated_at ON permits;
CREATE TRIGGER update_permits_updated_at
  BEFORE UPDATE ON permits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_experiment_team_updated_at ON experiment_team_assignments;
CREATE TRIGGER update_experiment_team_updated_at
  BEFORE UPDATE ON experiment_team_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_fieldwork_updated_at ON fieldwork_schedules;
CREATE TRIGGER update_fieldwork_updated_at
  BEFORE UPDATE ON fieldwork_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Row Level Security Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE field_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_team_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fieldwork_schedules ENABLE ROW LEVEL SECURITY;

-- Field Sites Policies
CREATE POLICY "Users can view field sites in their workspaces" ON field_sites
  FOR SELECT USING (workspace_id IN (SELECT get_user_workspace_ids()));

CREATE POLICY "Users can create field sites in their workspaces" ON field_sites
  FOR INSERT WITH CHECK (workspace_id IN (SELECT get_user_workspace_ids()));

CREATE POLICY "Users can update field sites in their workspaces" ON field_sites
  FOR UPDATE USING (workspace_id IN (SELECT get_user_workspace_ids()));

CREATE POLICY "Admins can delete field sites" ON field_sites
  FOR DELETE USING (user_has_workspace_role(workspace_id, ARRAY['owner', 'admin']));

-- Experiments Policies
CREATE POLICY "Users can view experiments in their workspaces" ON experiments
  FOR SELECT USING (workspace_id IN (SELECT get_user_workspace_ids()));

CREATE POLICY "Users can create experiments in their workspaces" ON experiments
  FOR INSERT WITH CHECK (workspace_id IN (SELECT get_user_workspace_ids()));

CREATE POLICY "Users can update experiments in their workspaces" ON experiments
  FOR UPDATE USING (workspace_id IN (SELECT get_user_workspace_ids()));

CREATE POLICY "Admins can delete experiments" ON experiments
  FOR DELETE USING (user_has_workspace_role(workspace_id, ARRAY['owner', 'admin']));

-- Permits Policies
CREATE POLICY "Users can view permits in their workspaces" ON permits
  FOR SELECT USING (workspace_id IN (SELECT get_user_workspace_ids()));

CREATE POLICY "Users can create permits in their workspaces" ON permits
  FOR INSERT WITH CHECK (workspace_id IN (SELECT get_user_workspace_ids()));

CREATE POLICY "Users can update permits in their workspaces" ON permits
  FOR UPDATE USING (workspace_id IN (SELECT get_user_workspace_ids()));

CREATE POLICY "Admins can delete permits" ON permits
  FOR DELETE USING (user_has_workspace_role(workspace_id, ARRAY['owner', 'admin']));

-- Experiment Team Assignments Policies
CREATE POLICY "Users can view team assignments in their workspaces" ON experiment_team_assignments
  FOR SELECT USING (workspace_id IN (SELECT get_user_workspace_ids()));

CREATE POLICY "Users can create team assignments in their workspaces" ON experiment_team_assignments
  FOR INSERT WITH CHECK (workspace_id IN (SELECT get_user_workspace_ids()));

CREATE POLICY "Users can update team assignments in their workspaces" ON experiment_team_assignments
  FOR UPDATE USING (workspace_id IN (SELECT get_user_workspace_ids()));

CREATE POLICY "Admins can delete team assignments" ON experiment_team_assignments
  FOR DELETE USING (user_has_workspace_role(workspace_id, ARRAY['owner', 'admin']));

-- Fieldwork Schedules Policies
CREATE POLICY "Users can view fieldwork in their workspaces" ON fieldwork_schedules
  FOR SELECT USING (workspace_id IN (SELECT get_user_workspace_ids()));

CREATE POLICY "Users can create fieldwork in their workspaces" ON fieldwork_schedules
  FOR INSERT WITH CHECK (workspace_id IN (SELECT get_user_workspace_ids()));

CREATE POLICY "Users can update fieldwork in their workspaces" ON fieldwork_schedules
  FOR UPDATE USING (workspace_id IN (SELECT get_user_workspace_ids()));

CREATE POLICY "Admins can delete fieldwork" ON fieldwork_schedules
  FOR DELETE USING (user_has_workspace_role(workspace_id, ARRAY['owner', 'admin']));

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE field_sites IS 'Workspace-level field sites that can be shared across research projects';
COMMENT ON TABLE experiments IS 'Individual experiments within research projects';
COMMENT ON TABLE permits IS 'Permits and compliance documents for research activities';
COMMENT ON TABLE experiment_team_assignments IS 'Team member assignments to specific experiments';
COMMENT ON TABLE fieldwork_schedules IS 'Scheduled fieldwork trips for experiments';
