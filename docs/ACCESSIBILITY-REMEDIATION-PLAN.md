# ScholarOS Accessibility Remediation Plan
## Comprehensive Plan to Achieve 100% WCAG 2.1 AA Compliance

**Document Version:** 1.0
**Created:** January 14, 2026
**Target Completion:** Phase 9B
**Current Scores → Target:**

| Category | Current | Target | Gap |
|----------|---------|--------|-----|
| Keyboard Navigation | 75% | 100% | 25% |
| Screen Reader Support | 70% | 100% | 30% |
| Color Contrast | 85% | 100% | 15% |
| Focus Management | 80% | 100% | 20% |
| ARIA Labels | 65% | 100% | 35% |

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Phase 1: Critical Fixes (ARIA Labels)](#phase-1-critical-fixes---aria-labels-35-gap)
3. [Phase 2: Screen Reader Support](#phase-2-screen-reader-support-30-gap)
4. [Phase 3: Keyboard Navigation](#phase-3-keyboard-navigation-25-gap)
5. [Phase 4: Focus Management](#phase-4-focus-management-20-gap)
6. [Phase 5: Color Contrast](#phase-5-color-contrast-15-gap)
7. [Implementation Checklist](#implementation-checklist)
8. [Testing Protocol](#testing-protocol)
9. [Success Metrics](#success-metrics)

---

## Executive Summary

### Total Issues Identified: 47

| Severity | Count | Estimated Effort |
|----------|-------|------------------|
| Critical (Blocks AT users) | 12 | 8 hours |
| High (Major usability impact) | 18 | 12 hours |
| Medium (Degraded experience) | 11 | 6 hours |
| Low (Polish/best practice) | 6 | 3 hours |

### Total Estimated Effort: 29 hours (4-5 dev days)

### Files Requiring Changes: 22

```
scholaros/apps/web/
├── components/
│   ├── tasks/
│   │   ├── task-card.tsx           (12 changes)
│   │   ├── task-detail-drawer.tsx  (8 changes)
│   │   ├── task-list.tsx           (3 changes)
│   │   ├── bulk-actions-toolbar.tsx (4 changes)
│   │   └── quick-add.tsx           (5 changes)
│   ├── projects/
│   │   ├── project-card.tsx        (4 changes)
│   │   ├── project-notes.tsx       (2 changes)
│   │   └── milestone-list.tsx      (2 changes)
│   ├── ui/
│   │   ├── dropdown-menu.tsx       (6 changes)
│   │   ├── tooltip.tsx             (4 changes)
│   │   ├── button.tsx              (2 changes)
│   │   ├── empty-state.tsx         (3 changes)
│   │   ├── pagination.tsx          (3 changes)
│   │   └── badge.tsx               (2 changes)
│   ├── layout/
│   │   └── sidebar.tsx             (3 changes)
│   └── accessibility/
│       ├── announcer.tsx           (NEW FILE)
│       └── focus-trap.tsx          (1 change - export)
├── app/
│   ├── globals.css                 (4 changes)
│   ├── layout.tsx                  (2 changes)
│   ├── (auth)/
│   │   ├── login/page.tsx          (3 changes)
│   │   └── signup/page.tsx         (3 changes)
│   └── (dashboard)/
│       └── board/page.tsx          (4 changes)
└── lib/
    └── hooks/
        └── use-keyboard-navigation.ts (NEW FILE)
```

---

## Phase 1: Critical Fixes - ARIA Labels (35% Gap)

**Priority:** CRITICAL
**Effort:** 8 hours
**Impact:** Enables screen reader users to understand interface

### Issue 1.1: Icon-Only Buttons Missing Labels

**Severity:** Critical
**Files Affected:** 6 files, 15+ instances

#### Fix 1.1.1: Project Card Action Buttons
**File:** `components/projects/project-card.tsx`
**Lines:** 58-73

```typescript
// ❌ BEFORE (Line 58-65)
<button
  onClick={() => onEdit(project)}
  className="rounded p-1 hover:bg-muted"
  title="Edit project"
>
  <Edit className="h-4 w-4 text-muted-foreground" />
</button>

// ✅ AFTER
<button
  onClick={() => onEdit(project)}
  className="rounded p-1 hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
  aria-label={`Edit project: ${project.title}`}
>
  <Edit className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
</button>
```

```typescript
// ❌ BEFORE (Line 67-73) - Delete button
<button
  onClick={() => onDelete(project.id)}
  className="rounded p-1 hover:bg-muted"
  title="Delete project"
>
  <Trash2 className="h-4 w-4 text-muted-foreground" />
</button>

// ✅ AFTER
<button
  onClick={() => onDelete(project.id)}
  className="rounded p-1 hover:bg-muted hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
  aria-label={`Delete project: ${project.title}`}
>
  <Trash2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
</button>
```

#### Fix 1.1.2: Task Card Priority Badge (Compact Mode)
**File:** `components/tasks/task-card.tsx`
**Lines:** 354-368

```typescript
// ❌ BEFORE
<span
  className={cn(
    "inline-flex items-center gap-1 text-xs font-medium",
    priorityStyle.icon
  )}
  title={`Priority ${task.priority.toUpperCase()}`}
>
  <Flag className="h-3 w-3" />
  {!isCompact && (
    <span className="uppercase text-[10px]">{task.priority}</span>
  )}
</span>

// ✅ AFTER
<span
  className={cn(
    "inline-flex items-center gap-1 text-xs font-medium",
    priorityStyle.icon
  )}
  role="img"
  aria-label={`Priority: ${task.priority.toUpperCase()} - ${getPriorityDescription(task.priority)}`}
>
  <Flag className="h-3 w-3" aria-hidden="true" />
  {!isCompact && (
    <span className="uppercase text-[10px]" aria-hidden="true">{task.priority}</span>
  )}
</span>

// Add helper function
function getPriorityDescription(priority: TaskPriority): string {
  const descriptions = {
    p1: 'Urgent',
    p2: 'High',
    p3: 'Normal',
    p4: 'Low'
  };
  return descriptions[priority] || 'Unknown';
}
```

#### Fix 1.1.3: Empty State Decorative Icons
**File:** `components/ui/empty-state.tsx`
**Lines:** 83-90

```typescript
// ❌ BEFORE
<div
  className={cn(
    "flex h-14 w-14 items-center justify-center rounded-2xl mb-4 shadow-sm",
    styles.iconBg
  )}
>
  <Icon className={cn("h-6 w-6", styles.iconColor)} />
</div>

// ✅ AFTER
<div
  className={cn(
    "flex h-14 w-14 items-center justify-center rounded-2xl mb-4 shadow-sm",
    styles.iconBg
  )}
  aria-hidden="true"
>
  <Icon className={cn("h-6 w-6", styles.iconColor)} />
</div>
```

### Issue 1.2: Form Inputs Missing Labels

**Severity:** Critical
**Files Affected:** 4 files

#### Fix 1.2.1: Quick Add Input
**File:** `components/tasks/quick-add.tsx`
**Lines:** 130+

```typescript
// ❌ BEFORE
<input
  ref={inputRef}
  type="text"
  value={value}
  onChange={(e) => setValue(e.target.value)}
  placeholder={PLACEHOLDERS.quickAdd}
  className={cn(...)}
/>

// ✅ AFTER
<>
  <label htmlFor="quick-add-input" className="sr-only">
    Add a new task using natural language
  </label>
  <input
    id="quick-add-input"
    ref={inputRef}
    type="text"
    value={value}
    onChange={(e) => setValue(e.target.value)}
    placeholder={PLACEHOLDERS.quickAdd}
    aria-describedby="quick-add-help"
    className={cn(...)}
  />
  <span id="quick-add-help" className="sr-only">
    Type a task with optional due date, priority, and category.
    Example: Review paper friday #research p1
  </span>
</>
```

#### Fix 1.2.2: Task Detail Form Fields
**File:** `components/tasks/task-detail-drawer.tsx`
**Lines:** 160-250

```typescript
// ✅ Pattern to apply to ALL form fields in drawer

// Title field
<div className="space-y-2">
  <label htmlFor="task-title" className="text-sm font-medium">
    Title
  </label>
  <Input
    id="task-title"
    value={title}
    onChange={(e) => setTitle(e.target.value)}
    aria-required="true"
  />
</div>

// Description field
<div className="space-y-2">
  <label htmlFor="task-description" className="text-sm font-medium">
    Description
  </label>
  <Textarea
    id="task-description"
    value={description}
    onChange={(e) => setDescription(e.target.value)}
    aria-describedby="description-hint"
  />
  <span id="description-hint" className="text-xs text-muted-foreground">
    Optional details about this task
  </span>
</div>

// Select fields (category, priority, status)
<div className="space-y-2">
  <label id="category-label" className="text-sm font-medium">
    Category
  </label>
  <Select
    value={category}
    onValueChange={setCategory}
    aria-labelledby="category-label"
  >
    {/* options */}
  </Select>
</div>
```

### Issue 1.3: Tooltip Missing Role

**Severity:** High
**File:** `components/ui/tooltip.tsx`
**Lines:** 90-102

```typescript
// ❌ BEFORE
<div
  ref={ref}
  className={cn(
    "absolute z-50 overflow-hidden rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground shadow-md",
    sideClasses[side],
    className
  )}
  {...props}
>
  {children}
</div>

// ✅ AFTER
<div
  ref={ref}
  role="tooltip"
  id={tooltipId}
  className={cn(
    "absolute z-50 overflow-hidden rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground shadow-md",
    sideClasses[side],
    className
  )}
  {...props}
>
  {children}
</div>

// Also update TooltipTrigger to add aria-describedby:
<TooltipTrigger aria-describedby={open ? tooltipId : undefined}>
  {children}
</TooltipTrigger>
```

### Issue 1.4: Sidebar Toggle Buttons

**Severity:** Medium
**File:** `components/layout/sidebar.tsx`
**Lines:** 120-126

```typescript
// ❌ BEFORE
<button
  onClick={() => toggleSection(section.id)}
  className="..."
>
  <ChevronDown className={cn("h-4 w-4", isExpanded && "rotate-180")} />
</button>

// ✅ AFTER
<button
  onClick={() => toggleSection(section.id)}
  className="..."
  aria-expanded={isExpanded}
  aria-controls={`section-${section.id}`}
  aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${section.label} section`}
>
  <ChevronDown
    className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")}
    aria-hidden="true"
  />
</button>

// Section content needs id:
<div id={`section-${section.id}`} role="region" aria-labelledby={`section-${section.id}-heading`}>
  {/* section content */}
</div>
```

---

## Phase 2: Screen Reader Support (30% Gap)

**Priority:** Critical
**Effort:** 10 hours
**Impact:** Enables dynamic content announcements

### Issue 2.1: Create Global Announcer Component

**Severity:** Critical
**Action:** Create new file

**File:** `components/accessibility/announcer.tsx` (NEW)

```typescript
"use client";

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

interface Announcement {
  message: string;
  priority: 'polite' | 'assertive';
  id: string;
}

interface AnnouncerContextType {
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  announcePolite: (message: string) => void;
  announceAssertive: (message: string) => void;
}

const AnnouncerContext = createContext<AnnouncerContextType | null>(null);

export function AnnouncerProvider({ children }: { children: React.ReactNode }) {
  const [politeAnnouncement, setPoliteAnnouncement] = useState('');
  const [assertiveAnnouncement, setAssertiveAnnouncement] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout>();

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (priority === 'assertive') {
      // Clear then set to force re-announcement
      setAssertiveAnnouncement('');
      requestAnimationFrame(() => {
        setAssertiveAnnouncement(message);
      });
    } else {
      setPoliteAnnouncement('');
      requestAnimationFrame(() => {
        setPoliteAnnouncement(message);
      });
    }

    // Clear announcement after it's been read
    timeoutRef.current = setTimeout(() => {
      setPoliteAnnouncement('');
      setAssertiveAnnouncement('');
    }, 1000);
  }, []);

  const announcePolite = useCallback((message: string) => announce(message, 'polite'), [announce]);
  const announceAssertive = useCallback((message: string) => announce(message, 'assertive'), [announce]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <AnnouncerContext.Provider value={{ announce, announcePolite, announceAssertive }}>
      {children}

      {/* Polite announcements - for non-urgent updates */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeAnnouncement}
      </div>

      {/* Assertive announcements - for urgent/error messages */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveAnnouncement}
      </div>
    </AnnouncerContext.Provider>
  );
}

export function useAnnounce() {
  const context = useContext(AnnouncerContext);
  if (!context) {
    throw new Error('useAnnounce must be used within an AnnouncerProvider');
  }
  return context;
}

// Convenience hook for common announcements
export function useTaskAnnouncements() {
  const { announcePolite, announceAssertive } = useAnnounce();

  return {
    announceTaskCompleted: (title: string) =>
      announcePolite(`Task completed: ${title}`),
    announceTaskCreated: (title: string) =>
      announcePolite(`Task created: ${title}`),
    announceTaskDeleted: (title: string) =>
      announcePolite(`Task deleted: ${title}`),
    announceTaskUpdated: (title: string) =>
      announcePolite(`Task updated: ${title}`),
    announceBulkAction: (action: string, count: number) =>
      announcePolite(`${action} ${count} task${count !== 1 ? 's' : ''}`),
    announceError: (message: string) =>
      announceAssertive(`Error: ${message}`),
    announceSelectionChanged: (count: number) =>
      announcePolite(`${count} task${count !== 1 ? 's' : ''} selected`),
  };
}
```

### Issue 2.2: Add Announcer to Root Layout

**File:** `app/layout.tsx`

```typescript
// ✅ Add to root layout
import { AnnouncerProvider } from '@/components/accessibility/announcer';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AnnouncerProvider>
          {/* existing providers */}
          {children}
        </AnnouncerProvider>
      </body>
    </html>
  );
}
```

### Issue 2.3: Announce Task Completion

**File:** `components/tasks/task-card.tsx`
**Lines:** 125-131

```typescript
// ❌ BEFORE
const handleToggleComplete = useCallback((taskToComplete: TaskFromAPI) => {
  if (taskToComplete.status !== "done") {
    setJustCompleted(true);
    setTimeout(() => setJustCompleted(false), 600);
  }
  onToggleComplete?.(taskToComplete);
}, [onToggleComplete]);

// ✅ AFTER
import { useTaskAnnouncements } from '@/components/accessibility/announcer';

// Inside component:
const { announceTaskCompleted } = useTaskAnnouncements();

const handleToggleComplete = useCallback((taskToComplete: TaskFromAPI) => {
  const isCompleting = taskToComplete.status !== "done";

  if (isCompleting) {
    setJustCompleted(true);
    setTimeout(() => setJustCompleted(false), 600);
    announceTaskCompleted(taskToComplete.title);
  }

  onToggleComplete?.(taskToComplete);
}, [onToggleComplete, announceTaskCompleted]);
```

### Issue 2.4: Announce Bulk Actions

**File:** `components/tasks/bulk-actions-toolbar.tsx`
**Lines:** 175-200

```typescript
// ✅ Add announcements for bulk operations

import { useTaskAnnouncements } from '@/components/accessibility/announcer';

// Inside component:
const { announceBulkAction, announceSelectionChanged } = useTaskAnnouncements();

// When selection changes:
useEffect(() => {
  announceSelectionChanged(selectedTaskIds.length);
}, [selectedTaskIds.length, announceSelectionChanged]);

// After bulk complete:
const handleBulkComplete = async () => {
  await bulkComplete(selectedTaskIds);
  announceBulkAction('Completed', selectedTaskIds.length);
};

// After bulk delete:
const handleBulkDelete = async () => {
  const count = selectedTaskIds.length;
  await bulkDelete(selectedTaskIds);
  announceBulkAction('Deleted', count);
};
```

### Issue 2.5: Announce Quick Add Success

**File:** `components/tasks/quick-add.tsx`
**Lines:** 62-120

```typescript
// ✅ Add success announcement

import { useTaskAnnouncements } from '@/components/accessibility/announcer';

// Inside component:
const { announceTaskCreated, announceError } = useTaskAnnouncements();

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!value.trim() || createTask.isPending) return;

  const parsed = parseQuickAdd(value);

  try {
    await createTask.mutateAsync({
      title: parsed.title,
      // ... other fields
    });

    announceTaskCreated(parsed.title);
    setValue('');
  } catch (error) {
    announceError('Failed to create task. Please try again.');
  }
};
```

### Issue 2.6: Announce Pagination Changes

**File:** `components/ui/pagination.tsx`
**Lines:** 52-59

```typescript
// ✅ Add page change announcements

import { useAnnounce } from '@/components/accessibility/announcer';

// Inside component:
const { announcePolite } = useAnnounce();

const handlePageChange = (newPage: number) => {
  setPage(newPage);
  announcePolite(`Page ${newPage} of ${totalPages}`);
};

// Add to the pagination wrapper:
<nav
  className={cn(...)}
  role="navigation"
  aria-label={`Pagination, page ${page} of ${totalPages}`}
>
```

### Issue 2.7: Add Proper Heading Hierarchy

**Action:** Audit all page components and ensure proper heading structure

**Pattern to apply to all pages:**

```typescript
// ✅ Every page should have this structure:

// app/(dashboard)/today/page.tsx
export default function TodayPage() {
  return (
    <main id="main-content">
      <h1 className="sr-only">Today's Tasks</h1>

      <PageHeader
        title="Today"  // Visual title (can be h2 or aria-hidden + decorative)
        description="Your focus for today"
      />

      <section aria-labelledby="tasks-heading">
        <h2 id="tasks-heading" className="sr-only">Task List</h2>
        <TaskList />
      </section>
    </main>
  );
}
```

**Files to update:**
- `app/(dashboard)/today/page.tsx`
- `app/(dashboard)/upcoming/page.tsx`
- `app/(dashboard)/board/page.tsx`
- `app/(dashboard)/list/page.tsx`
- `app/(dashboard)/projects/page.tsx`
- `app/(dashboard)/grants/page.tsx`
- `app/(dashboard)/calendar/page.tsx`

---

## Phase 3: Keyboard Navigation (25% Gap)

**Priority:** High
**Effort:** 6 hours
**Impact:** Enables keyboard-only users to navigate efficiently

### Issue 3.1: Create Keyboard Navigation Hook

**File:** `lib/hooks/use-keyboard-navigation.ts` (NEW)

```typescript
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseKeyboardNavigationOptions<T> {
  items: T[];
  onSelect?: (item: T, index: number) => void;
  onEscape?: () => void;
  orientation?: 'vertical' | 'horizontal' | 'grid';
  columnsInGrid?: number;
  wrap?: boolean;
  enableTypeahead?: boolean;
  getItemLabel?: (item: T) => string;
  enabled?: boolean;
}

interface UseKeyboardNavigationReturn {
  focusedIndex: number;
  setFocusedIndex: (index: number) => void;
  getItemProps: (index: number) => {
    tabIndex: number;
    'aria-selected': boolean;
    onKeyDown: (e: React.KeyboardEvent) => void;
    ref: (el: HTMLElement | null) => void;
  };
  containerProps: {
    role: string;
    'aria-activedescendant': string | undefined;
    onKeyDown: (e: React.KeyboardEvent) => void;
  };
}

export function useKeyboardNavigation<T>({
  items,
  onSelect,
  onEscape,
  orientation = 'vertical',
  columnsInGrid = 1,
  wrap = true,
  enableTypeahead = false,
  getItemLabel,
  enabled = true,
}: UseKeyboardNavigationOptions<T>): UseKeyboardNavigationReturn {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [typeaheadQuery, setTypeaheadQuery] = useState('');
  const typeaheadTimeoutRef = useRef<NodeJS.Timeout>();
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  // Reset focused index when items change
  useEffect(() => {
    if (focusedIndex >= items.length) {
      setFocusedIndex(Math.max(0, items.length - 1));
    }
  }, [items.length, focusedIndex]);

  // Clear typeahead after delay
  useEffect(() => {
    if (typeaheadQuery) {
      typeaheadTimeoutRef.current = setTimeout(() => {
        setTypeaheadQuery('');
      }, 500);
    }
    return () => {
      if (typeaheadTimeoutRef.current) {
        clearTimeout(typeaheadTimeoutRef.current);
      }
    };
  }, [typeaheadQuery]);

  const moveFocus = useCallback((direction: 'up' | 'down' | 'left' | 'right' | 'home' | 'end') => {
    setFocusedIndex(current => {
      let next = current;
      const total = items.length;

      switch (direction) {
        case 'up':
          if (orientation === 'grid') {
            next = current - columnsInGrid;
          } else if (orientation === 'vertical') {
            next = current - 1;
          }
          break;
        case 'down':
          if (orientation === 'grid') {
            next = current + columnsInGrid;
          } else if (orientation === 'vertical') {
            next = current + 1;
          }
          break;
        case 'left':
          if (orientation === 'horizontal' || orientation === 'grid') {
            next = current - 1;
          }
          break;
        case 'right':
          if (orientation === 'horizontal' || orientation === 'grid') {
            next = current + 1;
          }
          break;
        case 'home':
          next = 0;
          break;
        case 'end':
          next = total - 1;
          break;
      }

      // Handle wrapping
      if (wrap) {
        if (next < 0) next = total - 1;
        if (next >= total) next = 0;
      } else {
        next = Math.max(0, Math.min(total - 1, next));
      }

      return next;
    });
  }, [items.length, orientation, columnsInGrid, wrap]);

  const handleTypeahead = useCallback((char: string) => {
    if (!enableTypeahead || !getItemLabel) return;

    const query = typeaheadQuery + char.toLowerCase();
    setTypeaheadQuery(query);

    const matchIndex = items.findIndex((item, index) => {
      const label = getItemLabel(item).toLowerCase();
      return label.startsWith(query) && index !== focusedIndex;
    });

    if (matchIndex !== -1) {
      setFocusedIndex(matchIndex);
    }
  }, [enableTypeahead, getItemLabel, typeaheadQuery, items, focusedIndex]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!enabled) return;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        moveFocus('up');
        break;
      case 'ArrowDown':
        e.preventDefault();
        moveFocus('down');
        break;
      case 'ArrowLeft':
        e.preventDefault();
        moveFocus('left');
        break;
      case 'ArrowRight':
        e.preventDefault();
        moveFocus('right');
        break;
      case 'Home':
        e.preventDefault();
        moveFocus('home');
        break;
      case 'End':
        e.preventDefault();
        moveFocus('end');
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (items[focusedIndex]) {
          onSelect?.(items[focusedIndex], focusedIndex);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onEscape?.();
        break;
      default:
        // Typeahead for single printable characters
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          handleTypeahead(e.key);
        }
    }
  }, [enabled, moveFocus, items, focusedIndex, onSelect, onEscape, handleTypeahead]);

  // Focus the element when focusedIndex changes
  useEffect(() => {
    if (enabled && itemRefs.current[focusedIndex]) {
      itemRefs.current[focusedIndex]?.focus();
    }
  }, [focusedIndex, enabled]);

  const getItemProps = useCallback((index: number) => ({
    tabIndex: index === focusedIndex ? 0 : -1,
    'aria-selected': index === focusedIndex,
    onKeyDown: handleKeyDown,
    ref: (el: HTMLElement | null) => {
      itemRefs.current[index] = el;
    },
  }), [focusedIndex, handleKeyDown]);

  const containerProps = {
    role: 'listbox' as const,
    'aria-activedescendant': items[focusedIndex] ? `item-${focusedIndex}` : undefined,
    onKeyDown: handleKeyDown,
  };

  return {
    focusedIndex,
    setFocusedIndex,
    getItemProps,
    containerProps,
  };
}

