# Product Requirements Document (PRD)

## Product Name
**ProfDash** → evolving to **ScholarOS**

An AI-native academic operations dashboard for professors, lab managers, and research teams.

## One-Line Summary
A multi-tenant, collaborative dashboard for academics to manage tasks, manuscripts, grants, people, and calendars—with AI copilots embedded across workflows.

---

## Current State Assessment

ProfDash v1.0 is a **fully functional single-user academic productivity dashboard** with:
- Complete task management (5 views + quick add with natural language parsing)
- Research paper pipeline tracking (Idea → Published)
- Grant management with burn rate visualization
- Lab personnel tracking with 1:1 meeting alerts
- Teaching dashboard with ESCI tracking
- Dossier builder for promotion materials
- Hybrid storage (Supabase + localStorage fallback)
- Row Level Security for user isolation

**Tech Stack**: Vanilla JavaScript, Express.js, Supabase (PostgreSQL)

### What Works Well
- Quick add syntax (`NSF report fri #grants p1`) is excellent UX
- Kanban + multiple views give flexibility
- Paper pipeline stages are intuitive
- localStorage fallback ensures offline functionality
- RLS provides solid security foundation

### What Needs Evolution
1. Single-user → Multi-tenant workspaces
2. Manual grant entry → API-powered discovery
3. No calendar sync → Google Calendar integration
4. Zero AI → AI copilots throughout
5. Vanilla JS → Next.js for scalability (optional)

---

## 1. Goals, Non-Goals, and Success Metrics

### Goals

1. **Single pane of glass** for academic operational work:
   - Tasks + Kanban (✅ exists, enhance with AI)
   - Manuscripts + Grants as "Projects" (🔄 unify existing features)
   - Personnel roster + onboarding/training status (🔄 extend existing)
   - Google Calendar sync (🆕 build from scaffolding)
   - Grant discovery + tracking (🆕 API integration)

2. **Multi-user collaboration** with clean permissioning (🆕 major architecture change)

3. **AI everywhere**: summarize, extract action items, suggest next steps, recommend grants, draft emails/outlines, detect slippage/risk (🆕 new capability layer)

4. **Accessible and fast**: WCAG-aligned, keyboard-first (✅ keyboard shortcuts exist), responsive

### Non-Goals (Initially)
- Full HR system (payroll, benefits administration)
- Full manuscript writing editor (integrate with Overleaf/Google Docs)
- Replacing institutional grant submission systems (SPO, Cayuse, etc.)
- Mobile native apps (web-first, responsive design)

### Success Metrics (First 90 Days Post-Launch)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Activation | ≥60% of invited users connect Calendar + create project + add ≥10 tasks | Supabase analytics |
| Retention | ≥35% weekly active | WAU/MAU ratio |
| Time Saved | ≥1 hr/week self-reported by ≥50% of active users | In-app survey |
| AI Usefulness | ≥30% of users accept ≥1 AI suggestion/week | `ai_actions_log` table |
| NPS | ≥40 | Quarterly survey |

---

## 2. Target Users, Roles, and Permissions

### Personas

| Persona | Description | Primary Needs |
|---------|-------------|---------------|
| **PI / Faculty** | Managing multiple manuscripts/grants, supervising personnel | Project oversight, grant tracking, delegation |
| **Lab Manager** | Operations, scheduling, onboarding, compliance | Personnel management, templates, calendaring |
| **Postdoc / Grad Student** | Focused on assigned projects + personal tasks | Task completion, milestone tracking, collaboration |
| **Undergraduate RA** | Limited scope, learning | Onboarding checklists, assigned tasks only |

### Tenancy Model

```
Workspace = Lab / Group / Team (multi-tenant)
├── Users can belong to multiple workspaces
├── Each workspace has isolated data
└── Billing at workspace level
```

### Role-Based Access Control (RBAC)

| Role | Permissions |
|------|-------------|
| **Owner** | Full control, billing, integrations, workspace settings, delete workspace |
| **Admin** | Manage members, templates, all projects, global views (cannot delete workspace) |
| **Member** | Create/edit within assigned projects, see shared items |
| **Limited** | View/complete only assigned tasks, no workspace-wide visibility |

### Row Level Security (RLS) Strategy

```sql
-- Current: user_id isolation
-- Future: workspace_id + role-based policies

-- Example policy for workspace members
CREATE POLICY "Workspace members can view workspace tasks"
ON tasks FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid()
  )
);
```

---

## 3. Core Modules and Functional Requirements

### A. Authentication & Onboarding

**Current State**: Supabase Auth with email/password, Google OAuth scaffolded

