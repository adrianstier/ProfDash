# ScholarOS Execution Plan

## Executive Summary

This plan migrates ProfDash from a vanilla JS prototype to a production-ready TypeScript application with multi-tenancy and AI features. The approach prioritizes **working software at every stage** - the current prototype continues serving users while v2 is built in parallel.

---

## Strategic Principles

1. **Ship incrementally** - Each phase produces deployable, usable software
2. **Preserve what works** - Port proven UX patterns (quick add, views) directly
3. **Build the foundation first** - Get TypeScript + Supabase right before adding features
4. **Test as you go** - Every feature ships with tests
5. **Parallel development** - v1 prototype stays live until v2 is ready

---

## Phase Overview

```
Phase 0: Project Setup (Week 1)
    └── Monorepo, tooling, CI/CD

Phase 1: Core UI Port (Weeks 2-3)
    └── Next.js shell, authentication, basic layout

Phase 2: Task System (Weeks 4-5)
    └── Tasks CRUD, views, quick add parser

Phase 3: Multi-Tenancy (Weeks 6-7)
    └── Workspaces, invites, RBAC, RLS

Phase 4: Projects & Content (Weeks 8-9)
    └── Unified projects, papers, grants migration

Phase 5: External Integrations (Weeks 10-11)
    └── Google Calendar, Grants.gov API

Phase 6: AI Features (Weeks 12-14)
    └── Python service, task extraction, summaries

Phase 7: Polish & Launch (Weeks 15-16)
    └── Performance, accessibility, migration tooling
```

---

## Phase 0: Project Setup (Week 1)

### Goals
- [ ] Monorepo structure with Turborepo
- [ ] CI/CD pipeline with GitHub Actions + Vercel
- [ ] Development environment documentation
- [ ] Supabase project configured

### Tasks

#### 0.1 Initialize Monorepo
```bash
# Create new directory structure alongside existing
mkdir -p scholaros/{apps,packages,services,supabase,tests,docs}
cd scholaros

# Initialize pnpm workspace
pnpm init
```

**Files to create:**
- `package.json` (root)
- `pnpm-workspace.yaml`
- `turbo.json`
- `.gitignore`
- `.nvmrc` (Node 20)
- `.env.example`

#### 0.2 Set Up Next.js App
```bash
cd apps
pnpm create next-app@latest web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

**Configure:**
- `next.config.js` - Turbopack, env vars
- `tailwind.config.ts` - Custom theme
- `tsconfig.json` - Path aliases

#### 0.3 Install Core Dependencies
```bash
# In apps/web
pnpm add @supabase/supabase-js @supabase/ssr
pnpm add @tanstack/react-query zustand zod
pnpm add -D vitest @playwright/test

# shadcn/ui setup
pnpm dlx shadcn@latest init
```

#### 0.4 Set Up Shared Packages
```bash
# packages/shared
mkdir -p packages/shared/{types,schemas,utils}
cd packages/shared && pnpm init

