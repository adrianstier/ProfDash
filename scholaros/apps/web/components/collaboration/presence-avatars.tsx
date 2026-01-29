"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import { usePresence, type RealtimePresenceUser } from "@/lib/hooks/use-presence";
import type { PresenceStatus, UserPresenceWithProfile } from "@scholaros/shared";

// Presence status colors and indicators
const PRESENCE_CONFIG: Record<
  PresenceStatus,
  { dotColor: string; bgColor: string; label: string }
> = {
  online: {
    dotColor: "bg-green-500",
    bgColor: "bg-green-500/10",
    label: "Online",
  },
  away: {
    dotColor: "bg-yellow-500",
    bgColor: "bg-yellow-500/10",
    label: "Away",
  },
  dnd: {
    dotColor: "bg-red-500",
    bgColor: "bg-red-500/10",
    label: "Do Not Disturb",
  },
  offline: {
    dotColor: "bg-gray-400",
    bgColor: "bg-gray-400/10",
    label: "Offline",
  },
};

// Avatar sizes
const SIZE_CONFIG = {
  xs: {
    avatar: "h-5 w-5",
    dot: "h-1.5 w-1.5 -bottom-0 -right-0",
    text: "text-[8px]",
    overlap: "-ml-1.5",
    ring: "ring-1",
  },
  sm: {
    avatar: "h-6 w-6",
    dot: "h-2 w-2 -bottom-0.5 -right-0.5",
    text: "text-[10px]",
    overlap: "-ml-2",
    ring: "ring-2",
  },
  md: {
    avatar: "h-8 w-8",
    dot: "h-2.5 w-2.5 -bottom-0.5 -right-0.5",
    text: "text-xs",
    overlap: "-ml-2.5",
    ring: "ring-2",
  },
  lg: {
    avatar: "h-10 w-10",
    dot: "h-3 w-3 -bottom-1 -right-1",
    text: "text-sm",
    overlap: "-ml-3",
    ring: "ring-2",
  },
};

type AvatarSize = keyof typeof SIZE_CONFIG;

// Get initials from name
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Single presence avatar with status indicator
interface PresenceAvatarProps {
  userId: string;
  name: string;
  avatarUrl?: string | null;
  status: PresenceStatus;
  customStatus?: string | null;
  size?: AvatarSize;
  showStatus?: boolean;
  showTooltip?: boolean;
  className?: string;
  animate?: boolean;
}

