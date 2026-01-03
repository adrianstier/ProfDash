# CLAUDE.md - Project Context for Claude Code

## Project Overview

**ScholarOS** (formerly ProfDash) is an AI-native academic productivity platform for professors, lab managers, and research teams. It provides a unified dashboard for managing tasks, manuscripts, grants, personnel, publications, and calendars with AI copilots embedded throughout.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Language** | TypeScript (strict mode) |
| **Frontend** | Next.js 15 (App Router), React 19 |
| **Styling** | Tailwind CSS + shadcn/ui (Radix primitives) |
| **State** | TanStack Query v5 (server state) + Zustand v5 (client state) |
| **Validation** | Zod |
| **Database** | Supabase (PostgreSQL + pgvector) |
| **Auth** | Supabase Auth (email/password, Google OAuth, magic links) |
| **Real-time** | Supabase Realtime |
| **AI Service** | Python FastAPI microservice |
| **Monorepo** | Turborepo + pnpm workspaces |
| **Testing** | Vitest (unit) + Playwright (E2E) |

## Project Structure

```
/home/user/ProfDash/
├── scholaros/                    # Main monorepo
│   ├── apps/
│   │   └── web/                  # Next.js 15 web application
│   │       ├── app/
│   │       │   ├── (auth)/       # Auth pages (login, signup, invite)
│   │       │   ├── (dashboard)/  # Protected dashboard pages
│   │       │   │   ├── today/    # Daily task view
│   │       │   │   ├── upcoming/ # 14-day timeline
│   │       │   │   ├── board/    # Kanban board
│   │       │   │   ├── list/     # Table list view
│   │       │   │   ├── calendar/ # Calendar with Google sync
│   │       │   │   ├── projects/ # Project management
│   │       │   │   ├── grants/   # Grant discovery
│   │       │   │   ├── personnel/# Team tracking
│   │       │   │   ├── publications/ # Research pubs
│   │       │   │   ├── teaching/ # Teaching dashboard
│   │       │   │   └── settings/ # User/workspace settings
│   │       │   └── api/          # REST API routes
│   │       ├── components/       # React components
│   │       │   ├── ui/           # shadcn/ui base components
│   │       │   ├── tasks/        # Task components
│   │       │   ├── projects/     # Project components
│   │       │   ├── ai/           # AI feature components
│   │       │   ├── grants/       # Grant components
│   │       │   ├── publications/ # Publication components
│   │       │   ├── personnel/    # Personnel components
│   │       │   ├── workspace/    # Workspace switcher
│   │       │   ├── layout/       # Layout components
│   │       │   ├── accessibility/# A11y components
│   │       │   ├── documents/    # Document upload/processing
│   │       │   ├── migration/    # Data import/export
│   │       │   └── voice/        # Voice input
│   │       ├── lib/
│   │       │   ├── hooks/        # TanStack Query hooks
│   │       │   ├── stores/       # Zustand stores
│   │       │   ├── supabase/     # Supabase client
│   │       │   └── utils.ts      # Utilities
│   │       └── __tests__/        # Tests
│   │
│   ├── packages/
│   │   └── shared/               # Shared code
│   │       └── src/
│   │           ├── types/        # TypeScript types
│   │           ├── schemas/      # Zod schemas
│   │           ├── config/       # Configuration (stages)
│   │           └── utils/        # Shared utilities
│   │
│   ├── services/
│   │   └── ai/                   # Python AI microservice
│   │       ├── app/
│   │       │   ├── main.py       # FastAPI app
│   │       │   ├── routers/      # API endpoints
│   │       │   └── services/     # LLM service
│   │       └── Dockerfile
│   │
│   └── supabase/
│       └── migrations/           # Database migrations
│
├── public/                       # v1 prototype (vanilla JS)
├── server/                       # v1 Express server
└── docs/                         # Documentation
```

## Key Files to Know

### Configuration
- `scholaros/apps/web/next.config.ts` - Next.js configuration
- `scholaros/apps/web/tailwind.config.ts` - Tailwind configuration
- `scholaros/turbo.json` - Turborepo pipeline
- `scholaros/pnpm-workspace.yaml` - pnpm workspace config

### Types & Schemas
- `scholaros/packages/shared/src/types/index.ts` - All TypeScript types
- `scholaros/packages/shared/src/types/agents.ts` - Agent framework types
- `scholaros/packages/shared/src/schemas/` - Zod validation schemas
- `scholaros/packages/shared/src/config/project-stages.ts` - Project stage configs

