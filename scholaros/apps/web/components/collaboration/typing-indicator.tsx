"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useChatStore, selectCurrentTypingUsers } from "@/lib/stores/chat-store";
import { usePresence } from "@/lib/hooks/use-presence";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Animated typing dots
function TypingDots({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      aria-hidden="true"
    >
      <span
        className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
        style={{ animationDelay: "0ms", animationDuration: "600ms" }}
      />
      <span
        className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
        style={{ animationDelay: "150ms", animationDuration: "600ms" }}
      />
      <span
        className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
        style={{ animationDelay: "300ms", animationDuration: "600ms" }}
      />
    </span>
  );
}

// Get user name from presence data
function useUserNames(userIds: string[]) {
  const { currentWorkspaceId } = useWorkspaceStore();
  const { data: presenceData } = usePresence(currentWorkspaceId || "");

  return useMemo(() => {
    if (!presenceData) return {};

    const nameMap: Record<string, { name: string; avatarUrl: string | null }> = {};
    presenceData.forEach((p) => {
      if (userIds.includes(p.user_id) && p.user) {
        nameMap[p.user_id] = {
          name: p.user.full_name || "Someone",
          avatarUrl: p.user.avatar_url,
        };
      }
    });
    return nameMap;
  }, [presenceData, userIds]);
}

// Basic typing indicator
interface TypingIndicatorProps {
  typingUserIds: string[];
  className?: string;
  showAvatars?: boolean;
}

export function TypingIndicator({
  typingUserIds,
  className,
  showAvatars = false,
}: TypingIndicatorProps) {
  const userNames = useUserNames(typingUserIds);

  if (typingUserIds.length === 0) {
    return null;
  }

  // Get names of typing users
  const names = typingUserIds
    .map((id) => userNames[id]?.name || "Someone")
    .filter(Boolean);

  // Format the typing message
  let message: string;
  if (names.length === 1) {
    message = `${names[0]} is typing`;
  } else if (names.length === 2) {
    message = `${names[0]} and ${names[1]} are typing`;
  } else if (names.length === 3) {
    message = `${names[0]}, ${names[1]}, and ${names[2]} are typing`;
  } else {
    message = `${names[0]}, ${names[1]}, and ${names.length - 2} others are typing`;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm text-muted-foreground animate-fade-in",
        className
      )}
      role="status"
      aria-live="polite"
    >
      {showAvatars && typingUserIds.length <= 3 && (
        <div className="flex -space-x-1">
          {typingUserIds.slice(0, 3).map((userId) => {
            const user = userNames[userId];
            const initials = user?.name
              ?.split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2) || "?";

            return (
              <Avatar key={userId} className="h-5 w-5 ring-2 ring-background">
                <AvatarImage src={user?.avatarUrl || undefined} />
                <AvatarFallback className="text-[8px]">{initials}</AvatarFallback>
              </Avatar>
            );
          })}
        </div>
      )}

      <span className="flex items-center gap-1.5">
        <span>{message}</span>
        <TypingDots />
      </span>
    </div>
  );
}

// Typing indicator for a specific conversation
interface ConversationTypingIndicatorProps {
  conversationKey: string; // 'workspace' or recipient user_id
  className?: string;
  showAvatars?: boolean;
}

export function ConversationTypingIndicator({
  conversationKey,
  className,
  showAvatars = true,
}: ConversationTypingIndicatorProps) {
  const typingUsers = useChatStore(
    (state) => state.typingUsers[conversationKey] || []
  );

  return (
    <TypingIndicator
      typingUserIds={typingUsers}
      className={className}
      showAvatars={showAvatars}
    />
  );
}

// Typing indicator using store's current conversation
interface CurrentConversationTypingIndicatorProps {
  className?: string;
  showAvatars?: boolean;
}

export function CurrentConversationTypingIndicator({
  className,
  showAvatars = true,
}: CurrentConversationTypingIndicatorProps) {
  const typingUserIds = useChatStore(selectCurrentTypingUsers);

  return (
    <TypingIndicator
      typingUserIds={typingUserIds}
      className={className}
      showAvatars={showAvatars}
    />
  );
}

// Minimal typing indicator (just dots, for compact spaces)
interface MinimalTypingIndicatorProps {
  isTyping: boolean;
  userName?: string;
  className?: string;
}

export function MinimalTypingIndicator({
  isTyping,
  userName,
  className,
}: MinimalTypingIndicatorProps) {
  if (!isTyping) {
    return null;
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50 text-xs text-muted-foreground animate-fade-in",
        className
      )}
      role="status"
      aria-live="polite"
    >
      {userName && <span className="font-medium">{userName}</span>}
      <TypingDots />
    </div>
  );
}

// Typing bubble indicator (chat-style)
interface TypingBubbleProps {
  typingUserIds: string[];
  className?: string;
}

export function TypingBubble({ typingUserIds, className }: TypingBubbleProps) {
  const userNames = useUserNames(typingUserIds);

  if (typingUserIds.length === 0) {
    return null;
  }

  const firstUser = userNames[typingUserIds[0]];
  const initials = firstUser?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  return (
    <div
      className={cn(
        "flex items-start gap-2 animate-fade-in",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={`${firstUser?.name || "Someone"} is typing`}
    >
      {/* Avatar */}
      <Avatar className="h-8 w-8">
        <AvatarImage src={firstUser?.avatarUrl || undefined} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>

      {/* Typing bubble */}
      <div className="flex items-center gap-1 px-4 py-3 rounded-2xl rounded-tl-sm bg-muted">
        <span
          className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce"
          style={{ animationDelay: "0ms", animationDuration: "800ms" }}
        />
        <span
          className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce"
          style={{ animationDelay: "200ms", animationDuration: "800ms" }}
        />
        <span
          className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce"
          style={{ animationDelay: "400ms", animationDuration: "800ms" }}
        />
      </div>

      {/* Additional users count */}
      {typingUserIds.length > 1 && (
        <span className="text-xs text-muted-foreground self-end mb-1">
          +{typingUserIds.length - 1} more typing
        </span>
      )}
    </div>
  );
}

// Current conversation typing bubble
export function CurrentConversationTypingBubble({
  className,
}: {
  className?: string;
}) {
  const typingUserIds = useChatStore(selectCurrentTypingUsers);

  return <TypingBubble typingUserIds={typingUserIds} className={className} />;
}

export default TypingIndicator;
