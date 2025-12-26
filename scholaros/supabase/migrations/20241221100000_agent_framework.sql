-- Multi-Agent Framework Database Schema
-- Provides storage for agent sessions, messages, tasks, and memory

-- =============================================================================
-- Agent Sessions
-- =============================================================================

CREATE TABLE IF NOT EXISTS agent_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_type TEXT NOT NULL CHECK (session_type IN ('chat', 'task', 'workflow')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'idle', 'completed', 'failed')),
    context JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- Agent Messages
-- =============================================================================

CREATE TABLE IF NOT EXISTS agent_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    agent_type TEXT CHECK (agent_type IN ('task', 'project', 'grant', 'research', 'calendar', 'writing', 'personnel', 'planner', 'orchestrator')),
    content TEXT NOT NULL,
    tool_calls JSONB,
    tool_results JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- Agent Tasks (Async Execution)
-- =============================================================================

CREATE TABLE IF NOT EXISTS agent_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES agent_sessions(id) ON DELETE SET NULL,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    agent_type TEXT NOT NULL CHECK (agent_type IN ('task', 'project', 'grant', 'research', 'calendar', 'writing', 'personnel', 'planner', 'orchestrator')),
    task_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    input JSONB NOT NULL,
    output JSONB,
    error TEXT,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- Agent Memory (Long-term Learning)
-- =============================================================================

CREATE TABLE IF NOT EXISTS agent_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    memory_type TEXT NOT NULL CHECK (memory_type IN ('preference', 'pattern', 'feedback', 'insight', 'entity', 'relationship')),
    agent_type TEXT CHECK (agent_type IN ('task', 'project', 'grant', 'research', 'calendar', 'writing', 'personnel', 'planner', 'orchestrator')),
    key TEXT NOT NULL,
    value JSONB NOT NULL,
    embedding vector(1536),
    relevance_score FLOAT DEFAULT 1.0,
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- Agent Feedback
-- =============================================================================

CREATE TABLE IF NOT EXISTS agent_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES agent_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('thumbs_up', 'thumbs_down', 'correction', 'suggestion', 'rating')),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    correction TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- Agent Metrics (Monitoring)
-- =============================================================================

CREATE TABLE IF NOT EXISTS agent_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    agent_type TEXT NOT NULL CHECK (agent_type IN ('task', 'project', 'grant', 'research', 'calendar', 'writing', 'personnel', 'planner', 'orchestrator')),
    metric_type TEXT NOT NULL CHECK (metric_type IN ('request', 'response_time', 'tokens', 'error', 'feedback')),
    value FLOAT NOT NULL,
    metadata JSONB DEFAULT '{}',
    recorded_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_agent_sessions_workspace ON agent_sessions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_user ON agent_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_status ON agent_sessions(status);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_created ON agent_sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_messages_session ON agent_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_created ON agent_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_messages_agent ON agent_messages(agent_type);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_workspace ON agent_tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_user ON agent_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status) WHERE status IN ('pending', 'running');