// Specialized hook for task lists
export function useTaskListNavigation(tasks: any[], onSelectTask: (task: any) => void) {
  return useKeyboardNavigation({
    items: tasks,
    onSelect: onSelectTask,
    orientation: 'vertical',
    wrap: false,
    enableTypeahead: true,
    getItemLabel: (task) => task.title,
  });
}
```

### Issue 3.2: Apply Keyboard Navigation to Task List

**File:** `components/tasks/task-list.tsx`

```typescript
// ✅ Add keyboard navigation

import { useTaskListNavigation } from '@/lib/hooks/use-keyboard-navigation';

export function TaskList({ tasks, onSelectTask, ...props }) {
  const { focusedIndex, getItemProps, containerProps } = useTaskListNavigation(
    tasks,
    onSelectTask
  );

  return (
    <div
      {...containerProps}
      className="space-y-2"
      aria-label="Task list"
    >
      {tasks.map((task, index) => (
        <TaskCard
          key={task.id}
          task={task}
          {...getItemProps(index)}
          id={`task-${task.id}`}
          className={cn(
            index === focusedIndex && "ring-2 ring-primary ring-offset-2"
          )}
        />
      ))}
    </div>
  );
}
```

### Issue 3.3: Add Keyboard Support to Dropdown Menu

**File:** `components/ui/dropdown-menu.tsx`
**Lines:** 72-117

```typescript
// ✅ Enhanced dropdown with keyboard support

