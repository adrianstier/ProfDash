"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ActivityEntryWithUser, ActivityAction } from "@scholaros/shared";
import { chatKeys } from "./use-chat";

// Fetch activity feed
async function fetchActivity(
  workspaceId: string,
  cursor?: string,
  filters?: {
    action?: ActivityAction;
    taskId?: string;
    projectId?: string;
    userId?: string;
  }
): Promise<{
  data: ActivityEntryWithUser[];
  has_more: boolean;
  next_cursor: string | null;
}> {
  const params = new URLSearchParams({
    workspace_id: workspaceId,
    limit: "30",
  });

  if (cursor) {
    params.set("before", cursor);
  }

  if (filters?.action) {
    params.set("action", filters.action);
  }

  if (filters?.taskId) {
    params.set("task_id", filters.taskId);
  }

  if (filters?.projectId) {
    params.set("project_id", filters.projectId);
  }

  if (filters?.userId) {
    params.set("user_id", filters.userId);
  }

  const response = await fetch(`/api/activity?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch activity");
  }

  return response.json();
}

// Hook to fetch activity feed with infinite scroll
export function useActivityFeed(
  workspaceId: string,
  filters?: {
    action?: ActivityAction;
    taskId?: string;
    projectId?: string;
    userId?: string;
  }
) {
  return useInfiniteQuery({
    queryKey: [...chatKeys.activity(workspaceId), filters],
    queryFn: ({ pageParam }) => fetchActivity(workspaceId, pageParam, filters),
    getNextPageParam: (lastPage) => lastPage.next_cursor,
    initialPageParam: undefined as string | undefined,
    enabled: !!workspaceId,
    staleTime: 30000, // Cache for 30 seconds
    refetchOnWindowFocus: false,
  });
}

// Log an activity
export function useLogActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      action,
      taskId,
      projectId,
      messageId,
      entityTitle,
      details,
    }: {
      workspaceId: string;
      action: ActivityAction;
      taskId?: string;
      projectId?: string;
      messageId?: string;
      entityTitle?: string;
      details?: Record<string, unknown>;
    }) => {
      const response = await fetch("/api/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          action,
          task_id: taskId || null,
          project_id: projectId || null,
          message_id: messageId || null,
          entity_title: entityTitle || null,
          details: details || {},
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to log activity");
      }

      return response.json() as Promise<ActivityEntryWithUser>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: chatKeys.activity(variables.workspaceId),
      });
    },
  });
}