# packages/database
mkdir -p packages/database/{types,migrations}
cd packages/database && pnpm init
```

#### 0.5 Configure CI/CD

**`.github/workflows/ci.yml`:**
```yaml
name: CI
on: [push, pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
```

**Vercel Setup:**
- Connect GitHub repo
- Configure build command: `cd apps/web && pnpm build`
- Set environment variables

#### 0.6 Supabase Project Setup
- [ ] Create new Supabase project (or use existing)
- [ ] Enable pgvector extension
- [ ] Configure Auth providers (Email, Google OAuth)
- [ ] Set up Storage buckets
- [ ] Generate TypeScript types: `supabase gen types typescript`

### Deliverables
- [ ] Empty Next.js app deploys to Vercel
- [ ] CI passes on all PRs
- [ ] Supabase connected and generating types
- [ ] Team can run `pnpm dev` locally

### Definition of Done
- Green CI badge
- Vercel preview URL works
- Supabase dashboard shows connected project

---

## Phase 1: Core UI Port (Weeks 2-3)

### Goals
- [ ] Authentication flow (login, signup, logout)
- [ ] App shell (sidebar, header, layout)
- [ ] Route structure matching PRD
- [ ] Basic component library (shadcn/ui)

### Tasks

#### 1.1 Authentication
**Files:**
- `apps/web/lib/supabase/client.ts`
- `apps/web/lib/supabase/server.ts`
- `apps/web/lib/supabase/middleware.ts`
- `apps/web/app/(auth)/login/page.tsx`
- `apps/web/app/(auth)/signup/page.tsx`
- `apps/web/middleware.ts`

**Functionality:**
- [ ] Email/password login
- [ ] Email/password signup
- [ ] Logout
- [ ] Protected route middleware
- [ ] Session persistence

#### 1.2 App Shell Layout
**Files:**
- `apps/web/app/(dashboard)/layout.tsx`
- `apps/web/components/layout/sidebar.tsx`
- `apps/web/components/layout/header.tsx`
- `apps/web/components/layout/mobile-nav.tsx`

**Port from existing:**
- Sidebar navigation structure
- Section grouping (Tasks, Research, Lab, Teaching)
- Mobile responsive behavior

#### 1.3 shadcn/ui Components
```bash
pnpm dlx shadcn@latest add button card dialog dropdown-menu input label
pnpm dlx shadcn@latest add popover calendar command badge avatar
pnpm dlx shadcn@latest add table tabs toast tooltip
```

#### 1.4 Route Structure
```
app/
├── (auth)/
│   ├── login/page.tsx
│   └── signup/page.tsx
├── (dashboard)/
│   ├── layout.tsx
│   ├── page.tsx              # Today view
│   ├── upcoming/page.tsx
│   ├── board/page.tsx
│   ├── list/page.tsx
│   ├── calendar/page.tsx
│   ├── projects/page.tsx
│   ├── grants/page.tsx
│   ├── personnel/page.tsx
│   ├── teaching/page.tsx
│   └── settings/page.tsx
```

#### 1.5 Zustand UI Store
**File:** `apps/web/stores/ui-store.ts`
```typescript
interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  currentFilter: string | null;
}
```

### Deliverables
- [ ] User can sign up, log in, log out
- [ ] Dashboard shell renders with navigation
- [ ] All routes accessible (empty content)
- [ ] Mobile responsive

### Definition of Done
- Lighthouse accessibility score > 90
- All routes protected (redirect to login if not authenticated)
- No TypeScript errors

---

## Phase 2: Task System (Weeks 4-5)

### Goals
- [ ] Full task CRUD with Supabase
- [ ] All 5 task views ported
- [ ] Quick add parser in TypeScript
- [ ] Optimistic UI updates
- [ ] Keyboard shortcuts

### Tasks

#### 2.1 Database Schema (Tasks)
**File:** `packages/database/migrations/001_tasks.sql`
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'misc',
  priority TEXT DEFAULT 'p3',
  status TEXT DEFAULT 'todo',
  due DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own tasks" ON tasks
  FOR ALL USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX idx_tasks_user_due ON tasks(user_id, due);
```

#### 2.2 Zod Schemas
**File:** `packages/shared/schemas/task.schema.ts`
```typescript
import { z } from 'zod';

export const TaskPriority = z.enum(['p1', 'p2', 'p3', 'p4']);
export const TaskStatus = z.enum(['todo', 'progress', 'done']);
export const TaskCategory = z.enum([
  'research', 'teaching', 'grants',
  'grad-mentorship', 'undergrad-mentorship', 'admin', 'misc'
]);

export const TaskSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string().min(1).max(500),
  description: z.string().nullable(),
  category: TaskCategory,
  priority: TaskPriority,
  status: TaskStatus,
  due: z.coerce.date().nullable(),
  completed_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export const CreateTaskSchema = TaskSchema.pick({
  title: true,
  description: true,
  category: true,
  priority: true,
  due: true,
});

export type Task = z.infer<typeof TaskSchema>;
export type CreateTask = z.infer<typeof CreateTaskSchema>;
```

