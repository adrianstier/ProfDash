# Architecture Document

## Overview

ProfDash/ScholarOS is an academic productivity platform evolving from a vanilla JavaScript prototype to a modern **TypeScript-first** architecture with **Next.js 14**, **Supabase**, and **Python AI microservices**.

---

## 2025 Tech Stack Summary

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Language** | TypeScript | Most-used on GitHub (2025), end-to-end type safety |
| **Frontend** | Next.js 14 (App Router) | SSR/SSG, API routes, Vercel-native |
| **Styling** | Tailwind CSS + shadcn/ui | Radix primitives, accessible by default |
| **State** | TanStack Query + Zustand | Server-state caching + lightweight client state |
| **Validation** | Zod | Runtime validation + TypeScript inference |
| **Database** | Supabase (Postgres + pgvector) | Auth, Storage, Realtime, Edge Functions |
| **API Pattern** | REST via Next.js API routes | Simple, well-understood, easy to debug |
| **AI Services** | Python + FastAPI | Best ML/AI ecosystem, separate scaling |
| **Testing** | Playwright (E2E) + Vitest (unit) | Industry standard |
| **CI/CD** | GitHub Actions + Vercel | Preview deployments, zero-config |
| **Observability** | Sentry + OpenTelemetry | Error tracking, distributed tracing |

---

## Current Architecture (v1.0 - Prototype)

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (Client)                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  public/index.html                     │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────┐  │  │
│  │  │   app.js    │  │ database.js │  │ dashboard.css │  │  │
│  │  │  (2087 ln)  │  │  (539 ln)   │  │  (2128 ln)    │  │  │
│  │  └──────┬──────┘  └──────┬──────┘  └───────────────┘  │  │
│  │         │                │                             │  │
│  │         └────────┬───────┘                             │  │
│  │                  ▼                                     │  │
│  │         ┌─────────────────┐                            │  │
│  │         │  DashboardDB    │ ◄── Hybrid Storage         │  │
│  │         │    Class        │     Pattern                │  │
│  │         └────────┬────────┘                            │  │
│  └──────────────────┼────────────────────────────────────┘  │
│                     │                                        │
│     ┌───────────────┴───────────────┐                       │
│     ▼                               ▼                        │
│  ┌──────────┐                 ┌──────────────┐              │
│  │localStorage│ (fallback)    │ Supabase JS  │ (primary)   │
│  └──────────┘                 │   Client     │              │
│                               └──────┬───────┘              │
└──────────────────────────────────────┼──────────────────────┘
                                       │ HTTPS
┌──────────────────────────────────────┼──────────────────────┐
│                     Express Server   │                       │
│  ┌───────────────────────────────────┼───────────────────┐  │
│  │              server/index.js      │                    │  │
│  │  ┌─────────────┐  ┌──────────────┐│  ┌─────────────┐  │  │
│  │  │Static Files │  │ /api/config  ││  │ OAuth Routes│  │  │
│  │  │  (public/)  │  │ (env vars)   ││  │ (scaffolded)│  │  │
│  │  └─────────────┘  └──────────────┘│  └─────────────┘  │  │
│  └───────────────────────────────────┼───────────────────┘  │
└──────────────────────────────────────┼──────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────┐
│                        Supabase                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    PostgreSQL                           ││
│  │  ┌─────────┐ ┌────────┐ ┌────────┐ ┌──────────────────┐││
│  │  │profiles │ │ tasks  │ │ papers │ │ grants           │││
│  │  └─────────┘ └────────┘ └────────┘ └──────────────────┘││
│  │  ┌─────────────────┐ ┌──────────┐ ┌──────────────────┐ ││
│  │  │grant_opportunities│ │personnel│ │courses/settings │ ││
│  │  └─────────────────┘ └──────────┘ └──────────────────┘ ││
│  │                                                         ││
│  │  Row Level Security (RLS) - user_id based isolation    ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │                  Supabase Auth                          ││
│  │  Email/Password + Google OAuth (for Calendar)          ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**Prototype Strengths**: Working product, quick add UX, hybrid storage pattern
**Prototype Limitations**: No types, no tests, single-user, no AI

---

