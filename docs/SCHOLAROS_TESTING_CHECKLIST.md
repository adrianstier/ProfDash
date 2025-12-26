# ScholarOS Frontend Testing Checklist & Issue Tracker

This document provides a comprehensive testing checklist for all ScholarOS frontend pages and features.
Use this to track testing progress across multiple sessions.

---

## Quick Reference: Project Structure

```
scholaros/apps/web/
├── app/
│   ├── (auth)/          # Authentication routes
│   │   ├── login/
│   │   ├── signup/
│   │   ├── invite/[token]/
│   │   └── error.tsx
│   ├── (dashboard)/     # Protected dashboard routes
│   │   ├── today/
│   │   ├── upcoming/
│   │   ├── board/
│   │   ├── list/
│   │   ├── calendar/
│   │   ├── projects/
│   │   ├── grants/
│   │   ├── personnel/
│   │   ├── publications/
│   │   ├── teaching/
│   │   └── settings/
│   ├── api/             # API routes
│   └── auth/callback/   # OAuth callback
├── components/
│   ├── layout/          # Sidebar, MobileNav
│   ├── tasks/           # TaskCard, TaskList, QuickAdd
│   ├── projects/        # ProjectCard, Milestones
│   ├── ai/              # AI Assistant components
│   ├── grants/          # Grant-related components
│   ├── personnel/       # Personnel components
│   └── ui/              # Shared UI components
├── lib/
│   ├── hooks/           # React Query hooks
│   ├── stores/          # Zustand stores
│   └── supabase/        # Supabase client
└── middleware.ts        # Auth middleware
```

---

## Fixed Issues (2024-12-22)

### Lint Errors Fixed
- [x] `components/ui/empty-state.tsx` - Replaced `require()` imports with proper ES6 imports
- [x] `app/(dashboard)/calendar/page.tsx` - Removed unused `toast` variable
- [x] `app/(dashboard)/settings/page.tsx` - Removed unused `useEffect` import and `router` variable
- [x] `components/layout/sidebar.tsx` - Removed unused `useEffect` and `Bot` imports
- [x] `components/ui/mobile-nav.tsx` - Removed unused `CalendarDays` import
- [x] `components/ai/ai-quick-actions.tsx` - Removed unused `Lightbulb` import
- [x] `components/ai/agent-chat.tsx` - Removed unused `AGENT_ICONS` constant
- [x] `lib/hooks/use-agents.ts` - Removed unused `useQueryClient` and `WorkflowDefinition` imports, fixed `onError` callback
- [x] `app/api/agents/route.ts` - Prefixed unused `request` parameter with underscore
- [x] `app/api/agents/execute/route.ts` - Removed unused `workspaceId` variable
- [x] `app/api/agents/orchestrate/route.ts` - Removed unused `workspaceId` variable, replaced `any` type with proper interface

### Intentional Unused Variables (No Action Needed)
These use the underscore prefix pattern to indicate intentional non-use:
- `_selectedPublication` in publications page
- `_documentId` in extract-tasks-from-document, grant-document-modal, cv-import-modal
- `_extractedData` in grant-document-modal, cv-import-modal

---

## Database Migration Issues Found (2024-12-22)

### Missing Tables (Migrations Not Applied to Supabase)
The following migrations exist in `scholaros/supabase/migrations/` but have NOT been applied to the production Supabase instance:

1. **`20241221000001_publications.sql`** - Publications tracking system
   - Error: `Could not find the table 'public.publications' in the schema cache`
   - Affected pages: `/publications`
   - Tables: `publications`, `publication_authors`, `publication_projects`, `publication_grants`, `publication_files`

2. **`20241221000000_documents_and_ai.sql`** - Documents and AI processing (check if applied)
   - May affect AI features and document import

3. **`20241221100000_agent_framework.sql`** - Agent framework tables (check if applied)
   - May affect AI agent features

### How to Apply Migrations
```bash
# Option 1: Using Supabase CLI
cd scholaros
supabase db push

# Option 2: Manual SQL execution in Supabase dashboard
# Copy contents of each migration file and run in SQL editor
```

### External Service Dependencies
- **AI Service (localhost:8000)**: Not running - affects `/api/agents/*` endpoints
  - Error: `ECONNREFUSED` when calling AI service
  - Gracefully returns 503 status (working as expected)

