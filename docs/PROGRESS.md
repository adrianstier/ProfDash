# ScholarOS Development Progress

**Last Updated:** January 12, 2026
**Current Phase:** Phase 8 (Enhanced Collaboration & Insights) - Complete

---

## Quick Status Summary

| Phase | Status | Completion |
|-------|--------|------------|
| Phase 0: Project Setup | ✅ Complete | 100% |
| Phase 1: Core UI Port | ✅ Complete | 100% |
| Phase 2: Task System | ✅ Complete | 100% |
| Phase 3: Multi-Tenancy | ✅ Complete | 100% |
| Phase 4: Projects & Content | ✅ Complete | 100% |
| Phase 5: External Integrations | ✅ Complete | 100% |
| Phase 6: AI Features | ✅ Complete | 100% |
| Phase 7: Polish & Launch | ✅ Complete | 100% |
| Phase 8: Enhanced Collaboration & Insights | ✅ Complete | 100% |

---

## Detailed Phase Status

### Phase 0: Project Setup ✅

**All tasks completed:**
- [x] Turborepo monorepo with pnpm workspaces
- [x] Next.js 15 app with App Router
- [x] TypeScript configuration
- [x] Tailwind CSS setup
- [x] Supabase configuration
- [x] GitHub Actions CI/CD workflow
- [x] Environment variable templates

**Key Files:**
- `scholaros/package.json` - Root monorepo config
- `scholaros/turbo.json` - Turborepo pipeline
- `scholaros/pnpm-workspace.yaml` - Workspace definition
- `scholaros/.github/workflows/ci.yml` - CI pipeline

---

### Phase 1: Core UI Port ✅

**All tasks completed:**
- [x] Supabase authentication (email/password)
- [x] Login/signup pages
- [x] Protected route middleware
- [x] Dashboard layout with sidebar
- [x] Route structure for all sections
- [x] Zustand stores for UI state

**Key Files:**
- `apps/web/lib/supabase/client.ts` - Browser Supabase client
- `apps/web/lib/supabase/server.ts` - Server Supabase client
- `apps/web/middleware.ts` - Auth middleware
- `apps/web/app/(auth)/login/page.tsx` - Login page
- `apps/web/app/(dashboard)/layout.tsx` - Dashboard layout
- `apps/web/components/layout/sidebar.tsx` - Navigation sidebar

---

### Phase 2: Task System ✅

**All tasks completed:**
- [x] Tasks database schema with RLS
- [x] Zod validation schemas
- [x] Task CRUD API routes
- [x] TanStack Query hooks with optimistic updates
- [x] Quick-add parser (priority, category, dates)
- [x] Today view
- [x] Upcoming view (14-day timeline)
- [x] Board view (Kanban)
- [x] List view (table)
- [x] Calendar view (month grid)
- [x] Task detail drawer

**Key Files:**
- `supabase/migrations/20241217000000_initial_schema.sql` - Tasks table
- `packages/shared/src/schemas/index.ts` - Zod schemas
- `packages/shared/src/utils/index.ts` - Quick-add parser
- `apps/web/lib/hooks/use-tasks.ts` - Task hooks
- `apps/web/app/api/tasks/route.ts` - Task API
- `apps/web/components/tasks/quick-add.tsx` - Quick add component
- `apps/web/components/tasks/task-card.tsx` - Task card
- `apps/web/components/tasks/task-detail-drawer.tsx` - Detail drawer

---

### Phase 3: Multi-Tenancy ✅

**All tasks completed:**
- [x] Workspaces database schema
- [x] Workspace members with roles (owner/admin/member/limited)
- [x] Workspace invites with magic link tokens
- [x] RLS policies for workspace-scoped data
- [x] Workspace CRUD API routes
- [x] Member management API
- [x] Invite flow API
- [x] Workspace switcher component
- [x] Workspace settings page
- [x] Accept invite page
- [x] Tasks scoped to workspaces