## Target Architecture (v2.0 - Production)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Browser (Client)                             │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │              Next.js 14 App Router + TypeScript                │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐ │  │
│  │  │  React Server   │  │  Client         │  │  shadcn/ui     │ │  │
│  │  │  Components     │  │  Components     │  │  + Tailwind    │ │  │
│  │  └─────────────────┘  └─────────────────┘  └────────────────┘ │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐ │  │
│  │  │  TanStack Query │  │  Zustand        │  │  Zod           │ │  │
│  │  │  (server state) │  │  (client state) │  │  (validation)  │ │  │
│  │  └─────────────────┘  └─────────────────┘  └────────────────┘ │  │
│  │                             │                                  │  │
│  │                     ┌───────▼───────┐                          │  │
│  │                     │  Supabase JS  │                          │  │
│  │                     │  + Realtime   │                          │  │
│  │                     └───────┬───────┘                          │  │
│  └─────────────────────────────┼─────────────────────────────────┘  │
└─────────────────────────────────┼───────────────────────────────────┘
                                  │ HTTPS + WebSocket (Realtime)
┌─────────────────────────────────┼───────────────────────────────────┐
│                         Supabase Platform                            │
│  ┌──────────────────────────────┼────────────────────────────────┐  │
│  │                    PostgreSQL + pgvector                       │  │
│  │                                                                │  │
│  │  TENANCY                    CORE DATA                          │  │
│  │  ┌──────────────┐          ┌───────────────────────────────┐  │  │
│  │  │ workspaces   │          │ tasks (+ workspace_id)        │  │  │
│  │  │ workspace_   │          │ projects (unified)            │  │  │
│  │  │   members    │          │ project_milestones            │  │  │
│  │  │ invites      │          │ personnel                     │  │  │
│  │  └──────────────┘          └───────────────────────────────┘  │  │
│  │                                                                │  │
│  │  GRANTS                     CALENDAR                           │  │
│  │  ┌──────────────────────┐  ┌───────────────────────────────┐  │  │
│  │  │ funding_opportunities│  │ calendar_connections          │  │  │
│  │  │ saved_searches       │  │ calendar_events_cache         │  │  │
│  │  │ opportunity_watchlist│  └───────────────────────────────┘  │  │
│  │  └──────────────────────┘                                      │  │
│  │                                                                │  │
│  │  AI / SEARCH                AUDIT                              │  │
│  │  ┌──────────────────────┐  ┌───────────────────────────────┐  │  │
│  │  │ documents            │  │ audit_log                     │  │  │
│  │  │ document_chunks      │  │ notifications                 │  │  │
│  │  │ embeddings (vector)  │  └───────────────────────────────┘  │  │
│  │  │ ai_actions_log       │                                      │  │
│  │  └──────────────────────┘                                      │  │
│  │                                                                │  │
│  │  RLS: workspace_id based (users see only their workspace data) │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                      Edge Functions                             │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐  │  │
│  │  │ grants-ingest  │  │ calendar-sync  │  │ ai-process       │  │  │
│  │  │ (Grants.gov)   │  │ (Google API)   │  │ (embeddings)     │  │  │
│  │  └────────────────┘  └────────────────┘  └──────────────────┘  │  │
│  │  ┌────────────────┐  ┌────────────────┐                        │  │
│  │  │ digest-email   │  │ webhook-handler│                        │  │
│  │  │ (weekly)       │  │ (calendar push)│                        │  │
│  │  └────────────────┘  └────────────────┘                        │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                    Supabase Auth                                │  │
│  │  Email/Password + Google OAuth + Magic Links                   │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                    Supabase Storage                             │  │
│  │  Grant PDFs, Attachments, Profile Photos                       │  │
│  └────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌───────────────────────────────────────────────────────────────────────┐
│                        External APIs                                   │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐  │
│  │  Grants.gov    │  │  NIH RePORTER  │  │  NSF Award Search      │  │
│  │  REST API      │  │  API v2        │  │  REST API              │  │
│  └────────────────┘  └────────────────┘  └────────────────────────┘  │
│  ┌────────────────┐  ┌────────────────────────────────────────────┐  │
│  │  Google        │  │  Claude API (Anthropic)                    │  │
│  │  Calendar API  │  │  - Task extraction                         │  │
│  └────────────────┘  │  - Summarization                           │  │
│                      │  - Grant fit scoring                       │  │
│                      │  - Outline drafting                        │  │
│                      └────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

### 1. Hybrid Storage Pattern (Existing)

The `DashboardDB` class provides a clean abstraction that:
- **Primary**: Uses Supabase when credentials are configured
- **Fallback**: Uses localStorage when offline or unconfigured

```javascript
// database.js pattern
class DashboardDB {
  constructor() {
    this.supabase = this.initSupabase();
    this.useSupabase = !!this.supabase;
  }

  async getTasks() {
    if (this.useSupabase && this.currentUser) {
      return this.supabase.from('tasks').select('*');
    }
    return JSON.parse(localStorage.getItem('profdash-tasks') || '[]');
  }
}
```