const DropdownMenuContent = React.forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  ({ className, align = "center", children, ...props }, ref) => {
    const context = React.useContext(DropdownMenuContext);
    const [focusedIndex, setFocusedIndex] = useState(0);
    const itemsRef = useRef<HTMLButtonElement[]>([]);

    // Get all menu items
    const items = React.Children.toArray(children).filter(
      (child) => React.isValidElement(child) && child.type === DropdownMenuItem
    );

    const handleKeyDown = (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((i) => (i + 1) % items.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((i) => (i - 1 + items.length) % items.length);
          break;
        case 'Home':
          e.preventDefault();
          setFocusedIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setFocusedIndex(items.length - 1);
          break;
        case 'Escape':
          e.preventDefault();
          context?.setOpen(false);
          break;
        case 'Tab':
          // Close menu on tab
          context?.setOpen(false);
          break;
      }
    };

    // Focus item when index changes
    useEffect(() => {
      itemsRef.current[focusedIndex]?.focus();
    }, [focusedIndex]);

    // Focus first item on open
    useEffect(() => {
      if (context?.open) {
        setFocusedIndex(0);
        requestAnimationFrame(() => {
          itemsRef.current[0]?.focus();
        });
      }
    }, [context?.open]);

    if (!context?.open) return null;

    return (
      <FocusTrap active={context.open}>
        <div
          ref={ref}
          role="menu"
          aria-orientation="vertical"
          onKeyDown={handleKeyDown}
          className={cn(
            "absolute z-50 min-w-[8rem] overflow-hidden rounded-xl border bg-popover p-1 shadow-lg",
            alignClasses[align],
            className
          )}
          {...props}
        >
          {React.Children.map(children, (child, index) => {
            if (React.isValidElement(child) && child.type === DropdownMenuItem) {
              return React.cloneElement(child, {
                ref: (el: HTMLButtonElement) => (itemsRef.current[index] = el),
                tabIndex: index === focusedIndex ? 0 : -1,
                role: 'menuitem',
              });
            }
            return child;
          })}
        </div>
      </FocusTrap>
    );
  }
);
```

### Issue 3.4: Kanban Board Keyboard Instructions

**File:** `app/(dashboard)/board/page.tsx`
**Lines:** 39-67

```typescript
// ✅ Add keyboard instructions to column headers

