import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ChatMessage,
  ChatMessageWithUser,
  PresenceStatus,
  UserPresenceWithProfile,
  ChatNotificationSettings,
} from "@scholaros/shared";
import { DEFAULT_CHAT_NOTIFICATION_SETTINGS } from "@scholaros/shared";

// Conversation identifier
export type ConversationKey = "workspace" | string; // 'workspace' or recipient user_id

export interface ChatState {
  // Panel state
  isOpen: boolean;
  isMinimized: boolean;

  // Active conversation
  activeConversation: ConversationKey;

  // Messages (keyed by conversation)
  messagesByConversation: Record<ConversationKey, ChatMessageWithUser[]>;

  // Unread counts (keyed by conversation)
  unreadCounts: Record<ConversationKey, number>;

  // Presence
  presenceMap: Record<string, UserPresenceWithProfile>; // keyed by user_id

  // Typing indicators (keyed by conversation, array of user_ids)
  typingUsers: Record<ConversationKey, string[]>;

  // UI state
  replyingTo: ChatMessageWithUser | null;
  editingMessage: ChatMessageWithUser | null;
  showEmojiPicker: boolean;
  showMentionPicker: boolean;
  mentionFilter: string;
  searchQuery: string;
  showSearch: boolean;
  showPinnedMessages: boolean;

  // Notification settings
  notificationSettings: ChatNotificationSettings;

  // Last read timestamp per conversation
  lastReadTimestamps: Record<ConversationKey, string>;
}

export interface ChatActions {
  // Panel actions
  openChat: (initialConversation?: ConversationKey) => void;
  closeChat: () => void;
  toggleChat: () => void;
  toggleMinimize: () => void;

  // Conversation actions
  setActiveConversation: (conversation: ConversationKey) => void;

  // Message actions
  setMessages: (conversation: ConversationKey, messages: ChatMessageWithUser[]) => void;
  addMessage: (conversation: ConversationKey, message: ChatMessageWithUser) => void;
  updateMessage: (conversation: ConversationKey, id: string, updates: Partial<ChatMessage>) => void;
  removeMessage: (conversation: ConversationKey, id: string) => void;
  prependMessages: (conversation: ConversationKey, messages: ChatMessageWithUser[]) => void;

  // Unread actions
  incrementUnread: (conversation: ConversationKey) => void;
  clearUnread: (conversation: ConversationKey) => void;
  setUnreadCount: (conversation: ConversationKey, count: number) => void;

  // Presence actions
  updatePresence: (userId: string, presence: UserPresenceWithProfile) => void;
  setPresenceMap: (presenceMap: Record<string, UserPresenceWithProfile>) => void;
  clearPresence: () => void;

  // Typing actions
  setTypingUsers: (conversation: ConversationKey, userIds: string[]) => void;
  addTypingUser: (conversation: ConversationKey, userId: string) => void;
  removeTypingUser: (conversation: ConversationKey, userId: string) => void;

  // UI actions
  setReplyingTo: (message: ChatMessageWithUser | null) => void;
  setEditingMessage: (message: ChatMessageWithUser | null) => void;
  setShowEmojiPicker: (show: boolean) => void;
  setShowMentionPicker: (show: boolean) => void;
  setMentionFilter: (filter: string) => void;
  setSearchQuery: (query: string) => void;
  setShowSearch: (show: boolean) => void;
  setShowPinnedMessages: (show: boolean) => void;

  // Notification actions
  updateNotificationSettings: (settings: Partial<ChatNotificationSettings>) => void;

  // Last read actions
  updateLastRead: (conversation: ConversationKey, timestamp: string) => void;

  // Reset
  resetChat: () => void;
}

const initialState: ChatState = {
  isOpen: false,
  isMinimized: false,
  activeConversation: "workspace",
  messagesByConversation: {},
  unreadCounts: {},
  presenceMap: {},
  typingUsers: {},
  replyingTo: null,
  editingMessage: null,
  showEmojiPicker: false,
  showMentionPicker: false,
  mentionFilter: "",
  searchQuery: "",
  showSearch: false,
  showPinnedMessages: false,
  notificationSettings: DEFAULT_CHAT_NOTIFICATION_SETTINGS,
  lastReadTimestamps: {},
};

// Track typing indicator timeouts outside the store to avoid serialization issues
const typingTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

function getTypingKey(conversation: ConversationKey, userId: string): string {
  return `${conversation}::${userId}`;
}