**Requirements**:
- [x] Email + password authentication
- [x] Google OAuth (for Calendar scope)
- [ ] Workspace creation flow
- [ ] Magic link invites
- [ ] Profile setup wizard (name, title, institution, timezone)
- [ ] "Connect Google Calendar" guided step
- [ ] Role selection during invite acceptance

**User Flow**:
```
Sign Up → Create/Join Workspace → Profile Setup → Connect Calendar (optional) → Dashboard
```

---

### B. Tasks Module

**Current State**: Fully implemented with 5 views + quick add

**Task Object** (extend existing schema):

| Field | Type | Status |
|-------|------|--------|
| id | TEXT | ✅ exists |
| title | TEXT | ✅ exists |
| description | TEXT | ✅ exists (as notes) |
| status | TEXT | ✅ exists |
| priority | TEXT | ✅ exists |
| due | DATE | ✅ exists |
| category | TEXT | ✅ exists |
| user_id | UUID | ✅ exists |
| workspace_id | UUID | 🆕 add |
| project_id | TEXT | 🆕 add |
| assignees | UUID[] | 🆕 add |
| tags | TEXT[] | 🆕 add |
| recurrence | JSONB | 🔜 Phase 2 |
| dependencies | TEXT[] | 🔜 Phase 2 |
| attachments | JSONB | 🔜 Phase 2 |

**Views** (all exist, enhance):
1. ✅ Inbox / Quick Capture
2. ✅ Today / Upcoming
3. ✅ Priority view
4. ✅ Kanban (enhance with workspace columns)
5. 🆕 My Tasks vs Team Tasks toggle
6. ✅ Calendar overlay

**Quick Add Enhancements**:
```
Current:  NSF report fri #grants p1
Enhanced: NSF report fri #grants p1 @craig @maria +manuscript-123
                                     ↑ assignees  ↑ project link
```

**AI Overlays**:
- [ ] Auto-extract tasks from pasted text/meeting notes
- [ ] Suggest priority + due date based on content + calendar load
- [ ] "Stale task detection" nudges (tasks untouched for 7+ days)
- [ ] Draft next actions when task is blocked

---

### C. Projects Module (Unified Manuscripts + Grants)

**Current State**: Separate `papers` and `grants` tables

**Proposal**: Create unified `projects` abstraction while preserving existing functionality

```sql
-- New unified projects table
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  workspace_id UUID NOT NULL,
  type TEXT NOT NULL, -- 'manuscript', 'grant', 'general'
  title TEXT NOT NULL,
  summary TEXT,
  status TEXT DEFAULT 'active',
  stage TEXT, -- type-specific stages
  due_date DATE,
  owner_id UUID,
  metadata JSONB, -- type-specific fields
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Manuscript metadata example:
{
  "journal_target": "Nature",
  "coauthors": ["uuid1", "uuid2"],
  "figures_count": 5,
  "submission_checklist": [...]
}

-- Grant metadata example:
{
  "agency": "NSF",
  "mechanism": "R01",
  "amount": 500000,
  "loi_deadline": "2024-03-15"
}
```

**Project Stages**:

| Manuscript | Grant |
|------------|-------|
| Idea | Discovery |
| Outline | Fit Assessment |
| Drafting | Intent/LOI |
| Internal Review | Drafting |
| Submission | Internal Routing |
| Revision | Submission |
| Accepted | Award/Decline |
| Published | Active/Closeout |

**AI Overlays**:
- [ ] Summarize weekly status ("What changed this week?")
- [ ] Identify missing pieces vs template checklist
- [ ] Draft outlines (Specific Aims, Significance, Innovation)
- [ ] Risk flags: deadline proximity + task backlog

---

### D. Grant Discovery Module (NEW)

**Current State**: Manual `grant_opportunities` table

**Data Sources**:

| Source | API | Use Case |
|--------|-----|----------|
| Grants.gov | REST API | Federal opportunities |
| NIH RePORTER | V2 API | Funded project intelligence |
| NSF Award Search | REST API | Award patterns, program analysis |
| Simpler.Grants.gov | Experimental | Future integration |

**Features**:
- [ ] Search + filters (agency, keyword, due date, eligibility)
- [ ] Saved searches with email alerts
- [ ] "Grant shortlists" per workspace
- [ ] "Follow" opportunity (watchlist)
- [ ] Import opportunity → Create Grant Project (auto-fill metadata)

**AI Overlays**:
- [ ] Fit scoring: user keywords + embeddings + rubric
- [ ] "Why it's a fit" explanation + gaps
- [ ] Auto-extract requirements from opportunity PDFs
- [ ] Summarize sponsor priorities
- [ ] Compare similar awarded grants

