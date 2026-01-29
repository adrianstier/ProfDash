"use client";

import { createContext, useContext, useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import { useRealtimePresence, type RealtimePresenceUser } from "@/lib/hooks/use-presence";
import { getWorkspaceChannel } from "@/lib/realtime/workspace-channel";
import type { PresenceStatus } from "@scholaros/shared";

interface RealtimePresenceContextValue {
  // Current user info
  currentUser: {
    id: string;
    name: string;
    avatar_url: string | null;
  } | null;

  // All online users
  onlineUsers: RealtimePresenceUser[];

  // Connection state
  isConnected: boolean;

  // Actions
  updateStatus: (status: PresenceStatus) => Promise<void>;
  broadcastTyping: (conversationKey: string, isTyping: boolean) => Promise<void>;
  broadcastTaskUpdate: (
    type: "created" | "updated" | "deleted",
    taskId: string,
    data?: Record<string, unknown>
  ) => Promise<void>;
}

const RealtimePresenceContext = createContext<RealtimePresenceContextValue | null>(null);

// Hook to use realtime presence context
export function useRealtimePresenceContext() {
  const context = useContext(RealtimePresenceContext);
  if (!context) {
    throw new Error(
      "useRealtimePresenceContext must be used within a RealtimePresenceProvider"
    );
  }
  return context;
}

// Optional hook that returns null if not in provider
export function useOptionalRealtimePresence() {
  return useContext(RealtimePresenceContext);
}

interface RealtimePresenceProviderProps {
  children: React.ReactNode;
}

export function RealtimePresenceProvider({
  children,
}: RealtimePresenceProviderProps) {
  const supabase = createClient();
  const { currentWorkspaceId } = useWorkspaceStore();
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    avatar_url: string | null;
  } | null>(null);

  // Fetch current user info
  useEffect(() => {
    let mounted = true;

    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !mounted) return;

      // Fetch profile for full name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .single();

      if (mounted) {
        setCurrentUser({
          id: user.id,
          name: profile?.full_name || user.email?.split("@")[0] || "User",
          avatar_url: profile?.avatar_url || null,
        });
      }
    };

    fetchUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUser();
      } else {
        setCurrentUser(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Connect to realtime presence
  const { presenceState, isConnected } = useRealtimePresence(
    currentWorkspaceId || "",
    currentUser
  );

  // Filter to online users
  const onlineUsers = useMemo(
    () =>
      presenceState.filter(
        (user) => user.status === "online" || user.status === "away"
      ),
    [presenceState]
  );

  // Action handlers
  const updateStatus = async (status: PresenceStatus) => {
    if (!currentWorkspaceId) return;
    const channel = getWorkspaceChannel(currentWorkspaceId);
    await channel.updateStatus(status);
  };

  const broadcastTyping = async (conversationKey: string, isTyping: boolean) => {
    if (!currentWorkspaceId) return;
    const channel = getWorkspaceChannel(currentWorkspaceId);
    await channel.broadcastTyping(conversationKey, isTyping);
  };

  const broadcastTaskUpdate = async (
    type: "created" | "updated" | "deleted",
    taskId: string,
    data?: Record<string, unknown>
  ) => {
    if (!currentWorkspaceId) return;
    const channel = getWorkspaceChannel(currentWorkspaceId);
    await channel.broadcastTaskUpdate(type, taskId, data);
  };

  const value: RealtimePresenceContextValue = {
    currentUser,
    onlineUsers,
    isConnected,
    updateStatus,
    broadcastTyping,
    broadcastTaskUpdate,
  };

  return (
    <RealtimePresenceContext.Provider value={value}>
      {children}
    </RealtimePresenceContext.Provider>
  );
}

export default RealtimePresenceProvider;