**Key Files:**
- `supabase/migrations/20241217000001_workspace_invites.sql` - Workspace tables
- `apps/web/lib/hooks/use-workspaces.ts` - Workspace hooks
- `apps/web/lib/stores/workspace-store.ts` - Workspace Zustand store
- `apps/web/app/api/workspaces/` - Workspace API routes
- `apps/web/components/workspace/workspace-switcher.tsx` - Switcher UI
- `apps/web/app/(auth)/invite/[token]/page.tsx` - Accept invite

---

### Phase 4: Projects & Content ✅

**All tasks completed:**
- [x] Projects database schema (manuscript/grant/general types)
- [x] Project milestones table
- [x] Project notes table
- [x] Project collaborators table
- [x] Stage configurations for each project type
- [x] Project CRUD API routes
- [x] Milestone CRUD API routes
- [x] Notes CRUD API routes
- [x] Project hooks (useProjects, useMilestones, useNotes)
- [x] Projects list page with filters
- [x] New project wizard
- [x] Project detail page
- [x] Stage progress visualization
- [x] Milestone list component
- [x] Project notes component
- [x] Task-project linking in task drawer

**Key Files:**
- `supabase/migrations/20241217000002_project_milestones_notes.sql` - Project tables
- `packages/shared/src/config/project-stages.ts` - Stage configurations
- `apps/web/lib/hooks/use-projects.ts` - Project hooks
- `apps/web/app/api/projects/` - Project API routes
- `apps/web/app/(dashboard)/projects/page.tsx` - Projects list
- `apps/web/app/(dashboard)/projects/new/page.tsx` - Create project
- `apps/web/app/(dashboard)/projects/[id]/page.tsx` - Project detail
- `apps/web/components/projects/` - Project components

**Project Stage Configurations:**
- **Manuscript:** idea → outline → drafting → internal-review → submission → revision → accepted → published
- **Grant:** discovery → fit-assessment → intent-loi → drafting → internal-routing → submission → awarded → active → closeout
- **General:** planning → active → completed → archived

---

### Phase 5: External Integrations ✅ COMPLETE

**All tasks completed:**
- [x] Calendar connections database schema
- [x] Calendar events cache table
- [x] Funding opportunities database schema
- [x] Saved searches table
- [x] Opportunity watchlist table
- [x] Google Calendar OAuth initiation route
- [x] Google Calendar OAuth callback route
- [x] Calendar connection status API
- [x] Calendar events fetch API (with token refresh)
- [x] Calendar list API
- [x] Calendar hooks (useCalendarConnection, useCalendarEvents, etc.)
- [x] Extended types for calendar and grants
- [x] Calendar settings UI for connection management (connect/disconnect, sync toggle, calendar selection)
- [x] Calendar view integration with synced events (shows both tasks and Google Calendar events)
- [x] Visual differentiation between tasks and calendar events (icons, colors, legend)
- [x] Grants discovery search page with filters (keywords, agency, amount, deadline)
- [x] Grants watchlist functionality (add/remove, status tracking, priority)
- [x] Saved searches with alert frequency (save, load, delete searches)
- [x] Grants API routes (search, watchlist CRUD, saved searches CRUD)
- [x] Grants hooks (useGrantSearch, useWatchlist, useSavedSearches, mutations)

**Key Files Created:**
- `supabase/migrations/20241217000003_calendar_integrations.sql`
- `supabase/migrations/20241217000004_funding_opportunities.sql`
- `apps/web/app/api/auth/google/route.ts` - OAuth start
- `apps/web/app/api/auth/google/callback/route.ts` - OAuth callback
- `apps/web/app/api/calendar/connection/route.ts` - Connection status
- `apps/web/app/api/calendar/events/route.ts` - Events fetch
- `apps/web/app/api/calendar/calendars/route.ts` - Calendar list
- `apps/web/lib/hooks/use-calendar.ts` - Calendar hooks
- `apps/web/app/api/grants/search/route.ts` - Grant search API
- `apps/web/app/api/grants/watchlist/route.ts` - Watchlist API
- `apps/web/app/api/grants/watchlist/[id]/route.ts` - Watchlist item API
- `apps/web/app/api/grants/saved-searches/route.ts` - Saved searches API
- `apps/web/app/api/grants/saved-searches/[id]/route.ts` - Saved search item API
- `apps/web/lib/hooks/use-grants.ts` - Grants hooks
- `apps/web/app/(dashboard)/settings/page.tsx` - Updated with integrations tab
- `apps/web/app/(dashboard)/calendar/page.tsx` - Updated with Google Calendar integration
- `apps/web/app/(dashboard)/grants/page.tsx` - Full grants discovery UI