### Supabase Configuration Issues
- **Email Confirmation**: SMTP not configured in Supabase project
  - Error: "Error sending confirmation email" on signup
  - Users cannot be created via signup form until either:
    1. SMTP is configured in Supabase Dashboard → Settings → Auth → SMTP Settings
    2. Email confirmation is disabled: Supabase Dashboard → Auth → Providers → Email → Disable "Confirm email"

### Creating a Test User (Workaround)
Since email confirmation is failing, create a test user directly in Supabase:

1. **Via Supabase Dashboard**:
   - Go to: https://supabase.com/dashboard/project/okzisdgzgucnpzgkicof/auth/users
   - Click "Add user" → "Create new user"
   - Email: `testuser@scholaros.dev`
   - Password: `TestPassword123!`
   - Check "Auto Confirm User"

2. **Via SQL Editor**:
   ```sql
   -- This creates a confirmed user directly
   -- Note: Password hash must be generated with proper bcrypt
   ```

### Test User Credentials
- **Email**: `tester@scholaros.test`
- **Password**: `TestPassword123!`
- **Status**: ✅ Working (password reset via SQL on 2024-12-22)

---

## Testing Checklist by Page

### AUTHENTICATION PAGES

#### Login Page (`/login`)
- [ ] Email/password form validation
- [ ] Password visibility toggle works
- [ ] Google OAuth button initiates flow
- [ ] Apple OAuth button initiates flow (if implemented)
- [ ] "Forgot password" link navigates correctly
- [ ] Loading states display during submission
- [ ] Error messages display for invalid credentials
- [ ] Redirect to `/today` on successful login
- [ ] Already authenticated users redirect to dashboard

#### Signup Page (`/signup`)
- [ ] Full name input validation
- [ ] Email validation (format, uniqueness)
- [ ] Password strength indicator updates correctly
- [ ] Minimum password requirements enforced
- [ ] Success confirmation screen displays
- [ ] Email verification flow works
- [ ] Link to login page works
- [ ] Error handling for existing accounts

#### Invite Page (`/invite/[token]`)
- [ ] Valid token auto-accepts invitation
- [ ] Loading state during acceptance
- [ ] Success feedback displays
- [ ] Error feedback for expired/invalid tokens
- [ ] Redirect to `/today` on success
- [ ] Workspace is added to user's workspaces

#### Auth Callback (`/auth/callback`)
- [ ] OAuth code exchange works
- [ ] Error handling for failed OAuth
- [ ] Proper redirect after authentication

---

### TASK MANAGEMENT PAGES

#### Today Page (`/today`)
- [ ] Displays only today's tasks
- [ ] Shows overdue tasks
- [ ] Quick add input creates tasks
- [ ] Tasks have correct priority colors
- [ ] AI quick actions work
- [ ] Progress tracker updates in real-time
- [ ] Date display is accurate
- [ ] Empty state shows when no tasks

#### Board Page (`/board`)
- [ ] Three columns display (To Do, In Progress, Done)
- [ ] Drag and drop between columns updates task status
- [ ] Category filter works
- [ ] Priority filter works
- [ ] Multiple filters can be combined
- [ ] Inline quick add creates tasks in correct column
- [ ] Delete confirmation dialog appears
- [ ] Task cards show correct information

#### List Page (`/list`)
- [ ] Pagination works (20 items per page)
- [ ] All filters work (status, category, priority)
- [ ] Quick add creates tasks
- [ ] Filter state persists during navigation
- [ ] Page size can be changed
- [ ] Empty state shows when no results

#### Calendar Page (`/calendar`)
- [ ] Month view displays correctly
- [ ] Tasks appear on correct dates
- [ ] Priority color coding works
- [ ] Google Calendar events display (if connected)
- [ ] Click-to-add task modal works
- [ ] Event popover shows multiple items
- [ ] Legend is collapsible
- [ ] Month navigation works
- [ ] "Today" button works

---

### PROJECT MANAGEMENT PAGES

#### Projects Page (`/projects`)
- [ ] Stats cards show correct counts
- [ ] Clicking stats cards filters projects
- [ ] Type filter (Manuscript, Grant, General) works
- [ ] Status filter (Active, Completed, Archived) works
- [ ] URL-based filter persistence works
- [ ] Empty state guidance appears
- [ ] Delete confirmation works
- [ ] Link to new project page works

