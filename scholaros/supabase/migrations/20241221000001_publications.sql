-- ScholarOS Publications Schema
-- Tracks academic publications through the research pipeline

-- =============================================================================
-- PUBLICATION STATUS ENUM
-- =============================================================================
CREATE TYPE publication_status AS ENUM (
  'idea',
  'drafting',
  'internal-review',
  'submitted',
  'under-review',
  'revision',
  'accepted',
  'in-press',
  'published'
);

-- =============================================================================
-- PUBLICATION TYPE ENUM
-- =============================================================================
CREATE TYPE publication_type AS ENUM (
  'journal-article',
  'conference-paper',
  'book-chapter',
  'book',
  'preprint',
  'thesis',
  'report',
  'other'
);

-- =============================================================================
-- AUTHOR ROLE ENUM
-- =============================================================================
CREATE TYPE author_role AS ENUM (
  'first',
  'corresponding',
  'co-first',
  'middle',
  'last',
  'senior'
);

-- =============================================================================
-- PUBLICATIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS publications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic info
  title TEXT NOT NULL,
  abstract TEXT,
  publication_type publication_type NOT NULL DEFAULT 'journal-article',
  status publication_status NOT NULL DEFAULT 'idea',

  -- Publication details
  journal TEXT,
  volume TEXT,
  issue TEXT,
  pages TEXT,
  year INTEGER,
  doi TEXT,
  url TEXT,

  -- Identifiers
  pmid TEXT, -- PubMed ID
  arxiv_id TEXT,
  orcid_work_id TEXT,

  -- Submission tracking
  submitted_at DATE,
  accepted_at DATE,
  published_at DATE,

  -- Target journal info (for submissions)
  target_journal TEXT,
  target_deadline DATE,

  -- Keywords and classification
  keywords TEXT[] DEFAULT '{}',

  -- Citation data (imported from DOI)
  citation_count INTEGER DEFAULT 0,
  citation_data JSONB DEFAULT '{}',

  -- BibTeX data for import/export
  bibtex TEXT,
  bibtex_key TEXT,

  -- Notes
  notes TEXT,

  -- Metadata for AI processing
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX idx_publications_user_id ON publications(user_id);
CREATE INDEX idx_publications_workspace_id ON publications(workspace_id);
CREATE INDEX idx_publications_status ON publications(status);
CREATE INDEX idx_publications_type ON publications(publication_type);
CREATE INDEX idx_publications_year ON publications(year);
CREATE INDEX idx_publications_doi ON publications(doi);
CREATE INDEX idx_publications_pmid ON publications(pmid);

-- Enable RLS
ALTER TABLE publications ENABLE ROW LEVEL SECURITY;

-- Publication policies
CREATE POLICY "Users can view their own publications"
  ON publications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own publications"
  ON publications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own publications"
  ON publications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own publications"
  ON publications FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- PUBLICATION AUTHORS TABLE (linking publications to authors)
-- =============================================================================
CREATE TABLE IF NOT EXISTS publication_authors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  publication_id UUID NOT NULL REFERENCES publications(id) ON DELETE CASCADE,

  -- Link to personnel if internal
  personnel_id UUID REFERENCES personnel(id) ON DELETE SET NULL,

  -- Author info (for external authors or when personnel not linked)
  name TEXT NOT NULL,
  email TEXT,
  affiliation TEXT,
  orcid TEXT,

  -- Author position and role
  author_order INTEGER NOT NULL DEFAULT 1,
  author_role author_role DEFAULT 'middle',
  is_corresponding BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX idx_publication_authors_publication_id ON publication_authors(publication_id);
CREATE INDEX idx_publication_authors_personnel_id ON publication_authors(personnel_id);
CREATE INDEX idx_publication_authors_order ON publication_authors(publication_id, author_order);

-- Enable RLS
ALTER TABLE publication_authors ENABLE ROW LEVEL SECURITY;

-- Author policies (inherit from publication access)
CREATE POLICY "Users can view authors of their publications"
  ON publication_authors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM publications
      WHERE publications.id = publication_authors.publication_id
      AND publications.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage authors of their publications"
  ON publication_authors FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM publications
      WHERE publications.id = publication_authors.publication_id
      AND publications.user_id = auth.uid()
    )
  );

-- =============================================================================
-- PUBLICATION PROJECTS TABLE (linking publications to projects)
-- =============================================================================
CREATE TABLE IF NOT EXISTS publication_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  publication_id UUID NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(publication_id, project_id)
);

-- Create indexes
CREATE INDEX idx_publication_projects_publication_id ON publication_projects(publication_id);
CREATE INDEX idx_publication_projects_project_id ON publication_projects(project_id);

-- Enable RLS
ALTER TABLE publication_projects ENABLE ROW LEVEL SECURITY;

-- Publication-Project link policies
CREATE POLICY "Users can view publication-project links they own"
  ON publication_projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM publications
      WHERE publications.id = publication_projects.publication_id
      AND publications.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage publication-project links they own"
  ON publication_projects FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM publications
      WHERE publications.id = publication_projects.publication_id
      AND publications.user_id = auth.uid()
    )
  );

-- =============================================================================
-- PUBLICATION GRANTS TABLE (linking publications to grants/funding)
-- =============================================================================
CREATE TABLE IF NOT EXISTS publication_grants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  publication_id UUID NOT NULL REFERENCES publications(id) ON DELETE CASCADE,

  -- Link to grant project or watchlist entry
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  watchlist_id UUID REFERENCES opportunity_watchlist(id) ON DELETE SET NULL,

  -- Grant info (for display and acknowledgments)
  grant_number TEXT,
  agency TEXT,
  grant_title TEXT,

  -- Acknowledgment text to include in publication
  acknowledgment_text TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX idx_publication_grants_publication_id ON publication_grants(publication_id);
CREATE INDEX idx_publication_grants_project_id ON publication_grants(project_id);

-- Enable RLS
ALTER TABLE publication_grants ENABLE ROW LEVEL SECURITY;

-- Publication-Grant link policies
CREATE POLICY "Users can view publication-grant links they own"
  ON publication_grants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM publications
      WHERE publications.id = publication_grants.publication_id
      AND publications.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage publication-grant links they own"
  ON publication_grants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM publications
      WHERE publications.id = publication_grants.publication_id
      AND publications.user_id = auth.uid()
    )
  );

-- =============================================================================
-- PUBLICATION FILES TABLE (for storing manuscript drafts, figures, etc.)
-- =============================================================================
CREATE TABLE IF NOT EXISTS publication_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  publication_id UUID NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,

  -- File info
  file_type TEXT NOT NULL, -- 'manuscript', 'supplementary', 'figure', 'response', 'cover-letter'
  version INTEGER DEFAULT 1,
  label TEXT,

  -- Storage path (if not using documents table)
  storage_path TEXT,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX idx_publication_files_publication_id ON publication_files(publication_id);
CREATE INDEX idx_publication_files_document_id ON publication_files(document_id);
CREATE INDEX idx_publication_files_type ON publication_files(file_type);

-- Enable RLS
ALTER TABLE publication_files ENABLE ROW LEVEL SECURITY;

-- Publication files policies
CREATE POLICY "Users can view files of their publications"
  ON publication_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM publications
      WHERE publications.id = publication_files.publication_id
      AND publications.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage files of their publications"
  ON publication_files FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM publications
      WHERE publications.id = publication_files.publication_id
      AND publications.user_id = auth.uid()
    )
  );

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Auto-update updated_at for publications
CREATE TRIGGER update_publications_updated_at
  BEFORE UPDATE ON publications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
