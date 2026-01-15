# ScholarOS UX Deliverables
## Comprehensive UX Design Documentation

**Document Version:** 1.0
**Created:** January 14, 2026
**Author:** UX Engineering Team
**Status:** Complete

---

## Table of Contents

1. [Detailed Wireframes](#1-detailed-wireframes)
   - [Progressive Onboarding Flow](#11-progressive-onboarding-flow)
   - [Command Palette / Global Search](#12-command-palette--global-search)
   - [Mobile Responsive Views](#13-mobile-responsive-views)
2. [Accessibility Audit](#2-accessibility-audit)
3. [Empty States & Loading Patterns](#3-empty-states--loading-patterns)
4. [Design System Documentation](#4-design-system-documentation)

---

# 1. Detailed Wireframes

## 1.1 Progressive Onboarding Flow

### Overview

The onboarding flow guides new users through initial setup while teaching core concepts. Based on user research findings, the current 60%+ bounce rate indicates users need structured guidance.

### User Journey Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        NEW USER ONBOARDING JOURNEY                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [Signup] → [Email Verify] → [Welcome] → [Profile] → [Workspace] → [Task]  │
│      ↓           ↓              ↓           ↓            ↓           ↓      │
│   Emotion:    Waiting       Excited      Engaged     Invested    Activated │
│                                                                             │
│  Pain Points (Current):                                                     │
│  • No guidance after email verification                                     │
│  • Empty dashboard with no context                                          │
│  • Workspace creation not prompted                                          │
│  • Quick-add syntax not introduced                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Wireframe: Step 1 - Welcome Screen

```
┌────────────────────────────────────────────────────────────────────────────┐
│                                                          [Skip for now →]  │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│                              ┌──────────┐                                  │
│                              │    📚    │                                  │
│                              │ ScholarOS│                                  │
│                              └──────────┘                                  │
│                                                                            │
│                     Welcome to ScholarOS, {firstName}!                     │
│                                                                            │
│              Your AI-powered academic operations platform for              │
│           managing research, teaching, grants, and collaboration.          │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                                                                     │  │
│  │    ┌────────────┐   ┌────────────┐   ┌────────────┐               │  │
│  │    │     ✨     │   │     👥     │   │     📅     │               │  │
│  │    │ AI-Powered │   │    Team    │   │  Calendar  │               │  │
│  │    │            │   │ Workspace  │   │   Sync     │               │  │
│  │    │ Extract    │   │            │   │            │               │  │
│  │    │ tasks from │   │ Shared     │   │ Google     │               │  │
│  │    │ emails &   │   │ tasks &    │   │ Calendar   │               │  │
│  │    │ documents  │   │ projects   │   │ integration│               │  │
│  │    └────────────┘   └────────────┘   └────────────┘               │  │
│  │                                                                     │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│                    ┌────────────────────────────┐                          │
│                    │     Get Started (1 min)    │                          │
│                    └────────────────────────────┘                          │
│                                                                            │
│                     ○ ○ ○ ○ ○  (Step 1 of 5)                              │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**Interaction Notes:**
- Auto-plays subtle animation on feature cards (staggered fade-in)
- Progress dots are interactive for jumping between steps
- "Skip for now" saves progress and allows resumption
- Estimated time shown reduces anxiety

### Wireframe: Step 2 - Profile Setup

```
┌────────────────────────────────────────────────────────────────────────────┐
│  [← Back]                                                [Skip for now →]  │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│                       Complete Your Profile                                │
│                                                                            │
│           Help us personalize your experience and connect                  │
│                    with collaborators at your institution.                 │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                                                                     │  │
│  │      ┌────────┐                                                    │  │
│  │      │   👤   │  Upload Photo (optional)                          │  │
│  │      └────────┘                                                    │  │
│  │                                                                     │  │
│  │  Full Name                                                         │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │ Dr. Sarah Chen                                     [Auto]   │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  │                                                                     │  │
│  │  Institution                                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │ Stanford University                                   [▼]   │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  │  💡 Autocomplete from known institutions                          │  │
│  │                                                                     │  │
│  │  Department                                                        │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │ Computer Science                                            │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  │                                                                     │  │
│  │  Title                                                             │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │ Associate Professor                                   [▼]   │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  │                                                                     │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│                    ┌────────────────────────────┐                          │
│                    │         Continue →         │                          │
│                    └────────────────────────────┘                          │
│                                                                            │
│                     ● ○ ○ ○ ○  (Step 2 of 5)                              │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**UX Improvements:**
- Pre-populated name from signup
- Institution autocomplete for faster entry
- Title dropdown with common academic titles
- All fields optional to reduce friction
- Progress saved automatically

### Wireframe: Step 3 - Workspace Setup

```
┌────────────────────────────────────────────────────────────────────────────┐
│  [← Back]                                                [Skip for now →]  │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│                      Create Your First Workspace                           │
│                                                                            │
│           Workspaces organize your tasks and projects. Create one          │
│                for your lab, course, or research group.                    │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                                                                     │  │
│  │  Workspace Name                                                    │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │ Chen Lab                                                    │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  │                                                                     │  │
│  │  Description (optional)                                            │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │ Human-Computer Interaction research group                   │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  │                                                                     │  │
│  │  ┌─ Quick Templates ──────────────────────────────────────────┐  │  │
│  │  │                                                             │  │  │
│  │  │  ○ Research Lab     ○ Course        ○ Personal            │  │  │
│  │  │    Pre-configured     Teaching-       Individual           │  │  │
│  │  │    for lab work       focused         productivity         │  │  │
│  │  │                                                             │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  │                                                                     │  │
│  │  ┌─ Invite Team Members (optional) ───────────────────────────┐  │  │
│  │  │                                                             │  │  │
│  │  │  ┌───────────────────────────────────────────┐  [+ Add]   │  │  │
│  │  │  │ colleague@stanford.edu                     │            │  │  │
│  │  │  └───────────────────────────────────────────┘            │  │  │
│  │  │                                                             │  │  │
│  │  │  [postdoc@stanford.edu ×] [phd-student@stanford.edu ×]    │  │  │
│  │  │                                                             │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  │                                                                     │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│                    ┌────────────────────────────┐                          │
│                    │    Create Workspace →      │                          │
│                    └────────────────────────────┘                          │
│                                                                            │
│                     ● ● ○ ○ ○  (Step 3 of 5)                              │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**Interaction Design:**
- Template selection adds suggested categories and project types
- Email chips with validation
- Batch invite reduces friction vs inviting one-by-one
- Can skip team invite and do later

### Wireframe: Step 4 - First Task Tutorial (Interactive)

```
┌────────────────────────────────────────────────────────────────────────────┐
│  [← Back]                                                [Skip for now →]  │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│                       Create Your First Task                               │
│                                                                            │
│         ScholarOS uses natural language to quickly add tasks.              │
│                       Watch how it works:                                  │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                                                                     │  │
│  │  ┌─ Demo (auto-typing) ──────────────────────────────────────────┐ │  │
│  │  │                                                                │ │  │
│  │  │  Review paper draft fri #research p1                          │ │  │
│  │  │                         ▌                                      │ │  │
│  │  └────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                     │  │
│  │  ┌─ Parsed Result ───────────────────────────────────────────────┐ │  │
│  │  │                                                                │ │  │
│  │  │   ✓ Title:     Review paper draft                             │ │  │
│  │  │   ✓ Due:       Friday, January 17                             │ │  │
│  │  │   ✓ Category:  🔬 Research                                    │ │  │
│  │  │   ✓ Priority:  🔴 P1 (Urgent)                                 │ │  │
│  │  │                                                                │ │  │
│  │  └────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                     │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                                                                     │  │
│  │  Now try it yourself!                                              │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │ Type a task...                          [Create Task →]     │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  │                                                                     │  │
│  │  ┌─ Quick Reference ─────────────────────────────────────────────┐ │  │
│  │  │  📅 today, tomorrow, mon-sun, jan 15   → Due dates           │ │  │
│  │  │  # research, teaching, grants, admin   → Categories          │ │  │
│  │  │  p1, p2, p3, p4                        → Priorities          │ │  │
│  │  │  @name                                  → Assign to member   │ │  │
│  │  └─────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                     │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│                     ● ● ● ○ ○  (Step 4 of 5)                              │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**Interactive Elements:**
- Auto-typing demo runs once on mount
- Real quick-add input that creates actual task
- Success triggers celebration animation + auto-advance
- Reference card is collapsible for returning users

### Wireframe: Step 5 - Completion & Next Steps

```
┌────────────────────────────────────────────────────────────────────────────┐
│                                                                            │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│                               🎉                                           │
│                                                                            │
│                      You're All Set, Sarah!                                │
│                                                                            │
│              Your workspace is ready. Here's what you accomplished:        │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                                                                     │  │
│  │    [✓] Created your profile                                        │  │
│  │    [✓] Set up "Chen Lab" workspace                                 │  │
│  │    [✓] Added your first task                                       │  │
│  │                                                                     │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌─ Recommended Next Steps ────────────────────────────────────────────┐  │
│  │                                                                     │  │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │  │
│  │  │       📅        │  │       🔍        │  │       📊        │  │  │
│  │  │  Connect Google │  │  Discover       │  │  Create First   │  │  │
│  │  │     Calendar    │  │     Grants      │  │     Project     │  │  │
│  │  │                 │  │                 │  │                 │  │  │
│  │  │ [Connect Now]   │  │ [Explore →]     │  │ [Create →]      │  │  │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘  │  │
│  │                                                                     │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│                    ┌────────────────────────────┐                          │
│                    │      Go to Dashboard →     │                          │
│                    └────────────────────────────┘                          │
│                                                                            │
│               Need help? Press ⌘K anytime to search                       │
│                                                                            │
│                     ● ● ● ● ●  (Complete!)                                │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**Post-Onboarding:**
- Confetti animation on load
- Checklist shows actual completed items
- Next steps are contextual cards (not forced)
- Keyboard shortcut hint introduces command palette
- First dashboard visit shows subtle tooltip tour

---

## 1.2 Command Palette / Global Search

### User Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         COMMAND PALETTE USER FLOW                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Trigger:  ⌘K / Ctrl+K  OR  Click search icon in header                   │
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐        │
│  │   Empty State   │───▶│  Typing Query   │───▶│  View Results   │        │
│  │                 │    │                 │    │                 │        │
│  │ - Quick Actions │    │ - Live search   │    │ - Select item   │        │
│  │ - Recent items  │    │ - Fuzzy match   │    │ - Execute action│        │
│  │ - Suggestions   │    │ - Grouped       │    │ - Close palette │        │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘        │
│          │                                              │                   │
│          │              Keyboard Navigation             │                   │
│          │    ↑↓ = Navigate    Enter = Select          │                   │
│          │    Esc = Close      Tab = Next group        │                   │
│          │                                              │                   │
│          └──────────────── ⌘K ──────────────────────────┘                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Wireframe: Command Palette (Empty State)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ╔════════════════════════════════════════════════════════════════════════╗ │
│ ║  🔍  Search tasks, projects, grants... or type a command               ║ │
│ ╚════════════════════════════════════════════════════════════════════════╝ │
│                                                                            │
│  ┌─ Quick Actions ──────────────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │  ┌────────────────────────────────────────────────────────────────┐ │  │
│  │  │  [+]  Create New Task                                    ⌘N   │ │  │
│  │  └────────────────────────────────────────────────────────────────┘ │  │
│  │  ┌────────────────────────────────────────────────────────────────┐ │  │
│  │  │  [📁] New Project                                        ⌘⇧P  │ │  │
│  │  └────────────────────────────────────────────────────────────────┘ │  │
│  │  ┌────────────────────────────────────────────────────────────────┐ │  │
│  │  │  [📅] Open Calendar                                      ⌘⇧C  │ │  │
│  │  └────────────────────────────────────────────────────────────────┘ │  │
│  │  ┌────────────────────────────────────────────────────────────────┐ │  │
│  │  │  [⚙️] Settings                                           ⌘,   │ │  │
│  │  └────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌─ Recent ─────────────────────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │  ┌────────────────────────────────────────────────────────────────┐ │  │
│  │  │  [🕐] Review NSF proposal               #grants        2h ago │ │  │
│  │  └────────────────────────────────────────────────────────────────┘ │  │
│  │  ┌────────────────────────────────────────────────────────────────┐ │  │
│  │  │  [🕐] CHI 2026 Manuscript              📁 project     yesterday│ │  │
│  │  └────────────────────────────────────────────────────────────────┘ │  │
│  │  ┌────────────────────────────────────────────────────────────────┐ │  │
│  │  │  [🕐] "NIH R01 guidelines"             🔍 search       3d ago │ │  │
│  │  └────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌─ Navigation ─────────────────────────────────────────────────────────┐  │
│  │  [T] Today  [U] Upcoming  [B] Board  [P] Projects  [G] Grants       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│     ↑↓ Navigate   ↵ Select   ⎋ Close   ⇥ Next Section                    │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

### Wireframe: Command Palette (Search Results)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ╔════════════════════════════════════════════════════════════════════════╗ │
│ ║  🔍  NIH grant▌                                                   [×] ║ │
│ ╚════════════════════════════════════════════════════════════════════════╝ │
│                                                                            │
│  ┌─ Tasks (3) ──────────────────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │  ┌────────────────────────────────────────────────────────────────┐ │  │
│  │  │  ☐  Review [NIH grant] guidelines           🏷️ grants   p2    │ │  │  ← Selected
│  │  │      Due: Jan 18                                               │ │  │
│  │  └────────────────────────────────────────────────────────────────┘ │  │
│  │  ┌────────────────────────────────────────────────────────────────┐ │  │
│  │  │  ☑  Submit [NIH] R01 application           🏷️ grants   p1    │ │  │
│  │  │      Completed: Jan 10                                         │ │  │
│  │  └────────────────────────────────────────────────────────────────┘ │  │
│  │  ┌────────────────────────────────────────────────────────────────┐ │  │
│  │  │  ☐  Update [NIH] budget spreadsheet        🏷️ admin    p3    │ │  │
│  │  │      Due: Jan 25                                               │ │  │
│  │  └────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌─ Projects (1) ───────────────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │  ┌────────────────────────────────────────────────────────────────┐ │  │
│  │  │  📁  [NIH] R01 Neural Interface            grant   ████░ 75%  │ │  │
│  │  │      3 milestones • 2 tasks remaining                          │ │  │
│  │  └────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌─ Grants (2) ─────────────────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │  ┌────────────────────────────────────────────────────────────────┐ │  │
│  │  │  💰  [NIH] R01 Research Project [Grant]    $500K   Feb 5     │ │  │
│  │  │      National Institutes of Health                             │ │  │
│  │  └────────────────────────────────────────────────────────────────┘ │  │
│  │  ┌────────────────────────────────────────────────────────────────┐ │  │
│  │  │  💰  [NIH] K99/R00 Pathway to Ind.         $250K   Mar 12    │ │  │
│  │  │      National Institutes of Health                             │ │  │
│  │  └────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│     ↑↓ Navigate   ↵ Open   ⎋ Close   ⌘↵ Open in new tab                  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**Search UX Details:**

| Feature | Implementation |
|---------|----------------|
| Fuzzy matching | Use Fuse.js with threshold 0.3 |
| Highlighting | Bold matched characters in results |
| Grouping | Tasks → Projects → Grants → Publications |
| Limit | 5 results per group, "Show all X" link |
| Debounce | 150ms debounce on search input |
| Caching | Cache recent searches in localStorage |

### Wireframe: Command Palette (Action Mode)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ╔════════════════════════════════════════════════════════════════════════╗ │
│ ║  >  goto▌                                                              ║ │
│ ╚════════════════════════════════════════════════════════════════════════╝ │
│                                                                            │
│  ┌─ Commands ───────────────────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │  ┌────────────────────────────────────────────────────────────────┐ │  │
│  │  │  ▶  Go to Today                            g then t           │ │  │
│  │  └────────────────────────────────────────────────────────────────┘ │  │
│  │  ┌────────────────────────────────────────────────────────────────┐ │  │
│  │  │  ▶  Go to Upcoming                         g then u           │ │  │
│  │  └────────────────────────────────────────────────────────────────┘ │  │
│  │  ┌────────────────────────────────────────────────────────────────┐ │  │
│  │  │  ▶  Go to Board                            g then b           │ │  │
│  │  └────────────────────────────────────────────────────────────────┘ │  │
│  │  ┌────────────────────────────────────────────────────────────────┐ │  │
│  │  │  ▶  Go to Calendar                         g then c           │ │  │
│  │  └────────────────────────────────────────────────────────────────┘ │  │
│  │  ┌────────────────────────────────────────────────────────────────┐ │  │
│  │  │  ▶  Go to Grants                           g then d           │ │  │
│  │  └────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│     Type ">" to enter command mode • Type text to search                   │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**Command Mode Triggers:**
- `>` prefix enters command mode
- `/` prefix for slash commands
- `@` prefix for mentioning team members
- `#` prefix for filtering by category

---

## 1.3 Mobile Responsive Views

### Mobile Breakpoint Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RESPONSIVE BREAKPOINTS                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  xs: 375px   │  sm: 640px   │  md: 768px   │  lg: 1024px  │  xl: 1280px   │
│              │              │              │              │               │
│  iPhone SE   │  Small       │  iPad        │  Desktop     │  Large        │
│  Mini        │  Tablets     │  Portrait    │  Standard    │  Desktop      │
│              │              │              │              │               │
│  ┌────────┐  │  ┌────────┐  │  ┌────────┐  │  ┌────────┐  │  ┌─────────┐  │
│  │ Stack  │  │  │ Stack  │  │  │ Sidebar│  │  │ Sidebar│  │  │ Sidebar │  │
│  │ +      │  │  │ +      │  │  │ +      │  │  │ +      │  │  │ + Wide  │  │
│  │ Bottom │  │  │ Bottom │  │  │ Content│  │  │ Content│  │  │ Content │  │
│  │ Nav    │  │  │ Nav    │  │  │        │  │  │        │  │  │         │  │
│  └────────┘  │  └────────┘  │  └────────┘  │  └────────┘  │  └─────────┘  │
│              │              │              │              │               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Wireframe: Mobile Board View (Tabs)

```
┌──────────────────────────────┐
│ ≡  Board          ⊕    🔍   │  ← Header with hamburger menu
├──────────────────────────────┤
│                              │
│ ┌──────────────────────────┐ │
│ │ To Do (3)│ In Progress (2)│ Done (5)│ │  ← Tab navigation
│ └──────────────────────────┘ │
│                              │
│ ← Swipe to switch tabs →     │
│                              │
│ ┌──────────────────────────┐ │
│ │ ☐ Review paper draft     │ │
│ │ 🏷️ research  🔴 p1       │ │
│ │ Due: Tomorrow            │ │
│ └──────────────────────────┘ │
│                              │
│ ┌──────────────────────────┐ │
│ │ ☐ Prepare lecture slides │ │
│ │ 🏷️ teaching  🟡 p2       │ │
│ │ Due: Jan 18              │ │
│ └──────────────────────────┘ │
│                              │
│ ┌──────────────────────────┐ │
│ │ ☐ Submit NSF report      │ │
│ │ 🏷️ grants    🔵 p3       │ │
│ │ Due: Jan 25              │ │
│ └──────────────────────────┘ │
│                              │
│ ┌──────────────────────────┐ │
│ │     + Add Task           │ │  ← Floating action button area
│ └──────────────────────────┘ │
│                              │
├──────────────────────────────┤
│ 🏠    📅    📋    📁    ≡   │  ← Bottom navigation
│Today  Up   Board Proj  More │
└──────────────────────────────┘
```

**Mobile Board Interactions:**
- Swipe left/right between status tabs
- Pull down to refresh
- Long press task card for quick actions
- Swipe task left to complete
- Swipe task right to delete (with confirmation)

### Wireframe: Mobile Task Detail (Full Screen)

```
┌──────────────────────────────┐
│ ←  Task Details        ⋮    │
├──────────────────────────────┤
│                              │
│ ┌──────────────────────────┐ │
│ │                          │ │
│ │  ☐ Review paper draft    │ │
│ │                          │ │
│ │  Due: Tomorrow           │ │
│ │  📅 Jan 15, 2026         │ │
│ │                          │ │
│ └──────────────────────────┘ │
│                              │
│ ┌─ Description ────────────┐ │
│ │                          │ │
│ │ Review the methodology   │ │
│ │ section and provide      │ │
│ │ feedback on statistical  │ │
│ │ analysis approach.       │ │
│ │                          │ │
│ └──────────────────────────┘ │
│                              │
│ ┌─ Details ────────────────┐ │
│ │                          │ │
│ │ Status     [To Do    ▼]  │ │
│ │                          │ │
│ │ Priority   [🔴 P1    ▼]  │ │
│ │                          │ │
│ │ Category   [🔬 Research▼]│ │
│ │                          │ │
│ │ Assignee   [Unassigned▼] │ │
│ │                          │ │
│ │ Project    [None      ▼] │ │
│ │                          │ │
│ └──────────────────────────┘ │
│                              │
│                              │
│ ┌──────────────────────────┐ │
│ │      💾 Save Changes     │ │
│ └──────────────────────────┘ │
│                              │
│ ┌──────────────────────────┐ │
│ │      🗑️ Delete Task      │ │
│ └──────────────────────────┘ │
│                              │
└──────────────────────────────┘
```

### Wireframe: Mobile Bottom Navigation

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        MOBILE BOTTOM NAVIGATION                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Standard State:                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                                                                    │ │
│  │   🏠        📅         📋        📁         ≡                     │ │
│  │  Today    Upcoming    Board    Projects    More                   │ │
│  │   ●                                                               │ │
│  │                                                                    │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  "More" Menu Expanded:                                                   │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  ┌──────────────────────────────────────────────────────────────┐ │ │
│  │  │                                                              │ │ │
│  │  │  💰 Grants           📚 Publications                        │ │ │
│  │  │                                                              │ │ │
│  │  │  👥 Personnel        🎓 Teaching                            │ │ │
│  │  │                                                              │ │ │
│  │  │  📅 Calendar         ⚙️ Settings                            │ │ │
│  │  │                                                              │ │ │
│  │  └──────────────────────────────────────────────────────────────┘ │ │
│  │                                                                    │ │
│  │   🏠        📅         📋        📁         ✕                     │ │
│  │  Today    Upcoming    Board    Projects   Close                   │ │
│  │                                            ●                      │ │
│  │                                                                    │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  Touch Targets: 44×44px minimum                                         │
│  Safe Area: env(safe-area-inset-bottom) padding                         │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Wireframe: Mobile Grant Card (Compact)

```
┌──────────────────────────────┐
│                              │
│ ┌──────────────────────────┐ │
│ │ 💰                       │ │
│ │ NIH R01 Research Grant   │ │
│ │                          │ │
│ │ ┌─────┐ ┌─────┐ ┌──────┐│ │
│ │ │ NIH │ │$500K│ │Feb 5 ││ │
│ │ └─────┘ └─────┘ └──────┘│ │
│ │                          │ │
│ │ [View Details]  [Save ♡] │ │
│ └──────────────────────────┘ │
│                              │
│ ┌──────────────────────────┐ │
│ │ 💰                       │ │
│ │ NSF CAREER Award         │ │
│ │                          │ │
│ │ ┌─────┐ ┌─────┐ ┌──────┐│ │
│ │ │ NSF │ │$750K│ │Jul 24││ │
│ │ └─────┘ └─────┘ └──────┘│ │
│ │                          │ │
│ │ [View Details]  [Save ♡] │ │
│ └──────────────────────────┘ │
│                              │
└──────────────────────────────┘
```

**Mobile-Specific Patterns:**

| Pattern | Desktop | Mobile |
|---------|---------|--------|
| Navigation | Fixed sidebar | Bottom tab bar |
| Task detail | Side drawer | Full-screen modal |
| Kanban board | 3-column grid | Tab-based single column |
| Grant cards | Expanded with description | Compact badges only |
| Quick add | Inline form | Bottom sheet |
| Filters | Visible panel | Collapsible accordion |

---

# 2. Accessibility Audit

## Current State Assessment

Based on codebase analysis, ScholarOS has a **solid accessibility foundation** but requires improvements in several areas.

### Audit Summary

| Category | Current Score | Target | Status |
|----------|--------------|--------|--------|
| Keyboard Navigation | 75% | 100% | 🟡 Needs work |
| Screen Reader | 70% | 100% | 🟡 Needs work |
| Color Contrast | 85% | 100% | 🟢 Good |
| Focus Management | 80% | 100% | 🟡 Needs work |
| ARIA Labels | 65% | 100% | 🔴 Priority |

### 2.1 Keyboard Navigation Audit

#### Existing Patterns (Good)

**File:** `apps/web/components/accessibility/focus-trap.tsx`
```typescript
// ✅ Focus trap implementation exists
// ✅ Tab wrapping (first ↔ last)
// ✅ Escape key handling
// ✅ Return focus on unmount
```

**File:** `apps/web/components/accessibility/skip-link.tsx`
```typescript
// ✅ Skip link component exists
// ✅ Multiple skip link support
// ✅ Proper focus styling
```

#### Issues Found

| Issue | Location | Severity | Fix |
|-------|----------|----------|-----|
| Arrow key navigation not implemented in task lists | `task-list.tsx` | High | Add `useArrowKeyNavigation` hook |
| Kanban columns not keyboard accessible for drag/drop | `board/page.tsx` | High | Add keyboard reorder with Shift+↑↓ |
| Calendar date picker lacks keyboard support | `calendar/page.tsx` | Medium | Use Radix Calendar primitive |
| Dropdown menus close on ArrowDown | Various | Medium | Prevent default, keep open |

#### Recommended Additions

```typescript
// apps/web/lib/hooks/use-keyboard-navigation.ts

export function useKeyboardNavigation<T>({
  items,
  onSelect,
  orientation = 'vertical',
  wrap = true,
  enableTypeahead = false,
}: KeyboardNavOptions<T>) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [typeaheadQuery, setTypeaheadQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isVertical = orientation === 'vertical';
      const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft';
      const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight';

      switch (e.key) {
        case prevKey:
          e.preventDefault();
          setFocusedIndex(i => {
            const next = i - 1;
            return wrap ? (next < 0 ? items.length - 1 : next) : Math.max(0, next);
          });
          break;
        case nextKey:
          e.preventDefault();
          setFocusedIndex(i => {
            const next = i + 1;
            return wrap ? (next >= items.length ? 0 : next) : Math.min(items.length - 1, next);
          });
          break;
        case 'Home':
          e.preventDefault();
          setFocusedIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setFocusedIndex(items.length - 1);
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          onSelect?.(items[focusedIndex], focusedIndex);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [items, focusedIndex, onSelect, orientation, wrap]);

  return { focusedIndex, setFocusedIndex };
}
```

### 2.2 Screen Reader Audit

#### Issues Found

| Issue | Location | Fix Required |
|-------|----------|--------------|
| Icon buttons missing labels | Multiple components | Add `aria-label` |
| Dynamic content not announced | Task completion | Add `aria-live` region |
| Form errors not associated | All forms | Add `aria-describedby` |
| Table headers not semantic | Data tables | Use `<th scope="col">` |
| Modal titles not announced | Dialogs | Add `aria-labelledby` |

#### Current Implementation Gaps

```tsx
// ❌ Current: Icon button without label
<Button variant="ghost" size="icon" onClick={deleteTask}>
  <Trash2 className="h-4 w-4" />
</Button>

// ✅ Fixed: With aria-label
<Button
  variant="ghost"
  size="icon"
  onClick={deleteTask}
  aria-label="Delete task"
>
  <Trash2 className="h-4 w-4" />
</Button>
```

#### Recommended Live Region Component

```typescript
// apps/web/components/accessibility/announcer.tsx

import { createContext, useContext, useState, useCallback } from 'react';

interface AnnouncerContextType {
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
}

const AnnouncerContext = createContext<AnnouncerContextType | null>(null);

export function AnnouncerProvider({ children }: { children: React.ReactNode }) {
  const [politeMessage, setPoliteMessage] = useState('');
  const [assertiveMessage, setAssertiveMessage] = useState('');

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (priority === 'assertive') {
      setAssertiveMessage('');
      setTimeout(() => setAssertiveMessage(message), 50);
    } else {
      setPoliteMessage('');
      setTimeout(() => setPoliteMessage(message), 50);
    }
  }, []);

  return (
    <AnnouncerContext.Provider value={{ announce }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeMessage}
      </div>
      <div
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveMessage}
      </div>
    </AnnouncerContext.Provider>
  );
}

export function useAnnounce() {
  const context = useContext(AnnouncerContext);
  if (!context) throw new Error('useAnnounce must be used within AnnouncerProvider');
  return context.announce;
}

// Usage:
// const announce = useAnnounce();
// announce('Task completed successfully');
// announce('Error: Please fill in all required fields', 'assertive');
```

### 2.3 Color Contrast Audit

#### Current Status

| Element | Foreground | Background | Ratio | Pass |
|---------|-----------|------------|-------|------|
| Body text | `--foreground` | `--background` | 15.8:1 | ✅ AAA |
| Muted text | `--muted-foreground` | `--background` | 4.6:1 | ✅ AA |
| Primary button | `--primary-foreground` | `--primary` | 7.2:1 | ✅ AAA |
| Placeholder | `--muted-foreground` | `--input` | 4.5:1 | ✅ AA |
| Link text | `--primary` | `--background` | 3.8:1 | ⚠️ Borderline |

#### Issues Found

| Issue | Location | Current Ratio | Fix |
|-------|----------|---------------|-----|
| P4 priority badge hard to read | Task cards | 3.2:1 | Darken `--priority-p4` |
| Disabled button text too light | All buttons | 2.8:1 | Increase disabled opacity to 60% |
| Placeholder text in dark mode | Form inputs | 3.9:1 | Lighten `--muted-foreground` in dark |

#### Recommended CSS Fixes

```css
/* globals.css additions */

:root {
  /* Improve P4 priority contrast */
  --priority-p4: 220 15% 45%; /* Was 55% */
}

.dark {
  /* Improve muted foreground in dark mode */
  --muted-foreground: 35 12% 63%; /* Was 58% */
}

/* Improve disabled state contrast */
.btn:disabled,
button:disabled {
  opacity: 0.6; /* Was 0.5 */
}

/* Ensure links meet AA contrast */
a:not(.btn) {
  text-decoration-thickness: 1.5px;
  text-underline-offset: 2px;
}
```

### 2.4 Focus Management Audit

#### Current Implementation

**File:** `apps/web/app/globals.css` (lines 166-173)
```css
:focus-visible {
  @apply outline-none ring-2 ring-primary/70 ring-offset-1 ring-offset-background;
}
```

#### Issues Found

| Issue | Impact | Fix |
|-------|--------|-----|
| Focus ring inconsistent between buttons and inputs | Medium | Standardize ring-offset |
| Focus not returned after modal close in some cases | High | Audit all modal implementations |
| Skip link not visible enough when focused | Medium | Increase contrast of skip link |
| Focus lost when task is deleted | High | Move focus to next task |

#### Focus Management Best Practices

```typescript
// Proper focus management after deletion
async function handleDeleteTask(taskId: string, index: number) {
  // Store reference to next element before deletion
  const nextFocusTarget = taskRefs.current[index + 1] || taskRefs.current[index - 1] || addTaskButtonRef.current;

  await deleteTask(taskId);

  // Move focus after DOM update
  requestAnimationFrame(() => {
    nextFocusTarget?.focus();
  });
}

// Return focus after modal close
function Modal({ onClose, triggerRef, ...props }) {
  const previousFocus = useRef(document.activeElement);

  useEffect(() => {
    return () => {
      // Return focus on unmount
      (previousFocus.current as HTMLElement)?.focus();
    };
  }, []);

  // ... modal implementation
}
```

### 2.5 ARIA Labels Audit

#### Components Requiring Labels

| Component | Current | Required |
|-----------|---------|----------|
| Task checkbox | ❌ None | `aria-label="Mark task as complete: {title}"` |
| Priority dropdown | ❌ None | `aria-label="Select priority"` |
| Category badge | ❌ None | `aria-label="Category: {category}"` |
| Due date picker | ❌ None | `aria-label="Select due date"` |
| Quick add input | ✅ Has placeholder | Add `aria-describedby` for syntax help |
| Filter toggles | ❌ None | `aria-pressed` for toggle state |

#### Implementation Checklist

```tsx
// Task checkbox
<Checkbox
  checked={task.status === 'done'}
  onCheckedChange={handleComplete}
  aria-label={`Mark "${task.title}" as ${task.status === 'done' ? 'incomplete' : 'complete'}`}
/>

// Priority dropdown
<Select aria-label="Task priority">
  <SelectTrigger aria-describedby="priority-help">
    <SelectValue placeholder="Priority" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="p1">P1 - Urgent</SelectItem>
    <SelectItem value="p2">P2 - High</SelectItem>
    <SelectItem value="p3">P3 - Normal</SelectItem>
    <SelectItem value="p4">P4 - Low</SelectItem>
  </SelectContent>
</Select>
<span id="priority-help" className="sr-only">
  Select task priority from P1 (urgent) to P4 (low)
</span>

// Filter toggle button
<Button
  variant={isActive ? "default" : "outline"}
  aria-pressed={isActive}
  onClick={() => toggleFilter(filter)}
>
  {filter.label}
</Button>
```

### 2.6 Accessibility Testing Checklist

```markdown
## Pre-Launch Accessibility Checklist

### Automated Testing
- [ ] Run axe-core on all pages (0 critical violations)
- [ ] Run Lighthouse accessibility audit (score 90+)
- [ ] Validate HTML (no ARIA errors)
- [ ] Check color contrast with WebAIM tool

### Keyboard Testing
- [ ] Tab through entire app without mouse
- [ ] All interactive elements focusable
- [ ] Focus visible on all elements
- [ ] No keyboard traps
- [ ] Escape closes all modals/dropdowns
- [ ] Arrow keys work in lists/menus

### Screen Reader Testing
- [ ] Test with VoiceOver (macOS)
- [ ] Test with NVDA (Windows)
- [ ] All images have alt text
- [ ] Form errors announced
- [ ] Dynamic content announced
- [ ] Headings create logical outline

### Visual Testing
- [ ] Works at 200% zoom
- [ ] Works with high contrast mode
- [ ] No horizontal scroll at 320px width
- [ ] Text readable with browser font override

### Motion & Timing
- [ ] Respects prefers-reduced-motion
- [ ] No content flashes more than 3x/second
- [ ] Time limits adjustable or removable
```

---

# 3. Empty States & Loading Patterns

## 3.1 Empty State Design System

### Empty State Variants

ScholarOS currently has good empty state foundations. Here's an expanded system:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EMPTY STATE VARIANT SYSTEM                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │   DEFAULT   │  │   SUCCESS   │  │   MUTED     │  │ CELEBRATION │       │
│  │             │  │             │  │             │  │             │       │
│  │  Gray icon  │  │ Green icon  │  │ Subtle gray │  │ Amber/gold  │       │
│  │  container  │  │ + gradient  │  │ for filters │  │ + confetti  │       │
│  │             │  │  bg         │  │             │  │             │       │
│  │  First-time │  │  All done   │  │  No results │  │  Milestones │       │
│  │  states     │  │  states     │  │  states     │  │  achieved   │       │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                        │
│  │   PRIMARY   │  │   ERROR     │  │   LOADING   │                        │
│  │             │  │             │  │             │                        │
│  │ Amber brand │  │  Red accent │  │  Skeleton   │                        │
│  │ + subtle    │  │  + retry    │  │  + shimmer  │                        │
│  │  gradient   │  │  action     │  │             │                        │
│  │             │  │             │  │             │                        │
│  │  Welcome    │  │  API errors │  │  Fetching   │                        │
│  │  prompts    │  │  / failures │  │  data       │                        │
│  └─────────────┘  └─────────────┘  └─────────────┘                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### New Empty State Components

#### 1. Welcome Empty State (First Visit)

```tsx
// apps/web/components/ui/welcome-empty-state.tsx

interface WelcomeEmptyStateProps {
  title: string;
  description: string;
  features: Array<{
    icon: LucideIcon;
    title: string;
    description: string;
  }>;
  primaryAction: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export function WelcomeEmptyState({
  title,
  description,
  features,
  primaryAction,
  secondaryAction,
}: WelcomeEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in">
      {/* Animated wave greeting */}
      <span className="text-4xl mb-4 animate-wave">👋</span>

      <h2 className="font-display text-2xl font-semibold mb-2">{title}</h2>
      <p className="text-muted-foreground max-w-md mb-8">{description}</p>

      {/* Feature cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mb-8">
        {features.map((feature, i) => (
          <div
            key={feature.title}
            className="flex flex-col items-center p-4 rounded-xl bg-muted/30 animate-fade-in"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="icon-container-md bg-primary/10 mb-3">
              <feature.icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-medium text-sm mb-1">{feature.title}</h3>
            <p className="text-xs text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button onClick={primaryAction.onClick} className="gap-2">
          {primaryAction.icon && <primaryAction.icon className="h-4 w-4" />}
          {primaryAction.label}
        </Button>
        {secondaryAction && (
          <Button variant="ghost" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
}
```

#### 2. Error Empty State

```tsx
// apps/web/components/ui/error-empty-state.tsx

interface ErrorEmptyStateProps {
  title?: string;
  description?: string;
  error?: Error | string;
  onRetry?: () => void;
  onGoBack?: () => void;
}

export function ErrorEmptyState({
  title = "Something went wrong",
  description = "We couldn't load this content. Please try again.",
  error,
  onRetry,
  onGoBack,
}: ErrorEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 mb-4">
        <AlertCircle className="h-6 w-6 text-destructive" />
      </div>

      <h3 className="font-display text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-2">{description}</p>

      {error && (
        <details className="text-xs text-muted-foreground mb-4 max-w-sm">
          <summary className="cursor-pointer hover:text-foreground">
            View error details
          </summary>
          <pre className="mt-2 p-2 rounded bg-muted text-left overflow-x-auto">
            {typeof error === 'string' ? error : error.message}
          </pre>
        </details>
      )}

      <div className="flex items-center gap-3">
        {onRetry && (
          <Button onClick={onRetry} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        )}
        {onGoBack && (
          <Button variant="outline" onClick={onGoBack}>
            Go Back
          </Button>
        )}
      </div>
    </div>
  );
}
```

#### 3. Filtered Empty State

```tsx
// apps/web/components/ui/filtered-empty-state.tsx

interface FilteredEmptyStateProps {
  entityName: string;
  activeFilters: string[];
  onClearFilters: () => void;
  onClearSingle?: (filter: string) => void;
  suggestions?: string[];
}

export function FilteredEmptyState({
  entityName,
  activeFilters,
  onClearFilters,
  onClearSingle,
  suggestions,
}: FilteredEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50 mb-4">
        <Filter className="h-6 w-6 text-muted-foreground" />
      </div>

      <h3 className="font-display text-lg font-semibold mb-1">
        No {entityName} match your filters
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">
        Try adjusting your filters to see more results.
      </p>

      {/* Active filters */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
        {activeFilters.map(filter => (
          <Badge
            key={filter}
            variant="secondary"
            className="gap-1 cursor-pointer hover:bg-destructive/10"
            onClick={() => onClearSingle?.(filter)}
          >
            {filter}
            <X className="h-3 w-3" />
          </Badge>
        ))}
      </div>

      <Button variant="outline" onClick={onClearFilters} className="gap-2">
        <X className="h-4 w-4" />
        Clear All Filters
      </Button>

      {/* Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <div className="mt-6 text-sm text-muted-foreground">
          <p className="mb-2">Try searching for:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {suggestions.map(suggestion => (
              <button
                key={suggestion}
                className="text-primary hover:underline"
                onClick={() => {/* Apply suggestion */}}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

### Page-Specific Empty States

#### Today View - No Tasks

```
┌────────────────────────────────────────────────────────────────────────────┐
│                                                                            │
│                              ☀️                                            │
│                                                                            │
│                    Ready to plan your day?                                 │
│                                                                            │
│         Your Today view is empty. Add tasks due today or                   │
│              without a deadline to see them here.                          │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                                                                     │  │
│  │  💡 "Review paper fri #research p1"      → Parsed automatically   │  │
│  │  💡 "Team meeting tomorrow @sarah"       → Assigned & scheduled   │  │
│  │  💡 "Submit report #grants"              → No date = Today        │  │
│  │                                                                     │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│                         [+ Add First Task]                                 │
│                                                                            │
│                   Press Q to quick-add anytime                            │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

#### Projects View - No Projects

```
┌────────────────────────────────────────────────────────────────────────────┐
│                                                                            │
│                              📁                                            │
│                                                                            │
│                    Track your research projects                            │
│                                                                            │
│         Create projects to organize manuscripts, grants, and               │
│              research work with milestones and progress tracking.          │
│                                                                            │
│  ┌─ Project Types ──────────────────────────────────────────────────────┐ │
│  │                                                                      │ │
│  │    📝 Manuscript         💰 Grant             📋 General            │ │
│  │    Track papers from     Proposal to          Any research          │ │
│  │    draft to publication  submission           project               │ │
│  │                                                                      │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│                        [+ Create First Project]                            │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

#### Grants View - No Saved Grants

```
┌────────────────────────────────────────────────────────────────────────────┐
│                                                                            │
│                              🔍                                            │
│                                                                            │
│                    Discover funding opportunities                          │
│                                                                            │
│         Search thousands of grants from NIH, NSF, DOE, and more.           │
│              Save grants to your watchlist to track deadlines.             │
│                                                                            │
│  ┌─ Popular Searches ───────────────────────────────────────────────────┐ │
│  │                                                                      │ │
│  │  [NIH R01]  [NSF CAREER]  [DOE Early Career]  [NIH K99]             │ │
│  │                                                                      │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  🔍 Search grants by keyword, agency, or topic...                   │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│                        [Browse All Grants →]                               │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

## 3.2 Loading State Patterns

### Loading State Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LOADING STATE HIERARCHY                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. INSTANT (0-100ms)                                                       │
│     └─ No loading indicator needed                                          │
│                                                                             │
│  2. BRIEF (100-300ms)                                                       │
│     └─ Subtle opacity change / disabled state                               │
│                                                                             │
│  3. SHORT (300ms-1s)                                                        │
│     └─ Skeleton loader / inline spinner                                     │
│                                                                             │
│  4. MEDIUM (1-3s)                                                           │
│     └─ Full skeleton with shimmer animation                                 │
│                                                                             │
│  5. LONG (3s+)                                                              │
│     └─ Progress indicator with message + cancel option                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Enhanced Skeleton Components

```tsx
// apps/web/components/ui/enhanced-skeletons.tsx

// Shimmer effect skeleton
export function ShimmerSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-md shimmer",
        className
      )}
    />
  );
}

// Content-aware skeleton that matches real layout
export function TaskCardShimmer() {
  return (
    <div className="rounded-xl border border-l-[3px] border-l-muted bg-card p-4 animate-fade-in">
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <ShimmerSkeleton className="h-5 w-5 rounded-full shrink-0" />

        <div className="flex-1 space-y-3">
          {/* Title - varies width to look natural */}
          <ShimmerSkeleton className="h-4 w-[85%]" />

          {/* Description - 2 lines */}
          <div className="space-y-1.5">
            <ShimmerSkeleton className="h-3 w-full" />
            <ShimmerSkeleton className="h-3 w-[60%]" />
          </div>

          {/* Badges */}
          <div className="flex gap-2 pt-1">
            <ShimmerSkeleton className="h-5 w-16 rounded-full" />
            <ShimmerSkeleton className="h-5 w-20 rounded-full" />
            <ShimmerSkeleton className="h-5 w-14 rounded-full" />
          </div>
        </div>

        {/* Actions */}
        <ShimmerSkeleton className="h-8 w-8 rounded-lg shrink-0" />
      </div>
    </div>
  );
}

// Staggered list skeleton
export function TaskListShimmer({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading tasks">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-fade-in"
          style={{ animationDelay: `${i * 75}ms` }}
        >
          <TaskCardShimmer />
        </div>
      ))}
      <span className="sr-only">Loading tasks, please wait...</span>
    </div>
  );
}

// Inline loading spinner for buttons
export function ButtonSpinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// Progress loading for long operations
export function ProgressLoader({
  message,
  progress,
  onCancel,
}: {
  message: string;
  progress?: number;
  onCancel?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      {/* Animated icon */}
      <div className="relative mb-4">
        <div className="h-16 w-16 rounded-full border-4 border-muted" />
        <div
          className="absolute inset-0 h-16 w-16 rounded-full border-4 border-transparent border-t-primary animate-spin"
        />
        {progress !== undefined && (
          <span className="absolute inset-0 flex items-center justify-center text-sm font-medium">
            {Math.round(progress)}%
          </span>
        )}
      </div>

      <p className="text-sm text-muted-foreground mb-4">{message}</p>

      {progress !== undefined && (
        <div className="w-48 h-2 bg-muted rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {onCancel && (
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      )}
    </div>
  );
}
```

### Loading Hook with Delay

```tsx
// apps/web/lib/hooks/use-deferred-loading.ts

/**
 * Delays showing loading state to prevent flash for fast responses
 * Shows loading only if operation takes longer than threshold
 */
export function useDeferredLoading(
  isLoading: boolean,
  delay: number = 300
): boolean {
  const [showLoading, setShowLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (isLoading) {
      timeoutRef.current = setTimeout(() => {
        setShowLoading(true);
      }, delay);
    } else {
      clearTimeout(timeoutRef.current);
      setShowLoading(false);
    }

    return () => clearTimeout(timeoutRef.current);
  }, [isLoading, delay]);

  return showLoading;
}

// Usage:
function TaskList() {
  const { data, isLoading } = useTasks();
  const showSkeleton = useDeferredLoading(isLoading, 300);

  if (showSkeleton) {
    return <TaskListShimmer />;
  }

  return <>{/* render tasks */}</>;
}
```

---

# 4. Design System Documentation

## 4.1 Design Tokens Reference

### Color System

```scss
// ============================================
// SCHOLAROS COLOR SYSTEM
// ============================================

// Core Palette
$background:           hsl(40, 20%, 99%);    // Warm off-white
$foreground:           hsl(220, 25%, 10%);   // Deep slate
$primary:              hsl(32, 80%, 45%);    // Academic amber
$primary-foreground:   hsl(40, 30%, 99%);    // Light for contrast

// Semantic Colors
$destructive:          hsl(0, 72%, 50%);     // Error red
$success:              hsl(152, 60%, 40%);   // Positive green
$warning:              hsl(38, 92%, 50%);    // Caution amber
$info:                 hsl(214, 80%, 52%);   // Informational blue

// Surface Hierarchy
$surface-1:            hsl(40, 30%, 99%);    // Highest (cards)
$surface-2:            hsl(35, 25%, 97%);    // Medium (sidebar)
$surface-3:            hsl(30, 20%, 95%);    // Lowest (inputs)

// Category Colors (Academic Context)
$category-research:    hsl(230, 65%, 55%);   // Blue
$category-teaching:    hsl(152, 55%, 42%);   // Green
$category-grants:      hsl(32, 80%, 50%);    // Amber (matches primary)
$category-mentorship:  hsl(280, 55%, 55%);   // Purple
$category-admin:       hsl(220, 12%, 50%);   // Neutral gray

// Priority Colors
$priority-p1:          hsl(0, 72%, 52%);     // Urgent - Red
$priority-p2:          hsl(25, 95%, 53%);    // High - Orange
$priority-p3:          hsl(214, 80%, 52%);   // Normal - Blue
$priority-p4:          hsl(220, 12%, 55%);   // Low - Gray
```

### Typography Scale

```scss
// ============================================
// TYPOGRAPHY SCALE
// ============================================

// Font Families
$font-sans:    'DM Sans', system-ui, sans-serif;
$font-display: 'Newsreader', Georgia, serif;      // Scholarly feel
$font-mono:    'JetBrains Mono', Menlo, monospace;

// Font Sizes (with responsive scaling)
$text-2xs:     0.65rem;                           // 10.4px - Labels
$text-xs:      0.75rem;                           // 12px - Captions
$text-sm:      0.875rem;                          // 14px - Body small
$text-base:    1rem;                              // 16px - Body
$text-lg:      1.125rem;                          // 18px - Lead
$text-xl:      1.25rem;                           // 20px - H4
$text-2xl:     1.5rem;                            // 24px - H3
$text-3xl:     clamp(1.5rem, 3vw, 1.875rem);      // H2 - Fluid
$text-4xl:     clamp(1.875rem, 4vw, 2.5rem);      // H1 - Fluid

// Line Heights
$leading-none:    1;
$leading-tight:   1.15;
$leading-snug:    1.3;
$leading-normal:  1.5;
$leading-relaxed: 1.625;
$leading-loose:   2;

// Font Weights
$font-normal:     400;
$font-medium:     500;
$font-semibold:   600;
$font-bold:       700;
```

### Spacing Scale

```scss
// ============================================
// SPACING SCALE
// ============================================

// Base unit: 0.25rem (4px)
$spacing-0:    0;
$spacing-0.5:  0.125rem;    // 2px
$spacing-1:    0.25rem;     // 4px
$spacing-1.5:  0.375rem;    // 6px
$spacing-2:    0.5rem;      // 8px
$spacing-2.5:  0.625rem;    // 10px
$spacing-3:    0.75rem;     // 12px
$spacing-3.5:  0.875rem;    // 14px
$spacing-4:    1rem;        // 16px
$spacing-4.5:  1.125rem;    // 18px (custom)
$spacing-5:    1.25rem;     // 20px
$spacing-5.5:  1.375rem;    // 22px (custom)
$spacing-6:    1.5rem;      // 24px
$spacing-8:    2rem;        // 32px
$spacing-10:   2.5rem;      // 40px
$spacing-12:   3rem;        // 48px
$spacing-16:   4rem;        // 64px
$spacing-20:   5rem;        // 80px
$spacing-24:   6rem;        // 96px

// Component-specific spacing
$card-padding:        $spacing-6;      // 24px
$card-padding-sm:     $spacing-4;      // 16px (compact cards)
$section-gap:         $spacing-8;      // 32px between sections
$element-gap:         $spacing-3;      // 12px between elements
$inline-gap:          $spacing-2;      // 8px inline spacing
```

### Border Radius

```scss
// ============================================
// BORDER RADIUS
// ============================================

$radius:      0.625rem;                          // 10px - Base
$radius-sm:   calc($radius - 4px);               // 6px
$radius-md:   calc($radius - 2px);               // 8px
$radius-lg:   $radius;                           // 10px
$radius-xl:   calc($radius + 4px);               // 14px
$radius-2xl:  calc($radius + 8px);               // 18px
$radius-full: 9999px;                            // Pill shape

// Usage Guidelines:
// - Buttons: $radius-lg (10px)
// - Cards: $radius-xl (14px)
// - Inputs: $radius-md (8px)
// - Badges: $radius-full
// - Modals: $radius-xl (14px)
// - Avatars: $radius-full
```

### Shadows

```scss
// ============================================
// SHADOW SYSTEM
// ============================================

$shadow-color: hsl(30, 20%, 10%);

$shadow-sm:   0 1px 2px 0 hsl($shadow-color / 0.04);
$shadow-md:   0 4px 6px -1px hsl($shadow-color / 0.06),
              0 2px 4px -2px hsl($shadow-color / 0.04);
$shadow-lg:   0 10px 15px -3px hsl($shadow-color / 0.08),
              0 4px 6px -4px hsl($shadow-color / 0.04);
$shadow-xl:   0 20px 25px -5px hsl($shadow-color / 0.1),
              0 8px 10px -6px hsl($shadow-color / 0.06);

// Glow effects
$glow:        0 0 20px hsl(var(--primary) / 0.25);
$glow-lg:     0 0 40px hsl(var(--primary) / 0.35);
$glow-success: 0 0 20px hsl(152, 60%, 40%, 0.3);
```

### Animations

```scss
// ============================================
// ANIMATION TOKENS
// ============================================

// Durations
$duration-instant:  0ms;
$duration-fast:     100ms;
$duration-normal:   200ms;
$duration-slow:     300ms;
$duration-slower:   500ms;

// Timing Functions
$ease-default:      cubic-bezier(0.4, 0, 0.2, 1);
$ease-in:           cubic-bezier(0.4, 0, 1, 1);
$ease-out:          cubic-bezier(0, 0, 0.2, 1);
$ease-bounce:       cubic-bezier(0.68, -0.55, 0.265, 1.55);
$ease-smooth:       cubic-bezier(0.25, 0.46, 0.45, 0.94);

// Pre-built Animations
// - animate-fade-in:     0.3s opacity 0→1
// - animate-slide-up:    0.3s translateY(10px)→0
// - animate-slide-down:  0.3s translateY(-10px)→0
// - animate-scale-in:    0.15s scale(0.96)→1
// - animate-spin:        1s linear infinite
// - animate-pulse:       2s ease-in-out infinite
// - shimmer:             1.5s linear infinite
```

## 4.2 Component Guidelines

### Button Component

```tsx
// ============================================
// BUTTON COMPONENT GUIDELINES
// ============================================

/**
 * Button Variants:
 * - default:     Primary actions (submit, confirm)
 * - secondary:   Secondary actions (cancel with action)
 * - outline:     Tertiary actions (cancel, back)
 * - ghost:       Subtle actions (icon buttons, table rows)
 * - destructive: Dangerous actions (delete, remove)
 * - link:        Navigation-style buttons
 *
 * Button Sizes:
 * - sm:      Compact UI, tables, toolbars
 * - default: Standard buttons
 * - lg:      Hero buttons, CTAs
 * - icon:    Square icon-only buttons
 */

// ✅ Correct Usage
<Button>Save Changes</Button>                    // Primary action
<Button variant="outline">Cancel</Button>        // Secondary action
<Button variant="ghost" size="icon">             // Icon button
  <Settings className="h-4 w-4" />
</Button>
<Button variant="destructive">Delete</Button>    // Dangerous action

// ❌ Incorrect Usage
<Button variant="destructive">Save</Button>      // Wrong: destructive for non-dangerous
<Button variant="default">Cancel</Button>        // Wrong: primary for cancel
<Button size="lg">×</Button>                     // Wrong: large for icon
```

### Card Component

```tsx
// ============================================
// CARD COMPONENT GUIDELINES
// ============================================

/**
 * Card Padding:
 * - Standard cards: p-6 (24px)
 * - Compact cards:  p-4 (16px) - task cards, list items
 * - Dense lists:    p-3 (12px) - dropdowns, menus
 *
 * Card Borders:
 * - Default: border border-border
 * - Accent:  border-l-[3px] border-l-{color} (task priority/category)
 * - Focus:   ring-2 ring-primary (selected state)
 *
 * Card Elevation:
 * - Static:      shadow-sm
 * - Interactive: shadow-sm hover:shadow-md
 * - Modal:       shadow-xl
 */

// Task Card Pattern
<div className="rounded-xl border border-l-[3px] border-l-blue-500 bg-card p-4">
  <div className="flex items-start gap-3">
    <Checkbox />
    <div className="flex-1 space-y-3">
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm text-muted-foreground line-clamp-2">
        {description}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {/* Badges */}
      </div>
    </div>
  </div>
</div>
```

### Badge Component

```tsx
// ============================================
// BADGE COMPONENT GUIDELINES
// ============================================

/**
 * Badge Types:
 * - Status:    Shows state (active, completed, pending)
 * - Category:  Shows classification (research, teaching)
 * - Priority:  Shows importance (p1, p2, p3, p4)
 * - Count:     Shows quantity (3 tasks, 5 members)
 * - Label:     Generic labeling
 *
 * Badge Styling:
 * - Status:    Solid background with icon
 * - Category:  Outline or muted background
 * - Priority:  Color-coded by level
 */

// Status Badges
<Badge variant="default">Active</Badge>
<Badge className="bg-green-100 text-green-700">Completed</Badge>
<Badge className="bg-amber-100 text-amber-700">In Progress</Badge>

// Category Badges (with emoji)
<Badge variant="outline">🔬 Research</Badge>
<Badge variant="outline">📚 Teaching</Badge>
<Badge variant="outline">💰 Grants</Badge>

// Priority Badges
<Badge className="bg-red-100 text-red-700">P1</Badge>
<Badge className="bg-orange-100 text-orange-700">P2</Badge>
<Badge className="bg-blue-100 text-blue-700">P3</Badge>
<Badge className="bg-gray-100 text-gray-600">P4</Badge>
```

### Form Input Patterns

```tsx
// ============================================
// FORM INPUT GUIDELINES
// ============================================

/**
 * Input Structure:
 * 1. Label (required for accessibility)
 * 2. Input field
 * 3. Helper text OR error message (not both)
 *
 * Input States:
 * - Default:  border-input
 * - Focus:    border-primary ring-1 ring-primary
 * - Error:    border-destructive
 * - Disabled: opacity-50 cursor-not-allowed
 */

// Complete Form Field Pattern
<div className="space-y-2">
  <Label htmlFor="title">Task Title</Label>
  <Input
    id="title"
    placeholder="Enter task title..."
    aria-describedby={error ? "title-error" : "title-help"}
    aria-invalid={!!error}
    className={cn(error && "border-destructive")}
  />
  {error ? (
    <p id="title-error" className="text-sm text-destructive">
      {error}
    </p>
  ) : (
    <p id="title-help" className="text-sm text-muted-foreground">
      Brief description of the task
    </p>
  )}
</div>
```

## 4.3 Layout Patterns

### Page Layout

```tsx
// ============================================
// PAGE LAYOUT PATTERN
// ============================================

/**
 * Standard Page Structure:
 * 1. PageHeader - Title, description, actions
 * 2. Content - Main page content
 * 3. Sidebar (optional) - Filters, navigation
 */

// Standard Page Layout
<div className="min-h-screen bg-background">
  {/* Sidebar - Hidden on mobile */}
  <aside className="hidden md:block fixed left-0 top-0 h-full w-64 border-r">
    <Sidebar />
  </aside>

  {/* Main Content */}
  <main className="md:ml-64">
    {/* Page Header */}
    <PageHeader
      title="Today"
      description="Your focus for today"
      icon={Calendar}
      actions={<Button>Add Task</Button>}
    />

    {/* Content Area */}
    <div className="container py-6">
      {/* Page content */}
    </div>
  </main>

  {/* Mobile Bottom Nav */}
  <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t">
    <MobileNav />
  </nav>
</div>
```

### Grid Patterns

```tsx
// ============================================
// GRID PATTERNS
// ============================================

// Stats Grid - 4 columns on large, 2 on small
<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
  <StatCard />
  <StatCard />
  <StatCard />
  <StatCard />
</div>

// Project Grid - 3 columns on XL, 2 on MD, 1 on mobile
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
  <ProjectCard />
  <ProjectCard />
  <ProjectCard />
</div>

// Task List - Single column with consistent spacing
<div className="space-y-3">
  <TaskCard />
  <TaskCard />
  <TaskCard />
</div>
```

## 4.4 Interaction Patterns

### Modal / Dialog Pattern

```tsx
// ============================================
// MODAL PATTERN
// ============================================

/**
 * When to use which:
 * - Dialog:      Forms, confirmations, complex content
 * - Sheet:       Side panels, task details, filters
 * - AlertDialog: Destructive confirmations
 * - Popover:     Quick info, tooltips with interaction
 */

// Confirmation Dialog
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Delete</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete Task?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone. This will permanently delete the task.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction className="bg-destructive">
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

// Side Panel (Sheet)
<Sheet>
  <SheetTrigger asChild>
    <Button variant="outline">View Details</Button>
  </SheetTrigger>
  <SheetContent side="right" className="w-full max-w-md">
    <SheetHeader>
      <SheetTitle>Task Details</SheetTitle>
    </SheetHeader>
    {/* Content */}
  </SheetContent>
</Sheet>
```

### Toast / Notification Pattern

```tsx
// ============================================
// TOAST PATTERN
// ============================================

/**
 * Toast Types:
 * - success:  Task completed, save successful
 * - error:    Action failed, validation error
 * - warning:  Approaching deadline, quota limit
 * - info:     New feature, tip
 *
 * Toast Timing:
 * - Success:  3s auto-dismiss
 * - Error:    5s or manual dismiss
 * - Warning:  5s or manual dismiss
 * - Info:     4s auto-dismiss
 */

// Success Toast
toast.success("Task completed!", {
  description: "Great work! Keep it up.",
  duration: 3000,
});

// Error Toast
toast.error("Failed to save", {
  description: "Please try again or contact support.",
  duration: 5000,
  action: {
    label: "Retry",
    onClick: () => retryAction(),
  },
});
```

## 4.5 Responsive Design Rules

### Breakpoint Behavior

| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| xs | 375px | Stack everything, bottom nav |
| sm | 640px | 2-column grids where appropriate |
| md | 768px | Sidebar appears, side panels |
| lg | 1024px | Full desktop layout |
| xl | 1280px | 3-column grids, expanded content |
| 2xl | 1536px | Max-width containers, more whitespace |

### Mobile-First Classes

```tsx
// ============================================
// RESPONSIVE CLASS PATTERNS
// ============================================

// Navigation
<nav className="md:hidden fixed bottom-0">     {/* Mobile only */}
<aside className="hidden md:block fixed left-0"> {/* Desktop only */}

// Grid Layouts
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3">

// Stack vs Inline
<div className="flex flex-col sm:flex-row">

// Hidden Content
<p className="hidden md:block">Desktop description</p>
<p className="md:hidden">Mobile description</p>

// Spacing Adjustments
<div className="p-4 md:p-6 lg:p-8">

// Typography
<h1 className="text-2xl md:text-3xl lg:text-4xl">
```

---

## Summary

This UX deliverables document provides:

1. **Detailed Wireframes** for onboarding, command palette, and mobile views
2. **Comprehensive Accessibility Audit** with specific issues and fixes
3. **Empty State & Loading Pattern System** with new components
4. **Complete Design System Documentation** for consistent implementation

### Implementation Priority

| Deliverable | Priority | Effort | Impact |
|-------------|----------|--------|--------|
| Onboarding Flow | P1 | 3 days | High - User activation |
| Command Palette | P1 | 3 days | High - Power user productivity |
| Mobile Responsive | P1 | 5 days | High - 40%+ user accessibility |
| Accessibility Fixes | P2 | 3 days | High - Compliance & inclusivity |
| Empty States | P2 | 2 days | Medium - User guidance |
| Design System Docs | P3 | 1 day | Medium - Dev consistency |

### Files to Create

```
scholaros/apps/web/
├── components/
│   ├── onboarding/
│   │   ├── onboarding-wizard.tsx
│   │   ├── welcome-step.tsx
│   │   ├── profile-step.tsx
│   │   ├── workspace-step.tsx
│   │   ├── first-task-step.tsx
│   │   └── completion-step.tsx
│   ├── search/
│   │   ├── command-palette.tsx
│   │   ├── search-results.tsx
│   │   └── recent-searches.tsx
│   ├── accessibility/
│   │   └── announcer.tsx (new)
│   └── ui/
│       ├── welcome-empty-state.tsx (new)
│       ├── error-empty-state.tsx (new)
│       ├── filtered-empty-state.tsx (new)
│       └── enhanced-skeletons.tsx (new)
├── lib/
│   └── hooks/
│       ├── use-onboarding.ts (new)
│       ├── use-global-search.ts (new)
│       ├── use-keyboard-navigation.ts (new)
│       └── use-deferred-loading.ts (new)
└── app/
    └── api/
        └── search/
            └── route.ts (new)
```

---

**Document maintained by:** UX Engineering Team
**Last Updated:** January 14, 2026
**Review Schedule:** After each phase completion
