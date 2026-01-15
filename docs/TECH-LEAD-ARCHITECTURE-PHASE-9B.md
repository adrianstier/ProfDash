# Technical Architecture: Phase 9B Implementation
## Tech Lead Blueprint for Development Team

**Document Version:** 1.0
**Created:** January 14, 2026
**Author:** Tech Lead
**Status:** Ready for Development
**Input Documents:**
- [UX-HANDOFF-TO-TECH-LEAD.md](./UX-HANDOFF-TO-TECH-LEAD.md)
- [ACCESSIBILITY-REMEDIATION-PLAN.md](./ACCESSIBILITY-REMEDIATION-PLAN.md)
- [UX-DELIVERABLES.md](./UX-DELIVERABLES.md)

---

## Executive Summary

This document provides the technical architecture and implementation guidelines for Phase 9B of ScholarOS. It translates the UX engineering specifications into concrete technical requirements, database schemas, API designs, and component architectures that align with our existing codebase patterns.

### Phase 9B Scope

| Sprint | Feature | Technical Complexity | New DB Tables | New API Routes |
|--------|---------|---------------------|---------------|----------------|
| 1 | Accessibility Remediation | Medium | 0 | 0 |
| 2 | Progressive Onboarding | Medium | 0 (ALTER profiles) | 2 |
| 3 | Command Palette | Medium | 1 (search_history) | 1 |
| 4 | Mobile Responsiveness | Low | 0 | 0 |
| 5 | Recurring Tasks | High | 0 (ALTER tasks) | 2 |

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Sprint 1: Accessibility Architecture](#2-sprint-1-accessibility-architecture)
3. [Sprint 2: Progressive Onboarding Architecture](#3-sprint-2-progressive-onboarding-architecture)
4. [Sprint 3: Command Palette Architecture](#4-sprint-3-command-palette-architecture)
5. [Sprint 4: Mobile Responsiveness Architecture](#5-sprint-4-mobile-responsiveness-architecture)
6. [Sprint 5: Recurring Tasks Architecture](#6-sprint-5-recurring-tasks-architecture)
7. [Database Migration Strategy](#7-database-migration-strategy)
8. [API Design Specifications](#8-api-design-specifications)
9. [Component Architecture](#9-component-architecture)
10. [Testing Strategy](#10-testing-strategy)
11. [Implementation Guidelines](#11-implementation-guidelines)
12. [Tech Lead Decisions](#12-tech-lead-decisions)

---

## 1. Architecture Overview

### 1.1 Current System Context

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SCHOLAROS ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │   Next.js 15    │───▶│  API Routes     │───▶│   Supabase      │         │
│  │   Frontend      │    │  (REST)         │    │   PostgreSQL    │         │
│  │                 │    │                 │    │   + RLS         │         │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘         │
│         │                       │                                           │
│         │                       │                                           │
│         ▼                       ▼                                           │
│  ┌─────────────────┐    ┌─────────────────┐                                │
│  │  React Query    │    │  FastAPI AI     │                                │
│  │  + Zustand      │    │  Microservice   │                                │
│  └─────────────────┘    └─────────────────┘                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Phase 9B Integration Points

Phase 9B features integrate with existing architecture as follows:

| Feature | Frontend | API | Database | AI Service |
|---------|----------|-----|----------|------------|
| Accessibility | ✅ New components | ❌ | ❌ | ❌ |
| Onboarding | ✅ New wizard | ✅ New routes | ✅ ALTER profiles | ❌ |
| Command Palette | ✅ New component | ✅ Search API | ✅ search_history | ❌ |
| Mobile Responsive | ✅ CSS/components | ❌ | ❌ | ❌ |
| Recurring Tasks | ✅ New picker | ✅ Occurrences | ✅ ALTER tasks | ❌ |

### 1.3 Technology Additions

**New Dependencies:**

```json
{
  "dependencies": {
    "cmdk": "^1.0.0",        // Command palette UI (Sprint 3)
    "fuse.js": "^7.0.0",     // Fuzzy search (Sprint 3)
    "rrule": "^2.8.1"        // Recurrence rules (Sprint 5)
  },
  "devDependencies": {
    "@axe-core/react": "^4.9.0",  // Accessibility testing (Sprint 1)
    "jest-axe": "^9.0.0"          // Accessibility unit tests (Sprint 1)
  }
}
```

---

## 2. Sprint 1: Accessibility Architecture

### 2.1 Component Architecture

**New Files to Create:**

```
apps/web/
├── components/
│   └── accessibility/
│       ├── announcer.tsx           # NEW - Live region announcements
│       ├── focus-trap.tsx          # EXISTS - Export update only
│       └── skip-link.tsx           # EXISTS - Already implemented
└── lib/
    └── hooks/
        └── use-keyboard-navigation.ts  # NEW - Generic keyboard nav hook
```

### 2.2 Announcer Component Architecture

```typescript
// components/accessibility/announcer.tsx

/**
 * Architecture Decision: Context-based announcer
 *
 * Why Context over Zustand:
 * - Announcements are UI-only, don't need persistence
 * - Simpler implementation for transient state
 * - Direct DOM manipulation (aria-live regions)
 * - No need for devtools or middleware
 */

interface AnnouncerState {
  polite: string;
  assertive: string;
}

interface AnnouncerAPI {
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  announcePolite: (message: string) => void;
  announceAssertive: (message: string) => void;
}

// Provider wraps app at layout level
// Two hidden divs with aria-live="polite" and aria-live="assertive"
// Clear announcement after 1s to allow re-announcement of same message
```

**Integration Pattern:**

```typescript
// app/layout.tsx
import { AnnouncerProvider } from '@/components/accessibility/announcer';

export default function RootLayout({ children }) {
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

### 2.3 Keyboard Navigation Hook Architecture

```typescript
// lib/hooks/use-keyboard-navigation.ts

/**
 * Architecture Decision: Generic hook with specialization pattern
 *
 * Base hook handles:
 * - Arrow key navigation (configurable orientation)
 * - Home/End for jump to first/last
 * - Enter/Space for selection
 * - Escape for close/cancel
 * - Optional typeahead search
 *
 * Specialized hooks wrap base for common patterns:
 * - useTaskListNavigation
 * - useDropdownNavigation
 * - useKanbanNavigation
 */

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

// Returns:
// - focusedIndex: number
// - setFocusedIndex: (index: number) => void
// - getItemProps: (index: number) => props for each item
// - containerProps: props for container element
```

### 2.4 Files to Modify (Detailed)

| File | Changes | Effort |
|------|---------|--------|
| `components/projects/project-card.tsx` | Add aria-labels to icon buttons (lines 58-73) | 30 min |
| `components/tasks/task-card.tsx` | Priority badge ARIA, category ARIA (lines 354-382, 56-95) | 45 min |
| `components/ui/empty-state.tsx` | aria-hidden on decorative icons (lines 83-90) | 15 min |
| `components/tasks/quick-add.tsx` | Hidden label, aria-describedby (lines 130+) | 30 min |
| `components/tasks/task-detail-drawer.tsx` | Form labels, focus trap, dialog role (lines 160-250) | 60 min |
| `components/ui/tooltip.tsx` | role="tooltip", aria-describedby connection (lines 90-102) | 30 min |
| `components/layout/sidebar.tsx` | aria-expanded, aria-controls (lines 120-126) | 30 min |
| `components/ui/dropdown-menu.tsx` | Keyboard navigation, focus trap (lines 72-117) | 60 min |
| `app/(dashboard)/board/page.tsx` | Keyboard instructions, ARIA labels (lines 39-67) | 30 min |
| `app/globals.css` | Color contrast updates, placeholder contrast | 30 min |
| `components/ui/button.tsx` | Disabled opacity adjustment (line 8) | 10 min |

### 2.5 Testing Requirements

```typescript
// __tests__/accessibility/announcer.test.tsx
describe('Announcer', () => {
  it('renders polite announcements in aria-live region');
  it('renders assertive announcements in aria-live="assertive" region');
  it('clears announcements after timeout');
  it('handles rapid consecutive announcements');
});

// __tests__/accessibility/keyboard-navigation.test.tsx
describe('useKeyboardNavigation', () => {
  it('navigates with arrow keys');
  it('wraps around when wrap=true');
  it('does not wrap when wrap=false');
  it('supports typeahead search');
  it('handles Home/End keys');
});
```

---

## 3. Sprint 2: Progressive Onboarding Architecture

### 3.1 Database Schema Changes

```sql
-- Migration: 20260115000000_onboarding_tracking.sql

-- Add onboarding tracking columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS onboarding_skipped BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Create index for onboarding queries
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding
ON profiles(onboarding_completed, onboarding_skipped);

-- Add comment for documentation
COMMENT ON COLUMN profiles.onboarding_step IS
'Current onboarding step (0=not started, 1-5=in progress, 6=completed)';
```

### 3.2 Type Definitions

```typescript
// packages/shared/src/types/index.ts (additions)

export interface OnboardingProgress {
  step: OnboardingStep;
  completed: boolean;
  skipped: boolean;
  startedAt: string | null;
  completedAt: string | null;
}

export type OnboardingStep = 0 | 1 | 2 | 3 | 4 | 5;

export const ONBOARDING_STEPS = {
  NOT_STARTED: 0,
  WELCOME: 1,
  PROFILE: 2,
  WORKSPACE: 3,
  FIRST_TASK: 4,
  COMPLETION: 5,
} as const;
```

### 3.3 Component Architecture

```
apps/web/components/onboarding/
├── onboarding-wizard.tsx      # Container component with step management
├── steps/
│   ├── welcome-step.tsx       # Step 1: Feature highlights
│   ├── profile-step.tsx       # Step 2: Profile completion form
│   ├── workspace-step.tsx     # Step 3: Workspace creation
│   ├── first-task-step.tsx    # Step 4: Quick-add tutorial
│   └── completion-step.tsx    # Step 5: Success + next steps
├── onboarding-progress.tsx    # Progress indicator dots
└── onboarding-skip-button.tsx # Skip functionality
```

**State Management Architecture:**

```typescript
// lib/hooks/use-onboarding.ts

/**
 * Architecture Decision: React Query + Local State
 *
 * Server state (React Query):
 * - Current step from database
 * - Completion status
 * - Timestamps
 *
 * Local state (useState):
 * - Form data within steps
 * - Animation states
 * - Validation errors
 *
 * Why not Zustand:
 * - Onboarding is session-scoped
 * - No need for persistence (DB handles this)
 * - Simple linear flow
 */

interface UseOnboardingReturn {
  // Current state
  currentStep: OnboardingStep;
  isCompleted: boolean;
  isSkipped: boolean;
  isLoading: boolean;

  // Actions
  nextStep: () => Promise<void>;
  previousStep: () => void;
  skipOnboarding: () => Promise<void>;
  completeOnboarding: () => Promise<void>;

  // Step-specific data
  canProceed: boolean;
  stepData: Record<string, unknown>;
  setStepData: (data: Record<string, unknown>) => void;
}
```

### 3.4 API Routes

**GET /api/onboarding**

```typescript
// app/api/onboarding/route.ts

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_step, onboarding_completed, onboarding_skipped, onboarding_started_at, onboarding_completed_at')
    .eq('id', user.id)
    .single();

  return NextResponse.json({
    step: profile?.onboarding_step ?? 0,
    completed: profile?.onboarding_completed ?? false,
    skipped: profile?.onboarding_skipped ?? false,
    startedAt: profile?.onboarding_started_at,
    completedAt: profile?.onboarding_completed_at,
  });
}
```

**PATCH /api/onboarding**

```typescript
// app/api/onboarding/route.ts

const updateOnboardingSchema = z.object({
  step: z.number().min(0).max(5).optional(),
  completed: z.boolean().optional(),
  skipped: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const validated = updateOnboardingSchema.parse(body);

  const updateData: Record<string, unknown> = {};

  if (validated.step !== undefined) {
    updateData.onboarding_step = validated.step;
    if (validated.step === 1 && !updateData.onboarding_started_at) {
      updateData.onboarding_started_at = new Date().toISOString();
    }
  }

  if (validated.completed) {
    updateData.onboarding_completed = true;
    updateData.onboarding_completed_at = new Date().toISOString();
  }

  if (validated.skipped) {
    updateData.onboarding_skipped = true;
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
```

### 3.5 Trigger Logic

```typescript
// components/onboarding/onboarding-trigger.tsx

/**
 * Architecture Decision: Trigger at dashboard layout level
 *
 * Placement: app/(dashboard)/layout.tsx
 *
 * Logic:
 * 1. Fetch onboarding status on mount
 * 2. Show wizard if: !completed && !skipped
 * 3. Resume from saved step if user returns
 * 4. Wizard renders as full-screen overlay
 */

export function OnboardingTrigger() {
  const { data: onboarding, isLoading } = useOnboardingStatus();
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    if (!isLoading && onboarding) {
      const shouldShow = !onboarding.completed && !onboarding.skipped;
      setShowWizard(shouldShow);
    }
  }, [onboarding, isLoading]);

  if (!showWizard) return null;

  return <OnboardingWizard initialStep={onboarding?.step ?? 1} />;
}
```

### 3.6 Analytics Events

```typescript
// lib/analytics/onboarding-events.ts

export const ONBOARDING_EVENTS = {
  STARTED: 'onboarding_started',
  STEP_COMPLETED: 'onboarding_step_completed',
  SKIPPED: 'onboarding_skipped',
  COMPLETED: 'onboarding_completed',
  FIRST_TASK_CREATED: 'onboarding_first_task_created',
} as const;

export function trackOnboardingEvent(
  event: keyof typeof ONBOARDING_EVENTS,
  properties?: Record<string, unknown>
) {
  // Integration point for analytics provider
  // e.g., PostHog, Mixpanel, custom Supabase logging
  console.log('[Analytics]', event, properties);
}
```

---

## 4. Sprint 3: Command Palette Architecture

### 4.1 Database Schema

```sql
-- Migration: 20260118000000_search_history.sql

CREATE TABLE IF NOT EXISTS search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  result_type TEXT, -- 'task', 'project', 'grant', 'publication', 'navigation'
  result_id UUID,   -- ID of selected result (if applicable)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast recent searches lookup
CREATE INDEX idx_search_history_user_recent
ON search_history(user_id, created_at DESC);

-- Limit history per user (cleanup trigger)
CREATE OR REPLACE FUNCTION cleanup_search_history()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM search_history
  WHERE user_id = NEW.user_id
  AND id NOT IN (
    SELECT id FROM search_history
    WHERE user_id = NEW.user_id
    ORDER BY created_at DESC
    LIMIT 50
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_search_history
AFTER INSERT ON search_history
FOR EACH ROW EXECUTE FUNCTION cleanup_search_history();

-- RLS Policy
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access own search history"
ON search_history FOR ALL
USING (auth.uid() = user_id);
```

### 4.2 Component Architecture

```
apps/web/components/search/
├── command-palette.tsx        # Main palette (uses cmdk)
├── command-palette-trigger.tsx # Global keyboard listener
├── search-results/
│   ├── search-result-group.tsx    # Grouped results container
│   ├── task-search-result.tsx     # Task result item
│   ├── project-search-result.tsx  # Project result item
│   ├── grant-search-result.tsx    # Grant result item
│   └── navigation-result.tsx      # Navigation/command item
├── recent-searches.tsx        # Recent search display
└── search-empty-state.tsx     # Quick actions when empty
```

### 4.3 Search Architecture

```typescript
// lib/hooks/use-global-search.ts

/**
 * Architecture Decision: Hybrid Client + Server Search
 *
 * Client-side (Fuse.js):
 * - Navigation items (static)
 * - Quick actions (static)
 * - Recently viewed items (cached)
 * - Instant results (<50ms)
 *
 * Server-side (API):
 * - Full task search across workspace
 * - Project search
 * - Grant search
 * - Publication search
 * - Debounced (150ms)
 *
 * Why Hybrid:
 * - Instant feedback for common actions
 * - Comprehensive results for content search
 * - Reduced server load for navigation
 */

interface UseGlobalSearchOptions {
  query: string;
  mode: 'search' | 'command';
  workspaceId: string | null;
}

interface SearchResults {
  navigation: NavigationResult[];
  quickActions: QuickActionResult[];
  tasks: TaskSearchResult[];
  projects: ProjectSearchResult[];
  grants: GrantSearchResult[];
  publications: PublicationSearchResult[];
  recent: RecentSearchResult[];
}
```

### 4.4 API Route

**GET /api/search**

```typescript
// app/api/search/route.ts

const searchSchema = z.object({
  q: z.string().min(1).max(200),
  types: z.array(z.enum(['tasks', 'projects', 'grants', 'publications'])).optional(),
  limit: z.number().min(1).max(20).default(5),
});

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const params = searchSchema.parse({
    q: searchParams.get('q'),
    types: searchParams.get('types')?.split(','),
    limit: parseInt(searchParams.get('limit') || '5'),
  });

  const workspaceId = searchParams.get('workspace_id');
  const results: SearchResults = {
    tasks: [],
    projects: [],
    grants: [],
    publications: [],
  };

  // Parallel search across entity types
  const searchPromises = [];

  if (!params.types || params.types.includes('tasks')) {
    searchPromises.push(
      supabase
        .from('tasks')
        .select('id, title, status, priority, category, due_date')
        .eq('workspace_id', workspaceId)
        .ilike('title', `%${params.q}%`)
        .limit(params.limit)
        .then(({ data }) => { results.tasks = data || []; })
    );
  }

  // Similar for projects, grants, publications...

  await Promise.all(searchPromises);

  return NextResponse.json(results);
}
```

### 4.5 Keyboard Shortcuts Registry

```typescript
// lib/keyboard-shortcuts.ts

export const KEYBOARD_SHORTCUTS = {
  // Global
  COMMAND_PALETTE: { key: 'k', meta: true },
  NEW_TASK: { key: 'n', meta: true },
  NEW_PROJECT: { key: 'p', meta: true, shift: true },
  OPEN_CALENDAR: { key: 'c', meta: true, shift: true },
  SETTINGS: { key: ',', meta: true },

  // Navigation (g then key)
  GO_TODAY: { key: 't', prefix: 'g' },
  GO_UPCOMING: { key: 'u', prefix: 'g' },
  GO_BOARD: { key: 'b', prefix: 'g' },
  GO_PROJECTS: { key: 'p', prefix: 'g' },
  GO_GRANTS: { key: 'd', prefix: 'g' },
  GO_CALENDAR: { key: 'c', prefix: 'g' },

  // Command palette navigation
  PALETTE_UP: { key: 'ArrowUp' },
  PALETTE_DOWN: { key: 'ArrowDown' },
  PALETTE_SELECT: { key: 'Enter' },
  PALETTE_CLOSE: { key: 'Escape' },
} as const;
```

### 4.6 cmdk Integration

```typescript
// components/search/command-palette.tsx

import { Command } from 'cmdk';

/**
 * Architecture Decision: Use cmdk as base
 *
 * cmdk provides:
 * - Accessible combobox pattern
 * - Built-in keyboard navigation
 * - Search filtering
 * - Group management
 * - Focus management
 *
 * We customize:
 * - Styling to match ScholarOS design system
 * - Server-side search integration
 * - Recent searches persistence
 * - Custom result renderers
 */

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { results, isLoading } = useGlobalSearch({ query });

  // Global keyboard listener
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <Command.Dialog open={open} onOpenChange={setOpen}>
      <Command.Input
        value={query}
        onValueChange={setQuery}
        placeholder="Search tasks, projects, grants..."
      />
      <Command.List>
        {/* Quick Actions (empty state) */}
        {!query && <QuickActionsGroup />}

        {/* Recent Searches */}
        {!query && <RecentSearchesGroup />}

        {/* Search Results */}
        {query && (
          <>
            <TaskResultsGroup tasks={results.tasks} />
            <ProjectResultsGroup projects={results.projects} />
            <GrantResultsGroup grants={results.grants} />
          </>
        )}
      </Command.List>
    </Command.Dialog>
  );
}
```

---

## 5. Sprint 4: Mobile Responsiveness Architecture

### 5.1 Breakpoint Strategy

```typescript
// lib/constants/breakpoints.ts

export const BREAKPOINTS = {
  xs: 375,   // iPhone SE, small phones
  sm: 640,   // Large phones, small tablets
  md: 768,   // iPad portrait, tablets
  lg: 1024,  // Desktop
  xl: 1280,  // Large desktop
  '2xl': 1536, // Extra large
} as const;

export const LAYOUT_MODES = {
  MOBILE: 'mobile',     // < md (768px)
  TABLET: 'tablet',     // md - lg (768px - 1024px)
  DESKTOP: 'desktop',   // >= lg (1024px)
} as const;
```

### 5.2 Responsive Component Patterns

```typescript
// Pattern 1: CSS-only responsive (preferred for simple cases)

// components/tasks/task-card.tsx
<div className={cn(
  // Base styles
  "rounded-lg border bg-card p-4",
  // Mobile: full width
  "w-full",
  // Desktop: constrained width
  "md:max-w-md"
)}>

// Pattern 2: Component switching (for different UX)

// components/tasks/task-detail-responsive.tsx
export function TaskDetailResponsive(props: TaskDetailProps) {
  // Use hook to detect screen size
  const isMobile = useMediaQuery('(max-width: 767px)');

  if (isMobile) {
    // Full-screen dialog on mobile
    return <TaskDetailDialog {...props} />;
  }

  // Side drawer on desktop
  return <TaskDetailDrawer {...props} />;
}

// Pattern 3: Conditional rendering

// components/layout/navigation.tsx
export function Navigation() {
  return (
    <>
      {/* Desktop sidebar - hidden on mobile */}
      <aside className="hidden md:block w-64 border-r">
        <Sidebar />
      </aside>

      {/* Mobile bottom nav - hidden on desktop */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 border-t bg-background">
        <MobileBottomNav />
      </nav>
    </>
  );
}
```

### 5.3 Mobile-Specific Components

```
apps/web/components/
├── layout/
│   ├── sidebar.tsx            # Existing - add md:hidden to mobile
│   ├── mobile-nav.tsx         # Existing - enhance
│   └── mobile-more-menu.tsx   # NEW - "More" sheet menu
└── tasks/
    ├── task-detail-drawer.tsx     # Existing - add responsive wrapper
    ├── task-detail-dialog.tsx     # NEW - Full-screen mobile version
    └── mobile-board-tabs.tsx      # NEW - Tabbed board for mobile
```

### 5.4 Touch Interaction Architecture

```typescript
// lib/hooks/use-swipe-gesture.ts

/**
 * Architecture Decision: Custom swipe hook
 *
 * Why not a library:
 * - Simple requirements (left/right/up/down)
 * - No need for complex gestures
 * - Smaller bundle size
 * - Full control over behavior
 */

interface UseSwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number; // Default: 50px
  preventScroll?: boolean;
}

export function useSwipeGesture(options: UseSwipeGestureOptions) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = (e: TouchEvent) => {
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const onTouchEnd = (e: TouchEvent) => {
    if (!touchStart.current) return;

    const deltaX = e.changedTouches[0].clientX - touchStart.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStart.current.y;
    const threshold = options.threshold ?? 50;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > threshold) options.onSwipeRight?.();
      if (deltaX < -threshold) options.onSwipeLeft?.();
    } else {
      if (deltaY > threshold) options.onSwipeDown?.();
      if (deltaY < -threshold) options.onSwipeUp?.();
    }

    touchStart.current = null;
  };

  return { onTouchStart, onTouchEnd };
}
```

### 5.5 Safe Area Handling

```css
/* app/globals.css additions */

/* Bottom navigation safe area */
.mobile-bottom-nav {
  padding-bottom: env(safe-area-inset-bottom, 0);
}

/* Full-screen modals */
.mobile-fullscreen-modal {
  padding-top: env(safe-area-inset-top, 0);
  padding-bottom: env(safe-area-inset-bottom, 0);
  padding-left: env(safe-area-inset-left, 0);
  padding-right: env(safe-area-inset-right, 0);
}

/* Touch target minimum size */
.touch-target {
  min-height: 44px;
  min-width: 44px;
}
```

---

## 6. Sprint 5: Recurring Tasks Architecture

### 6.1 Database Schema Changes

```sql
-- Migration: 20260120000000_recurring_tasks.sql

-- Add recurrence columns to tasks table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS recurrence_rule TEXT,
ADD COLUMN IF NOT EXISTS recurrence_parent_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS recurrence_date DATE,
ADD COLUMN IF NOT EXISTS recurrence_exceptions JSONB DEFAULT '[]'::jsonb;

-- Index for efficient parent lookup
CREATE INDEX IF NOT EXISTS idx_tasks_recurrence_parent
ON tasks(recurrence_parent_id) WHERE recurrence_parent_id IS NOT NULL;

-- Index for recurring task queries
CREATE INDEX IF NOT EXISTS idx_tasks_recurring
ON tasks(workspace_id, is_recurring) WHERE is_recurring = TRUE;

-- Add comments for documentation
COMMENT ON COLUMN tasks.recurrence_rule IS
'RRULE string (RFC 5545) defining recurrence pattern';

COMMENT ON COLUMN tasks.recurrence_parent_id IS
'Reference to parent recurring task (for generated instances)';

COMMENT ON COLUMN tasks.recurrence_date IS
'Specific date this instance represents (for generated instances)';

COMMENT ON COLUMN tasks.recurrence_exceptions IS
'Array of dates to skip in recurrence pattern';
```

### 6.2 Type Definitions

```typescript
// packages/shared/src/types/index.ts (additions)

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  byDay?: string[];      // ['MO', 'TU', 'WE', 'TH', 'FR']
  byMonthDay?: number[]; // [1, 15] for 1st and 15th
  byMonth?: number[];    // [1, 6] for January and June
  until?: string;        // ISO date string
  count?: number;        // Max occurrences
}

export interface RecurringTask extends Task {
  isRecurring: true;
  recurrenceRule: string;      // RRULE string
  recurrenceParentId: null;    // Parent has no parent
  recurrenceExceptions: string[]; // Dates to skip
}

export interface RecurrenceInstance extends Task {
  isRecurring: false;
  recurrenceRule: null;
  recurrenceParentId: string;  // Points to parent
  recurrenceDate: string;      // This instance's date
}

// Edit scope for recurring tasks
export type RecurrenceEditScope =
  | 'this'           // Only this occurrence
  | 'this_and_future' // This and all future occurrences
  | 'all';           // All occurrences (modify parent)
```

### 6.3 RRULE Utility Functions

```typescript
// lib/utils/recurrence.ts

import { RRule, RRuleSet } from 'rrule';

/**
 * Architecture Decision: Use rrule library
 *
 * Why rrule:
 * - RFC 5545 compliant
 * - Handles complex patterns (every 2nd Monday, etc.)
 * - Timezone support
 * - Exception handling built-in
 * - Well-maintained, widely used
 */

// Convert our RecurrenceRule to RRULE string
export function toRRuleString(rule: RecurrenceRule): string {
  const rrule = new RRule({
    freq: RRule[rule.frequency.toUpperCase() as keyof typeof RRule],
    interval: rule.interval,
    byweekday: rule.byDay?.map(d => RRule[d as keyof typeof RRule]),
    bymonthday: rule.byMonthDay,
    bymonth: rule.byMonth,
    until: rule.until ? new Date(rule.until) : undefined,
    count: rule.count,
  });
  return rrule.toString();
}

// Parse RRULE string to our RecurrenceRule
export function parseRRuleString(rruleString: string): RecurrenceRule {
  const rrule = RRule.fromString(rruleString);
  return {
    frequency: rrule.options.freq.toLowerCase() as RecurrenceRule['frequency'],
    interval: rrule.options.interval,
    byDay: rrule.options.byweekday?.map(d => ['SU','MO','TU','WE','TH','FR','SA'][d]),
    byMonthDay: rrule.options.bymonthday,
    byMonth: rrule.options.bymonth,
    until: rrule.options.until?.toISOString(),
    count: rrule.options.count,
  };
}

// Get human-readable description
export function getRecurrenceDescription(rruleString: string): string {
  const rrule = RRule.fromString(rruleString);
  return rrule.toText();
}

// Generate next N occurrences
export function getNextOccurrences(
  rruleString: string,
  exceptions: string[],
  count: number,
  after: Date = new Date()
): Date[] {
  const rruleSet = new RRuleSet();
  rruleSet.rrule(RRule.fromString(rruleString));

  // Add exceptions
  exceptions.forEach(date => {
    rruleSet.exdate(new Date(date));
  });

  return rruleSet.after(after, true)
    ? rruleSet.between(after, new Date(after.getTime() + 365 * 24 * 60 * 60 * 1000), true).slice(0, count)
    : [];
}
```

### 6.4 Component Architecture

```
apps/web/components/tasks/
├── recurrence/
│   ├── recurrence-picker.tsx        # Main picker component
│   ├── recurrence-presets.tsx       # Quick preset buttons
│   ├── recurrence-custom.tsx        # Custom rule builder
│   ├── recurrence-badge.tsx         # Display badge on task card
│   └── recurrence-edit-dialog.tsx   # Edit scope selection dialog
```

### 6.5 Recurrence Picker Component

```typescript
// components/tasks/recurrence/recurrence-picker.tsx

interface RecurrencePickerProps {
  value: RecurrenceRule | null;
  onChange: (rule: RecurrenceRule | null) => void;
}

const PRESETS: { label: string; rule: RecurrenceRule }[] = [
  { label: 'Daily', rule: { frequency: 'daily', interval: 1 } },
  { label: 'Weekdays', rule: { frequency: 'weekly', interval: 1, byDay: ['MO','TU','WE','TH','FR'] } },
  { label: 'Weekly', rule: { frequency: 'weekly', interval: 1 } },
  { label: 'Monthly', rule: { frequency: 'monthly', interval: 1, byMonthDay: [1] } },
];

export function RecurrencePicker({ value, onChange }: RecurrencePickerProps) {
  const [showCustom, setShowCustom] = useState(false);

  return (
    <div className="space-y-3">
      <Label>Repeat</Label>

      {/* None option */}
      <Button
        variant={value === null ? 'default' : 'outline'}
        onClick={() => onChange(null)}
      >
        None
      </Button>

      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map(preset => (
          <Button
            key={preset.label}
            variant={isMatchingPreset(value, preset.rule) ? 'default' : 'outline'}
            onClick={() => onChange(preset.rule)}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* Custom option */}
      <Button variant="ghost" onClick={() => setShowCustom(true)}>
        Custom...
      </Button>

      {showCustom && (
        <RecurrenceCustomBuilder
          value={value}
          onChange={onChange}
          onClose={() => setShowCustom(false)}
        />
      )}

      {/* Preview */}
      {value && (
        <p className="text-sm text-muted-foreground">
          {getRecurrenceDescription(toRRuleString(value))}
        </p>
      )}
    </div>
  );
}
```

### 6.6 API Routes for Recurring Tasks

**POST /api/tasks/[id]/occurrences**

```typescript
// app/api/tasks/[id]/occurrences/route.ts

/**
 * Generate next occurrence when current is completed
 *
 * Architecture Decision: Generate on completion
 *
 * Alternative approaches considered:
 * 1. Pre-generate all occurrences (rejected: unbounded, wasteful)
 * 2. Virtual occurrences in UI (rejected: can't assign, comment, etc.)
 * 3. Generate on completion (chosen: bounded, real tasks)
 *
 * This creates a new task instance with:
 * - Same title, description, category, priority
 * - New due_date based on RRULE
 * - recurrence_parent_id pointing to original
 * - recurrence_date set to new occurrence date
 */

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get the completed task
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', params.id)
    .single();

  if (taskError || !task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  // Find the parent recurring task
  const parentId = task.recurrence_parent_id || task.id;
  const { data: parent } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', parentId)
    .single();

  if (!parent?.recurrence_rule) {
    return NextResponse.json({ error: 'Not a recurring task' }, { status: 400 });
  }

  // Calculate next occurrence
  const nextDates = getNextOccurrences(
    parent.recurrence_rule,
    parent.recurrence_exceptions || [],
    1,
    new Date(task.due_date || new Date())
  );

  if (nextDates.length === 0) {
    return NextResponse.json({ message: 'No more occurrences' });
  }

  const nextDate = nextDates[0];

  // Create next occurrence
  const { data: newTask, error: createError } = await supabase
    .from('tasks')
    .insert({
      workspace_id: task.workspace_id,
      user_id: user.id,
      title: parent.title,
      description: parent.description,
      category: parent.category,
      priority: parent.priority,
      status: 'todo',
      due_date: nextDate.toISOString(),
      recurrence_parent_id: parentId,
      recurrence_date: nextDate.toISOString().split('T')[0],
    })
    .select()
    .single();

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  return NextResponse.json(newTask, { status: 201 });
}
```

**PATCH /api/tasks/[id]/recurrence**

```typescript
// app/api/tasks/[id]/recurrence/route.ts

const updateRecurrenceSchema = z.object({
  scope: z.enum(['this', 'this_and_future', 'all']),
  updates: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    recurrence_rule: z.string().optional(),
    // ... other fields
  }),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { scope, updates } = updateRecurrenceSchema.parse(body);

  const { data: task } = await supabase
    .from('tasks')
    .select('*, parent:recurrence_parent_id(*)')
    .eq('id', params.id)
    .single();

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  switch (scope) {
    case 'this':
      // Only update this instance
      // Detach from parent by clearing recurrence_parent_id
      await supabase
        .from('tasks')
        .update({ ...updates, recurrence_parent_id: null })
        .eq('id', params.id);
      break;

    case 'this_and_future':
      // Add exception to parent for this date
      // Update this and future instances
      const parentId = task.recurrence_parent_id || task.id;
      const thisDate = task.recurrence_date;

      // Add exception
      await supabase.rpc('add_recurrence_exception', {
        task_id: parentId,
        exception_date: thisDate,
      });

      // Create new parent with updated rule starting from this date
      // ... complex logic
      break;

    case 'all':
      // Update the parent, which affects all instances
      const allParentId = task.recurrence_parent_id || task.id;
      await supabase
        .from('tasks')
        .update(updates)
        .eq('id', allParentId);
      break;
  }

  return NextResponse.json({ success: true });
}
```

---

## 7. Database Migration Strategy

### 7.1 Migration Order

Execute migrations in this order:

1. **20260115000000_onboarding_tracking.sql** (Sprint 2)
2. **20260118000000_search_history.sql** (Sprint 3)
3. **20260120000000_recurring_tasks.sql** (Sprint 5)

### 7.2 Migration Execution

```bash
# Development
cd scholaros/supabase
supabase db push

# Production
# Apply via Supabase Dashboard or supabase db push --linked
```

### 7.3 Rollback Strategy

Each migration should have a corresponding down migration:

```sql
-- 20260115000000_onboarding_tracking_down.sql
ALTER TABLE profiles
DROP COLUMN IF EXISTS onboarding_completed,
DROP COLUMN IF EXISTS onboarding_step,
DROP COLUMN IF EXISTS onboarding_skipped,
DROP COLUMN IF EXISTS onboarding_started_at,
DROP COLUMN IF EXISTS onboarding_completed_at;

DROP INDEX IF EXISTS idx_profiles_onboarding;
```

---

## 8. API Design Specifications

### 8.1 API Summary

| Endpoint | Method | Purpose | Sprint |
|----------|--------|---------|--------|
| `/api/onboarding` | GET | Get onboarding status | 2 |
| `/api/onboarding` | PATCH | Update onboarding progress | 2 |
| `/api/search` | GET | Global search across entities | 3 |
| `/api/search/history` | GET | Get recent searches | 3 |
| `/api/search/history` | POST | Record search selection | 3 |
| `/api/tasks/[id]/occurrences` | POST | Generate next occurrence | 5 |
| `/api/tasks/[id]/recurrence` | PATCH | Update recurring task | 5 |

### 8.2 Error Response Format

```typescript
// Consistent error response structure
interface APIErrorResponse {
  error: string;          // Human-readable message
  code?: string;          // Machine-readable code (optional)
  details?: unknown;      // Additional context (optional)
}

// HTTP Status Codes
// 400 - Bad Request (validation errors)
// 401 - Unauthorized (not logged in)
// 403 - Forbidden (no permission)
// 404 - Not Found
// 429 - Too Many Requests (rate limited)
// 500 - Internal Server Error
```

### 8.3 Rate Limiting

```typescript
// lib/rate-limit.ts additions

export const RATE_LIMIT_CONFIGS = {
  // Existing
  read: { windowMs: 60000, max: 100 },
  write: { windowMs: 60000, max: 30 },

  // New for Phase 9B
  search: { windowMs: 60000, max: 60 },      // Search API
  onboarding: { windowMs: 60000, max: 20 },  // Onboarding updates
};
```

---

## 9. Component Architecture

### 9.1 New Component Summary

| Component | Location | Purpose |
|-----------|----------|---------|
| `AnnouncerProvider` | `components/accessibility/` | Screen reader announcements |
| `OnboardingWizard` | `components/onboarding/` | New user onboarding flow |
| `CommandPalette` | `components/search/` | Global search/command palette |
| `RecurrencePicker` | `components/tasks/recurrence/` | Recurring task configuration |
| `MobileBottomNav` | `components/layout/` | Mobile navigation |
| `TaskDetailDialog` | `components/tasks/` | Mobile task detail view |

### 9.2 Component Dependencies

```
AnnouncerProvider
└── (no dependencies, wraps app)

OnboardingWizard
├── useOnboarding (hook)
├── WelcomeStep, ProfileStep, WorkspaceStep, FirstTaskStep, CompletionStep
└── AnnouncerProvider (announces step changes)

CommandPalette
├── cmdk (external)
├── Fuse.js (external)
├── useGlobalSearch (hook)
└── AnnouncerProvider (announces results)

RecurrencePicker
├── rrule (external)
├── RecurrencePresets, RecurrenceCustom
└── toRRuleString, parseRRuleString (utils)
```

---

## 10. Testing Strategy

### 10.1 Unit Tests

```typescript
// Sprint 1: Accessibility
describe('Announcer', () => { /* ... */ });
describe('useKeyboardNavigation', () => { /* ... */ });

// Sprint 2: Onboarding
describe('useOnboarding', () => { /* ... */ });
describe('OnboardingWizard', () => { /* ... */ });

// Sprint 3: Command Palette
describe('useGlobalSearch', () => { /* ... */ });
describe('CommandPalette', () => { /* ... */ });

// Sprint 5: Recurring Tasks
describe('toRRuleString', () => { /* ... */ });
describe('parseRRuleString', () => { /* ... */ });
describe('getNextOccurrences', () => { /* ... */ });
describe('RecurrencePicker', () => { /* ... */ });
```

### 10.2 Integration Tests

```typescript
// API route tests
describe('GET /api/onboarding', () => { /* ... */ });
describe('PATCH /api/onboarding', () => { /* ... */ });
describe('GET /api/search', () => { /* ... */ });
describe('POST /api/tasks/[id]/occurrences', () => { /* ... */ });
```

### 10.3 E2E Tests (Playwright)

```typescript
// tests/e2e/accessibility.spec.ts
test('keyboard navigation through task list');
test('screen reader announces task completion');
test('skip link navigates to main content');

// tests/e2e/onboarding.spec.ts
test('new user sees onboarding wizard');
test('can complete onboarding flow');
test('can skip onboarding');
test('progress persists across page refresh');

// tests/e2e/command-palette.spec.ts
test('Cmd+K opens command palette');
test('search returns matching tasks');
test('arrow keys navigate results');
test('enter opens selected item');

// tests/e2e/mobile.spec.ts
test('bottom navigation visible on mobile');
test('swipe changes board columns');
test('task detail opens full screen');

// tests/e2e/recurring-tasks.spec.ts
test('can create recurring task');
test('completing task generates next occurrence');
test('edit dialog shows scope options');
```

### 10.4 Accessibility Tests

```typescript
// tests/a11y/axe-audit.spec.ts
import { checkA11y } from '@axe-core/playwright';

test('Today page passes axe audit', async ({ page }) => {
  await page.goto('/today');
  await checkA11y(page);
});

// Run for all pages
const pages = ['/today', '/upcoming', '/board', '/projects', '/grants'];
for (const pagePath of pages) {
  test(`${pagePath} passes axe audit`, async ({ page }) => {
    await page.goto(pagePath);
    await checkA11y(page);
  });
}
```

---

## 11. Implementation Guidelines

### 11.1 Sprint 1 Guidelines (Accessibility)

**Priority Order:**
1. Create `AnnouncerProvider` and `useAnnounce` hook
2. Add announcer to layout
3. Fix ARIA labels (icon buttons first)
4. Create `useKeyboardNavigation` hook
5. Apply keyboard navigation to task list
6. Fix color contrast issues
7. Replace `confirm()` with `AlertDialog`
8. Add focus management

**Code Review Checklist:**
- [ ] All icon buttons have `aria-label`
- [ ] All form inputs have associated labels
- [ ] All interactive elements are keyboard accessible
- [ ] Focus is managed when elements are added/removed
- [ ] Dynamic content changes are announced
- [ ] Color contrast meets WCAG AA (4.5:1 for text)

### 11.2 Sprint 2 Guidelines (Onboarding)

**Priority Order:**
1. Create database migration
2. Add types to shared package
3. Create API routes
4. Create `useOnboarding` hook
5. Build step components
6. Build wizard container
7. Add trigger to dashboard layout
8. Add analytics events

**Design Decisions:**
- Onboarding is modal (full-screen overlay)
- Progress saves after each step
- Skip is always available
- Can resume from settings if skipped

### 11.3 Sprint 3 Guidelines (Command Palette)

**Priority Order:**
1. Install cmdk and fuse.js
2. Create database migration for search history
3. Create search API route
4. Create `useGlobalSearch` hook
5. Build `CommandPalette` component
6. Add keyboard shortcuts
7. Integrate with layout

**Performance Requirements:**
- Empty state renders in <50ms
- Client-side results in <100ms
- Server-side results in <300ms
- Debounce input by 150ms

### 11.4 Sprint 4 Guidelines (Mobile)

**Priority Order:**
1. Implement responsive patterns in existing components
2. Build `MobileBottomNav` enhancements
3. Build `TaskDetailDialog` for mobile
4. Build `MobileBoardTabs` for kanban
5. Add swipe gesture support
6. Test on real devices

**Testing Requirements:**
- Test on iPhone SE (375px)
- Test on iPhone 14 (390px)
- Test on iPad (768px)
- Verify 44px touch targets
- Verify safe area handling

### 11.5 Sprint 5 Guidelines (Recurring Tasks)

**Priority Order:**
1. Install rrule library
2. Create database migration
3. Add types to shared package
4. Create recurrence utility functions
5. Build `RecurrencePicker` component
6. Create API routes
7. Update task form to include picker
8. Update task card to show badge
9. Handle completion flow

**Edge Cases to Handle:**
- Completing task with no more occurrences
- Editing parent vs instance
- Deleting recurring task
- Changing recurrence rule mid-series
- Timezone handling

---

## 12. Tech Lead Decisions

### 12.1 Answers to UX Team Questions

**Q1: Should we block other features until accessibility reaches 100%?**

**A: No, but prioritize accessibility fixes within each sprint.**

Rationale:
- Sprint 1 is dedicated to accessibility remediation
- Each subsequent sprint should include accessibility testing
- Ship incrementally but ensure each release maintains accessibility standards
- Block merges that introduce new accessibility violations

**Q2: What onboarding analytics events should we track?**

**A: Track all suggested events plus additional context:**

```typescript
// Recommended events
'onboarding_started' - with { source: 'signup' | 'invite' }
'onboarding_step_completed' - with { step: number, duration_ms: number }
'onboarding_step_skipped' - with { step: number }
'onboarding_skipped' - with { at_step: number }
'onboarding_completed' - with { total_duration_ms: number }
'onboarding_first_task_created' - with { used_quick_add_syntax: boolean }
'onboarding_resumed' - with { from_step: number }
```

**Q3: Should command palette search include calendar events, team members, documents?**

**A: Phase 1: No. Phase 2: Yes.**

Phase 1 (Sprint 3):
- Tasks ✅
- Projects ✅
- Grants ✅
- Publications ✅
- Navigation ✅
- Quick actions ✅

Phase 2 (Future sprint):
- Calendar events (requires Google Calendar API changes)
- Team members (useful for @mentions)
- Documents (requires embeddings search)

**Q4: Should we support recurring projects/milestones/reminders?**

**A: Not in Phase 9B. Defer to future phase.**

Rationale:
- Recurring tasks are the most requested feature
- Projects have different lifecycle (stages, milestones)
- Milestones are date-anchored, not repeating
- Reminders can be achieved with recurring tasks
- Keep scope manageable

**Q5: Should we add PWA manifest and service worker for offline support?**

**A: Yes, but as a separate initiative after Phase 9B.**

Rationale:
- PWA support requires careful offline state management
- Current architecture relies on server state
- Would need offline-first data layer changes
- Valuable for mobile users
- Recommend Phase 10 or dedicated initiative

### 12.2 Technical Trade-offs Made

| Decision | Choice | Alternative | Rationale |
|----------|--------|-------------|-----------|
| Announcer state | Context | Zustand | Simpler, UI-only, no persistence needed |
| Search | Hybrid client+server | Server-only | Instant feedback for common actions |
| Command palette | cmdk | Custom | Battle-tested, accessible, maintained |
| Recurrence | rrule library | Custom | RFC 5545 compliant, complex patterns |
| Mobile nav | Component switching | CSS-only | Different UX requirements per platform |
| Recurring task generation | On completion | Pre-generate | Bounded, creates real tasks |

### 12.3 Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Accessibility regressions | Medium | High | Automated axe tests in CI |
| Onboarding abandonment | Medium | Medium | Skip always available, resume from settings |
| Command palette performance | Low | Medium | Client-side caching, debouncing |
| Mobile layout issues | Medium | Medium | Real device testing, responsive preview |
| Recurring task data growth | Low | Low | Generate on demand, cleanup old instances |

### 12.4 Success Metrics

| Sprint | Metric | Target |
|--------|--------|--------|
| 1 | Lighthouse accessibility score | ≥95 |
| 1 | axe-core violations | 0 |
| 2 | Onboarding completion rate | >60% (from ~40%) |
| 2 | Bounce rate | <40% (from ~60%) |
| 3 | Command palette usage | >20% daily active users |
| 3 | Search to action time | <2 seconds |
| 4 | Mobile Lighthouse score | ≥90 |
| 4 | Mobile session duration | +20% |
| 5 | Recurring task adoption | >30% of active users |

---

## Appendix A: File Change Summary

### New Files

```
apps/web/
├── components/
│   ├── accessibility/
│   │   └── announcer.tsx
│   ├── onboarding/
│   │   ├── onboarding-wizard.tsx
│   │   ├── onboarding-progress.tsx
│   │   ├── onboarding-skip-button.tsx
│   │   └── steps/
│   │       ├── welcome-step.tsx
│   │       ├── profile-step.tsx
│   │       ├── workspace-step.tsx
│   │       ├── first-task-step.tsx
│   │       └── completion-step.tsx
│   ├── search/
│   │   ├── command-palette.tsx
│   │   ├── command-palette-trigger.tsx
│   │   ├── search-results/
│   │   │   ├── search-result-group.tsx
│   │   │   ├── task-search-result.tsx
│   │   │   ├── project-search-result.tsx
│   │   │   ├── grant-search-result.tsx
│   │   │   └── navigation-result.tsx
│   │   ├── recent-searches.tsx
│   │   └── search-empty-state.tsx
│   ├── tasks/
│   │   ├── recurrence/
│   │   │   ├── recurrence-picker.tsx
│   │   │   ├── recurrence-presets.tsx
│   │   │   ├── recurrence-custom.tsx
│   │   │   ├── recurrence-badge.tsx
│   │   │   └── recurrence-edit-dialog.tsx
│   │   └── task-detail-dialog.tsx
│   └── layout/
│       └── mobile-more-menu.tsx
├── lib/
│   ├── hooks/
│   │   ├── use-keyboard-navigation.ts
│   │   ├── use-onboarding.ts
│   │   ├── use-global-search.ts
│   │   └── use-swipe-gesture.ts
│   ├── utils/
│   │   └── recurrence.ts
│   └── analytics/
│       └── onboarding-events.ts
└── app/
    └── api/
        ├── onboarding/
        │   └── route.ts
        ├── search/
        │   ├── route.ts
        │   └── history/
        │       └── route.ts
        └── tasks/
            └── [id]/
                ├── occurrences/
                │   └── route.ts
                └── recurrence/
                    └── route.ts

supabase/migrations/
├── 20260115000000_onboarding_tracking.sql
├── 20260118000000_search_history.sql
└── 20260120000000_recurring_tasks.sql
```

### Modified Files

```
apps/web/
├── app/
│   ├── layout.tsx                    # Add AnnouncerProvider
│   ├── globals.css                   # Color contrast fixes
│   └── (dashboard)/
│       ├── layout.tsx                # Add onboarding trigger
│       └── board/page.tsx            # Keyboard instructions
├── components/
│   ├── tasks/
│   │   ├── task-card.tsx             # ARIA, keyboard, recurrence badge
│   │   ├── task-detail-drawer.tsx    # ARIA, focus trap, responsive
│   │   ├── task-list.tsx             # Keyboard navigation
│   │   ├── bulk-actions-toolbar.tsx  # Announcements
│   │   ├── quick-add.tsx             # ARIA labels
│   │   └── task-form.tsx             # Recurrence picker
│   ├── projects/
│   │   ├── project-card.tsx          # ARIA labels
│   │   ├── project-notes.tsx         # AlertDialog
│   │   └── milestone-list.tsx        # AlertDialog
│   ├── ui/
│   │   ├── button.tsx                # Disabled contrast
│   │   ├── dropdown-menu.tsx         # Keyboard navigation
│   │   ├── tooltip.tsx               # ARIA role
│   │   ├── empty-state.tsx           # aria-hidden
│   │   └── pagination.tsx            # Announcements
│   └── layout/
│       ├── sidebar.tsx               # ARIA expanded
│       └── mobile-nav.tsx            # Enhanced
└── lib/
    └── hooks/
        └── use-tasks.ts              # Recurrence handling

packages/shared/src/
├── types/index.ts                    # New types
└── schemas/index.ts                  # New schemas
```

---

## Appendix B: Dependency Versions

```json
{
  "dependencies": {
    "cmdk": "^1.0.0",
    "fuse.js": "^7.0.0",
    "rrule": "^2.8.1"
  },
  "devDependencies": {
    "@axe-core/playwright": "^4.9.0",
    "@axe-core/react": "^4.9.0",
    "jest-axe": "^9.0.0"
  }
}
```

---

**Document Complete**

Tech Lead
January 14, 2026

---

*Next Steps:*
1. Review this document with the development team
2. Create tickets in project management system
3. Begin Sprint 1 implementation
4. Schedule architecture review after Sprint 1 completion
