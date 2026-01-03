# ScholarOS / ProfDash - Complete Feature List

## Overview

ScholarOS (formerly ProfDash) is an AI-native academic operations dashboard for professors, lab managers, and research teams. It provides a comprehensive platform for managing tasks, manuscripts, grants, personnel, and calendars with AI copilots embedded across workflows.

---

## Core Features

### 1. Task Management

#### Task Views
- **Today View** (`/today`) - Focus on today's tasks with daily progress tracking
- **Upcoming View** (`/upcoming`) - 14-day timeline of upcoming tasks
- **Kanban Board** (`/board`) - Drag-and-drop board with columns (Todo, In Progress, Done)
- **List View** (`/list`) - Filterable table with sorting and search
- **Calendar View** (`/calendar`) - Visual calendar with tasks and Google Calendar events

#### Task Properties
- **Title & Description** - Full markdown support for task notes
- **Priority Levels** - P1 (Critical), P2 (High), P3 (Normal), P4 (Low)
- **Categories** - Research, Teaching, Grants, Grad Mentorship, Undergrad Mentorship, Admin, Misc
- **Status** - Todo, In Progress, Done
- **Due Dates** - Date picker with natural language parsing
- **Project Linking** - Associate tasks with projects
- **Assignees** - Assign tasks to workspace members
- **Tags** - Custom labels for organization

#### Quick Add
- Natural language task entry
- Syntax: `task title fri #category p1 @assignee +project`
- Automatic parsing of dates, priorities, categories
- Keyboard shortcut: Press `/` to focus

#### Task Interactions
- Inline editing
- Bulk actions
- Task detail drawer with full editing
- Task completion tracking
- Overdue task highlighting

---

### 2. Project Management

#### Project Types
- **Manuscripts** - Academic papers, journal articles, research publications
- **Grants** - Funding applications and grant proposals
- **General** - General projects and initiatives

#### Manuscript Pipeline (8 stages)
1. Idea
2. Outline
3. Drafting
4. Internal Review
5. Submission
6. Revision
7. Accepted
8. Published

#### Grant Pipeline (9 stages)
1. Discovery
2. Fit Assessment
3. LOI (Letter of Intent)
4. Drafting
5. Internal Routing
6. Submission
7. Awarded
8. Active
9. Closeout

#### Project Features
- **Project Cards** - Visual cards showing status, stage, progress
- **Project Details** - Full project view with all related information
- **Milestones** - Track key deadlines with due dates and completion status
- **Notes** - Collaborative notes with pinning support
- **Collaborators** - Internal and external team members
- **Linked Tasks** - All tasks associated with the project
- **Task Count** - Progress indicator (X of Y tasks completed)
- **Stage Progression** - Move projects through pipeline stages
- **Due Dates** - Project-level deadlines
- **AI Project Summary** - Generate status summaries with AI

---

### 3. Grant Discovery & Tracking

#### Grant Search
- **Grants.gov Integration** - Search federal funding opportunities
- **Keyword Search** - Full-text search across opportunities
- **Agency Filters** - Filter by funding agency (NSF, NIH, DOE, etc.)
- **Deadline Filters** - Filter by deadline range
- **Amount Filters** - Filter by award amount
- **Funding Type** - Filter by funding instrument type

#### Watchlist
- **Add to Watchlist** - Save opportunities for tracking
- **Priority Levels** - Low, Medium, High
- **Status Tracking** - Watching, Applying, Submitted, Awarded, Declined, Archived
- **Notes** - Add notes to watchlist items
- **Internal Deadlines** - Set team deadlines before official deadlines
- **Project Linking** - Associate opportunities with grant projects
- **AI Fit Scoring** - Get AI-powered compatibility scores

#### Saved Searches
- **Save Search Queries** - Save search parameters for reuse
- **Alert Frequency** - Daily, Weekly, Monthly, or None
- **Search Descriptions** - Document what each search is for

---

### 4. Google Calendar Integration

#### Connection
- **OAuth2 Authentication** - Secure Google account connection
- **Calendar Selection** - Choose which calendars to sync
- **Sync Toggle** - Enable/disable synchronization

#### Features
- **Event Display** - Show Google Calendar events in calendar view
- **Event Caching** - Local cache for fast loading
- **Multiple Calendars** - Support for multiple calendar sources
- **All-Day Events** - Support for all-day events
- **Event Details** - Location, description, attendees

---

### 5. Personnel Management

#### Personnel Roles
- PhD Student
- Postdoc
- Undergraduate
- Staff
- Collaborator