#### 2.3 TanStack Query Hooks
**File:** `apps/web/hooks/use-tasks.ts`
```typescript
export function useTasks(filter?: TaskFilter) {
  return useQuery({
    queryKey: ['tasks', filter],
    queryFn: () => fetchTasks(filter),
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTask,
    onMutate: async (newTask) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previous = queryClient.getQueryData(['tasks']);
      queryClient.setQueryData(['tasks'], (old) => [...old, { ...newTask, id: 'temp' }]);
      return { previous };
    },
    onError: (err, newTask, context) => {
      queryClient.setQueryData(['tasks'], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
```

#### 2.4 Quick Add Parser
**File:** `packages/shared/utils/quick-add-parser.ts`

Port the existing parser from `app.js` with TypeScript types:
```typescript
interface ParsedTask {
  title: string;
  priority?: 'p1' | 'p2' | 'p3' | 'p4';
  category?: TaskCategory;
  due?: Date;
}

export function parseQuickAdd(input: string): ParsedTask {
  // Port existing logic from app.js parseQuickAdd function
}
```

#### 2.5 Task Views

| View | File | Key Features |
|------|------|--------------|
| Today | `page.tsx` | Filter due <= today, progress bar |
| Upcoming | `upcoming/page.tsx` | 14-day timeline, grouped by date |
| Board | `board/page.tsx` | Kanban columns, drag-and-drop |
| List | `list/page.tsx` | Table with sorting |
| Calendar | `calendar/page.tsx` | Month grid, task dots |

**Components:**
- `components/tasks/task-card.tsx`
- `components/tasks/task-list.tsx`
- `components/tasks/task-kanban.tsx`
- `components/tasks/quick-add.tsx`
- `components/tasks/task-modal.tsx`

#### 2.6 Keyboard Shortcuts
**File:** `apps/web/hooks/use-keyboard-shortcuts.ts`

| Key | Action |
|-----|--------|
| `q` | Focus quick add |
| `n` | New task modal |
| `1-5` | Switch views |
| `/` | Focus search |
| `Esc` | Close modals |

### Deliverables
- [ ] Create, read, update, delete tasks
- [ ] All 5 views functional
- [ ] Quick add parses priority, category, date
- [ ] Drag-and-drop in Kanban
- [ ] Keyboard shortcuts work

### Definition of Done
- E2E tests pass for task CRUD
- Quick add parser has 100% unit test coverage
- Performance: task list renders < 100ms

---

## Phase 3: Multi-Tenancy (Weeks 6-7)

### Goals
- [ ] Workspace creation and management
- [ ] Invite flow (magic links)
- [ ] Role-based access control
- [ ] Workspace-scoped RLS policies

### Tasks

#### 3.1 Database Schema (Workspaces)
**File:** `packages/database/migrations/002_workspaces.sql`
```sql
-- Workspaces
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspace Members
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'limited')),
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- Workspace Invites
CREATE TABLE workspace_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  invited_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add workspace_id to tasks
ALTER TABLE tasks ADD COLUMN workspace_id UUID REFERENCES workspaces(id);
CREATE INDEX idx_tasks_workspace ON tasks(workspace_id);

-- RLS for workspaces
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invites ENABLE ROW LEVEL SECURITY;

-- Helper function
CREATE OR REPLACE FUNCTION user_workspace_role(ws_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM workspace_members
  WHERE workspace_id = ws_id AND user_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER;

-- Workspace members can view their workspaces
CREATE POLICY "Members can view workspace" ON workspaces
  FOR SELECT USING (
    id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

-- Task policies updated for workspace
DROP POLICY IF EXISTS "Users can CRUD own tasks" ON tasks;
CREATE POLICY "Workspace members can view tasks" ON tasks
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Members can create tasks" ON tasks
  FOR INSERT WITH CHECK (
    user_workspace_role(workspace_id) IN ('owner', 'admin', 'member')
  );
```

#### 3.2 Workspace UI

