# CLAUDE.md - Project Context for AI Assistants

This file provides context for AI assistants (Claude, Cursor, GitHub Copilot, etc.) working on the ScholarOS codebase.

## Project Overview

**ScholarOS** (evolved from ProfDash) is a multi-tenant, AI-native academic operations platform for professors, lab managers, and research teams. It provides task management, manuscript/grant project tracking, personnel management, Google Calendar integration, and grant discovery.

**Live Site:** https://scholaros-ashen.vercel.app

## Repository Structure

```
ProfDash/
├── scholaros/                    # Main v2.0 monorepo (Turborepo + pnpm)
│   ├── apps/web/                 # Next.js 15 frontend application
│   ├── packages/shared/          # Shared TypeScript types & Zod schemas
│   ├── services/ai/              # Python FastAPI AI microservice
│   └── supabase/                 # Database migrations & config
├── docs/                         # Documentation
│   ├── ARCHITECTURE.md           # System architecture
│   ├── API.md                    # REST API reference
│   ├── DEPLOYMENT.md             # Deployment guide
│   ├── PRD.md                    # Product requirements
│   └── PROGRESS.md               # Implementation status
├── public/                       # Legacy v1.0 static assets (vanilla JS)
└── server/                       # Legacy v1.0 Express server
```

## Technology Stack

### Frontend (`scholaros/apps/web/`)
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 15.1.0 | App Router, Server Components, API routes |
| React | 19.x | UI components with RSC support |
| TypeScript | 5.9.3 | Type safety |
| Tailwind CSS | 3.4.16 | Styling |
| shadcn/ui | Latest | Radix-based accessible components |
| TanStack Query | 5.90.12 | Server state caching |
| Zustand | 5.0.0 | Client state management |
| Zod | 3.23.0 | Runtime validation |
| @dnd-kit | 6.3.1 | Drag-and-drop for Kanban |

### Backend & Database
| Technology | Purpose |
|------------|---------|
| Supabase | PostgreSQL database, Auth, RLS, Storage, Realtime |
| Next.js API Routes | REST API endpoints |
| FastAPI (Python) | AI microservice for task extraction, summaries, grant scoring |

### Infrastructure
| Tool | Purpose |
|------|---------|
| Turborepo | Monorepo build orchestration |
| pnpm | Package manager (workspaces) |
| Vercel | Hosting & deployment |
| GitHub Actions | CI/CD pipeline |
| Vitest | Unit testing |
| Playwright | E2E testing |

## Key Directories

### `scholaros/apps/web/app/`
Next.js App Router structure:
- `(auth)/` - Authentication routes (login, signup, invite)
- `(dashboard)/` - Protected dashboard routes
  - `today/`, `upcoming/`, `board/`, `list/`, `calendar/` - Task views
  - `projects/` - Manuscript & grant projects
  - `publications/` - Publication management
  - `grants/` - Grant discovery & tracking
  - `personnel/` - Team management
  - `teaching/` - Teaching dashboard
  - `settings/` - User & workspace settings
- `api/` - REST API route handlers

### `scholaros/apps/web/components/`
React components organized by feature:
- `ui/` - shadcn/ui base components
- `tasks/` - Task cards, lists, Kanban, quick-add
- `projects/` - Project cards, milestones, stages
- `grants/` - Grant search, watchlist
- `publications/` - Publication import, cards
- `layout/` - Sidebar, navigation, workspace switcher

### `scholaros/apps/web/lib/`
- `supabase/` - Client/server Supabase instances
- `hooks/` - TanStack Query data-fetching hooks
- `stores/` - Zustand stores (workspace, task, agent)
- `utils.ts` - Utility functions (cn, formatDate, etc.)
- `constants.ts` - Application constants

### `scholaros/packages/shared/src/`
Shared across frontend & backend:
- `types/` - TypeScript interfaces (Task, Project, Workspace)
- `schemas/` - Zod validation schemas
- `utils/` - Quick-add parser, shared utilities
- `config/project-stages.ts` - Project type stage definitions

### `scholaros/services/ai/`
Python FastAPI microservice:
- `app/main.py` - FastAPI application
- `app/agents/` - Multi-agent framework (task, grant, project agents)
- `app/routers/` - API endpoints (extract, summarize, grants)
- `app/services/llm.py` - LLM service abstraction (Anthropic)

### `scholaros/supabase/migrations/`
Database migrations applied in order:
1. `20241217000000_initial_schema.sql` - Profiles, workspaces, tasks
2. `20241217000001_workspace_invites.sql` - Invite system, RLS
3. `20241217000002_project_milestones_notes.sql` - Projects hierarchy
4. `20241217000003_calendar_integrations.sql` - Google Calendar
5. `20241217000004_funding_opportunities.sql` - Grant discovery
6. `20241221000000_documents_and_ai.sql` - Documents, embeddings
7. `20241221000001_publications.sql` - Publication tracking

