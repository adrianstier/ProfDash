"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UserPresenceWithProfile, PresenceStatus } from "@scholaros/shared";
import type { RealtimePresenceState } from "@supabase/supabase-js";
import { chatKeys } from "./use-chat";
import {
  getWorkspaceChannel,
  removeWorkspaceChannel,
  type RealtimePresencePayload,
  type TypingPayload,
} from "@/lib/realtime/workspace-channel";
import { useChatStore } from "@/lib/stores/chat-store";

// Constants
const AWAY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const PRESENCE_HEARTBEAT_MS = 30 * 1000; // 30 seconds

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

    // Broadcast via realtime channel
    const channel = getWorkspaceChannel(workspaceIdRef.current);
    channel.broadcastTyping(conversationKeyRef.current, false);

    // Also update via API for persistence
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

    // Broadcast via realtime channel
    const channel = getWorkspaceChannel(workspaceIdRef.current);
    channel.broadcastTyping(conversationKeyRef.current, true);

    // Also update via API for persistence
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

// Real-time presence tracking with Supabase Realtime
export interface RealtimePresenceUser {
  user_id: string;
  user_name: string;
  avatar_url: string | null;
  status: PresenceStatus;
  last_active: string;
  is_typing: boolean;
  typing_in_conversation: string | null;
}

export function useRealtimePresence(
  workspaceId: string,
  currentUser: {
    id: string;
    name: string;
    avatar_url: string | null;
  } | null
) {
  const [presenceState, setPresenceState] = useState<RealtimePresenceUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const { addTypingUser, removeTypingUser } = useChatStore();

  // Activity tracking refs
  const lastActivityRef = useRef<number>(Date.now());
  const isAwayRef = useRef(false);
  const awayCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Convert presence state to array
  const parsePresenceState = useCallback(
    (state: RealtimePresenceState<RealtimePresencePayload>): RealtimePresenceUser[] => {
      const users: RealtimePresenceUser[] = [];
      Object.values(state).forEach((presences) => {
        if (presences && presences.length > 0) {
          // Get the most recent presence for each user
          const presence = presences[0] as RealtimePresencePayload;
          users.push({
            user_id: presence.user_id,
            user_name: presence.user_name,
            avatar_url: presence.avatar_url,
            status: presence.status,
            last_active: presence.last_active,
            is_typing: presence.is_typing,
            typing_in_conversation: presence.typing_in_conversation,
          });
        }
      });
      return users;
    },
    []
  );

  // Track user activity
  const trackActivity = useCallback(() => {
    lastActivityRef.current = Date.now();

    // If was away, set back to online
    if (isAwayRef.current && workspaceId) {
      isAwayRef.current = false;
      const channel = getWorkspaceChannel(workspaceId);
      channel.updateStatus("online");
    }
  }, [workspaceId]);

  // Set up activity listeners
  useEffect(() => {
    const events = ["mousedown", "keydown", "touchstart", "scroll", "mousemove"];

    // Throttled activity tracker
    let lastTracked = 0;
    const throttledTrack = () => {
      const now = Date.now();
      if (now - lastTracked > 1000) { // Throttle to once per second
        lastTracked = now;
        trackActivity();
      }
    };

    events.forEach((event) => {
      window.addEventListener(event, throttledTrack, { passive: true });
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, throttledTrack);
      });
    };
  }, [trackActivity]);

  // Check for inactivity and set away status
  useEffect(() => {
    if (!workspaceId || !currentUser) return;

    awayCheckIntervalRef.current = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityRef.current;

      if (timeSinceActivity >= AWAY_TIMEOUT_MS && !isAwayRef.current) {
        isAwayRef.current = true;
        const channel = getWorkspaceChannel(workspaceId);
        channel.updateStatus("away");
      }
    }, 10000); // Check every 10 seconds

    return () => {
      if (awayCheckIntervalRef.current) {
        clearInterval(awayCheckIntervalRef.current);
      }
    };
  }, [workspaceId, currentUser]);

  // Connect to realtime channel
  useEffect(() => {
    if (!workspaceId || !currentUser) {
      return;
    }

    const channel = getWorkspaceChannel(workspaceId);

    channel
      .setCurrentUser(currentUser)
      .setHandlers({
        onPresenceSync: (state) => {
          const users = parsePresenceState(state);
          setPresenceState(users);

          // Update typing users in chat store
          users.forEach((user) => {
            if (user.is_typing && user.typing_in_conversation) {
              addTypingUser(user.typing_in_conversation, user.user_id);
            } else {
              // Check all conversations to remove typing status
              removeTypingUser("workspace", user.user_id);
            }
          });
        },
        onPresenceJoin: (key, _current, newPresences) => {
          console.log(`User joined: ${key}`, newPresences);
        },
        onPresenceLeave: (key, _current, leftPresences) => {
          console.log(`User left: ${key}`, leftPresences);
        },
        onTypingUpdate: (payload: TypingPayload) => {
          if (payload.is_typing && payload.conversation_key) {
            addTypingUser(payload.conversation_key, payload.user_id);
          } else {
            removeTypingUser(payload.conversation_key, payload.user_id);
          }
        },
        onError: (error) => {
          console.error("Workspace channel error:", error);
        },
      });

    // Connect to the channel
    channel
      .connect()
      .then(() => {
        setIsConnected(true);

        // Set up heartbeat to keep presence active
        heartbeatIntervalRef.current = setInterval(() => {
          if (!isAwayRef.current) {
            channel.trackPresence("online");
          }
        }, PRESENCE_HEARTBEAT_MS);
      })
      .catch((error) => {
        console.error("Failed to connect to workspace channel:", error);
        setIsConnected(false);
      });

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        channel.updateStatus("away");
      } else {
        trackActivity();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Handle before unload
    const handleBeforeUnload = () => {
      channel.updateStatus("offline");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);

      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }

      // Disconnect from the channel
      removeWorkspaceChannel(workspaceId);
      setIsConnected(false);
    };
  }, [workspaceId, currentUser, parsePresenceState, addTypingUser, removeTypingUser, trackActivity]);

  return {
    presenceState,
    isConnected,
    trackActivity,
  };
}

// Hook to get online users from realtime presence
export function useOnlineUsers(workspaceId: string) {
  const { data: apiPresence } = usePresence(workspaceId);

  // Filter to online/away users
  const onlineUsers = (apiPresence || []).filter(
    (p) => p.status === "online" || p.status === "away"
  );

  return onlineUsers;
}
