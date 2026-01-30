"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  TaskTemplateFromAPI,
  TaskCategory,
  TaskPriority,
  TaskTemplateSubtask,
} from "@scholaros/shared";

// Extended type with joined profile info
export interface TaskTemplateWithDetails extends TaskTemplateFromAPI {
  creator?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  assignee?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

// =============================================================================
// API Functions
// =============================================================================

async function fetchTaskTemplates(
  workspaceId: string
): Promise<TaskTemplateWithDetails[]> {
  const params = new URLSearchParams({ workspace_id: workspaceId });
  const response = await fetch(`/api/task-templates?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to fetch task templates");
  }

  return response.json();
}

async function createTaskTemplate(data: {
  workspace_id: string;
  name: string;
  description?: string | null;
  default_category?: TaskCategory | null;
  default_priority?: TaskPriority;
  default_assigned_to?: string | null;
  subtasks?: TaskTemplateSubtask[];
  is_shared?: boolean;
}): Promise<TaskTemplateWithDetails> {
  const response = await fetch("/api/task-templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create task template");
  }

  return response.json();
}

async function deleteTaskTemplate(templateId: string): Promise<void> {
  const params = new URLSearchParams({ id: templateId });
  const response = await fetch(`/api/task-templates?${params.toString()}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete task template");
  }
}

// =============================================================================
// Hooks
// =============================================================================

// Hook: Fetch task templates for a workspace
export function useTaskTemplates(workspaceId?: string | null) {
  return useQuery({
    queryKey: ["task-templates", workspaceId],
    queryFn: () => fetchTaskTemplates(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000, // Templates are relatively stable - 5 min cache
    gcTime: 10 * 60 * 1000,
  });
}

// Hook: Create task template
export function useCreateTaskTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTaskTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-templates"] });
    },
  });
}

// Hook: Delete task template
export function useDeleteTaskTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTaskTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-templates"] });
    },
  });
}