**Schema Addition**:
```sql
CREATE TABLE funding_opportunities (
  id TEXT PRIMARY KEY,
  external_id TEXT, -- grants.gov opportunity ID
  source TEXT, -- 'grants.gov', 'nih', 'nsf'
  title TEXT NOT NULL,
  agency TEXT,
  mechanism TEXT,
  deadline DATE,
  loi_deadline DATE,
  amount_range JSONB,
  eligibility JSONB,
  description TEXT,
  url TEXT,
  raw_data JSONB,
  embedding vector(1536), -- for semantic search
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  name TEXT NOT NULL,
  query JSONB, -- search parameters
  alert_frequency TEXT, -- 'daily', 'weekly', 'none'
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE opportunity_watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  opportunity_id TEXT REFERENCES funding_opportunities(id),
  notes TEXT,
  fit_score DECIMAL(3,2),
  status TEXT DEFAULT 'watching', -- 'watching', 'applying', 'declined'
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### E. Google Calendar Integration

**Current State**: OAuth routes scaffolded in `server/index.js`, not functional

**Phase 1 (MVP)**: Read-Only
- [ ] Connect Google Calendar via OAuth
- [ ] Read events from primary + selected calendars
- [ ] Display in app calendar view
- [ ] "Availability heatmap" (busy/free visualization)
- [ ] Link tasks/projects to calendar events (reference only)

**Phase 2**: Bidirectional
- [ ] Create events from tasks ("Schedule writing block")
- [ ] Update events when tasks change
- [ ] Stable external ID mapping
- [ ] Conflict detection

**Schema Addition**:
```sql
CREATE TABLE calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  provider TEXT DEFAULT 'google',
  access_token TEXT, -- encrypted
  refresh_token TEXT, -- encrypted
  token_expires_at TIMESTAMPTZ,
  selected_calendars JSONB, -- array of calendar IDs
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE calendar_events_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  external_id TEXT NOT NULL,
  calendar_id TEXT,
  summary TEXT,
  description TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT FALSE,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, external_id)
);
```

---

### F. Personnel Module

**Current State**: Basic `personnel` table with roles, funding, 1:1 tracking

**Enhancements**:
- [ ] Onboarding templates (role-based checklists)
- [ ] Training progress tracking
- [ ] Skills/certification matrix
- [ ] Workload visualization (tasks + calendar)
- [ ] 1:1 notes with action item extraction

**Schema Additions**:
```sql
CREATE TABLE onboarding_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  role TEXT NOT NULL, -- 'phd', 'postdoc', 'undergrad', 'staff'
  name TEXT NOT NULL,
  checklist JSONB, -- array of {item, category, required, due_offset_days}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  personnel_id TEXT REFERENCES personnel(id),
  template_id UUID REFERENCES onboarding_templates(id),
  checklist_status JSONB, -- array of {item_id, completed, completed_at}
  started_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE training_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  name TEXT NOT NULL, -- 'IACUC Training', 'Lab Safety', 'R Basics'
  category TEXT,
  required_for TEXT[], -- roles that need this
  renewal_months INTEGER, -- null if one-time
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE training_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  personnel_id TEXT NOT NULL,
  training_id UUID REFERENCES training_items(id),
  completed_at DATE,
  expires_at DATE,
  certificate_url TEXT
);
```

---

## 4. Cross-Cutting Platform Features

### Global Search
- [ ] Full-text search (Postgres `tsvector`) across tasks, projects, people, grants
- [ ] Semantic search via embeddings (Phase 2)
- [ ] Filter by type, workspace, date range
- [ ] Keyboard shortcut: `/` (✅ exists)

### Notifications
- [ ] In-app notification center
- [ ] Email digests (daily/weekly, configurable)
- [ ] Alert types:
  - Deadline approaching (tasks, grants)
  - Overdue items
  - Milestone due
  - Grant watchlist updates
  - @mentions

### Audit Log
```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID,
  user_id UUID,
  action TEXT, -- 'create', 'update', 'delete'
  entity_type TEXT, -- 'task', 'project', 'personnel'
  entity_id TEXT,
  changes JSONB, -- {field: {old, new}}
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Accessibility (WCAG 2.1 AA)
- [x] Keyboard navigation (shortcuts exist)
- [ ] Focus management in modals
- [ ] ARIA labels on all interactive elements
- [ ] Color contrast compliance (4.5:1 minimum)
- [ ] Screen reader announcements for dynamic content
- [ ] Skip links

---

## 5. AI System Design

### Interaction Patterns