## Development Commands

```bash
# Install dependencies (from scholaros/)
pnpm install

# Start development server
pnpm dev

# Build all packages
pnpm build

# Run type checking
pnpm typecheck

# Run linting
pnpm lint

# Run unit tests
pnpm test

# Run E2E tests
pnpm test:e2e

# Start specific package
pnpm --filter @scholaros/web dev
```

## Architecture Patterns

### Multi-Tenancy
- Workspace-based isolation using PostgreSQL Row Level Security (RLS)
- Every table has `workspace_id` column
- RLS policies check `workspace_members` for access

### Authentication
- Supabase Auth (Email/Password + Google OAuth)
- Session management via HTTP-only cookies
- Middleware refreshes tokens on each request

### Authorization (RBAC)
- Roles: `owner`, `admin`, `member`, `limited`
- Permission helpers in `stores/workspace-store.ts`

### Data Flow
1. React Query hooks fetch data via API routes
2. API routes validate with Zod schemas
3. Supabase client executes query with RLS
4. Results cached by React Query
5. Optimistic updates for mutations

### API Pattern
```typescript
// API route structure
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Query with RLS
  const { data, error } = await supabase.from('tasks').select('*');
  return NextResponse.json(data);
}
```

## Database Schema (Key Tables)

### Core Tables
- `profiles` - User profiles (links to auth.users)
- `workspaces` - Multi-tenant workspaces
- `workspace_members` - User-workspace associations with roles
- `tasks` - Task management with categories, priorities, assignees
- `projects` - Unified manuscripts, grants, general projects
- `project_milestones` - Project milestone tracking
- `project_notes` - Project notes

### Integrations
- `calendar_connections` - Google Calendar OAuth tokens
- `calendar_events_cache` - Cached calendar events
- `funding_opportunities` - Grant opportunities from APIs
- `opportunity_watchlist` - User grant watchlists
- `saved_searches` - Saved grant search queries

### AI Features
- `documents` - Uploaded documents
- `document_chunks` - Document chunks with embeddings
- `ai_actions_log` - AI action history and feedback
- `agent_executions` - Agent framework logs

## Quick Add Syntax

The quick-add parser supports natural language task entry:
```
NSF report fri #grants p1 @craig +project-123
```
- `fri` - Due date (relative or absolute)
- `#grants` - Category (research, teaching, grants, etc.)
- `p1` - Priority (p1-p4)
- `@craig` - Assignee
- `+project-123` - Link to project

## Environment Variables

Required variables (see `.env.example`):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
ANTHROPIC_API_KEY=
AI_SERVICE_URL=
```

## Testing

### Unit Tests (Vitest)
Located in `*.test.ts` files alongside source code.

### E2E Tests (Playwright)
Located in `tests/e2e/`. Run with `pnpm test:e2e`.

## Common Tasks

### Adding a New API Endpoint
1. Create route in `apps/web/app/api/[resource]/route.ts`
2. Add Zod schema in `packages/shared/src/schemas/`
3. Create React Query hook in `apps/web/lib/hooks/`
4. Add RLS policy if new table

### Adding a New Component
1. Create in `apps/web/components/[feature]/`
2. Use shadcn/ui primitives from `components/ui/`
3. Follow existing naming conventions

### Adding a Database Migration
1. Create SQL file in `supabase/migrations/` with timestamp prefix
2. Run `supabase db push` or apply in Supabase dashboard
3. Regenerate types if needed

## Code Style

- TypeScript strict mode enabled
- ESLint + Prettier for formatting
- Prefer functional components with hooks
- Use `cn()` utility for conditional classes
- Zod for all API validation
- TanStack Query for all data fetching
- Zustand for client-only state

## Important Files

| File | Purpose |
|------|---------|
| `apps/web/middleware.ts` | Auth middleware, session refresh |
| `apps/web/lib/supabase/client.ts` | Browser Supabase client |
| `apps/web/lib/supabase/server.ts` | Server Supabase client |
| `packages/shared/src/schemas/index.ts` | All Zod schemas |
| `packages/shared/src/types/index.ts` | All TypeScript types |
| `services/ai/app/main.py` | AI service entry point |

## Notes for AI Assistants

1. **Always check existing patterns** - Look at similar files before creating new ones
2. **Use the shared package** - Types and schemas live in `packages/shared/`
3. **RLS is mandatory** - Every table needs proper RLS policies
4. **Workspace context required** - Most queries filter by `workspace_id`
5. **Validate with Zod** - Use schemas for all API request/response validation
6. **Use React Query** - Don't fetch data directly; use hooks in `lib/hooks/`
7. **Prefer shadcn/ui** - Use existing UI primitives from `components/ui/`
8. **Check migrations** - Database schema is in `supabase/migrations/`

## Links

- [Architecture Documentation](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Product Requirements](docs/PRD.md)
