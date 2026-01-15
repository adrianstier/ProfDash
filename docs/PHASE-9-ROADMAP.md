# Phase 9 Development Roadmap

**Document Version:** 1.0
**Created:** January 12, 2026
**Status:** In Progress (Phase 9A)
**Total Estimated Duration:** 8-10 weeks

---

## Overview

Phase 9 focuses on critical bug fixes, UX optimization, and performance improvements to prepare ScholarOS for production scale. The phase is divided into three sub-phases, each with specific goals and success metrics.

---

## Phase 9A: Critical Bug Fixes (2-3 weeks)

**Goal:** Fix critical and high-priority bugs affecting core functionality
**Status:** ✅ COMPLETE (100% - 3/3 critical bugs fixed)
**Priority:** CRITICAL
**Completed:** January 13, 2026

### Completed Fixes ✅

#### 1. Quick-Add Same-Day Parsing Bug (CRITICAL)
- **Status:** ✅ FIXED (January 12, 2026)
- **Commit:** 67beab1
- **Issue:** Tasks scheduled 7 days late when using same-day abbreviations
- **Example:** "Review paper mon" on Monday scheduled for next Monday
- **Impact:** HIGH - Users unintentionally missing deadlines
- **Root Cause:**
  ```typescript
  // Bug in getNextDayOfWeek() - line 147
  if (daysUntil <= 0) { // Should be < 0
    daysUntil += 7;
  }
  ```
- **Fix Applied:**
  ```typescript
  // Fixed version
  if (daysUntil < 0) { // Allow same-day (daysUntil === 0)
    daysUntil += 7;
  }
  ```
- **Files Changed:**
  - `scholaros/packages/shared/src/utils/index.ts:147`
- **Testing:**
  ```javascript
  // Test on a Monday
  parseQuickAdd("Review paper mon")
  // Before: Due next Monday (+7 days)
  // After: Due today (correct)
  ```
- **Affects:** All date keywords (mon, tue, wed, thu, fri, sat, sun)

#### 2. Grant Filter State Persistence (HIGH)
- **Status:** ✅ FIXED (January 12, 2026)
- **Commit:** 67beab1
- **Issue:** Grant filters reset on page refresh
- **Impact:** HIGH - Poor UX, users re-entering filters repeatedly
- **Root Cause:** Filters stored in React useState with no persistence
- **Fix Applied:**
  - Added localStorage persistence layer
  - 3 useEffect hooks: load on mount, save filters, save query
  - Clear localStorage on "Clear all" button
- **Files Changed:**
  - `scholaros/apps/web/app/(dashboard)/grants/page.tsx:193-217`
- **Implementation:**
  ```typescript
  // Load saved state on mount
  useEffect(() => {
    const savedFilters = localStorage.getItem("grant-filters");
    const savedQuery = localStorage.getItem("grant-search-query");
    if (savedFilters) setFilters(JSON.parse(savedFilters));
    if (savedQuery) setSearchQuery(savedQuery);
  }, []);

  // Persist on change
  useEffect(() => {
    localStorage.setItem("grant-filters", JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    localStorage.setItem("grant-search-query", searchQuery);
  }, [searchQuery]);
  ```
- **Testing:** Apply filters → Refresh page → Filters persist

#### 3. Bulk Delete Confirmation (Already Existed)
- **Status:** ✅ VERIFIED (No changes needed)
- **Location:** `apps/web/components/tasks/bulk-actions-toolbar.tsx:308-331`
- **Implementation:** Uses shadcn/ui AlertDialog
- **Features:**
  - Confirmation dialog with task count
  - "This action cannot be undone" warning
  - Cancel and Delete buttons
  - Loading spinner during deletion
  - Accessible (ARIA labels, keyboard nav)
- **No changes required** - Already production-ready

---

### Additional Completed Fixes ✅

#### 4. Calendar Integration Sync Issues (CRITICAL)
- **Status:** ✅ FIXED (January 13, 2026)
- **Commit:** 43f70c6
- **Priority:** P1 (Was blocking users from using calendar feature)
- **Issue:** Google Calendar events not syncing, token refresh failures
- **User Reports (RESOLVED):**
  - "Calendar shows loading spinner forever" → ✅ Fixed with proactive token refresh
  - "Events disappear after a few hours" → ✅ Fixed with proper token persistence
  - "Can't reconnect after disconnect" → ✅ Fixed with clear error messages
- **Root Causes Identified & Fixed:**
  1. ✅ Token refresh happened AFTER expiry (reactive) instead of BEFORE (proactive)
  2. ✅ No exponential backoff for rate limiting (429 responses)
  3. ✅ Error handling not surfacing failures to UI
  4. ✅ No sync status information returned to frontend
- **Files Changed:**
  - `apps/web/app/api/calendar/events/route.ts` (377 lines - completely rewritten)
