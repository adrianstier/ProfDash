# ScholarOS Fix Prompts

Copy-paste these prompts to fix each issue identified in the comprehensive report.

---

## Critical Fixes (P0)

### Prompt 1: Fix Quick-Add Same-Day Parsing Bug

```
Fix the quick-add day-of-week parsing bug in packages/shared/src/utils/index.ts.

Current behavior: When typing "fri" on a Friday, the task is scheduled for NEXT Friday (7 days later).
Expected behavior: When typing "fri" on a Friday, the task should be due TODAY.

The bug is in the getNextDayOfWeek function at lines 141-154:

function getNextDayOfWeek(dayIndex: number): Date {
  const today = new Date();
  const currentDay = today.getDay();
  let daysUntil = dayIndex - currentDay;

  if (daysUntil <= 0) {  // BUG: daysUntil === 0 means today, should not add 7
    daysUntil += 7;
  }
  // ...
}

Fix this by changing the condition from <= 0 to < 0, so that daysUntil === 0 returns today's date.

Also add a unit test in packages/shared/src/utils/index.test.ts to verify:
1. "today" returns today's date
2. A day-of-week matching today returns today
3. A past day-of-week returns next week's occurrence
4. A future day-of-week returns this week's occurrence
```

---

### Prompt 2: Implement Publication View/Edit Modal

```
Create a publication view/edit modal for the publications page.

Current state: The publications page at apps/web/app/(dashboard)/publications/page.tsx has a TODO comment for a view/edit modal. The selectedPublication state exists but is unused.

Requirements:
1. Create apps/web/components/publications/publication-modal.tsx with:
   - View mode showing all publication details (title, authors, DOI, journal, status, dates)
   - Edit mode with form fields for each property
   - Status change dropdown matching the pipeline stages
   - Author management (add/remove/reorder)
   - Delete button with confirmation

2. Update the publications page to:
   - Pass selectedPublication to the new modal
   - Open modal on PublicationCard click
   - Handle onSave callback to update publication via useUpdatePublication hook
   - Handle onDelete callback to delete publication

3. The modal should follow the existing design patterns:
   - Use the Dialog component from components/ui/dialog
   - Match styling of other modals (e.g., AddPublicationModal)
   - Include proper accessibility attributes
   - Support keyboard navigation (Escape to close)
```

---

### Prompt 3: Integrate Onboarding Flow

```
Create and integrate an onboarding flow for new users in the dashboard.

Requirements:
1. Create apps/web/components/onboarding/onboarding-wizard.tsx:
   - Step 1: Welcome message with platform overview
   - Step 2: Create or join first workspace
   - Step 3: Quick tour of key features (quick-add, projects, grants)
   - Step 4: Optional: Connect Google Calendar
   - Step 5: Create first task with guided quick-add

2. Create a Zustand store apps/web/lib/stores/onboarding-store.ts to track:
   - hasCompletedOnboarding: boolean (persisted to localStorage)
   - currentStep: number
   - skipOnboarding(): void
   - completeOnboarding(): void

3. Integrate into apps/web/app/(dashboard)/layout.tsx:
   - Check if user has completed onboarding
   - If not, render OnboardingWizard overlay
   - Allow skipping with "Skip for now" button

4. Store onboarding completion in the profiles table:
   - Add a migration for onboarding_completed_at timestamp column
   - Update profile on completion

5. Style the wizard with:
   - Full-screen overlay with backdrop blur
   - Centered card with progress indicator
   - Smooth transitions between steps
   - Mobile-responsive design
```

---

### Prompt 4: Implement Recurring Tasks

