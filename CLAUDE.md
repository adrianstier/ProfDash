# CLAUDE.md - ScholarOS Project Context

## Project Overview

**ScholarOS** is a multi-tenant, AI-native academic operations platform for professors, lab managers, and research teams. Task management, manuscript/grant/research project tracking, personnel management, Google Calendar integration, grant discovery, and multi-experiment research project management with fieldwork scheduling and permit tracking.

**Live Site:** https://scholaros-ashen.vercel.app

## Stack

- **Frontend:** Next.js 15 (App Router, Turbopack), React 19, TypeScript 5.3, Tailwind CSS, shadcn/ui
- **State:** TanStack Query (server state), Zustand (client state)
- **Backend:** Supabase (Postgres, Auth, RLS, Realtime), Next.js API Routes
- **AI Service:** Python FastAPI microservice (`services/ai/`) with 8 specialized agents
- **Monorepo:** Turborepo + pnpm workspaces
- **Testing:** Vitest (unit), Playwright (E2E)
- **Deployment:** Vercel

## Repository Structure

```
ProfDash/
├── scholaros/                    # Main monorepo
│   ├── apps/web/                 # Next.js frontend
│   │   ├── app/(auth)/           # Login, signup, invite
│   │   ├── app/(dashboard)/      # All dashboard routes (see below)
│   │   ├── app/api/              # REST API routes (see below)
│   │   ├── components/           # 24 feature directories (~159 files)
│   │   └── lib/                  # Hooks, stores, utils, supabase clients
│   ├── packages/shared/          # Shared types, Zod schemas, utils
│   ├── services/ai/              # Python FastAPI AI microservice
│   └── supabase/migrations/      # 26 SQL migrations
├── docs/                         # Architecture, API, PRD, deployment docs
├── public/                       # Legacy v1.0 static assets
└── server/                       # Legacy v1.0 Express server
```

### Dashboard Routes (`app/(dashboard)/`)
`today/` `upcoming/` `board/` `list/` `calendar/` `projects/` `publications/` `grants/` `personnel/` `teaching/` `analytics/` `settings/`

### API Routes (`app/api/`)
`tasks/` `projects/` `personnel/` `publications/` `calendar/` `grants/` `documents/` `ai/` `agents/` `analytics/` `search/` `messages/` `activity/` `presence/` `onboarding/` `workspaces/` `auth/` `research/` `templates/` `task-templates/` `voice/`

### Key Lib Structure (`apps/web/lib/`)
- `hooks/` - 34 TanStack Query hooks (one per feature domain)
- `stores/` - 5 Zustand stores: workspace, task, agent, chat, analytics
- `supabase/` - `client.ts` (browser) and `server.ts` (server)
- `utils/` - academic-patterns, duplicate-detection, recurrence, task-grouping
- `realtime/` - Workspace channel management
- Root files: `utils.ts`, `constants.ts`, `env.ts`, `crypto.ts`, `rate-limit.ts`

### Shared Package (`packages/shared/src/`)
- `types/` - Core types (Task, Project, Workspace, etc.), agents, analytics, chat, research
- `schemas/` - Zod schemas for validation (core, analytics, research)
- `utils/` - Quick-add parser
- `config/project-stages.ts` - Project stage definitions

## Development Commands

```bash
# From scholaros/ directory
pnpm install          # Install dependencies
pnpm dev              # Start dev server (port 4567)
pnpm build            # Build all packages
pnpm typecheck        # Type checking
pnpm lint             # Linting
pnpm test             # Unit tests (Vitest)
pnpm test:e2e         # E2E tests (Playwright)
```

## Architecture Patterns

### Multi-Tenancy & Auth
- Workspace-based isolation via PostgreSQL RLS
- Every table has `workspace_id`; RLS policies check `workspace_members`
- Supabase Auth (Email/Password + Google OAuth)
- RBAC roles: `owner`, `admin`, `member`, `limited`

### Data Flow
1. React Query hooks call API routes
2. API routes validate with Zod, call Supabase with RLS
3. Optimistic updates for mutations
4. Realtime subscriptions for live updates

### API Route Pattern
```typescript
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabase.from('table').select('*');
  return NextResponse.json(data);
}
```

### Quick Add Syntax
```
NSF report fri #grants p1 @craig +project-123
```
`fri` = due date, `#grants` = category, `p1` = priority, `@craig` = assignee, `+project-123` = project link

## Key Conventions

- Server components by default; `'use client'` only for interactivity
- Always `supabase.auth.getUser()` in server components, never `getSession()`
- RLS always on; soft deletes with `.eq('is_deleted', false)`
- `@/` path alias for all imports
- Add shadcn/ui via CLI (`npx shadcn-ui@latest add`), never manually
- Zod for all API validation
- One React Query hook per feature domain in `lib/hooks/`
- `cn()` utility for conditional Tailwind classes

## Security

- RLS on every table; user-scoped writes with `auth.uid() = user_id`
- Analytics events are immutable (`USING(false)` for UPDATE/DELETE)
- All API routes verify workspace membership
- Escape `%` and `_` in ILIKE patterns
- Never commit `.env.local` or service role keys

## Common Tasks

### Adding a New API Endpoint
1. Create route in `apps/web/app/api/[resource]/route.ts`
2. Add Zod schema in `packages/shared/src/schemas/`
3. Create React Query hook in `apps/web/lib/hooks/`
4. Add RLS policy if new table

### Adding a Database Migration
1. Create SQL file in `supabase/migrations/` with timestamp prefix
2. Apply via `supabase db push` or Supabase dashboard

## Important Files

| File | Purpose |
|------|---------|
| `apps/web/middleware.ts` | Auth middleware, session refresh |
| `apps/web/lib/supabase/server.ts` | Server Supabase client |
| `apps/web/lib/supabase/client.ts` | Browser Supabase client |
| `packages/shared/src/types/index.ts` | Core TypeScript types |
| `packages/shared/src/schemas/index.ts` | Core Zod schemas |
| `services/ai/app/main.py` | AI service entry point |