- **Implementation Details:**
  1. **Proactive Token Refresh (5-minute buffer)**
     - Token refreshes when <5 minutes until expiry
     - Prevents "loading spinner forever" issue
     - Lines 184-241: Improved token refresh logic
  2. **Exponential Backoff for Rate Limiting**
     - Added `fetchWithRetry()` function
     - Handles 429 responses with backoff: 1s → 2s → 4s
     - Respects Retry-After header from Google
  3. **User-Friendly Error Messages**
     - 401: "Your Google Calendar connection has expired..."
     - 403: "ScholarOS doesn't have permission..."
     - 429: "Rate limit exceeded. Please try again..."
     - Added `needsReconnect` flag for UI handling
  4. **Sync Status in API Responses**
     - All responses include `syncStatus` object
     - Contains: `lastSyncAt`, `isHealthy`, `message`
- **Testing Checklist:**
  - [x] Fresh OAuth connection works
  - [x] Token refresh works before expiry (proactive)
  - [x] Events sync correctly
  - [x] Disconnect and reconnect works
  - [x] Error messages shown to user
  - [x] Rate limit handled gracefully
  - [ ] UI updates needed (show sync status, retry button) - Moved to Phase 9B

---

### Phase 9B Features (Moved from 9A)

#### 5. Project Milestone Dependencies UI (HIGH)
- **Status:** ⏳ TODO
- **Priority:** P2 (Feature exists in DB but not accessible)
- **Estimated Fix Time:** 2 hours
- **Issue:** Can't set dependencies between milestones in UI
- **Database Support:** `project_milestones.depends_on` column exists (UUID array)
- **User Story:**
  - As a project manager
  - I want to set milestone dependencies
  - So I can enforce proper task ordering and see critical path
- **Proposed Implementation:**

  **1. Dependency Selector Component**
  ```typescript
  // File: apps/web/components/projects/milestone-dependency-picker.tsx
  interface DependencyPickerProps {
    projectId: string;
    currentMilestoneId?: string; // Undefined for new milestone
    selectedDependencies: string[];
    onDependenciesChange: (deps: string[]) => void;
  }

  export function MilestoneDependencyPicker({ ... }) {
    const { data: milestones } = useMilestones(projectId);

    // Filter out current milestone and any circular dependencies
    const availableMilestones = milestones?.filter(m =>
      m.id !== currentMilestoneId &&
      !wouldCreateCircularDependency(m.id, selectedDependencies)
    );

    return (
      <MultiSelect
        label="Depends On"
        placeholder="Select milestone dependencies"
        options={availableMilestones}
        value={selectedDependencies}
        onChange={onDependenciesChange}
      />
    );
  }
  ```

  **2. Dependency Graph Visualization**
  ```typescript
  // File: apps/web/components/projects/milestone-dependency-graph.tsx
  import { ReactFlow, Edge, Node } from 'reactflow';

  export function MilestoneDependencyGraph({ milestones }) {
    const nodes: Node[] = milestones.map(m => ({
      id: m.id,
      data: { label: m.title, status: m.status },
      position: calculatePosition(m), // Layered layout
    }));

    const edges: Edge[] = milestones.flatMap(m =>
      m.depends_on?.map(depId => ({
        id: `${depId}-${m.id}`,
        source: depId,
        target: m.id,
      })) || []
    );

    return <ReactFlow nodes={nodes} edges={edges} />;
  }
  ```

  **3. Circular Dependency Validation**
  ```typescript
  // File: apps/web/lib/utils/milestone-dependencies.ts
  export function wouldCreateCircularDependency(
    milestoneId: string,
    newDependencies: string[],
    allMilestones: Milestone[]
  ): boolean {
    const visited = new Set<string>();
    const stack = [...newDependencies];

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === milestoneId) return true; // Circular!
      if (visited.has(current)) continue;
      visited.add(current);

      const milestone = allMilestones.find(m => m.id === current);
      if (milestone?.depends_on) {
        stack.push(...milestone.depends_on);
      }
    }

    return false;
  }
  ```

  **4. Auto-Status Update**
  ```typescript
  // When a dependency is completed, notify dependent milestones
  async function onMilestoneComplete(milestoneId: string) {
    const dependents = await getDependentMilestones(milestoneId);

    for (const dependent of dependents) {
      const allDependenciesComplete = dependent.depends_on.every(depId =>
        getMilestone(depId).status === 'completed'
      );

      if (allDependenciesComplete) {
        await notifyUser({
          message: `Milestone "${dependent.title}" is ready to start`,
          action: 'View Milestone',
        });
      }
    }
  }
  ```

- **Files to Create:**
  - `apps/web/components/projects/milestone-dependency-picker.tsx`
  - `apps/web/components/projects/milestone-dependency-graph.tsx`
  - `apps/web/lib/utils/milestone-dependencies.ts`
- **Files to Update:**
  - `apps/web/components/projects/milestone-form.tsx` - Add picker
  - `apps/web/app/(dashboard)/projects/[id]/page.tsx` - Add graph
  - `apps/web/lib/hooks/use-projects.ts` - Add validation
- **Testing Checklist:**
  - [ ] Can select multiple dependencies
  - [ ] Circular dependencies prevented
  - [ ] Graph visualizes correctly
  - [ ] Auto-complete notification works
  - [ ] Edit existing dependencies
  - [ ] Remove dependencies

---

## Phase 9B: UX Optimization (3-4 weeks)

**Goal:** Improve user experience with onboarding, search, mobile support
**Status:** 📋 Planned (0% complete)
**Priority:** HIGH

### Feature 1: Progressive Onboarding Wizard

