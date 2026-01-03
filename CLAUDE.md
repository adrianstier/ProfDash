# CLAUDE.md - ProfDash/ScholarOS

This document provides context for Claude Code when working on the ProfDash/ScholarOS codebase.

## Project Overview

**ProfDash/ScholarOS** is an academic productivity platform designed for professors and researchers. It provides task management, project tracking (manuscripts, grants), grant discovery, calendar integration, and AI-powered features.

### Architecture

- **Monorepo**: Turborepo with pnpm workspaces
- **Frontend**: Next.js 15 (App Router) with React 19
- **Backend**: Next.js API Routes + Supabase (PostgreSQL)
- **AI Service**: Python FastAPI microservice (Claude/OpenAI)
- **Auth**: Supabase Auth with Google OAuth support

## Quick Reference

### Development Commands

```bash
# Install dependencies (from scholaros/)
pnpm install

# Build shared package first (required before dev)
pnpm build

# Run development server
pnpm dev

# Run all checks
pnpm lint && pnpm typecheck && pnpm test

# Run specific workspace
pnpm --filter @scholaros/web dev
pnpm --filter @scholaros/shared build

# AI Service (from services/ai/)
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Key Directories

```
ProfDash/
├── scholaros/                    # Main monorepo (active development)
│   ├── apps/web/                 # Next.js 15 application
│   │   ├── app/                  # App Router pages & API routes
│   │   │   ├── (auth)/           # Login, signup, invite pages
│   │   │   ├── (dashboard)/      # Protected dashboard pages
│   │   │   └── api/              # API route handlers
│   │   ├── components/           # React components
│   │   └── lib/                  # Utilities, hooks, stores
│   ├── packages/shared/          # Shared types, schemas, utils
│   ├── services/ai/              # Python FastAPI microservice
│   └── supabase/migrations/      # Database migrations
└── docs/                         # Documentation
```

## Coding Conventions

### TypeScript

- **Strict mode** enabled (`tsconfig.json`)
- Use `interface` for object shapes, `type` for unions/aliases
- Separate API types (`TaskFromAPI`) from client types (`Task`) - API types use ISO strings for dates
- Path aliases: `@/*` for web app imports, `@scholaros/shared/*` for shared package

```typescript
// Types pattern - separate client vs API types
export interface Task {
  id: string;
  due?: Date | null;  // Client-side uses Date
  created_at: Date;
}

export interface TaskFromAPI {
  id: string;
  due?: string | null;  // API returns ISO strings
  created_at: string;
}
```

### React Components

- Use `"use client"` directive for client components
- Functional components with TypeScript interfaces for props
- Use `cn()` utility from `@/lib/utils` for conditional classNames
- Lucide React for icons
- Component file naming: `kebab-case.tsx` (e.g., `task-card.tsx`)

```typescript
"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface TaskCardProps {
  task: TaskFromAPI;
  onToggleComplete?: (task: TaskFromAPI) => void;
  isCompact?: boolean;
}

export function TaskCard({ task, onToggleComplete, isCompact = false }: TaskCardProps) {
  return (
    <div className={cn("p-4", isCompact && "p-2")}>
      {/* ... */}
    </div>
  );
}
```

### Hooks Pattern (TanStack Query)

- Custom hooks in `lib/hooks/use-*.ts`
- Use `queryKeys` factory from `@/app/providers` for cache consistency
- Implement optimistic updates for mutations
- Re-export types that components need

```typescript
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/app/providers";

export function useTasks(filters?: TaskFilters) {
  return useQuery({
    queryKey: queryKeys.tasks.list(filters ?? {}),
    queryFn: () => fetchTasks(filters),
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
    // Include optimistic updates for better UX
    onMutate: async (updatedTask) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all });
      // ... optimistic update logic
    },
  });
}
```

### API Routes Pattern

- Use `createClient` from `@/lib/supabase/server` for server-side Supabase
- Validate requests with Zod schemas from `@scholaros/shared`
- Apply rate limiting for all endpoints
- Return proper HTTP status codes and error messages

```typescript
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { CreateTaskSchema } from "@scholaros/shared";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = CreateTaskSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("tasks")
      .insert({ ...validationResult.data, user_id: user.id })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

### State Management

- **Server state**: TanStack Query (data fetching, caching)
- **Client state**: Zustand stores in `lib/stores/`
- **Form state**: React useState + Zod validation

```typescript
// Zustand store pattern
import { create } from "zustand";

interface WorkspaceStore {
  currentWorkspaceId: string | null;
  setCurrentWorkspace: (id: string | null) => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  currentWorkspaceId: null,
  setCurrentWorkspace: (id) => set({ currentWorkspaceId: id }),
}));
```

### Styling

