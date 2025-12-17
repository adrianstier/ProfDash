-- ScholarOS Initial Schema
-- This migration creates the core tables for the academic productivity dashboard

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- PROFILES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  institution TEXT,
  department TEXT,
  title TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =============================================================================
-- WORKSPACES TABLE (for multi-tenancy)
-- =============================================================================
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- WORKSPACE MEMBERS TABLE
-- =============================================================================
CREATE TYPE workspace_role AS ENUM ('owner', 'admin', 'member', 'limited');

CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role workspace_role NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(workspace_id, user_id)
);

-- Enable RLS
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Workspace policies (users can only see workspaces they're members of)
CREATE POLICY "Users can view workspaces they belong to"
  ON workspaces FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspaces.id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and admins can update workspaces"
  ON workspaces FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspaces.id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin')
    )
  );

-- Workspace members policies
CREATE POLICY "Users can view members of their workspaces"
  ON workspace_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- =============================================================================
-- TASKS TABLE
-- =============================================================================
CREATE TYPE task_priority AS ENUM ('p1', 'p2', 'p3', 'p4');
CREATE TYPE task_status AS ENUM ('todo', 'progress', 'done');
CREATE TYPE task_category AS ENUM (
  'research',
  'teaching',
  'grants',
  'grad-mentorship',
  'undergrad-mentorship',
  'admin',
  'misc'
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category task_category NOT NULL DEFAULT 'misc',
  priority task_priority NOT NULL DEFAULT 'p3',
  status task_status NOT NULL DEFAULT 'todo',
  due DATE,
  project_id UUID,
  assignees UUID[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for common queries
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_workspace_id ON tasks(workspace_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due ON tasks(due);
CREATE INDEX idx_tasks_category ON tasks(category);
CREATE INDEX idx_tasks_priority ON tasks(priority);

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Task policies
CREATE POLICY "Users can view their own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- PROJECTS TABLE
-- =============================================================================
CREATE TYPE project_type AS ENUM ('manuscript', 'grant', 'general');
CREATE TYPE project_status AS ENUM ('active', 'archived', 'completed');

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type project_type NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  summary TEXT,
  status project_status NOT NULL DEFAULT 'active',
  stage TEXT, -- Flexible stage field for different project types
  due_date DATE,
  owner_id UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX idx_projects_workspace_id ON projects(workspace_id);
CREATE INDEX idx_projects_type ON projects(type);
CREATE INDEX idx_projects_status ON projects(status);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Project policies (workspace-based access)
CREATE POLICY "Users can view projects in their workspaces"
  ON projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = projects.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create projects in their workspaces"
  ON projects FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = projects.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update projects in their workspaces"
  ON projects FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = projects.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

-- Add foreign key from tasks to projects
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_project
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;

-- =============================================================================
-- PERSONNEL TABLE
-- =============================================================================
CREATE TYPE personnel_role AS ENUM (
  'phd-student',
  'postdoc',
  'undergrad',
  'staff',
  'collaborator'
);

CREATE TABLE IF NOT EXISTS personnel (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role personnel_role NOT NULL,
  year INTEGER,
  funding TEXT,
  email TEXT,
  last_meeting DATE,
  milestones JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX idx_personnel_user_id ON personnel(user_id);
CREATE INDEX idx_personnel_workspace_id ON personnel(workspace_id);
CREATE INDEX idx_personnel_role ON personnel(role);

-- Enable RLS
ALTER TABLE personnel ENABLE ROW LEVEL SECURITY;

-- Personnel policies
CREATE POLICY "Users can view their own personnel"
  ON personnel FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own personnel"
  ON personnel FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own personnel"
  ON personnel FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own personnel"
  ON personnel FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- FUNDING OPPORTUNITIES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS funding_opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id TEXT,
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  agency TEXT,
  mechanism TEXT,
  deadline DATE,
  amount_min INTEGER,
  amount_max INTEGER,
  eligibility JSONB DEFAULT '{}',
  description TEXT,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX idx_funding_opportunities_source ON funding_opportunities(source);
CREATE INDEX idx_funding_opportunities_deadline ON funding_opportunities(deadline);
CREATE INDEX idx_funding_opportunities_agency ON funding_opportunities(agency);

-- Enable RLS (public read access for now)
ALTER TABLE funding_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view funding opportunities"
  ON funding_opportunities FOR SELECT
  TO authenticated
  USING (true);

-- =============================================================================
-- CALENDAR EVENTS TABLE (for synced events)
-- =============================================================================
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  calendar_id TEXT,
  summary TEXT,
  description TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT FALSE,
  synced_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, external_id)
);

-- Create indexes
CREATE INDEX idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX idx_calendar_events_start_time ON calendar_events(start_time);

-- Enable RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own calendar events"
  ON calendar_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own calendar events"
  ON calendar_events FOR ALL
  USING (auth.uid() = user_id);

-- =============================================================================
-- TRIGGER: Auto-update updated_at timestamp
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_personnel_updated_at
  BEFORE UPDATE ON personnel
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_funding_opportunities_updated_at
  BEFORE UPDATE ON funding_opportunities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TRIGGER: Auto-create profile on user signup
-- =============================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================================================
-- TRIGGER: Auto-set completed_at when task status changes to done
-- =============================================================================
CREATE OR REPLACE FUNCTION handle_task_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'done' AND OLD.status != 'done' THEN
    NEW.completed_at = NOW();
  ELSIF NEW.status != 'done' AND OLD.status = 'done' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_task_status_change
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION handle_task_completion();