export const useChatStore = create<ChatState & ChatActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Panel actions
      openChat: (initialConversation) =>
        set({
          isOpen: true,
          isMinimized: false,
          ...(initialConversation && { activeConversation: initialConversation }),
        }),

      closeChat: () =>
        set({
          isOpen: false,
          replyingTo: null,
          editingMessage: null,
          showEmojiPicker: false,
          showMentionPicker: false,
          showSearch: false,
        }),

      toggleChat: () => {
        const { isOpen } = get();
        if (isOpen) {
          get().closeChat();
        } else {
          get().openChat();
        }
      },

      toggleMinimize: () =>
        set((state) => ({ isMinimized: !state.isMinimized })),

      // Conversation actions
      setActiveConversation: (conversation) =>
        set({
          activeConversation: conversation,
          replyingTo: null,
          editingMessage: null,
          showSearch: false,
          searchQuery: "",
        }),

      // Message actions
      setMessages: (conversation, messages) =>
        set((state) => ({
          messagesByConversation: {
            ...state.messagesByConversation,
            [conversation]: messages,
          },
        })),

      addMessage: (conversation, message) =>
        set((state) => {
          const existing = state.messagesByConversation[conversation] || [];
          // Avoid duplicates
          if (existing.some((m) => m.id === message.id)) {
            return state;
          }
          return {
            messagesByConversation: {
              ...state.messagesByConversation,
              [conversation]: [...existing, message],
            },
          };
        }),

      updateMessage: (conversation, id, updates) =>
        set((state) => {
          const messages = state.messagesByConversation[conversation] || [];
          return {
            messagesByConversation: {
              ...state.messagesByConversation,
              [conversation]: messages.map((m) =>
                m.id === id ? { ...m, ...updates } : m
              ),
            },
          };
        }),

      removeMessage: (conversation, id) =>
        set((state) => {
          const messages = state.messagesByConversation[conversation] || [];
          return {
            messagesByConversation: {
              ...state.messagesByConversation,
              [conversation]: messages.filter((m) => m.id !== id),
            },
          };
        }),

      prependMessages: (conversation, messages) =>
        set((state) => {
          const existing = state.messagesByConversation[conversation] || [];
          const existingIds = new Set(existing.map((m) => m.id));
          const newMessages = messages.filter((m) => !existingIds.has(m.id));
          return {
            messagesByConversation: {
              ...state.messagesByConversation,
              [conversation]: [...newMessages, ...existing],
            },
          };
        }),

      // Unread actions
      incrementUnread: (conversation) =>
        set((state) => ({
          unreadCounts: {
            ...state.unreadCounts,
            [conversation]: (state.unreadCounts[conversation] || 0) + 1,
          },
        })),

      clearUnread: (conversation) =>
        set((state) => ({
          unreadCounts: {
            ...state.unreadCounts,
            [conversation]: 0,
          },
        })),

      setUnreadCount: (conversation, count) =>
        set((state) => ({
          unreadCounts: {
            ...state.unreadCounts,
            [conversation]: count,
          },
        })),

      // Presence actions
      updatePresence: (userId, presence) =>
        set((state) => ({
          presenceMap: {
            ...state.presenceMap,
            [userId]: presence,
          },
        })),

      setPresenceMap: (presenceMap) => set({ presenceMap }),

      clearPresence: () => set({ presenceMap: {} }),

      // Typing actions
      setTypingUsers: (conversation, userIds) =>
        set((state) => ({
          typingUsers: {
            ...state.typingUsers,
            [conversation]: userIds,
          },
        })),

      addTypingUser: (conversation, userId) => {
        // Clear any existing timeout for this user+conversation
        const key = getTypingKey(conversation, userId);
        const existingTimeout = typingTimeouts.get(key);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }

        // Set a timeout to auto-remove after 5 seconds
        const timeout = setTimeout(() => {
          typingTimeouts.delete(key);
          get().removeTypingUser(conversation, userId);
        }, 5000);
        typingTimeouts.set(key, timeout);

        set((state) => {
          const current = state.typingUsers[conversation] || [];
          if (current.includes(userId)) return state;
          return {
            typingUsers: {
              ...state.typingUsers,
              [conversation]: [...current, userId],
            },
          };
        });
      },

      removeTypingUser: (conversation, userId) => {
        // Clear the timeout when explicitly removing
        const key = getTypingKey(conversation, userId);
        const existingTimeout = typingTimeouts.get(key);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
          typingTimeouts.delete(key);
        }

        set((state) => {
          const current = state.typingUsers[conversation] || [];
          return {
            typingUsers: {
              ...state.typingUsers,
              [conversation]: current.filter((id) => id !== userId),
            },
          };
        });
      },

      // UI actions
      setReplyingTo: (message) => set({ replyingTo: message }),
      setEditingMessage: (message) => set({ editingMessage: message }),
      setShowEmojiPicker: (show) => set({ showEmojiPicker: show }),
      setShowMentionPicker: (show) => set({ showMentionPicker: show }),
      setMentionFilter: (filter) => set({ mentionFilter: filter }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setShowSearch: (show) => set({ showSearch: show }),
      setShowPinnedMessages: (show) => set({ showPinnedMessages: show }),

      // Notification actions
      updateNotificationSettings: (settings) =>
        set((state) => ({
          notificationSettings: {
            ...state.notificationSettings,
            ...settings,
          },
        })),

      // Last read actions
      updateLastRead: (conversation, timestamp) =>
        set((state) => ({
          lastReadTimestamps: {
            ...state.lastReadTimestamps,
            [conversation]: timestamp,
          },
        })),

      // Reset
      resetChat: () => set(initialState),
    }),
    {
      name: "chat-storage",
      partialize: (state) => ({
        // Only persist these fields
        activeConversation: state.activeConversation,
        notificationSettings: state.notificationSettings,
        lastReadTimestamps: state.lastReadTimestamps,
      }),
    }
  )
);

// Selectors
export const selectTotalUnreadCount = (state: ChatState): number => {
  return Object.values(state.unreadCounts).reduce((sum, count) => sum + count, 0);
};

export const selectCurrentMessages = (state: ChatState): ChatMessageWithUser[] => {
  return state.messagesByConversation[state.activeConversation] || [];
};

export const selectCurrentTypingUsers = (state: ChatState): string[] => {
  return state.typingUsers[state.activeConversation] || [];
};

export const selectUserPresence = (
  state: ChatState,
  userId: string
): PresenceStatus => {
  return state.presenceMap[userId]?.status || "offline";
};