**Environment Variables Needed for Google Calendar:**
```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

---

### Phase 6: AI Features ✅ COMPLETE

**All tasks completed:**
- [x] Python FastAPI microservice setup
- [x] Task extraction from text endpoint (`/extract-tasks`)
- [x] Project status summaries endpoint (`/project-summary`)
- [x] Grant fit scoring endpoint (`/fit-score`)
- [x] Next.js API proxy routes to AI service
- [x] AI UI components (ExtractTasksModal, ProjectSummary, GrantFitBadge)
- [x] AI components integrated into pages (projects, grants, today)

**Key Files Created:**

*Python FastAPI Microservice (`services/ai/`):*
- `services/ai/requirements.txt` - Python dependencies
- `services/ai/pyproject.toml` - Poetry configuration
- `services/ai/Dockerfile` - Container deployment
- `services/ai/.env.example` - Environment template
- `services/ai/app/main.py` - FastAPI app with CORS and API key auth
- `services/ai/app/config.py` - Settings with LLM provider config
- `services/ai/app/models/schemas.py` - Pydantic request/response schemas
- `services/ai/app/services/llm.py` - LLM service (Anthropic/OpenAI)
- `services/ai/app/routers/extract.py` - Task extraction endpoint
- `services/ai/app/routers/summarize.py` - Project summary endpoint
- `services/ai/app/routers/grants.py` - Grant fit scoring endpoint

*Next.js API Proxy Routes:*
- `apps/web/app/api/ai/extract-tasks/route.ts` - Proxy to task extraction
- `apps/web/app/api/ai/project-summary/route.ts` - Proxy to project summary
- `apps/web/app/api/ai/fit-score/route.ts` - Proxy to grant fit scoring

*React Hooks:*
- `apps/web/lib/hooks/use-ai.ts` - AI feature hooks (useExtractTasks, useProjectSummary, useGrantFitScore)

*AI UI Components (`apps/web/components/ai/`):*
- `components/ai/index.ts` - Component exports
- `components/ai/extract-tasks-modal.tsx` - Modal to extract tasks from pasted text
- `components/ai/project-summary.tsx` - AI-generated project health and status
- `components/ai/grant-fit-badge.tsx` - AI fit score with detailed analysis
- `components/ai/ai-quick-actions.tsx` - Quick actions button for Today page

**AI Feature Descriptions:**

1. **Task Extraction** - Users can paste meeting notes, emails, or any text and the AI extracts actionable tasks with:
   - Title and description
   - Priority (P1-P4) based on urgency signals
   - Category (research, teaching, grants, etc.) based on context
   - Due dates extracted from natural language
   - Confidence score for each extracted task
   - Bulk import selected tasks to task list

2. **Project Summary** - Generate AI-powered status summaries for projects showing:
   - Health score (0-100%)
   - Recent accomplishments
   - Potential blockers
   - Suggested next actions
   - Available on project detail pages

3. **Grant Fit Scoring** - AI analysis of grant opportunity fit showing:
   - Fit score (0-100%)
   - Reasons why it's a good fit
   - Potential gaps to address
   - Suggestions for improving fit
   - Expandable details on watchlist items

**Environment Variables Needed for AI Service:**
```env
# AI Service
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_API_KEY=your_internal_api_key