#### Features
- **Personnel Roster** - Complete list of team members
- **Contact Information** - Email and other contact details
- **Year/Level** - Track year in program
- **Funding Source** - Track funding for each person
- **1:1 Meeting Tracking** - Last meeting date with overdue alerts
- **Milestones** - Track individual milestones
- **Notes** - Add notes about each person
- **CV Import** - Import personnel from CV

---

### 6. Publications Management

#### Publication Types
- Journal Article
- Conference Paper
- Book Chapter
- Book
- Preprint
- Thesis
- Report
- Other

#### Publication Pipeline (9 stages)
1. Idea
2. Drafting
3. Internal Review
4. Submitted
5. Under Review
6. Revision
7. Accepted
8. In Press
9. Published

#### Features
- **Publication Cards** - Visual representation with status badges
- **Pipeline View** - Kanban-style view of publication stages
- **Author Management** - Track authors with roles and order
  - First Author, Corresponding, Co-First, Middle, Last, Senior
- **Project Links** - Connect publications to research projects
- **Grant Acknowledgments** - Track which grants funded the work
- **DOI Import** - Auto-populate from DOI lookup
- **Citation Tracking** - Track citation counts
- **File Attachments** - Attach manuscript versions
- **Metadata** - Journal, Volume, Issue, Pages, Year
- **External IDs** - DOI, PMID, arXiv ID, ORCID

---

### 7. Teaching Dashboard

- Course management
- ESCI (teaching evaluation) tracking
- Teaching-related task integration

---

### 8. Multi-Tenancy & Workspaces

#### Workspace Management
- **Create Workspaces** - Set up new lab/team workspaces
- **Workspace Switcher** - Switch between workspaces
- **Workspace Settings** - Configure workspace preferences

#### Role-Based Access Control (RBAC)
- **Owner** - Full control, billing, delete workspace
- **Admin** - Manage members, all projects, settings
- **Member** - Create/edit within assigned projects
- **Limited** - View/complete assigned tasks only

#### Member Management
- **Invite Members** - Email-based invitations
- **Magic Link Invites** - Secure invitation tokens
- **Role Assignment** - Assign roles on invite or later
- **Member List** - View all workspace members
- **Remove Members** - Remove users from workspace

---

### 9. AI Features

#### Task Extraction
- **Extract from Text** - Paste text to extract actionable tasks
- **Extract from Document** - Upload documents for task extraction
- **Priority Suggestions** - AI-suggested priority levels
- **Due Date Suggestions** - AI-suggested deadlines

#### Project Intelligence
- **Project Summary** - Generate AI status summaries
- **Risk Detection** - Identify potential issues
- **Progress Analysis** - Analyze project health

#### Grant Intelligence
- **Fit Scoring** - Score opportunity fit (0-100)
- **Fit Explanation** - Reasons why it's a good/bad fit
- **Gap Analysis** - Identify missing qualifications

#### Agent Framework
- **Agent Chat** - Conversational AI assistant
- **Agent Orchestration** - Multi-agent task handling
- **Agent Feedback** - Improve agents with feedback
- **Keyboard Shortcut** - Quick access to AI agent

#### Document Processing
- **Document Upload** - Upload PDFs and documents
- **Text Extraction** - Extract text from documents
- **AI Processing** - Analyze document content

#### Today View Insights
- AI-powered insights for daily planning

---

### 10. Accessibility (WCAG 2.1 AA)

- **Skip Links** - Skip to main content
- **Focus Management** - Proper focus handling in modals
- **Focus Traps** - Keep focus within dialogs
- **Keyboard Navigation** - Full keyboard support
- **ARIA Labels** - Screen reader support
- **Color Contrast** - Accessible color combinations
- **Screen Reader Announcements** - Dynamic content updates

---

### 11. User Experience

#### Navigation
- **Sidebar** - Collapsible navigation sidebar
- **Mobile Navigation** - Responsive mobile menu
- **Breadcrumbs** - Navigation context

#### UI Components
- **Dialogs** - Modal dialogs for forms
- **Toasts** - Notification system
- **Empty States** - Helpful empty state messages
- **Pagination** - Paginated lists
- **Error Boundaries** - Graceful error handling

#### Onboarding
- **User Onboarding** - Guided setup flow
- **Profile Setup** - Name, title, institution, timezone

#### Data Migration
- **Import Data** - Import from v1 prototype
- **Export Data** - Export workspace data

---

### 12. Voice Input

- **Voice Transcription** - Convert speech to text
- **Voice Commands** - Add tasks via voice

---

## Technical Features

### Authentication
- Email/Password login
- Google OAuth (for Calendar integration)
- Magic link invites
- Secure session management

