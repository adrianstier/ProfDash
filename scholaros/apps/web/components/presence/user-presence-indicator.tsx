"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import { usePresence, useUpdatePresence } from "@/lib/hooks/use-presence";
import { useChatStore } from "@/lib/stores/chat-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { PresenceStatus } from "@scholaros/shared";

// Presence status colors
const PRESENCE_COLORS: Record<PresenceStatus, string> = {
  online: "bg-green-500",
  away: "bg-yellow-500",
  dnd: "bg-red-500",
  offline: "bg-gray-400",
};

const PRESENCE_LABELS: Record<PresenceStatus, string> = {
  online: "Online",
  away: "Away",
  dnd: "Do Not Disturb",
  offline: "Offline",
};

interface UserPresenceAvatarProps {
  userId: string;
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  showStatus?: boolean;
  className?: string;
}

export function UserPresenceAvatar({
  userId,
  name,
  avatarUrl,
  size = "md",
  showStatus = true,
  className,
}: UserPresenceAvatarProps) {
  const { presenceMap } = useChatStore();
  const presence = presenceMap[userId];
  const status: PresenceStatus = presence?.status || "offline";

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };

  const dotSizeClasses = {
    sm: "h-2 w-2",
    md: "h-2.5 w-2.5",
    lg: "h-3 w-3",
  };

  const dotPositionClasses = {
    sm: "-bottom-0.5 -right-0.5",
    md: "-bottom-0.5 -right-0.5",
    lg: "-bottom-1 -right-1",
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("relative inline-block", className)}>
            <Avatar className={sizeClasses[size]}>
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            {showStatus && (
              <span
                className={cn(
                  "absolute rounded-full border-2 border-background",
                  PRESENCE_COLORS[status],
                  dotSizeClasses[size],
                  dotPositionClasses[size]
                )}
              />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {name} - {PRESENCE_LABELS[status]}
          </p>
          {presence?.custom_status && (
            <p className="text-xs text-muted-foreground">
              {presence.custom_status}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Online users list
interface OnlineUsersListProps {
  className?: string;
  maxVisible?: number;
}

export function OnlineUsersList({
  className,
  maxVisible = 5,
}: OnlineUsersListProps) {
  const { currentWorkspaceId } = useWorkspaceStore();
  const { data: presenceData } = usePresence(currentWorkspaceId || "");
  const { setPresenceMap } = useChatStore();

  // Update presence map in store
  useEffect(() => {
    if (presenceData) {
      const map: Record<string, (typeof presenceData)[0]> = {};
      presenceData.forEach((p) => {
        map[p.user_id] = p;
      });
      setPresenceMap(map);
    }
  }, [presenceData, setPresenceMap]);

  const onlineUsers = (presenceData || []).filter(
    (p) => p.status === "online" || p.status === "away"
  );

  if (onlineUsers.length === 0) {
    return null;
  }

  const visibleUsers = onlineUsers.slice(0, maxVisible);
  const hiddenCount = onlineUsers.length - visibleUsers.length;

  return (
    <div className={cn("flex items-center", className)}>
      <div className="flex -space-x-2">
        {visibleUsers.map((user) => (
          <UserPresenceAvatar
            key={user.user_id}
            userId={user.user_id}
            name={user.user?.full_name || "Unknown"}
            avatarUrl={user.user?.avatar_url}
            size="sm"
          />
        ))}
        {hiddenCount > 0 && (
          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium border-2 border-background">
            +{hiddenCount}
          </div>
        )}
      </div>
      <span className="ml-2 text-xs text-muted-foreground">
        {onlineUsers.length} online
      </span>
    </div>
  );
}

// Presence manager - updates user presence automatically
export function PresenceManager() {
  const supabase = createClient();
  const { currentWorkspaceId } = useWorkspaceStore();
  const updatePresence = useUpdatePresence();

  // Update presence on mount and periodically
  useEffect(() => {
    if (!currentWorkspaceId) return;

    // Set online immediately
    updatePresence.mutate({
      workspaceId: currentWorkspaceId,
      status: "online",
    });

    // Update presence every 30 seconds
    const interval = setInterval(() => {
      updatePresence.mutate({
        workspaceId: currentWorkspaceId,
        status: "online",
      });
    }, 30000);

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updatePresence.mutate({
          workspaceId: currentWorkspaceId,
          status: "away",
        });
      } else {
        updatePresence.mutate({
          workspaceId: currentWorkspaceId,
          status: "online",
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Handle before unload
    const handleBeforeUnload = () => {
      // Use navigator.sendBeacon for reliable offline status
      const data = JSON.stringify({
        workspace_id: currentWorkspaceId,
        status: "offline",
      });
      navigator.sendBeacon("/api/presence", data);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);

      // Set offline on cleanup
      updatePresence.mutate({
        workspaceId: currentWorkspaceId,
        status: "offline",
      });
    };
  }, [currentWorkspaceId]);

  // Real-time presence subscription
  useEffect(() => {
    if (!currentWorkspaceId) return;

    const channel = supabase
      .channel(`workspace-presence-${currentWorkspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_presence",
          filter: `workspace_id=eq.${currentWorkspaceId}`,
        },
        () => {
          // Presence will be refetched by the usePresence hook
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentWorkspaceId, supabase]);

  return null; // This is a manager component, no UI
}
