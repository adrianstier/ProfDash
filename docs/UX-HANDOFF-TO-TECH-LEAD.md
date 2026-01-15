# UX Engineering Handoff to Tech Lead
## Phase 9B Implementation Ready

**Handoff Date:** January 14, 2026
**From:** UX Engineering Team
**To:** Tech Lead / Development Team
**Status:** Ready for Implementation

---

## Executive Summary

The UX Engineering team has completed comprehensive analysis and design work for Phase 9B. This document consolidates all deliverables and provides implementation-ready specifications for the development team.

### Documents Produced

| Document | Location | Purpose |
|----------|----------|---------|
| UX Deliverables | [docs/UX-DELIVERABLES.md](./UX-DELIVERABLES.md) | Wireframes, design system, patterns |
| Accessibility Plan | [docs/ACCESSIBILITY-REMEDIATION-PLAN.md](./ACCESSIBILITY-REMEDIATION-PLAN.md) | 100% WCAG compliance roadmap |
| Phase 9 Roadmap | [docs/PHASE-9-ROADMAP.md](./PHASE-9-ROADMAP.md) | Overall feature specifications |

---

## Implementation Priority Matrix

### Recommended Sprint Order

| Sprint | Focus Area | Effort | Impact | Dependencies |
|--------|-----------|--------|--------|--------------|
| **Sprint 1** | Accessibility Remediation | 5 days | Critical | None |
| **Sprint 2** | Progressive Onboarding | 3 days | High | None |
| **Sprint 3** | Command Palette | 3 days | High | None |
| **Sprint 4** | Mobile Responsiveness | 5 days | High | None |
| **Sprint 5** | Recurring Tasks | 5 days | Medium | DB Migration |

---

## Sprint 1: Accessibility Remediation (5 Days)

### Goal
Bring all accessibility scores from current state to 100% WCAG 2.1 AA compliance.

### Current → Target Scores

| Category | Current | Target |
|----------|---------|--------|
| ARIA Labels | 65% | 100% |
| Screen Reader | 70% | 100% |
| Keyboard Navigation | 75% | 100% |
| Focus Management | 80% | 100% |
| Color Contrast | 85% | 100% |

### Day 1: ARIA Labels (8 hours)

**New Files to Create:** None

**Files to Modify:**

1. **`components/projects/project-card.tsx`**
   - Lines 58-73: Add `aria-label` to icon buttons
   ```typescript
   // Change from:
   <button title="Edit project">
     <Edit className="h-4 w-4" />
   </button>

   // To:
   <button aria-label={`Edit project: ${project.title}`}>
     <Edit className="h-4 w-4" aria-hidden="true" />
   </button>
   ```

2. **`components/tasks/task-card.tsx`**
   - Lines 354-368: Add `aria-label` to priority badge
   - Add `role="img"` for icon-only display

3. **`components/ui/empty-state.tsx`**
   - Lines 83-90: Add `aria-hidden="true"` to decorative icon container

4. **`components/tasks/quick-add.tsx`**
   - Lines 130+: Add hidden label and aria-describedby
   ```typescript
   <label htmlFor="quick-add-input" className="sr-only">
     Add a new task
   </label>
   <input
     id="quick-add-input"
     aria-describedby="quick-add-help"
     ...
   />
   <span id="quick-add-help" className="sr-only">
     Type task with optional due date, priority, category
   </span>
   ```

5. **`components/tasks/task-detail-drawer.tsx`**
   - Lines 160-250: Add labels to all form fields

6. **`components/ui/tooltip.tsx`**
   - Lines 90-102: Add `role="tooltip"` and connect with `aria-describedby`

7. **`components/layout/sidebar.tsx`**
   - Lines 120-126: Add `aria-expanded` and `aria-controls`

### Day 2: Screen Reader Support (10 hours)

**New Files to Create:**

1. **`components/accessibility/announcer.tsx`**
   ```typescript
   // Full implementation in ACCESSIBILITY-REMEDIATION-PLAN.md
   // Provides:
   // - AnnouncerProvider (wrap app)
   // - useAnnounce() hook
   // - useTaskAnnouncements() convenience hook
   ```

**Files to Modify:**

1. **`app/layout.tsx`**
   - Wrap children with `<AnnouncerProvider>`

2. **`components/tasks/task-card.tsx`**
   - Lines 125-131: Call `announceTaskCompleted()` on completion

3. **`components/tasks/bulk-actions-toolbar.tsx`**
   - Lines 175-200: Call `announceBulkAction()` after operations

4. **`components/tasks/quick-add.tsx`**
   - Lines 62-120: Call `announceTaskCreated()` on success

5. **`components/ui/pagination.tsx`**
   - Lines 52-59: Call `announcePolite()` on page change