{columns.map((column) => (
  <div
    key={column.id}
    className="flex-1 min-w-[300px]"
  >
    <div className="flex items-center gap-2 mb-4 px-1">
      <column.icon className={cn("h-4 w-4", column.color)} />
      <h2 className="font-semibold text-sm">{column.label}</h2>
      <Badge variant="secondary" className="ml-auto">
        {getTaskCountByStatus(column.id)}
      </Badge>
    </div>

    {/* Add visually hidden instructions */}
    <p className="sr-only">
      Use arrow keys to navigate tasks. Press Space or Enter to select.
      Press and hold Space, then use arrow keys to move task to another column.
    </p>

    <SortableContext
      items={getTasksByStatus(column.id).map(t => t.id)}
      strategy={verticalListSortingStrategy}
    >
      <DroppableColumn
        id={column.id}
        aria-label={`${column.label} column, ${getTaskCountByStatus(column.id)} tasks`}
      >
        {/* tasks */}
      </DroppableColumn>
    </SortableContext>
  </div>
))}
```

---

## Phase 4: Focus Management (20% Gap)

**Priority:** High
**Effort:** 5 hours
**Impact:** Ensures predictable focus behavior

### Issue 4.1: Replace Browser confirm() with AlertDialog

**Severity:** Critical
**Files Affected:** 4 files

#### Fix 4.1.1: Task Detail Drawer Delete
**File:** `components/tasks/task-detail-drawer.tsx`
**Line:** 94

```typescript
// ❌ BEFORE
if (confirm("Are you sure you want to delete this task?")) {
  await deleteTask.mutateAsync(selectedTaskId);
  closeTaskDetail();
}