#### New Project Page (`/projects/new`)
- [ ] Project type selector works
- [ ] Title input required validation
- [ ] Summary input works
- [ ] Stage selection works
- [ ] Type-specific defaults apply
- [ ] Submit creates project
- [ ] Redirect to project detail on success

#### Project Detail Page (`/projects/[id]`)
- [ ] Title inline editing works
- [ ] Summary inline editing works
- [ ] Stage progress displays correctly
- [ ] Stage can be updated
- [ ] Milestones can be added
- [ ] Milestones can be completed/deleted
- [ ] Linked tasks display
- [ ] Tasks can be linked/unlinked
- [ ] Notes can be added
- [ ] AI summary generation works
- [ ] Status management works
- [ ] Delete confirmation works

---

### GRANT DISCOVERY PAGE (`/grants`)

#### Discover Tab
- [ ] Search input works
- [ ] Keyword filters work
- [ ] Funding range filter works
- [ ] Deadline filter works
- [ ] AI fit scoring displays
- [ ] Results pagination works
- [ ] Grant cards display correct info

#### Watchlist Tab
- [ ] Shows saved grants
- [ ] Can remove from watchlist
- [ ] Deadline urgency colors correct
- [ ] Empty state when no items

#### Saved Searches Tab
- [ ] Shows saved search queries
- [ ] Can run saved search
- [ ] Can delete saved search
- [ ] Empty state when no items

#### Document Import
- [ ] Upload modal opens
- [ ] PDF upload works
- [ ] Data extraction displays
- [ ] Edit extracted data
- [ ] Add to watchlist works

---

### PERSONNEL PAGE (`/personnel`)
- [ ] Personnel list displays
- [ ] Add member modal works
- [ ] All roles available (PhD, Postdoc, Undergrad, Staff, Collaborator)
- [ ] Role badges color coded
- [ ] Role filter works
- [ ] Edit member works
- [ ] Last meeting tracking works
- [ ] CV import modal works
- [ ] Delete confirmation works
- [ ] Empty state shows guidance

---

### SETTINGS PAGES

#### Profile Tab
- [ ] Full name editable
- [ ] Institution editable
- [ ] Department editable
- [ ] Title editable
- [ ] Save button works
- [ ] Success feedback displays

#### Notifications Tab
- [ ] Task due toggle works
- [ ] Grant deadlines toggle works
- [ ] Meeting reminders toggle works
- [ ] Weekly digest toggle works
- [ ] Settings persist on save

#### Appearance Tab
- [ ] Theme selection works (Light, Dark, System)
- [ ] Default view selection works
- [ ] Changes apply immediately

#### Integrations Tab
- [ ] Google Calendar connect button works
- [ ] Connected state shows correctly
- [ ] Sync toggle works
- [ ] Calendar selection dropdown works
- [ ] Refresh button works
- [ ] Disconnect confirmation works
- [ ] Coming soon items display (Outlook, Grants.gov, ORCID)

#### Data Tab
- [ ] Import from V1 button works
- [ ] Export JSON button works
- [ ] Export CSV button works
- [ ] Stats display correctly (tasks, projects, completion rate)
- [ ] Real-time stats update

#### Security Tab
- [ ] Change password form works
- [ ] Enable 2FA toggle works
- [ ] Delete account button shows confirmation
- [ ] Delete account confirmation requires typing

#### Workspace Settings (`/settings/workspace`)
- [ ] Workspace name editable
- [ ] Workspace slug editable
- [ ] Member list displays
- [ ] Invite by email works
- [ ] Role management works (Owner, Admin, Member, Limited)
- [ ] Pending invites section works
- [ ] Cancel invite works
- [ ] Remove member confirmation works

---

### SHARED COMPONENTS

#### Sidebar
- [ ] Logo links to home
- [ ] Workspace switcher works
- [ ] All nav sections expand/collapse
- [ ] Badge counts accurate (today, upcoming)
- [ ] Overdue badge shows red
- [ ] Active page highlighted
- [ ] Search button works
- [ ] AI Assistant button works (Cmd+K)
- [ ] User profile displays correctly
- [ ] Sign out works

#### Mobile Navigation
- [ ] Header displays on mobile
- [ ] Menu button opens drawer
- [ ] Drawer can be closed
- [ ] All nav items accessible
- [ ] Bottom tab navigation works
- [ ] Active states display correctly

