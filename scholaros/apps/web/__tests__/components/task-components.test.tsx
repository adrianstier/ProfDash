import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "../utils/test-utils";
import userEvent from "@testing-library/user-event";
import { TaskCard } from "@/components/tasks/task-card";
import { TaskSectionGroup, TaskSectionsList } from "@/components/tasks/task-section-header";
import { RecurrenceBadge } from "@/components/tasks/recurrence-picker";
import { FocusModeToggle } from "@/components/tasks/focus-mode-toggle";
import { TodayProgress } from "@/components/tasks/today-progress";
import { DuplicateWarning } from "@/components/tasks/duplicate-warning";
import type { TaskFromAPI } from "@/lib/hooks/use-tasks";
import type { TaskSection } from "@/lib/utils/task-grouping";

// ============================================================================
// Mocks
// ============================================================================

// Mock task store
const mockOpenTaskDetail = vi.fn();
const mockToggleTaskSelection = vi.fn();
const mockToggleFocusMode = vi.fn();

vi.mock("@/lib/stores/task-store", () => ({
  useTaskStore: vi.fn((selector?: (state: unknown) => unknown) => {
    const state = {
      openTaskDetail: mockOpenTaskDetail,
      isSelectionMode: false,
      toggleTaskSelection: mockToggleTaskSelection,
      selectedTaskIds: new Set<string>(),
      focusMode: false,
      toggleFocusMode: mockToggleFocusMode,
      filters: { status: null, priority: null, category: null, search: "" },
      sortBy: "priority",
      sortDirection: "asc",
      setFilter: vi.fn(),
      clearFilters: vi.fn(),
      setSort: vi.fn(),
      setEditingTask: vi.fn(),
    };
    if (typeof selector === "function") return selector(state);
    return state;
  }),
  filterTasks: vi.fn((tasks: TaskFromAPI[]) => tasks),
  sortTasks: vi.fn((tasks: TaskFromAPI[]) => tasks),
  applyFocusModeFilter: vi.fn((tasks: TaskFromAPI[]) => tasks),
}));

vi.mock("@/lib/stores/workspace-store", () => ({
  useWorkspaceStore: vi.fn(() => ({
    currentWorkspaceId: "workspace-1",
  })),
}));

// Mock hooks
vi.mock("@/lib/hooks/use-tasks", () => ({
  useTasks: vi.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
  })),
  useCreateTask: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
  })),
  useToggleTaskComplete: vi.fn(() => ({
    mutate: vi.fn(),
  })),
  useDeleteTask: vi.fn(() => ({
    mutate: vi.fn(),
  })),
  useBulkUpdateTasks: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useBulkDeleteTasks: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

// Mock dnd-kit
vi.mock("@dnd-kit/sortable", () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: {
    Transform: {
      toString: () => undefined,
    },
  },
}));

// Mock duplicate detection
vi.mock("@/lib/utils/duplicate-detection", () => ({
  findPotentialDuplicates: vi.fn(() => []),
}));

// Mock Tooltip components to avoid Radix portal issues in tests
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock Badge component
vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span data-testid="badge" className={className}>{children}</span>
  ),
}));

// ============================================================================
// Test Data Factories
// ============================================================================