export function PresenceAvatar({
  userId,
  name,
  avatarUrl,
  status,
  customStatus,
  size = "md",
  showStatus = true,
  showTooltip = true,
  className,
  animate = true,
}: PresenceAvatarProps) {
  const sizeConfig = SIZE_CONFIG[size];
  const presenceConfig = PRESENCE_CONFIG[status];
  const initials = getInitials(name);

  const avatarContent = (
    <div className={cn("relative inline-block", className)}>
      <Avatar
        className={cn(
          sizeConfig.avatar,
          sizeConfig.ring,
          "ring-background transition-all duration-200",
          animate && status === "online" && "hover:scale-105"
        )}
      >
        <AvatarImage src={avatarUrl || undefined} alt={name} />
        <AvatarFallback
          className={cn(
            sizeConfig.text,
            "bg-gradient-to-br from-primary/20 to-amber-500/20 text-primary font-medium"
          )}
        >
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* Status indicator dot */}
      {showStatus && (
        <span
          className={cn(
            "absolute rounded-full border-2 border-background transition-all duration-300",
            presenceConfig.dotColor,
            sizeConfig.dot,
            animate && status === "online" && "animate-pulse"
          )}
          aria-label={presenceConfig.label}
        />
      )}
    </div>
  );

  if (!showTooltip) {
    return avatarContent;
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>{avatarContent}</TooltipTrigger>
        <TooltipContent side="bottom" className="text-center">
          <p className="font-medium">{name}</p>
          <div className="flex items-center justify-center gap-1.5 mt-1 text-xs text-muted-foreground">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                presenceConfig.dotColor
              )}
            />
            <span>{presenceConfig.label}</span>
          </div>
          {customStatus && (
            <p className="text-xs text-muted-foreground mt-1 italic">
              {customStatus}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Presence avatar group (stacked avatars)
interface PresenceAvatarsProps {
  users: (UserPresenceWithProfile | RealtimePresenceUser)[];
  maxVisible?: number;
  size?: AvatarSize;
  showCount?: boolean;
  showOnlineOnly?: boolean;
  className?: string;
  onUserClick?: (userId: string) => void;
}

export function PresenceAvatars({
  users,
  maxVisible = 5,
  size = "sm",
  showCount = true,
  showOnlineOnly = true,
  className,
  onUserClick,
}: PresenceAvatarsProps) {
  const sizeConfig = SIZE_CONFIG[size];

  // Filter to online/away users if requested
  const filteredUsers = useMemo(() => {
    if (showOnlineOnly) {
      return users.filter(
        (u) => u.status === "online" || u.status === "away"
      );
    }
    return users;
  }, [users, showOnlineOnly]);

  // Sort by status (online first, then away)
  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      const statusOrder = { online: 0, away: 1, dnd: 2, offline: 3 };
      return statusOrder[a.status] - statusOrder[b.status];
    });
  }, [filteredUsers]);

  const visibleUsers = sortedUsers.slice(0, maxVisible);
  const hiddenCount = Math.max(0, sortedUsers.length - maxVisible);

  if (sortedUsers.length === 0) {
    return null;
  }

  // Helper to get user info depending on type
  const getUserInfo = (user: UserPresenceWithProfile | RealtimePresenceUser) => {
    // Check if it's UserPresenceWithProfile (has 'user' property)
    if ("user" in user && user.user) {
      return {
        id: user.user_id,
        name: user.user.full_name || "Unknown",
        avatarUrl: user.user.avatar_url,
        status: user.status,
        customStatus: "custom_status" in user ? user.custom_status : null,
      };
    }
    // It's RealtimePresenceUser
    return {
      id: user.user_id,
      name: "user_name" in user ? user.user_name : "Unknown",
      avatarUrl: "avatar_url" in user ? user.avatar_url : null,
      status: user.status,
      customStatus: null,
    };
  };

  return (
    <div className={cn("flex items-center", className)}>
      <div className="flex items-center">
        {visibleUsers.map((user, index) => {
          const userInfo = getUserInfo(user);
          return (
            <div
              key={userInfo.id}
              className={cn(
                index > 0 && sizeConfig.overlap,
                "transition-transform duration-200 hover:z-10",
                onUserClick && "cursor-pointer hover:scale-110"
              )}
              onClick={() => onUserClick?.(userInfo.id)}
            >
              <PresenceAvatar
                userId={userInfo.id}
                name={userInfo.name}
                avatarUrl={userInfo.avatarUrl}
                status={userInfo.status}
                customStatus={userInfo.customStatus}
                size={size}
                animate={index === 0}
              />
            </div>
          );
        })}

        {/* Hidden count indicator */}
        {hiddenCount > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    sizeConfig.avatar,
                    sizeConfig.overlap,
                    sizeConfig.ring,
                    sizeConfig.text,
                    "flex items-center justify-center rounded-full bg-muted ring-background font-medium text-muted-foreground cursor-default"
                  )}
                >
                  +{hiddenCount}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>
                  {hiddenCount} more {hiddenCount === 1 ? "member" : "members"}{" "}
                  online
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Online count text */}
      {showCount && (
        <span className="ml-2 text-xs text-muted-foreground whitespace-nowrap">
          {sortedUsers.length} online
        </span>
      )}
    </div>
  );
}

// Presence avatars connected to workspace
interface WorkspacePresenceAvatarsProps {
  maxVisible?: number;
  size?: AvatarSize;
  showCount?: boolean;
  className?: string;
  onUserClick?: (userId: string) => void;
}

export function WorkspacePresenceAvatars({
  maxVisible = 5,
  size = "sm",
  showCount = true,
  className,
  onUserClick,
}: WorkspacePresenceAvatarsProps) {
  const { currentWorkspaceId } = useWorkspaceStore();
  const { data: presenceData, isLoading } = usePresence(currentWorkspaceId || "");

  if (!currentWorkspaceId || isLoading) {
    return null;
  }

  const onlineUsers = (presenceData || []).filter(
    (p) => p.status === "online" || p.status === "away"
  );

  if (onlineUsers.length === 0) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        No one online
      </span>
    );
  }

  return (
    <PresenceAvatars
      users={onlineUsers}
      maxVisible={maxVisible}
      size={size}
      showCount={showCount}
      showOnlineOnly={true}
      className={className}
      onUserClick={onUserClick}
    />
  );
}

// Compact presence indicator for header
interface PresenceIndicatorProps {
  className?: string;
}

export function PresenceIndicator({ className }: PresenceIndicatorProps) {
  const { currentWorkspaceId } = useWorkspaceStore();
  const { data: presenceData } = usePresence(currentWorkspaceId || "");

  const onlineCount = (presenceData || []).filter(
    (p) => p.status === "online" || p.status === "away"
  ).length;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        <span className="text-xs text-muted-foreground">
          {onlineCount} {onlineCount === 1 ? "member" : "members"} online
        </span>
      </div>
    </div>
  );
}

export default PresenceAvatars;