// ✅ AFTER
// 1. Add state for delete confirmation
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

// 2. Replace confirm() call:
const handleDeleteClick = () => {
  setShowDeleteConfirm(true);
};

const handleConfirmDelete = async () => {
  await deleteTask.mutateAsync(selectedTaskId);
  setShowDeleteConfirm(false);
  closeTaskDetail();
};

// 3. Add AlertDialog in render:
<AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete Task?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone. This will permanently delete "{task?.title}".
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction
        onClick={handleConfirmDelete}
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**Apply same pattern to:**
- `components/tasks/task-list.tsx` (Line 177)
- `components/projects/project-notes.tsx`
- `components/projects/milestone-list.tsx`

### Issue 4.2: Add Focus Trap to Task Detail Drawer

**File:** `components/tasks/task-detail-drawer.tsx`
**Lines:** 120-180

```typescript
// ✅ Wrap drawer content in FocusTrap

import { FocusTrap } from '@/components/accessibility/focus-trap';

// Inside render:
{isDetailOpen && selectedTask && (
  <>
    {/* Backdrop */}
    <div
      className="fixed inset-0 z-40 bg-black/50"
      onClick={closeTaskDetail}
      aria-hidden="true"
    />

    {/* Drawer with focus trap */}
    <FocusTrap
      active={isDetailOpen}
      onEscape={closeTaskDetail}
      returnFocusOnDeactivate
    >
      <aside
        className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l bg-background shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <h2 id="drawer-title" className="sr-only">
          Task Details: {selectedTask.title}
        </h2>
        {/* drawer content */}
      </aside>
    </FocusTrap>
  </>
)}
```

