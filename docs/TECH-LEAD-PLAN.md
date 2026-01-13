# Tech Lead Plan: ScholarOS Technical Architecture & Implementation Roadmap

**Prepared By:** Tech Lead
**Date:** January 12, 2026
**Version:** 1.0
**Status:** Post-Phase 8 Analysis & Phase 9+ Planning

---

## Executive Summary

ScholarOS has successfully completed **Phases 0-8**, delivering a production-ready AI-native academic operations platform. This document provides:

1. **Current Architecture Assessment** - Evaluation of existing technical foundation
2. **Technical Debt Analysis** - Identified issues requiring resolution
3. **Phase 9+ Roadmap** - Prioritized technical initiatives aligned with UX optimization
4. **Implementation Specifications** - Detailed technical guidance for upcoming work

### Key Findings

✅ **Strengths:**
- Solid architectural foundation (Next.js 15, Supabase, TypeScript)
- Comprehensive feature set (task management, projects, AI, analytics)
- Good separation of concerns (monorepo, shared packages)
- Production deployment infrastructure (Vercel, CI/CD)

⚠️ **Critical Technical Debt:**
- 30 documented issues (4 critical, 8 high priority)
- Accessibility gaps (WCAG 2.1 AA not fully compliant)
- Inconsistent data fetching patterns (server vs client-side)
- Missing error boundaries and loading states
- No comprehensive E2E test coverage

🎯 **Recommended Focus:**
- **Phase 9A:** Fix critical bugs and technical debt (2-3 weeks)
- **Phase 9B:** UX optimization with technical foundation (3-4 weeks)
- **Phase 9C:** Performance & scalability improvements (2-3 weeks)

---

## Table of Contents

