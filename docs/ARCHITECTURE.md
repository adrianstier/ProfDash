# Architecture Document

## Overview

ScholarOS is an AI-native academic operations platform built with a modern TypeScript-first architecture. The system uses **Next.js 15** for the frontend, **Supabase** (PostgreSQL) for the database and authentication, and a **Python FastAPI** microservice for AI features.

---

## Technology Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Frontend** | Next.js (App Router) | 15.1.0 | SSR/SSG, API routes, React Server Components |
| **UI Library** | React | 19.x | Component-based UI |
| **Language** | TypeScript | 5.9.3 | End-to-end type safety |
| **Styling** | Tailwind CSS + shadcn/ui | 3.4.16 | Utility-first CSS, accessible Radix primitives |
| **Server State** | TanStack Query | 5.90.12 | Data fetching, caching, optimistic updates |
| **Client State** | Zustand | 5.0.0 | Lightweight client-side state |
| **Validation** | Zod | 3.23.0 | Runtime validation + TypeScript inference |
| **Database** | Supabase (PostgreSQL + pgvector) | - | Auth, Storage, Realtime, RLS |
| **AI Services** | Python FastAPI + Anthropic | - | Task extraction, summarization, grant scoring |
| **Monorepo** | Turborepo + pnpm | 2.6.3+ | Build orchestration, workspace management |
| **Testing** | Vitest + Playwright | - | Unit and E2E testing |
| **CI/CD** | GitHub Actions + Vercel | - | Automated deployments |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Browser (Client)                                │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    Next.js 15 App Router + TypeScript                  │  │
│  │                                                                        │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────────────┐ │  │
│  │  │  React Server   │  │  Client         │  │  shadcn/ui + Tailwind  │ │  │
│  │  │  Components     │  │  Components     │  │  (Radix primitives)    │ │  │
│  │  └─────────────────┘  └─────────────────┘  └────────────────────────┘ │  │
│  │                                                                        │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────────────┐ │  │
│  │  │  TanStack Query │  │  Zustand        │  │  Zod Validation        │ │  │
│  │  │  (server state) │  │  (client state) │  │  (runtime types)       │ │  │
│  │  └────────┬────────┘  └─────────────────┘  └────────────────────────┘ │  │
│  │           │                                                            │  │
│  │           └──────────────────────┬────────────────────────────────────┤  │
│  │                                  │                                     │  │
│  │                          ┌───────▼───────┐                             │  │
│  │                          │  Supabase JS  │                             │  │
│  │                          │  Client       │                             │  │
│  │                          └───────┬───────┘                             │  │
│  └──────────────────────────────────┼────────────────────────────────────┘  │
└──────────────────────────────────────┼──────────────────────────────────────┘
                                       │
                     ┌─────────────────┼─────────────────┐
                     │                 │                 │
                     ▼                 ▼                 ▼
          ┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐
          │  Next.js API     │  │  Supabase    │  │  Python FastAPI  │
          │  Routes          │  │  Direct      │  │  AI Service      │
          │  /api/*          │  │  (Realtime)  │  │  :8000           │
          └────────┬─────────┘  └──────┬───────┘  └────────┬─────────┘
                   │                   │                   │
                   └───────────────────┼───────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                              Supabase Platform                                │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                        PostgreSQL + pgvector                           │  │
│  │                                                                        │  │
│  │  TENANCY                          CORE DATA                            │  │
│  │  ┌──────────────────────┐        ┌─────────────────────────────────┐  │  │
│  │  │ workspaces           │        │ tasks                           │  │  │
│  │  │ workspace_members    │        │ projects                        │  │  │
│  │  │ workspace_invites    │        │ project_milestones              │  │  │
│  │  └──────────────────────┘        │ project_notes                   │  │  │
│  │                                  │ publications                    │  │  │
│  │  GRANTS                          │ personnel                       │  │  │
│  │  ┌──────────────────────┐        └─────────────────────────────────┘  │  │
│  │  │ funding_opportunities│                                             │  │
│  │  │ saved_searches       │        CALENDAR                             │  │
│  │  │ opportunity_watchlist│        ┌─────────────────────────────────┐  │  │
│  │  └──────────────────────┘        │ calendar_connections            │  │  │
│  │                                  │ calendar_events_cache           │  │  │
│  │  AI / DOCUMENTS                  └─────────────────────────────────┘  │  │
│  │  ┌──────────────────────┐                                             │  │
│  │  │ documents            │        Row Level Security (RLS)             │  │
│  │  │ document_chunks      │        - workspace_id based policies        │  │
│  │  │ ai_actions_log       │        - role-based access control          │  │
│  │  │ agent_executions     │        - user isolation                     │  │
│  │  └──────────────────────┘                                             │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │  Supabase Auth  │  │ Supabase Storage│  │ Supabase Realtime           │  │
│  │  + Google OAuth │  │ (Documents)     │  │ (Live updates)              │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                              External APIs                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │ Grants.gov   │  │ NIH RePORTER │  │ NSF Award    │  │ Google Calendar  │ │
│  │ REST API     │  │ API v2       │  │ Search API   │  │ API              │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────┘ │
│                                                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                        Anthropic Claude API                             │  │
│  │  - Task extraction from text                                            │  │
│  │  - Project summarization                                                │  │
│  │  - Grant fit scoring                                                    │  │
│  │  - Smart suggestions                                                    │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Monorepo Structure

```
scholaros/
├── apps/
│   └── web/                          # Next.js 15 Application
│       ├── app/
│       │   ├── (auth)/               # Auth route group
│       │   │   ├── login/
│       │   │   ├── signup/
│       │   │   └── invite/[token]/
│       │   ├── (dashboard)/          # Protected dashboard route group
│       │   │   ├── layout.tsx        # Sidebar + workspace switcher
│       │   │   ├── today/
│       │   │   ├── upcoming/
│       │   │   ├── board/
│       │   │   ├── list/
│       │   │   ├── calendar/
│       │   │   ├── projects/
│       │   │   ├── publications/
│       │   │   ├── grants/
│       │   │   ├── personnel/
│       │   │   ├── teaching/
│       │   │   └── settings/
│       │   ├── api/                  # API Routes
│       │   │   ├── tasks/
│       │   │   ├── projects/
│       │   │   ├── workspaces/
│       │   │   ├── grants/
│       │   │   ├── calendar/
│       │   │   ├── ai/
│       │   │   └── agents/
│       │   └── auth/callback/
│       ├── components/
│       │   ├── ui/                   # shadcn/ui primitives
│       │   ├── accessibility/
│       │   ├── ai/
│       │   ├── documents/
│       │   ├── grants/
│       │   ├── layout/
│       │   ├── projects/
│       │   ├── publications/
│       │   ├── tasks/
│       │   ├── voice/
│       │   └── workspace/
│       ├── lib/
│       │   ├── supabase/             # Client/server Supabase
│       │   ├── hooks/                # TanStack Query hooks
│       │   ├── stores/               # Zustand stores
│       │   ├── utils.ts
│       │   ├── constants.ts
│       │   └── rate-limit.ts
│       ├── middleware.ts             # Auth middleware
│       └── next.config.ts
│
├── packages/
│   └── shared/                       # Shared library
│       ├── src/
│       │   ├── types/                # TypeScript interfaces
│       │   ├── schemas/              # Zod schemas
│       │   ├── utils/                # Quick-add parser, utilities
│       │   └── config/               # Project stage definitions
│       └── tsup.config.ts
│
├── services/
│   └── ai/                           # Python AI Microservice
│       ├── app/
│       │   ├── main.py               # FastAPI entry point
│       │   ├── config.py
│       │   ├── agents/               # Multi-agent framework
│       │   │   ├── base.py
│       │   │   ├── orchestrator.py
│       │   │   └── specialized/
│       │   ├── models/
│       │   │   └── schemas.py        # Pydantic models
│       │   ├── routers/
│       │   │   ├── extract.py
│       │   │   ├── summarize.py
│       │   │   ├── grants.py
│       │   │   └── agents.py
│       │   └── services/
│       │       └── llm.py            # LLM abstraction
│       ├── requirements.txt
│       └── Dockerfile
│
├── supabase/
│   ├── migrations/                   # SQL migrations
│   └── config.toml                   # Local dev config
│
├── turbo.json                        # Turborepo config
├── pnpm-workspace.yaml
└── package.json
```

---

## Key Design Patterns

### 1. Multi-Tenancy via Workspaces

All data is isolated by workspace using PostgreSQL Row Level Security (RLS).

```sql
-- Every table includes workspace_id
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  -- ... other columns
);

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

**Why RLS over schema-per-tenant?**
- Supabase doesn't support dynamic schemas
- RLS is performant and battle-tested
- Simpler backup/restore
- Works with Supabase Realtime

### 2. Role-Based Access Control (RBAC)

```typescript
// Role hierarchy
type Role = 'owner' | 'admin' | 'member' | 'limited';

// Permission helpers in stores/workspace-store.ts
export function canManageWorkspace(role: Role): boolean {
  return ['owner', 'admin'].includes(role);
}

export function canEditTasks(role: Role): boolean {
  return ['owner', 'admin', 'member'].includes(role);
}

export function canInviteMembers(role: Role): boolean {
  return ['owner', 'admin'].includes(role);
}
```

### 3. State Management Strategy

```typescript
// TanStack Query for server state
const { data: tasks, isLoading } = useQuery({
  queryKey: ['tasks', workspaceId, filters],
  queryFn: () => fetchTasks({ workspace_id: workspaceId, ...filters }),
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// Optimistic updates for mutations
const createTaskMutation = useMutation({
  mutationFn: createTask,
  onMutate: async (newTask) => {
    await queryClient.cancelQueries(['tasks']);
    const previous = queryClient.getQueryData(['tasks']);
    queryClient.setQueryData(['tasks'], (old) => [...old, newTask]);
    return { previous };
  },
  onError: (err, vars, context) => {
    queryClient.setQueryData(['tasks'], context.previous);
  },
});

// Zustand for client-only state
const useUIStore = create((set) => ({
  sidebarOpen: true,
  commandPaletteOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
```

### 4. API Route Pattern

```typescript
// apps/web/app/api/tasks/route.ts
import { createClient } from '@/lib/supabase/server';
import { CreateTaskSchema } from '@scholaros/shared/schemas';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  // 1. Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Rate limit check
  const rateLimit = checkRateLimit(user.id, 'write');
  if (!rateLimit.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // 3. Validate input
  const body = await request.json();
  const result = CreateTaskSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten() },
      { status: 400 }
    );
  }

  // 4. Database operation (RLS handles authorization)
  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...result.data, user_id: user.id })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
```

### 5. Validation with Zod

```typescript
// packages/shared/src/schemas/index.ts
import { z } from 'zod';

export const TaskPrioritySchema = z.enum(['p1', 'p2', 'p3', 'p4']);
export const TaskStatusSchema = z.enum(['todo', 'progress', 'done']);
export const TaskCategorySchema = z.enum([
  'research', 'teaching', 'grants',
  'grad-mentorship', 'undergrad-mentorship', 'admin', 'misc'
]);

export const CreateTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  category: TaskCategorySchema.default('misc'),
  priority: TaskPrioritySchema.default('p3'),
  status: TaskStatusSchema.default('todo'),
  due: z.coerce.date().nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
  workspace_id: z.string().uuid(),
  assignees: z.array(z.string().uuid()).default([]),
  tags: z.array(z.string()).default([]),
});

export type CreateTask = z.infer<typeof CreateTaskSchema>;
```

---

## Database Schema

### Core Tables

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           TENANCY LAYER                                  │
│                                                                          │
│  profiles ─────────┐                                                     │
│  (user data)       │                                                     │
│                    ▼                                                     │
│  workspaces ◄────── workspace_members ◄──── workspace_invites            │
│  (multi-tenant)      (roles: owner/admin/member/limited)                 │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           CORE DATA                                      │
│                                                                          │
│  tasks ◄───────────────────────────────────────────┐                    │
│  (all task views)                                  │                    │
│        │                                           │                    │
│        └──────────────────────────────────────┐    │                    │
│                                               │    │                    │
│  projects ◄──── project_milestones            │    │                    │
│  (manuscript/grant/general)                   │    │                    │
│        │                                      │    │                    │
│        ├──── project_notes                    │    │                    │
│        │                                      │    │                    │
│        └──── project_collaborators ───────────┘    │                    │
│                                                    │                    │
│  personnel ────────────────────────────────────────┘                    │
│  (team members)                                                         │
│                                                                          │
│  publications                                                            │
│  (DOI, citations)                                                        │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        INTEGRATIONS                                      │
│                                                                          │
│  GRANTS                              CALENDAR                            │
│  ┌─────────────────────────┐        ┌────────────────────────────┐      │
│  │ funding_opportunities   │        │ calendar_connections       │      │
│  │ (Grants.gov, NIH, NSF)  │        │ (Google OAuth tokens)      │      │
│  │                         │        │                            │      │
│  │ saved_searches          │        │ calendar_events_cache      │      │
│  │ (alert preferences)     │        │ (synced events)            │      │
│  │                         │        └────────────────────────────┘      │
│  │ opportunity_watchlist   │                                            │
│  │ (user tracking)         │                                            │
│  └─────────────────────────┘                                            │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          AI LAYER                                        │
│                                                                          │
│  documents ◄──── document_chunks                                         │
│  (uploaded files)   (with embeddings, pgvector)                          │
│                                                                          │
│  ai_actions_log                                                          │
│  (action history, feedback, tokens)                                      │
│                                                                          │
│  agent_executions                                                        │
│  (multi-agent logs)                                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Table Definitions

```sql
-- Workspace-based multi-tenancy
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User-workspace association with roles
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'limited')),
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- Tasks with workspace isolation
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'misc',
  priority TEXT DEFAULT 'p3',
  status TEXT DEFAULT 'todo',
  due DATE,
  project_id UUID REFERENCES projects(id),
  assignees UUID[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unified project model
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
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
```

---

## Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Authentication Flow                               │
│                                                                          │
│  1. User visits /login                                                   │
│        │                                                                 │
│        ▼                                                                 │
│  2. Supabase Auth (Email/Password or Google OAuth)                       │
│        │                                                                 │
│        ▼                                                                 │
│  3. JWT token issued, stored in HTTP-only cookie                         │
│        │                                                                 │
│        ▼                                                                 │
│  4. middleware.ts intercepts every request:                              │
│     - Validates session                                                  │
│     - Refreshes expired tokens                                           │
│     - Redirects unauthenticated to /login                                │
│        │                                                                 │
│        ▼                                                                 │
│  5. API routes use createClient() to get authenticated Supabase client   │
│        │                                                                 │
│        ▼                                                                 │
│  6. RLS policies enforce workspace-level access                          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

```typescript
// apps/web/middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => request.cookies.get(name)?.value,
        set: (name, value, options) => {
          response.cookies.set({ name, value, ...options });
        },
        remove: (name, options) => {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  // Redirect unauthenticated users
  if (!session && request.nextUrl.pathname.startsWith('/(dashboard)')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return response;
}
```

---

## AI Service Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       Python AI Microservice                             │
│                         (FastAPI + Anthropic)                            │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                        Agent Framework                             │  │
│  │                                                                    │  │
│  │  ┌─────────────────┐                                               │  │
│  │  │  Orchestrator   │ ◄──── Routes requests to specialized agents   │  │
│  │  └────────┬────────┘                                               │  │
│  │           │                                                        │  │
│  │           ├──────────────────┬──────────────────┬────────────────┐│  │
│  │           ▼                  ▼                  ▼                ▼│  │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  ┌───────┐│  │
│  │  │ TaskAgent   │    │ GrantAgent  │    │ProjectAgent │  │ ...   ││  │
│  │  │             │    │             │    │             │  │       ││  │
│  │  │ - Extract   │    │ - Fit score │    │ - Summarize │  │       ││  │
│  │  │ - Suggest   │    │ - Compare   │    │ - Suggest   │  │       ││  │
│  │  └─────────────┘    └─────────────┘    └─────────────┘  └───────┘│  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                          API Routers                               │  │
│  │                                                                    │  │
│  │  POST /api/extract-tasks    Extract tasks from text                │  │
│  │  POST /api/summarize        Generate project summary               │  │
│  │  POST /api/grants/fit-score Calculate grant fit                    │  │
│  │  POST /api/agents/chat      Chat with agents                       │  │
│  │  POST /api/agents/execute   Execute agent action                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                        LLM Service                                 │  │
│  │                                                                    │  │
│  │  - Anthropic Claude API (primary)                                  │  │
│  │  - Configurable model selection                                    │  │
│  │  - Token tracking                                                  │  │
│  │  - Rate limiting                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Creating a Task

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Task Creation Flow                              │
│                                                                          │
│  1. User types in Quick Add: "NSF report fri #grants p1"                 │
│        │                                                                 │
│        ▼                                                                 │
│  2. Quick-add parser extracts:                                           │
│     { title: "NSF report", due: "Friday", category: "grants", p: "p1" }  │
│        │                                                                 │
│        ▼                                                                 │
│  3. Zod validation (CreateTaskSchema)                                    │
│        │                                                                 │
│        ▼                                                                 │
│  4. TanStack mutation triggered with optimistic update                   │
│     - UI immediately shows new task                                      │
│        │                                                                 │
│        ▼                                                                 │
│  5. POST /api/tasks                                                      │
│     - Auth check (middleware validated session)                          │
│     - Rate limit check                                                   │
│     - Validate with Zod                                                  │
│        │                                                                 │
│        ▼                                                                 │
│  6. Supabase INSERT                                                      │
│     - RLS policy verifies workspace membership                           │
│     - Task created with workspace_id                                     │
│        │                                                                 │
│        ▼                                                                 │
│  7. Response returned                                                    │
│        │                                                                 │
│        ▼                                                                 │
│  8. TanStack cache updated (or rolled back on error)                     │
│        │                                                                 │
│        ▼                                                                 │
│  9. Supabase Realtime notifies other clients                             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Performance Optimizations

### Database Indexes

```sql
-- Task queries
CREATE INDEX idx_tasks_workspace ON tasks(workspace_id);
CREATE INDEX idx_tasks_workspace_status ON tasks(workspace_id, status);
CREATE INDEX idx_tasks_workspace_due ON tasks(workspace_id, due);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_user ON tasks(user_id);

-- Full-text search
CREATE INDEX idx_tasks_fts ON tasks
  USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Vector search (pgvector)
CREATE INDEX idx_opportunities_embedding ON funding_opportunities
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### Caching Strategy

```typescript
// TanStack Query with stale-while-revalidate
const { data: tasks } = useQuery({
  queryKey: ['tasks', workspaceId],
  queryFn: fetchTasks,
  staleTime: 5 * 60 * 1000,     // Consider fresh for 5 minutes
  gcTime: 30 * 60 * 1000,       // Keep in cache for 30 minutes
});
```

### Rate Limiting

```typescript
// In-memory rate limiting (use Redis for production)
const RATE_LIMITS = {
  read: { limit: 200, windowMs: 60_000 },   // 200 req/min
  write: { limit: 100, windowMs: 60_000 },  // 100 req/min
  ai: { limit: 20, windowMs: 60_000 },      // 20 req/min
};
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              GitHub                                      │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  Push to main / Pull Request                                       │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────────────────┘
                          │
           ┌──────────────┴──────────────┐
           │                             │
           ▼                             ▼
┌─────────────────────────┐   ┌─────────────────────────────────────────┐
│   GitHub Actions        │   │                Vercel                    │
│                         │   │                                          │
│   - Lint                │   │   - Preview deployments (PR)             │
│   - Type check          │   │   - Production deployment (main)         │
│   - Unit tests          │   │   - Edge Functions                       │
│   - E2E tests           │   │   - Automatic scaling                    │
└─────────────────────────┘   └───────────────────┬─────────────────────┘
                                                  │
                              ┌───────────────────┴───────────────────┐
                              │                                       │
                              ▼                                       ▼
               ┌────────────────────────────┐          ┌──────────────────────┐
               │        Supabase            │          │   Railway/Render     │
               │                            │          │   (AI Service)       │
               │   - PostgreSQL + pgvector  │          │                      │
               │   - Auth                   │          │   - FastAPI          │
               │   - Storage                │          │   - Python 3.11      │
               │   - Realtime               │          │   - Docker           │
               │   - Edge Functions         │          │                      │
               └────────────────────────────┘          └──────────────────────┘
```

---

## Security Considerations

### Row Level Security (RLS)

Every table has RLS policies that:
- Verify user is authenticated (`auth.uid()`)
- Check workspace membership
- Validate role-based permissions

### OAuth Token Security

Calendar tokens are encrypted at rest using Supabase Vault:

```sql
-- Encrypt on insert
INSERT INTO calendar_connections (access_token_encrypted)
VALUES (vault.encrypt('raw_token', 'calendar_tokens_key'));

-- Decrypt on read (Edge Function only)
SELECT vault.decrypt(access_token_encrypted, 'calendar_tokens_key');
```

### API Security

- Rate limiting on all endpoints
- Input validation with Zod
- CORS configured for production domain
- HTTP-only cookies for auth tokens

---

## Development Workflow

```bash
# Start development
pnpm dev

# Run type checking (across all packages)
pnpm typecheck

# Run linting
pnpm lint

# Run tests
pnpm test

# Run E2E tests
pnpm test:e2e

# Build for production
pnpm build
```

---

*Document Version: 3.0*
*Last Updated: January 2025*