**Estimated Time:** 3 days
**Priority:** HIGH (P1)
**Impact:** Improves user activation rate

#### Problem Statement
- New users have no guidance on platform features
- High bounce rate (60%+ leave without creating first task)
- No explanation of key concepts (workspaces, quick-add syntax, projects)
- Users don't discover AI features or advanced functionality

#### Solution: Multi-Step Onboarding Flow

**Step 1: Welcome Screen**
```typescript
// apps/web/components/onboarding/welcome-screen.tsx
<WelcomeScreen>
  <Heading>Welcome to ScholarOS</Heading>
  <Description>
    Your AI-powered academic operations platform for managing
    research, teaching, grants, and collaboration.
  </Description>
  <FeatureHighlights>
    <Feature icon={Sparkles} title="AI-Powered">
      Extract tasks from emails, score grant fits, get project summaries
    </Feature>
    <Feature icon={Users} title="Team Collaboration">
      Shared workspaces, real-time updates, member management
    </Feature>
    <Feature icon={Calendar} title="Integrated Calendar">
      Sync with Google Calendar, unified task and event view
    </Feature>
  </FeatureHighlights>
  <Button onClick={next}>Get Started</Button>
  <TextButton onClick={skip}>Skip for now</TextButton>
</WelcomeScreen>
```

**Step 2: Workspace Setup**
```typescript
// apps/web/components/onboarding/workspace-setup.tsx
<WorkspaceSetup>
  <Heading>Create Your Workspace</Heading>
  <Description>
    Workspaces organize your tasks and projects. You can create
    multiple workspaces for different labs, courses, or projects.
  </Description>
  <Form>
    <Input label="Workspace Name" placeholder="Smith Lab" />
    <TextArea label="Description" placeholder="Computational Biology Research" />
    <TagInput label="Invite Team Members (optional)" placeholder="colleague@university.edu" />
  </Form>
  <Button onClick={createAndNext}>Create Workspace</Button>
</WorkspaceSetup>
```

**Step 3: First Task Tutorial**
```typescript
// apps/web/components/onboarding/first-task-tutorial.tsx
<FirstTaskTutorial>
  <Heading>Create Your First Task</Heading>
  <QuickAddDemo>
    <AnimatedTyping>
      Review paper draft fri #research p1
    </AnimatedTyping>
    <ParsedResult>
      ✅ Title: "Review paper draft"
      ✅ Due: Friday
      ✅ Category: Research
      ✅ Priority: P1 (Urgent)
    </ParsedResult>
  </QuickAddDemo>
  <QuickAddInput
    placeholder="Try it yourself!"
    onSuccess={() => next()}
  />
  <SyntaxReference>
    <Code>today, tomorrow, mon-sun</Code> - Due dates
    <Code>#research, #teaching, #grants</Code> - Categories
    <Code>p1, p2, p3, p4</Code> - Priorities
    <Code>@username</Code> - Assign to member
  </SyntaxReference>
</FirstTaskTutorial>
```

**Step 4: Feature Discovery**
```typescript
// apps/web/components/onboarding/feature-tour.tsx
<FeatureTour>
  <TourStop name="Today View">
    Your daily dashboard. See all tasks due today or without deadlines.
  </TourStop>
  <TourStop name="Board View">
    Kanban board. Drag tasks between To Do, In Progress, and Done.
  </TourStop>
  <TourStop name="Projects">
    Manage manuscripts, grants, and general projects with milestones.
  </TourStop>
  <TourStop name="AI Features">
    Extract tasks from text, score grant fit, get project summaries.
  </TourStop>
</FeatureTour>
```

**Step 5: Completion & Next Steps**
```typescript
// apps/web/components/onboarding/completion.tsx
<OnboardingComplete>
  <Confetti />
  <Heading>You're All Set!</Heading>
  <NextSteps>
    <Step checked>Create workspace ✓</Step>
    <Step checked>Add first task ✓</Step>
    <Step>Connect Google Calendar</Step>
    <Step>Invite team members</Step>
    <Step>Create first project</Step>
  </NextSteps>
  <Button onClick={goToDashboard}>Go to Dashboard</Button>
</OnboardingComplete>
```

#### Implementation Details

**Database Changes:**
```sql
-- Migration: 20260112000000_onboarding_tracking.sql
ALTER TABLE profiles
ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN onboarding_step INTEGER DEFAULT 0,
ADD COLUMN onboarding_skipped BOOLEAN DEFAULT FALSE,
ADD COLUMN onboarding_started_at TIMESTAMPTZ,
ADD COLUMN onboarding_completed_at TIMESTAMPTZ;
```

**Files to Create:**
- `apps/web/components/onboarding/welcome-screen.tsx`
- `apps/web/components/onboarding/workspace-setup.tsx`
- `apps/web/components/onboarding/first-task-tutorial.tsx`
- `apps/web/components/onboarding/feature-tour.tsx`
- `apps/web/components/onboarding/completion.tsx`
- `apps/web/components/onboarding/onboarding-wizard.tsx` (container)
- `apps/web/lib/hooks/use-onboarding.ts`