1. **Command Bar** (extend existing quick add):
   ```
   /summarize project
   /extract tasks from [pasted text]
   /draft outline for [grant]
   /suggest priority
   ```

2. **Inline Suggestions**:
   - Priority badge suggestions on new tasks
   - Due date suggestions based on similar tasks
   - "Did you mean to assign this to [person]?"

3. **Copilot Chat** (scoped contexts):
   - "This workspace" - search all workspace data
   - "This project" - focus on single project
   - "This document" - analyze uploaded file

4. **Background Agents** (opt-in):
   - Weekly status digest emails
   - Grant alert from saved searches
   - Deadline risk detection + Slack/email alerts

### AI Actions Table
```sql
CREATE TABLE ai_actions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID,
  user_id UUID,
  action_type TEXT, -- 'extract_tasks', 'summarize', 'draft', 'suggest'
  input_context JSONB, -- what was provided
  output JSONB, -- what AI generated
  accepted BOOLEAN,
  feedback TEXT, -- optional user feedback
  model TEXT, -- 'claude-3-sonnet', etc.
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Guardrails
- All AI outputs are drafts requiring user acceptance
- Show provenance (which docs/events informed the answer)
- Workspace-level controls:
  - Enable/disable AI per module
  - Data retention policy for prompts/outputs
- Rate limiting per user/workspace
- No training on user data without explicit consent

---

## 6. Technical Architecture

### 2025 Tech Stack Rationale

Based on current industry trends and best practices:

| Layer | Technology | Why |
|-------|------------|-----|
| **Language** | TypeScript | Most-used language on GitHub (2025), end-to-end type safety |
| **Frontend** | Next.js 14 (App Router) | React-based, SSR/SSG, API routes, easy Vercel deployment |
| **Styling** | Tailwind CSS + shadcn/ui | Fast iteration, accessible Radix primitives |
| **State** | TanStack Query + Zustand | Server-state caching + lightweight client state |
| **Validation** | Zod | Runtime validation + TypeScript inference |
| **Database** | Supabase (Postgres + pgvector) | Auth, Storage, Realtime, Edge Functions, semantic search |
| **API Pattern** | tRPC or REST + OpenAPI | End-to-end types (tRPC) or max interop (REST) |
| **AI Services** | Python + FastAPI | Doc parsing, embeddings, ML pipelines |
| **Testing** | Playwright (E2E) + Vitest | Comprehensive coverage |
| **CI/CD** | GitHub Actions + Vercel | Automated deployments, preview environments |
| **Observability** | Sentry + OpenTelemetry | Error tracking, distributed tracing |

### Recommended Architecture (TypeScript-First)

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
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                        HTTPS + WebSocket (Realtime)
                                  │
┌─────────────────────────────────┼───────────────────────────────────┐
│                           Vercel                                     │
│  ┌──────────────────────────────┼────────────────────────────────┐  │
│  │            Next.js API Routes + Edge Runtime                   │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐ │  │
│  │  │ /api/auth/*    │  │ /api/tasks/*   │  │ /api/ai/*        │ │  │
│  │  │ (NextAuth.js)  │  │ (CRUD)         │  │ (proxy to Python)│ │  │
│  │  └────────────────┘  └────────────────┘  └──────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────┼───────────────────────────────────┐
│                         Supabase Platform                            │
│  ┌──────────────────────────────┴────────────────────────────────┐  │
│  │                    PostgreSQL + pgvector                       │  │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │  │
│  │  │ workspaces       │  │ tasks            │  │ projects     │ │  │
│  │  │ workspace_members│  │ task_assignees   │  │ milestones   │ │  │
│  │  └──────────────────┘  └──────────────────┘  └──────────────┘ │  │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │  │
│  │  │ funding_         │  │ calendar_        │  │ embeddings   │ │  │
│  │  │ opportunities    │  │ events_cache     │  │ (vector)     │ │  │
│  │  └──────────────────┘  └──────────────────┘  └──────────────┘ │  │
│  │                                                                │  │
│  │  Row Level Security (workspace_id + role-based policies)       │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                  Supabase Edge Functions (Deno)                 │  │
│  │  - grants-ingest (Grants.gov polling)                          │  │
│  │  - calendar-sync (Google Calendar webhook handler)             │  │
│  │  - digest-email (weekly summaries)                             │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│  │  Supabase Auth  │  │ Supabase Storage│  │ Supabase Realtime   │  │
│  │  + Google OAuth │  │ (PDFs, files)   │  │ (live updates)      │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────┘  │
└───────────────────────────────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────┼───────────────────────────────────┐
│                    Python AI Microservice                            │
│  ┌──────────────────────────────┴────────────────────────────────┐  │
│  │                  FastAPI + Docker                              │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐ │  │
│  │  │ /extract-tasks │  │ /embed         │  │ /fit-score       │ │  │
│  │  │ (LLM parsing)  │  │ (OpenAI embed) │  │ (grant matching) │ │  │
│  │  └────────────────┘  └────────────────┘  └──────────────────┘ │  │
│  │  ┌────────────────┐  ┌────────────────┐                       │  │
│  │  │ /summarize     │  │ /draft-outline │                       │  │
│  │  │ (project status│  │ (grant writing)│                       │  │
│  │  └────────────────┘  └────────────────┘                       │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                          Deployed on: Railway / Fly.io / Cloud Run   │
└───────────────────────────────────────────────────────────────────────┘
```

