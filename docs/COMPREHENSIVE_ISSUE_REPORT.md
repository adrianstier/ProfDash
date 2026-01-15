# ScholarOS Comprehensive Issue Report

## AI Test User Simulation Results

This report documents issues discovered by simulating 10 diverse AI test user personas navigating ScholarOS. Each persona represents a different use case, technical skill level, and academic role.

---

## Executive Summary

| Severity | Count | Addressed |
|----------|-------|-----------|
| Critical | 4 | 2 |
| High | 8 | 1 |
| Medium | 12 | 0 |
| Low | 6 | 0 |
| **Total** | **30** | **3** |

> **Update (January 14, 2026):** Phase 9A completed. Fixed: Quick-add same-day parsing (Critical), Calendar integration sync (Critical), Grant filter persistence (High).

---

## Critical Issues (P0)

### 1. Quick-Add Same-Day Parsing Bug ✅ FIXED
**Persona Affected:** Dr. Sarah Chen (New PI), Prof. Marcus Thompson (Power User)
**File:** `packages/shared/src/utils/index.ts:141-153`
**Status:** ✅ FIXED (January 12, 2026) - Commit: 67beab1

**Problem:** When a user types a day-of-week that matches today (e.g., "meeting fri" on a Friday), the task is scheduled for NEXT week instead of today.

**Fix Applied:**
```typescript
// Changed condition from <= 0 to < 0
if (daysUntil < 0) {  // Now allows same-day (daysUntil === 0)
  daysUntil += 7;
}
```

**Impact:** Users can now correctly schedule tasks for today using day abbreviations.

---

### 2. Publication View/Edit Modal Missing
**Persona Affected:** Dr. James Okonkwo (Publication Tracker)
**File:** `apps/web/app/(dashboard)/publications/page.tsx:85-87`

**Problem:** The publications page has TODO comments where the view/edit modal should be. Users can import publications via DOI but cannot view or edit them.

**Code Evidence:**
```typescript
const [selectedPublication, setSelectedPublication] =
  useState<PublicationWithAuthors | null>(null);
// TODO: Use selectedPublication to display view/edit modal
void selectedPublication;
```

**Impact:** Dr. Okonkwo cannot track revision history, view publication details, or edit imported DOI metadata.

---

### 3. Onboarding Flow Not Integrated
**Persona Affected:** Dr. Sarah Chen (New PI), Dr. Lisa Anderson (Late Adopter)
**File:** `apps/web/app/(dashboard)/layout.tsx`

**Problem:** The dashboard layout has no onboarding component integration. New users see a raw dashboard with empty states but no guided tour or setup wizard.

**Impact:** New users (especially low-tech Dr. Anderson) will be confused by the interface and may abandon the platform.

---

### 4. Recurring Tasks Feature Absent
**Persona Affected:** Dr. Robert Kim (Teaching-Heavy Professor)
**File:** Multiple (no implementation found)

**Problem:** Dr. Robert Kim needs to create recurring tasks for weekly lectures. The task schema has no recurrence fields, and no UI exists.

**Impact:** Teaching-focused faculty cannot automate repetitive task creation for course work.

---

## High Severity Issues (P1)

### 5. Grant Filter State Not Persisted ✅ FIXED
**Persona Affected:** Dr. Aisha Patel (Grant Hunter)
**File:** `apps/web/app/(dashboard)/grants/page.tsx`
**Status:** ✅ FIXED (January 12, 2026) - Commit: 67beab1

**Problem:** Grant search filters reset on page refresh. Dr. Aisha saves search criteria but URL state isn't preserved.

**Fix Applied:** Added localStorage persistence with 3 useEffect hooks:
- Load saved filters/query on mount
- Save filters whenever they change
- Save search query whenever it changes
- Clear localStorage when "Clear all" clicked

**Result:** Filters now persist across page refreshes.

---

### 6. Timezone Support Missing
**Persona Affected:** Dr. Elena Volkov (International Collaborator)
**Files:** `packages/shared/src/utils/index.ts`, database schema

**Problem:** All dates are stored and displayed in local time with no timezone awareness. Dr. Elena in Germany and her US collaborators see different "today" tasks.

**Impact:** International collaboration is fundamentally broken for time-sensitive deadlines.

---

### 7. Mobile Touch Targets Too Small
**Persona Affected:** Dr. Kevin Nguyen (Mobile-First User)
**File:** `apps/web/components/tasks/quick-add.tsx:110-122`

**Problem:** The quick-add icon button is 36x36 pixels. WCAG 2.1 AA requires 44x44 minimum for touch targets.