### Issue 4.3: Focus Management After Delete

**File:** `components/tasks/task-list.tsx`

```typescript
// ✅ Move focus to next task after deletion

const taskRefs = useRef<Map<string, HTMLElement>>(new Map());

const handleDeleteTask = async (taskId: string) => {
  const taskIndex = tasks.findIndex(t => t.id === taskId);

  // Find next focus target BEFORE deletion
  const nextTask = tasks[taskIndex + 1] || tasks[taskIndex - 1];
  const nextFocusTarget = nextTask
    ? taskRefs.current.get(nextTask.id)
    : addTaskButtonRef.current;

  await deleteTask.mutateAsync(taskId);

  // Move focus after DOM update
  requestAnimationFrame(() => {
    nextFocusTarget?.focus();
  });
};

// In render, attach refs:
{tasks.map((task) => (
  <TaskCard
    key={task.id}
    task={task}
    ref={(el) => {
      if (el) taskRefs.current.set(task.id, el);
      else taskRefs.current.delete(task.id);
    }}
  />
))}
```

### Issue 4.4: Ensure Skip Link Is Rendered

**File:** `app/layout.tsx`

```typescript
// ✅ Add skip link at root level

import { SkipLink } from '@/components/accessibility/skip-link';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SkipLink href="#main-content">
          Skip to main content
        </SkipLink>

        {/* Existing layout */}
        {children}
      </body>
    </html>
  );
}
```