```
Add recurring task functionality to ScholarOS.

Database Changes (create migration):
1. Add to tasks table:
   - recurrence_rule: text (iCal RRULE format, e.g., "FREQ=WEEKLY;BYDAY=MO")
   - recurrence_end: date (optional end date)
   - parent_task_id: uuid (references tasks.id for linked recurrences)

2. Create a function to generate next occurrence when a recurring task is completed

Frontend Changes:
1. Update apps/web/components/tasks/task-modal.tsx:
   - Add recurrence selector (None, Daily, Weekly, Monthly, Custom)
   - For Weekly: allow selecting days of week
   - For Custom: show RRULE builder

2. Update apps/web/lib/hooks/use-tasks.ts:
   - When completing a recurring task, call API to generate next occurrence
   - New tasks inherit all properties except due date

3. Update quick-add parser in packages/shared/src/utils/index.ts:
   - Add syntax: "every monday", "daily", "weekly"
   - Parse into recurrence_rule field

4. Visual indicator on recurring tasks:
   - Add repeat icon to TaskCard
   - Show recurrence pattern in task details

Backend Changes:
1. Create apps/web/app/api/tasks/[id]/complete/route.ts:
   - On POST, if task has recurrence_rule, generate next occurrence
   - Calculate next due date based on RRULE
   - Insert new task with parent_task_id reference
```

---

## High Priority Fixes (P1)

### Prompt 5: Persist Grant Filter State in URL

```
Update the grants page to persist filter state in URL parameters.

File: apps/web/app/(dashboard)/grants/page.tsx

Requirements:
1. Use Next.js useSearchParams and useRouter for URL state
2. Persist these filters in URL:
   - agency (e.g., ?agency=NSF)
   - deadline range (?deadline_start=2024-01-01&deadline_end=2024-06-01)
   - amount range (?min_amount=100000&max_amount=500000)
   - search query (?q=machine+learning)
   - keyword filters (?keywords=AI,biomedical)

3. On page load, initialize filters from URL params
4. On filter change, update URL with router.replace (scroll: false)
5. Add "Copy Filter Link" button to share saved searches

Follow the pattern used in apps/web/app/(dashboard)/projects/page.tsx which already implements URL filter persistence.
```

---

### Prompt 6: Add Timezone Support

```
Add timezone awareness throughout ScholarOS.

Database Changes:
1. Create migration to add timezone column to profiles table:
   - timezone: text (IANA timezone, e.g., "America/New_York")
   - Default to UTC

2. All date/time columns should store UTC timestamps

Frontend Changes:
1. Add timezone selector to apps/web/app/(dashboard)/settings/page.tsx:
   - Dropdown with common timezones
   - Auto-detect option using Intl.DateTimeFormat().resolvedOptions().timeZone

2. Update packages/shared/src/utils/index.ts:
   - formatDate() should accept optional timezone parameter
   - formatRelativeDate() should convert UTC to user timezone
   - isDueToday() should check against user's local date

3. Create a useTimezone hook:
   - Fetch user's timezone from profile
   - Provide formatting functions with timezone applied

4. Update all date displays:
   - TaskCard due dates
   - Calendar views
   - Project milestones
   - Grant deadlines

5. Show timezone indicator on dates when collaborators have different timezones

Backend Changes:
1. Store all dates in UTC
2. Return dates in ISO 8601 format with Z suffix
3. Document timezone handling in API.md
```

---

### Prompt 7: Increase Mobile Touch Targets

```
Update touch target sizes throughout ScholarOS to meet WCAG 2.1 AA requirements (44x44 minimum).

Files to update:
1. apps/web/components/tasks/quick-add.tsx:
   - Change icon container from h-9 w-9 (36px) to h-11 w-11 (44px)
   - Adjust padding accordingly

2. apps/web/components/layout/sidebar.tsx:
   - Ensure all icon buttons are at least 44x44
   - Add padding if icons are smaller

3. apps/web/components/tasks/task-card.tsx:
   - Action buttons (edit, delete, complete) should be 44x44
   - Add hit area padding for small icons

4. apps/web/components/ui/button.tsx:
   - Add a size="touch" variant that ensures 44px minimum
   - Use for all interactive elements on touch devices

5. General pattern:
   - Use min-h-11 min-w-11 on all clickable icons
   - Add p-2 padding around icons smaller than 28px
   - Test with touch simulator in browser devtools

Create a utility class in globals.css:
.touch-target {
  @apply min-h-11 min-w-11 flex items-center justify-center;
}
```

---

### Prompt 8: Add Invite Resend Functionality