- Tailwind CSS with custom design tokens
- CVA (Class Variance Authority) for component variants
- Custom colors defined in `tailwind.config.ts`:
  - Priority colors: `priority-p1`, `priority-p2`, etc.
  - Category colors: `category-research`, `category-teaching`, etc.
  - Semantic colors: `success`, `destructive`, etc.

### Accessibility (WCAG 2.1 AA)

- Use ARIA labels from `@/lib/constants` (ARIA_LABELS)
- Implement keyboard navigation (arrow keys for menus)
- Focus management with refs
- Skip links for main content
- `role`, `aria-*` attributes on interactive elements

## Database

### Supabase + Row Level Security (RLS)

- All tables have RLS policies enabled
- Use security definer functions to prevent infinite recursion:
  - `get_user_workspace_ids()`
  - `user_has_workspace_role()`
  - `user_can_access_project()`

### Key Tables

| Table | Description |
|-------|-------------|
| `profiles` | User profiles |
| `tasks` | Task items (workspace-scoped) |
| `workspaces` | Workspace/team containers |
| `workspace_members` | User-workspace relationships with roles |
| `projects` | Manuscripts, grants, general projects |
| `project_milestones` | Project milestones |
| `project_notes` | Project notes |
| `calendar_connections` | Google Calendar OAuth tokens |
| `funding_opportunities` | Grant opportunities |
| `opportunity_watchlist` | Tracked grants |

### Migrations

Located in `scholaros/supabase/migrations/`. Run in order by timestamp.

## API Endpoints

### Tasks
- `GET /api/tasks` - List tasks (supports pagination, filters)
- `POST /api/tasks` - Create task
- `GET /api/tasks/[id]` - Get task
- `PATCH /api/tasks/[id]` - Update task
- `DELETE /api/tasks/[id]` - Delete task

### Projects
- `GET/POST /api/projects` - List/create projects
- `GET/PATCH/DELETE /api/projects/[id]` - Project operations
- `GET/POST /api/projects/[id]/milestones` - Milestones
- `GET/POST /api/projects/[id]/notes` - Notes

### Workspaces
- `GET/POST /api/workspaces` - List/create workspaces
- `GET/PATCH/DELETE /api/workspaces/[id]` - Workspace operations
- `GET/POST /api/workspaces/[id]/members` - Member management
- `GET/POST /api/workspaces/[id]/invites` - Invite management

### AI Features
- `POST /api/ai/extract-tasks` - Extract tasks from text
- `POST /api/ai/project-summary` - Generate project summary
- `POST /api/ai/fit-score` - Score grant fit

### Integrations
- `GET /api/auth/google` - Start Google OAuth
- `GET /api/auth/google/callback` - OAuth callback
- `GET /api/calendar/events` - Fetch calendar events
- `GET /api/grants/search` - Search funding opportunities

## Testing

### Unit Tests (Vitest)
```bash
pnpm test           # Run once
pnpm test:watch     # Watch mode
```

### E2E Tests (Playwright)
```bash
pnpm test:e2e
```

### Test Files
- Unit tests: `*.test.ts` alongside source files
- E2E tests: `apps/web/e2e/`

## Environment Variables

Required in `scholaros/.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google OAuth (for calendar)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# AI Service
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_API_KEY=your_internal_api_key

# LLM Provider (services/ai/.env)
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=your_anthropic_key
```

## Common Tasks

### Adding a New Feature

1. **Database**: Add migration in `supabase/migrations/`
2. **Types**: Add to `packages/shared/src/types/index.ts`
3. **Schemas**: Add Zod schema to `packages/shared/src/schemas/index.ts`
4. **API**: Create route in `apps/web/app/api/`
5. **Hooks**: Create hook in `apps/web/lib/hooks/`
6. **UI**: Create components in `apps/web/components/`
7. **Page**: Create page in `apps/web/app/(dashboard)/`

### Adding an API Endpoint

1. Create route file in `apps/web/app/api/[resource]/route.ts`
2. Import Supabase client: `import { createClient } from "@/lib/supabase/server"`
3. Authenticate user with `supabase.auth.getUser()`
4. Validate input with Zod schemas
5. Apply rate limiting
6. Return proper status codes

### Adding a React Component

1. Create file in `apps/web/components/[feature]/[component].tsx`
2. Add `"use client"` if using hooks/interactivity
3. Define props interface
4. Export named function component
5. Use `cn()` for conditional classes
6. Add ARIA attributes for accessibility

## Known Patterns & Gotchas

### RLS Infinite Recursion
When writing RLS policies, never directly query `workspace_members` from another table's policy. Use the security definer functions instead.

### Date Handling
- API returns ISO strings, client uses Date objects
- Use `TaskFromAPI` type for data from API responses
- Convert with `new Date(isoString)` when needed

### Query Invalidation
Always use `queryKeys` factory for cache keys to ensure consistent invalidation:
```typescript
queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
```

### Workspace Context
Many features are workspace-scoped. Always check for `workspace_id` in queries and mutations.