**Also ensure main content has matching ID:**
```typescript
// In each page or dashboard layout:
<main id="main-content" tabIndex={-1}>
  {/* page content */}
</main>
```

---

## Phase 5: Color Contrast (15% Gap)

**Priority:** Medium
**Effort:** 3 hours
**Impact:** Ensures text is readable for users with low vision

### Issue 5.1: Fix P4 Priority Badge Contrast

**File:** `components/tasks/task-card.tsx`
**Lines:** 354-382

```typescript
// ❌ BEFORE
p4: {
  text: "text-muted-foreground",
  border: "border-l-border",
  bg: "",
  icon: "text-muted-foreground",
},

// ✅ AFTER - Darken P4 text for better contrast
p4: {
  text: "text-slate-600 dark:text-slate-400",  // Higher contrast
  border: "border-l-slate-300 dark:border-l-slate-600",
  bg: "bg-slate-50 dark:bg-slate-900/20",
  icon: "text-slate-500 dark:text-slate-400",
},
```

### Issue 5.2: Fix "misc" Category Badge Contrast

**File:** `components/tasks/task-card.tsx`
**Lines:** 56-95

```typescript
// ❌ BEFORE
misc: {
  bg: "bg-muted",
  text: "text-muted-foreground",
  border: "border-border",
},

// ✅ AFTER
misc: {
  bg: "bg-slate-100 dark:bg-slate-800",
  text: "text-slate-700 dark:text-slate-300",  // Higher contrast
  border: "border-slate-200 dark:border-slate-700",
},
```

### Issue 5.3: Fix Disabled Button Contrast

**File:** `components/ui/button.tsx`
**Line:** 8

```typescript
// ❌ BEFORE
"disabled:pointer-events-none disabled:opacity-50"

// ✅ AFTER - Increase opacity for better contrast
"disabled:pointer-events-none disabled:opacity-60 disabled:cursor-not-allowed"
```

**Apply to all UI components with disabled states:**
- `components/ui/button.tsx`
- `components/ui/tabs.tsx`
- `components/ui/pagination.tsx`
- `components/ui/dropdown-menu.tsx`

### Issue 5.4: Fix Placeholder Text Contrast

**File:** `app/globals.css`

```css
/* ❌ BEFORE */
placeholder:text-muted-foreground

/* ✅ AFTER - Slightly darker placeholder for better contrast */
@layer base {
  input::placeholder,
  textarea::placeholder {
    color: hsl(var(--muted-foreground) / 0.8);
    /* Or use a darker shade: */
    /* color: hsl(220, 15%, 45%); */
  }
}
```

### Issue 5.5: Update CSS Variables for Better Contrast

**File:** `app/globals.css`

```css
:root {
  /* ✅ Update muted-foreground for better contrast */
  --muted-foreground: 220 15% 38%;  /* Was potentially lighter */
}

.dark {
  /* ✅ Ensure dark mode muted text is readable */
  --muted-foreground: 35 12% 63%;  /* Lighter in dark mode */
}
```

---

## Implementation Checklist

### Pre-Implementation Setup

- [ ] Create feature branch: `git checkout -b feat/accessibility-remediation`
- [ ] Install testing tools: axe-core, WAVE extension
- [ ] Set up screen reader for testing (VoiceOver/NVDA)

### Phase 1: ARIA Labels (Day 1)

- [ ] 1.1.1 Fix project card icon buttons
- [ ] 1.1.2 Fix task card priority badge
- [ ] 1.1.3 Fix empty state icons
- [ ] 1.2.1 Fix quick add input
- [ ] 1.2.2 Fix task detail form fields
- [ ] 1.3 Fix tooltip role
- [ ] 1.4 Fix sidebar toggle buttons
- [ ] Run axe-core scan - verify 0 ARIA violations

### Phase 2: Screen Reader (Day 2)

- [ ] 2.1 Create announcer.tsx component
- [ ] 2.2 Add AnnouncerProvider to layout
- [ ] 2.3 Add task completion announcements
- [ ] 2.4 Add bulk action announcements
- [ ] 2.5 Add quick add success announcements
- [ ] 2.6 Add pagination change announcements
- [ ] 2.7 Audit and fix heading hierarchy (all pages)
- [ ] Test with VoiceOver - verify all dynamic updates announced

### Phase 3: Keyboard Navigation (Day 3)

- [ ] 3.1 Create useKeyboardNavigation hook
- [ ] 3.2 Apply to task list
- [ ] 3.3 Fix dropdown menu keyboard support
- [ ] 3.4 Add kanban keyboard instructions
- [ ] Test keyboard-only navigation through entire app

### Phase 4: Focus Management (Day 4)

- [ ] 4.1.1 Replace confirm() in task-detail-drawer
- [ ] 4.1.2 Replace confirm() in task-list
- [ ] 4.1.3 Replace confirm() in project-notes
- [ ] 4.1.4 Replace confirm() in milestone-list
- [ ] 4.2 Add FocusTrap to task detail drawer
- [ ] 4.3 Implement focus after delete
- [ ] 4.4 Verify skip link is rendered and functional
- [ ] Test focus management in all modals