**Code:**
```typescript
<div className={cn(
  "flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200",
  // h-9 w-9 = 36px, should be h-11 w-11 = 44px
```

---

### 8. Invite Resend Missing
**Persona Affected:** Maria Santos (Graduate Student), Dr. Patricia Williams (Department Chair)
**File:** `apps/web/components/personnel/team-management.tsx`

**Problem:** When sending workspace invites, there's no "resend" button if the email bounced or was lost.

---

### 9. DOI Duplicate Detection Case-Sensitive
**Persona Affected:** Dr. James Okonkwo (Publication Tracker)
**File:** `apps/web/app/api/publications/import-doi/route.ts`

**Problem:** DOI lookup is case-sensitive. "10.1234/ABC" and "10.1234/abc" are treated as different publications.

---

### 10. Limited Keyboard Shortcuts
**Persona Affected:** Prof. Marcus Thompson (Power User)
**File:** `apps/web/lib/constants.ts`

**Problem:** Only Q (quick-add), / (search), and Escape are defined. Prof. Thompson expects:
- Cmd+K for command palette
- Cmd+N for new task
- Arrow keys for task navigation
- Enter to edit selected task

---

### 11. No Bulk Operations
**Persona Affected:** Prof. Marcus Thompson (Power User)
**File:** Various task views

**Problem:** No way to select multiple tasks and bulk-update status, priority, or category.

---

### 12. No Export Functionality
**Persona Affected:** Prof. Marcus Thompson (Power User), Dr. Patricia Williams (Department Chair)
**Files:** Task views, project views

**Problem:** No CSV/JSON export for tasks, projects, or publications. Prof. Thompson needs this for API integration; Dr. Williams needs it for dean reports.

---

## Medium Severity Issues (P2)

### 13. Empty States Lack Guidance
**Persona Affected:** Dr. Sarah Chen (New PI), Dr. Lisa Anderson (Late Adopter)
**File:** `apps/web/components/ui/empty-state.tsx`

**Problem:** Empty states show "No tasks yet" with a single CTA. They should include:
- Quick tutorial links
- Example content or templates
- Keyboard shortcut hints

---

### 14. No Syntax Help in Quick-Add
**Persona Affected:** Dr. Sarah Chen (New PI)
**File:** `apps/web/components/tasks/quick-add.tsx`

**Problem:** The hint shows syntax examples but no interactive help. Dr. Sarah types full sentences ("Submit NSF report by Friday") expecting AI parsing.

**Suggestion:** Add expandable syntax reference or AI-assisted parsing with confirmation.

---

### 15. Date Format Hard-Coded to US
**Persona Affected:** Dr. Elena Volkov (International Collaborator)
**File:** `packages/shared/src/utils/index.ts:160`

**Code:**
```typescript
return d.toLocaleDateString("en-US", { ... });
```

**Problem:** European users expect DD/MM format. Should respect user locale or offer preference setting.

---

### 16. No 24-Hour Time Option
**Persona Affected:** Dr. Elena Volkov (International Collaborator)
**File:** Calendar views, task display

**Problem:** Times are displayed in 12-hour AM/PM format with no option for 24-hour format.

---

### 17. Project Quick-Add Missing
**Persona Affected:** Prof. Marcus Thompson (Power User)
**File:** Project pages

**Problem:** Tasks have quick-add with natural language parsing. Projects require navigating to /projects/new and filling a form.

---

### 18. Missing Tooltips Throughout UI
**Persona Affected:** Dr. Lisa Anderson (Late Adopter)
**Files:** Various components

**Problem:** Icon-only buttons have no tooltips explaining their function. The sidebar collapse button, filter icons, and action buttons need descriptive tooltips.

---

### 19. No Dark Mode Toggle in UI
**Persona Affected:** Prof. Marcus Thompson (Power User)
**File:** `apps/web/components/layout/sidebar.tsx`

**Problem:** Dark mode exists (via Tailwind dark:) but there's no visible toggle. Users must rely on system preferences.

---

### 20. Calendar Integration UX
**Persona Affected:** Dr. Sarah Chen (New PI)
**File:** `apps/web/app/(dashboard)/calendar/page.tsx`

**Problem:** Google Calendar connection requires multiple steps with no inline guidance. Connection status is unclear.

---

### 21. No Confirmation for Destructive Actions
**Persona Affected:** All personas
**Files:** Various delete handlers

**Note:** Projects have confirmation dialogs. Tasks and other entities may not.

---

### 22. Search Results Not Highlighted
**Persona Affected:** Prof. Marcus Thompson (Power User)
**File:** Search components

**Problem:** When searching, matched terms aren't highlighted in results.

---

