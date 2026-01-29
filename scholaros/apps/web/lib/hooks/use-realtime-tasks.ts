"use client";

import { useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import { getWorkspaceChannel, type TaskUpdatePayload } from "@/lib/realtime/workspace-channel";

// Hook to listen for real-time task updates and invalidate queries
export function useRealtimeTaskUpdates() {
  const queryClient = useQueryClient();
  const { currentWorkspaceId } = useWorkspaceStore();

  useEffect(() => {
    if (!currentWorkspaceId) return;

    const channel = getWorkspaceChannel(currentWorkspaceId);

    // Set handler for task updates
    channel.setHandlers({
      onTaskUpdate: (payload: TaskUpdatePayload) => {
        console.log("Received task update:", payload);

        // Invalidate tasks query to refetch
        queryClient.invalidateQueries({ queryKey: ["tasks"] });

        // Optionally show a notification or toast
        // This could be enhanced to show "User X updated Task Y"
      },
    });

    return () => {
      // Handlers are cleared when channel is removed
    };
  }, [currentWorkspaceId, queryClient]);
}

// Hook to broadcast task updates to other users
export function useBroadcastTaskUpdate() {
  const { currentWorkspaceId } = useWorkspaceStore();

  const broadcastTaskCreated = useCallback(
    async (taskId: string, data?: Record<string, unknown>) => {
      if (!currentWorkspaceId) return;
      const channel = getWorkspaceChannel(currentWorkspaceId);
      await channel.broadcastTaskUpdate("created", taskId, data);
    },
    [currentWorkspaceId]
  );

  const broadcastTaskUpdated = useCallback(
    async (taskId: string, data?: Record<string, unknown>) => {
      if (!currentWorkspaceId) return;
      const channel = getWorkspaceChannel(currentWorkspaceId);
      await channel.broadcastTaskUpdate("updated", taskId, data);
    },
    [currentWorkspaceId]
  );

  const broadcastTaskDeleted = useCallback(
    async (taskId: string) => {
      if (!currentWorkspaceId) return;
      const channel = getWorkspaceChannel(currentWorkspaceId);
      await channel.broadcastTaskUpdate("deleted", taskId);
    },
    [currentWorkspaceId]
  );

  return {
    broadcastTaskCreated,
    broadcastTaskUpdated,
    broadcastTaskDeleted,
  };
}

export default useRealtimeTaskUpdates;