### Phase 5: Color Contrast (Day 5)

- [ ] 5.1 Fix P4 priority badge contrast
- [ ] 5.2 Fix misc category badge contrast
- [ ] 5.3 Fix disabled button contrast (all files)
- [ ] 5.4 Fix placeholder text contrast
- [ ] 5.5 Update CSS variables
- [ ] Run WebAIM contrast checker - verify all pass AA

### Post-Implementation

- [ ] Run full Lighthouse accessibility audit
- [ ] Run axe-core full scan
- [ ] Complete screen reader testing checklist
- [ ] Complete keyboard navigation testing checklist
- [ ] Create PR with accessibility improvements
- [ ] Update documentation

---

## Testing Protocol

### Automated Testing

```bash
# Run axe-core accessibility audit
npm run test:a11y

# Run Lighthouse CI
npm run lighthouse
```

### Manual Testing Checklist

#### Screen Reader Testing (VoiceOver/NVDA)

| Test Case | Expected | Pass? |
|-----------|----------|-------|
| Navigate to Today page | Page title announced | |
| Tab to first task | Task title and status announced | |
| Complete a task | "Task completed: [title]" announced | |
| Open task detail drawer | Focus moves to drawer, title announced | |
| Close drawer with Escape | Focus returns to trigger, "dialog closed" | |
| Use quick add | Success/error announced | |
| Navigate with arrow keys | Current item announced | |
| Use bulk select | Selection count announced | |
| Change pagination | New page announced | |

#### Keyboard Navigation Testing

| Test Case | Keys | Expected | Pass? |
|-----------|------|----------|-------|
| Skip to main content | Tab | Skip link visible and functional | |
| Navigate task list | ↑↓ | Focus moves between tasks | |
| Select task | Enter | Task detail opens | |
| Close modal | Escape | Modal closes, focus returns | |
| Navigate dropdown | ↑↓ | Items cycle through | |
| Navigate kanban | ↑↓←→ | Navigate tasks and columns | |
| Move task (kanban) | Space+↑↓ | Task moves between columns | |

#### Color Contrast Testing

| Element | Foreground | Background | Required | Pass? |
|---------|-----------|------------|----------|-------|
| Body text | --foreground | --background | 4.5:1 | |
| Muted text | --muted-foreground | --background | 4.5:1 | |
| P1 badge | red-700 | red-100 | 4.5:1 | |
| P4 badge | slate-600 | slate-50 | 4.5:1 | |
| Disabled button | varies | varies | 3:1 | |
| Placeholder | varies | --input | 3:1 | |

---

## Success Metrics

### Target Scores

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Keyboard Navigation | 75% | 100% | Manual testing checklist |
| Screen Reader Support | 70% | 100% | VoiceOver testing checklist |
| Color Contrast | 85% | 100% | WebAIM contrast checker |
| Focus Management | 80% | 100% | Manual testing checklist |
| ARIA Labels | 65% | 100% | axe-core scan |
| Lighthouse A11y Score | ~85 | 95+ | Lighthouse CI |
| axe Violations | ~20 | 0 | axe-core scan |

### Definition of Done

All the following must be true:

1. **axe-core scan returns 0 violations** (critical, serious, moderate)
2. **Lighthouse accessibility score ≥95**
3. **All manual testing checklists pass 100%**
4. **Screen reader testing completed with no issues**
5. **Keyboard-only navigation tested for all flows**
6. **Color contrast verified for all text/UI elements**
7. **Documentation updated with accessibility features**

---

## Appendix: Quick Reference

### ARIA Cheat Sheet

```tsx
// Icon-only button
<button aria-label="Delete task">
  <Trash2 aria-hidden="true" />
</button>

// Expandable section
<button aria-expanded={isOpen} aria-controls="section-id">
  Toggle
</button>
<div id="section-id">{/* content */}</div>

// Live region for updates
<div aria-live="polite" className="sr-only">
  {statusMessage}
</div>

// Form input with error
<input
  id="email"
  aria-invalid={!!error}
  aria-describedby={error ? "email-error" : "email-hint"}
/>
<span id="email-error" role="alert">{error}</span>

// Modal dialog
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
>
  <h2 id="dialog-title">Title</h2>
</div>

// Navigation landmark
<nav aria-label="Main navigation">
  {/* nav items */}
</nav>
```

### Common Contrast Ratios

| Element Type | Minimum Ratio (AA) |
|--------------|-------------------|
| Normal text (<18px) | 4.5:1 |
| Large text (≥18px bold or ≥24px) | 3:1 |
| UI components & graphics | 3:1 |
| Disabled elements | No requirement |
| Placeholder text | 3:1 (recommended) |

### Keyboard Interaction Patterns

| Component | Expected Keys |
|-----------|--------------|
| Button | Enter, Space |
| Link | Enter |
| Checkbox | Space |
| Radio | ↑↓ or ←→, Space |
| Select | ↑↓, Enter, Space |
| Menu | ↑↓, Enter, Escape |
| Tab list | ←→ or ↑↓ |
| Dialog | Escape to close |
| Slider | ←→, Home, End |

---

**Document maintained by:** UX Engineering Team
**Last Updated:** January 14, 2026
**Review Schedule:** After each phase completion
