-- Migration: Task Templates for Academic Workflows
-- Enables reusable task templates with default categories, priorities, and subtasks

-- =============================================================================
-- NEW TABLE: task_templates
-- =============================================================================

CREATE TABLE IF NOT EXISTS task_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    default_category TEXT,
    default_priority TEXT DEFAULT 'p3',
    default_assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    subtasks JSONB DEFAULT '[]'::jsonb,
    is_shared BOOLEAN DEFAULT TRUE,
    is_builtin BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT valid_template_priority CHECK (default_priority IN ('p1', 'p2', 'p3', 'p4')),
    CONSTRAINT valid_template_category CHECK (
        default_category IS NULL OR default_category IN (
            'research', 'teaching', 'grants', 'grad-mentorship',
            'undergrad-mentorship', 'admin', 'misc',
            'meeting', 'analysis', 'submission', 'revision',
            'presentation', 'writing', 'reading', 'coursework'
        )
    )
);

-- Indexes
CREATE INDEX idx_task_templates_workspace ON task_templates(workspace_id);
CREATE INDEX idx_task_templates_created_by ON task_templates(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_task_templates_builtin ON task_templates(is_builtin) WHERE is_builtin = TRUE;
CREATE INDEX idx_task_templates_shared ON task_templates(workspace_id, is_shared) WHERE is_shared = TRUE;

-- Updated_at trigger
CREATE TRIGGER update_task_templates_updated_at
    BEFORE UPDATE ON task_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;

-- Users can view templates in their workspace (shared or their own)
CREATE POLICY "Users can view workspace task templates"
    ON task_templates FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = task_templates.workspace_id
            AND wm.user_id = auth.uid()
        )
        AND (
            is_shared = TRUE
            OR is_builtin = TRUE
            OR created_by = auth.uid()
        )
    );

-- Users can create templates in their workspace
CREATE POLICY "Users can create task templates"
    ON task_templates FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = task_templates.workspace_id
            AND wm.user_id = auth.uid()
        )
    );

-- Users can update their own templates or builtin if admin/owner
CREATE POLICY "Users can update their own task templates"
    ON task_templates FOR UPDATE
    USING (
        created_by = auth.uid()
        OR (
            is_builtin = TRUE
            AND EXISTS (
                SELECT 1 FROM workspace_members wm
                WHERE wm.workspace_id = task_templates.workspace_id
                AND wm.user_id = auth.uid()
                AND wm.role IN ('owner', 'admin')
            )
        )
    );

-- Users can delete their own templates or builtin if admin/owner
CREATE POLICY "Users can delete their own task templates"
    ON task_templates FOR DELETE
    USING (
        created_by = auth.uid()
        OR (
            is_builtin = TRUE
            AND EXISTS (
                SELECT 1 FROM workspace_members wm
                WHERE wm.workspace_id = task_templates.workspace_id
                AND wm.user_id = auth.uid()
                AND wm.role IN ('owner', 'admin')
            )
        )
    );

-- =============================================================================
-- SEED: 10 Built-in Academic Task Templates
-- These are inserted per-workspace via a function, not as static seeds.
-- The API route will create built-in templates lazily when a workspace
-- first requests templates and none exist.
-- =============================================================================

