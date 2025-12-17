-- Funding Opportunities Tables
-- Phase 5: External Integrations (Grants.gov)

-- Funding Opportunities (from Grants.gov and other sources)
CREATE TABLE IF NOT EXISTS funding_opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id TEXT,
  source TEXT NOT NULL DEFAULT 'grants.gov',
  title TEXT NOT NULL,
  agency TEXT,
  agency_code TEXT,
  mechanism TEXT,
  description TEXT,
  eligibility JSONB DEFAULT '{}',
  deadline DATE,
  posted_date DATE,
  amount_min DECIMAL(15, 2),
  amount_max DECIMAL(15, 2),
  award_ceiling DECIMAL(15, 2),
  award_floor DECIMAL(15, 2),
  expected_awards INTEGER,
  cfda_numbers TEXT[],
  opportunity_number TEXT,
  opportunity_status TEXT,
  funding_instrument_type TEXT,
  category_funding_activity TEXT,
  url TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(source, external_id)
);

-- Saved Searches for funding opportunities
CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  query JSONB NOT NULL,
  alert_frequency TEXT CHECK (alert_frequency IN ('daily', 'weekly', 'monthly', 'none')) DEFAULT 'none',
  last_alerted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Opportunity Watchlist (user tracking specific opportunities)
CREATE TABLE IF NOT EXISTS opportunity_watchlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  opportunity_id UUID REFERENCES funding_opportunities(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  notes TEXT,
  status TEXT DEFAULT 'watching' CHECK (status IN ('watching', 'applying', 'submitted', 'awarded', 'declined', 'archived')),
  fit_score INTEGER CHECK (fit_score >= 0 AND fit_score <= 100),
  fit_notes JSONB,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  internal_deadline DATE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(workspace_id, opportunity_id)
);

-- RLS Policies for funding_opportunities (public read, admin write)
ALTER TABLE funding_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view funding opportunities"
  ON funding_opportunities FOR SELECT
  USING (TRUE);

-- Only service role can insert/update/delete funding opportunities
-- This is handled by Edge Functions with service role key

-- RLS Policies for saved_searches
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view saved searches"
  ON saved_searches FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can create saved searches"
  ON saved_searches FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "Workspace members can update saved searches"
  ON saved_searches FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "Workspace admins can delete saved searches"
  ON saved_searches FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
    OR created_by = auth.uid()
  );

-- RLS Policies for opportunity_watchlist
ALTER TABLE opportunity_watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view watchlist"
  ON opportunity_watchlist FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can add to watchlist"
  ON opportunity_watchlist FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "Workspace members can update watchlist"
  ON opportunity_watchlist FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "Workspace members can remove from watchlist"
  ON opportunity_watchlist FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
    OR created_by = auth.uid()
  );

-- Indexes
CREATE INDEX idx_funding_opportunities_source ON funding_opportunities(source);
CREATE INDEX idx_funding_opportunities_agency ON funding_opportunities(agency);
CREATE INDEX idx_funding_opportunities_deadline ON funding_opportunities(deadline);
CREATE INDEX idx_funding_opportunities_search ON funding_opportunities USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

CREATE INDEX idx_saved_searches_workspace ON saved_searches(workspace_id);
CREATE INDEX idx_opportunity_watchlist_workspace ON opportunity_watchlist(workspace_id);
CREATE INDEX idx_opportunity_watchlist_opportunity ON opportunity_watchlist(opportunity_id);
CREATE INDEX idx_opportunity_watchlist_status ON opportunity_watchlist(workspace_id, status);

-- Triggers for updated_at
CREATE OR REPLACE TRIGGER update_funding_opportunities_updated_at
  BEFORE UPDATE ON funding_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_saved_searches_updated_at
  BEFORE UPDATE ON saved_searches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_opportunity_watchlist_updated_at
  BEFORE UPDATE ON opportunity_watchlist
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