# LLM Provider (choose one)
LLM_PROVIDER=anthropic  # or 'openai'
ANTHROPIC_API_KEY=your_anthropic_key
OPENAI_API_KEY=your_openai_key
```

**Running the AI Service:**
```bash
cd services/ai
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

---

### Phase 7: Polish & Launch ✅ COMPLETE

**Completed:**
- [x] Performance optimization - TanStack Query cache settings with retry logic
- [x] Query key factory for consistent cache management
- [x] React Query DevTools integration (development only)
- [x] Error boundary component with retry functionality
- [x] Loading skeleton and empty state components
- [x] Skip link for keyboard navigation (WCAG 2.1 AA)
- [x] Focus trap component for modals and dialogs
- [x] Arrow key navigation hook for menus/lists
- [x] Data migration tooling from v1 localStorage
- [x] Import data modal with validation and progress tracking
- [x] Export backup functionality
- [x] Data management settings tab
- [x] Add pagination to large lists (tasks, grants)
- [x] Complete accessibility audit - ARIA labels, keyboard navigation, screen reader support
- [x] API documentation
- [x] Deployment guide
- [x] **Comprehensive feature testing and bug fixes (December 2024)**

**Bugs Found and Fixed During Testing:**

1. **Login redirect issue** - After successful login, users were redirected to the landing page (`/`) instead of the dashboard
   - Fixed in: `apps/web/app/(auth)/login/page.tsx` - Changed redirect to `/today`
   - Fixed in: `apps/web/middleware.ts` - Added redirect from `/` to `/today` for logged-in users

2. **Workspace auto-selection React anti-pattern** - WorkspaceSwitcher was calling `setState` during render, causing React warnings
   - Fixed in: `apps/web/components/workspace/workspace-switcher.tsx` - Moved auto-selection logic to `useEffect`

3. **RLS infinite recursion on workspace_members** - Row Level Security policies on `workspace_members` table caused infinite recursion when querying
   - Fixed by: Creating `SECURITY DEFINER` functions (`get_user_workspace_ids`, `user_has_workspace_role`) that bypass RLS for membership checks
   - Updated RLS policies to use these functions instead of direct subqueries

4. **Supabase auth database NULL handling** - Login failed with "Database error querying schema" due to NULL values in `email_change` column
   - Fixed by: Updating NULL values to empty strings in `auth.users` table

5. **Safari Intelligent Tracking Prevention (ITP)** - Sign-in not working in Safari due to cookie blocking
   - Fixed in: `apps/web/lib/supabase/client.ts` - Added `sameSite: "lax"` cookie options

6. **RLS policies causing infinite recursion across multiple tables** - Several tables had RLS policies that directly queried `workspace_members`, causing infinite recursion
   - Fixed tables: `projects`, `project_milestones`, `project_notes`, `project_collaborators`, `workspaces`, `workspace_invites`, `opportunity_watchlist`, `saved_searches`
   - Solution: Updated all policies to use security definer functions (`get_user_workspace_ids`, `user_has_workspace_role`, `user_can_access_project`)

7. **Potential SQL injection in grants search** - Keywords and agency filters were interpolated directly into query strings
   - Fixed in: `apps/web/app/api/grants/search/route.ts` - Added sanitization for `%` and `_` characters

**Key Files Created:**

*Performance & Error Handling:*
- `apps/web/app/providers.tsx` - Enhanced with query key factory, cache settings, retry logic, DevTools
- `apps/web/components/error-boundary.tsx` - Error boundary, QueryErrorFallback, EmptyState, LoadingSkeleton

*Accessibility (`apps/web/components/accessibility/`):*
- `components/accessibility/skip-link.tsx` - Skip link and multiple skip links
- `components/accessibility/focus-trap.tsx` - Focus trap and arrow key navigation hook
- `components/accessibility/index.ts` - Component exports

*Data Migration (`apps/web/lib/migration/` & `apps/web/components/migration/`):*
- `lib/migration/import-v1-data.ts` - V1 to V2 conversion utilities, validation, export/import
- `components/migration/import-data-modal.tsx` - Full import wizard with progress tracking