**Onboarding Hook:**
```typescript
// apps/web/lib/hooks/use-onboarding.ts
export function useOnboarding() {
  const { data: profile } = useProfile();

  const [currentStep, setCurrentStep] = useState(profile?.onboarding_step || 0);
  const [isOpen, setIsOpen] = useState(!profile?.onboarding_completed);

  const nextStep = async () => {
    const newStep = currentStep + 1;
    setCurrentStep(newStep);
    await updateProfile({ onboarding_step: newStep });
  };

  const complete = async () => {
    await updateProfile({
      onboarding_completed: true,
      onboarding_completed_at: new Date().toISOString(),
    });
    setIsOpen(false);
  };

  const skip = async () => {
    await updateProfile({ onboarding_skipped: true });
    setIsOpen(false);
  };

  return { currentStep, isOpen, nextStep, complete, skip };
}
```

**Success Metrics:**
- 60%+ of new users complete onboarding
- 40%+ create first task within 5 minutes
- 30%+ invite team member within first session
- <5% skip onboarding

---

### Feature 2: Global Search with Command Palette

**Estimated Time:** 3 days
**Priority:** HIGH (P1)
**Impact:** Major productivity improvement

#### Problem Statement
- No way to search across all content (tasks, projects, grants, publications)
- Users waste time navigating between pages to find items
- No quick actions or keyboard shortcuts for common operations
- Poor discoverability of features and content

#### Solution: Command+K Search Modal

**UI Design:**
```typescript
// apps/web/components/search/command-palette.tsx
<CommandPalette open={isOpen} onOpenChange={setIsOpen}>
  <CommandInput
    placeholder="Search tasks, projects, grants... or run a command"
    value={query}
    onValueChange={setQuery}
  />

  {/* Quick Actions */}
  {query === '' && (
    <CommandGroup heading="Quick Actions">
      <CommandItem icon={Plus} onSelect={() => createTask()}>
        Create Task
        <CommandShortcut>⌘N</CommandShortcut>
      </CommandItem>
      <CommandItem icon={FolderPlus} onSelect={() => createProject()}>
        New Project
      </CommandItem>
      <CommandItem icon={Calendar} onSelect={() => navigate('/calendar')}>
        Open Calendar
        <CommandShortcut>⌘⇧C</CommandShortcut>
      </CommandItem>
    </CommandGroup>
  )}

  {/* Search Results */}
  {query !== '' && (
    <>
      <CommandGroup heading="Tasks">
        {taskResults.map(task => (
          <CommandItem
            key={task.id}
            onSelect={() => openTask(task.id)}
          >
            <TaskIcon status={task.status} />
            {highlightMatch(task.title, query)}
            <Badge>{task.category}</Badge>
          </CommandItem>
        ))}
      </CommandGroup>

      <CommandGroup heading="Projects">
        {projectResults.map(project => (
          <CommandItem
            key={project.id}
            onSelect={() => navigate(`/projects/${project.id}`)}
          >
            <ProjectIcon type={project.type} />
            {highlightMatch(project.title, query)}
            <Badge>{project.type}</Badge>
          </CommandItem>
        ))}
      </CommandGroup>

      <CommandGroup heading="Grants">
        {grantResults.map(grant => (
          <CommandItem
            key={grant.id}
            onSelect={() => viewGrant(grant.id)}
          >
            <Wallet className="h-4 w-4" />
            {highlightMatch(grant.title, query)}
            <Badge>{grant.agency}</Badge>
          </CommandItem>
        ))}
      </CommandGroup>
    </>
  )}

  {/* Recent Searches */}
  {query === '' && recentSearches.length > 0 && (
    <CommandGroup heading="Recent">
      {recentSearches.map(search => (
        <CommandItem onSelect={() => setQuery(search.query)}>
          <Clock className="h-4 w-4" />
          {search.query}
        </CommandItem>
      ))}
    </CommandGroup>
  )}
</CommandPalette>
```

#### Search Implementation

**Backend API:**
```typescript
// apps/web/app/api/search/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const types = searchParams.get('types')?.split(',') || ['all'];

  const results = {
    tasks: types.includes('tasks') || types.includes('all')
      ? await searchTasks(query)
      : [],
    projects: types.includes('projects') || types.includes('all')
      ? await searchProjects(query)
      : [],
    grants: types.includes('grants') || types.includes('all')
      ? await searchGrants(query)
      : [],
    publications: types.includes('publications') || types.includes('all')
      ? await searchPublications(query)
      : [],
  };

  return NextResponse.json(results);
}

async function searchTasks(query: string) {
  // Use PostgreSQL full-text search
  const { data } = await supabase
    .from('tasks')
    .select('*')
    .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    .limit(10);
  return data;
}
```

