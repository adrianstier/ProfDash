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
| TypeScript | 5.3.x | Type safety |
| Tailwind CSS | 3.4.16 | Styling |
| shadcn/ui | Latest | Radix-based accessible components |
| TanStack Query | 5.60.0 | Server state caching |
| Zustand | 5.0.0 | Client state management |
| Zod | 3.23.0 | Runtime validation |
| @dnd-kit | 6.3.1 / 8.0.0 | Drag-and-drop for Kanban |
| Framer Motion | 12.x | Animations |

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
  - `analytics/` - Usage analytics dashboard
  - `settings/` - User & workspace settings
- `api/` - REST API route handlers (see API Routes section)

### `scholaros/apps/web/app/api/` (API Routes)
- `tasks/` - Task CRUD, bulk operations, recurring tasks
- `projects/` - Project management
- `personnel/` - Team member management
- `publications/` - Publication tracking
- `calendar/` - Google Calendar sync & events
- `grants/` - Grant search, watchlist, saved searches
- `documents/` - Document upload & management
- `ai/` - AI task extraction, enhancement, breakdown, smart-parse, voice
- `agents/` - Multi-agent chat, execution, orchestration
- `analytics/` - Usage analytics events
- `search/` - Global search with history
- `messages/` - Workspace messaging
- `activity/` - Activity feed
- `presence/` - User presence tracking
- `onboarding/` - Onboarding progress tracking
- `workspaces/` - Workspace management & invites
- `auth/` - Authentication callbacks

### `scholaros/apps/web/components/`
React components organized by feature (23 directories):
- `ui/` - shadcn/ui base components (24 primitives)
- `tasks/` - Task cards, lists, Kanban, quick-add, detail drawer
- `projects/` - Project cards, milestones, stages, notes
- `grants/` - Grant search, watchlist, fit scoring
- `publications/` - Publication import, cards
- `layout/` - Sidebar, navigation, workspace switcher
- `ai/` - Smart parsing, task breakdown, email generation, summaries
- `analytics/` - Usage charts, metrics dashboards
- `chat/` - Workspace chat interface
- `documents/` - Document upload, viewer
- `learning/` - Progressive onboarding, feature discovery, AI insights
- `onboarding/` - Welcome modal, setup wizard
- `presence/` - User presence indicators
- `search/` - Global search, history, filters
- `voice/` - Voice input, transcription
- `activity/` - Activity feed components
- `dashboard/` - Dashboard-specific components
- `workspace/` - Workspace management
- `personnel/` - Personnel cards, forms
- `accessibility/` - A11y helpers
- `migration/` - Data migration helpers

### `scholaros/apps/web/lib/`
- `supabase/` - Client/server Supabase instances
- `hooks/` - 24 TanStack Query hooks (see Hooks section)
- `stores/` - 5 Zustand stores (workspace, task, agent, chat, analytics)
- `utils.ts` - Utility functions (cn, formatDate, etc.)
- `constants.ts` - Application constants
- `env.ts` - Environment variable handling
- `crypto.ts` - Encryption utilities
- `rate-limit.ts` - API rate limiting
- `search-ranking.ts` - Search result ranking

### `scholaros/apps/web/lib/hooks/`
Data-fetching and utility hooks:
- `use-tasks.ts` - Task CRUD with optimistic updates
- `use-projects.ts` - Project management
- `use-personnel.ts` - Team member operations
- `use-publications.ts` - Publication tracking
- `use-calendar.ts` - Calendar sync & events
- `use-grants.ts` - Grant search & watchlist
- `use-documents.ts` - Document management
- `use-workspaces.ts` - Workspace operations
- `use-ai.ts` - AI feature hooks
- `use-agents.ts` - Multi-agent interactions
- `use-chat.ts` - Workspace messaging
- `use-search.ts` - Global search
- `use-analytics.ts` - Analytics data
- `use-analytics-events.ts` - Event tracking
- `use-onboarding.ts` - Onboarding progress
- `use-activity.ts` - Activity feed
- `use-presence.ts` - User presence
- `use-voice.ts` - Voice transcription
- `use-smart-parse.ts` - Smart task parsing
- `use-keyboard-shortcuts.ts` - Keyboard navigation
- `use-user.ts` - User profile
- `use-pagination.ts` - List pagination
- `use-debounce.ts` - Debounce utility