**Recommendation**: Keep this pattern but add workspace context:
```javascript
async getTasks(workspaceId) {
  if (this.useSupabase && this.currentUser) {
    return this.supabase
      .from('tasks')
      .select('*')
      .eq('workspace_id', workspaceId);
  }
  // localStorage doesn't support workspaces
  return JSON.parse(localStorage.getItem('profdash-tasks') || '[]');
}
```

### 2. Multi-Tenancy via Workspaces

**Pattern**: Shared database with workspace isolation via RLS

```sql
-- Every table gets workspace_id
ALTER TABLE tasks ADD COLUMN workspace_id UUID REFERENCES workspaces(id);

-- RLS policy pattern
CREATE POLICY "Users can access workspace tasks"
ON tasks FOR ALL
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid()
  )
);
```

**Why not schema-per-tenant?**
- Supabase doesn't support dynamic schemas
- RLS is performant and battle-tested
- Simpler backup/restore
- Works with Supabase Realtime

### 3. Project Unification

Currently: Separate `papers` and `grants` tables with different fields.

Target: Unified `projects` table with type-specific metadata in JSONB.

**Migration Strategy**:
```sql
-- 1. Create new unified projects table
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  workspace_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT,
  stage TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Migrate papers
INSERT INTO projects (id, workspace_id, type, title, status, stage, metadata)
SELECT
  id,
  workspace_id,
  'manuscript',
  title,
  status,
  status as stage,
  jsonb_build_object(
    'authors', authors,
    'journal', journal,
    'citations', citations
  )
FROM papers;

-- 3. Migrate grants (similar pattern)
-- 4. Update app.js to use projects table
-- 5. Deprecate papers/grants tables
```

### 4. Calendar Sync Architecture

**Phase 1: Read-Only Pull**
```
┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│   Browser    │────▶│  Edge Function  │────▶│  Google Calendar │
│              │◀────│ calendar-sync   │◀────│       API        │
│              │     │                 │     │                  │
│  calendar_   │     │ - Fetch events  │     │ - OAuth token    │
│  events_cache│     │ - Transform     │     │ - calendar.list  │
│  (display)   │     │ - Upsert cache  │     │ - events.list    │
└──────────────┘     └─────────────────┘     └──────────────────┘
```

**Phase 2: Bidirectional with Webhooks**
```
┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│   Browser    │────▶│  Edge Function  │────▶│  Google Calendar │
│              │◀────│ calendar-sync   │◀────│       API        │
│              │     │                 │     │                  │
│ Create task  │     │ - Push changes  │     │ - events.insert  │
│ with time    │     │ - Handle webhook│◀────│ - events.update  │
│              │     │ - Sync back     │     │ - push notifs    │
└──────────────┘     └─────────────────┘     └──────────────────┘
```

### 5. AI Service Layer

**Abstraction for Provider Flexibility**:
```typescript
// packages/ai/index.ts
interface AIService {
  extractTasks(text: string): Promise<Task[]>;
  summarize(context: ProjectContext): Promise<string>;
  scoreFit(opportunity: FundingOpportunity, profile: ResearchProfile): Promise<FitScore>;
  draftOutline(type: 'aims' | 'significance' | 'approach', context: any): Promise<string>;
}

class ClaudeAIService implements AIService {
  private client: Anthropic;

  async extractTasks(text: string): Promise<Task[]> {
    const response = await this.client.messages.create({
      model: 'claude-3-sonnet-20240229',
      messages: [{
        role: 'user',
        content: `Extract actionable tasks from this text. Return as JSON array with title, priority (p1-p4), and suggested due date.\n\n${text}`
      }]
    });
    return JSON.parse(response.content[0].text);
  }
}
```

**Edge Function Pattern**:
```typescript
// supabase/functions/ai-process/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Anthropic from 'npm:@anthropic-ai/sdk';

serve(async (req) => {
  const { action, payload } = await req.json();
  const client = new Anthropic();

  switch (action) {
    case 'extract_tasks':
      return await extractTasks(client, payload);
    case 'summarize':
      return await summarize(client, payload);
    // ...
  }
});
```