*Pagination:*
- `apps/web/lib/hooks/use-pagination.ts` - Reusable pagination hook with client/server-side support
- `apps/web/components/ui/pagination.tsx` - Pagination, SimplePagination, LoadMoreButton components

*Documentation:*
- `docs/API.md` - Complete API reference documentation
- `docs/DEPLOYMENT.md` - Production deployment guide for Vercel, Supabase, and AI service

*Updated Files:*
- `apps/web/app/(dashboard)/layout.tsx` - Added skip link and ARIA landmarks
- `apps/web/app/(dashboard)/settings/page.tsx` - Added Data tab with import/export UI
- `apps/web/app/(dashboard)/list/page.tsx` - TaskList with pagination enabled
- `apps/web/components/tasks/task-list.tsx` - Added pagination support
- `apps/web/components/tasks/task-card.tsx` - Enhanced accessibility with ARIA labels
- `apps/web/components/tasks/quick-add.tsx` - Added accessibility attributes
- `apps/web/components/layout/sidebar.tsx` - Added navigation landmarks and ARIA
- `apps/web/components/ui/pagination.tsx` - Enhanced with screen reader support

---

### Phase 8: Enhanced Collaboration & Insights ✅ COMPLETE

**Completed:**
- [x] Analytics dashboard with workspace metrics
- [x] Team productivity tracking and visualization
- [x] Activity and completion trend charts
- [x] Bulk task operations (multi-select, update, delete)
- [x] Floating bulk actions toolbar with animations
- [x] Task import/export (CSV and JSON formats)
- [x] CSV parsing with intelligent field mapping
- [x] Import validation and batch processing
- [x] Activity feed component
- [x] Real-time presence indicators
- [x] Keyboard shortcuts modal with customizable bindings
- [x] Enhanced UI components (card, tabs, select, progress, alert-dialog, scroll-area)
- [x] Analytics API with period filtering (7d, 30d, 90d, all)
- [x] Bulk operations API with RLS validation
- [x] Import/export API with format detection
- [x] Comprehensive analytics hooks (useAnalytics)
- [x] Keyboard shortcuts hooks (useKeyboardShortcuts)

**Key Features:**

1. **Analytics Dashboard** - Comprehensive workspace insights:
   - Summary statistics (total tasks, completion rate, avg tasks/day)
   - Task distribution by status, priority, and category
   - Project breakdown by type (manuscripts, grants, general)
   - 14-day activity and completion trends with sparklines
   - Team member productivity with completion rates
   - Interactive period selection (7d, 30d, 90d, all time)
   - Real-time data refresh with TanStack Query caching

2. **Bulk Operations** - Efficient multi-task management:
   - Selection mode toggle with visual feedback
   - Multi-select with checkboxes on task cards
   - Floating toolbar with smooth animations
   - Bulk update: status, priority, category
   - Bulk delete with confirmation dialog
   - Select all / deselect all functionality
   - Clear visual selection state
   - Optimistic updates with error handling

3. **Import/Export** - Data portability and backup:
   - Export tasks as CSV or JSON
   - Import from CSV with intelligent field mapping
   - Automatic status/priority/category normalization
   - Date format detection (ISO, MM/DD/YYYY, YYYY-MM-DD)
   - Batch processing for large imports (500 task limit)
   - Validation with detailed error reporting
   - Progress tracking during import

4. **Activity & Presence** - Real-time collaboration awareness:
   - Activity feed showing workspace actions
   - Real-time presence indicators
   - User online/offline status
   - Activity timestamps and user attribution

5. **Keyboard Shortcuts** - Power user efficiency:
   - Global keyboard shortcut modal (Cmd+K or Ctrl+K)
   - Searchable command palette
   - Navigation shortcuts (Today, Upcoming, Board, etc.)
   - Quick task creation (Cmd+N)
   - Global search (Cmd+/)
   - Customizable keybindings

**Key Files Created:**