#### Task Card
- [ ] Priority color strips display
- [ ] Checkbox toggles completion
- [ ] Edit button works
- [ ] Delete button works
- [ ] Drag handle visible on board
- [ ] Due date displays if set
- [ ] Category badge displays

#### Quick Add
- [ ] Input accepts text
- [ ] Enter key submits
- [ ] Creates task with defaults
- [ ] Clears input on success
- [ ] Error feedback on failure

#### Confirm Dialog
- [ ] Opens when triggered
- [ ] Cancel button closes
- [ ] Confirm button executes action
- [ ] Loading state during action
- [ ] Escape key closes

#### Toast Notifications
- [ ] Success toasts display
- [ ] Error toasts display
- [ ] Auto-dismiss after timeout
- [ ] Can be manually dismissed

---

## Edge Cases to Test

### Authentication
- [ ] Session expiration handling
- [ ] Refresh token flow
- [ ] Multiple tabs with same session
- [ ] OAuth error recovery

### Tasks
- [ ] Empty title submission prevented
- [ ] Very long titles truncate properly
- [ ] Dates in different timezones
- [ ] Rapid task creation
- [ ] Offline mode behavior

### Projects
- [ ] Project with many milestones
- [ ] Project with many linked tasks
- [ ] Long project descriptions

### Calendar
- [ ] Month boundaries (tasks spanning months)
- [ ] Many events on same day
- [ ] Time zone differences

### Workspaces
- [ ] Multiple workspace switching
- [ ] Workspace-specific data isolation
- [ ] Permission enforcement

---

## API Routes to Test

### Tasks API
- [ ] `GET /api/tasks` - List with filters
- [ ] `POST /api/tasks` - Create task
- [ ] `PATCH /api/tasks/[id]` - Update task
- [ ] `DELETE /api/tasks/[id]` - Delete task
- [ ] Rate limiting works

### Projects API
- [ ] `GET /api/projects` - List projects
- [ ] `POST /api/projects` - Create project
- [ ] `GET /api/projects/[id]` - Get project
- [ ] `PATCH /api/projects/[id]` - Update project
- [ ] `DELETE /api/projects/[id]` - Delete project
- [ ] Milestone CRUD operations
- [ ] Notes CRUD operations

### Workspaces API
- [ ] `GET /api/workspaces` - List user workspaces
- [ ] `POST /api/workspaces` - Create workspace
- [ ] Member management endpoints
- [ ] Invite management endpoints

### Calendar API
- [ ] `GET /api/calendar/connection` - Check connection
- [ ] `POST /api/calendar/connection` - Connect calendar
- [ ] `GET /api/calendar/events` - Fetch events
- [ ] `GET /api/calendar/calendars` - List calendars

### AI/Agents API
- [ ] `GET /api/agents` - List agents
- [ ] `POST /api/agents/chat` - Chat messages
- [ ] `POST /api/agents/execute` - Execute task
- [ ] `POST /api/agents/orchestrate` - Workflow orchestration

---

## Performance Checks
- [ ] Initial page load time < 3s
- [ ] Task list renders smoothly (100+ items)
- [ ] Calendar view renders quickly
- [ ] No memory leaks on navigation
- [ ] Images/assets load efficiently

---

## Accessibility Checks (WCAG 2.1 AA)
- [ ] Skip link to main content
- [ ] All interactive elements keyboard accessible
- [ ] ARIA labels on buttons
- [ ] Color contrast meets standards
- [ ] Focus states visible
- [ ] Screen reader compatible

---

## Browser Compatibility
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari
- [ ] Mobile Chrome

---

## Notes for Future Sessions

### Known Limitations
1. Apple OAuth not yet implemented (button present but may not work)
2. Teaching/Courses page is placeholder
3. Some AI features require backend AI service running

### Key Files for Common Issues
- Authentication: `middleware.ts`, `lib/supabase/server.ts`
- State Management: `lib/stores/workspace-store.ts`, `lib/stores/task-store.ts`
- API Patterns: `lib/hooks/use-tasks.ts` (good example)
- UI Components: `components/ui/dialog.tsx`, `components/ui/toast.tsx`

### Testing Commands
```bash
cd scholaros/apps/web

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Run tests
pnpm test

# Development server
pnpm dev
```

---

*Last Updated: 2024-12-22*
*Status: Lint errors fixed, TypeScript compiles successfully*