### 6. Grant Discovery Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    Grant Ingestion Pipeline                      │
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │ Grants.gov   │───▶│ Edge Function│───▶│ funding_         │   │
│  │ Search API   │    │ grants-ingest│    │ opportunities    │   │
│  └──────────────┘    │              │    │ (raw + processed)│   │
│                      │ - Parse JSON │    └──────────────────┘   │
│  ┌──────────────┐    │ - Extract    │              │            │
│  │ NIH Reporter │───▶│   metadata   │              ▼            │
│  │ API          │    │ - Generate   │    ┌──────────────────┐   │
│  └──────────────┘    │   embeddings │    │ pgvector         │   │
│                      │ - Upsert     │    │ embeddings       │   │
│  ┌──────────────┐    │              │    │ (semantic search)│   │
│  │ NSF Awards   │───▶│              │    └──────────────────┘   │
│  │ API          │    └──────────────┘                           │
│  └──────────────┘                                               │
│                                                                  │
│  Triggered by: pg_cron (daily) or saved_search alerts           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema Evolution

### Current Schema (Single-User)

```sql
-- All tables have user_id, no workspace_id
tasks (id, user_id, title, status, ...)
papers (id, user_id, title, status, ...)
grants (id, user_id, title, amount, ...)
```

### Target Schema (Multi-Tenant)

```sql
-- New tenancy tables
workspaces (id, name, settings, created_by, created_at)
workspace_members (workspace_id, user_id, role, invited_by, joined_at)
workspace_invites (id, workspace_id, email, role, token, expires_at)

-- Modified tables (add workspace_id, keep user_id for audit)
tasks (id, workspace_id, user_id, title, status, assignees[], project_id, ...)
projects (id, workspace_id, type, title, stage, metadata, ...)
personnel (id, workspace_id, name, role, ...)

-- New tables
funding_opportunities (id, external_id, source, title, agency, deadline, embedding, ...)
calendar_connections (id, user_id, provider, tokens, ...)
calendar_events_cache (id, user_id, external_id, summary, start_time, ...)
ai_actions_log (id, workspace_id, user_id, action_type, input, output, accepted, ...)
audit_log (id, workspace_id, user_id, action, entity_type, entity_id, changes, ...)
```

---

## Security Model

### Row Level Security Policies

```sql
-- Workspace access check function
CREATE OR REPLACE FUNCTION user_has_workspace_access(ws_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = ws_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Role check function
CREATE OR REPLACE FUNCTION user_workspace_role(ws_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM workspace_members
    WHERE workspace_id = ws_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Example: Tasks policy with role-based access
CREATE POLICY "Members can view workspace tasks"
ON tasks FOR SELECT
USING (user_has_workspace_access(workspace_id));

CREATE POLICY "Members can create tasks"
ON tasks FOR INSERT
WITH CHECK (
  user_has_workspace_access(workspace_id)
  AND user_workspace_role(workspace_id) IN ('owner', 'admin', 'member')
);

CREATE POLICY "Owners and admins can delete any task"
ON tasks FOR DELETE
USING (
  user_workspace_role(workspace_id) IN ('owner', 'admin')
  OR user_id = auth.uid()  -- Users can delete their own tasks
);
```

### OAuth Token Security

```sql
-- Encrypted token storage
CREATE TABLE calendar_connections (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  -- Tokens encrypted with Supabase Vault
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  -- ...
);

-- Use Vault for encryption
SELECT vault.create_secret('calendar_tokens_key', 'your-encryption-key');

-- Encrypt on insert
INSERT INTO calendar_connections (access_token_encrypted)
VALUES (vault.encrypt('raw_token', 'calendar_tokens_key'));

-- Decrypt on read (in Edge Function only)
SELECT vault.decrypt(access_token_encrypted, 'calendar_tokens_key');
```

---

## Performance Considerations

### Indexes (Existing + New)

```sql
-- Existing indexes
CREATE INDEX idx_tasks_user ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(user_id, status);
CREATE INDEX idx_tasks_due ON tasks(user_id, due);

-- New indexes for workspace queries
CREATE INDEX idx_tasks_workspace ON tasks(workspace_id);
CREATE INDEX idx_tasks_workspace_status ON tasks(workspace_id, status);
CREATE INDEX idx_tasks_workspace_due ON tasks(workspace_id, due);
CREATE INDEX idx_tasks_project ON tasks(project_id);

-- Full-text search
CREATE INDEX idx_tasks_fts ON tasks USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));
CREATE INDEX idx_projects_fts ON projects USING gin(to_tsvector('english', title || ' ' || COALESCE(summary, '')));

-- Vector search (pgvector)
CREATE INDEX idx_opportunities_embedding ON funding_opportunities
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### Query Optimization

```sql
-- Efficient workspace task loading with limits
SELECT t.*,
       array_agg(DISTINCT u.email) as assignee_emails,
       p.title as project_title
FROM tasks t
LEFT JOIN profiles u ON u.id = ANY(t.assignees)
LEFT JOIN projects p ON p.id = t.project_id
WHERE t.workspace_id = $1
  AND t.status != 'done'