*Analytics:*
- `apps/web/app/(dashboard)/analytics/page.tsx` - Analytics page route
- `apps/web/app/api/analytics/route.ts` - Analytics aggregation API
- `apps/web/components/analytics/analytics-dashboard.tsx` - Dashboard component
- `apps/web/lib/hooks/use-analytics.ts` - Analytics data hooks

*Bulk Operations:*
- `apps/web/app/api/tasks/bulk/route.ts` - Bulk update/delete API
- `apps/web/components/tasks/bulk-actions-toolbar.tsx` - Floating toolbar UI
- `apps/web/lib/stores/task-store.ts` - Extended with selection state

*Import/Export:*
- `apps/web/app/api/tasks/export/route.ts` - Export API (CSV/JSON)
- `apps/web/app/api/tasks/import/route.ts` - Import API with CSV parsing
- `apps/web/components/tasks/import-export-modal.tsx` - Import/export UI

*Activity & Presence:*
- `apps/web/components/activity/activity-feed.tsx` - Activity timeline
- `apps/web/components/presence/` - Presence system components

*Keyboard Shortcuts:*
- `apps/web/components/keyboard-shortcuts-modal.tsx` - Shortcuts modal
- `apps/web/lib/hooks/use-keyboard-shortcuts.ts` - Shortcut management

*Enhanced UI Components:*
- `apps/web/components/ui/card.tsx` - Card component
- `apps/web/components/ui/tabs.tsx` - Tabs component
- `apps/web/components/ui/select.tsx` - Select dropdown
- `apps/web/components/ui/progress.tsx` - Progress bar
- `apps/web/components/ui/alert-dialog.tsx` - Alert dialogs
- `apps/web/components/ui/scroll-area.tsx` - Scroll area

**API Endpoints Added:**

| Route | Methods | Description |
|-------|---------|-------------|
| `/api/analytics` | GET | Fetch workspace analytics with period filter |
| `/api/tasks/bulk` | PATCH, DELETE | Bulk update/delete tasks |
| `/api/tasks/export` | GET | Export tasks as CSV or JSON |
| `/api/tasks/import` | POST | Import tasks from CSV or JSON |

**Performance & Optimization:**
- Analytics queries optimized with parallel data fetching
- Bulk operations use batch processing (50 tasks per batch)
- Import/export streaming for large datasets
- TanStack Query caching for analytics (1-minute stale time)
- Optimistic UI updates for bulk operations

**UX Enhancements:**
- Framer Motion animations for bulk toolbar
- Interactive charts with hover states
- Responsive design across all new components
- Loading skeletons and error states
- Toast notifications for bulk operation feedback

---

## File Structure Overview

```
scholaros/
├── apps/
│   └── web/                    # Next.js 15 application
│       ├── app/
│       │   ├── (auth)/         # Login, signup, invite pages
│       │   ├── (dashboard)/    # Protected dashboard pages
│       │   └── api/            # API routes
│       ├── components/
│       │   ├── layout/         # Sidebar, providers
│       │   ├── tasks/          # Task components
│       │   ├── projects/       # Project components
│       │   ├── workspace/      # Workspace components
│       │   ├── ai/             # AI feature components
│       │   ├── accessibility/  # Skip links, focus trap
│       │   └── migration/      # Data import modal
│       └── lib/
│           ├── hooks/          # TanStack Query hooks
│           ├── stores/         # Zustand stores
│           ├── migration/      # V1 to V2 data conversion
│           └── supabase/       # Supabase clients
├── packages/
│   └── shared/                 # Shared types, schemas, utils
│       └── src/
│           ├── types/          # TypeScript interfaces
│           ├── schemas/        # Zod validation
│           ├── config/         # Project stages config
│           └── utils/          # Quick-add parser
├── services/
│   └── ai/                     # Python FastAPI microservice
│       └── app/
│           ├── models/         # Pydantic schemas
│           ├── routers/        # API endpoints
│           └── services/       # LLM service
├── supabase/
│   └── migrations/             # Database migrations
└── docs/                       # Documentation
```

---

## API Routes Summary