### Main App Files
- `scholaros/apps/web/app/layout.tsx` - Root layout
- `scholaros/apps/web/app/(dashboard)/layout.tsx` - Dashboard layout
- `scholaros/apps/web/middleware.ts` - Auth middleware
- `scholaros/apps/web/components/layout/sidebar.tsx` - Navigation sidebar

### Database
- `scholaros/apps/web/lib/supabase/client.ts` - Browser client
- `scholaros/apps/web/lib/supabase/server.ts` - Server client
- `scholaros/supabase/migrations/` - All DB migrations

## Development Commands

```bash
# Navigate to monorepo
cd scholaros

# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test

# Run E2E tests
pnpm test:e2e

# Type check
pnpm typecheck

# Lint
pnpm lint
```

## Architecture Patterns

### API Routes Pattern
All API routes are in `scholaros/apps/web/app/api/`. They follow RESTful conventions:

```typescript
// app/api/tasks/route.ts
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.from('tasks').select('*');
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  // Validate with Zod, insert to Supabase
}
```

### TanStack Query Hooks Pattern
Custom hooks in `scholaros/apps/web/lib/hooks/`:

```typescript
// lib/hooks/use-tasks.ts
export function useTasks(workspaceId: string) {
  return useQuery({
    queryKey: ['tasks', workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/tasks?workspace_id=${workspaceId}`);
      return res.json();
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (task) => fetch('/api/tasks', { method: 'POST', body: JSON.stringify(task) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });
}
```

### Component Pattern
Components use shadcn/ui with Tailwind:

```typescript
// components/tasks/task-card.tsx
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function TaskCard({ task }: { task: Task }) {
  return (
    <Card className="p-4">
      <h3 className="font-medium">{task.title}</h3>
      <Badge variant={task.priority}>{task.priority}</Badge>
    </Card>
  );
}
```

### Supabase RLS Pattern
All tables use Row Level Security with workspace isolation:

```sql
CREATE POLICY "Users can access workspace data"
ON tasks FOR ALL
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid()
  )
);
```

## Key Concepts

### Multi-Tenancy
- Every entity belongs to a `workspace_id`
- Users can belong to multiple workspaces
- Role-based access: Owner, Admin, Member, Limited
- RLS policies enforce data isolation

### Project Types
- **Manuscript**: Academic papers (8 stages: Idea → Published)
- **Grant**: Funding proposals (9 stages: Discovery → Closeout)
- **General**: Generic projects (4 stages)

### Task Categories
- research, teaching, grants, grad-mentorship, undergrad-mentorship, admin, misc

### Priority Levels
- P1 (Critical), P2 (High), P3 (Normal), P4 (Low)

## Common Tasks

### Adding a New API Route
1. Create file in `app/api/[resource]/route.ts`
2. Add Zod schema in `packages/shared/src/schemas/`
3. Add types in `packages/shared/src/types/index.ts`
4. Create TanStack Query hook in `lib/hooks/`

### Adding a New Component
1. Create in appropriate `components/` subdirectory
2. Use shadcn/ui primitives where possible
3. Add types to shared package if reusable

### Adding a Database Migration
1. Create new migration in `supabase/migrations/`
2. Name format: `YYYYMMDDHHMMSS_description.sql`
3. Include RLS policies for new tables

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Google OAuth (Calendar)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# AI Service
AI_SERVICE_URL=
ANTHROPIC_API_KEY=  # or OPENAI_API_KEY
```

## Testing

### Unit Tests (Vitest)
```bash
pnpm test
```

### E2E Tests (Playwright)
```bash
pnpm test:e2e
```

## Code Style

- TypeScript strict mode enabled
- ESLint + Prettier for formatting
- Use `cn()` helper for conditional Tailwind classes
- Prefer named exports over default exports
- Use Zod for runtime validation
- All API responses return typed JSON

## Important Notes

1. **Always use workspace context** - Most queries need workspace_id
2. **Use TanStack Query** - Don't fetch in useEffect
3. **Validate inputs** - Use Zod schemas for API inputs
4. **Handle errors** - Use error boundaries and toast notifications
5. **Accessibility** - Maintain WCAG 2.1 AA compliance
6. **Type safety** - Use shared types from packages/shared

## Related Documentation

- `/docs/PRD.md` - Product requirements
- `/docs/ARCHITECTURE.md` - Technical architecture
- `/docs/API.md` - API documentation
- `/docs/DEPLOYMENT.md` - Deployment guide
- `/FEATURES.md` - Complete feature list