```
Add ability to resend workspace invitations.

Files to update:
1. apps/web/components/personnel/team-management.tsx:
   - Add "Resend" button to pending invite rows
   - Show timestamp of last invite sent
   - Disable button for 5 minutes after sending (rate limit)

2. Create apps/web/app/api/workspaces/[id]/invites/[inviteId]/resend/route.ts:
   - POST handler to resend invite email
   - Check that invite is still pending
   - Update invited_at timestamp
   - Rate limit: max 1 resend per 5 minutes per invite

3. Update apps/web/lib/hooks/use-invites.ts:
   - Add useResendInvite mutation hook
   - Invalidate invites query on success

4. Email template update (if using email service):
   - Include note that this is a resend
   - Show expiration time remaining

5. UI feedback:
   - Toast notification on success: "Invitation resent to {email}"
   - Error handling for rate limit: "Please wait before resending"
```

---

### Prompt 9: Fix DOI Case Sensitivity

```
Fix DOI duplicate detection to be case-insensitive.

File: apps/web/app/api/publications/import-doi/route.ts

Problem: DOI "10.1234/ABC" and "10.1234/abc" are treated as different publications.

Solution:
1. Normalize DOI to lowercase before:
   - Checking for existing publications in database
   - Storing new publications
   - Querying CrossRef API

2. Update the duplicate check:
   const normalizedDoi = doi.toLowerCase();
   const existing = await supabase
     .from('publications')
     .select('id')
     .ilike('doi', normalizedDoi)  // Use ilike for case-insensitive
     .single();

3. Store DOIs in lowercase consistently:
   const publication = {
     ...crossrefData,
     doi: normalizedDoi,
   };

4. Add a database migration to lowercase existing DOIs:
   UPDATE publications SET doi = LOWER(doi) WHERE doi IS NOT NULL;

5. Add unique constraint on LOWER(doi) if not exists
```

---

### Prompt 10: Add Keyboard Shortcuts

```
Implement comprehensive keyboard shortcuts for power users.

1. Create apps/web/lib/hooks/use-keyboard-shortcuts.ts:
   - Register global shortcuts with useEffect
   - Prevent conflicts with input fields
   - Support modifier keys (Cmd/Ctrl, Alt, Shift)

2. Implement these shortcuts:
   - Cmd+K: Open command palette
   - Cmd+N: Create new task (focus quick-add)
   - Cmd+Shift+N: Create new project
   - Cmd+/: Show keyboard shortcuts help modal
   - Arrow keys: Navigate task list (when not in input)
   - Enter: Edit selected task
   - Space: Toggle task completion
   - Delete/Backspace: Delete selected task (with confirmation)
   - Escape: Close modals, clear selection

3. Create apps/web/components/ui/command-palette.tsx:
   - Modal with search input
   - Fuzzy search across tasks, projects, grants
   - Quick actions (new task, new project, go to page)
   - Keyboard navigation with arrow keys

4. Create apps/web/components/ui/keyboard-shortcuts-modal.tsx:
   - Display all available shortcuts
   - Group by category (navigation, tasks, projects)
   - Open with Cmd+/

5. Add shortcuts badge to sidebar:
   - Small "?" icon or "Cmd+/" hint
   - Opens shortcuts modal on click

6. Update apps/web/lib/constants.ts with all shortcuts
```

---

### Prompt 11: Add Bulk Operations

```
Implement bulk task operations for power users.

1. Create apps/web/components/tasks/bulk-actions-bar.tsx:
   - Appears when tasks are selected
   - Actions: Complete, Archive, Delete, Change Priority, Change Category, Move to Project
   - "X selected" counter with "Clear selection" button

2. Update task list views (list, board, today, upcoming):
   - Add checkbox to each TaskCard
   - Ctrl/Cmd+Click to toggle selection
   - Shift+Click to select range
   - Track selection in local state (Set of task IDs)

3. Create apps/web/lib/hooks/use-bulk-tasks.ts:
   - useBulkUpdateTasks mutation
   - useBulkDeleteTasks mutation
   - Optimistic updates for all selected tasks

4. Create apps/web/app/api/tasks/bulk/route.ts:
   - PATCH: Update multiple tasks with same changes
   - DELETE: Delete multiple tasks
   - Validate all task IDs belong to current workspace

5. Keyboard shortcuts for bulk mode:
   - Cmd+A: Select all visible tasks
   - Escape: Clear selection
   - Delete: Bulk delete selected
   - Number keys (1-4): Set priority on selected
```

---

