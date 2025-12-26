-- Documents and AI Enhancements Migration
-- Adds document storage, AI extraction history, and enhanced grant features

-- ============================================================================
-- Documents Table - Store uploaded documents
-- ============================================================================
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- File metadata
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_path TEXT NOT NULL, -- Path in Supabase Storage
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,

    -- Processing status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,

    -- Extracted content
    extracted_text TEXT,
    page_count INTEGER,

    -- Metadata
    description TEXT,
    tags TEXT[],

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Document Extractions - AI-extracted structured data from documents
-- ============================================================================
CREATE TABLE document_extractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

    -- Extraction metadata
    extraction_type TEXT NOT NULL CHECK (extraction_type IN (
        'grant_opportunity',  -- RFP/grant announcement parsing
        'grant_application',  -- Submitted application
        'cv_resume',          -- Personnel CV parsing
        'budget',             -- Budget document
        'timeline',           -- Project timeline
        'tasks',              -- General task extraction
        'general'             -- Other structured data
    )),

    -- AI model info
    model_used TEXT NOT NULL,
    prompt_version TEXT,

    -- Extracted data (structure varies by extraction_type)
    extracted_data JSONB NOT NULL DEFAULT '{}',
    confidence_score NUMERIC(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),

    -- User review
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id),
    user_corrections JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Grant Documents - Link documents to grant opportunities
-- ============================================================================
CREATE TABLE grant_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

    -- Can be linked to either an opportunity or a watchlist item
    opportunity_id UUID REFERENCES funding_opportunities(id) ON DELETE CASCADE,
    watchlist_id UUID REFERENCES opportunity_watchlist(id) ON DELETE CASCADE,

    document_type TEXT NOT NULL CHECK (document_type IN (
        'rfp',              -- Request for proposal
        'guidelines',       -- Application guidelines
        'budget_template',  -- Budget template
        'application',      -- Submitted application
        'award_letter',     -- Award notification
        'rejection_letter', -- Rejection notification
        'progress_report',  -- Progress report
        'other'
    )),

    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure at least one reference
    CONSTRAINT grant_doc_has_reference CHECK (
        opportunity_id IS NOT NULL OR watchlist_id IS NOT NULL
    )
);

-- ============================================================================
-- Personnel Documents - Link documents to personnel (CVs, etc.)
-- ============================================================================
CREATE TABLE personnel_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    personnel_id UUID NOT NULL REFERENCES personnel(id) ON DELETE CASCADE,

    document_type TEXT NOT NULL CHECK (document_type IN (
        'cv',
        'resume',
        'biosketch',
        'publication_list',
        'reference_letter',
        'other'
    )),

    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- AI Chat History - Track AI interactions for context
-- ============================================================================
CREATE TABLE ai_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Context
    feature TEXT NOT NULL CHECK (feature IN (
        'task_extraction',
        'grant_analysis',
        'document_parsing',
        'project_summary',
        'fit_scoring',
        'writing_assist',
        'general'
    )),

    -- Related entities (optional)
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    opportunity_id UUID REFERENCES funding_opportunities(id) ON DELETE SET NULL,

    -- Request/Response
    request_summary TEXT NOT NULL,
    response_summary TEXT,
    model_used TEXT,
    tokens_used INTEGER,

    -- User feedback
    was_helpful BOOLEAN,
    feedback_notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX idx_documents_workspace ON documents(workspace_id);
CREATE INDEX idx_documents_user ON documents(user_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_mime_type ON documents(mime_type);
CREATE INDEX idx_document_extractions_document ON document_extractions(document_id);
CREATE INDEX idx_document_extractions_type ON document_extractions(extraction_type);
CREATE INDEX idx_grant_documents_opportunity ON grant_documents(opportunity_id);
CREATE INDEX idx_grant_documents_watchlist ON grant_documents(watchlist_id);
CREATE INDEX idx_personnel_documents_personnel ON personnel_documents(personnel_id);
CREATE INDEX idx_ai_interactions_workspace ON ai_interactions(workspace_id);
CREATE INDEX idx_ai_interactions_feature ON ai_interactions(feature);

-- ============================================================================
-- Updated At Triggers
-- ============================================================================
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE grant_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE personnel_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interactions ENABLE ROW LEVEL SECURITY;

-- Documents policies
CREATE POLICY "Users can view own documents"
    ON documents FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view workspace documents"
    ON documents FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create documents"
    ON documents FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
    ON documents FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
    ON documents FOR DELETE
    USING (auth.uid() = user_id);

-- Document extractions policies
CREATE POLICY "Users can view extractions for their documents"
    ON document_extractions FOR SELECT
    USING (
        document_id IN (
            SELECT id FROM documents
            WHERE user_id = auth.uid()
            OR workspace_id IN (
                SELECT workspace_id FROM workspace_members
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can create extractions for their documents"
    ON document_extractions FOR INSERT
    WITH CHECK (
        document_id IN (
            SELECT id FROM documents WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update extractions for their documents"
    ON document_extractions FOR UPDATE
    USING (
        document_id IN (
            SELECT id FROM documents WHERE user_id = auth.uid()
        )
    );

-- Grant documents policies
CREATE POLICY "Users can view grant documents in their workspace"
    ON grant_documents FOR SELECT
    USING (
        document_id IN (
            SELECT id FROM documents
            WHERE user_id = auth.uid()
            OR workspace_id IN (
                SELECT workspace_id FROM workspace_members
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can manage grant documents for their documents"
    ON grant_documents FOR ALL
    USING (
        document_id IN (
            SELECT id FROM documents WHERE user_id = auth.uid()
        )
    );

-- Personnel documents policies
CREATE POLICY "Users can view personnel documents in their workspace"
    ON personnel_documents FOR SELECT
    USING (
        document_id IN (
            SELECT id FROM documents
            WHERE user_id = auth.uid()
            OR workspace_id IN (
                SELECT workspace_id FROM workspace_members
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can manage personnel documents for their documents"
    ON personnel_documents FOR ALL
    USING (
        document_id IN (
            SELECT id FROM documents WHERE user_id = auth.uid()
        )
    );

-- AI interactions policies
CREATE POLICY "Users can view own AI interactions"
    ON ai_interactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create AI interactions"
    ON ai_interactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own AI interactions"
    ON ai_interactions FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================================================
-- Storage bucket (needs to be created via Supabase dashboard or CLI)
-- This is a reminder comment - actual bucket creation is done separately
-- ============================================================================
-- Bucket: documents
-- Public: false
-- File size limit: 50MB
-- Allowed MIME types: application/pdf, application/msword,
--   application/vnd.openxmlformats-officedocument.wordprocessingml.document,
--   text/plain, image/png, image/jpeg
