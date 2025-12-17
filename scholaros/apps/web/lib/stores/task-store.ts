import { create } from "zustand";
import type { TaskFromAPI } from "@/lib/hooks/use-tasks";

interface TaskUIState {
  // Selected task for detail view
  selectedTaskId: string | null;
  isDetailOpen: boolean;

  // Task being edited
  editingTaskId: string | null;

  // Filters
  filters: {
    status: string | null;
    category: string | null;
    priority: string | null;
    search: string;
  };

  // View preferences
  sortBy: "priority" | "due" | "created_at" | "title";
  sortDirection: "asc" | "desc";

  // Actions
  openTaskDetail: (taskId: string) => void;
  closeTaskDetail: () => void;
  setEditingTask: (taskId: string | null) => void;
  setFilter: (key: keyof TaskUIState["filters"], value: string | null) => void;
  clearFilters: () => void;
  setSort: (sortBy: TaskUIState["sortBy"], direction?: TaskUIState["sortDirection"]) => void;
}

export const useTaskStore = create<TaskUIState>((set) => ({
  // Initial state
  selectedTaskId: null,
  isDetailOpen: false,
  editingTaskId: null,
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

// Helper function to sort tasks
export function sortTasks(
  tasks: TaskFromAPI[],
  sortBy: TaskUIState["sortBy"],
  direction: TaskUIState["sortDirection"]
): TaskFromAPI[] {
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
        else comparison = new Date(a.due).getTime() - new Date(b.due).getTime();
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