**Pages:**
- `app/(dashboard)/settings/workspace/page.tsx` - Workspace settings
- `app/(dashboard)/settings/members/page.tsx` - Member management
- `app/(auth)/invite/[token]/page.tsx` - Accept invite

**Components:**
- `components/layout/workspace-switcher.tsx`
- `components/workspace/invite-modal.tsx`
- `components/workspace/member-list.tsx`

#### 3.3 Workspace Context
**File:** `apps/web/contexts/workspace-context.tsx`
```typescript
interface WorkspaceContextType {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  switchWorkspace: (id: string) => void;
  isLoading: boolean;
}
```

#### 3.4 Invite Flow
1. Owner/Admin clicks "Invite" → enters email + role
2. System generates token, stores in `workspace_invites`
3. Email sent with magic link `/invite/[token]`
4. Recipient clicks link → if logged in, joins workspace; if not, signup first
5. Token deleted after use or expiry

### Deliverables
- [ ] Create workspace
- [ ] Invite members via email
- [ ] Accept invite flow
- [ ] Workspace switcher in sidebar
- [ ] Tasks scoped to workspace

### Definition of Done
- User A creates workspace, invites User B
- User B accepts, sees shared tasks
- RLS prevents cross-workspace data access

---

## Phase 4: Projects & Content (Weeks 8-9)

### Goals
- [ ] Unified Projects model (manuscripts + grants)
- [ ] Migrate existing papers/grants data
- [ ] Project milestones and notes
- [ ] Link tasks to projects

### Tasks

#### 4.1 Database Schema (Projects)
**File:** `packages/database/migrations/003_projects.sql`
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('manuscript', 'grant', 'general')),
  title TEXT NOT NULL,
  summary TEXT,
  status TEXT DEFAULT 'active',
  stage TEXT,
  due_date DATE,
  owner_id UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE project_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link tasks to projects
ALTER TABLE tasks ADD COLUMN project_id UUID REFERENCES projects(id);
CREATE INDEX idx_tasks_project ON tasks(project_id);

-- RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace members can view projects" ON projects
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );
```

#### 4.2 Project Types Configuration
**File:** `packages/shared/config/project-types.ts`
```typescript
export const PROJECT_STAGES = {
  manuscript: [
    'idea', 'outline', 'drafting', 'internal-review',
    'submission', 'revision', 'accepted', 'published'
  ],
  grant: [
    'discovery', 'fit-assessment', 'intent-loi', 'drafting',
    'internal-routing', 'submission', 'awarded', 'active', 'closeout'
  ],
  general: ['planning', 'active', 'completed', 'archived']
};

export const MANUSCRIPT_METADATA_SCHEMA = z.object({
  journal_target: z.string().optional(),
  coauthors: z.array(z.string()).default([]),
  figures_count: z.number().optional(),
  submission_date: z.coerce.date().optional(),
});

