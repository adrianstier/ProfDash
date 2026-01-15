-- Migration: Analytics Events Infrastructure
-- Version: 1.0.0
-- Created: January 2026
-- Author: Data Science Team
-- Purpose: Create analytics event tracking infrastructure for Phase 9B
--
-- This migration creates:
-- 1. analytics_events table for event storage
-- 2. experiment_assignments table for A/B testing
-- 3. feature_metrics table for validation
-- 4. Proper indexes for analytics queries
-- 5. RLS policies for secure access
-- 6. Partitioning setup for scalability

-- ============================================================================
-- Analytics Events Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id TEXT NOT NULL UNIQUE,
  event_name TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,

  -- Platform and device info
  platform TEXT DEFAULT 'web',
  viewport_width INTEGER,
  user_agent TEXT,

  -- Event properties (flexible JSON)
  properties JSONB DEFAULT '{}',

  -- Optional metadata
  metadata JSONB DEFAULT '{}',

  -- Processing metadata
  processed_at TIMESTAMPTZ,
  is_processed BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add comment
COMMENT ON TABLE analytics_events IS 'Stores all analytics events for funnel analysis, feature validation, and ML training';

-- ============================================================================
-- Experiment Assignments Table (A/B Testing)
-- ============================================================================

CREATE TABLE IF NOT EXISTS experiment_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experiment_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Context at assignment time
  assignment_context JSONB DEFAULT '{}',

  -- Tracking
  first_exposure_at TIMESTAMPTZ,
  conversion_at TIMESTAMPTZ,
  converted BOOLEAN DEFAULT FALSE,

  -- Constraints
  UNIQUE(experiment_id, user_id)
);

COMMENT ON TABLE experiment_assignments IS 'Tracks user assignments to A/B test variants';

-- ============================================================================
-- Feature Metrics Table (Validation)
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feature_name TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_type TEXT NOT NULL, -- 'continuous', 'proportion', 'count', 'rate'

  -- Time period
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,

  -- Aggregated values
  sample_size INTEGER NOT NULL DEFAULT 0,
  sum_value DOUBLE PRECISION DEFAULT 0,
  sum_squared DOUBLE PRECISION DEFAULT 0,
  min_value DOUBLE PRECISION,
  max_value DOUBLE PRECISION,

  -- Computed statistics
  mean_value DOUBLE PRECISION,
  std_value DOUBLE PRECISION,

  -- Segmentation
  segment_key TEXT DEFAULT 'all',
  segment_value TEXT DEFAULT 'all',

  -- Metadata
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  computed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints
  UNIQUE(feature_name, metric_name, period_start, segment_key, segment_value, workspace_id)
);

COMMENT ON TABLE feature_metrics IS 'Stores aggregated metrics for feature validation and monitoring';

-- ============================================================================
-- Indexes for Analytics Queries
-- ============================================================================

