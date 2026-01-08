"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UserPresenceWithProfile, PresenceStatus } from "@scholaros/shared";
import { chatKeys } from "./use-chat";

// Fetch presence for all workspace members
export function usePresence(workspaceId: string) {
  return useQuery({
    queryKey: chatKeys.presence(workspaceId),
    queryFn: async () => {
      const response = await fetch(
        `/api/presence?workspace_id=${workspaceId}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch presence");
      }

      const result = await response.json();
      return result.data as UserPresenceWithProfile[];
    },
    enabled: !!workspaceId,
    staleTime: 10000, // Cache for 10 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

// Update own presence
export function useUpdatePresence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      status,
      customStatus,
    }: {
      workspaceId: string;
      status?: PresenceStatus;
      customStatus?: string | null;
    }) => {
      const response = await fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          status,
          custom_status: customStatus,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update presence");
      }

      return response.json() as Promise<UserPresenceWithProfile>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: chatKeys.presence(variables.workspaceId),
      });
    },
  });
}

// Update typing status
export function useUpdateTyping() {
  return useMutation({
    mutationFn: async ({
      workspaceId,
      isTyping,
      typingInConversation,
    }: {
      workspaceId: string;
      isTyping: boolean;
      typingInConversation?: string | null;
    }) => {
      const response = await fetch("/api/presence", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          is_typing: isTyping,
          typing_in_conversation: typingInConversation,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update typing status");
      }

      return response.json();
    },
  });
}

// Hook to track and broadcast typing status
export function useTypingIndicator(
  workspaceId: string,
  conversationKey: string // 'workspace' or recipient user_id
) {
  const updateTyping = useUpdateTyping();
  let typingTimeout: NodeJS.Timeout | null = null;

  const startTyping = () => {
    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Broadcast typing
    updateTyping.mutate({
      workspaceId,
      isTyping: true,
      typingInConversation: conversationKey,
    });

    // Auto-stop typing after 3 seconds of no activity
    typingTimeout = setTimeout(() => {
      stopTyping();
    }, 3000);
  };

  const stopTyping = () => {
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      typingTimeout = null;
    }

    updateTyping.mutate({
      workspaceId,
      isTyping: false,
      typingInConversation: null,
    });
  };

  return { startTyping, stopTyping };
}