export const GRANT_METADATA_SCHEMA = z.object({
  agency: z.string().optional(),
  mechanism: z.string().optional(),
  amount: z.number().optional(),
  loi_deadline: z.coerce.date().optional(),
});
```

#### 4.3 Project UI

**Pages:**
- `app/(dashboard)/projects/page.tsx` - Project list with type filter
- `app/(dashboard)/projects/[id]/page.tsx` - Project detail view
- `app/(dashboard)/projects/new/page.tsx` - Create project wizard

**Components:**
- `components/projects/project-card.tsx`
- `components/projects/project-stage-badge.tsx`
- `components/projects/milestone-list.tsx`
- `components/projects/linked-tasks.tsx`

#### 4.4 Data Migration Script
**File:** `scripts/migrate-papers-grants.ts`
```typescript
// Migrate existing papers table to projects
async function migratePapers() {
  const papers = await supabase.from('papers').select('*');
  for (const paper of papers.data) {
    await supabase.from('projects').insert({
      workspace_id: getDefaultWorkspace(paper.user_id),
      type: 'manuscript',
      title: paper.title,
      stage: paper.status,
      metadata: {
        authors: paper.authors,
        journal: paper.journal,
        citations: paper.citations,
      }
    });
  }
}
```

### Deliverables
- [ ] Create/edit projects (manuscript, grant, general)
- [ ] Stage progression UI
- [ ] Milestones with due dates
- [ ] Tasks linked to projects
- [ ] Migration script for existing data

### Definition of Done
- Existing papers/grants migrated
- Project detail page shows linked tasks
- Stage changes tracked in activity

---

## Phase 5: External Integrations (Weeks 10-11)

### Goals
- [ ] Google Calendar read sync
- [ ] Grants.gov API integration
- [ ] Grant watchlist functionality

### Tasks

#### 5.1 Google Calendar OAuth
**Files:**
- `apps/web/app/api/auth/google/route.ts` - OAuth initiation
- `apps/web/app/api/auth/google/callback/route.ts` - Token exchange
- `supabase/functions/calendar-sync/index.ts` - Event fetching

**Database:**
```sql
CREATE TABLE calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  selected_calendars TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE calendar_events_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  external_id TEXT NOT NULL,
  calendar_id TEXT,
  summary TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT FALSE,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, external_id)
);
```

**UI:**
- Calendar view shows synced events
- Settings page to connect/disconnect
- Select which calendars to sync

#### 5.2 Grants.gov Integration
**File:** `supabase/functions/grants-ingest/index.ts`
```typescript
// Edge function to fetch from Grants.gov API
Deno.serve(async (req) => {
  const searchParams = await req.json();

  const response = await fetch(
    'https://www.grants.gov/grantsws/rest/opportunities/search',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(searchParams)
    }
  );

  const data = await response.json();

  // Transform and store in funding_opportunities table
  for (const opp of data.oppHits) {
    await supabase.from('funding_opportunities').upsert({
      external_id: opp.id,
      source: 'grants.gov',
      title: opp.title,
      agency: opp.agency,
      deadline: opp.closeDate,
      // ... transform other fields
    });
  }
});
```

**Database:**
```sql
CREATE TABLE funding_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT UNIQUE,
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  agency TEXT,
  mechanism TEXT,
  deadline DATE,
  amount_min DECIMAL,
  amount_max DECIMAL,
  eligibility JSONB,
  description TEXT,
  url TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  name TEXT NOT NULL,
  query JSONB NOT NULL,
  alert_frequency TEXT CHECK (alert_frequency IN ('daily', 'weekly', 'none')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE opportunity_watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  opportunity_id UUID REFERENCES funding_opportunities(id),
  notes TEXT,
  status TEXT DEFAULT 'watching',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**UI:**
- `app/(dashboard)/grants/discover/page.tsx` - Search interface
- `app/(dashboard)/grants/watchlist/page.tsx` - Tracked opportunities
- `components/grants/opportunity-card.tsx`
- `components/grants/search-filters.tsx`

### Deliverables
- [ ] Connect Google Calendar
- [ ] Events display in calendar view
- [ ] Search Grants.gov
- [ ] Save searches with alerts
- [ ] Watchlist functionality

### Definition of Done
- Calendar shows Google events
- Grant search returns relevant results
- Saved search alerts working

---

## Phase 6: AI Features (Weeks 12-14)

### Goals
- [ ] Python FastAPI microservice deployed
- [ ] Task extraction from text
- [ ] Project status summaries
- [ ] Grant fit scoring

### Tasks

#### 6.1 Python Service Setup
**Directory:** `services/ai/`

```
services/ai/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── config.py
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── extract.py
│   │   ├── summarize.py
│   │   └── grants.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── llm.py
│   │   └── embeddings.py
│   └── models/
│       ├── __init__.py
│       └── schemas.py
├── Dockerfile
├── requirements.txt
├── pyproject.toml
└── tests/
```

**requirements.txt:**
```
fastapi==0.109.0
uvicorn==0.27.0
anthropic==0.18.0
openai==1.10.0
pydantic==2.6.0
python-dotenv==1.0.0
httpx==0.26.0
```

**Dockerfile:**
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app/ ./app/
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### 6.2 Task Extraction Endpoint
**File:** `services/ai/app/routers/extract.py`
```python
@router.post("/extract-tasks")
async def extract_tasks(request: ExtractTasksRequest) -> list[ExtractedTask]:
    """Extract actionable tasks from unstructured text."""

    prompt = f"""You are a task extraction assistant for academics.

Extract actionable tasks from this text. For each task:
- title: Clear, actionable description
- priority: p1 (urgent), p2 (high), p3 (medium), p4 (low)
- due_date: If mentioned or implied (ISO format)
- category: research, teaching, grants, grad-mentorship, undergrad-mentorship, admin, misc

Text:
{request.text}

Return JSON array only."""

    response = await llm_service.complete(prompt)
    return parse_tasks(response)
```

#### 6.3 Project Summary Endpoint
**File:** `services/ai/app/routers/summarize.py`
```python
@router.post("/project-summary")
async def summarize_project(request: ProjectSummaryRequest) -> ProjectSummary:
    """Generate weekly status summary for a project."""

    # Fetch project data, recent tasks, notes
    context = await build_project_context(request.project_id)

    prompt = f"""Summarize the current status of this academic project.

Project: {context['project']}
Recent Tasks: {context['tasks']}
Recent Notes: {context['notes']}

Provide:
1. One-paragraph status summary
2. Key accomplishments this week
3. Blockers or risks
4. Suggested next actions"""

    response = await llm_service.complete(prompt)
    return parse_summary(response)
```

#### 6.4 Grant Fit Scoring
**File:** `services/ai/app/routers/grants.py`
```python
@router.post("/fit-score")
async def score_grant_fit(request: FitScoreRequest) -> FitScore:
    """Score how well a grant opportunity matches researcher profile."""

    prompt = f"""Score this grant opportunity's fit for the researcher (0-100).

Grant Opportunity:
{json.dumps(request.opportunity)}

Researcher Profile:
- Keywords: {request.profile['keywords']}
- Recent Projects: {request.profile['projects']}
- Funding History: {request.profile['funding_history']}

Return JSON:
{{
  "score": <0-100>,
  "reasons": ["why it's a good fit"],
  "gaps": ["missing qualifications or concerns"],
  "suggestions": ["how to strengthen application"]
}}"""

    response = await llm_service.complete(prompt)
    return parse_fit_score(response)
```

#### 6.5 Next.js API Proxy
**File:** `apps/web/app/api/ai/[...path]/route.ts`
```typescript
export async function POST(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/');
  const body = await request.json();

  const response = await fetch(`${AI_SERVICE_URL}/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AI_SERVICE_KEY}`,
    },
    body: JSON.stringify(body),
  });

  return Response.json(await response.json());
}
```