### Data Security
- Row Level Security (RLS) on all tables
- Workspace-based data isolation
- Encrypted OAuth tokens
- HTTPS everywhere

### Real-time Updates
- Supabase Realtime subscriptions
- Live updates across devices
- Collaborative editing support

### Performance
- TanStack Query caching
- Optimistic updates
- Lazy loading
- Code splitting

### API
- RESTful API routes
- Rate limiting
- Zod validation
- TypeScript types

---

## API Endpoints

### Tasks
- `GET/POST /api/tasks` - List and create tasks
- `GET/PATCH/DELETE /api/tasks/[id]` - Task CRUD

### Projects
- `GET/POST /api/projects` - List and create projects
- `GET/PATCH/DELETE /api/projects/[id]` - Project CRUD
- `GET/POST /api/projects/[id]/milestones` - Project milestones
- `PATCH/DELETE /api/projects/[id]/milestones/[milestoneId]` - Milestone CRUD
- `GET/POST /api/projects/[id]/notes` - Project notes
- `PATCH/DELETE /api/projects/[id]/notes/[noteId]` - Note CRUD

### Workspaces
- `GET/POST /api/workspaces` - List and create workspaces
- `GET/PATCH/DELETE /api/workspaces/[id]` - Workspace CRUD
- `GET/POST /api/workspaces/[id]/members` - Workspace members
- `PATCH/DELETE /api/workspaces/[id]/members/[memberId]` - Member CRUD
- `GET/POST /api/workspaces/[id]/invites` - Workspace invites
- `DELETE /api/workspaces/[id]/invites/[inviteId]` - Delete invite
- `POST /api/workspaces/accept-invite` - Accept invitation

### Grants
- `GET /api/grants/search` - Search Grants.gov
- `GET/POST /api/grants/watchlist` - Watchlist management
- `PATCH/DELETE /api/grants/watchlist/[id]` - Watchlist item CRUD
- `GET/POST /api/grants/saved-searches` - Saved searches
- `PATCH/DELETE /api/grants/saved-searches/[id]` - Search CRUD

### Calendar
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - OAuth callback
- `GET/DELETE /api/calendar/connection` - Calendar connection
- `GET/POST /api/calendar/calendars` - List/select calendars
- `GET /api/calendar/events` - Get calendar events

### Personnel
- `GET/POST /api/personnel` - List and create personnel
- `GET/PATCH/DELETE /api/personnel/[id]` - Personnel CRUD

### Publications
- `GET/POST /api/publications` - List and create publications
- `GET/PATCH/DELETE /api/publications/[id]` - Publication CRUD
- `POST /api/publications/import` - Import from DOI

### AI
- `POST /api/ai/extract-tasks` - Extract tasks from text
- `POST /api/ai/project-summary` - Generate project summary
- `POST /api/ai/fit-score` - Score grant fit

### Agents
- `GET/POST /api/agents` - List and create agents
- `POST /api/agents/chat` - Agent chat
- `POST /api/agents/execute` - Execute agent action
- `POST /api/agents/feedback` - Submit agent feedback
- `POST /api/agents/orchestrate` - Orchestrate agents

### Documents
- `GET/POST /api/documents` - List and upload documents
- `GET/DELETE /api/documents/[id]` - Document CRUD
- `POST /api/documents/[id]/process` - Process document

### Voice
- `POST /api/voice/transcribe` - Transcribe audio

---

## Database Schema

### Core Tables
- `profiles` - User profiles
- `workspaces` - Team workspaces
- `workspace_members` - User-workspace relationships
- `workspace_invites` - Pending invitations

### Task System
- `tasks` - Task items

### Project System
- `projects` - Unified projects (manuscript/grant/general)
- `project_milestones` - Project milestones
- `project_notes` - Project notes
- `project_collaborators` - Project team members

### Grant System
- `funding_opportunities` - Grant opportunities from APIs
- `opportunity_watchlist` - Saved opportunities
- `saved_searches` - Saved search queries

### Calendar System
- `calendar_connections` - OAuth connections
- `calendar_events_cache` - Cached calendar events

### Personnel System
- `personnel` - Lab members

### Publication System
- `publications` - Research publications
- `publication_authors` - Author tracking
- `publication_projects` - Publication-project links
- `publication_grants` - Grant acknowledgments
- `publication_files` - File attachments

### AI System
- `documents` - Uploaded documents
- `document_chunks` - Text chunks for processing
- `ai_actions_log` - AI usage tracking

### Agent System
- `agents` - Agent definitions
- `agent_runs` - Execution history
- `agent_outputs` - Execution results

---

*Last Updated: January 2026*
