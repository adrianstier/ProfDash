-- Calendar Integration Tables
-- Phase 5: External Integrations

-- Calendar Connections (OAuth tokens for Google Calendar)
CREATE TABLE IF NOT EXISTS calendar_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL DEFAULT 'google',
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  selected_calendars TEXT[] DEFAULT '{}',
  sync_enabled BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, provider)
);

-- Calendar Events Cache (synced from external calendars)
CREATE TABLE IF NOT EXISTS calendar_events_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  external_id TEXT NOT NULL,
  calendar_id TEXT,
  summary TEXT,
  description TEXT,
  location TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'confirmed',
  raw_data JSONB,
  synced_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, external_id)
);

-- RLS Policies for calendar_connections
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own calendar connections"
  ON calendar_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own calendar connections"
  ON calendar_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendar connections"
  ON calendar_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendar connections"
  ON calendar_connections FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for calendar_events_cache
ALTER TABLE calendar_events_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own calendar events"
  ON calendar_events_cache FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own calendar events"
  ON calendar_events_cache FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendar events"
  ON calendar_events_cache FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendar events"
  ON calendar_events_cache FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_calendar_connections_user ON calendar_connections(user_id);
CREATE INDEX idx_calendar_events_user ON calendar_events_cache(user_id);
CREATE INDEX idx_calendar_events_time ON calendar_events_cache(user_id, start_time, end_time);
CREATE INDEX idx_calendar_events_external ON calendar_events_cache(user_id, external_id);

-- Triggers for updated_at
CREATE OR REPLACE TRIGGER update_calendar_connections_updated_at
  BEFORE UPDATE ON calendar_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_calendar_events_cache_updated_at
  BEFORE UPDATE ON calendar_events_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