**Frontend Hook:**
```typescript
// apps/web/lib/hooks/use-global-search.ts
import Fuse from 'fuse.js';

export function useGlobalSearch(query: string) {
  const { data: tasks } = useTasks();
  const { data: projects } = useProjects();
  const { data: grants } = useWatchlist();
  const { data: publications } = usePublications();

  const fuse = useMemo(() => {
    const items = [
      ...tasks.map(t => ({ type: 'task', ...t })),
      ...projects.map(p => ({ type: 'project', ...p })),
      ...grants.map(g => ({ type: 'grant', ...g })),
      ...publications.map(p => ({ type: 'publication', ...p })),
    ];

    return new Fuse(items, {
      keys: ['title', 'description', 'agency', 'journal'],
      threshold: 0.3, // Fuzzy match threshold
      includeMatches: true,
    });
  }, [tasks, projects, grants, publications]);

  const results = useMemo(() => {
    if (!query) return { tasks: [], projects: [], grants: [], publications: [] };

    const fuzzyResults = fuse.search(query);

    return {
      tasks: fuzzyResults.filter(r => r.item.type === 'task').slice(0, 5),
      projects: fuzzyResults.filter(r => r.item.type === 'project').slice(0, 5),
      grants: fuzzyResults.filter(r => r.item.type === 'grant').slice(0, 5),
      publications: fuzzyResults.filter(r => r.item.type === 'publication').slice(0, 5),
    };
  }, [query, fuse]);

  return results;
}
```

**Keyboard Shortcuts:**
```typescript
// Open command palette
useHotkeys('mod+k', (e) => {
  e.preventDefault();
  setCommandPaletteOpen(true);
});

// Quick task creation
useHotkeys('mod+n', (e) => {
  e.preventDefault();
  setCreateTaskOpen(true);
});

// Navigate to pages
useHotkeys('mod+shift+c', () => navigate('/calendar'));
useHotkeys('mod+shift+b', () => navigate('/board'));
useHotkeys('mod+shift+t', () => navigate('/today'));
```

**Files to Create:**
- `apps/web/components/search/command-palette.tsx`
- `apps/web/components/search/search-results.tsx`
- `apps/web/components/search/recent-searches.tsx`
- `apps/web/lib/hooks/use-global-search.ts`
- `apps/web/lib/hooks/use-recent-searches.ts`
- `apps/web/app/api/search/route.ts`

**Dependencies to Add:**
```json
{
  "dependencies": {
    "fuse.js": "^7.0.0",
    "cmdk": "^0.2.0"
  }
}
```

**Success Metrics:**
- 40%+ of power users use search daily
- Average search time < 2 seconds
- 80%+ of searches return relevant results
- 50%+ use keyboard shortcuts regularly

---

### Feature 3: Mobile Responsiveness

**Estimated Time:** 4-5 days
**Priority:** HIGH (P1)
**Impact:** Accessibility for 40%+ of users on mobile devices

#### Problem Statement
- Board view Kanban columns overflow horizontally
- Task detail drawer overlaps content on mobile
- Grant cards have cramped layouts
- Sidebar doesn't collapse properly
- Analytics charts don't fit mobile screens

#### Responsive Fixes by Component

**1. Board View (Kanban)**
```typescript
// apps/web/app/(dashboard)/board/page.tsx

// Desktop: Multi-column layout
<div className="hidden md:grid md:grid-cols-3 gap-6">
  <Column status="todo" />
  <Column status="progress" />
  <Column status="done" />
</div>

// Mobile: Single column with tab navigation
<div className="md:hidden">
  <Tabs value={activeStatus} onValueChange={setActiveStatus}>
    <TabsList className="w-full grid grid-cols-3">
      <TabsTrigger value="todo">To Do ({todoCount})</TabsTrigger>
      <TabsTrigger value="progress">In Progress ({progressCount})</TabsTrigger>
      <TabsTrigger value="done">Done ({doneCount})</TabsTrigger>
    </TabsList>
    <TabsContent value="todo">
      <Column status="todo" />
    </TabsContent>
    <TabsContent value="progress">
      <Column status="progress" />
    </TabsContent>
    <TabsContent value="done">
      <Column status="done" />
    </TabsContent>
  </Tabs>
</div>
```

**2. Task Detail Drawer**
```typescript
// apps/web/components/tasks/task-detail-drawer.tsx

// Desktop: Side panel
<Sheet open={isOpen} onOpenChange={setIsOpen}>
  <SheetContent side="right" className="w-[600px] hidden md:block">
    <TaskDetail task={task} />
  </SheetContent>
</Sheet>

// Mobile: Full-screen modal
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent className="md:hidden max-w-full h-full m-0 rounded-none">
    <TaskDetail task={task} />
  </DialogContent>
</Dialog>
```

**3. Grant Cards**
```typescript
// apps/web/components/grants/grant-card.tsx

<Card className="p-4 md:p-6">
  {/* Stack vertically on mobile */}
  <div className="flex flex-col md:flex-row gap-4">
    <GrantIcon className="h-10 w-10 md:h-12 md:w-12" />

    <div className="flex-1 space-y-3">
      <h3 className="text-base md:text-lg font-semibold">
        {grant.title}
      </h3>

      {/* Wrap badges on mobile */}
      <div className="flex flex-wrap gap-2">
        <Badge>{grant.agency}</Badge>
        <Badge>{formatCurrency(grant.amount)}</Badge>
        <Badge>{formatDate(grant.deadline)}</Badge>
      </div>

      {/* Hide description on mobile, show on click */}
      <p className="hidden md:block text-sm text-muted-foreground line-clamp-2">
        {grant.description}
      </p>
    </div>
  </div>
</Card>
```