6. **All page files in `app/(dashboard)/`**
   - Add proper heading hierarchy (`<h1>`, `<h2>`, etc.)

### Day 3: Keyboard Navigation (6 hours)

**New Files to Create:**

1. **`lib/hooks/use-keyboard-navigation.ts`**
   ```typescript
   // Full implementation in ACCESSIBILITY-REMEDIATION-PLAN.md
   // Provides:
   // - useKeyboardNavigation() generic hook
   // - useTaskListNavigation() specialized hook
   // - Arrow keys, Home/End, Enter/Space, typeahead
   ```

**Files to Modify:**

1. **`components/tasks/task-list.tsx`**
   - Apply `useTaskListNavigation` hook
   - Add focus ring to focused item

2. **`components/ui/dropdown-menu.tsx`**
   - Lines 72-117: Add keyboard event handler
   - Implement arrow key navigation
   - Add focus trap

3. **`app/(dashboard)/board/page.tsx`**
   - Lines 39-67: Add visually hidden keyboard instructions

### Day 4: Focus Management (5 hours)

**Files to Modify:**

1. **Replace `confirm()` with `<AlertDialog>` in:**
   - `components/tasks/task-detail-drawer.tsx` (Line 94)
   - `components/tasks/task-list.tsx` (Line 177)
   - `components/projects/project-notes.tsx`
   - `components/projects/milestone-list.tsx`

2. **`components/tasks/task-detail-drawer.tsx`**
   - Lines 120-180: Wrap in `<FocusTrap>`
   - Add `role="dialog"`, `aria-modal="true"`, `aria-labelledby`

3. **`components/tasks/task-list.tsx`**
   - Implement focus management after delete (move to next task)

4. **`app/layout.tsx`**
   - Add `<SkipLink>` component at top

### Day 5: Color Contrast (3 hours)

**Files to Modify:**

1. **`components/tasks/task-card.tsx`**
   - Lines 354-382: Update P4 priority colors
   - Lines 56-95: Update misc category colors

2. **`components/ui/button.tsx`**
   - Line 8: Change `opacity-50` to `opacity-60`

3. **`app/globals.css`**
   - Update `--muted-foreground` values for better contrast
   - Darken placeholder text

### Acceptance Criteria

- [ ] axe-core scan returns 0 violations
- [ ] Lighthouse accessibility score ≥95
- [ ] All keyboard navigation tests pass
- [ ] Screen reader testing checklist complete
- [ ] Color contrast verified (WebAIM checker)

---

## Sprint 2: Progressive Onboarding (3 Days)

### Goal
Reduce bounce rate from 60%+ to <40% with guided onboarding.

### Database Migration Required

```sql
-- Migration: 20260115000000_onboarding_tracking.sql
ALTER TABLE profiles
ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN onboarding_step INTEGER DEFAULT 0,
ADD COLUMN onboarding_skipped BOOLEAN DEFAULT FALSE,
ADD COLUMN onboarding_started_at TIMESTAMPTZ,
ADD COLUMN onboarding_completed_at TIMESTAMPTZ;
```

### New Files to Create

```
components/onboarding/
├── onboarding-wizard.tsx      # Container with step management
├── welcome-step.tsx           # Step 1: Welcome + features
├── profile-step.tsx           # Step 2: Profile setup
├── workspace-step.tsx         # Step 3: Workspace creation
├── first-task-step.tsx        # Step 4: Quick-add tutorial
└── completion-step.tsx        # Step 5: Success + next steps

lib/hooks/
└── use-onboarding.ts          # State management hook
```

### Wireframes Reference