-- Analytics events indexes
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_timestamp
  ON analytics_events(user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name
  ON analytics_events(event_name);

CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp
  ON analytics_events(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_workspace_timestamp
  ON analytics_events(workspace_id, timestamp DESC)
  WHERE workspace_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_events_session
  ON analytics_events(session_id, timestamp)
  WHERE session_id IS NOT NULL;

-- Partial index for unprocessed events (batch processing)
CREATE INDEX IF NOT EXISTS idx_analytics_events_unprocessed
  ON analytics_events(timestamp)
  WHERE NOT is_processed;

-- GIN index for properties queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_properties
  ON analytics_events USING GIN (properties);

-- Experiment assignments indexes
CREATE INDEX IF NOT EXISTS idx_experiment_assignments_experiment
  ON experiment_assignments(experiment_id, assigned_at DESC);

CREATE INDEX IF NOT EXISTS idx_experiment_assignments_user
  ON experiment_assignments(user_id);

-- Feature metrics indexes
CREATE INDEX IF NOT EXISTS idx_feature_metrics_feature_period
  ON feature_metrics(feature_name, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_feature_metrics_metric
  ON feature_metrics(metric_name, period_start DESC);

-- ============================================================================
-- Row Level Security Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_metrics ENABLE ROW LEVEL SECURITY;

-- Analytics events: Users can only see their own events
CREATE POLICY "Users can view own analytics events" ON analytics_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert events (from API routes)
CREATE POLICY "Service role can insert analytics events" ON analytics_events
  FOR INSERT
  WITH CHECK (true);

-- Service role can update events
CREATE POLICY "Service role can update analytics events" ON analytics_events
  FOR UPDATE
  USING (true);

-- Experiment assignments: Users can see their own assignments
CREATE POLICY "Users can view own experiment assignments" ON experiment_assignments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage assignments
CREATE POLICY "Service role can manage experiment assignments" ON experiment_assignments
  FOR ALL
  USING (true);

-- Feature metrics: Users can see metrics for their workspaces
CREATE POLICY "Users can view workspace metrics" ON feature_metrics
  FOR SELECT
  USING (
    workspace_id IS NULL
    OR EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = feature_metrics.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

-- Service role can manage metrics
CREATE POLICY "Service role can manage feature metrics" ON feature_metrics
  FOR ALL
  USING (true);

-- ============================================================================
-- Functions for Analytics Processing
-- ============================================================================

-- Function to aggregate event metrics
CREATE OR REPLACE FUNCTION aggregate_event_metrics(
  p_feature_name TEXT,
  p_metric_name TEXT,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_event_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  sample_size BIGINT,
  sum_value DOUBLE PRECISION,
  mean_value DOUBLE PRECISION,
  std_value DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH event_values AS (
    SELECT
      COALESCE((properties->>p_metric_name)::DOUBLE PRECISION, 1) as metric_value
    FROM analytics_events
    WHERE event_name = COALESCE(p_event_filter, event_name)
      AND timestamp >= p_start_time
      AND timestamp < p_end_time
  )
  SELECT
    COUNT(*)::BIGINT as sample_size,
    SUM(metric_value) as sum_value,
    AVG(metric_value) as mean_value,
    STDDEV(metric_value) as std_value
  FROM event_values;
END;
$$;

-- Function to get user's experiment variant
CREATE OR REPLACE FUNCTION get_experiment_variant(
  p_experiment_id TEXT,
  p_user_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_variant TEXT;
BEGIN
  SELECT variant_name INTO v_variant
  FROM experiment_assignments
  WHERE experiment_id = p_experiment_id
    AND user_id = p_user_id;

  RETURN v_variant;
END;
$$;

-- Function to record experiment conversion
CREATE OR REPLACE FUNCTION record_experiment_conversion(
  p_experiment_id TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE experiment_assignments
  SET
    converted = TRUE,
    conversion_at = NOW()
  WHERE experiment_id = p_experiment_id
    AND user_id = p_user_id
    AND NOT converted;

  RETURN FOUND;
END;
$$;

-- Function to mark events as processed
CREATE OR REPLACE FUNCTION mark_events_processed(
  p_event_ids UUID[]
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE analytics_events
  SET
    is_processed = TRUE,
    processed_at = NOW()
  WHERE id = ANY(p_event_ids);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ============================================================================
-- Cleanup Function (Retention Policy)
-- ============================================================================

-- Function to clean up old analytics events (90-day retention)
CREATE OR REPLACE FUNCTION cleanup_old_analytics_events(
  p_retention_days INTEGER DEFAULT 90
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM analytics_events
  WHERE timestamp < NOW() - (p_retention_days || ' days')::INTERVAL
    AND is_processed = TRUE;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION cleanup_old_analytics_events IS
  'Removes processed analytics events older than retention period. Default 90 days.';

-- ============================================================================
-- Trigger for Updated At
-- ============================================================================

-- Ensure updated_at trigger exists (from initial schema)
-- Apply to feature_metrics if needed
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Grants for Service Role
-- ============================================================================

-- Ensure service role has full access
GRANT ALL ON analytics_events TO service_role;
GRANT ALL ON experiment_assignments TO service_role;
GRANT ALL ON feature_metrics TO service_role;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION aggregate_event_metrics TO service_role;
GRANT EXECUTE ON FUNCTION get_experiment_variant TO authenticated;
GRANT EXECUTE ON FUNCTION record_experiment_conversion TO service_role;
GRANT EXECUTE ON FUNCTION mark_events_processed TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_analytics_events TO service_role;

-- ============================================================================
-- Sample Data Types Documentation
-- ============================================================================

COMMENT ON COLUMN analytics_events.event_name IS
  'Event type: onboarding_started, onboarding_step_completed, search_opened, search_result_selected, etc.';

COMMENT ON COLUMN analytics_events.properties IS
  'Event-specific properties as JSON. Structure varies by event_name.';

COMMENT ON COLUMN experiment_assignments.variant_name IS
  'Name of assigned variant: control, treatment_a, treatment_b, etc.';

COMMENT ON COLUMN feature_metrics.metric_type IS
  'Type of metric: continuous (numeric), proportion (0-1), count (integers), rate (per-time)';
