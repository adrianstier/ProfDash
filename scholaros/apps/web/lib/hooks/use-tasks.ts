"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Task, TaskCategory, TaskPriority, TaskStatus } from "@scholaros/shared";

// Types for API responses (with string dates from JSON)
export interface TaskFromAPI {
  id: string;
  user_id: string;
  workspace_id?: string | null;
  title: string;
  description?: string | null;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  due?: string | null;
  project_id?: string | null;
  assignees?: string[];
  tags?: string[];
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

interface TaskFilters {
  status?: TaskStatus;
  category?: TaskCategory;
  priority?: TaskPriority;
  due?: "today" | "upcoming" | string;
  project_id?: string;
  workspace_id?: string | null;
}

// Fetch tasks with optional filters
async function fetchTasks(filters?: TaskFilters): Promise<TaskFromAPI[]> {
  const params = new URLSearchParams();

  if (filters?.status) params.set("status", filters.status);
  if (filters?.category) params.set("category", filters.category);
  if (filters?.priority) params.set("priority", filters.priority);
  if (filters?.due) params.set("due", filters.due);
  if (filters?.project_id) params.set("project_id", filters.project_id);
  if (filters?.workspace_id) params.set("workspace_id", filters.workspace_id);
  if (filters?.workspace_id === null) params.set("workspace_id", "personal");

  const response = await fetch(`/api/tasks?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to fetch tasks");
  }

  return response.json();
}

// Create a new task
async function createTask(task: Omit<TaskFromAPI, "id" | "user_id" | "created_at" | "updated_at">): Promise<TaskFromAPI> {
  const response = await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create task");
  }

  return response.json();
}

// Update a task
async function updateTask({ id, ...updates }: Partial<TaskFromAPI> & { id: string }): Promise<TaskFromAPI> {
  const response = await fetch(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update task");
  }

  return response.json();
}

// Delete a task
async function deleteTask(id: string): Promise<void> {
  const response = await fetch(`/api/tasks/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete task");
  }
}

// Hook: Fetch tasks
export function useTasks(filters?: TaskFilters) {
  return useQuery({
    queryKey: ["tasks", filters],
    queryFn: () => fetchTasks(filters),
  });
}

// Hook: Fetch today's tasks
export function useTodayTasks() {
  return useTasks({ due: "today" });
}

// Hook: Fetch upcoming tasks
export function useUpcomingTasks() {
  return useTasks({ due: "upcoming" });
}

// Hook: Create task
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      // Invalidate all task queries to refetch
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

// Hook: Update task
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    // Optimistic update
    onMutate: async (updatedTask) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["tasks"] });

      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData(["tasks"]);

      // Optimistically update to the new value
      queryClient.setQueriesData({ queryKey: ["tasks"] }, (old: TaskFromAPI[] | undefined) => {
        if (!old) return old;
        return old.map((task) =>
          task.id === updatedTask.id ? { ...task, ...updatedTask } : task
        );
      });

      // Return a context object with the snapshotted value
      return { previousTasks };
    },
    onError: (err, updatedTask, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousTasks) {
        queryClient.setQueryData(["tasks"], context.previousTasks);
      }
    },
  });
}

// Hook: Delete task
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

// Hook: Toggle task completion
export function useToggleTaskComplete() {
  const updateTask = useUpdateTask();

  return {
    ...updateTask,
    mutate: (task: TaskFromAPI) => {
      const newStatus: TaskStatus = task.status === "done" ? "todo" : "done";
      updateTask.mutate({ id: task.id, status: newStatus });
    },
    mutateAsync: async (task: TaskFromAPI) => {
      const newStatus: TaskStatus = task.status === "done" ? "todo" : "done";
      return updateTask.mutateAsync({ id: task.id, status: newStatus });
    },
  };
}