### Project Structure (Monorepo with Turborepo)

```
scholaros/
├── apps/
│   └── web/                          # Next.js 14 Application
│       ├── app/
│       │   ├── (auth)/               # Auth routes (login, signup, invite)
│       │   │   ├── login/page.tsx
│       │   │   ├── signup/page.tsx
│       │   │   └── invite/[token]/page.tsx
│       │   ├── (dashboard)/          # Protected dashboard routes
│       │   │   ├── layout.tsx        # Sidebar + workspace switcher
│       │   │   ├── page.tsx          # Today view (default)
│       │   │   ├── upcoming/page.tsx
│       │   │   ├── board/page.tsx    # Kanban
│       │   │   ├── calendar/page.tsx
│       │   │   ├── projects/
│       │   │   │   ├── page.tsx      # Project list
│       │   │   │   └── [id]/page.tsx # Project detail
│       │   │   ├── grants/
│       │   │   │   ├── page.tsx      # Grant discovery
│       │   │   │   └── watchlist/page.tsx
│       │   │   ├── personnel/page.tsx
│       │   │   └── settings/page.tsx
│       │   ├── api/                  # API routes
│       │   │   ├── auth/[...nextauth]/route.ts
│       │   │   ├── tasks/route.ts
│       │   │   ├── projects/route.ts
│       │   │   ├── ai/
│       │   │   │   ├── extract/route.ts
│       │   │   │   └── summarize/route.ts
│       │   │   └── webhooks/
│       │   │       └── calendar/route.ts
│       │   └── layout.tsx            # Root layout
│       ├── components/
│       │   ├── ui/                   # shadcn/ui components
│       │   │   ├── button.tsx
│       │   │   ├── dialog.tsx
│       │   │   ├── dropdown-menu.tsx
│       │   │   └── ...
│       │   ├── tasks/
│       │   │   ├── task-card.tsx
│       │   │   ├── task-list.tsx
│       │   │   ├── task-kanban.tsx
│       │   │   └── quick-add.tsx
│       │   ├── projects/
│       │   ├── grants/
│       │   └── layout/
│       │       ├── sidebar.tsx
│       │       ├── workspace-switcher.tsx
│       │       └── command-palette.tsx
│       ├── lib/
│       │   ├── supabase/
│       │   │   ├── client.ts         # Browser client
│       │   │   ├── server.ts         # Server client
│       │   │   └── middleware.ts     # Auth middleware
│       │   ├── utils.ts
│       │   └── constants.ts
│       ├── hooks/
│       │   ├── use-tasks.ts          # TanStack Query hooks
│       │   ├── use-projects.ts
│       │   ├── use-workspace.ts
│       │   └── use-realtime.ts
│       ├── stores/
│       │   └── ui-store.ts           # Zustand for UI state
│       ├── tailwind.config.ts
│       ├── next.config.js
│       └── package.json
│
├── packages/
│   ├── shared/                       # Shared across apps
│   │   ├── types/
│   │   │   ├── task.ts
│   │   │   ├── project.ts
│   │   │   ├── workspace.ts
│   │   │   └── index.ts
│   │   ├── schemas/                  # Zod schemas
│   │   │   ├── task.schema.ts
│   │   │   ├── project.schema.ts
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   ├── date.ts
│   │   │   ├── quick-add-parser.ts   # Port existing parser
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── database/                     # Database types + migrations
│       ├── types/
│       │   └── supabase.ts           # Generated from schema
│       ├── migrations/
│       │   ├── 001_initial_schema.sql
│       │   ├── 002_add_workspaces.sql
│       │   ├── 003_add_projects.sql
│       │   └── ...
│       └── package.json
│
├── services/
│   └── ai/                           # Python AI microservice
│       ├── app/
│       │   ├── main.py               # FastAPI app
│       │   ├── routers/
│       │   │   ├── extract.py        # Task extraction
│       │   │   ├── embed.py          # Embeddings
│       │   │   ├── summarize.py      # Summaries
│       │   │   └── grants.py         # Grant fit scoring
│       │   ├── services/
│       │   │   ├── llm.py            # Claude/OpenAI abstraction
│       │   │   └── embeddings.py
│       │   └── models/
│       │       └── schemas.py        # Pydantic models
│       ├── Dockerfile
│       ├── requirements.txt
│       └── pyproject.toml
│
├── supabase/
│   ├── functions/                    # Edge Functions (Deno)
│   │   ├── grants-ingest/
│   │   │   └── index.ts
│   │   ├── calendar-sync/
│   │   │   └── index.ts
│   │   └── digest-email/
│   │       └── index.ts
│   ├── migrations/                   # (symlink to packages/database/migrations)
│   └── config.toml
│
├── tests/
│   ├── e2e/                          # Playwright E2E tests
│   │   ├── auth.spec.ts
│   │   ├── tasks.spec.ts
│   │   └── projects.spec.ts
│   └── playwright.config.ts
│
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Lint, type-check, test
│       ├── preview.yml               # Vercel preview deployments
│       └── deploy.yml                # Production deployment
│
├── turbo.json                        # Turborepo config
├── package.json                      # Root package.json
├── pnpm-workspace.yaml
└── docs/
    ├── PRD.md
    ├── ARCHITECTURE.md
    └── API.md
```

