"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { TaskCategory, TaskPriority, TaskStatus, TaskFromAPI } from "@scholaros/shared";
import { queryKeys } from "@/app/providers";

// Re-export TaskFromAPI for components that import from this file
export type { TaskFromAPI } from "@scholaros/shared";

interface TaskFilters {
  status?: TaskStatus;
  category?: TaskCategory;
  priority?: TaskPriority;
  due?: "today" | "upcoming" | string;
  project_id?: string;
  workspace_id?: string | null;
  page?: number;
  limit?: number;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface TasksResponse {
  data: TaskFromAPI[];
  pagination: PaginationInfo;
}

// Fetch tasks with optional filters and pagination
async function fetchTasks(filters?: TaskFilters): Promise<TasksResponse> {
  const params = new URLSearchParams();

  if (filters?.status) params.set("status", filters.status);
  if (filters?.category) params.set("category", filters.category);
  if (filters?.priority) params.set("priority", filters.priority);
  if (filters?.due) params.set("due", filters.due);
  if (filters?.project_id) params.set("project_id", filters.project_id);
  if (filters?.workspace_id) params.set("workspace_id", filters.workspace_id);
  if (filters?.workspace_id === null) params.set("workspace_id", "personal");
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limit) params.set("limit", String(filters.limit));

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

// Hook: Fetch tasks with pagination
export function useTasks(filters?: TaskFilters) {
  return useQuery({
    queryKey: queryKeys.tasks.list((filters ?? {}) as Record<string, unknown>),
    queryFn: () => fetchTasks(filters),
    select: (response) => response.data, // Extract just the data array for backward compatibility
  });
}

// Hook: Fetch tasks with full pagination info
export function useTasksWithPagination(filters?: TaskFilters) {
  return useQuery({
    queryKey: queryKeys.tasks.list((filters ?? {}) as Record<string, unknown>),
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
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}

// Hook: Update task
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
    // Optimistic update
    onMutate: async (updatedTask) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all });

      // Snapshot the previous value (handle paginated response structure)
      const previousData = queryClient.getQueriesData({ queryKey: queryKeys.tasks.all });

      // Optimistically update to the new value (handle paginated response)
      queryClient.setQueriesData(
        { queryKey: queryKeys.tasks.all },
        (old: TasksResponse | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((task) =>
              task.id === updatedTask.id ? { ...task, ...updatedTask } : task
            ),
          };
        }
      );

      // Return a context object with the snapshotted value
      return { previousData };
    },
    onError: (_err, _updatedTask, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
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

// Bulk operation types
interface BulkUpdatePayload {
  taskIds: string[];
  updates: {
    status?: TaskStatus;
    priority?: TaskPriority;
    category?: TaskCategory;
    due?: string | null;
    project_id?: string | null;
  };
}

interface BulkDeletePayload {
  taskIds: string[];
}

interface BulkUpdateResponse {
  success: boolean;
  updated: number;
  data: TaskFromAPI[];
}

interface BulkDeleteResponse {
  success: boolean;
  deleted: number;
}

// Bulk update tasks
async function bulkUpdateTasks(payload: BulkUpdatePayload): Promise<BulkUpdateResponse> {
  const response = await fetch("/api/tasks/bulk", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update tasks");
  }

  return response.json();
}

// Bulk delete tasks
async function bulkDeleteTasks(payload: BulkDeletePayload): Promise<BulkDeleteResponse> {
  const response = await fetch("/api/tasks/bulk", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete tasks");
  }

  return response.json();
}

// Hook: Bulk update tasks
export function useBulkUpdateTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: bulkUpdateTasks,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
    // Optimistic update for bulk operations
    onMutate: async ({ taskIds, updates }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all });
      const previousData = queryClient.getQueriesData({ queryKey: queryKeys.tasks.all });

      queryClient.setQueriesData(
        { queryKey: queryKeys.tasks.all },
        (old: TasksResponse | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((task) =>
              taskIds.includes(task.id) ? { ...task, ...updates } : task
            ),
          };
        }
      );

      return { previousData };
    },
    onError: (_err, _payload, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
  });
}

// Hook: Bulk delete tasks
export function useBulkDeleteTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: bulkDeleteTasks,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
    // Optimistic update for bulk delete
    onMutate: async ({ taskIds }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all });
      const previousData = queryClient.getQueriesData({ queryKey: queryKeys.tasks.all });

      queryClient.setQueriesData(
        { queryKey: queryKeys.tasks.all },
        (old: TasksResponse | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.filter((task) => !taskIds.includes(task.id)),
          };
        }
      );

      return { previousData };
    },
    onError: (_err, _payload, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
  });
}