| Route | Methods | Description |
|-------|---------|-------------|
| `/api/tasks` | GET, POST | List/create tasks |
| `/api/tasks/[id]` | GET, PATCH, DELETE | Task operations |
| `/api/workspaces` | GET, POST | List/create workspaces |
| `/api/workspaces/[id]` | GET, PATCH, DELETE | Workspace operations |
| `/api/workspaces/[id]/members` | GET, POST | Member management |
| `/api/workspaces/[id]/invites` | GET, POST | Invite management |
| `/api/workspaces/accept-invite` | POST | Accept invitation |
| `/api/projects` | GET, POST | List/create projects |
| `/api/projects/[id]` | GET, PATCH, DELETE | Project operations |
| `/api/projects/[id]/milestones` | GET, POST | Milestone management |
| `/api/projects/[id]/notes` | GET, POST | Notes management |
| `/api/auth/google` | GET, DELETE | Google OAuth start/disconnect |
| `/api/auth/google/callback` | GET | OAuth callback |
| `/api/calendar/connection` | GET, PATCH | Connection status |
| `/api/calendar/events` | GET | Fetch events |
| `/api/calendar/calendars` | GET | List calendars |
| `/api/grants/search` | GET | Search funding opportunities |
| `/api/grants/watchlist` | GET, POST | List/add to watchlist |
| `/api/grants/watchlist/[id]` | PATCH, DELETE | Update/remove watchlist item |
| `/api/grants/saved-searches` | GET, POST | List/create saved searches |
| `/api/grants/saved-searches/[id]` | DELETE | Delete saved search |
| `/api/ai/extract-tasks` | POST | Extract tasks from text |
| `/api/ai/project-summary` | POST | Generate project summary |
| `/api/ai/fit-score` | POST | Score grant fit |

---

## Database Tables

| Table | Phase | Description |
|-------|-------|-------------|
| `profiles` | 1 | User profiles |
| `tasks` | 2 | Task items |
| `workspaces` | 3 | Workspace/team containers |
| `workspace_members` | 3 | User-workspace relationships |
| `workspace_invites` | 3 | Pending invitations |
| `projects` | 4 | Unified projects (manuscripts/grants/general) |
| `project_milestones` | 4 | Project milestones |
| `project_notes` | 4 | Project notes |
| `project_collaborators` | 4 | Project team members |
| `calendar_connections` | 5 | OAuth tokens for calendar sync |
| `calendar_events_cache` | 5 | Cached external events |
| `funding_opportunities` | 5 | Grant opportunities from Grants.gov |
| `saved_searches` | 5 | Saved grant search queries |
| `opportunity_watchlist` | 5 | Tracked grant opportunities |

---

## Next Steps for Continuation

The next Claude Code agent should proceed to **Phase 7: Polish & Launch**:

1. **Performance Optimization:**
   - Audit and optimize TanStack Query cache settings
   - Implement React Suspense boundaries for better loading states
   - Add pagination to large lists (tasks, grants)
   - Optimize Supabase queries with proper indexes

2. **Accessibility Audit (WCAG 2.1 AA):**
   - Add proper ARIA labels to interactive elements
   - Ensure keyboard navigation works throughout
   - Test with screen readers
   - Check color contrast ratios
   - Add skip links and focus management

3. **Data Migration Tooling:**
   - Create migration script from v1 localStorage to Supabase
   - Build import/export functionality for tasks and projects
   - Add bulk data operations

4. **Documentation:**
   - API documentation with examples
   - User guide for key features
   - Deployment guide for self-hosting
   - Developer setup instructions

5. **Launch Checklist:**
   - Security audit (RLS policies, input validation)
   - Error handling and logging improvements
   - Rate limiting on API routes
   - Production environment configuration
   - Monitoring and alerting setup

---

## Running the Project

```bash
# Install dependencies
cd scholaros
pnpm install

# Build shared package
pnpm build

# Run development server
pnpm dev

# Access at http://localhost:3000
```

**Required Environment Variables:**
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```