### Technology Deep Dive

#### Frontend: Next.js 14 + TypeScript

```typescript
// app/(dashboard)/page.tsx - Today view
import { Suspense } from 'react';
import { TaskList } from '@/components/tasks/task-list';
import { QuickAdd } from '@/components/tasks/quick-add';
import { getTodayTasks } from '@/lib/supabase/server';

export default async function TodayPage() {
  const tasks = await getTodayTasks();

  return (
    <div className="flex flex-col gap-4">
      <QuickAdd />
      <Suspense fallback={<TaskListSkeleton />}>
        <TaskList initialTasks={tasks} filter="today" />
      </Suspense>
    </div>
  );
}
```

#### State Management: TanStack Query + Zustand

```typescript
// hooks/use-tasks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { Task } from '@scholaros/shared/types';

export function useTasks(workspaceId: string) {
  return useQuery({
    queryKey: ['tasks', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('due', { ascending: true });
      if (error) throw error;
      return data as Task[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task: Partial<Task>) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert(task)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['tasks', variables.workspace_id]
      });
    },
  });
}

// stores/ui-store.ts - Zustand for UI state
import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  currentView: 'today' | 'upcoming' | 'board' | 'calendar';
  commandPaletteOpen: boolean;
  toggleSidebar: () => void;
  setView: (view: UIState['currentView']) => void;
  toggleCommandPalette: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  currentView: 'today',
  commandPaletteOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setView: (view) => set({ currentView: view }),
  toggleCommandPalette: () => set((s) => ({
    commandPaletteOpen: !s.commandPaletteOpen
  })),
}));
```

#### Validation: Zod Schemas

```typescript
// packages/shared/schemas/task.schema.ts
import { z } from 'zod';

export const TaskPriority = z.enum(['p1', 'p2', 'p3', 'p4']);
export const TaskStatus = z.enum(['todo', 'progress', 'done']);
export const TaskCategory = z.enum([
  'research', 'teaching', 'grants',
  'grad-mentorship', 'undergrad-mentorship', 'admin', 'misc'
]);

export const TaskSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  status: TaskStatus.default('todo'),
  priority: TaskPriority.default('p3'),
  category: TaskCategory.default('misc'),
  due: z.coerce.date().optional(),
  assignees: z.array(z.string().uuid()).default([]),
  project_id: z.string().uuid().optional(),
  tags: z.array(z.string()).default([]),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export const CreateTaskSchema = TaskSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});

export type Task = z.infer<typeof TaskSchema>;
export type CreateTask = z.infer<typeof CreateTaskSchema>;
```

#### AI Service: Python + FastAPI

