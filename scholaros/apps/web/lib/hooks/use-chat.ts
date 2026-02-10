"use client";

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import type {
  ChatMessageWithUser,
  CreateMessage,
  UpdateMessage,
  MessageReactionType,
} from "@scholaros/shared";

// Query keys
export const chatKeys = {
  all: ["chat"] as const,
  messages: (workspaceId: string) => [...chatKeys.all, "messages", workspaceId] as const,
  conversation: (workspaceId: string, recipientId: string | null) =>
    [...chatKeys.messages(workspaceId), recipientId || "workspace"] as const,
  pinnedMessages: (workspaceId: string, recipientId: string | null) =>
    [...chatKeys.conversation(workspaceId, recipientId), "pinned"] as const,
  presence: (workspaceId: string) => [...chatKeys.all, "presence", workspaceId] as const,
  activity: (workspaceId: string) => [...chatKeys.all, "activity", workspaceId] as const,
};

// Fetch messages for a conversation
async function fetchMessages(
  workspaceId: string,
  recipientId: string | null,
  cursor?: string
): Promise<{
  data: ChatMessageWithUser[];
  has_more: boolean;
  next_cursor: string | null;
}> {
  const params = new URLSearchParams({
    workspace_id: workspaceId,
    limit: "50",
  });

  if (recipientId) {
    params.set("recipient_id", recipientId);
  }

  if (cursor) {
    params.set("before", cursor);
  }

  const response = await fetch(`/api/messages?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch messages");
  }

  return response.json();
}

// Hook to fetch messages with infinite scroll
export function useMessages(workspaceId: string, recipientId: string | null) {
  return useInfiniteQuery({
    queryKey: chatKeys.conversation(workspaceId, recipientId),
    queryFn: ({ pageParam }) => fetchMessages(workspaceId, recipientId, pageParam),
    getNextPageParam: (lastPage) => lastPage.next_cursor,
    initialPageParam: undefined as string | undefined,
    enabled: !!workspaceId,
    staleTime: 0, // Always refetch for real-time feel
    refetchOnWindowFocus: false,
  });
}

// Hook to fetch pinned messages
export function usePinnedMessages(workspaceId: string, recipientId: string | null) {
  return useQuery({
    queryKey: chatKeys.pinnedMessages(workspaceId, recipientId),
    queryFn: async () => {
      const params = new URLSearchParams({
        workspace_id: workspaceId,
        pinned: "true",
      });

      if (recipientId) {
        params.set("recipient_id", recipientId);
      }

      const response = await fetch(`/api/messages?${params.toString()}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch pinned messages");
      }

      const result = await response.json();
      return result.data as ChatMessageWithUser[];
    },
    enabled: !!workspaceId,
    staleTime: 30000, // Cache for 30 seconds
  });
}

// Send a message
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateMessage) => {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send message");
      }

      return response.json() as Promise<ChatMessageWithUser>;
    },
    onSuccess: (newMessage) => {
      // Invalidate conversation query
      const conversationKey = chatKeys.conversation(
        newMessage.workspace_id,
        newMessage.recipient_id
      );
      queryClient.invalidateQueries({ queryKey: conversationKey });
    },
  });
}

// Edit a message
export function useEditMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateMessage;
    }) => {
      const response = await fetch(`/api/messages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to edit message");
      }

      return response.json() as Promise<ChatMessageWithUser>;
    },
    onSuccess: (updatedMessage) => {
      const conversationKey = chatKeys.conversation(
        updatedMessage.workspace_id,
        updatedMessage.recipient_id
      );
      queryClient.invalidateQueries({ queryKey: conversationKey });
    },
  });
}

// Delete a message
export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      workspaceId,
      recipientId,
    }: {
      id: string;
      workspaceId: string;
      recipientId: string | null;
    }) => {
      const response = await fetch(`/api/messages/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete message");
      }

      return { id, workspaceId, recipientId };
    },
    onSuccess: ({ workspaceId, recipientId }) => {
      const conversationKey = chatKeys.conversation(workspaceId, recipientId);
      queryClient.invalidateQueries({ queryKey: conversationKey });
    },
  });
}

// Add a reaction
export function useAddReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      reaction,
    }: {
      messageId: string;
      reaction: MessageReactionType;
    }) => {
      const response = await fetch(`/api/messages/${messageId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add reaction");
      }

      return response.json() as Promise<ChatMessageWithUser>;
    },
    onSuccess: (updatedMessage) => {
      const conversationKey = chatKeys.conversation(
        updatedMessage.workspace_id,
        updatedMessage.recipient_id
      );
      queryClient.invalidateQueries({ queryKey: conversationKey });
    },
  });
}

// Mark message as read
export function useMarkAsRead() {
  return useMutation({
    mutationFn: async (messageId: string) => {
      const response = await fetch(`/api/messages/${messageId}/read`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to mark as read");
      }

      return response.json();
    },
  });
}

// Mark multiple messages as read
export function useMarkMultipleAsRead() {
  return useMutation({
    mutationFn: async (messageIds: string[]) => {
      // The PUT handler for bulk mark-as-read is co-located at /api/messages/[id]/read
      // Use the first message ID to satisfy the [id] route segment (PUT handler ignores it)
      const firstId = messageIds[0] || "_";
      const response = await fetch(`/api/messages/${firstId}/read`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_ids: messageIds }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to mark messages as read");
      }

      return response.json();
    },
  });
}

// Pin/unpin a message
export function usePinMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      pin,
    }: {
      messageId: string;
      pin: boolean;
    }) => {
      const response = await fetch(`/api/messages/${messageId}/pin`, {
        method: pin ? "POST" : "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update pin status");
      }

      return response.json() as Promise<ChatMessageWithUser>;
    },
    onSuccess: (updatedMessage) => {
      const conversationKey = chatKeys.conversation(
        updatedMessage.workspace_id,
        updatedMessage.recipient_id
      );
      queryClient.invalidateQueries({ queryKey: conversationKey });
      queryClient.invalidateQueries({
        queryKey: chatKeys.pinnedMessages(
          updatedMessage.workspace_id,
          updatedMessage.recipient_id
        ),
      });
    },
  });
}