### Prompt 12: Add Export Functionality

```
Add export capabilities for tasks, projects, and publications.

1. Create apps/web/app/api/export/route.ts:
   - Accept format param: csv, json, markdown
   - Accept type param: tasks, projects, publications, all
   - Accept filter params (status, date range, category)
   - Return file download with appropriate Content-Type

2. Create apps/web/components/ui/export-modal.tsx:
   - Format selector (CSV, JSON, Markdown)
   - Date range filter
   - Status filter (include completed, archived)
   - Field selector (which columns to include)
   - Preview of first 5 rows

3. Add export button to:
   - Task list header (export visible tasks)
   - Projects page header
   - Publications page header
   - Each individual project (export project with tasks)

4. CSV format:
   - Tasks: title, description, due, status, priority, category, project, assignees, created, completed
   - Projects: title, type, status, stage, created, updated
   - Publications: title, authors, doi, journal, status, year

5. JSON format:
   - Full object structure matching API response
   - Include nested relationships

6. Markdown format (for tasks):
   - Checkbox list format: - [ ] Task title (due: date)
   - Grouped by project or category
```

---

## Medium Priority Fixes (P2)

### Prompt 13: Improve Empty States with Guidance

```
Enhance empty states throughout ScholarOS to provide better guidance for new users.

Update apps/web/components/ui/empty-state.tsx:
1. Add optional props:
   - tips?: string[] (list of quick tips)
   - tutorialLink?: string (link to relevant docs)
   - shortcutHint?: { key: string; action: string }

2. Create pre-configured empty states for each section:

TasksEmptyState:
- Title: "No tasks yet"
- Description: "Start by adding your first task using the quick-add bar above."
- Tips: ["Type 'p1' for high priority", "Use #grants for category", "Type 'tomorrow' for due date"]
- Shortcut: { key: "Q", action: "Focus quick-add" }

ProjectsEmptyState:
- Title: "No projects yet"
- Description: "Projects help you organize manuscripts, grants, and research work."
- Tips: ["Track manuscript stages from idea to published", "Monitor grant deadlines and milestones"]
- Action: Create your first project

GrantsEmptyState:
- Title: "Start discovering grants"
- Description: "Search funding opportunities from NSF, NIH, and more."
- Tips: ["Save searches to get notified of new opportunities", "Add grants to your watchlist"]

3. Add subtle animation to tips (fade in sequence)
4. Style tips as a horizontal scrolling list on mobile
```

---

### Prompt 14: Add Syntax Help to Quick-Add

```
Add interactive syntax help to the quick-add component.

Update apps/web/components/tasks/quick-add.tsx:

1. Add expandable syntax reference:
   - Small "?" icon button next to the input
   - On click, expand a panel below with full syntax reference
   - Keyboard shortcut: Shift+? when input is focused

2. Syntax reference content:
   Priority: p1 (urgent), p2 (high), p3 (medium), p4 (low)
   Category: #research, #teaching, #grants, #admin, #grad, #undergrad, #misc
   Due Date: today, tomorrow, mon/tue/wed/thu/fri/sat/sun, next week
   Assignee: @username (team members)
   Project: +project-id (link to project)

3. Add live parsing preview:
   - As user types, show parsed values below input
   - Display: "Due: Tomorrow | Priority: P1 | Category: Grants"
   - Highlight unrecognized tokens in yellow

4. Add AI-assisted parsing option:
   - For natural language like "Submit NSF report by Friday afternoon"
   - Button to "Parse with AI" that extracts structured data
   - Show confirmation before creating task
```

---

### Prompt 15: Add Date Format Preference

```
Add user preference for date format (US vs International).

1. Update database (migration):
   - Add date_format to profiles: 'us' | 'international' | 'iso'
   - Default to 'us'

2. Update settings page apps/web/app/(dashboard)/settings/page.tsx:
   - Add date format selector
   - Preview showing how dates will appear

3. Update packages/shared/src/utils/index.ts:
   - formatDate() accepts format parameter
   - 'us': MM/DD/YYYY (Jan 5, 2024)
   - 'international': DD/MM/YYYY (5 Jan 2024)
   - 'iso': YYYY-MM-DD (2024-01-05)

4. Create useUserPreferences hook:
   - Fetch user's date_format from profile
   - Provide formatted date function

5. Update all date displays to use user preference:
   - TaskCard due dates
   - Project deadlines
   - Grant deadlines
   - Calendar views

6. Quick-add parser should accept both MM/DD and DD/MM based on user preference
```