GROUP BY t.id, p.title
ORDER BY t.due ASC NULLS LAST
LIMIT 100;
```

### Caching Strategy

```javascript
// Client-side caching with TanStack Query (future)
const { data: tasks } = useQuery({
  queryKey: ['tasks', workspaceId],
  queryFn: () => supabase.from('tasks').select('*').eq('workspace_id', workspaceId),
  staleTime: 1000 * 60 * 5, // 5 minutes
});

// Or with current vanilla JS
class TaskCache {
  constructor() {
    this.cache = new Map();
    this.ttl = 5 * 60 * 1000; // 5 minutes
  }

  async getTasks(workspaceId) {
    const cached = this.cache.get(workspaceId);
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data;
    }
    const data = await db.getTasks(workspaceId);
    this.cache.set(workspaceId, { data, timestamp: Date.now() });
    return data;
  }
}
```

---

## Realtime Subscriptions

```javascript
// Subscribe to workspace changes
const channel = supabase.channel(`workspace:${workspaceId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'tasks',
    filter: `workspace_id=eq.${workspaceId}`
  }, (payload) => {
    handleTaskChange(payload);
  })
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'projects',
    filter: `workspace_id=eq.${workspaceId}`
  }, (payload) => {
    handleProjectChange(payload);
  })
  .subscribe();

function handleTaskChange(payload) {
  switch (payload.eventType) {
    case 'INSERT':
      tasks.push(payload.new);
      break;
    case 'UPDATE':
      const idx = tasks.findIndex(t => t.id === payload.new.id);
      if (idx >= 0) tasks[idx] = payload.new;
      break;
    case 'DELETE':
      tasks = tasks.filter(t => t.id !== payload.old.id);
      break;
  }
  renderTasks();
}
```

---

## File Storage Structure

```
supabase-storage/
├── workspaces/
│   └── {workspace_id}/
│       ├── projects/
│       │   └── {project_id}/
│       │       ├── attachments/
│       │       └── figures/
│       ├── grants/
│       │   └── {opportunity_id}/
│       │       └── pdfs/  (downloaded FOAs)
│       └── personnel/
│           └── {person_id}/
│               └── documents/
├── users/
│   └── {user_id}/
│       └── avatar.jpg
└── system/
    └── templates/
        └── onboarding/
```

---

## Deployment Architecture

### Current (Simple)
```
GitHub Repo → Manual Deploy → Supabase (DB/Auth) + Any Static Host
```

### Target (CI/CD)
```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│   GitHub    │────▶│   Vercel    │────▶│   Production    │
│   Actions   │     │  (Preview)  │     │   (Edge)        │
└─────────────┘     └─────────────┘     └─────────────────┘
       │                                         │
       │            ┌─────────────────┐          │
       └───────────▶│    Supabase     │◀─────────┘
                    │  (Production)   │
                    │                 │
                    │ - PostgreSQL    │
                    │ - Auth          │
                    │ - Edge Functions│
                    │ - Storage       │
                    │ - Realtime      │
                    └─────────────────┘
```

---

## Monitoring & Observability

### Metrics to Track
- API response times (Supabase dashboard)
- Edge Function invocations and errors
- RLS policy performance
- Database query performance (pg_stat_statements)
- Client-side errors (Sentry or similar)

### Logging
```typescript
// Edge Function logging pattern
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  function: 'grants-ingest',
  action: 'fetch_opportunities',
  source: 'grants.gov',
  count: opportunities.length,
  duration_ms: Date.now() - startTime,
}));
```

---

## Migration Checklist

### Phase 1: Add Workspace Support
- [ ] Create workspace tables migration
- [ ] Add workspace_id to existing tables
- [ ] Create workspace RLS policies
- [ ] Update database.js with workspace context
- [ ] Build workspace UI (switcher, create, invite)

### Phase 2: Calendar Integration
- [ ] Complete Google OAuth flow
- [ ] Create calendar Edge Functions
- [ ] Build calendar sync logic
- [ ] Add calendar events cache
- [ ] Update calendar view to show synced events

### Phase 3: Grant Discovery
- [ ] Create Grants.gov Edge Function
- [ ] Add funding_opportunities table
- [ ] Build search UI
- [ ] Implement saved searches
- [ ] Add watchlist functionality

### Phase 4: AI Features
- [ ] Set up AI service abstraction
- [ ] Create AI Edge Functions
- [ ] Implement task extraction
- [ ] Add project summarization
- [ ] Build grant fit scoring

---

*Document Version: 2.0*
*Last Updated: December 2024*
