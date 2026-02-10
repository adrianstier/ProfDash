import { create } from "zustand";
import { parseLocalDate } from "@scholaros/shared";
import type { TaskFromAPI } from "@/lib/hooks/use-tasks";
import { sortByUrgency } from "@/lib/utils/task-grouping";

interface TaskUIState {
  // Selected task for detail view
  selectedTaskId: string | null;
  isDetailOpen: boolean;

  // Task being edited
  editingTaskId: string | null;

  // Bulk selection
  selectedTaskIds: Set<string>;
  isSelectionMode: boolean;

  // Focus mode - shows only high-priority, due-today, or overdue incomplete tasks
  focusMode: boolean;

  // Filters
  filters: {
    status: string | null;
    category: string | null;
    priority: string | null;
    search: string;
  };

  // View preferences
  sortBy: "priority" | "due" | "created_at" | "title" | "urgency";
  sortDirection: "asc" | "desc";

  // Actions
  openTaskDetail: (taskId: string) => void;
  closeTaskDetail: () => void;
  setEditingTask: (taskId: string | null) => void;
  setFilter: (key: keyof TaskUIState["filters"], value: string | null) => void;
  clearFilters: () => void;
  setSort: (sortBy: TaskUIState["sortBy"], direction?: TaskUIState["sortDirection"]) => void;

  // Focus mode actions
  toggleFocusMode: () => void;
  setFocusMode: (enabled: boolean) => void;

  // Bulk selection actions
  toggleSelectionMode: () => void;
  toggleTaskSelection: (taskId: string) => void;
  selectAllTasks: (taskIds: string[]) => void;
  deselectAllTasks: () => void;
  clearSelection: () => void;
  isTaskSelected: (taskId: string) => boolean;
}

// Read initial focus mode from localStorage (safe for SSR)
function getInitialFocusMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem("scholaros-focus-mode") === "true";
  } catch {
    return false;
  }
}

export const useTaskStore = create<TaskUIState>((set, get) => ({
  // Initial state
  selectedTaskId: null,
  isDetailOpen: false,
  editingTaskId: null,
  selectedTaskIds: new Set<string>(),
  isSelectionMode: false,
  focusMode: getInitialFocusMode(),
  filters: {
    status: null,
    category: null,
    priority: null,
    search: "",
  },
  sortBy: "priority",
  sortDirection: "asc",

  // Actions
  openTaskDetail: (taskId) =>
    set({ selectedTaskId: taskId, isDetailOpen: true }),

  closeTaskDetail: () =>
    set({ selectedTaskId: null, isDetailOpen: false, editingTaskId: null }),

  setEditingTask: (taskId) =>
    set({ editingTaskId: taskId }),

  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),

  clearFilters: () =>
    set({
      filters: {
        status: null,
        category: null,
        priority: null,
        search: "",
      },
    }),

  setSort: (sortBy, direction) =>
    set((state) => ({
      sortBy,
      sortDirection: direction ?? state.sortDirection,
    })),

  // Focus mode actions
  toggleFocusMode: () =>
    set((state) => {
      const newValue = !state.focusMode;
      try {
        localStorage.setItem("scholaros-focus-mode", String(newValue));
      } catch {
        // localStorage might not be available
      }
      return { focusMode: newValue };
    }),

  setFocusMode: (enabled) => {
    try {
      localStorage.setItem("scholaros-focus-mode", String(enabled));
    } catch {
      // localStorage might not be available
    }
    set({ focusMode: enabled });
  },

  // Bulk selection actions
  toggleSelectionMode: () =>
    set((state) => ({
      isSelectionMode: !state.isSelectionMode,
      selectedTaskIds: state.isSelectionMode ? new Set() : state.selectedTaskIds,
    })),

  toggleTaskSelection: (taskId) =>
    set((state) => {
      const newSelection = new Set(state.selectedTaskIds);
      if (newSelection.has(taskId)) {
        newSelection.delete(taskId);
      } else {
        newSelection.add(taskId);
      }
      return { selectedTaskIds: newSelection };
    }),

  selectAllTasks: (taskIds) =>
    set({ selectedTaskIds: new Set(taskIds) }),

  deselectAllTasks: () =>
    set({ selectedTaskIds: new Set() }),

  clearSelection: () =>
    set({ selectedTaskIds: new Set(), isSelectionMode: false }),

  isTaskSelected: (taskId) => get().selectedTaskIds.has(taskId),
}));

// Helper function to apply filters to tasks
export function filterTasks(tasks: TaskFromAPI[], filters: TaskUIState["filters"]): TaskFromAPI[] {
  return tasks.filter((task) => {
    if (filters.status && task.status !== filters.status) return false;
    if (filters.category && task.category !== filters.category) return false;
    if (filters.priority && task.priority !== filters.priority) return false;
    if (filters.search) {
      const search = filters.search.toLowerCase();
      const matchesTitle = task.title.toLowerCase().includes(search);
      const matchesDescription = task.description?.toLowerCase().includes(search);
      if (!matchesTitle && !matchesDescription) return false;
    }
    return true;
  });
}

/**
 * Apply focus mode filtering to tasks.
 * Focus mode shows only:
 * - Incomplete tasks (not done)
 * - With high priority (p1 or p2)
 * - OR tasks due today or overdue
 */
export function applyFocusModeFilter(tasks: TaskFromAPI[]): TaskFromAPI[] {
  const today = new Date().toISOString().split("T")[0];

  return tasks.filter((task) => {
    // Must be incomplete
    if (task.status === "done") return false;

    // High or urgent priority
    if (task.priority === "p1" || task.priority === "p2") return true;

    // Due today or overdue
    if (task.due && task.due <= today) return true;

    return false;
  });
}

// Helper function to sort tasks
export function sortTasks(
  tasks: TaskFromAPI[],
  sortBy: TaskUIState["sortBy"],
  direction: TaskUIState["sortDirection"]
): TaskFromAPI[] {
  // Urgency sort is handled separately since it has its own multi-factor logic
  if (sortBy === "urgency") {
    return sortByUrgency(tasks);
  }

  const sorted = [...tasks].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "priority":
        // p1 < p2 < p3 < p4
        comparison = a.priority.localeCompare(b.priority);
        break;
      case "due":
        if (!a.due && !b.due) comparison = 0;
        else if (!a.due) comparison = 1;
        else if (!b.due) comparison = -1;
        else comparison = parseLocalDate(a.due).getTime() - parseLocalDate(b.due).getTime();
        break;
      case "created_at":
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case "title":
        comparison = a.title.localeCompare(b.title);
        break;
    }

    return direction === "asc" ? comparison : -comparison;
  });

  return sorted;
}
