# UX Engineer Handoff: ScholarOS Phase 8+

**Prepared by:** Project Manager
**Date:** January 12, 2026
**Phase Status:** Phase 8 Complete (100%)
**Target:** UX Engineer for Phase 9+ Enhancement & Optimization

---

## Executive Summary

ScholarOS has completed Phase 8, delivering a **fully-functional academic operations platform** with advanced collaboration features, analytics, and bulk operations. The platform now serves as a comprehensive solution for professors, lab managers, and research teams to manage tasks, projects, grants, personnel, and calendars—all with AI copilots embedded throughout.

**Your Mission:** Enhance the user experience across all features, optimize workflows based on user research, and prepare the platform for scale by conducting accessibility audits, usability testing, and design system refinement.

---

## Table of Contents

1. [Product Overview](#product-overview)
2. [Current User Research & Personas](#current-user-research--personas)
3. [Existing Design System](#existing-design-system)
4. [Phase 8 Features Requiring UX Review](#phase-8-features-requiring-ux-review)
5. [Known UX Debt & Opportunities](#known-ux-debt--opportunities)
6. [Accessibility Status](#accessibility-status)
7. [User Journey Maps](#user-journey-maps)
8. [Technical Constraints & Capabilities](#technical-constraints--capabilities)
9. [Priority UX Initiatives](#priority-ux-initiatives)
10. [Success Metrics](#success-metrics)
11. [Resources & References](#resources--references)

---

## Product Overview

### What is ScholarOS?

ScholarOS is an **AI-native academic operations dashboard** designed to replace fragmented workflows with a single, collaborative workspace. It addresses the unique needs of academic researchers who juggle:

- **Task Management:** Daily todos, deadlines, priorities across multiple projects
- **Research Projects:** Manuscripts (Idea → Published), Grants (Discovery → Closeout)
- **Grant Discovery:** AI-powered matching with federal funding opportunities
- **Team Collaboration:** Lab personnel, workload distribution, 1:1 tracking
- **Calendar Integration:** Google Calendar sync, availability visualization
- **AI Assistance:** Task extraction, project summaries, grant fit scoring

### Key Differentiators

1. **Academic-Specific Workflows:** Pre-configured stages for manuscripts and grants
2. **AI Everywhere:** Embedded AI copilots, not bolt-on features
3. **Multi-Tenancy:** Workspaces for labs/groups with role-based permissions
4. **Quick-Add Syntax:** Natural language task entry (`NSF report fri #grants p1 @craig`)

### Live Site

- **Production:** https://scholaros-ashen.vercel.app
- **Staging:** N/A (preview deployments via Vercel)

---

## Current User Research & Personas

### Primary Personas (from Business Analyst)

#### 1. PI / Faculty Member (Primary User)

**Name:** Dr. Sarah Chen
**Role:** Associate Professor, Biology
**Age:** 42
**Tech Savvy:** Medium

**Goals:**
- Oversee 3-5 concurrent research projects (manuscripts + grants)
- Manage team of 8 (2 postdocs, 4 grad students, 2 undergrads)
- Track grant deadlines and submission requirements
- Minimize context-switching between tools

**Pain Points:**
- "I lose track of what everyone's working on"
- "Grant deadlines sneak up on me despite calendar reminders"
- "Too many tools: email, Slack, Google Calendar, lab notebook, grant tracking spreadsheet"
- "I don't know if my team is overloaded or underutilized"

**Current Workarounds:**
- Weekly lab meeting + individual check-ins (time-consuming)
- Shared Google Sheets for grant tracking (gets outdated)
- Email threads for task delegation (hard to track)

**ScholarOS Usage Patterns:**
- Checks "Today" view every morning
- Uses Projects page to monitor manuscript/grant progress
- Relies on Analytics dashboard for team workload visibility
- Assigns tasks to team members via quick-add (`@studentname`)

#### 2. Lab Manager (Secondary User)

**Name:** Maria Rodriguez
**Role:** Lab Manager, Chemistry Department
**Age:** 35
**Tech Savvy:** High

**Goals:**
- Onboard new personnel smoothly
- Track training compliance (IACUC, safety, etc.)
- Manage lab schedules and equipment calendars
- Coordinate between PI and lab members

**Pain Points:**
- "Onboarding checklists are different for every PI"
- "Training certifications expire and I have to chase people down"
- "I spend hours scheduling and rescheduling meetings"

**ScholarOS Usage Patterns:**
- Uses Personnel module heavily
- Creates template onboarding checklists
- Monitors training expiration dates
- Coordinates via Calendar integration

#### 3. Graduate Student / Postdoc (Tertiary User)

**Name:** Alex Kim
**Role:** 3rd Year PhD Student, Neuroscience
**Age:** 27
**Tech Savvy:** High

**Goals:**
- Focus on assigned projects without distractions
- Track personal milestones (prelim exam, dissertation chapters)
- Collaborate with PI on manuscripts
- Understand what's expected of them

**Pain Points:**
- "I don't know if I'm working on the right priorities"
- "My advisor gives me tasks verbally and I forget them"
- "I want to see my progress toward graduation milestones"

**ScholarOS Usage Patterns:**
- Uses task views (Today, Upcoming, Board) for daily work
- Links tasks to projects to see contribution
- Appreciates AI task extraction from meeting notes
- Limited workspace-wide visibility (role-based)

### User Research Gaps (Your First Priority)

**What We Know:**
- Personas based on stakeholder interviews (n=12)
- Feature requests captured during development

**What We Need:**
- **Usability testing** on Phase 8 features (Analytics, Bulk Ops, Import/Export)
- **Journey mapping** for onboarding flow (new workspace → first task created)
- **A11y testing** with screen reader users
- **Performance perception** (do users feel the app is fast?)
- **Mobile usage patterns** (responsive design exists but not optimized)

**Recommended Research Methods:**
1. **User interviews** (30 min, n=6-8) with active users
2. **Usability testing** (moderated, n=5-6) on key workflows
3. **Analytics review** (Google Analytics, Supabase logs) for drop-off points
4. **A11y audit** (automated + manual screen reader testing)
5. **Heuristic evaluation** (Nielsen's 10 Usability Heuristics)

---

## Existing Design System

### Technology Foundation

**Component Library:** shadcn/ui (Radix UI primitives + Tailwind CSS)
**Styling:** Tailwind CSS 3.4.16 with custom configuration
**Animations:** Framer Motion 11.11.17
**Icons:** Lucide React

### Design Tokens

Located in [tailwind.config.ts](scholaros/apps/web/tailwind.config.ts)

#### Colors

```javascript
colors: {
  // Brand colors
  border: "hsl(var(--border))",
  input: "hsl(var(--input))",
  ring: "hsl(var(--ring))",
  background: "hsl(var(--background))",
  foreground: "hsl(var(--foreground))",

  primary: {
    DEFAULT: "hsl(var(--primary))",
    foreground: "hsl(var(--primary-foreground))",
  },
  secondary: {
    DEFAULT: "hsl(var(--secondary))",
    foreground: "hsl(var(--secondary-foreground))",
  },

  // Semantic colors
  destructive: {
    DEFAULT: "hsl(var(--destructive))",
    foreground: "hsl(var(--destructive-foreground))",
  },
  muted: {
    DEFAULT: "hsl(var(--muted))",
    foreground: "hsl(var(--muted-foreground))",
  },
  accent: {
    DEFAULT: "hsl(var(--accent))",
    foreground: "hsl(var(--accent-foreground))",
  },

  // Task-specific
  "task-priority": {
    p1: "hsl(0, 84%, 60%)",    // Red
    p2: "hsl(25, 95%, 53%)",   // Orange
    p3: "hsl(45, 93%, 47%)",   // Yellow
    p4: "hsl(142, 71%, 45%)",  // Green
  },

  "task-category": {
    research: "hsl(221, 83%, 53%)",
    teaching: "hsl(142, 71%, 45%)",
    grants: "hsl(262, 83%, 58%)",
    admin: "hsl(25, 95%, 53%)",
  },
}
```

#### Typography

```javascript
fontFamily: {
  sans: ["Inter", "system-ui", "sans-serif"],
  display: ["Cal Sans", "Inter", "system-ui"],
  mono: ["JetBrains Mono", "monospace"],
},

fontSize: {
  xs: ["0.75rem", { lineHeight: "1rem" }],
  sm: ["0.875rem", { lineHeight: "1.25rem" }],
  base: ["1rem", { lineHeight: "1.5rem" }],
  lg: ["1.125rem", { lineHeight: "1.75rem" }],
  xl: ["1.25rem", { lineHeight: "1.75rem" }],
  "2xl": ["1.5rem", { lineHeight: "2rem" }],
  "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
  "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
}
```

#### Spacing & Layout

```javascript
spacing: {
  // Extends Tailwind defaults
  // Uses 0.25rem (4px) increments
}

borderRadius: {
  sm: "0.375rem",
  DEFAULT: "0.5rem",
  md: "0.75rem",
  lg: "1rem",
  xl: "1.25rem",
  "2xl": "1.5rem",
  full: "9999px",
}
```

#### Shadows

```javascript
boxShadow: {
  sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  DEFAULT: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
}
```

### Component Inventory

All components located in [components/ui/](scholaros/apps/web/components/ui/)

#### Core UI Components (shadcn/ui)

| Component | File | Usage | A11y Status |
|-----------|------|-------|-------------|
| Button | button.tsx | Primary actions | ✅ ARIA labels |
| Card | card.tsx | Content containers | ✅ Semantic HTML |
| Dialog | dialog.tsx | Modals, drawers | ✅ Focus trap |
| Dropdown Menu | dropdown-menu.tsx | Context menus | ✅ Keyboard nav |
| Select | select.tsx | Form dropdowns | ✅ ARIA combobox |
| Tabs | tabs.tsx | Tabbed interfaces | ✅ ARIA tabs |
| Progress | progress.tsx | Progress bars | ✅ ARIA progressbar |
| Alert Dialog | alert-dialog.tsx | Confirmations | ✅ Focus management |
| Scroll Area | scroll-area.tsx | Scrollable content | ⚠️ Needs testing |

#### Custom Components

| Component | File | Usage | A11y Status |
|-----------|------|-------|-------------|
| Task Card | task-card.tsx | Task display | ⚠️ Needs review |
| Task List | task-list.tsx | Task lists | ⚠️ Keyboard nav gaps |
| Kanban Board | task-kanban.tsx | Drag-drop tasks | ❌ Screen reader support |
| Quick Add | quick-add.tsx | Task creation | ✅ Good |
| Bulk Actions Toolbar | bulk-actions-toolbar.tsx | Multi-select UI | ⚠️ Needs testing |
| Analytics Dashboard | analytics-dashboard.tsx | Charts, metrics | ❌ Charts not accessible |

### Design Patterns

#### Task Priority Visualization

```tsx
// Priority badge with color coding
<Badge variant={priority === 'p1' ? 'destructive' : 'default'}>
  {priority.toUpperCase()}
</Badge>
```

**UX Issue:** Color-only differentiation not accessible for colorblind users.

**Recommendation:** Add icons or patterns to priority indicators.

#### Status Indicators

```tsx
// Status with icon
{status === 'done' ? (
  <CheckCircle2 className="h-4 w-4 text-green-500" />
) : status === 'progress' ? (
  <Clock className="h-4 w-4 text-blue-500" />
) : (
  <Circle className="h-4 w-4 text-slate-400" />
)}
```

**UX Strength:** Icon + color provides redundancy.

#### Loading States

Currently using:
- Skeleton loaders (good)
- Spinner icons (Loader2 from Lucide)
- Suspense boundaries

**UX Gap:** No unified loading pattern across all features.

---

## Phase 8 Features Requiring UX Review

### 1. Analytics Dashboard

**Location:** [/analytics](scholaros/apps/web/app/(dashboard)/analytics/page.tsx)

**Current Implementation:**
- Summary statistics (total tasks, completion rate, avg tasks/day)
- Bar charts (status, priority, category, projects)
- Sparkline trends (14-day activity and completion)
- Team member productivity table
- Period selector (7d, 30d, 90d, all)

**UX Concerns:**
1. **Chart Accessibility:** Charts are visual-only (no data tables)
2. **Data Density:** Too much information on one screen (overwhelming?)
3. **Mobile Experience:** Charts don't resize well on small screens
4. **Empty States:** No guidance when workspace has no data
5. **Color Reliance:** Charts use color only to differentiate data

**Questions for User Research:**
- Do PIs understand the metrics? (e.g., "What does avg tasks/day tell you?")
- What actions do users want to take from the analytics page?
- How often do users check analytics? (daily, weekly, monthly?)
- What metrics are missing? (time-to-completion, deadline adherence?)

**Recommended Improvements:**
- Add data table view toggle for accessibility
- Implement drill-down (e.g., click "Research" category → see those tasks)
- Add export functionality (PDF report, CSV data)
- Create "Insights" cards with actionable recommendations (e.g., "3 tasks overdue")
- Improve mobile layout with accordion sections

### 2. Bulk Operations (Multi-Select)

**Location:** [Bulk Actions Toolbar](scholaros/apps/web/components/tasks/bulk-actions-toolbar.tsx)

**Current Implementation:**
- "Select Tasks" button toggles selection mode
- Checkboxes appear on task cards when active
- Floating toolbar with bulk actions (status, priority, category, delete)
- Select All / Deselect All
- Animated entrance/exit

**UX Concerns:**
1. **Discoverability:** Users may not notice "Select Tasks" button
2. **Mode Confusion:** Selection mode vs normal mode not obvious
3. **Floating Toolbar:** May cover content on small screens
4. **Undo:** No undo for bulk delete (destructive action)
5. **Feedback:** No success toast after bulk update

**Questions for User Research:**
- Can users find the bulk actions feature?
- Do users understand selection mode?
- Is the floating toolbar placement intuitive?
- Do users expect undo for bulk operations?

**Recommended Improvements:**
- Add onboarding tooltip on first visit
- Clearer visual distinction for selection mode (background tint?)
- Add success/error toasts for bulk operations
- Implement undo for bulk delete (move to trash first?)
- Keyboard shortcuts for select all (Cmd+A)

### 3. Import/Export

**Location:** [Import/Export Modal](scholaros/apps/web/components/tasks/import-export-modal.tsx)

**Current Implementation:**
- Export: CSV or JSON format
- Import: CSV file upload or JSON paste
- Validation with error reporting
- Progress indicator during import

**UX Concerns:**
1. **Discoverability:** No clear entry point in UI
2. **User Guidance:** No example CSV provided
3. **Error Messages:** Technical errors not user-friendly
4. **Preview:** No preview of imported tasks before confirming
5. **Mapping:** No way to map custom CSV columns

**Questions for User Research:**
- What's the primary use case? (migration from other tools? backup?)
- Do users understand CSV format requirements?
- What happens when import fails partially?

**Recommended Improvements:**
- Add prominent import/export buttons in settings
- Provide downloadable example CSV template
- Add preview step before importing
- Allow custom column mapping for CSV
- Friendly error messages with fix suggestions

### 4. Activity Feed & Presence

**Location:** [Activity Feed](scholaros/apps/web/components/activity/activity-feed.tsx)

**Current Implementation:**
- Timeline of workspace actions
- Real-time presence indicators (online/offline)
- User avatars with status

**UX Concerns:**
1. **Noise:** Too many activity items (every task update?)
2. **Relevance:** No filtering (show only mentions, or my projects)
3. **Presence Confusion:** What does "online" mean? (active vs idle)
4. **Privacy:** Do users want to be tracked?

**Questions for User Research:**
- Do users check the activity feed?
- What activity types are most valuable?
- Do users care about presence? (Slack-style expectations)
- Privacy concerns about being tracked?

**Recommended Improvements:**
- Add activity filtering (mentions, projects I follow, etc.)
- Implement "Do Not Disturb" mode
- Clarify presence states (active, idle, offline)
- Add privacy settings for presence visibility

### 5. Keyboard Shortcuts

**Location:** [Keyboard Shortcuts Modal](scholaros/apps/web/components/keyboard-shortcuts-modal.tsx)

**Current Implementation:**
- Modal with shortcut list (Cmd+K to open)
- Organized by category
- Searchable

**UX Concerns:**
1. **Discoverability:** New users don't know about Cmd+K
2. **Learning Curve:** Too many shortcuts to memorize
3. **Platform Differences:** Windows/Mac key differences not clear
4. **Customization:** No way to customize shortcuts

**Questions for User Research:**
- What shortcuts do users actually use?
- Do users want customizable shortcuts?
- Are there conflicts with browser shortcuts?

**Recommended Improvements:**
- Show shortcut hint on hover (tooltips)
- Add "?" key as alternate shortcut help trigger
- Highlight most-used shortcuts
- Add customization settings

---

## Known UX Debt & Opportunities

### Critical Issues

1. **Onboarding Flow (Missing)**
   - **Problem:** New users see empty dashboard, no guidance
   - **Impact:** High drop-off rate (estimated)
   - **Solution:** Implement progressive onboarding wizard
     - Step 1: Create first workspace
     - Step 2: Add first task (show quick-add syntax)
     - Step 3: Connect Google Calendar (optional)
     - Step 4: Invite team members (optional)
   - **Priority:** 🔴 P1

2. **Mobile Experience (Suboptimal)**
   - **Problem:** Responsive design exists but not optimized
   - **Impact:** Mobile users struggle with touch targets, navigation
   - **Solution:**
     - Conduct mobile usability testing
     - Increase touch target sizes (min 44x44px)
     - Optimize sidebar for mobile (collapsible, bottom nav?)
     - Test on iOS and Android devices
   - **Priority:** 🔴 P1

3. **Kanban Accessibility (Broken)**
   - **Problem:** Drag-and-drop not keyboard/screen reader accessible
   - **Impact:** Excludes users with motor/visual disabilities
   - **Solution:**
     - Implement keyboard-based task moving (arrow keys)
     - Add screen reader announcements for moves
     - Provide alternative list view for status changes
   - **Priority:** 🔴 P1 (Legal compliance risk)

### High-Value Opportunities

4. **Empty States (Generic)**
   - **Problem:** Empty states show "No tasks" with no guidance
   - **Impact:** Users don't know what to do next
   - **Solution:** Add contextual empty states
     - Today: "No tasks due today. Add one with the quick-add bar above."
     - Projects: "Create your first project to track manuscripts and grants."
     - Analytics: "Add tasks to see productivity insights."
   - **Priority:** 🟠 P2

5. **Search (Missing)**
   - **Problem:** No global search functionality
   - **Impact:** Users can't find tasks/projects quickly
   - **Solution:**
     - Implement Cmd+F search modal
     - Search across tasks, projects, people, grants
     - Show recent searches
     - Keyboard navigation of results
   - **Priority:** 🟠 P2

6. **Notifications (Incomplete)**
   - **Problem:** No in-app notification center
   - **Impact:** Users miss important updates
   - **Solution:**
     - Add notification bell icon
     - Show unread count badge
     - Notifications for: task assignments, mentions, deadlines, comments
     - Mark as read functionality
   - **Priority:** 🟠 P2

7. **Dark Mode (Missing)**
   - **Problem:** No dark theme option
   - **Impact:** Eye strain for users who prefer dark mode
   - **Solution:**
     - Implement system preference detection
     - Add manual theme toggle
     - Ensure all components support dark theme
   - **Priority:** 🟡 P3

### Performance Perception

8. **Loading Speed Perception**
   - **Problem:** Users report app "feels slow" (anecdotal)
   - **Impact:** Negative perception even if actual speed is fine
   - **Solution:**
     - Add optimistic UI updates everywhere
     - Implement skeleton loaders consistently
     - Use Suspense boundaries strategically
     - Measure Core Web Vitals and optimize
   - **Priority:** 🟠 P2

---

## Accessibility Status

### WCAG 2.1 Compliance Target: AA

**Current Status:** Partially Compliant

#### Passing Criteria

✅ **1.1.1 Non-text Content**
- All images have alt text
- Icons paired with labels

✅ **1.3.1 Info and Relationships**
- Semantic HTML used throughout
- Proper heading hierarchy

✅ **1.4.3 Contrast**
- Most text meets 4.5:1 contrast ratio
- Large text meets 3:1 ratio

✅ **2.1.1 Keyboard**
- Most interactive elements keyboard accessible
- Tab order logical

✅ **2.4.7 Focus Visible**
- Focus indicators present on all interactive elements

✅ **3.2.3 Consistent Navigation**
- Navigation consistent across pages

#### Failing / Needs Testing

⚠️ **1.4.1 Use of Color**
- **Issue:** Priority and category use color only
- **Fix Required:** Add icons or patterns

❌ **1.4.5 Images of Text**
- **Issue:** Some chart labels are images
- **Fix Required:** Use actual text for chart labels

❌ **2.1.2 No Keyboard Trap**
- **Issue:** Kanban drag-and-drop traps keyboard focus
- **Fix Required:** Implement escape key, alternative method

⚠️ **2.4.4 Link Purpose**
- **Issue:** Some "Learn more" links lack context
- **Fix Required:** Add aria-label with specific purpose

⚠️ **3.2.4 Consistent Identification**
- **Issue:** Icons inconsistently used (sometimes with label, sometimes not)
- **Fix Required:** Standardize icon usage patterns

❌ **4.1.2 Name, Role, Value**
- **Issue:** Custom chart components lack ARIA attributes
- **Fix Required:** Add proper ARIA roles and labels

### Recommended Accessibility Audit Tools

1. **Automated Tools:**
   - axe DevTools (browser extension)
   - Lighthouse (Chrome DevTools)
   - WAVE (WebAIM)

2. **Manual Testing:**
   - Screen reader testing (NVDA, JAWS, VoiceOver)
   - Keyboard-only navigation
   - Color blindness simulator (Colorblind Web Page Filter)
   - Zoom to 200% (text scaling)

3. **User Testing:**
   - Recruit users with disabilities (n=3-5)
   - Observe assistive technology usage
   - Collect feedback on pain points

---

## User Journey Maps

### Journey 1: New User Onboarding (First-Time Experience)

**User:** Dr. Chen (PI, trying ScholarOS for the first time)

**Goal:** Set up ScholarOS and create first task

**Current Experience:**

| Step | Action | Pain Points | Emotion | Opportunity |
|------|--------|-------------|---------|-------------|
| 1. Sign Up | Clicks "Get Started" → Email signup | ✅ Smooth | 😊 Excited | Add social proof on landing |
| 2. Email Verification | Checks email, clicks link | ⏰ Waiting | 😐 Neutral | Instant verification option? |
| 3. First Login | Sees empty dashboard | ❌ Confused ("What now?") | 😕 Confused | **NEEDS ONBOARDING** |
| 4. Explores | Clicks around aimlessly | ❌ Lost | 😟 Frustrated | Guided tour or wizard |
| 5. Gives Up | Closes tab | ❌ High drop-off | 😞 Disappointed | Critical fix needed |

**Desired Experience:**

| Step | Action | Improvement | Emotion |
|------|--------|-------------|---------|
| 3a. Onboarding Modal | "Welcome! Let's get started." | Interactive wizard | 😊 Hopeful |
| 3b. Create Workspace | "Name your lab or group" | Contextual help | 😊 Engaged |
| 3c. Quick-Add Demo | "Try: Submit paper fri #research p1" | Hands-on learning | 😄 Delighted |
| 3d. Success! | Task appears in Today view | Positive reinforcement | 😄 Confident |
| 3e. Next Steps | "Want to connect Google Calendar?" (skippable) | Progressive disclosure | 😊 In control |

**Success Criteria:**
- 70% of new users create at least one task within 5 minutes
- 50% create a project or invite a team member within 24 hours

---

### Journey 2: Weekly Team Review (Recurring Task)

**User:** Dr. Chen (PI, preparing for weekly lab meeting)

**Goal:** Review team progress and assign tasks for next week

**Current Experience:**

| Step | Action | Experience | Opportunity |
|------|--------|------------|-------------|
| 1. Check Dashboard | Views Today page | Good, sees own tasks | Add "Team View" filter |
| 2. Open Analytics | Clicks Analytics link | Good, sees metrics | Add drill-down to individual tasks |
| 3. Review Members | Scrolls team productivity | Okay, sees completion % | Add workload visualization |
| 4. Identify Blockers | Mental note of overdue items | ❌ Manual process | Auto-highlight blockers |
| 5. Assign Tasks | Returns to Today, creates tasks | ❌ Context switching | Assign directly from Analytics? |
| 6. Lab Meeting | Discusses via Zoom (separate tool) | ❌ Disconnected | Future: Integrated video notes |

**Pain Points:**
- No "team view" to see all team members' tasks at once
- Can't filter Analytics by team member easily
- No way to identify blockers automatically
- Task assignment requires navigating away from Analytics

**Desired Improvements:**
- Add "Team View" toggle on task pages (see all assignees' tasks)
- Make member names in Analytics clickable → filter to their tasks
- Add "Blocked Tasks" widget to Analytics
- Implement "Quick Assign" from Analytics (click member → quick-add modal pre-filled)

---

### Journey 3: Grant Discovery & Application (High-Stakes Workflow)

**User:** Dr. Chen (PI, looking for new funding)

**Goal:** Find relevant grants and start application project

**Current Experience:**

| Step | Action | Experience | Opportunity |
|------|--------|------------|-------------|
| 1. Navigate to Grants | Clicks Grants in sidebar | Good | - |
| 2. Search | Enters keywords ("neuroscience plasticity") | ❌ Overwhelming results | Add AI-powered ranking |
| 3. Review Opportunities | Opens multiple tabs | ❌ Tedious | Add "Save for Later" quick action |
| 4. Check Fit | Reads full announcement | ❌ Time-consuming | Add AI fit score preview |
| 5. Save to Watchlist | Clicks "Add to Watchlist" | Good | - |
| 6. Create Project | Goes to Projects → New Project | ❌ Manual data entry | Auto-populate from grant opportunity |
| 7. Set Deadline | Enters LOI and full deadline | Good | Add automatic reminders |

**Pain Points:**
- Grant search returns too many results (no relevance ranking)
- No way to compare multiple opportunities side-by-side
- Creating a project from a grant requires re-entering all details
- No automatic milestone generation (e.g., "Draft Specific Aims" at LOI-14 days)

**Desired Improvements:**
- Implement AI-powered relevance scoring (show highest-fit grants first)
- Add comparison view (checkboxes → "Compare Selected")
- "Create Project from Grant" button → auto-populate all fields
- Generate suggested milestones based on grant timeline

---

## Technical Constraints & Capabilities

### Frontend Stack

**Framework:** Next.js 15.1.0 with App Router
**Styling:** Tailwind CSS + shadcn/ui components
**State Management:** TanStack Query (server state) + Zustand (client state)
**Animations:** Framer Motion 11.11.17

**Capabilities:**
- Server-side rendering (SSR) for SEO and performance
- Client-side routing with instant navigation
- Optimistic UI updates
- Real-time subscriptions (Supabase Realtime)
- Edge runtime for fast API responses

**Constraints:**
- Cannot use canvas-based charting (accessibility issues) → must use SVG or HTML-based charts
- Framer Motion animations can cause performance issues on low-end devices → use sparingly
- Large component trees cause hydration slowness → split into smaller components

### Backend Capabilities

**Database:** Supabase (PostgreSQL + pgvector)
**Authentication:** Supabase Auth (email/password + Google OAuth)
**Storage:** Supabase Storage (file uploads)
**Realtime:** Supabase Realtime (WebSocket subscriptions)

**Capabilities:**
- Row Level Security (RLS) for multi-tenancy
- Vector search for semantic matching (grants)
- Real-time data sync across clients
- Edge Functions for serverless compute

**Constraints:**
- RLS queries can be slow for complex joins → denormalize if needed
- Realtime subscriptions limited to 100 concurrent per user → batch updates
- File uploads limited to 50MB → compress/chunk large files

### AI Capabilities

**Provider:** Anthropic Claude 3.5 Sonnet
**Services:** Python FastAPI microservice

**Available Features:**
- Task extraction from unstructured text
- Project status summaries
- Grant fit scoring
- Draft outline generation (planned)

**Constraints:**
- AI API calls have 30s timeout → break long tasks into chunks
- Cost considerations → cache responses when possible
- LLM output variability → validate all responses

### Performance Targets

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| First Contentful Paint | <1.5s | ~1.2s | ✅ Good |
| Largest Contentful Paint | <2.5s | ~2.1s | ✅ Good |
| Time to Interactive | <3.5s | ~2.8s | ✅ Good |
| Cumulative Layout Shift | <0.1 | ~0.05 | ✅ Good |
| First Input Delay | <100ms | ~50ms | ✅ Good |

**Note:** Metrics measured on desktop (MacBook Pro 2021, Chrome). Mobile testing needed.

---

## Priority UX Initiatives

### Phase 9: UX Optimization & Scaling (Recommended Next Steps)

#### Initiative 1: Onboarding Wizard (2-3 weeks)

**Goal:** Increase activation rate from ~30% to ≥60%

**Deliverables:**
1. User research: Interviews with 5-6 new users (failed onboarding cases)
2. Journey map: Detailed onboarding flow from landing → first task
3. Wireframes: Multi-step wizard with progressive disclosure
4. Interactive prototype: Figma clickable prototype for testing
5. Usability testing: Moderated testing with 5 participants
6. Design handoff: High-fidelity mockups + developer specs

**Key Features:**
- Welcome modal with value proposition
- Workspace creation with templates (Lab, Research Group, Solo)
- Quick-add tutorial with interactive demo
- Optional steps: Calendar connection, team invite
- Success celebration with next steps

**Success Metrics:**
- 70% of new users create ≥1 task within 5 minutes
- 50% connect calendar or invite team member within 24 hours
- <10% drop-off rate during onboarding flow

---

#### Initiative 2: Accessibility Audit & Remediation (3-4 weeks)

**Goal:** Achieve WCAG 2.1 AA compliance across all features

**Deliverables:**
1. Automated audit report (axe, Lighthouse, WAVE)
2. Manual testing report (screen reader, keyboard-only)
3. Remediation plan with prioritized issues
4. Updated design system with accessible patterns
5. Component library updates with ARIA attributes
6. User testing with assistive technology users (n=3-5)
7. Compliance certification document

**Priority Fixes:**
1. Kanban board keyboard accessibility (P1 - legal risk)
2. Chart accessibility (data tables, ARIA labels)
3. Color contrast adjustments (low-contrast text)
4. Focus management in modals
5. Screen reader announcements for dynamic content

**Success Metrics:**
- 0 critical WCAG violations
- <5 moderate violations
- Positive feedback from AT users
- Legal compliance achieved

---

#### Initiative 3: Mobile Optimization (2-3 weeks)

**Goal:** Provide excellent mobile experience for on-the-go users

**Deliverables:**
1. Mobile usage analytics review (identify top pages)
2. Mobile journey maps (task creation, task completion)
3. Wireframes: Mobile-optimized layouts
4. Interactive prototype: Mobile flows
5. Usability testing: iOS and Android (n=5 each)
6. Design handoff: Responsive specs

**Key Improvements:**
- Bottom navigation for mobile (replace sidebar)
- Increase touch target sizes (min 44x44px)
- Optimize quick-add for mobile keyboards
- Swipe gestures for task actions (complete, delete)
- Mobile-optimized Analytics (accordion sections)

**Success Metrics:**
- Mobile task creation time <30s (vs current ~60s)
- Touch target accessibility score >90 (Lighthouse)
- Mobile user satisfaction ≥4/5 stars

---

#### Initiative 4: Search & Navigation Enhancement (2 weeks)

**Goal:** Help users find anything instantly

**Deliverables:**
1. Search usage research (what do users search for?)
2. Information architecture review
3. Wireframes: Global search modal (Cmd+F)
4. Search algorithm design (fuzzy matching, relevance scoring)
5. Design handoff: Search UI + empty/loading/error states

**Key Features:**
- Cmd+F global search
- Search across: tasks, projects, people, grants, notes
- Recent searches history
- Filters: type, date range, assignee
- Keyboard navigation of results (arrow keys, Enter to open)

**Success Metrics:**
- 80% of searches return relevant results (top 5)
- Average search time <3s
- 50% of users adopt search feature within 1 week

---

#### Initiative 5: Empty States & Onboarding Hints (1 week)

**Goal:** Provide contextual guidance throughout the app

**Deliverables:**
1. Inventory: All empty states in the app
2. Content strategy: Friendly, actionable copy for each
3. Visual design: Illustrations or icons for empty states
4. Implementation: Updated components with guidance

**Empty States to Address:**
- Today view (no tasks due today)
- Upcoming view (no upcoming tasks)
- Projects list (no projects created)
- Grants watchlist (no saved opportunities)
- Analytics (no data yet)
- Team members (no team members invited)

**Example Improvements:**

**Before:**
```
No tasks found.
```

**After:**
```
🌟 All caught up!

No tasks due today. Want to add one?
Try: "Review grant proposal fri #grants p1"
```

**Success Metrics:**
- Reduced empty state bounce rate by 50%
- Increased task creation from empty states by 30%

---

## Success Metrics

### Product-Level Metrics (90-Day Post-Launch)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Activation** | ≥60% of invited users create ≥10 tasks + 1 project | Supabase analytics |
| **Retention** | ≥35% weekly active users (WAU/MAU ratio) | User login tracking |
| **Time Saved** | ≥1 hr/week self-reported by ≥50% of active users | In-app survey (quarterly) |
| **AI Usefulness** | ≥30% of users accept ≥1 AI suggestion/week | `ai_actions_log` table |
| **NPS** | ≥40 | Quarterly survey |

### UX-Specific Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Onboarding Completion** | ≥70% | Analytics funnel |
| **Task Creation Time** | <30s (median) | Time from click to save |
| **Search Success Rate** | ≥80% (top 5 results) | Search analytics |
| **Accessibility Score** | ≥90 (Lighthouse) | Automated testing |
| **Mobile Usability** | ≥85 (Lighthouse) | Automated testing |
| **User Satisfaction** | ≥4.2/5 | In-app rating prompt |

### Usability Testing Metrics

| Metric | Target |
|--------|--------|
| **Task Completion Rate** | ≥85% |
| **Time on Task** | Within 20% of expert baseline |
| **Error Rate** | <5% of tasks |
| **Satisfaction (SUS Score)** | ≥75 (Good) |

---

## Resources & References

### Design Files

**Figma:** (To be created by UX Engineer)
- Design system library
- Wireframes and prototypes
- User flow diagrams

**Current Assets:**
- Logo: [public/logo.svg](public/logo.svg)
- Favicon: [public/favicon.ico](public/favicon.ico)

### Documentation

- [Product Requirements (PRD)](docs/PRD.md)
- [Architecture Documentation](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Progress Tracker](docs/PROGRESS.md)

### Code Locations

**Component Library:**
- UI Components: [apps/web/components/ui/](scholaros/apps/web/components/ui/)
- Feature Components: [apps/web/components/](scholaros/apps/web/components/)

**Design Tokens:**
- Tailwind Config: [apps/web/tailwind.config.ts](scholaros/apps/web/tailwind.config.ts)
- Global CSS: [apps/web/app/globals.css](scholaros/apps/web/app/globals.css)

**Pages:**
- Dashboard Routes: [apps/web/app/(dashboard)/](scholaros/apps/web/app/(dashboard)/)
- Auth Routes: [apps/web/app/(auth)/](scholaros/apps/web/app/(auth)/)

### Research & Testing

**User Research Plan:**
1. Recruit participants (n=8-10): Mix of PIs, lab managers, students
2. Conduct interviews (30 min each): Current pain points, tool usage
3. Usability testing (45 min each): Prototype new features
4. A11y testing (60 min): Screen reader users (n=3-5)

**Testing Environments:**
- Development: http://localhost:3000
- Staging: (Vercel preview deployments)
- Production: https://scholaros-ashen.vercel.app

**Analytics Access:**
- Supabase Dashboard: (credentials in team password manager)
- Vercel Analytics: (linked to GitHub repo)

### Design Tools & Libraries

**Recommended:**
- Figma (design and prototyping)
- FigJam (user journey mapping, brainstorming)
- UsabilityHub (unmoderated usability testing)
- Maze (prototype testing with metrics)
- Otter.ai (interview transcription)

**Inspiration:**
- Linear (task management UX)
- Notion (information hierarchy, empty states)
- Superhuman (keyboard shortcuts, speed)
- Asana (project views, bulk operations)
- ClickUp (analytics dashboards)

---

## Next Steps for UX Engineer

### Week 1: Discovery & Immersion

1. **Product Walkthrough** (Day 1)
   - Set up local development environment
   - Create test accounts (PI, lab manager, student roles)
   - Complete all user journeys (task creation → project completion)
   - Document questions and observations

2. **Stakeholder Interviews** (Day 2-3)
   - Meet with Product Owner/PM (me)
   - Review business goals and constraints
   - Understand roadmap priorities
   - Clarify success metrics

3. **User Research Planning** (Day 4-5)
   - Develop research protocol
   - Create recruitment screener
   - Draft interview guide
   - Schedule participant sessions

### Week 2-3: Research & Analysis

4. **Conduct User Interviews** (n=6-8)
   - Pain point discovery
   - Journey mapping
   - Feature prioritization

5. **Usability Testing** (n=5-6)
   - Test onboarding flow
   - Test Phase 8 features (Analytics, Bulk Ops)
   - Identify usability issues

6. **Accessibility Audit**
   - Run automated tools (axe, Lighthouse, WAVE)
   - Manual keyboard and screen reader testing
   - Document violations and remediation plan

### Week 4: Synthesis & Planning

7. **Research Synthesis**
   - Affinity mapping of findings
   - Persona validation/updates
   - Priority UX issues list

8. **Design Strategy**
   - Present findings to stakeholders
   - Align on top 3 priorities for Phase 9
   - Create detailed project briefs for each initiative

### Week 5+: Design Execution

9. **Start with Priority Initiative**
   - Based on research findings and business goals
   - Recommended: Onboarding Wizard (highest ROI)

---

## Questions for Initial Discussion

Before starting, let's align on:

1. **Timeline:** How much time do you have for Phase 9 work?
2. **Resources:** Do you need a researcher assistant, or will you conduct all research?
3. **Stakeholder Availability:** Who should review designs? (PM, Tech Lead, PIs?)
4. **User Access:** Can we recruit real professors/lab managers for testing?
5. **Design System:** Start from scratch in Figma or work with existing components?
6. **Priorities:** If you had to pick ONE initiative for Phase 9, what drives most value?

---

## Contact & Collaboration

**Project Manager:** (Your contact info)
**Tech Lead:** (TBD - will introduce)
**Product Owner:** (TBD)

**Communication Channels:**
- Slack: #scholaros-ux (to be created)
- Weekly sync: (TBD - propose time)
- Design reviews: Bi-weekly

**Design Review Process:**
1. UX Engineer posts designs in Figma
2. PM and Tech Lead review async (48hr turnaround)
3. Weekly sync to discuss feedback
4. Approval required before dev handoff

---

**Welcome to ScholarOS! Excited to work with you on making this the best academic productivity tool on the market. Let's create experiences that academics love. 🚀**

---

*Document Version: 1.0*
*Last Updated: January 12, 2026*
*Next Review: After Week 4 Research Synthesis*