#### 6.6 AI UI Components
- `components/ai/extract-tasks-modal.tsx` - Paste text, extract tasks
- `components/ai/project-summary.tsx` - Display generated summary
- `components/ai/fit-score-badge.tsx` - Show grant fit score
- `components/ai/ai-suggestions.tsx` - Inline suggestions

### Deliverables
- [ ] Python service deployed (Railway/Fly.io)
- [ ] Extract tasks from meeting notes
- [ ] Generate project summaries
- [ ] Score grant fit
- [ ] AI actions logged

### Definition of Done
- AI endpoints respond in < 5 seconds
- Extracted tasks can be imported
- 80% of fit scores align with user ratings

---

## Phase 7: Polish & Launch (Weeks 15-16)

### Goals
- [ ] Performance optimization
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Data migration tooling
- [ ] Documentation
- [ ] Launch checklist

### Tasks

#### 7.1 Performance Optimization
- [ ] Implement React Suspense boundaries
- [ ] Add loading skeletons
- [ ] Optimize images with next/image
- [ ] Enable Turbopack
- [ ] Add database indexes for common queries
- [ ] Implement query result caching

**Targets:**
- LCP < 2.5s
- FID < 100ms
- CLS < 0.1
- Task list renders < 100ms

#### 7.2 Accessibility Audit
- [ ] Run axe-core on all pages
- [ ] Test with screen reader (VoiceOver/NVDA)
- [ ] Verify keyboard navigation
- [ ] Check color contrast
- [ ] Add skip links
- [ ] ARIA labels on all interactive elements