See [UX-DELIVERABLES.md Section 1.1](./UX-DELIVERABLES.md#11-progressive-onboarding-flow) for:
- ASCII wireframes of each step
- Interaction specifications
- Animation details
- Success metrics

### Key Implementation Notes

1. **Progress Persistence**
   - Save step progress to database after each step
   - Allow resume if user leaves mid-flow

2. **Skip Functionality**
   - "Skip for now" available on each step
   - Sets `onboarding_skipped = true`
   - Can be resumed from settings

3. **First Task Tutorial**
   - Auto-typing demo animation
   - Real quick-add input that creates actual task
   - Success triggers confetti + auto-advance

4. **Trigger Conditions**
   - Show on first login (`onboarding_completed = false`)
   - Don't show if `onboarding_skipped = true` (offer in settings)

### Acceptance Criteria

- [ ] New users see onboarding wizard
- [ ] Progress persists across sessions
- [ ] Skip functionality works
- [ ] First task actually creates task
- [ ] Analytics tracking in place

---

## Sprint 3: Command Palette (3 Days)

### Goal
Improve power user productivity with ⌘K global search.

### Dependencies

```bash
pnpm add fuse.js cmdk
```

### New Files to Create

```
components/search/
├── command-palette.tsx        # Main palette component
├── search-results.tsx         # Grouped search results
└── recent-searches.tsx        # Recent search history

lib/hooks/
├── use-global-search.ts       # Fuse.js search logic
└── use-recent-searches.ts     # localStorage persistence

app/api/search/
└── route.ts                   # Server-side search API
```

### Wireframes Reference

See [UX-DELIVERABLES.md Section 1.2](./UX-DELIVERABLES.md#12-command-palette--global-search) for:
- Empty state wireframe (quick actions, recent, navigation)
- Search results wireframe (grouped by type)
- Command mode wireframe (`>` prefix)

### Key Implementation Notes

1. **Trigger**
   - ⌘K / Ctrl+K keyboard shortcut
   - Search icon in header (mobile)

2. **Search Modes**
   - Default: Fuzzy search across all content
   - `>` prefix: Command/action mode
   - `@` prefix: Team member filter
   - `#` prefix: Category filter

3. **Search Scope**
   - Tasks (title, description)
   - Projects (title, type)
   - Grants (title, agency)
   - Publications (title, journal)

4. **Performance**
   - Client-side Fuse.js for instant results
   - Server-side for comprehensive search
   - 150ms debounce on input

### Keyboard Shortcuts to Implement

| Shortcut | Action |
|----------|--------|
| ⌘K | Open command palette |
| ⌘N | Create new task |
| ⌘⇧P | New project |
| ⌘⇧C | Open calendar |
| ⌘, | Settings |
| Escape | Close palette |

### Acceptance Criteria

- [ ] ⌘K opens palette from anywhere
- [ ] Search returns relevant results in <200ms
- [ ] Arrow keys navigate results
- [ ] Enter opens selected item
- [ ] Recent searches persist

---

## Sprint 4: Mobile Responsiveness (5 Days)

### Goal
Support 40%+ mobile users with optimized layouts.

### Breakpoint Strategy

| Breakpoint | Width | Layout |
|------------|-------|--------|
| xs | 375px | Stack + bottom nav |
| sm | 640px | Stack + bottom nav |
| md | 768px | Sidebar + content |
| lg | 1024px | Full desktop |

### Files to Modify

1. **`app/(dashboard)/board/page.tsx`**
   - Desktop: 3-column grid
   - Mobile: Tab-based single column with swipe

2. **`components/tasks/task-detail-drawer.tsx`**
   - Desktop: Side panel (max-w-md)
   - Mobile: Full-screen modal

3. **`components/grants/grant-card.tsx`**
   - Desktop: Expanded with description
   - Mobile: Compact badges only

4. **`components/layout/sidebar.tsx`**
   - Desktop: Fixed sidebar (w-64)
   - Mobile: Hidden (md:hidden)

5. **`components/ui/mobile-nav.tsx`** (exists)
   - Verify bottom nav implementation
   - Add "More" menu for additional items

### Wireframes Reference

See [UX-DELIVERABLES.md Section 1.3](./UX-DELIVERABLES.md#13-mobile-responsive-views) for:
- Mobile board view wireframe
- Mobile task detail wireframe
- Bottom navigation wireframe
- Mobile grant card wireframe

### Key Implementation Notes

1. **Bottom Navigation**
   - 5 primary items: Today, Upcoming, Board, Projects, More
   - "More" opens sheet with remaining items
   - Safe area padding for notch

2. **Touch Interactions**
   - Swipe between board tabs
   - Swipe task left to complete
   - Pull to refresh
   - 44×44px minimum touch targets

3. **Responsive Patterns**
   ```tsx
   // Desktop sidebar, mobile bottom nav
   <aside className="hidden md:block w-64">
   <nav className="md:hidden fixed bottom-0">

   // Desktop side panel, mobile full screen
   <Sheet className="hidden md:block">
   <Dialog className="md:hidden">
   ```

### Acceptance Criteria

- [ ] Lighthouse mobile score ≥90
- [ ] No horizontal scroll on any page
- [ ] All touch targets ≥44px
- [ ] Bottom nav functional
- [ ] Swipe gestures work

---

## Sprint 5: Recurring Tasks (5 Days)

### Goal
Support repeating tasks for academic workflows.

### Database Migration Required

```sql
-- Migration: 20260120000000_recurring_tasks.sql
ALTER TABLE tasks
ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE,
ADD COLUMN recurrence_rule TEXT,
ADD COLUMN recurrence_parent_id UUID REFERENCES tasks(id),
ADD COLUMN recurrence_date DATE,
ADD COLUMN recurrence_exceptions JSONB DEFAULT '[]'::jsonb;

CREATE INDEX idx_tasks_recurrence_parent ON tasks(recurrence_parent_id);
```

### Dependencies

```bash
pnpm add rrule
```

### New Files to Create

```
components/tasks/
└── recurrence-picker.tsx      # Recurrence UI component

lib/utils/
└── recurrence.ts              # RRULE parsing utilities

app/api/tasks/[id]/
└── occurrences/route.ts       # Generate occurrences API
```

### Files to Modify

1. **`components/tasks/task-form.tsx`**
   - Add recurrence picker section

2. **`components/tasks/task-card.tsx`**
   - Show recurrence indicator badge

3. **`lib/hooks/use-tasks.ts`**
   - Handle recurrence logic in mutations

### Recurrence Patterns to Support

| Pattern | RRULE Example |
|---------|---------------|
| Daily | `FREQ=DAILY;INTERVAL=1` |
| Weekdays | `FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR` |
| Weekly | `FREQ=WEEKLY;INTERVAL=1;BYDAY=MO` |
| Monthly | `FREQ=MONTHLY;BYMONTHDAY=1` |
| Custom | Full RRULE builder |

### Key Implementation Notes

1. **Task Completion Flow**
   - Complete current instance
   - Auto-generate next occurrence
   - Don't duplicate past occurrences

2. **Edit Options Dialog**
   - "Only this occurrence"
   - "This and future occurrences"
   - "All occurrences"

3. **Visual Indicator**
   ```tsx
   <Badge variant="secondary">
     <Repeat className="h-3 w-3" />
     Weekly
   </Badge>
   ```

### Acceptance Criteria

- [ ] Create recurring task with picker
- [ ] Completion generates next occurrence
- [ ] Edit dialog shows options
- [ ] Recurrence badge displays
- [ ] RRULE parsing works

---

## Design System Quick Reference

### Color Tokens

```css
/* Primary (amber) */
--primary: 32 80% 45%;

/* Categories */
--category-research: 230 65% 55%;  /* Blue */
--category-teaching: 152 55% 42%;  /* Green */
--category-grants: 32 80% 50%;     /* Amber */
--category-mentorship: 280 55% 55%; /* Purple */

/* Priorities */
--priority-p1: 0 72% 52%;    /* Red */
--priority-p2: 25 95% 53%;   /* Orange */
--priority-p3: 214 80% 52%;  /* Blue */
--priority-p4: 220 15% 45%;  /* Gray - updated for contrast */
```

### Spacing Scale

```css
/* Common values */
p-4   /* 16px - compact cards */
p-6   /* 24px - standard cards */
gap-2 /* 8px - inline elements */
gap-3 /* 12px - list items */
gap-4 /* 16px - sections */
```

### Component Patterns

```tsx
// Icon button with accessibility
<button aria-label="Action description">
  <Icon aria-hidden="true" />
</button>

// Form field with label
<label htmlFor="field-id">Label</label>
<input id="field-id" aria-describedby="field-hint" />
<span id="field-hint">Helper text</span>

// Live region for announcements
<div aria-live="polite" className="sr-only">
  {statusMessage}
</div>
```

---

## Testing Checklist

### Accessibility Testing

- [ ] Run `pnpm test:a11y` (axe-core)
- [ ] Run Lighthouse accessibility audit
- [ ] Test with VoiceOver (Mac) or NVDA (Windows)
- [ ] Test keyboard-only navigation
- [ ] Verify color contrast with WebAIM

### Mobile Testing

- [ ] Test on iPhone SE (375px)
- [ ] Test on iPhone 14 (390px)
- [ ] Test on iPad (768px)
- [ ] Verify touch targets ≥44px
- [ ] Test swipe gestures

### Cross-Browser Testing

- [ ] Chrome (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)
- [ ] Edge (latest)

---

## Questions for Tech Lead

1. **Accessibility Priority:** Should we block other features until accessibility reaches 100%?

2. **Onboarding Analytics:** What events should we track? Suggested:
   - `onboarding_started`
   - `onboarding_step_completed` (with step number)
   - `onboarding_skipped`
   - `onboarding_completed`
   - `first_task_created`

3. **Command Palette Scope:** Should search include:
   - Calendar events?
   - Team members?
   - Documents/attachments?

4. **Recurring Tasks:** Should we support:
   - Recurring projects/milestones?
   - Recurring reminders?

5. **Mobile PWA:** Should we add PWA manifest and service worker for offline support?

---

## Summary

This handoff includes:

1. **5 sprints of implementation-ready specifications**
2. **47 specific accessibility fixes with file paths and line numbers**
3. **Wireframes and interaction patterns for all new features**
4. **Database migrations for onboarding and recurring tasks**
5. **Testing checklists and acceptance criteria**

All designs follow existing ScholarOS patterns and use the established shadcn/ui component library.

**Estimated Total Effort:** 21 days (4-5 weeks)

---

**Handoff Complete**

UX Engineering Team
January 14, 2026