function createMockTask(overrides: Partial<TaskFromAPI> = {}): TaskFromAPI {
  return {
    id: crypto.randomUUID(),
    user_id: "user-1",
    title: "Test Task",
    description: null,
    priority: "p3",
    category: "research",
    status: "todo",
    due: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function createMockSection(overrides: Partial<TaskSection> = {}): TaskSection {
  return {
    id: "today",
    title: "Today",
    color: "text-amber-500",
    bgColor: "bg-amber-50",
    count: 2,
    tasks: [
      createMockTask({ id: "t1", title: "Task One" }),
      createMockTask({ id: "t2", title: "Task Two" }),
    ],
    ...overrides,
  } as TaskSection;
}

// ============================================================================
// TaskCard Tests
// ============================================================================

describe("TaskCard", () => {
  const defaultTask = createMockTask({
    id: "task-1",
    title: "Review NSF proposal",
    description: "Final review before submission",
    priority: "p1",
    category: "grants",
    status: "todo",
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders task title", () => {
      render(<TaskCard task={defaultTask} />);
      expect(screen.getByText("Review NSF proposal")).toBeInTheDocument();
    });

    it("renders task description when not compact", () => {
      render(<TaskCard task={defaultTask} />);
      expect(screen.getByText("Final review before submission")).toBeInTheDocument();
    });

    it("hides description in compact mode", () => {
      render(<TaskCard task={defaultTask} isCompact />);
      expect(screen.queryByText("Final review before submission")).not.toBeInTheDocument();
    });

    it("renders priority flag for non-p4 tasks", () => {
      render(<TaskCard task={defaultTask} />);
      // P1 priority should show the uppercase label
      expect(screen.getByText("p1")).toBeInTheDocument();
    });

    it("does not render priority for p4 tasks", () => {
      const p4Task = createMockTask({ priority: "p4", title: "Low priority" });
      render(<TaskCard task={p4Task} />);
      expect(screen.queryByText("p4")).not.toBeInTheDocument();
    });

    it("renders category badge when not compact", () => {
      render(<TaskCard task={defaultTask} />);
      expect(screen.getByText("grants")).toBeInTheDocument();
    });

    it("hides category badge in compact mode", () => {
      render(<TaskCard task={defaultTask} isCompact />);
      expect(screen.queryByText("grants")).not.toBeInTheDocument();
    });

    it("renders due date when present", () => {
      // Use T00:00:00 suffix to ensure parsing as local time (not UTC)
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}T00:00:00`;
      const taskWithDue = createMockTask({ due: todayStr, title: "Due task" });
      render(<TaskCard task={taskWithDue} />);
      expect(screen.getByText("Today")).toBeInTheDocument();
    });

    it("renders recurring indicator", () => {
      const recurringTask = createMockTask({
        title: "Weekly meeting",
        is_recurring: true,
      });
      render(<TaskCard task={recurringTask} />);
      // The Repeat icon is rendered with title "Recurring task"
      expect(screen.getByTitle("Recurring task")).toBeInTheDocument();
    });

    it("renders subtask progress when subtasks exist", () => {
      const taskWithSubtasks = createMockTask({
        title: "Parent task",
        subtasks: [
          { id: "s1", text: "Sub 1", completed: true },
          { id: "s2", text: "Sub 2", completed: false },
          { id: "s3", text: "Sub 3", completed: true },
        ],
      });
      render(<TaskCard task={taskWithSubtasks} />);
      expect(screen.getByText("2/3")).toBeInTheDocument();
    });
  });

  describe("completion states", () => {
    it("shows completed styling for done tasks", () => {
      const doneTask = createMockTask({ status: "done", title: "Done task" });
      render(<TaskCard task={doneTask} />);
      const titleElement = screen.getByText("Done task");
      expect(titleElement.className).toContain("line-through");
    });

    it("renders completion checkbox with correct aria", () => {
      render(<TaskCard task={defaultTask} />);
      const checkbox = screen.getByRole("checkbox", {
        name: /Mark "Review NSF proposal" as complete/,
      });
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toHaveAttribute("aria-checked", "false");
    });

    it("shows checked state for done tasks", () => {
      const doneTask = createMockTask({
        status: "done",
        title: "Completed task",
      });
      render(<TaskCard task={doneTask} />);
      const checkbox = screen.getByRole("checkbox", {
        name: /Mark "Completed task" as incomplete/,
      });
      expect(checkbox).toHaveAttribute("aria-checked", "true");
    });
  });

  describe("interactions", () => {
    it("calls onToggleComplete when checkbox clicked", () => {
      const onToggle = vi.fn();
      render(<TaskCard task={defaultTask} onToggleComplete={onToggle} />);
      const checkbox = screen.getByRole("checkbox", {
        name: /Mark "Review NSF proposal" as complete/,
      });
      fireEvent.click(checkbox);
      expect(onToggle).toHaveBeenCalledWith(defaultTask);
    });

    it("opens task detail when content area clicked", () => {
      render(<TaskCard task={defaultTask} />);
      const contentButton = screen.getByRole("button", {
        name: /Open details for task: Review NSF proposal/,
      });
      fireEvent.click(contentButton);
      expect(mockOpenTaskDetail).toHaveBeenCalledWith("task-1");
    });

    it("shows menu when options button is clicked", () => {
      render(
        <TaskCard
          task={defaultTask}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      );
      const optionsButton = screen.getByLabelText(
        'Task options for "Review NSF proposal"'
      );
      fireEvent.click(optionsButton);
      expect(screen.getByRole("menu")).toBeInTheDocument();
      expect(screen.getByRole("menuitem", { name: /Edit/ })).toBeInTheDocument();
      expect(screen.getByRole("menuitem", { name: /Delete/ })).toBeInTheDocument();
    });

    it("calls onEdit when Edit menu item clicked", () => {
      const onEdit = vi.fn();
      render(<TaskCard task={defaultTask} onEdit={onEdit} />);
      // Open menu
      const optionsButton = screen.getByLabelText(
        'Task options for "Review NSF proposal"'
      );
      fireEvent.click(optionsButton);
      // Click edit
      fireEvent.click(screen.getByRole("menuitem", { name: /Edit/ }));
      expect(onEdit).toHaveBeenCalledWith(defaultTask);
    });

    it("calls onDelete when Delete menu item clicked", () => {
      const onDelete = vi.fn();
      render(<TaskCard task={defaultTask} onDelete={onDelete} />);
      // Open menu
      const optionsButton = screen.getByLabelText(
        'Task options for "Review NSF proposal"'
      );
      fireEvent.click(optionsButton);
      // Click delete
      fireEvent.click(screen.getByRole("menuitem", { name: /Delete/ }));
      expect(onDelete).toHaveBeenCalledWith(defaultTask);
    });
  });

  describe("overdue display", () => {
    it("shows overdue styling for past-due incomplete tasks", () => {
      const overdueTask = createMockTask({
        title: "Overdue task",
        due: "2020-01-15",
        status: "todo",
      });
      render(<TaskCard task={overdueTask} />);
      // The overdue date label should have the overdue class
      const dateElement = screen.getByText(/Jan/);
      expect(dateElement.className).toContain("text-priority-p1");
    });

    it("does not show overdue for completed tasks", () => {
      const completedPastTask = createMockTask({
        title: "Done past task",
        due: "2020-01-15",
        status: "done",
      });
      render(<TaskCard task={completedPastTask} />);
      const dateElement = screen.getByText(/Jan/);
      expect(dateElement.className).not.toContain("text-priority-p1");
    });
  });

  describe("drag handle", () => {
    it("renders drag handle when isDraggable is true", () => {
      render(<TaskCard task={defaultTask} isDraggable />);
      expect(
        screen.getByLabelText(/Drag to reorder task: Review NSF proposal/)
      ).toBeInTheDocument();
    });

    it("does not render drag handle by default", () => {
      render(<TaskCard task={defaultTask} />);
      expect(
        screen.queryByLabelText(/Drag to reorder/)
      ).not.toBeInTheDocument();
    });
  });
});

// ============================================================================
// TaskSectionGroup Tests
// ============================================================================

describe("TaskSectionGroup", () => {
  const defaultSection = createMockSection();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders section title and count", () => {
    render(<TaskSectionGroup section={defaultSection} />);
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders tasks when expanded (default)", () => {
    render(<TaskSectionGroup section={defaultSection} />);
    expect(screen.getByText("Task One")).toBeInTheDocument();
    expect(screen.getByText("Task Two")).toBeInTheDocument();
  });

  it("hides tasks when defaultCollapsed is true", () => {
    render(<TaskSectionGroup section={defaultSection} defaultCollapsed />);
    expect(screen.queryByText("Task One")).not.toBeInTheDocument();
  });

  it("toggles collapse on header click", () => {
    render(<TaskSectionGroup section={defaultSection} />);
    // Initially expanded
    expect(screen.getByText("Task One")).toBeInTheDocument();
    // Click header to collapse - button contains section title "Today"
    const header = screen.getByRole("button", { name: /Today/ });
    fireEvent.click(header);
    expect(screen.queryByText("Task One")).not.toBeInTheDocument();
    // Click again to expand
    fireEvent.click(header);
    expect(screen.getByText("Task One")).toBeInTheDocument();
  });

  it("shows empty message when section has no tasks", () => {
    const emptySection = createMockSection({ tasks: [], count: 0 });
    // Note: TaskSectionGroup renders even with 0 tasks
    render(<TaskSectionGroup section={emptySection} />);
    expect(screen.getByText("No tasks in this section")).toBeInTheDocument();
  });

  it("sets aria-expanded correctly", () => {
    render(<TaskSectionGroup section={defaultSection} />);
    const button = screen.getByRole("button", { name: /Today/ });
    expect(button).toHaveAttribute("aria-expanded", "true");
  });
});

// ============================================================================
// TaskSectionsList Tests
// ============================================================================

describe("TaskSectionsList", () => {
  it("renders multiple sections", () => {
    const sections = [
      createMockSection({ id: "today", title: "Today", count: 2 }),
      createMockSection({ id: "tomorrow", title: "Tomorrow", count: 1, tasks: [createMockTask({ id: "t3", title: "Task Three" })] }),
    ] as TaskSection[];
    render(<TaskSectionsList sections={sections} />);
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("Tomorrow")).toBeInTheDocument();
  });

  it("shows empty message when all sections are empty", () => {
    const sections = [
      createMockSection({ id: "today", title: "Today", count: 0, tasks: [] }),
    ] as TaskSection[];
    render(<TaskSectionsList sections={sections} />);
    expect(screen.getByText("No tasks to display")).toBeInTheDocument();
  });

  it("shows custom empty message", () => {
    const sections = [
      createMockSection({ count: 0, tasks: [] }),
    ] as TaskSection[];
    render(
      <TaskSectionsList sections={sections} emptyMessage="Nothing here" />
    );
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });

  it("hides sections with 0 count", () => {
    const sections = [
      createMockSection({ id: "today", title: "Today", count: 2 }),
      createMockSection({ id: "later", title: "Later", count: 0, tasks: [] }),
    ] as TaskSection[];
    render(<TaskSectionsList sections={sections} />);
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.queryByText("Later")).not.toBeInTheDocument();
  });
});

// ============================================================================
// DuplicateWarning Tests
// ============================================================================

describe("DuplicateWarning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing when input is too short", () => {
    const { container } = render(
      <DuplicateWarning
        inputValue="ab"
        existingTasks={[]}
        onCreateAnyway={vi.fn()}
        onGoToTask={vi.fn()}
      />
    );
    vi.advanceTimersByTime(500);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when no duplicates found", () => {
    const { container } = render(
      <DuplicateWarning
        inputValue="A unique task title"
        existingTasks={[createMockTask({ title: "Something else" })]}
        onCreateAnyway={vi.fn()}
        onGoToTask={vi.fn()}
      />
    );
    vi.advanceTimersByTime(500);
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it("renders alert with create-anyway button when duplicates detected", async () => {
    const { findPotentialDuplicates } = await import(
      "@/lib/utils/duplicate-detection"
    );
    (findPotentialDuplicates as ReturnType<typeof vi.fn>).mockReturnValue([
      {
        task: createMockTask({ id: "dup-1", title: "NSF Proposal" }),
        confidence: 85,
        matchType: "similar",
      },
    ]);

    render(
      <DuplicateWarning
        inputValue="NSF Proposal review"
        existingTasks={[createMockTask({ id: "dup-1", title: "NSF Proposal" })]}
        onCreateAnyway={vi.fn()}
        onGoToTask={vi.fn()}
      />
    );

    // Advance fake timers inside act to flush React state updates
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/Similar task/)).toBeInTheDocument();
    expect(screen.getByText("Create anyway")).toBeInTheDocument();
  });

  it("calls onCreateAnyway when button clicked", async () => {
    const { findPotentialDuplicates } = await import(
      "@/lib/utils/duplicate-detection"
    );
    (findPotentialDuplicates as ReturnType<typeof vi.fn>).mockReturnValue([
      {
        task: createMockTask({ id: "dup-1", title: "NSF Proposal" }),
        confidence: 85,
        matchType: "similar",
      },
    ]);

    const onCreateAnyway = vi.fn();
    render(
      <DuplicateWarning
        inputValue="NSF Proposal review"
        existingTasks={[createMockTask({ id: "dup-1", title: "NSF Proposal" })]}
        onCreateAnyway={onCreateAnyway}
        onGoToTask={vi.fn()}
      />
    );

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByText("Create anyway")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Create anyway"));
    expect(onCreateAnyway).toHaveBeenCalled();
  });

  it("calls onGoToTask when duplicate is clicked", async () => {
    const { findPotentialDuplicates } = await import(
      "@/lib/utils/duplicate-detection"
    );
    (findPotentialDuplicates as ReturnType<typeof vi.fn>).mockReturnValue([
      {
        task: createMockTask({ id: "dup-1", title: "NSF Proposal" }),
        confidence: 85,
        matchType: "similar",
      },
    ]);

    const onGoToTask = vi.fn();
    render(
      <DuplicateWarning
        inputValue="NSF Proposal review"
        existingTasks={[createMockTask({ id: "dup-1", title: "NSF Proposal" })]}
        onCreateAnyway={vi.fn()}
        onGoToTask={onGoToTask}
      />
    );

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByText("NSF Proposal")).toBeInTheDocument();
    fireEvent.click(screen.getByText("NSF Proposal"));
    expect(onGoToTask).toHaveBeenCalledWith("dup-1");
  });
});

// ============================================================================
// RecurrenceBadge Tests
// ============================================================================

describe("RecurrenceBadge", () => {
  // Mock recurrence utilities
  vi.mock("@/lib/utils/recurrence", () => ({
    rruleToText: vi.fn((rrule: string) => {
      if (rrule === "FREQ=DAILY") return "Daily";
      if (rrule === "FREQ=WEEKLY") return "Weekly";
      return "Custom";
    }),
    parseRRule: vi.fn(),
    generateRRule: vi.fn(),
    getNextOccurrences: vi.fn(() => []),
    formatOccurrenceDate: vi.fn(),
    RECURRENCE_PRESETS: {
      daily: "FREQ=DAILY",
      weekdays: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
      weekly: "FREQ=WEEKLY",
      biweekly: "FREQ=WEEKLY;INTERVAL=2",
      monthly: "FREQ=MONTHLY",
      yearly: "FREQ=YEARLY",
    },
    DAY_ABBREVIATIONS: {
      SU: "Sun",
      MO: "Mon",
      TU: "Tue",
      WE: "Wed",
      TH: "Thu",
      FR: "Fri",
      SA: "Sat",
    },
  }));

  it("renders nothing when rrule is null", () => {
    const { container } = render(<RecurrenceBadge rrule={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when rrule is undefined", () => {
    const { container } = render(<RecurrenceBadge rrule={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders badge with daily text", () => {
    render(<RecurrenceBadge rrule="FREQ=DAILY" />);
    expect(screen.getByText("Daily")).toBeInTheDocument();
  });

  it("renders badge with weekly text", () => {
    render(<RecurrenceBadge rrule="FREQ=WEEKLY" />);
    expect(screen.getByText("Weekly")).toBeInTheDocument();
  });
});

// ============================================================================
// FocusModeToggle Tests
// ============================================================================

describe("FocusModeToggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with correct aria-label when inactive", () => {
    render(<FocusModeToggle />);
    const button = screen.getByRole("button", { name: "Enter focus mode" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("calls toggleFocusMode when clicked", () => {
    render(<FocusModeToggle />);
    const button = screen.getByRole("button", { name: "Enter focus mode" });
    fireEvent.click(button);
    expect(mockToggleFocusMode).toHaveBeenCalled();
  });

  it("shows label when showLabel is true", () => {
    render(<FocusModeToggle showLabel />);
    expect(screen.getByText("Focus")).toBeInTheDocument();
  });
});

// ============================================================================
// TodayProgress Tests
// ============================================================================

describe("TodayProgress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows empty state when no tasks", () => {
    render(<TodayProgress />);
    expect(screen.getByText("Start Your Day")).toBeInTheDocument();
    expect(
      screen.getByText(/No tasks scheduled for today/)
    ).toBeInTheDocument();
  });

  it("shows progress when tasks exist", async () => {
    const today = new Date().toISOString().split("T")[0];
    const { useTasks } = await import("@/lib/hooks/use-tasks");
    (useTasks as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [
        createMockTask({ due: today, status: "done" }),
        createMockTask({ due: today, status: "todo" }),
        createMockTask({ due: today, status: "todo" }),
      ],
      isLoading: false,
    });

    render(<TodayProgress />);
    expect(screen.getByText("Today's Progress")).toBeInTheDocument();
    expect(screen.getByText("1 of 3 tasks")).toBeInTheDocument();
    expect(screen.getByText("33% complete")).toBeInTheDocument();
  });

  it("shows all-done celebration when all tasks completed", async () => {
    const today = new Date().toISOString().split("T")[0];
    const { useTasks } = await import("@/lib/hooks/use-tasks");
    (useTasks as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [
        createMockTask({ due: today, status: "done" }),
        createMockTask({ due: today, status: "done" }),
      ],
      isLoading: false,
    });

    render(<TodayProgress />);
    expect(screen.getByText("All Done!")).toBeInTheDocument();
  });

  it("shows overdue warning when overdue tasks exist", async () => {
    const today = new Date().toISOString().split("T")[0];
    const { useTasks } = await import("@/lib/hooks/use-tasks");
    (useTasks as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [
        createMockTask({ due: today, status: "todo" }),
        createMockTask({ due: "2020-01-01", status: "todo" }),
      ],
      isLoading: false,
    });

    render(<TodayProgress />);
    expect(screen.getByText(/1 overdue task/)).toBeInTheDocument();
  });
});