---

### Prompt 16: Add 24-Hour Time Option

```
Add user preference for 12-hour vs 24-hour time format.

1. Update database (migration):
   - Add time_format to profiles: '12h' | '24h'
   - Default to '12h'

2. Update settings page:
   - Add time format toggle
   - Preview showing sample time

3. Update packages/shared/src/utils/index.ts:
   - Add formatTime(date, format) function
   - '12h': 2:30 PM
   - '24h': 14:30

4. Update calendar views:
   - Event times should respect preference
   - Time picker in task edit should match

5. Update any time inputs to match preference
```

---

### Prompt 17: Add Project Quick-Add

```
Add quick-add functionality for projects similar to tasks.

1. Update apps/web/components/projects/project-quick-add.tsx:
   - Similar UI to task quick-add
   - Syntax: "NSF R01 grant due march 2024"
   - Auto-detect type: manuscript (paper, article, preprint), grant (NSF, NIH, DOE)

2. Parser in packages/shared/src/utils/project-parser.ts:
   - Extract title
   - Detect type from keywords
   - Extract deadline from date mentions
   - Extract agency for grants (NSF, NIH, DOE, DOD, etc.)

3. Add to projects page:
   - Quick-add bar at top (similar to tasks)
   - Opens ProjectModal in create mode on submit

4. Keyboard shortcut: Cmd+Shift+N to focus project quick-add
```

---

### Prompt 18: Add Tooltips Throughout UI

```
Add descriptive tooltips to icon-only buttons and non-obvious UI elements.

1. Create apps/web/components/ui/tooltip.tsx (if not exists):
   - Wrap Radix UI Tooltip primitive
   - Support side, align, delayDuration props
   - Consistent styling

2. Add tooltips to these elements:
   - Sidebar collapse button: "Collapse sidebar (Cmd+B)"
   - Sidebar navigation icons (when collapsed): "Tasks", "Projects", etc.
   - Quick-add voice button: "Voice input"
   - Task card action buttons: "Complete", "Edit", "Delete"
   - Filter buttons: "Filter by type", "Filter by status"
   - Sort buttons: "Sort by date", "Sort by priority"
   - Calendar sync button: "Sync with Google Calendar"
   - Theme toggle (when added): "Toggle dark mode"

3. Include keyboard shortcuts in tooltips where applicable:
   - "New Task (Cmd+N)"
   - "Search (Cmd+K)"
   - "Quick Add (Q)"

4. Use consistent delay (300ms) before showing
5. Position tooltips to avoid viewport edges
```

---

### Prompt 19: Add Dark Mode Toggle

```
Add a visible dark mode toggle to the UI.

1. Create apps/web/components/ui/theme-toggle.tsx:
   - Uses next-themes useTheme hook
   - Three states: light, dark, system
   - Shows sun/moon icon based on current theme
   - Dropdown for system option

2. Add to sidebar footer (apps/web/components/layout/sidebar.tsx):
   - Place next to user menu
   - Icon-only button with tooltip

3. Add to settings page:
   - Full theme selector with preview
   - System, Light, Dark options

4. Ensure all components support dark mode:
   - Check for missing dark: classes
   - Verify contrast ratios meet WCAG AA
   - Test charts, graphs, status badges

5. Add keyboard shortcut: Cmd+Shift+L to toggle theme
6. Persist preference in localStorage via next-themes
```

---

### Prompt 20: Improve Calendar Integration UX

```
Improve the Google Calendar connection flow UX.

Update apps/web/app/(dashboard)/calendar/page.tsx:

1. Add inline connection status:
   - Show connection state clearly (Connected, Not Connected, Expired)
   - Display connected Google account email
   - Last sync timestamp

2. Add guided setup for new users:
   - Step-by-step card if not connected
   - Explain what access is needed and why
   - Privacy reassurance (read-only, which calendars)

3. Improve error handling:
   - Clear error messages for common failures
   - Retry button for transient errors
   - Link to troubleshooting guide

4. Add sync controls:
   - Manual sync button with loading state
   - Auto-sync frequency selector (15min, 30min, 1hr, manual)
   - Select which calendars to sync

5. Show sync activity:
   - "Last synced: 5 minutes ago"
   - "Next sync: in 10 minutes"
   - Loading indicator during sync
```