#### 7.3 Data Migration Tool
**File:** `scripts/migrate-from-v1.ts`
```typescript
// Tool to migrate data from v1 (localStorage or single-user Supabase)
// to v2 (multi-tenant workspace model)

async function migrateUser(userId: string) {
  // 1. Create default workspace for user
  // 2. Migrate tasks with workspace_id
  // 3. Migrate papers → projects
  // 4. Migrate grants → projects
  // 5. Migrate personnel
  // 6. Migrate settings
}
```

**UI:** Settings page has "Import from ProfDash v1" option

#### 7.4 Documentation
- [ ] Update README.md with new setup instructions
- [ ] API documentation (OpenAPI spec)
- [ ] User guide (Notion/GitBook)
- [ ] Deployment guide for self-hosting

#### 7.5 Launch Checklist
- [ ] All E2E tests pass
- [ ] Lighthouse scores > 90
- [ ] Security audit complete
- [ ] Rate limiting configured
- [ ] Error monitoring (Sentry) active
- [ ] Analytics configured
- [ ] Backup strategy verified
- [ ] Custom domain configured
- [ ] SSL certificate valid
- [ ] Privacy policy and ToS pages

### Deliverables
- [ ] Production-ready application
- [ ] Migration path for existing users
- [ ] Complete documentation
- [ ] Monitoring dashboards

### Definition of Done
- All automated tests pass
- Manual QA sign-off
- Beta users migrated successfully
- Launch announcement ready

---

## Testing Strategy (Ongoing)

### Unit Tests (Vitest)
- Quick add parser
- Zod schemas
- Utility functions
- React hooks

### Integration Tests
- Supabase queries with RLS
- API routes
- TanStack Query mutations

### E2E Tests (Playwright)
- Auth flow
- Task CRUD
- Project management
- Workspace collaboration

### Test Files Structure
```
tests/
├── unit/
│   ├── quick-add-parser.test.ts
│   ├── schemas.test.ts
│   └── utils.test.ts
├── integration/
│   ├── tasks.test.ts
│   ├── projects.test.ts
│   └── workspaces.test.ts
└── e2e/
    ├── auth.spec.ts
    ├── tasks.spec.ts
    ├── projects.spec.ts
    └── collaboration.spec.ts
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Data loss during migration | Backup v1 data, run migration in staging first |
| Performance degradation | Load test with realistic data volumes |
| AI costs spiral | Rate limiting, cost alerts, fallback to simpler models |
| Google OAuth changes | Abstract calendar provider, monitor deprecation notices |
| Grants.gov API instability | Cache responses, graceful degradation |

---

## Success Criteria

### Phase Gates
Each phase must meet criteria before proceeding:

1. **All automated tests pass**
2. **No critical/high severity bugs**
3. **Performance targets met**
4. **Code review approved**
5. **Documentation updated**

### Launch Criteria
- [ ] 10+ beta users successfully migrated
- [ ] < 5 bugs reported per week
- [ ] 99.9% uptime over 2 weeks
- [ ] NPS > 40 from beta users

---

## Resource Requirements

### Team
- 1 Full-stack developer (primary)
- 1 Designer (part-time, UI/UX review)
- AI/ML consultant (Phase 6)

### Infrastructure
- Vercel Pro ($20/month)
- Supabase Pro ($25/month)
- Railway/Fly.io for AI service ($10-50/month)
- Anthropic API credits (~$50-100/month)
- Domain + SSL ($20/year)

### Tools
- GitHub (repo, actions, issues)
- Linear or GitHub Projects (project management)
- Figma (design)
- Notion (documentation)

---

*Last Updated: December 2024*
*Version: 1.0*
