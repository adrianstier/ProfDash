"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import { useChatStore, selectTotalUnreadCount } from "@/lib/stores/chat-store";
import { useMessages, useSendMessage, useAddReaction, useMarkMultipleAsRead } from "@/lib/hooks/use-chat";
import { usePresence, useTypingIndicator } from "@/lib/hooks/use-presence";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Send,
  X,
  Minimize2,
  Maximize2,
  Smile,
  Reply,
  MoreHorizontal,
  Edit3,
  Trash2,
  Pin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { REACTION_EMOJIS, type MessageReactionType, type ChatMessageWithUser } from "@scholaros/shared";

// Notification sound (short, pleasant chime)
const NOTIFICATION_SOUND_URL =
  "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleTs1WpbOzq1fMUJFk8zSrGg/V0Bml8jRzaZ4g2pqmaW4zc7Mu7/Fz8q9rZ2WnqWyxdLOv62WiaOxyb6kkXuNqL+2pJZ7cn2ftLaylnuFjJmnq52Xjn5/gI+dn6OZj4KGjJGVl5qakIuIhYaHiYuOkJGQj42Lh4OCgoKEhoeIiIiHhoWDgoGBgYGCg4SEhISDgoGAgICAgIGBgoKCgoKBgYCAgICAgICBgYGBgYGBgICAgICAgICAgYGBgYGBgYCAgICAgA==";

// Typing indicator component
function TypingIndicator({ userNames }: { userNames: string[] }) {
  if (userNames.length === 0) return null;

  const text =
    userNames.length === 1
      ? `${userNames[0]} is typing`
      : userNames.length === 2
        ? `${userNames.join(" and ")} are typing`
        : `${userNames.slice(0, 2).join(", ")} and others are typing`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground"
    >
      <span>{text}</span>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-primary"
            animate={{
              y: [0, -4, 0],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// Tapback reaction button
function ReactionButton({
  reaction,
  count,
  hasUserReacted,
  onClick,
}: {
  reaction: MessageReactionType;
  count: number;
  hasUserReacted: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all",
        hasUserReacted
          ? "bg-primary/20 text-primary border border-primary/30"
          : "bg-muted hover:bg-muted/80 border border-transparent"
      )}
    >
      <span>{REACTION_EMOJIS[reaction]}</span>
      <span>{count}</span>
    </button>
  );
}

// Reaction picker popup
function ReactionPicker({
  onSelect,
  onClose,
}: {
  onSelect: (reaction: MessageReactionType) => void;
  onClose: () => void;
}) {
  const reactions = Object.entries(REACTION_EMOJIS) as [MessageReactionType, string][];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="absolute bottom-full mb-2 left-0 bg-popover border rounded-lg shadow-lg p-2 flex gap-1 z-50"
    >
      {reactions.map(([type, emoji]) => (
        <button
          key={type}
          onClick={() => {
            onSelect(type);
            onClose();
          }}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-muted transition-colors text-lg"
        >
          {emoji}
        </button>
      ))}
    </motion.div>
  );
}