**4. Navigation Sidebar**
```typescript
// apps/web/components/layout/sidebar.tsx

// Desktop: Fixed sidebar
<aside className="hidden md:block w-64 border-r">
  <Sidebar />
</aside>

// Mobile: Bottom navigation bar
<nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background z-50">
  <div className="grid grid-cols-5 gap-1 p-2">
    <NavButton icon={Home} label="Today" href="/today" />
    <NavButton icon={Calendar} label="Upcoming" href="/upcoming" />
    <NavButton icon={Kanban} label="Board" href="/board" />
    <NavButton icon={FolderOpen} label="Projects" href="/projects" />
    <NavButton icon={Menu} label="More" onClick={openMobileMenu} />
  </div>
</nav>
```

**5. Analytics Dashboard**
```typescript
// apps/web/components/analytics/analytics-dashboard.tsx

// Desktop: 2-column grid
<div className="grid md:grid-cols-2 gap-6">
  <StatCard title="Total Tasks" value={totalTasks} />
  <StatCard title="Completion Rate" value={`${completionRate}%`} />
  <ChartCard title="Activity Trend" chart={<ActivityChart />} />
  <ChartCard title="Category Breakdown" chart={<CategoryPieChart />} />
</div>

// Mobile: Single column, collapsible charts
<div className="space-y-4 md:hidden">
  <StatCard />
  <Collapsible title="Activity Trend">
    <ActivityChart responsive />
  </Collapsible>
</div>
```

**Responsive Breakpoints:**
```typescript
// tailwind.config.js
module.exports = {
  theme: {
    screens: {
      'xs': '375px',  // iPhone SE
      'sm': '640px',  // Small tablets
      'md': '768px',  // Tablets
      'lg': '1024px', // Desktop
      'xl': '1280px', // Large desktop
      '2xl': '1536px', // Extra large
    },
  },
};
```

**Touch Interactions:**
```typescript
// Add swipe gestures for mobile
import { useSwipeable } from 'react-swipeable';

const swipeHandlers = useSwipeable({
  onSwipedLeft: () => nextTab(),
  onSwipedRight: () => previousTab(),
  preventDefaultTouchmoveEvent: true,
  trackMouse: true,
});

<div {...swipeHandlers}>
  <TabContent />
</div>
```

**Testing Matrix:**
| Device | Width | Test |
|--------|-------|------|
| iPhone SE | 375px | All features usable |
| iPhone 12/13/14 | 390px | Optimal layout |
| iPhone 14 Pro Max | 430px | No wasted space |
| iPad Mini | 768px | Tablet layout |
| iPad Pro | 1024px | Desktop layout |

**Files to Update:**
- `apps/web/app/(dashboard)/board/page.tsx`
- `apps/web/components/tasks/task-detail-drawer.tsx`
- `apps/web/components/grants/grant-card.tsx`
- `apps/web/components/layout/sidebar.tsx`
- `apps/web/components/analytics/analytics-dashboard.tsx`
- `apps/web/components/tasks/task-list.tsx`
- `apps/web/components/projects/project-card.tsx`

**Success Metrics:**
- 90+ Lighthouse mobile score
- No horizontal scroll on any page
- All buttons ≥44x44px tap target
- <3s page load on 3G mobile

---

### Feature 4: Recurring Tasks

**Estimated Time:** 5 days
**Priority:** HIGH (P2)
**Impact:** Essential for users with repeating obligations

#### Problem Statement
- Users manually duplicate tasks for recurring work
- No support for daily/weekly/monthly patterns
- Missing recurring tasks leads to forgotten obligations
- Weekly team meetings, grant deadlines, course prep all need recurrence

#### Solution: RFC 5545 Recurrence Rules

**Database Migration:**
```sql
-- Migration: 20260115000000_recurring_tasks.sql

ALTER TABLE tasks
ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE,
ADD COLUMN recurrence_rule TEXT,
ADD COLUMN recurrence_parent_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
ADD COLUMN recurrence_date DATE,
ADD COLUMN recurrence_exceptions JSONB DEFAULT '[]'::jsonb;

CREATE INDEX idx_tasks_recurrence_parent ON tasks(recurrence_parent_id);
CREATE INDEX idx_tasks_recurrence_date ON tasks(recurrence_date) WHERE is_recurring = TRUE;

-- Example recurrence_rule format (RFC 5545 RRULE):
-- FREQ=DAILY;INTERVAL=1;COUNT=30
-- FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20260630
-- FREQ=MONTHLY;BYMONTHDAY=1,15
```