---

## Low Priority Fixes (P3)

### Prompt 21: Add Confirmation for All Destructive Actions

```
Ensure all destructive actions have confirmation dialogs.

1. Audit all delete/remove actions:
   - Task deletion
   - Project deletion (already has)
   - Publication deletion
   - Team member removal
   - Workspace deletion
   - Calendar disconnection
   - Watchlist removal

2. Use consistent ConfirmDialog component from apps/web/components/ui/dialog.tsx

3. Implement pattern:
   const [deleteConfirm, setDeleteConfirm] = useState<Item | null>(null);

   <ConfirmDialog
     isOpen={!!deleteConfirm}
     onClose={() => setDeleteConfirm(null)}
     onConfirm={handleDelete}
     title="Delete {type}?"
     description="This action cannot be undone."
     confirmText="Delete"
     variant="destructive"
   />

4. For less destructive actions (archive, complete), skip confirmation or use toast with undo
```

---

### Prompt 22: Highlight Search Results

```
Add search term highlighting in results.

1. Create apps/web/lib/utils/highlight.tsx:
   - highlightText(text: string, query: string): ReactNode
   - Wrap matches in <mark> with styling

2. Update search results components:
   - TaskCard title when from search
   - Project card title
   - Publication card title
   - Grant opportunity title and description

3. Styling for highlights:
   - Background: yellow-200 in light, yellow-800 in dark
   - Preserve original text styling
   - Handle multiple matches

4. Handle edge cases:
   - Case-insensitive matching
   - Multiple search terms (highlight each)
   - HTML escaping (prevent XSS)
```

---

### Prompt 23: Add Undo for Task Actions

```
Add undo capability for task actions (complete, delete, status change).

1. Create apps/web/lib/hooks/use-undo.ts:
   - Track recent actions in a stack
   - Each action stores: type, previousState, timestamp
   - Auto-expire after 10 seconds

2. Update toast component to support undo:
   - Add "Undo" button to success toasts
   - Pass undo callback to toast.success()

3. Implement for these actions:
   - Complete task: "Task completed. [Undo]"
   - Delete task: Store task data, "Task deleted. [Undo]"
   - Status change: "Status changed to {new}. [Undo]"
   - Archive: "Task archived. [Undo]"

4. Undo behavior:
   - Restore previous state
   - Remove from undo stack
   - Show confirmation toast

5. Keyboard shortcut: Cmd+Z to undo last action (when not in input)
```

---

### Prompt 24: Surface Grant Fit Scoring

```
Make AI grant fit scores more visible in the grants UI.

1. Update grant card to prominently show fit score:
   - Circular progress indicator or badge
   - Color coding: green (80%+), yellow (50-79%), red (<50%)
   - Tooltip explaining score factors

2. Add fit score column to grant list view:
   - Sortable column
   - Show as percentage or star rating

3. Add fit score breakdown:
   - Click score to see factors
   - Research area match
   - Funding amount fit
   - Deadline feasibility
   - Past success with agency

4. Personalization:
   - Link to profile/CV for better scoring
   - "Improve your match" suggestions

5. Filter by fit score:
   - Slider to set minimum score
   - "Show only good matches" toggle
```

---

### Prompt 25: Reduce Animation Delays on Mobile

```
Optimize animations for mobile performance.

1. Detect device capabilities:
   - Create useReducedMotion hook checking prefers-reduced-motion
   - Create useIsMobile hook for device detection

2. Conditional animations:
   - Disable stagger delays on mobile
   - Reduce animation durations by 50%
   - Skip non-essential animations

3. Update CSS:
   @media (prefers-reduced-motion: reduce) {
     *, *::before, *::after {
       animation-duration: 0.01ms !important;
       transition-duration: 0.01ms !important;
     }
   }

4. Update animation classes in globals.css:
   - .animate-fade-in mobile duration: 150ms (from 300ms)
   - Remove stagger-1, stagger-2, stagger-3 on mobile

5. Lazy load below-fold animations:
   - Use Intersection Observer
   - Only animate when element enters viewport
```