1. [Current Architecture Assessment](#1-current-architecture-assessment)
2. [Technical Debt Analysis](#2-technical-debt-analysis)
3. [Critical Bug Fixes](#3-critical-bug-fixes)
4. [Phase 9 Technical Roadmap](#4-phase-9-technical-roadmap)
5. [Database Architecture Recommendations](#5-database-architecture-recommendations)
6. [Frontend Architecture Improvements](#6-frontend-architecture-improvements)
7. [Backend & API Optimization](#7-backend--api-optimization)
8. [Security & Performance](#8-security--performance)
9. [Testing Strategy](#9-testing-strategy)
10. [Implementation Specifications](#10-implementation-specifications)
11. [Team Coordination](#11-team-coordination)

---

## 1. Current Architecture Assessment

### 1.1 Technology Stack Evaluation

| Component | Current | Assessment | Recommendation |
|-----------|---------|------------|----------------|
| **Frontend Framework** | Next.js 15.1.0 | ✅ Excellent choice | Keep, leverage App Router features |
| **UI Library** | React 19.x | ✅ Latest stable | Keep, use Server Components more |
| **Styling** | Tailwind + shadcn/ui | ✅ Modern, accessible | Keep, expand design system |
| **Server State** | TanStack Query 5.x | ✅ Industry standard | Keep, improve patterns |
| **Client State** | Zustand 5.0.0 | ✅ Lightweight | Keep, document patterns |
| **Database** | Supabase (PostgreSQL) | ✅ Excellent fit | Keep, optimize queries |
| **AI Service** | Python FastAPI | ⚠️ Separate deployment | Consider consolidation |
| **Monorepo** | Turborepo + pnpm | ✅ Good setup | Keep, optimize builds |

**Overall Grade: A-** (Strong foundation, minor optimizations needed)

### 1.2 Architecture Pattern Analysis

**Current Pattern:** Hybrid SSR/CSR with API Routes

```
Browser → Next.js Frontend (React Server + Client Components)
          ↓
          ├─→ Next.js API Routes → Supabase
          ├─→ Supabase Direct (Realtime)
          └─→ Python FastAPI (AI)
```

**Strengths:**
- Clear separation of concerns
- Leverages Supabase RLS for security
- Supports real-time updates
- AI service isolated for scaling

**Weaknesses:**
- Inconsistent data fetching (some pages use server-side, others client-side)
- No unified error handling strategy
- Missing API response caching layer
- AI service requires separate deployment

### 1.3 Code Quality Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| **TypeScript Coverage** | ~95% | >95% | ✅ Good |
| **Test Coverage** | ~30% | >80% | ❌ Needs work |
| **E2E Test Coverage** | <10% | >60% | ❌ Critical gap |
| **Accessibility Score** | ~75 | >90 | ⚠️ Needs improvement |
| **Performance (Lighthouse)** | ~85 | >90 | ⚠️ Good, can improve |
| **Bundle Size** | ~180KB gzip | <150KB | ⚠️ Optimize |

---

## 2. Technical Debt Analysis

### 2.1 Critical Issues (Must Fix Before Phase 9)

Based on [COMPREHENSIVE_ISSUE_REPORT.md](COMPREHENSIVE_ISSUE_REPORT.md), prioritized by impact:

#### 🔴 P0 - Critical (Block Production Use)

| Issue | Impact | Effort | Priority |
|-------|--------|--------|----------|
| **Quick-Add Same-Day Bug** | Users schedule tasks 7 days late | 2 hours | 1 |
| **Publication View Modal Missing** | Cannot view/edit imported publications | 1 day | 2 |
| **Onboarding Flow Not Integrated** | New user drop-off | 3 days | 3 |
| **Recurring Tasks Missing** | Teaching faculty can't automate tasks | 5 days | 4 |

#### 🟠 P1 - High (Significant User Impact)

| Issue | Impact | Effort | Priority |
|-------|--------|--------|----------|
| **Grant Filter State Not Persisted** | Frustrating UX, wasted effort | 2 hours | 5 |
| **Timezone Support Missing** | International users see wrong times | 1 day | 6 |
| **Mobile Task Creation Difficult** | Mobile users struggle | 2 days | 7 |
| **No Bulk Delete Confirmation** | Accidental data loss | 1 hour | 8 |

#### 🟡 P2 - Medium (Quality of Life)

| Issue | Impact | Effort | Priority |
|-------|--------|--------|----------|
| **Analytics Loading Performance** | Slow dashboard | 1 day | 9 |
| **Search Functionality Missing** | Hard to find items | 3 days | 10 |
| **Keyboard Shortcuts Incomplete** | Power users slowed down | 2 days | 11 |
| **Dark Mode Missing** | Eye strain for some users | 3 days | 12 |

### 2.2 Technical Debt Breakdown

**Total Estimated Technical Debt:** ~25 days (5 weeks) of engineering effort

**Breakdown by Category:**
- **Data Layer:** 8 days (timezone support, recurring tasks schema, search indexing)
- **UI/UX:** 10 days (onboarding, mobile optimization, dark mode)
- **Backend/API:** 4 days (caching, performance optimization)
- **Testing:** 3 days (E2E tests for critical paths)

---

## 3. Critical Bug Fixes

### 3.1 Quick-Add Same-Day Parsing Bug (2 hours)

**File:** `packages/shared/src/utils/index.ts`

**Current Code (BUGGY):**
```typescript
function getNextDayOfWeek(dayIndex: number): Date {
  const today = new Date();
  const currentDay = today.getDay();
  let daysUntil = dayIndex - currentDay;

  // BUG: If daysUntil === 0 (today), this adds 7 days
  if (daysUntil <= 0) {
    daysUntil += 7;
  }

  const nextDay = new Date(today);
  nextDay.setDate(today.getDate() + daysUntil);
  return nextDay;
}
```

**Fixed Code:**
```typescript
function getNextDayOfWeek(dayIndex: number): Date {
  const today = new Date();
  const currentDay = today.getDay();
  let daysUntil = dayIndex - currentDay;

  // FIXED: If daysUntil === 0 (today), keep it as today
  if (daysUntil < 0) {
    daysUntil += 7;
  }

  const targetDay = new Date(today);
  targetDay.setDate(today.getDate() + daysUntil);
  targetDay.setHours(23, 59, 59, 999); // End of day
  return targetDay;
}
```

**Test Cases:**
```typescript
// Add to packages/shared/src/utils/index.test.ts
describe('getNextDayOfWeek', () => {
  beforeEach(() => {
    // Mock date to Friday, Jan 12, 2026
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-16T10:00:00Z')); // Friday
  });

  it('should return today when day-of-week matches today', () => {
    const result = getNextDayOfWeek(5); // Friday
    expect(result.getDay()).toBe(5);
    expect(result.getDate()).toBe(16); // Same day, not +7
  });

  it('should return next occurrence when day-of-week is in the past', () => {
    const result = getNextDayOfWeek(1); // Monday
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(19); // Next Monday (+3 days)
  });

  afterEach(() => {
    jest.useRealTimers();
  });
});
```

**Deployment:** Immediate hotfix, low risk.

### 3.2 Grant Filter State Not Persisted (2 hours)

**File:** `apps/web/app/(dashboard)/grants/page.tsx`

**Problem:** Filters reset on refresh, frustrating UX.

**Solution:** Use URL search params (like projects page does).

**Implementation:**
```typescript
// Current (client state only)
const [keywords, setKeywords] = useState("");
const [agency, setAgency] = useState("all");

// Fixed (URL-synced state)
import { useSearchParams, useRouter } from "next/navigation";

const searchParams = useSearchParams();
const router = useRouter();

const keywords = searchParams.get("keywords") || "";
const agency = searchParams.get("agency") || "all";

const updateFilter = (key: string, value: string) => {
  const params = new URLSearchParams(searchParams.toString());
  if (value) {
    params.set(key, value);
  } else {
    params.delete(key);
  }
  router.push(`/grants?${params.toString()}`, { scroll: false });
};
```

**Benefits:**
- Shareable filter URLs
- Browser back/forward works correctly
- Persists across page refreshes
- Matches projects page behavior

### 3.3 Bulk Delete Confirmation Missing (1 hour)

**File:** `apps/web/components/tasks/bulk-actions-toolbar.tsx`

**Problem:** Bulk delete has no confirmation dialog, risky.

**Solution:** Add confirmation dialog before bulk delete.

**Implementation:**
```typescript
// Add state for confirmation
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

// Update bulk delete button
<button
  onClick={() => setShowDeleteConfirm(true)} // Changed from direct delete
  disabled={selectedTasks.size === 0}
  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
>
  <Trash2 className="h-4 w-4" />
  Delete ({selectedTasks.size})
</button>

// Add confirmation dialog
<ConfirmDialog
  isOpen={showDeleteConfirm}
  onClose={() => setShowDeleteConfirm(false)}
  onConfirm={handleBulkDelete}
  title="Delete Tasks"
  description={`Are you sure you want to delete ${selectedTasks.size} tasks? This action cannot be undone.`}
  confirmText="Delete All"
  variant="destructive"
/>
```

---

## 4. Phase 9 Technical Roadmap

### 4.1 Overview

**Phase 9: Production Hardening & UX Optimization**

**Timeline:** 8-10 weeks
**Focus:** Fix technical debt, improve UX, ensure scalability

### 4.2 Phase Breakdown

#### **Phase 9A: Critical Fixes & Technical Debt** (2-3 weeks)

**Goal:** Resolve all P0 and P1 issues before proceeding with new features.

**Week 1-2: Critical Bugs**
- [ ] Fix quick-add same-day parsing bug
- [ ] Implement publication view/edit modal
- [ ] Add grant filter URL persistence
- [ ] Add bulk delete confirmation
- [ ] Fix timezone support (use Luxon or date-fns-tz)
- [ ] Improve mobile task creation UX

**Week 3: Onboarding & Foundation**
- [ ] Create onboarding wizard component
- [ ] Integrate onboarding into first-run experience
- [ ] Add comprehensive error boundaries
- [ ] Implement global loading states

**Deliverables:**
- All P0 and P1 bugs resolved
- User onboarding flow functional
- Improved error handling

---

#### **Phase 9B: UX Optimization (Aligned with UX Engineer)** (3-4 weeks)

**Goal:** Implement UX improvements identified in [UX-HANDOFF.md](UX-HANDOFF.md).

**Week 4-5: Accessibility & Mobile**
- [ ] WCAG 2.1 AA compliance audit remediation
- [ ] Kanban keyboard navigation
- [ ] Screen reader support for charts
- [ ] Mobile responsive improvements
- [ ] Touch target size optimization (min 44x44px)

**Week 6-7: Search & Navigation**
- [ ] Global search implementation (Cmd+F)
  - Full-text search across tasks, projects, people
  - Fuzzy matching with Fuse.js
  - Search result ranking
  - Keyboard navigation
- [ ] Enhanced empty states
- [ ] Improved navigation patterns

**Deliverables:**
- WCAG 2.1 AA compliant
- Global search functional
- Mobile usability score >85 (Lighthouse)

---

#### **Phase 9C: Performance & Scalability** (2-3 weeks)

**Goal:** Optimize performance, prepare for scale.

**Week 8-9: Performance Optimization**
- [ ] Implement React Query caching strategy
- [ ] Optimize database queries (add indexes)
- [ ] Implement virtual scrolling for long lists
- [ ] Bundle size optimization (code splitting)
- [ ] Image optimization (Next.js Image component)
- [ ] Analytics query performance (database views)

**Week 10: Testing & Monitoring**
- [ ] E2E test suite (Playwright)
  - Critical user journeys (signup → first task)
  - Task CRUD operations
  - Multi-tenant isolation testing
- [ ] Performance monitoring (Vercel Analytics + custom)
- [ ] Error tracking (Sentry integration)
- [ ] Logging strategy (structured logs)

**Deliverables:**
- Lighthouse score >90 across all metrics
- E2E test coverage >60%
- Monitoring and alerting operational

---

### 4.3 Success Metrics

| Metric | Current | Phase 9 Target | Measurement |
|--------|---------|----------------|-------------|
| **Critical Bugs** | 4 | 0 | Issue tracker |
| **High Priority Bugs** | 8 | 0 | Issue tracker |
| **Accessibility Score** | ~75 | >90 | Lighthouse |
| **Mobile Usability** | ~70 | >85 | Lighthouse |
| **Test Coverage** | ~30% | >80% | Vitest |
| **E2E Coverage** | <10% | >60% | Playwright |
| **Bundle Size** | ~180KB | <150KB | webpack-bundle-analyzer |
| **API Response Time (p95)** | ~300ms | <200ms | Monitoring |
| **User Onboarding Completion** | N/A | >70% | Analytics |

---

## 5. Database Architecture Recommendations

### 5.1 Current Schema Assessment

**Strengths:**
- Well-normalized structure
- Proper foreign key relationships
- RLS policies for multi-tenancy
- pgvector for AI embeddings

**Gaps:**
- No timezone support (all timestamps UTC, no user timezone field)
- No recurring tasks support (no recurrence fields)
- No full-text search indexes
- Missing performance indexes for common queries

### 5.2 Recommended Schema Changes

#### **5.2.1 Add Timezone Support**

```sql
-- Add to profiles table
ALTER TABLE profiles
ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC';

-- Add index
CREATE INDEX idx_profiles_timezone ON profiles(timezone);

-- Update functions to respect timezone
-- (Handled in application layer with Luxon)
```

#### **5.2.2 Add Recurring Tasks**

```sql
-- Add to tasks table
ALTER TABLE tasks
ADD COLUMN recurrence_rule JSONB NULL,
ADD COLUMN recurrence_parent_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE;

-- Example recurrence_rule structure:
-- {
--   "frequency": "weekly",
--   "interval": 1,
--   "byweekday": [1, 3, 5],  -- Mon, Wed, Fri
--   "until": "2026-12-31",
--   "count": 10
-- }

-- Index for finding recurring tasks
CREATE INDEX idx_tasks_recurring ON tasks(is_recurring) WHERE is_recurring = TRUE;
CREATE INDEX idx_tasks_recurrence_parent ON tasks(recurrence_parent_id) WHERE recurrence_parent_id IS NOT NULL;
```

#### **5.2.3 Add Full-Text Search**

```sql
-- Add tsvector column for full-text search
ALTER TABLE tasks
ADD COLUMN search_vector tsvector;

-- Create index
CREATE INDEX idx_tasks_search ON tasks USING GIN(search_vector);

-- Update function to maintain search_vector
CREATE OR REPLACE FUNCTION tasks_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER tasks_search_vector_trigger
BEFORE INSERT OR UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION tasks_search_vector_update();

-- Backfill existing tasks
UPDATE tasks SET search_vector =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B');
```

#### **5.2.4 Performance Indexes**

```sql
-- Add missing indexes for common queries
CREATE INDEX idx_tasks_workspace_status ON tasks(workspace_id, status);
CREATE INDEX idx_tasks_workspace_due ON tasks(workspace_id, due) WHERE due IS NOT NULL;
CREATE INDEX idx_tasks_workspace_priority ON tasks(workspace_id, priority);
CREATE INDEX idx_tasks_assignees ON tasks USING GIN(assignees);

-- Analytics queries
CREATE INDEX idx_tasks_created_at ON tasks(created_at);
CREATE INDEX idx_tasks_completed_at ON tasks(completed_at) WHERE completed_at IS NOT NULL;

-- Project queries
CREATE INDEX idx_projects_workspace_status ON projects(workspace_id, status);
```

#### **5.2.5 Create Analytics Views**

```sql
-- Pre-computed analytics view for performance
CREATE MATERIALIZED VIEW workspace_analytics_mv AS
SELECT
  workspace_id,
  COUNT(*) FILTER (WHERE status = 'todo') AS tasks_todo,
  COUNT(*) FILTER (WHERE status = 'progress') AS tasks_progress,
  COUNT(*) FILTER (WHERE status = 'done') AS tasks_done,
  COUNT(*) FILTER (WHERE priority = 'p1') AS tasks_p1,
  COUNT(*) FILTER (WHERE priority = 'p2') AS tasks_p2,
  COUNT(*) FILTER (WHERE priority = 'p3') AS tasks_p3,
  COUNT(*) FILTER (WHERE priority = 'p4') AS tasks_p4,
  COUNT(DISTINCT assignees) AS unique_assignees,
  MAX(updated_at) AS last_activity
FROM tasks
GROUP BY workspace_id;

-- Index on materialized view
CREATE UNIQUE INDEX idx_workspace_analytics_mv ON workspace_analytics_mv(workspace_id);

-- Refresh function (call periodically or on-demand)
CREATE OR REPLACE FUNCTION refresh_workspace_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY workspace_analytics_mv;
END;
$$ LANGUAGE plpgsql;

-- Auto-refresh every hour (via pg_cron or external cron)
-- Or trigger refresh on-demand from API
```

### 5.3 Migration Strategy

**Approach:** Zero-downtime migrations with rollback plan.

```typescript
// Migration template
export async function up(supabase: SupabaseClient) {
  // 1. Add new columns/tables (backwards compatible)
  await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE tasks ADD COLUMN IF NOT EXISTS timezone VARCHAR(50);'
  });

  // 2. Backfill data if needed
  await supabase.rpc('exec_sql', {
    sql: 'UPDATE tasks SET timezone = \'UTC\' WHERE timezone IS NULL;'
  });

  // 3. Add constraints/indexes (performance optimization)
  await supabase.rpc('exec_sql', {
    sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_timezone ON tasks(timezone);'
  });
}

export async function down(supabase: SupabaseClient) {
  // Rollback steps
  await supabase.rpc('exec_sql', {
    sql: 'DROP INDEX IF EXISTS idx_tasks_timezone;'
  });

  await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE tasks DROP COLUMN IF EXISTS timezone;'
  });
}
```

---

## 6. Frontend Architecture Improvements

### 6.1 Data Fetching Standardization

**Problem:** Inconsistent patterns (some pages use server-side, others client-side).

**Solution:** Establish clear patterns for each use case.

#### **Pattern 1: Static Data (Infrequent Updates)**

Use Server Components + Server-side fetch:

```typescript
// app/(dashboard)/publications/page.tsx
export default async function PublicationsPage() {
  const supabase = await createClient();
  const { data: publications } = await supabase
    .from('publications')
    .select('*')
    .order('year', { ascending: false });

  return <PublicationsList publications={publications} />;
}
```

**Use When:**
- Data changes infrequently
- SEO important
- Initial load performance critical

#### **Pattern 2: Dynamic Data (Frequent Updates)**

Use Client Components + TanStack Query:

```typescript
// components/tasks/task-list.tsx
'use client';

export function TaskList() {
  const { data: tasks, isLoading } = useTasks({
    workspace_id: currentWorkspaceId
  });

  // ...
}
```

**Use When:**
- Real-time updates needed
- User interactions trigger refetches
- Optimistic UI updates required

#### **Pattern 3: Hybrid (Initial SSR + Client Hydration)**

Use Server Components for initial data + Client Components for interactivity:

```typescript
// app/(dashboard)/today/page.tsx
export default async function TodayPage() {
  const initialTasks = await fetchTodayTasks(); // Server-side

  return <TodayView initialTasks={initialTasks} />; // Client-side
}

// components/today/today-view.tsx
'use client';

export function TodayView({ initialTasks }: { initialTasks: Task[] }) {
  const { data: tasks = initialTasks } = useTasks({
    due: 'today',
    initialData: initialTasks // Hydrate from server
  });

  // ...
}
```

**Use When:**
- Best of both worlds needed
- Fast initial render + dynamic updates
- SEO + interactivity

### 6.2 Error Boundary Strategy

**Problem:** No global error handling, crashes break entire app.

**Solution:** Implement error boundaries at key levels.

```typescript
// app/error.tsx (Root error boundary)
'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to error tracking service (Sentry)
    console.error('Global error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Something went wrong!</h2>
            <button onClick={reset} className="mt-4 btn-primary">
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

// app/(dashboard)/error.tsx (Dashboard error boundary)
'use client';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <h2 className="text-xl font-semibold">Dashboard Error</h2>
      <p className="text-muted-foreground mt-2">{error.message}</p>
      <button onClick={reset} className="mt-4 btn-primary">
        Reload Dashboard
      </button>
    </div>
  );
}

// app/(dashboard)/tasks/error.tsx (Feature-level error boundary)
'use client';

export default function TasksError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-6">
      <h3 className="font-semibold text-destructive">Failed to load tasks</h3>
      <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
      <button onClick={reset} className="mt-4 btn-outline">
        Retry
      </button>
    </div>
  );
}
```

### 6.3 Loading State Strategy

**Problem:** Inconsistent loading states, some pages have spinners, others don't.

**Solution:** Unified loading component system.

```typescript
// app/(dashboard)/loading.tsx
export default function DashboardLoading() {
  return <DashboardSkeleton />;
}

// components/skeletons/dashboard-skeleton.tsx
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-32 rounded-2xl animate-pulse bg-muted" />
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl animate-pulse bg-muted" />
        ))}
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-20 rounded-xl animate-pulse bg-muted" />
        ))}
      </div>
    </div>
  );
}
```

### 6.4 Component Architecture Guidelines

**Principle:** Separation of concerns with clear boundaries.

```
components/
├── ui/              # Primitive components (shadcn/ui)
│   ├── button.tsx
│   ├── dialog.tsx
│   └── ...
├── tasks/           # Feature components
│   ├── task-card.tsx          # Presentation
│   ├── task-list.tsx          # Container (data + presentation)
│   ├── task-filters.tsx       # Interactive UI
│   └── use-task-filters.ts    # Business logic hook
├── analytics/       # Feature components
│   ├── analytics-dashboard.tsx
│   ├── chart-components.tsx
│   └── use-analytics.ts
└── layout/          # Layout components
    ├── sidebar.tsx
    ├── header.tsx
    └── ...
```

**Rules:**
1. **Primitive components** (`ui/`) are stateless, reusable, accessible
2. **Feature components** (`tasks/`, `analytics/`) contain business logic
3. **Hooks** (`use-*.ts`) extract reusable logic
4. **No prop drilling** beyond 2 levels (use Context or Zustand)
5. **TypeScript interfaces** in separate `.types.ts` files for reuse

---

## 7. Backend & API Optimization

### 7.1 API Response Caching

**Problem:** Analytics and other expensive queries re-compute on every request.

**Solution:** Implement caching layer.

```typescript
// lib/cache.ts
import { Redis } from '@upstash/redis'; // Or use Vercel KV

const redis = Redis.fromEnv();

export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 60 // seconds
): Promise<T> {
  // Try cache first
  const cached = await redis.get<T>(key);
  if (cached) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetcher();

  // Cache for next time
  await redis.set(key, data, { ex: ttl });

  return data;
}

// app/api/analytics/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspace_id");
  const period = searchParams.get("period") || "30d";

  return withCache(
    `analytics:${workspaceId}:${period}`,
    async () => {
      // Expensive analytics computation
      return computeAnalytics(workspaceId, period);
    },
    300 // Cache for 5 minutes
  );
}
```

### 7.2 Rate Limiting Improvements

**Current:** Basic rate limiting exists but could be more sophisticated.

**Enhancement:** Add tiered rate limiting based on user role.

```typescript
// lib/rate-limit.ts
export const RATE_LIMIT_CONFIGS = {
  read: {
    owner: { requests: 1000, window: 60 }, // 1000 req/min
    admin: { requests: 500, window: 60 },
    member: { requests: 200, window: 60 },
    limited: { requests: 100, window: 60 },
    anonymous: { requests: 10, window: 60 },
  },
  write: {
    owner: { requests: 200, window: 60 },
    admin: { requests: 100, window: 60 },
    member: { requests: 50, window: 60 },
    limited: { requests: 10, window: 60 },
    anonymous: { requests: 0, window: 60 }, // No writes
  },
  ai: {
    owner: { requests: 50, window: 60 },
    admin: { requests: 30, window: 60 },
    member: { requests: 20, window: 60 },
    limited: { requests: 5, window: 60 },
    anonymous: { requests: 0, window: 60 },
  },
};

export async function checkRateLimit(
  userId: string,
  operation: 'read' | 'write' | 'ai',
  role: 'owner' | 'admin' | 'member' | 'limited' | 'anonymous'
) {
  const config = RATE_LIMIT_CONFIGS[operation][role];
  // ... implementation
}
```

### 7.3 API Versioning Strategy

**Current:** No API versioning (all endpoints are `/api/*`).

**Recommendation:** Add versioning for future-proofing.

```typescript
// app/api/v1/tasks/route.ts
export async function GET(request: Request) {
  // Version 1 implementation
}

// app/api/v2/tasks/route.ts (future)
export async function GET(request: Request) {
  // Version 2 with breaking changes
}

// Client specifies version via header or path
fetch('/api/v1/tasks', {
  headers: { 'X-API-Version': 'v1' }
});
```

---

## 8. Security & Performance

### 8.1 Security Audit Checklist

- [ ] **RLS Policies:** Review all RLS policies for gaps
- [ ] **Input Validation:** All API endpoints use Zod validation
- [ ] **XSS Prevention:** All user input sanitized
- [ ] **CSRF Protection:** Next.js handles automatically, verify
- [ ] **Rate Limiting:** Applied to all endpoints
- [ ] **API Key Rotation:** AI service keys rotated regularly
- [ ] **Dependency Audit:** `pnpm audit` shows no critical issues
- [ ] **Secret Management:** All secrets in environment variables, not code

### 8.2 Performance Optimization Targets

| Metric | Current | Target | Strategy |
|--------|---------|--------|----------|
| **TTFB** | ~300ms | <200ms | Server-side caching, optimize queries |
| **FCP** | ~1.2s | <1.0s | Reduce bundle size, defer non-critical JS |
| **LCP** | ~2.1s | <1.8s | Image optimization, lazy loading |
| **TTI** | ~2.8s | <2.5s | Code splitting, reduce JS execution |
| **CLS** | ~0.05 | <0.05 | ✅ Good, maintain |
| **FID** | ~50ms | <50ms | ✅ Good, maintain |

**Implementation Plan:**

1. **Bundle Size Reduction:**
   ```bash
   # Analyze bundle
   pnpm run build && pnpm run analyze

   # Strategies:
   # - Dynamic imports for heavy components
   # - Remove unused dependencies (check with depcheck)
   # - Use lighter alternatives (e.g., date-fns instead of moment)
   ```

2. **Image Optimization:**
   ```typescript
   // Use Next.js Image component everywhere
   import Image from 'next/image';

   <Image
     src="/logo.png"
     alt="ScholarOS Logo"
     width={100}
     height={100}
     priority={isAboveFold}
   />
   ```

3. **Database Query Optimization:**
   ```sql
   -- Analyze slow queries
   SELECT * FROM pg_stat_statements
   ORDER BY mean_exec_time DESC
   LIMIT 10;

   -- Add indexes for identified slow queries
   ```

---

## 9. Testing Strategy

### 9.1 Testing Pyramid

```
         /\
        /E2E\       10% - Critical user journeys (Playwright)
       /------\
      /        \
     /Integration\ 30% - API routes, hooks (Vitest)
    /------------\
   /              \
  /   Unit Tests   \ 60% - Utils, components (Vitest)
 /------------------\
```

### 9.2 Unit Testing (Vitest)

**Target:** 80% coverage for utility functions and hooks.

```typescript
// packages/shared/src/utils/index.test.ts
import { describe, it, expect, beforeEach, afterEach, jest } from 'vitest';
import { parseQuickAdd, getNextDayOfWeek } from './index';

describe('Quick-Add Parser', () => {
  describe('parseQuickAdd', () => {
    it('should parse task with all attributes', () => {
      const result = parseQuickAdd('Review paper fri #research p1 @john +proj-123');

      expect(result).toEqual({
        title: 'Review paper',
        due: expect.any(Date),
        category: 'research',
        priority: 'p1',
        assignees: ['john'],
        project_id: 'proj-123',
      });
    });

    it('should handle same-day due date correctly', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-16T10:00:00Z')); // Friday

      const result = parseQuickAdd('Meeting fri'); // Same day
      const expectedDate = new Date('2026-01-16T23:59:59Z');

      expect(result.due).toEqual(expectedDate);

      jest.useRealTimers();
    });

    it('should default to p3 priority if not specified', () => {
      const result = parseQuickAdd('Simple task');
      expect(result.priority).toBe('p3');
    });
  });

  describe('getNextDayOfWeek', () => {
    // Tests from section 3.1
  });
});
```

### 9.3 Integration Testing (Vitest)

**Target:** Test API routes and React Query hooks.

```typescript
// app/api/tasks/route.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { GET, POST } from './route';

describe('Tasks API', () => {
  beforeAll(async () => {
    // Setup test database
  });

  afterAll(async () => {
    // Cleanup test database
  });

  describe('GET /api/tasks', () => {
    it('should return tasks for authenticated user', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/tasks?workspace_id=test-workspace',
        headers: {
          authorization: 'Bearer test-token',
        },
      });

      await GET(req);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.data).toBeInstanceOf(Array);
      expect(data.pagination).toBeDefined();
    });

    it('should return 401 for unauthenticated requests', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/tasks',
      });

      await GET(req);

      expect(res._getStatusCode()).toBe(401);
    });
  });

  describe('POST /api/tasks', () => {
    it('should create task with valid data', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        url: '/api/tasks',
        headers: {
          authorization: 'Bearer test-token',
          'content-type': 'application/json',
        },
        body: {
          title: 'Test Task',
          priority: 'p2',
          category: 'research',
          workspace_id: 'test-workspace',
        },
      });

      await POST(req);

      expect(res._getStatusCode()).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.id).toBeDefined();
      expect(data.title).toBe('Test Task');
    });

    it('should return 400 for invalid data', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        url: '/api/tasks',
        headers: {
          authorization: 'Bearer test-token',
          'content-type': 'application/json',
        },
        body: {
          // Missing title
          priority: 'p2',
        },
      });

      await POST(req);

      expect(res._getStatusCode()).toBe(400);
    });
  });
});
```

### 9.4 E2E Testing (Playwright)

**Target:** 60% coverage of critical user journeys.

**Priority Journeys:**

1. **User Onboarding:**
   - Sign up → Email verification → First workspace creation → First task

2. **Task Management:**
   - Create task via quick-add → View in Today → Update status → Complete

3. **Project Workflow:**
   - Create manuscript project → Add milestones → Link tasks → Track progress

4. **Collaboration:**
   - Invite user → Accept invite → Assign task → Real-time update

5. **Multi-tenancy:**
   - Switch workspaces → Verify data isolation → Test RLS

**Example E2E Test:**

```typescript
// tests/e2e/onboarding.spec.ts
import { test, expect } from '@playwright/test';

test.describe('User Onboarding', () => {
  test('should complete onboarding flow', async ({ page }) => {
    // 1. Sign up
    await page.goto('/signup');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'TestPassword123!');
    await page.fill('[name="confirmPassword"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    // 2. Verify email sent message
    await expect(page.locator('text=Check your email')).toBeVisible();

    // 3. Mock email verification (in test env)
    await page.goto('/auth/verify?token=test-token');

    // 4. Onboarding wizard should appear
    await expect(page.locator('h2:has-text("Welcome to ScholarOS")')).toBeVisible();

    // 5. Create workspace
    await page.fill('[name="workspaceName"]', 'Test Lab');
    await page.click('button:has-text("Continue")');

    // 6. Quick-add demo
    await expect(page.locator('text=Try creating your first task')).toBeVisible();
    await page.fill('[placeholder*="quick"]', 'Review paper fri #research p1');
    await page.keyboard.press('Enter');

    // 7. Verify task created
    await expect(page.locator('text=Review paper')).toBeVisible();

    // 8. Complete onboarding
    await page.click('button:has-text("Finish")');

    // 9. Should land on Today page
    await expect(page).toHaveURL('/today');
    await expect(page.locator('h1:has-text("Today")')).toBeVisible();
  });

  test('should skip optional onboarding steps', async ({ page }) => {
    // Test that users can skip calendar connection, team invites, etc.
  });
});
```

---

## 10. Implementation Specifications

### 10.1 Onboarding Wizard (3 days)

**Component Structure:**

```
components/onboarding/
├── onboarding-wizard.tsx        # Main wizard component
├── steps/
│   ├── welcome-step.tsx         # Step 1: Welcome + value prop
│   ├── workspace-step.tsx       # Step 2: Create workspace
│   ├── quick-add-demo-step.tsx  # Step 3: Task creation tutorial
│   ├── calendar-step.tsx        # Step 4: Calendar connection (optional)
│   └── invite-step.tsx          # Step 5: Invite team (optional)
├── onboarding-progress.tsx      # Progress indicator
└── use-onboarding.ts            # State management hook
```

**State Management:**

```typescript
// stores/onboarding-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OnboardingState {
  isComplete: boolean;
  currentStep: number;
  skippedSteps: string[];
  completedAt: string | null;
  setCurrentStep: (step: number) => void;
  skipStep: (stepName: string) => void;
  completeOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      isComplete: false,
      currentStep: 0,
      skippedSteps: [],
      completedAt: null,
      setCurrentStep: (step) => set({ currentStep: step }),
      skipStep: (stepName) => set((state) => ({
        skippedSteps: [...state.skippedSteps, stepName]
      })),
      completeOnboarding: () => set({
        isComplete: true,
        completedAt: new Date().toISOString()
      }),
    }),
    {
      name: 'onboarding-store',
    }
  )
);
```

**Implementation:**

```typescript
// components/onboarding/onboarding-wizard.tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import { WelcomeStep } from './steps/welcome-step';
import { WorkspaceStep } from './steps/workspace-step';
import { QuickAddDemoStep } from './steps/quick-add-demo-step';
import { CalendarStep } from './steps/calendar-step';
import { InviteStep } from './steps/invite-step';
import { OnboardingProgress } from './onboarding-progress';

const STEPS = [
  { component: WelcomeStep, canSkip: false },
  { component: WorkspaceStep, canSkip: false },
  { component: QuickAddDemoStep, canSkip: false },
  { component: CalendarStep, canSkip: true },
  { component: InviteStep, canSkip: true },
];

export function OnboardingWizard() {
  const { isComplete, currentStep, setCurrentStep, completeOnboarding } = useOnboardingStore();
  const [isOpen, setIsOpen] = useState(!isComplete);

  const CurrentStepComponent = STEPS[currentStep].component;
  const canSkip = STEPS[currentStep].canSkip;

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
      setIsOpen(false);
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  if (isComplete) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl">
        <OnboardingProgress currentStep={currentStep} totalSteps={STEPS.length} />
        <CurrentStepComponent onNext={handleNext} onSkip={canSkip ? handleSkip : undefined} />
      </DialogContent>
    </Dialog>
  );
}
```

### 10.2 Global Search (3 days)

**Architecture:**

```
components/search/
├── global-search.tsx        # Main search component (Cmd+F)
├── search-results.tsx       # Results list
├── search-result-item.tsx   # Individual result
├── search-filters.tsx       # Type filters (tasks, projects, people)
└── use-search.ts            # Search logic hook
```

**Implementation:**

```typescript
// lib/hooks/use-search.ts
import { useQuery } from '@tanstack/react-query';
import Fuse from 'fuse.js';

interface SearchResult {
  type: 'task' | 'project' | 'person' | 'grant';
  id: string;
  title: string;
  description?: string;
  metadata: Record<string, any>;
  score: number;
}

export function useSearch(query: string, filters?: string[]) {
  return useQuery({
    queryKey: ['search', query, filters],
    queryFn: async () => {
      if (!query || query.length < 2) return [];

      // Fetch all searchable data
      const [tasks, projects, people, grants] = await Promise.all([
        fetch('/api/search/tasks?q=' + encodeURIComponent(query)).then(r => r.json()),
        fetch('/api/search/projects?q=' + encodeURIComponent(query)).then(r => r.json()),
        fetch('/api/search/people?q=' + encodeURIComponent(query)).then(r => r.json()),
        fetch('/api/search/grants?q=' + encodeURIComponent(query)).then(r => r.json()),
      ]);

      // Combine and rank results
      const allResults: SearchResult[] = [
        ...tasks.map((t: any) => ({ type: 'task', ...t })),
        ...projects.map((p: any) => ({ type: 'project', ...p })),
        ...people.map((p: any) => ({ type: 'person', ...p })),
        ...grants.map((g: any) => ({ type: 'grant', ...g })),
      ];

      // Filter by type if specified
      const filtered = filters?.length
        ? allResults.filter(r => filters.includes(r.type))
        : allResults;

      // Rank by relevance using Fuse.js
      const fuse = new Fuse(filtered, {
        keys: ['title', 'description'],
        threshold: 0.3,
        includeScore: true,
      });

      return fuse.search(query).map(result => ({
        ...result.item,
        score: result.score || 0,
      }));
    },
    enabled: query.length >= 2,
  });
}
```

**Backend (Full-Text Search):**

```typescript
// app/api/search/tasks/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Use full-text search (after implementing tsvector)
  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, description, status, priority, category')
    .textSearch('search_vector', query, {
      type: 'websearch',
      config: 'english',
    })
    .limit(10);

  if (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
```

### 10.3 Recurring Tasks (5 days)

**Architecture:**

```
components/tasks/
├── task-recurrence-dialog.tsx   # UI for setting recurrence
├── recurrence-preview.tsx       # Shows next occurrences
└── use-recurring-tasks.ts       # Hook for managing recurring tasks

services/
└── recurring-tasks-service.ts   # Background job for creating instances
```

**Recurrence Rule Format (RFC 5545 subset):**

```typescript
interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number; // Every N days/weeks/months
  byweekday?: number[]; // For weekly: [0=Sun, 1=Mon, ..., 6=Sat]
  bymonthday?: number; // For monthly: 1-31
  count?: number; // Total occurrences
  until?: string; // ISO date string
}

// Examples:
// Every weekday: { frequency: 'weekly', interval: 1, byweekday: [1,2,3,4,5] }
// Every 2 weeks on Monday: { frequency: 'weekly', interval: 2, byweekday: [1] }
// Every month on the 15th: { frequency: 'monthly', interval: 1, bymonthday: 15 }
```

**Implementation:**

```typescript
// services/recurring-tasks-service.ts
import { addDays, addWeeks, addMonths, isBefore } from 'date-fns';

export class RecurringTasksService {
  /**
   * Generate next N occurrences of a recurring task
   */
  generateOccurrences(
    baseTask: Task,
    rule: RecurrenceRule,
    count: number = 10
  ): Partial<Task>[] {
    const occurrences: Partial<Task>[] = [];
    let currentDate = new Date(baseTask.due || new Date());

    const untilDate = rule.until ? new Date(rule.until) : null;
    const maxCount = rule.count || count;

    while (occurrences.length < maxCount) {
      const nextDate = this.getNextOccurrence(currentDate, rule);

      if (untilDate && isBefore(untilDate, nextDate)) {
        break;
      }

      occurrences.push({
        title: baseTask.title,
        description: baseTask.description,
        priority: baseTask.priority,
        category: baseTask.category,
        due: nextDate.toISOString(),
        recurrence_parent_id: baseTask.id,
        is_recurring: false, // Instance, not parent
      });

      currentDate = nextDate;
    }

    return occurrences;
  }

  private getNextOccurrence(from: Date, rule: RecurrenceRule): Date {
    switch (rule.frequency) {
      case 'daily':
        return addDays(from, rule.interval);

      case 'weekly':
        if (rule.byweekday && rule.byweekday.length > 0) {
          // Find next matching weekday
          let nextDate = addDays(from, 1);
          while (!rule.byweekday.includes(nextDate.getDay())) {
            nextDate = addDays(nextDate, 1);
          }
          return nextDate;
        }
        return addWeeks(from, rule.interval);

      case 'monthly':
        return addMonths(from, rule.interval);

      case 'yearly':
        return addMonths(from, rule.interval * 12);

      default:
        throw new Error(`Unsupported frequency: ${rule.frequency}`);
    }
  }
}

// Background job (run daily via cron)
export async function processRecurringTasks() {
  const supabase = createClient();

  // Find recurring tasks that need next instances
  const { data: recurringTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('is_recurring', true)
    .is('recurrence_rule', 'not', null);

  const service = new RecurringTasksService();

  for (const task of recurringTasks || []) {
    // Check if next instance already exists
    const nextDue = service.generateOccurrences(task, task.recurrence_rule, 1)[0].due;

    const { data: existing } = await supabase
      .from('tasks')
      .select('id')
      .eq('recurrence_parent_id', task.id)
      .eq('due', nextDue)
      .single();

    if (!existing) {
      // Create next instance
      const nextInstance = service.generateOccurrences(task, task.recurrence_rule, 1)[0];
      await supabase.from('tasks').insert({
        ...nextInstance,
        user_id: task.user_id,
        workspace_id: task.workspace_id,
      });
    }
  }
}
```

**Cron Job (Vercel Cron or external):**

```typescript
// app/api/cron/recurring-tasks/route.ts
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  await processRecurringTasks();

  return NextResponse.json({ success: true });
}

// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/recurring-tasks",
      "schedule": "0 0 * * *"
    }
  ]
}
```

---

## 11. Team Coordination

### 11.1 Development Workflow

**Process:**

1. **Planning** (Tech Lead + PM)
   - Review UX designs
   - Create technical specifications
   - Break down into implementation tasks
   - Estimate effort and assign

2. **Implementation** (Engineers)
   - Database Engineer: Schema changes first
   - Backend Engineer: API endpoints
   - Frontend Engineer: UI components
   - QA Engineer: Write tests in parallel

3. **Review** (Tech Lead)
   - Code review (PR checklist)
   - Architecture validation
   - Performance testing
   - Security review

4. **Deployment** (DevOps/Tech Lead)
   - Staging deployment
   - Smoke tests
   - Production deployment
   - Monitoring

**Sprint Cadence:**

- **2-week sprints**
- **Monday:** Sprint planning + standup
- **Daily:** 15-min standup
- **Wednesday:** Mid-sprint check-in
- **Friday:** Demo + retrospective

### 11.2 Handoff Documents

For each phase/feature, provide:

1. **Database Specifications** (for Database Engineer)
   - Schema changes
   - Migration scripts
   - Index recommendations
   - Performance considerations

2. **API Specifications** (for Backend Engineer)
   - Endpoint definitions (OpenAPI/Swagger)
   - Request/response schemas
   - Authentication/authorization
   - Error handling patterns

3. **Component Specifications** (for Frontend Engineer)
   - Component hierarchy
   - Props interfaces
   - State management patterns
   - Design system references

4. **Test Specifications** (for QA Engineer)
   - Test scenarios
   - Acceptance criteria
   - Edge cases
   - Performance benchmarks

### 11.3 Code Review Checklist

**Before Submitting PR:**
- [ ] All tests pass (`pnpm test`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Type checking passes (`pnpm typecheck`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Self-review completed
- [ ] Documentation updated (if needed)

**During Review:**
- [ ] Code follows established patterns
- [ ] No security vulnerabilities (SQL injection, XSS, etc.)
- [ ] Performance considerations addressed
- [ ] Accessibility requirements met (WCAG 2.1 AA)
- [ ] Error handling comprehensive
- [ ] Tests provide adequate coverage
- [ ] No console.log or debug code
- [ ] Comments explain "why", not "what"

---

## Conclusion

ScholarOS has a solid technical foundation but requires focused effort on:

1. **Critical Bug Fixes** (2-3 weeks) - Resolve blocking issues
2. **UX Optimization** (3-4 weeks) - Aligned with UX Engineer
3. **Performance & Scalability** (2-3 weeks) - Prepare for growth

**Total Estimated Timeline: 8-10 weeks**

This plan prioritizes user impact and technical sustainability. With disciplined execution, ScholarOS will be ready for scale.

---

**Next Steps:**

1. ✅ **Review this plan** with PM and stakeholders
2. ⏭️ **Begin Phase 9A** (Critical Fixes) immediately
3. ⏭️ **Coordinate with UX Engineer** for Phase 9B planning
4. ⏭️ **Establish monitoring** and alerting infrastructure

**Questions? Contact Tech Lead.**

---

*Document Version: 1.0*
*Last Updated: January 12, 2026*
*Next Review: End of Phase 9A (Week 3)*
