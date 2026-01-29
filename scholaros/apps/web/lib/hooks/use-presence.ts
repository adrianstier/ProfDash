"use client";

import { useRef, useCallback, useEffect } from "react";
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
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use refs to avoid stale closures in setTimeout
  const workspaceIdRef = useRef(workspaceId);
  const conversationKeyRef = useRef(conversationKey);

  // Keep refs in sync with props
  useEffect(() => {
    workspaceIdRef.current = workspaceId;
    conversationKeyRef.current = conversationKey;
  }, [workspaceId, conversationKey]);

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    updateTyping.mutate({
      workspaceId: workspaceIdRef.current,
      isTyping: false,
      typingInConversation: null,
    });
  }, [updateTyping]);

  const startTyping = useCallback(() => {
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Broadcast typing
    updateTyping.mutate({
      workspaceId: workspaceIdRef.current,
      isTyping: true,
      typingInConversation: conversationKeyRef.current,
    });

    // Auto-stop typing after 3 seconds of no activity
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [updateTyping, stopTyping]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return { startTyping, stopTyping };
}