---

### Prompt 26: Add Semester/Term View

```
Add academic semester/term organization for teaching-focused users.

1. Create semester configuration:
   - Define in workspace settings
   - Start date, end date, name (Fall 2024, Spring 2025)
   - Support quarters, trimesters, semesters

2. Add to database:
   - terms table: id, workspace_id, name, start_date, end_date, type
   - Optional term_id on tasks and projects

3. Add semester filter:
   - Dropdown in task/project views
   - "Current Term", "All Terms", specific term selection

4. Add semester summary:
   - Dashboard widget showing term progress
   - Tasks completed this term
   - Teaching vs research time split

5. Archive by semester:
   - "Archive all from Fall 2024" action
   - View archived semesters separately
```

---

### Prompt 27: Improve Archive View

```
Create a dedicated archived items view.

1. Create apps/web/app/(dashboard)/archive/page.tsx:
   - Tab navigation: Tasks, Projects, Publications
   - Filter by date range, type
   - Search within archived items

2. Add unarchive functionality:
   - Button on each item to restore
   - Bulk restore selection

3. Show archive stats:
   - Total archived items
   - Archived this month/year
   - Storage space used (if applicable)

4. Add auto-archive setting:
   - Archive completed tasks after X days
   - Archive completed projects after X days
   - Configurable per workspace

5. Add navigation:
   - Link in sidebar under settings or as submenu
   - Quick access from project/task "more" menus
```

---

### Prompt 28: Add Private Notes for Tasks

```
Add private notes feature for team members.

1. Update database:
   - Create task_private_notes table
   - Columns: id, task_id, user_id, content, created_at, updated_at
   - RLS: users can only see their own notes

2. Update task modal:
   - Add "Private Notes" section below regular notes
   - Clearly labeled as "Only visible to you"
   - Different styling (subtle background)

3. API endpoints:
   - GET /api/tasks/[id]/private-notes
   - POST /api/tasks/[id]/private-notes
   - PUT /api/tasks/[id]/private-notes/[noteId]
   - DELETE /api/tasks/[id]/private-notes/[noteId]

4. Show indicator on task card:
   - Small icon if user has private notes
   - Hover to preview first line
```

---

### Prompt 29: Improve Voice Input Reliability

```
Improve voice input UX and reliability.

1. Update apps/web/components/voice/voice-input-inline.tsx:
   - Clear status indicators (listening, processing, error)
   - Visual waveform or pulsing animation while recording
   - Timeout after 30 seconds of silence

2. Add browser compatibility check:
   - Detect if Web Speech API is available
   - Hide button gracefully on unsupported browsers
   - Show tooltip explaining requirement

3. Improve error handling:
   - Microphone permission denied
   - No speech detected
   - Network error during transcription
   - Clear error messages for each

4. Add settings:
   - Enable/disable voice input in preferences
   - Language selection for recognition
   - Auto-punctuation toggle

5. Accessibility:
   - Screen reader announcements for state changes
   - Keyboard activation (Cmd+Shift+V)
```

---

### Prompt 30: Add Co-Author Collaboration Features

```
Add collaboration features for publication co-authors.

1. Update publication authors:
   - Link to workspace members when possible
   - Track email for external co-authors
   - Status: confirmed, pending, declined

2. Add notifications:
   - Email external co-authors when added
   - Notify when publication status changes
   - Reminder before submission deadline

3. Add co-author tasks:
   - Assign review tasks to co-authors
   - Track who has reviewed latest version
   - Collect feedback in one place

4. Add contribution tracking:
   - Record each author's contribution type
   - Writing, Review, Data, Analysis, etc.
   - For CRediT taxonomy compliance

5. External co-author portal (stretch):
   - Magic link access without account
   - View publication status
   - Leave comments/feedback
```

---

## Usage Instructions

1. Copy the prompt for the issue you want to fix
2. Paste into Claude Code or your AI assistant
3. Review the generated code before applying
4. Test the changes thoroughly
5. Check for any regressions in related features

Each prompt is designed to be self-contained with enough context to implement the fix correctly.
