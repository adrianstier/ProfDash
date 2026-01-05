# ScholarOS

**AI-Native Academic Operations Platform**

ScholarOS (evolved from ProfDash) is a multi-tenant, collaborative dashboard for professors, lab managers, and research teams to manage tasks, manuscripts, grants, personnel, and calendars—with AI copilots embedded across workflows.

**Live Demo:** [scholaros-ashen.vercel.app](https://scholaros-ashen.vercel.app)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.1-black.svg)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green.svg)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Features

### Task Management
- **Today View** - Todoist-style daily task list with progress tracking
- **Upcoming View** - 14-day timeline of upcoming tasks
- **Board View** - Kanban-style columns (To Do, In Progress, Done)
- **List View** - Sortable, filterable table view
- **Calendar View** - Monthly calendar with task visualization
- **Quick Add** - Natural language task entry with smart parsing

```
NSF report fri #grants p1 @craig +manuscript-123
         ↑      ↑      ↑    ↑         ↑
       date  category prio assignee project
```

### Project Management
- **Unified Projects** - Track manuscripts, grants, and general projects
- **Stage Pipelines** - Type-specific stages (Idea → Published, Discovery → Award)
- **Milestones** - Deadline tracking with progress indicators
- **Notes & Collaboration** - Team notes with activity feeds

### Grant Discovery
- **API-Powered Search** - Grants.gov, NIH, NSF integration
- **Watchlist** - Track opportunities you're interested in
- **Saved Searches** - Alert notifications for new matches
- **Fit Scoring** - AI-powered grant fit analysis

### Google Calendar Integration
- **Read-Only Sync** - View calendar events alongside tasks
- **Availability Heatmap** - Visualize busy/free time
- **Event Linking** - Connect tasks to calendar events

### Personnel Management
- **Team Roster** - Track lab members with roles
- **1:1 Tracking** - Meeting history with overdue alerts
- **Onboarding Templates** - Role-based checklists
- **Training Progress** - Compliance and certification tracking

### AI Features
- **Task Extraction** - Extract action items from meeting notes
- **Project Summaries** - AI-generated status updates
- **Grant Fit Scoring** - Match opportunities to your profile
- **Smart Suggestions** - Priority and deadline recommendations

### Multi-Tenancy
- **Workspaces** - Isolated lab/team environments
- **Role-Based Access** - Owner, Admin, Member, Limited roles
- **Invite System** - Magic link workspace invitations
- **Row Level Security** - Database-level data isolation

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui |
| **State** | TanStack Query (server), Zustand (client) |
| **Database** | Supabase (PostgreSQL + pgvector + RLS) |
| **Auth** | Supabase Auth (Email + Google OAuth) |
| **AI Service** | Python FastAPI + Anthropic Claude |
| **Monorepo** | Turborepo + pnpm workspaces |
| **Deployment** | Vercel + GitHub Actions |

---

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9.15+
- Supabase account (free tier available)
- (Optional) Anthropic API key for AI features

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/profdash.git
cd profdash/scholaros

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env.local

# Configure your environment variables (see below)

# Push database migrations to Supabase
supabase db push

# Start development server
pnpm dev
```

### Environment Variables

Create `.env.local` in `scholaros/apps/web/`:

```env
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Google Calendar (optional)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx

# AI Service (optional)
ANTHROPIC_API_KEY=sk-ant-xxx
AI_SERVICE_URL=http://localhost:8000
```

### Open in Browser

```
http://localhost:3000
```

---

## Project Structure

```
scholaros/
├── apps/
│   └── web/                    # Next.js 15 application
│       ├── app/                # App Router pages
│       │   ├── (auth)/         # Auth routes (login, signup)
│       │   ├── (dashboard)/    # Protected dashboard routes
│       │   └── api/            # REST API routes
│       ├── components/         # React components
│       └── lib/                # Utilities, hooks, stores
│
├── packages/
│   └── shared/                 # Shared types & schemas
│       ├── types/              # TypeScript interfaces
│       ├── schemas/            # Zod validation schemas
│       └── utils/              # Shared utilities
│
├── services/
│   └── ai/                     # Python AI microservice
│       ├── app/                # FastAPI application
│       │   ├── agents/         # Multi-agent framework
│       │   └── routers/        # API endpoints
│       └── Dockerfile
│
├── supabase/
│   └── migrations/             # Database migrations
│
├── turbo.json                  # Turborepo config
└── pnpm-workspace.yaml
```

---

## Development

### Commands

```bash
# Start all packages in dev mode
pnpm dev

# Build all packages
pnpm build

# Run type checking
pnpm typecheck

# Run linting
pnpm lint

# Run tests
pnpm test

# Run E2E tests
pnpm test:e2e

# Start specific package
pnpm --filter @scholaros/web dev
pnpm --filter @scholaros/shared build
```

### Database Migrations

Migrations are in `supabase/migrations/`. Apply them with:

```bash
# Using Supabase CLI
supabase db push

# Or manually in Supabase SQL Editor
```

### AI Service (Optional)

The Python AI service provides task extraction, summarization, and grant scoring:

```bash
cd services/ai

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start server
uvicorn app.main:app --reload --port 8000
```

---

## Deployment

### Vercel (Recommended)

1. Import repository to Vercel
2. Set root directory to `scholaros`
3. Add environment variables
4. Deploy

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed instructions.

### Supabase Setup

1. Create project at [supabase.com](https://supabase.com)
2. Run migrations in SQL Editor
3. Enable Email auth provider
4. Configure redirect URLs

---

## Documentation

| Document | Description |
|----------|-------------|
| [CLAUDE.md](CLAUDE.md) | AI assistant context for this codebase |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture and design decisions |
| [docs/API.md](docs/API.md) | REST API reference |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Deployment guide |
| [docs/PRD.md](docs/PRD.md) | Product requirements document |
| [docs/PROGRESS.md](docs/PROGRESS.md) | Implementation status |

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Q` | Focus quick add input |
| `N` | Open new task modal |
| `1-5` | Switch views (Today, Upcoming, Board, List, Calendar) |
| `/` | Focus search |
| `Esc` | Close modals |
| `Cmd/Ctrl + K` | Open command palette |

---

## Quick Add Syntax

```
NSF report fri #grants p1
```

| Token | Meaning | Examples |
|-------|---------|----------|
| Date | Due date | `today`, `tomorrow`, `fri`, `2024-12-25` |
| `#category` | Task category | `#research`, `#teaching`, `#grants`, `#admin` |
| `p1-p4` | Priority | `p1` (urgent), `p2` (high), `p3` (medium), `p4` (low) |
| `@name` | Assignee | `@craig`, `@maria` |
| `+project` | Link to project | `+manuscript-123` |

---

## Architecture Highlights

### Multi-Tenancy
- Workspace-based isolation using PostgreSQL Row Level Security
- Every data table has `workspace_id` column
- RLS policies verify membership before any data access

### Type Safety
- End-to-end TypeScript with strict mode
- Zod schemas for runtime validation
- Shared types package for frontend/backend consistency

### State Management
- TanStack Query for server state (caching, background refetch)
- Zustand for client state (UI, local preferences)
- Optimistic updates for responsive UX

### Security
- Supabase Auth with secure HTTP-only cookies
- Row Level Security on all tables
- OAuth token encryption in database
- Rate limiting on API endpoints

---

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Acknowledgments

- Built with [Next.js](https://nextjs.org/), [Supabase](https://supabase.com/), [shadcn/ui](https://ui.shadcn.com/)
- AI powered by [Anthropic Claude](https://anthropic.com/)
- Icons by [Lucide](https://lucide.dev/)

---

Built for academics who need to get things done.