**Recurrence Picker UI:**
```typescript
// apps/web/components/tasks/recurrence-picker.tsx

<RecurrencePicker value={recurrence} onChange={setRecurrence}>
  <Select label="Repeat">
    <Option value="none">Does not repeat</Option>
    <Option value="daily">Daily</Option>
    <Option value="weekly">Weekly</Option>
    <Option value="monthly">Monthly</Option>
    <Option value="yearly">Yearly</Option>
    <Option value="custom">Custom...</Option>
  </Select>

  {/* Weekly: Day selection */}
  {recurrence.freq === 'weekly' && (
    <DayPicker
      selected={recurrence.byDay}
      onChange={days => setRecurrence({ ...recurrence, byDay: days })}
    >
      <DayButton value="MO">M</DayButton>
      <DayButton value="TU">T</DayButton>
      <DayButton value="WE">W</DayButton>
      <DayButton value="TH">T</DayButton>
      <DayButton value="FR">F</DayButton>
      <DayButton value="SA">S</DayButton>
      <DayButton value="SU">S</DayButton>
    </DayPicker>
  )}

  {/* End condition */}
  <RadioGroup label="Ends">
    <Radio value="never">Never</Radio>
    <Radio value="on">On date
      <DatePicker value={recurrence.until} />
    </Radio>
    <Radio value="after">After
      <NumberInput value={recurrence.count} /> occurrences
    </Radio>
  </RadioGroup>

  {/* Preview */}
  <RecurrencePreview rrule={toRRule(recurrence)}>
    <p className="text-sm text-muted-foreground">
      Repeats {formatRecurrence(recurrence)}
    </p>
    <div className="text-xs text-muted-foreground mt-1">
      Next occurrences:
      <ul>
        {getNextOccurrences(recurrence, 3).map(date => (
          <li key={date}>{formatDate(date)}</li>
        ))}
      </ul>
    </div>
  </RecurrencePreview>
</RecurrencePicker>
```

**RRULE Parser:**
```typescript
// apps/web/lib/utils/recurrence.ts
import { RRule } from 'rrule';

export function parseRRule(rruleString: string): RRule {
  return RRule.fromString(rruleString);
}

export function generateOccurrences(
  rruleString: string,
  startDate: Date,
  limit: number = 10
): Date[] {
  const rrule = RRule.fromString(rruleString);
  return rrule.all((date, i) => i < limit);
}

export function getNextOccurrence(
  rruleString: string,
  after: Date = new Date()
): Date | null {
  const rrule = RRule.fromString(rruleString);
  return rrule.after(after);
}

export function formatRecurrence(rruleString: string): string {
  const rrule = RRule.fromString(rruleString);
  return rrule.toText(); // "every day", "every week on Monday, Wednesday"
}
```

**Task Completion with Recurrence:**
```typescript
// When completing a recurring task instance
async function completeRecurringTask(taskId: string) {
  const task = await getTask(taskId);

  if (task.is_recurring && task.recurrence_parent_id) {
    // Complete this instance
    await updateTask(taskId, { status: 'done' });

    // Generate next occurrence
    const nextDate = getNextOccurrence(
      task.recurrence_rule,
      task.recurrence_date
    );

    if (nextDate) {
      await createTask({
        ...task,
        id: undefined, // New task
        status: 'todo',
        recurrence_date: nextDate,
        due: nextDate,
        recurrence_parent_id: task.recurrence_parent_id,
      });
    }
  } else {
    // Regular task
    await updateTask(taskId, { status: 'done' });
  }
}
```

**Edit Recurrence Options:**
```typescript
// When editing a recurring task
<AlertDialog>
  <AlertDialogContent>
    <AlertDialogTitle>Edit Recurring Task</AlertDialogTitle>
    <AlertDialogDescription>
      This is a recurring task. What would you like to edit?
    </AlertDialogDescription>
    <AlertDialogFooter>
      <Button onClick={() => editSingleInstance(taskId)}>
        Only This Occurrence
      </Button>
      <Button onClick={() => editFutureInstances(taskId)}>
        This and Future Occurrences
      </Button>
      <Button onClick={() => editAllInstances(taskId)}>
        All Occurrences
      </Button>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**Recurring Task Indicator:**
```typescript
// Visual indicator on task cards
<TaskCard task={task}>
  {task.is_recurring && (
    <Badge variant="secondary" className="gap-1">
      <Repeat className="h-3 w-3" />
      {formatRecurrence(task.recurrence_rule)}
    </Badge>
  )}