-- Function to seed built-in templates for a workspace
CREATE OR REPLACE FUNCTION seed_builtin_task_templates(p_workspace_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Only seed if no built-in templates exist for this workspace
    IF EXISTS (SELECT 1 FROM task_templates WHERE workspace_id = p_workspace_id AND is_builtin = TRUE LIMIT 1) THEN
        RETURN;
    END IF;

    INSERT INTO task_templates (workspace_id, name, description, default_category, default_priority, subtasks, is_shared, is_builtin) VALUES
    -- 1. Literature Review
    (p_workspace_id, 'Literature Review', 'Systematic review of literature on a research topic', 'research', 'p3',
     '[{"text":"Search databases for relevant papers","priority":"p3","estimated_minutes":60},{"text":"Read and annotate key articles","priority":"p3","estimated_minutes":90},{"text":"Identify themes and gaps","priority":"p2","estimated_minutes":45},{"text":"Write synthesis summary","priority":"p2","estimated_minutes":60}]'::jsonb,
     TRUE, TRUE),

    -- 2. Data Analysis
    (p_workspace_id, 'Data Analysis', 'Statistical analysis of research data', 'analysis', 'p3',
     '[{"text":"Clean and prepare data","priority":"p3","estimated_minutes":45},{"text":"Run statistical analyses","priority":"p2","estimated_minutes":60},{"text":"Create visualizations and figures","priority":"p3","estimated_minutes":45},{"text":"Document results and interpretations","priority":"p2","estimated_minutes":30}]'::jsonb,
     TRUE, TRUE),

    -- 3. Manuscript Writing
    (p_workspace_id, 'Manuscript Writing', 'Draft a manuscript section or full paper', 'writing', 'p2',
     '[{"text":"Create outline and structure","priority":"p3","estimated_minutes":30},{"text":"Write first draft","priority":"p1","estimated_minutes":120},{"text":"Add citations and references","priority":"p3","estimated_minutes":45},{"text":"Revise and edit","priority":"p2","estimated_minutes":60}]'::jsonb,
     TRUE, TRUE),

    -- 4. Grant Proposal
    (p_workspace_id, 'Grant Proposal', 'Prepare a grant application', 'grants', 'p1',
     '[{"text":"Review funding opportunity and requirements","priority":"p2","estimated_minutes":30},{"text":"Draft specific aims and significance","priority":"p1","estimated_minutes":90},{"text":"Write research plan and methodology","priority":"p1","estimated_minutes":120},{"text":"Prepare budget and justification","priority":"p2","estimated_minutes":60},{"text":"Collect letters of support","priority":"p3","estimated_minutes":30}]'::jsonb,
     TRUE, TRUE),

    -- 5. Conference Submission
    (p_workspace_id, 'Conference Submission', 'Prepare and submit a conference paper or abstract', 'submission', 'p1',
     '[{"text":"Review submission guidelines","priority":"p2","estimated_minutes":20},{"text":"Format manuscript according to requirements","priority":"p2","estimated_minutes":60},{"text":"Prepare supplementary materials","priority":"p3","estimated_minutes":45},{"text":"Complete submission form and upload","priority":"p1","estimated_minutes":30},{"text":"Verify submission receipt","priority":"p2","estimated_minutes":5}]'::jsonb,
     TRUE, TRUE),

    -- 6. Thesis Chapter
    (p_workspace_id, 'Thesis Chapter', 'Write or revise a thesis/dissertation chapter', 'writing', 'p2',
     '[{"text":"Review chapter outline and advisor feedback","priority":"p2","estimated_minutes":30},{"text":"Write or revise chapter content","priority":"p1","estimated_minutes":180},{"text":"Add figures, tables, and references","priority":"p3","estimated_minutes":60},{"text":"Proofread and format","priority":"p3","estimated_minutes":45},{"text":"Send to advisor for review","priority":"p2","estimated_minutes":10}]'::jsonb,
     TRUE, TRUE),

    -- 7. Lab Meeting Prep
    (p_workspace_id, 'Lab Meeting Prep', 'Prepare materials for a lab or research group meeting', 'meeting', 'p2',
     '[{"text":"Prepare agenda and talking points","priority":"p2","estimated_minutes":20},{"text":"Review previous meeting notes","priority":"p3","estimated_minutes":10},{"text":"Prepare progress update slides or materials","priority":"p2","estimated_minutes":30},{"text":"Document action items after meeting","priority":"p2","estimated_minutes":15}]'::jsonb,
     TRUE, TRUE),

    -- 8. IRB Submission
    (p_workspace_id, 'IRB Submission', 'Prepare and submit an IRB protocol or amendment', 'admin', 'p2',
     '[{"text":"Gather required documents and forms","priority":"p2","estimated_minutes":30},{"text":"Draft protocol narrative","priority":"p1","estimated_minutes":90},{"text":"Prepare consent forms","priority":"p2","estimated_minutes":60},{"text":"Complete IRB application forms","priority":"p2","estimated_minutes":45},{"text":"Get PI signature and submit","priority":"p2","estimated_minutes":15}]'::jsonb,
     TRUE, TRUE),

    -- 9. Peer Review
    (p_workspace_id, 'Peer Review', 'Review a manuscript for a journal or conference', 'revision', 'p2',
     '[{"text":"First pass: skim for main ideas and structure","priority":"p3","estimated_minutes":30},{"text":"Detailed reading with notes","priority":"p2","estimated_minutes":90},{"text":"Evaluate methodology and results","priority":"p2","estimated_minutes":45},{"text":"Write constructive review comments","priority":"p1","estimated_minutes":60},{"text":"Submit review through portal","priority":"p2","estimated_minutes":10}]'::jsonb,
     TRUE, TRUE),

    -- 10. Course Prep
    (p_workspace_id, 'Course Prep', 'Prepare materials for a course lecture or session', 'teaching', 'p2',
     '[{"text":"Review syllabus and learning objectives","priority":"p3","estimated_minutes":15},{"text":"Prepare lecture slides or materials","priority":"p2","estimated_minutes":60},{"text":"Create or update assignments/activities","priority":"p3","estimated_minutes":45},{"text":"Review and update grading rubrics","priority":"p3","estimated_minutes":20},{"text":"Upload materials to LMS","priority":"p3","estimated_minutes":10}]'::jsonb,
     TRUE, TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