### 23. No Undo for Task Actions
**Persona Affected:** Dr. Lisa Anderson (Late Adopter)
**File:** Task mutations

**Problem:** Completing a task shows no "Undo" option. Late adopters who misclick need easy reversal.

---

### 24. Grant Fit Scoring Not Visible
**Persona Affected:** Dr. Aisha Patel (Grant Hunter)
**File:** Grant discovery UI

**Problem:** The AI service calculates grant fit scores, but the UI may not prominently display this information.

---

## Low Severity Issues (P3)

### 25. Animation Delay on Page Load
**Persona Affected:** Dr. Kevin Nguyen (Mobile-First User)
**File:** Various pages with staggered animations

**Problem:** Staggered animations (stagger-1, stagger-2, stagger-3) add 150-450ms delays. On mobile networks, content appears to load slowly.

---

### 26. No Semester/Term View
**Persona Affected:** Dr. Robert Kim (Teaching-Heavy Professor)
**File:** Calendar/task organization

**Problem:** No ability to filter or organize by academic semester/term.

---

### 27. Archive Feature Limited
**Persona Affected:** Dr. Robert Kim (Teaching-Heavy Professor)
**File:** Project management

**Problem:** Projects can be archived but there's no clear "archived view" to see past work.

---

### 28. No Private Notes for Tasks
**Persona Affected:** Maria Santos (Graduate Student)
**File:** Task schema and UI

**Problem:** Maria wants to add private notes visible only to her, not her advisor. All task notes are shared.

---

### 29. Voice Input Reliability
**Persona Affected:** Dr. Kevin Nguyen (Mobile-First User)
**File:** `apps/web/components/voice/voice-input-inline.tsx`

**Problem:** Voice input exists but may have browser compatibility issues or unclear status indicators.

---

### 30. Co-Author Coordination Features
**Persona Affected:** Dr. James Okonkwo (Publication Tracker)
**File:** Publication management

**Problem:** Can add co-authors but no notification or collaboration features for co-author coordination.

---

## Issue-to-Persona Matrix

| Issue # | Sarah | Marcus | Aisha | James | Maria | Robert | Elena | Patricia | Kevin | Lisa |
|---------|-------|--------|-------|-------|-------|--------|-------|----------|-------|------|
| 1 | X | X | | | | | | | | |
| 2 | | | | X | | | | | | |
| 3 | X | | | | | | | | | X |
| 4 | | | | | | X | | | | |
| 5 | | | X | | | | | | | |
| 6 | | | | | | | X | | | |
| 7 | | | | | | | | | X | |
| 8 | | | | | X | | | X | | |
| 9 | | | | X | | | | | | |
| 10 | | X | | | | | | | | |
| 11 | | X | | | | | | | | |
| 12 | | X | | | | | | X | | |
| 13 | X | | | | | | | | | X |
| 14 | X | | | | | | | | | |
| 15 | | | | | | | X | | | |
| 16 | | | | | | | X | | | |
| 17 | | X | | | | | | | | |
| 18 | | | | | | | | | | X |
| 19 | | X | | | | | | | | |
| 20 | X | | | | | | | | | |
| 21 | X | | | | | | | | | X |
| 22 | | X | | | | | | | | |
| 23 | | | | | | | | | | X |
| 24 | | | X | | | | | | | |
| 25 | | | | | | | | | X | |
| 26 | | | | | | X | | | | |
| 27 | | | | | | X | | | | |
| 28 | | | | | X | | | | | |
| 29 | | | | | | | | | X | |
| 30 | | | | X | | | | | | |

---

## Priority Recommendations

### Sprint 1 (Critical Fixes) - ✅ PARTIALLY COMPLETE
1. ~~Fix quick-add same-day parsing bug (#1)~~ ✅ FIXED
2. Implement publication view/edit modal (#2) ⏳ TODO
3. Integrate onboarding flow (#3) ⏳ TODO (Phase 9B)

### Sprint 2 (High Priority UX)
4. Add timezone support (#6)
5. Increase mobile touch targets (#7)
6. ~~Persist grant filter state (#5)~~ ✅ FIXED
7. Add keyboard shortcuts (#10)

### Sprint 3 (Power User Features)
8. Implement recurring tasks (#4)
9. Add bulk operations (#11)
10. Add export functionality (#12)

### Sprint 4 (Internationalization & Polish)
11. Add date/time format preferences (#15, #16)
12. Improve empty states with guidance (#13, #14)
13. Add tooltips throughout (#18)
14. Add dark mode toggle (#19)

---

## Next Steps

See `FIX_PROMPTS.md` for detailed, copy-paste prompts to fix each issue.