// Single message component
function ChatMessage({
  message,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onPin,
}: {
  message: ChatMessageWithUser;
  currentUserId: string;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReact: (reaction: MessageReactionType) => void;
  onPin: () => void;
}) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const isOwnMessage = message.user_id === currentUserId;

  // Group reactions by type
  const reactionGroups = useMemo(() => {
    const groups: Record<MessageReactionType, { count: number; hasUserReacted: boolean }> = {} as Record<
      MessageReactionType,
      { count: number; hasUserReacted: boolean }
    >;
    (message.reactions || []).forEach((r) => {
      if (!groups[r.reaction]) {
        groups[r.reaction] = { count: 0, hasUserReacted: false };
      }
      groups[r.reaction].count++;
      if (r.user_id === currentUserId) {
        groups[r.reaction].hasUserReacted = true;
      }
    });
    return groups;
  }, [message.reactions, currentUserId]);

  const userName = message.user?.full_name || "Unknown";
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={cn(
        "group flex gap-3 px-4 py-2 hover:bg-muted/50 transition-colors relative",
        isOwnMessage && "flex-row-reverse"
      )}
    >
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={message.user?.avatar_url || undefined} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>

      <div className={cn("flex-1 min-w-0", isOwnMessage && "flex flex-col items-end")}>
        {/* Reply preview */}
        {message.reply_to_preview && (
          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <Reply className="h-3 w-3" />
            <span className="truncate max-w-[200px]">
              {message.reply_to_user?.full_name}: {message.reply_to_preview}
            </span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className={cn("font-medium text-sm", isOwnMessage && "text-primary")}>{userName}</span>
          <span className="text-xs text-muted-foreground">
            {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          {message.edited_at && <span className="text-xs text-muted-foreground">(edited)</span>}
          {message.is_pinned && <Pin className="h-3 w-3 text-amber-500" />}
        </div>

        {/* Message content */}
        <div
          className={cn(
            "rounded-2xl px-4 py-2 max-w-[80%] inline-block",
            isOwnMessage ? "bg-primary text-primary-foreground" : "bg-muted"
          )}
        >
          <p className="whitespace-pre-wrap break-words text-sm">{message.text}</p>
        </div>

        {/* Reactions */}
        {Object.keys(reactionGroups).length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {(Object.entries(reactionGroups) as [MessageReactionType, { count: number; hasUserReacted: boolean }][]).map(
              ([reaction, { count, hasUserReacted }]) => (
                <ReactionButton
                  key={reaction}
                  reaction={reaction}
                  count={count}
                  hasUserReacted={hasUserReacted}
                  onClick={() => onReact(reaction)}
                />
              )
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div
        className={cn(
          "absolute top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1",
          isOwnMessage ? "left-4" : "right-4"
        )}
      >
        <div className="relative">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setShowReactionPicker(!showReactionPicker)}
                >
                  <Smile className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>React</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <AnimatePresence>
            {showReactionPicker && (
              <ReactionPicker onSelect={onReact} onClose={() => setShowReactionPicker(false)} />
            )}
          </AnimatePresence>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onReply}>
                <Reply className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reply</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <DropdownMenu open={showMenu} onOpenChange={setShowMenu}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onPin}>
              <Pin className="h-4 w-4 mr-2" />
              {message.is_pinned ? "Unpin" : "Pin"}
            </DropdownMenuItem>
            {isOwnMessage && (
              <>
                <DropdownMenuItem onClick={onEdit}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// Main ChatPanel component
export function ChatPanel() {
  const supabase = createClient();
  const { currentWorkspaceId } = useWorkspaceStore();
  const {
    isOpen,
    isMinimized,
    activeConversation,
    messagesByConversation,
    typingUsers,
    replyingTo,
    openChat,
    closeChat,
    toggleMinimize,
    setMessages,
    addMessage,
    updateMessage,
    removeMessage,
    setReplyingTo,
    setEditingMessage,
    clearUnread,
  } = useChatStore();

  const [newMessage, setNewMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Get recipient ID for DM (null for workspace chat)
  const recipientId = activeConversation === "workspace" ? null : activeConversation;

  // Fetch messages
  const { data: messagesData, fetchNextPage, hasNextPage, isFetchingNextPage } = useMessages(
    currentWorkspaceId || "",
    recipientId
  );

  // Fetch presence
  const { data: presenceData } = usePresence(currentWorkspaceId || "");

  // Mutations
  const sendMessage = useSendMessage();
  const addReaction = useAddReaction();
  const markAsRead = useMarkMultipleAsRead();

  // Typing indicator
  const { startTyping, stopTyping } = useTypingIndicator(
    currentWorkspaceId || "",
    activeConversation
  );

  // Total unread count for badge
  const totalUnread = useChatStore(selectTotalUnreadCount);

  // Current typing users
  const currentTypingUserIds = typingUsers[activeConversation] || [];
  const currentTypingNames = currentTypingUserIds
    .filter((id) => id !== currentUserId)
    .map((id) => presenceData?.find((p) => p.user_id === id)?.user?.full_name || "Someone");

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    audioRef.current.volume = 0.5;
  }, []);

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
      }
    });
  }, [supabase]);

  // Update messages in store when data changes
  useEffect(() => {
    if (messagesData?.pages) {
      const allMessages = messagesData.pages.flatMap((page) => page.data);
      setMessages(activeConversation, allMessages);
    }
  }, [messagesData, activeConversation, setMessages]);

  // Scroll to bottom on new messages
  const currentMessages = messagesByConversation[activeConversation] || [];
  const messageCount = currentMessages.length;
  useEffect(() => {
    if (!isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messageCount, isMinimized]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (isOpen && !isMinimized && currentUserId) {
      const messages = messagesByConversation[activeConversation] || [];
      const unreadIds = messages
        .filter((m) => !m.read_by.includes(currentUserId))
        .map((m) => m.id);

      if (unreadIds.length > 0) {
        markAsRead.mutate(unreadIds);
        clearUnread(activeConversation);
      }
    }
  }, [isOpen, isMinimized, activeConversation, currentUserId, messagesByConversation, markAsRead, clearUnread]);

  // Real-time subscription
  useEffect(() => {
    if (!currentWorkspaceId) return;

    const channel = supabase
      .channel(`workspace-messages-${currentWorkspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workspace_messages",
          filter: `workspace_id=eq.${currentWorkspaceId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newMsg = payload.new as ChatMessageWithUser;
            const conversationKey = newMsg.recipient_id || "workspace";

            // Check if this message is for the current conversation
            if (
              conversationKey === activeConversation ||
              (newMsg.recipient_id === currentUserId && activeConversation === newMsg.user_id) ||
              (newMsg.user_id === currentUserId && activeConversation === newMsg.recipient_id)
            ) {
              addMessage(activeConversation, newMsg);

              // Play notification sound for messages from others
              if (newMsg.user_id !== currentUserId && audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(() => {});
              }
            }
          } else if (payload.eventType === "UPDATE") {
            const updatedMsg = payload.new as ChatMessageWithUser;
            const conversationKey = updatedMsg.recipient_id || "workspace";
            updateMessage(conversationKey, updatedMsg.id, updatedMsg);
          } else if (payload.eventType === "DELETE") {
            const deletedMsg = payload.old as { id: string; recipient_id: string | null };
            const conversationKey = deletedMsg.recipient_id || "workspace";
            removeMessage(conversationKey, deletedMsg.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentWorkspaceId, currentUserId, activeConversation, supabase, addMessage, updateMessage, removeMessage]);

  // Handle send message
  const handleSend = useCallback(async () => {
    if (!newMessage.trim() || !currentWorkspaceId || !currentUserId) return;

    const messageData = {
      workspace_id: currentWorkspaceId,
      text: newMessage.trim(),
      recipient_id: recipientId,
      reply_to_id: replyingTo?.id,
      mentions: [],
    };

    try {
      await sendMessage.mutateAsync(messageData);
      setNewMessage("");
      setReplyingTo(null);
      stopTyping();
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  }, [newMessage, currentWorkspaceId, currentUserId, recipientId, replyingTo, sendMessage, setReplyingTo, stopTyping]);

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    startTyping();
  };

  // Handle reaction
  const handleReact = async (messageId: string, reaction: MessageReactionType) => {
    try {
      await addReaction.mutateAsync({ messageId, reaction });
    } catch (error) {
      console.error("Failed to add reaction:", error);
    }
  };

  const messages = messagesByConversation[activeConversation] || [];

  if (!isOpen) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => openChat()}
              className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
              size="icon"
            >
              <MessageSquare className="h-6 w-6" />
              {totalUnread > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                  {totalUnread > 9 ? "9+" : totalUnread}
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Open Chat</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className={cn(
        "fixed bottom-6 right-6 w-96 bg-background border rounded-xl shadow-xl overflow-hidden z-50 flex flex-col",
        isMinimized ? "h-14" : "h-[600px]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <span className="font-semibold">
            {activeConversation === "workspace" ? "Team Chat" : "Direct Message"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleMinimize}>
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={closeChat}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto">
            {hasNextPage && (
              <div className="flex justify-center py-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? "Loading..." : "Load more"}
                </Button>
              </div>
            )}

            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <MessageSquare className="h-12 w-12 mb-2 opacity-50" />
                <p>No messages yet</p>
                <p className="text-sm">Start the conversation!</p>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    currentUserId={currentUserId || ""}
                    onReply={() => setReplyingTo(message)}
                    onEdit={() => {
                      setEditingMessage(message);
                      setNewMessage(message.text);
                    }}
                    onDelete={async () => {
                      // Handle delete
                    }}
                    onReact={(reaction) => handleReact(message.id, reaction)}
                    onPin={async () => {
                      // Handle pin
                    }}
                  />
                ))}
                <div ref={messagesEndRef} />
              </>
            )}

            <AnimatePresence>
              {currentTypingNames.length > 0 && <TypingIndicator userNames={currentTypingNames} />}
            </AnimatePresence>
          </div>

          {/* Reply preview */}
          {replyingTo && (
            <div className="px-4 py-2 bg-muted/50 border-t flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Reply className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Replying to</span>
                <span className="font-medium">{replyingTo.user?.full_name}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setReplyingTo(null)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Textarea
                ref={inputRef}
                value={newMessage}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="min-h-[40px] max-h-[120px] resize-none"
                rows={1}
              />
              <Button
                onClick={handleSend}
                disabled={!newMessage.trim() || sendMessage.isPending}
                size="icon"
                className="h-10 w-10 flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