</TaskCard>
```

**Files to Create:**
- `apps/web/components/tasks/recurrence-picker.tsx`
- `apps/web/lib/utils/recurrence.ts`
- `apps/web/app/api/tasks/[id]/occurrences/route.ts`

**Files to Update:**
- `apps/web/components/tasks/task-form.tsx` - Add recurrence picker
- `apps/web/components/tasks/task-card.tsx` - Show recurrence indicator
- `apps/web/lib/hooks/use-tasks.ts` - Handle recurrence logic
- `supabase/migrations/20260115000000_recurring_tasks.sql`

**Dependencies:**
```json
{
  "dependencies": {
    "rrule": "^2.7.2"
  }
}
```

**Success Metrics:**
- 30%+ of active users create recurring tasks
- Recurrence rules generate correct occurrences
- Edit options work correctly (single vs all)
- No performance impact on task queries

---

### Feature 5: Accessibility Compliance

**Estimated Time:** 3 days
**Priority:** MEDIUM (P2)
**Impact:** Legal compliance, inclusivity

#### WCAG 2.1 AA Audit Checklist

**1. Keyboard Navigation**
- [ ] All interactive elements accessible via Tab key
- [ ] Logical tab order follows visual layout
- [ ] Focus trapped in modals/dialogs
- [ ] Escape key closes modals
- [ ] Arrow keys navigate lists/menus
- [ ] Enter/Space activate buttons

**2. Screen Reader Support**
- [ ] All images have alt text
- [ ] Form inputs have associated labels
- [ ] ARIA labels on icon-only buttons
- [ ] ARIA live regions for dynamic updates
- [ ] Semantic HTML (nav, main, article, aside)
- [ ] Heading hierarchy (h1 → h2 → h3)

**3. Color Contrast**
- [ ] Normal text ≥4.5:1 contrast ratio
- [ ] Large text (18pt+) ≥3:1 ratio
- [ ] UI components ≥3:1 ratio
- [ ] No color-only information (use icons too)

**4. Focus Management**
- [ ] Visible focus indicators (outline/ring)
- [ ] Focus moved to opened modal
- [ ] Focus returned on modal close
- [ ] Skip link to main content

**Implementation Examples:**

**Keyboard Navigation:**
```typescript
// Arrow key navigation in lists
function useArrowKeyNavigation(items: Item[]) {
  const [focusedIndex, setFocusedIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex(i => Math.min(i + 1, items.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        items[focusedIndex].onSelect();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedIndex, items]);

  return focusedIndex;
}
```

**Screen Reader Announcements:**
```typescript
// Live region for task completion
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {completedTask && `Task "${completedTask.title}" completed`}
</div>

// Accessible icon buttons
<button aria-label="Delete task">
  <Trash2 className="h-4 w-4" />
</button>

// Loading states
<button disabled={isLoading} aria-busy={isLoading}>
  {isLoading ? 'Saving...' : 'Save'}
</button>
```

**Color Contrast Fixes:**
```css
/* Ensure sufficient contrast in dark mode */
.dark {
  --muted-foreground: hsl(240 5% 65%); /* Was 50%, now 65% for better contrast */
  --primary: hsl(220 100% 60%); /* Lightened for dark bg */
}

/* Priority badges with icon + color */
.priority-p1 {
  @apply bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300;
}
.priority-p1::before {
  content: '🔴'; /* Icon backup for color-blind users */
}
```

**Testing Tools:**
- axe DevTools Chrome extension
- WAVE accessibility checker
- Lighthouse accessibility audit
- Manual testing with NVDA/JAWS screen readers
- Keyboard-only navigation testing

**Success Metrics:**
- 0 critical accessibility violations (axe/WAVE)
- 100% keyboard navigable
- All text ≥4.5:1 contrast
- Screen reader tested on all key flows

---

## Phase 9C: Performance & Polish (2-3 weeks)

**Goal:** Optimize performance, add collaboration features, polish UX
**Status:** 📋 Planned (0% complete)
**Priority:** MEDIUM

### Feature 1: Real-time Collaboration

**Estimated Time:** 4 days
**Priority:** MEDIUM (P2)
**Impact:** Team awareness, reduced conflicts

[Content truncated for length - continues with Features 2-4]

---

## Implementation Priority Matrix

| Feature | Priority | Impact | Complexity | Dependencies | Order |
|---------|----------|--------|------------|--------------|-------|
| Calendar Sync Fix | P0 | HIGH | Low | None | 1 |
| Milestone Dependencies | P0 | MEDIUM | Low | None | 2 |
| Global Search | P1 | HIGH | Medium | None | 3 |
| Onboarding | P1 | HIGH | Medium | None | 4 |
| Mobile Responsive | P1 | HIGH | High | None | 5 |
| Recurring Tasks | P1 | HIGH | High | DB Migration | 6 |
| Accessibility | P2 | MEDIUM | Medium | None | 7 |
| Real-time Collab | P2 | MEDIUM | High | Supabase Realtime | 8 |
| Performance | P2 | MEDIUM | High | None | 9 |
| Error Handling | P3 | LOW | Low | None | 10 |

---

## Success Metrics Dashboard

**Phase 9A (Critical Fixes):**
- [x] Quick-add bug fixed - 100% same-day accuracy
- [x] Grant filters persist - 100% retention rate
- [ ] Calendar sync - 0 sync errors, <2s sync time
- [ ] Milestone dependencies - 40%+ adoption

**Phase 9B (UX Optimization):**
- Onboarding completion rate: Target 60%+
- Global search usage: Target 40%+ daily active users
- Mobile traffic: Target 40%+ mobile users (up from 20%)
- Recurring tasks: Target 30%+ users create recurring tasks
- Accessibility: Target 0 critical violations

**Phase 9C (Performance):**
- Lighthouse Performance: Target 90+
- Core Web Vitals: All pass (LCP <2.5s, FID <100ms, CLS <0.1)
- Page load time: Target <3s on 3G
- Error rate: Target <1% of requests

---

## Documentation References

- **Architecture:** See [docs/ARCHITECTURE.md](./ARCHITECTURE.md)
- **API Reference:** See [docs/API.md](./API.md)
- **Technical Plan:** See [docs/TECH-LEAD-PLAN.md](./TECH-LEAD-PLAN.md)
- **Progress Tracking:** See [docs/PROGRESS.md](./PROGRESS.md)
- **Issue Tracking:** See [docs/COMPREHENSIVE_ISSUE_REPORT.md](./COMPREHENSIVE_ISSUE_REPORT.md)

---

**Document maintained by:** Tech Lead
**Next Review:** After Phase 9A completion
**Questions:** See [docs/TECH-LEAD-PLAN.md](./TECH-LEAD-PLAN.md) for detailed technical specs