```python
# services/ai/app/main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from anthropic import Anthropic

app = FastAPI(title="ScholarOS AI Service")
client = Anthropic()

class ExtractTasksRequest(BaseModel):
    text: str
    workspace_context: dict | None = None

class ExtractedTask(BaseModel):
    title: str
    priority: str | None = None
    due_date: str | None = None
    category: str | None = None

@app.post("/extract-tasks", response_model=list[ExtractedTask])
async def extract_tasks(request: ExtractTasksRequest):
    """Extract actionable tasks from unstructured text."""

    prompt = f"""Extract actionable tasks from this text.
Return as JSON array with: title, priority (p1-p4), due_date (ISO format), category.

Text:
{request.text}

Return only valid JSON array, no explanation."""

    message = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}]
    )

    try:
        tasks = json.loads(message.content[0].text)
        return [ExtractedTask(**t) for t in tasks]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse: {e}")


@app.post("/fit-score")
async def score_grant_fit(
    opportunity: dict,
    research_profile: dict
) -> dict:
    """Score how well a grant opportunity matches researcher profile."""

    prompt = f"""Score this grant opportunity's fit for the researcher (0-100).

Grant: {json.dumps(opportunity)}
Researcher Profile: {json.dumps(research_profile)}

Return JSON: {{"score": int, "reasons": [str], "gaps": [str]}}"""

    message = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}]
    )

    return json.loads(message.content[0].text)
```

### Testing Strategy

```typescript
// tests/e2e/tasks.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Task Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to dashboard
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('quick add creates task with parsed attributes', async ({ page }) => {
    const quickAdd = page.getByPlaceholder('Add task...');
    await quickAdd.fill('Review paper draft fri #research p1');
    await quickAdd.press('Enter');

    // Verify task appears
    const task = page.getByText('Review paper draft');
    await expect(task).toBeVisible();

    // Verify attributes
    await expect(page.getByTestId('priority-p1')).toBeVisible();
    await expect(page.getByTestId('category-research')).toBeVisible();
  });

  test('kanban drag and drop updates status', async ({ page }) => {
    await page.goto('/board');

    const task = page.getByText('Test task').first();
    const doneColumn = page.getByTestId('column-done');

    await task.dragTo(doneColumn);

    await expect(task).toHaveAttribute('data-status', 'done');
  });
});
```

### CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm test

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps
      - run: pnpm test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         GitHub Repository                            │
│  ┌───────────────────┐                                              │
│  │  Push to main     │                                              │
│  │  or PR created    │                                              │
│  └─────────┬─────────┘                                              │
└────────────┼────────────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────┐     ┌────────────────────────────────────┐
│    GitHub Actions      │     │           Vercel                    │
│  ┌──────────────────┐  │     │  ┌────────────────────────────────┐│
│  │ Lint + Typecheck │  │     │  │  Automatic Preview Deployments ││
│  │ Unit Tests       │  │────▶│  │  (every PR gets a URL)         ││
│  │ E2E Tests        │  │     │  └────────────────────────────────┘│
│  └──────────────────┘  │     │  ┌────────────────────────────────┐│
└────────────────────────┘     │  │  Production Deployment         ││
                               │  │  (on merge to main)            ││
                               │  │  → scholaros.vercel.app        ││
                               │  └────────────────────────────────┘│
                               └────────────────────────────────────┘
                                              │
                               ┌──────────────┴──────────────┐
                               ▼                              ▼
                    ┌──────────────────┐          ┌──────────────────┐
                    │    Supabase      │          │   Railway/Fly    │
                    │  (Production)    │          │  (AI Service)    │
                    │                  │          │                  │
                    │ - PostgreSQL     │          │ - FastAPI        │
                    │ - Auth           │          │ - Python 3.11    │
                    │ - Storage        │          │ - Docker         │
                    │ - Edge Functions │          │                  │
                    │ - Realtime       │          │                  │
                    └──────────────────┘          └──────────────────┘
```

### Migration Path (From Current to Target)

| Phase | Duration | Focus |
|-------|----------|-------|
| **0** | Complete | Current vanilla JS app works |
| **1** | 2 weeks | Set up Next.js project, port existing UI |
| **2** | 2 weeks | Add TanStack Query, Zustand, port database.js |
| **3** | 2 weeks | Add workspace support, update Supabase schema |
| **4** | 2 weeks | Deploy Python AI service, integrate |
| **5** | Ongoing | Feature development on new stack |

**Key Migration Principle**: Port existing functionality first (quick add parser, task views, paper pipeline), then add new features (workspaces, AI, calendar sync).

---

## 7. Data Model Summary

### Core Tables (Existing + New)

```
TENANCY (NEW)
├── workspaces
├── workspace_members (user_id, workspace_id, role)
└── workspace_invites

USERS (EXISTS)
├── profiles (extend with workspace preferences)
└── settings

TASKS (EXISTS - EXTEND)
├── tasks (add workspace_id, project_id, assignees)
├── task_comments (NEW)
└── task_activity (NEW)

PROJECTS (NEW - UNIFIES papers + grants)
├── projects (type: manuscript/grant/general)
├── project_members
├── project_milestones
└── project_notes

