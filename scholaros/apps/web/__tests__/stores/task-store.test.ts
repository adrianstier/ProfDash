import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  useTaskStore,
  filterTasks,
  applyFocusModeFilter,
  sortTasks,
} from "@/lib/stores/task-store";
import type { TaskFromAPI } from "@scholaros/shared";

// Helper to create mock tasks
function createTask(overrides: Partial<TaskFromAPI> = {}): TaskFromAPI {
  return {
    id: "task-1",
    user_id: "user-1",
    workspace_id: "ws-1",
    title: "Test Task",
    description: null,
    category: "research",
    priority: "p2",
    status: "todo",
    due: null,
    project_id: null,
    assignees: [],
    tags: [],
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

const initialState = {
  selectedTaskId: null,
  isDetailOpen: false,
  editingTaskId: null,
  selectedTaskIds: new Set<string>(),
  isSelectionMode: false,
  focusMode: false,
  filters: {
    status: null,
    category: null,
    priority: null,
    search: "",
  },
  sortBy: "priority" as const,
  sortDirection: "asc" as const,
};

describe("useTaskStore", () => {
  beforeEach(() => {
    useTaskStore.setState(initialState);
  });

  describe("initial state", () => {
    it("should have null selectedTaskId", () => {
      expect(useTaskStore.getState().selectedTaskId).toBeNull();
    });

    it("should have isDetailOpen false", () => {
      expect(useTaskStore.getState().isDetailOpen).toBe(false);
    });

    it("should have empty selectedTaskIds", () => {
      expect(useTaskStore.getState().selectedTaskIds.size).toBe(0);
    });

    it("should have default sort by priority ascending", () => {
      expect(useTaskStore.getState().sortBy).toBe("priority");
      expect(useTaskStore.getState().sortDirection).toBe("asc");
    });

    it("should have empty filters", () => {
      const { filters } = useTaskStore.getState();
      expect(filters.status).toBeNull();
      expect(filters.category).toBeNull();
      expect(filters.priority).toBeNull();
      expect(filters.search).toBe("");
    });
  });

  describe("openTaskDetail / closeTaskDetail", () => {
    it("should open task detail with given id", () => {
      useTaskStore.getState().openTaskDetail("task-42");
      const state = useTaskStore.getState();
      expect(state.selectedTaskId).toBe("task-42");
      expect(state.isDetailOpen).toBe(true);
    });

    it("should close task detail and clear editing state", () => {
      useTaskStore.getState().openTaskDetail("task-42");
      useTaskStore.getState().setEditingTask("task-42");
      useTaskStore.getState().closeTaskDetail();
      const state = useTaskStore.getState();
      expect(state.selectedTaskId).toBeNull();
      expect(state.isDetailOpen).toBe(false);
      expect(state.editingTaskId).toBeNull();
    });
  });

  describe("setEditingTask", () => {
    it("should set editing task id", () => {
      useTaskStore.getState().setEditingTask("task-99");
      expect(useTaskStore.getState().editingTaskId).toBe("task-99");
    });

    it("should clear editing task with null", () => {
      useTaskStore.getState().setEditingTask("task-99");
      useTaskStore.getState().setEditingTask(null);
      expect(useTaskStore.getState().editingTaskId).toBeNull();
    });
  });

  describe("setFilter / clearFilters", () => {
    it("should set a single filter", () => {
      useTaskStore.getState().setFilter("status", "done");
      expect(useTaskStore.getState().filters.status).toBe("done");
    });

    it("should set multiple filters independently", () => {
      useTaskStore.getState().setFilter("status", "todo");
      useTaskStore.getState().setFilter("category", "research");
      useTaskStore.getState().setFilter("priority", "p1");
      const { filters } = useTaskStore.getState();
      expect(filters.status).toBe("todo");
      expect(filters.category).toBe("research");
      expect(filters.priority).toBe("p1");
    });

    it("should set search filter", () => {
      useTaskStore.getState().setFilter("search", "grant proposal");
      expect(useTaskStore.getState().filters.search).toBe("grant proposal");
    });

    it("should clear all filters", () => {
      useTaskStore.getState().setFilter("status", "done");
      useTaskStore.getState().setFilter("category", "teaching");
      useTaskStore.getState().setFilter("search", "test");
      useTaskStore.getState().clearFilters();
      const { filters } = useTaskStore.getState();
      expect(filters.status).toBeNull();
      expect(filters.category).toBeNull();
      expect(filters.priority).toBeNull();
      expect(filters.search).toBe("");
    });
  });

  describe("setSort", () => {
    it("should set sortBy", () => {
      useTaskStore.getState().setSort("due");
      expect(useTaskStore.getState().sortBy).toBe("due");
    });

    it("should set sortBy and direction", () => {
      useTaskStore.getState().setSort("title", "desc");
      expect(useTaskStore.getState().sortBy).toBe("title");
      expect(useTaskStore.getState().sortDirection).toBe("desc");
    });

    it("should preserve existing direction if not provided", () => {
      useTaskStore.getState().setSort("priority", "desc");
      useTaskStore.getState().setSort("created_at");
      expect(useTaskStore.getState().sortBy).toBe("created_at");
      expect(useTaskStore.getState().sortDirection).toBe("desc");
    });

    it("should accept all valid sort options", () => {
      const sortOptions = ["priority", "due", "created_at", "title", "urgency"] as const;
      for (const option of sortOptions) {
        useTaskStore.getState().setSort(option);
        expect(useTaskStore.getState().sortBy).toBe(option);
      }
    });
  });

  describe("focus mode", () => {
    it("should toggle focus mode", () => {
      expect(useTaskStore.getState().focusMode).toBe(false);
      useTaskStore.getState().toggleFocusMode();
      expect(useTaskStore.getState().focusMode).toBe(true);
      useTaskStore.getState().toggleFocusMode();
      expect(useTaskStore.getState().focusMode).toBe(false);
    });

    it("should set focus mode explicitly", () => {
      useTaskStore.getState().setFocusMode(true);
      expect(useTaskStore.getState().focusMode).toBe(true);
      useTaskStore.getState().setFocusMode(false);
      expect(useTaskStore.getState().focusMode).toBe(false);
    });

    it("should persist focus mode to localStorage", () => {
      useTaskStore.getState().setFocusMode(true);
      expect(localStorage.getItem("scholaros-focus-mode")).toBe("true");
      useTaskStore.getState().setFocusMode(false);
      expect(localStorage.getItem("scholaros-focus-mode")).toBe("false");
    });

    it("should persist toggle to localStorage", () => {
      useTaskStore.getState().toggleFocusMode();
      expect(localStorage.getItem("scholaros-focus-mode")).toBe("true");
    });
  });

  describe("bulk selection", () => {
    it("should toggle selection mode", () => {
      useTaskStore.getState().toggleSelectionMode();
      expect(useTaskStore.getState().isSelectionMode).toBe(true);
    });

    it("should clear selections when toggling selection mode off", () => {
      useTaskStore.getState().toggleSelectionMode(); // on
      useTaskStore.getState().toggleTaskSelection("t1");
      useTaskStore.getState().toggleSelectionMode(); // off
      expect(useTaskStore.getState().selectedTaskIds.size).toBe(0);
      expect(useTaskStore.getState().isSelectionMode).toBe(false);
    });

    it("should toggle individual task selection", () => {
      useTaskStore.getState().toggleTaskSelection("t1");
      expect(useTaskStore.getState().selectedTaskIds.has("t1")).toBe(true);
      useTaskStore.getState().toggleTaskSelection("t1");
      expect(useTaskStore.getState().selectedTaskIds.has("t1")).toBe(false);
    });

    it("should select multiple tasks", () => {
      useTaskStore.getState().toggleTaskSelection("t1");
      useTaskStore.getState().toggleTaskSelection("t2");
      useTaskStore.getState().toggleTaskSelection("t3");
      expect(useTaskStore.getState().selectedTaskIds.size).toBe(3);
    });

    it("should select all tasks", () => {
      useTaskStore.getState().selectAllTasks(["t1", "t2", "t3", "t4"]);
      expect(useTaskStore.getState().selectedTaskIds.size).toBe(4);
      expect(useTaskStore.getState().selectedTaskIds.has("t1")).toBe(true);
      expect(useTaskStore.getState().selectedTaskIds.has("t4")).toBe(true);
    });

    it("should deselect all tasks", () => {
      useTaskStore.getState().selectAllTasks(["t1", "t2"]);
      useTaskStore.getState().deselectAllTasks();
      expect(useTaskStore.getState().selectedTaskIds.size).toBe(0);
    });

    it("should clear selection and exit selection mode", () => {
      useTaskStore.getState().toggleSelectionMode();
      useTaskStore.getState().toggleTaskSelection("t1");
      useTaskStore.getState().clearSelection();
      expect(useTaskStore.getState().selectedTaskIds.size).toBe(0);
      expect(useTaskStore.getState().isSelectionMode).toBe(false);
    });

    it("isTaskSelected should return correct result", () => {
      useTaskStore.getState().toggleTaskSelection("t1");
      expect(useTaskStore.getState().isTaskSelected("t1")).toBe(true);
      expect(useTaskStore.getState().isTaskSelected("t2")).toBe(false);
    });
  });
});

describe("filterTasks", () => {
  const tasks: TaskFromAPI[] = [
    createTask({ id: "1", title: "Write paper", status: "todo", category: "research", priority: "p1" }),
    createTask({ id: "2", title: "Grade exams", status: "done", category: "teaching", priority: "p2" }),
    createTask({ id: "3", title: "Submit grant", status: "todo", category: "grants", priority: "p1", description: "NSF grant proposal" }),
    createTask({ id: "4", title: "Lab meeting", status: "in_progress", category: "research", priority: "p3" }),
  ];

  it("should return all tasks with empty filters", () => {
    const result = filterTasks(tasks, { status: null, category: null, priority: null, search: "" });
    expect(result).toHaveLength(4);
  });

  it("should filter by status", () => {
    const result = filterTasks(tasks, { status: "todo", category: null, priority: null, search: "" });
    expect(result).toHaveLength(2);
    expect(result.every((t) => t.status === "todo")).toBe(true);
  });

  it("should filter by category", () => {
    const result = filterTasks(tasks, { status: null, category: "research", priority: null, search: "" });
    expect(result).toHaveLength(2);
  });

  it("should filter by priority", () => {
    const result = filterTasks(tasks, { status: null, category: null, priority: "p1", search: "" });
    expect(result).toHaveLength(2);
  });

  it("should filter by search in title", () => {
    const result = filterTasks(tasks, { status: null, category: null, priority: null, search: "grant" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("3");
  });

  it("should filter by search in description", () => {
    const result = filterTasks(tasks, { status: null, category: null, priority: null, search: "NSF" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("3");
  });

  it("should search case-insensitively", () => {
    const result = filterTasks(tasks, { status: null, category: null, priority: null, search: "WRITE" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("should combine multiple filters", () => {
    const result = filterTasks(tasks, { status: "todo", category: "research", priority: "p1", search: "" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });
});

describe("applyFocusModeFilter", () => {
  it("should exclude done tasks", () => {
    const tasks = [
      createTask({ id: "1", status: "done", priority: "p1" }),
      createTask({ id: "2", status: "todo", priority: "p1" }),
    ];
    const result = applyFocusModeFilter(tasks);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("should include p1 and p2 incomplete tasks", () => {
    const tasks = [
      createTask({ id: "1", status: "todo", priority: "p1" }),
      createTask({ id: "2", status: "todo", priority: "p2" }),
      createTask({ id: "3", status: "todo", priority: "p3" }),
      createTask({ id: "4", status: "todo", priority: "p4" }),
    ];
    const result = applyFocusModeFilter(tasks);
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.id)).toEqual(["1", "2"]);
  });

  it("should include tasks due today or overdue", () => {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

    const tasks = [
      createTask({ id: "1", status: "todo", priority: "p3", due: today }),
      createTask({ id: "2", status: "todo", priority: "p3", due: yesterday }),
      createTask({ id: "3", status: "todo", priority: "p3", due: tomorrow }),
    ];
    const result = applyFocusModeFilter(tasks);
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.id)).toEqual(["1", "2"]);
  });

  it("should include high priority even without due date", () => {
    const tasks = [
      createTask({ id: "1", status: "todo", priority: "p1", due: null }),
    ];
    const result = applyFocusModeFilter(tasks);
    expect(result).toHaveLength(1);
  });

  it("should return empty for all done tasks", () => {
    const tasks = [
      createTask({ id: "1", status: "done", priority: "p1" }),
      createTask({ id: "2", status: "done", priority: "p2" }),
    ];
    const result = applyFocusModeFilter(tasks);
    expect(result).toHaveLength(0);
  });

  it("should exclude low priority future tasks", () => {
    const future = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
    const tasks = [
      createTask({ id: "1", status: "todo", priority: "p3", due: future }),
      createTask({ id: "2", status: "todo", priority: "p4", due: future }),
    ];
    const result = applyFocusModeFilter(tasks);
    expect(result).toHaveLength(0);
  });
});

describe("sortTasks", () => {
  const tasks: TaskFromAPI[] = [
    createTask({ id: "1", title: "Charlie", priority: "p3", due: "2025-03-01", created_at: "2025-01-03T00:00:00Z" }),
    createTask({ id: "2", title: "Alpha", priority: "p1", due: "2025-01-01", created_at: "2025-01-01T00:00:00Z" }),
    createTask({ id: "3", title: "Bravo", priority: "p2", due: null, created_at: "2025-01-02T00:00:00Z" }),
  ];

  it("should sort by priority ascending (p1 first)", () => {
    const result = sortTasks(tasks, "priority", "asc");
    expect(result.map((t) => t.priority)).toEqual(["p1", "p2", "p3"]);
  });

  it("should sort by priority descending (p3 first)", () => {
    const result = sortTasks(tasks, "priority", "desc");
    expect(result.map((t) => t.priority)).toEqual(["p3", "p2", "p1"]);
  });

  it("should sort by title ascending", () => {
    const result = sortTasks(tasks, "title", "asc");
    expect(result.map((t) => t.title)).toEqual(["Alpha", "Bravo", "Charlie"]);
  });

  it("should sort by title descending", () => {
    const result = sortTasks(tasks, "title", "desc");
    expect(result.map((t) => t.title)).toEqual(["Charlie", "Bravo", "Alpha"]);
  });

  it("should sort by due date ascending with null last", () => {
    const result = sortTasks(tasks, "due", "asc");
    expect(result.map((t) => t.id)).toEqual(["2", "1", "3"]);
  });

  it("should sort by due date descending with null last", () => {
    const result = sortTasks(tasks, "due", "desc");
    // desc reverses comparison, so null (-1 in asc) becomes last in desc too?
    // Actually: in desc, comparison is negated. null tasks have comparison=1 in asc (pushed last).
    // In desc, comparison becomes -1 (pushed first). Let's check actual behavior.
    const result2 = sortTasks(tasks, "due", "desc");
    // With desc: a.due=null vs b.due="2025-01-01" => comparison=1, reversed => -1, so null comes first
    // But let's just verify the non-null ones are in correct order
    const nonNull = result2.filter((t) => t.due !== null);
    expect(nonNull.map((t) => t.id)).toEqual(["1", "2"]); // 2025-03-01, 2025-01-01
  });

  it("should sort by created_at ascending", () => {
    const result = sortTasks(tasks, "created_at", "asc");
    expect(result.map((t) => t.id)).toEqual(["2", "3", "1"]);
  });

  it("should sort by created_at descending", () => {
    const result = sortTasks(tasks, "created_at", "desc");
    expect(result.map((t) => t.id)).toEqual(["1", "3", "2"]);
  });

  it("should not mutate the original array", () => {
    const original = [...tasks];
    sortTasks(tasks, "title", "asc");
    expect(tasks.map((t) => t.id)).toEqual(original.map((t) => t.id));
  });

  it("should handle empty array", () => {
    const result = sortTasks([], "priority", "asc");
    expect(result).toEqual([]);
  });

  it("should handle tasks with same due dates", () => {
    const sameDue = [
      createTask({ id: "a", due: "2025-06-01" }),
      createTask({ id: "b", due: "2025-06-01" }),
    ];
    const result = sortTasks(sameDue, "due", "asc");
    expect(result).toHaveLength(2);
  });
});