### `scholaros/packages/shared/src/`
Shared across frontend & backend:
- `types/` - TypeScript interfaces
  - `index.ts` - Core types (Task, Project, Workspace, etc.)
  - `agents.ts` - Multi-agent framework types
  - `analytics.ts` - Analytics event types
  - `chat.ts` - Messaging types
- `schemas/` - Zod validation schemas
  - `index.ts` - Core validation schemas
  - `analytics.ts` - Analytics event validation
- `utils/` - Quick-add parser, shared utilities
- `config/project-stages.ts` - Project type stage definitions

### `scholaros/services/ai/`
Python FastAPI microservice:
- `app/main.py` - FastAPI application entry point
- `app/config.py` - Service configuration
- `app/agents/` - Multi-agent framework
  - `base.py` - Base agent class
  - `orchestrator.py` - Agent orchestration
  - `registry.py` - Agent registration
  - `types.py` - Agent type definitions
  - `specialized/` - 8 specialized agents:
    - `task_agent.py` - Task management
    - `project_agent.py` - Project operations
    - `grant_agent.py` - Grant discovery & analysis
    - `calendar_agent.py` - Calendar operations
    - `personnel_agent.py` - Team management
    - `research_agent.py` - Research assistance
    - `writing_agent.py` - Writing assistance
    - `planner_agent.py` - Planning & scheduling
- `app/routers/` - API endpoints
  - `extract.py` - Task extraction from text
  - `summarize.py` - Content summarization
  - `grants.py` - Grant search & scoring
  - `documents.py` - Document processing
  - `agents.py` - Agent chat & execution
  - `analytics.py` - Analytics & A/B testing
- `app/analytics/` - Analytics & experimentation
- `app/ml/` - ML models (onboarding predictor, search ranker)
- `app/models/` - Pydantic models
- `app/services/llm.py` - LLM service abstraction (Anthropic)

### `scholaros/supabase/migrations/`
Database migrations applied in order (16 total):
1. `20241217000000_initial_schema.sql` - Profiles, workspaces, tasks
2. `20241217000001_workspace_invites.sql` - Invite system, RLS
3. `20241217000002_project_milestones_notes.sql` - Projects hierarchy
4. `20241217000003_calendar_integrations.sql` - Google Calendar
5. `20241217000004_funding_opportunities.sql` - Grant discovery
6. `20241219000000_fix_task_workspace_rls.sql` - RLS policy fixes
7. `20241221000000_documents_and_ai.sql` - Documents, embeddings
8. `20241221000001_publications.sql` - Publication tracking
9. `20241221100000_agent_framework.sql` - Multi-agent infrastructure
10. `20250108000001_workspace_messages.sql` - Workspace chat
11. `20250108000002_workspace_activity.sql` - Activity feed
12. `20250108000003_user_presence.sql` - User presence tracking
13. `20260115000000_onboarding_tracking.sql` - Onboarding progress
14. `20260118000000_search_history.sql` - Search history
15. `20260120000000_recurring_tasks.sql` - Recurring tasks
16. `20260122000000_analytics_events.sql` - Usage analytics

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
- `workspace_invites` - Magic link invitations
- `tasks` - Task management with categories, priorities, assignees
- `recurring_tasks` - Recurring task definitions
- `projects` - Unified manuscripts, grants, general projects
- `project_milestones` - Project milestone tracking
- `project_notes` - Project notes
- `publications` - Publication tracking
- `personnel` - Team member records

### Collaboration
- `workspace_messages` - Workspace chat messages
- `workspace_activity` - Activity feed events
- `user_presence` - Real-time user presence

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

### Analytics & UX
- `analytics_events` - Usage analytics events
- `onboarding_tracking` - User onboarding progress
- `search_history` - Search query history

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