GRANTS (EXTEND)
├── grants → migrate to projects
├── funding_opportunities (NEW - from APIs)
├── saved_searches (NEW)
└── opportunity_watchlist (NEW)

CALENDAR (NEW)
├── calendar_connections
└── calendar_events_cache

PERSONNEL (EXISTS - EXTEND)
├── personnel (add workspace_id)
├── onboarding_templates (NEW)
├── onboarding_progress (NEW)
├── training_items (NEW)
└── training_progress (NEW)

AI (NEW)
├── documents
├── document_chunks
├── embeddings (pgvector)
└── ai_actions_log
```

---

## 8. Phased Roadmap

### Phase 0: Foundation (Current State ✅)
- [x] Task management (5 views)
- [x] Quick add with natural language
- [x] Paper pipeline
- [x] Grant tracking
- [x] Personnel roster
- [x] Teaching dashboard
- [x] Supabase integration
- [x] RLS security

### Phase 1: MVP Enhancement (4-6 weeks)
- [ ] Add `workspace_id` to all tables
- [ ] Workspace creation + invite flow
- [ ] Basic RBAC (Owner, Admin, Member)
- [ ] Google Calendar read-only sync
- [ ] Grant discovery: Grants.gov API integration
- [ ] Basic AI: extract tasks from text
- [ ] Basic AI: project status summary

### Phase 2: Collaboration + AI (4-6 weeks)
- [ ] Multi-user task assignment
- [ ] Project comments and activity feed
- [ ] Unified Projects model (migrate papers + grants)
- [ ] AI: grant fit scoring
- [ ] AI: draft grant outlines
- [ ] Notifications system
- [ ] Calendar bidirectional sync

### Phase 3: Scale + Polish (4-6 weeks)
- [ ] Personnel onboarding templates
- [ ] Training tracking
- [ ] Advanced search (semantic)
- [ ] Weekly digest emails
- [ ] Audit logging
- [ ] WCAG compliance audit
- [ ] Performance optimization

### Phase 4: Differentiation (Future)
- [ ] Agentic workflows (deadline risk auto-detection)
- [ ] NSF/NIH award intelligence
- [ ] Multi-institution teams
- [ ] SSO (SAML/OIDC for universities)
- [ ] Analytics dashboards
- [ ] Mobile app (React Native)

---

## 9. Security & Compliance

### Data Protection
- [x] RLS on all tables (exists)
- [ ] Encrypt OAuth tokens at rest
- [ ] Workspace-level data isolation
- [ ] Regular token rotation

### Privacy Controls
- [ ] User data export (GDPR compliance)
- [ ] Account deletion flow
- [ ] Workspace data retention settings
- [ ] AI data usage consent

### Audit
- [ ] Comprehensive audit log
- [ ] Admin audit dashboard
- [ ] Retention policy (90 days default)

---

## 10. Implementation Checklist

### Immediate Next Steps

1. **Schema Migration**: Add workspace support
   ```sql
   ALTER TABLE tasks ADD COLUMN workspace_id UUID;
   ALTER TABLE papers ADD COLUMN workspace_id UUID;
   -- ... repeat for all tables
   ```

2. **Create Workspace Tables**: Run new migration

3. **Update RLS Policies**: From user-based to workspace-based

4. **Build Workspace UI**:
   - Workspace switcher in sidebar
   - Create workspace modal
   - Invite members flow

5. **Calendar OAuth**: Complete Google Calendar integration

6. **Grants.gov Integration**: Edge function for API polling

7. **AI Service Layer**: Abstract provider for Claude/OpenAI

### File Changes Required

| File | Changes |
|------|---------|
| `server/schema.sql` | Add workspace tables, modify existing tables |
| `public/js/database.js` | Add workspace context to all queries |
| `public/js/app.js` | Add workspace switcher, modify data loading |
| `public/index.html` | Add workspace UI elements |
| `server/index.js` | Add workspace routes, complete OAuth |

---

## Appendix: API References

### Grants.gov
- Search API: `https://www.grants.gov/grantsws/rest/opportunities/search`
- Documentation: https://www.grants.gov/web-service-api

### NIH RePORTER
- API v2: `https://api.reporter.nih.gov/v2/projects/search`
- Documentation: https://api.reporter.nih.gov/

### NSF Award Search
- API: `https://www.nsf.gov/awardsearch/`
- Documentation: https://www.nsf.gov/developer/

### Google Calendar
- Scopes needed: `calendar.readonly` (Phase 1), `calendar.events` (Phase 2)
- Documentation: https://developers.google.com/calendar/api

---

*Last updated: December 2024*
*Version: 2.0 (incorporating existing ProfDash implementation)*