CREATE INDEX IF NOT EXISTS idx_agent_tasks_created ON agent_tasks(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_memory_workspace ON agent_memory(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_user ON agent_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_type ON agent_memory(memory_type);
CREATE INDEX IF NOT EXISTS idx_agent_memory_key ON agent_memory(key);

-- Vector similarity search index (if pgvector is installed)
CREATE INDEX IF NOT EXISTS idx_agent_memory_embedding ON agent_memory USING ivfflat (embedding vector_cosine_ops) WHERE embedding IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agent_feedback_session ON agent_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_feedback_type ON agent_feedback(feedback_type);

CREATE INDEX IF NOT EXISTS idx_agent_metrics_workspace ON agent_metrics(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agent_metrics_agent ON agent_metrics(agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_metrics_type ON agent_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_agent_metrics_recorded ON agent_metrics(recorded_at DESC);

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_metrics ENABLE ROW LEVEL SECURITY;

-- Users can only access their workspace's agent data
CREATE POLICY agent_sessions_workspace_policy ON agent_sessions
    FOR ALL USING (workspace_id IN (SELECT get_user_workspace_ids()));

CREATE POLICY agent_messages_session_policy ON agent_messages
    FOR ALL USING (session_id IN (
        SELECT id FROM agent_sessions WHERE workspace_id IN (SELECT get_user_workspace_ids())
    ));

CREATE POLICY agent_tasks_workspace_policy ON agent_tasks
    FOR ALL USING (workspace_id IN (SELECT get_user_workspace_ids()));

CREATE POLICY agent_memory_workspace_policy ON agent_memory
    FOR ALL USING (workspace_id IN (SELECT get_user_workspace_ids()));

CREATE POLICY agent_feedback_user_policy ON agent_feedback
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY agent_metrics_workspace_policy ON agent_metrics
    FOR ALL USING (
        workspace_id IS NULL  -- Allow global metrics
        OR workspace_id IN (SELECT get_user_workspace_ids())
    );

-- =============================================================================
-- Triggers
-- =============================================================================

-- Update updated_at on agent_sessions
CREATE OR REPLACE FUNCTION update_agent_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_sessions_updated_at
    BEFORE UPDATE ON agent_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_session_updated_at();

-- Auto-update task timestamps
CREATE OR REPLACE FUNCTION update_agent_task_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'running' AND OLD.status = 'pending' THEN
        NEW.started_at = now();
    END IF;
    IF NEW.status IN ('completed', 'failed', 'cancelled') AND OLD.status IN ('pending', 'running') THEN
        NEW.completed_at = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_tasks_timestamps
    BEFORE UPDATE ON agent_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_task_timestamps();

-- Increment access count on memory access
CREATE OR REPLACE FUNCTION increment_memory_access()
RETURNS TRIGGER AS $$
BEGIN
    NEW.access_count = OLD.access_count + 1;
    NEW.last_accessed_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Helper Functions
-- =============================================================================

-- Get session messages with pagination
CREATE OR REPLACE FUNCTION get_session_messages(
    p_session_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    role TEXT,
    agent_type TEXT,
    content TEXT,
    tool_calls JSONB,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.id,
        m.role,
        m.agent_type,
        m.content,
        m.tool_calls,
        m.created_at
    FROM agent_messages m
    WHERE m.session_id = p_session_id
    ORDER BY m.created_at ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get agent metrics summary
CREATE OR REPLACE FUNCTION get_agent_metrics_summary(
    p_workspace_id UUID,
    p_agent_type TEXT DEFAULT NULL,
    p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
    agent_type TEXT,
    total_requests BIGINT,
    avg_response_time_ms FLOAT,
    total_tokens BIGINT,
    error_count BIGINT,
    positive_feedback BIGINT,
    negative_feedback BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.agent_type,
        COUNT(*) FILTER (WHERE m.metric_type = 'request') as total_requests,
        AVG(m.value) FILTER (WHERE m.metric_type = 'response_time') as avg_response_time_ms,
        SUM(m.value::BIGINT) FILTER (WHERE m.metric_type = 'tokens') as total_tokens,
        COUNT(*) FILTER (WHERE m.metric_type = 'error') as error_count,
        COUNT(*) FILTER (WHERE m.metric_type = 'feedback' AND m.metadata->>'type' = 'thumbs_up') as positive_feedback,
        COUNT(*) FILTER (WHERE m.metric_type = 'feedback' AND m.metadata->>'type' = 'thumbs_down') as negative_feedback
    FROM agent_metrics m
    WHERE (p_workspace_id IS NULL OR m.workspace_id = p_workspace_id)
      AND (p_agent_type IS NULL OR m.agent_type = p_agent_type)
      AND m.recorded_at >= now() - (p_days || ' days')::INTERVAL
    GROUP BY m.agent_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
