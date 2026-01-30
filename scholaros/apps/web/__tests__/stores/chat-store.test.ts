import { describe, it, expect, beforeEach } from "vitest";
import {
  useChatStore,
  selectTotalUnreadCount,
  selectCurrentMessages,
  selectCurrentTypingUsers,
  selectUserPresence,
} from "@/lib/stores/chat-store";
import type { ChatMessageWithUser, UserPresenceWithProfile } from "@scholaros/shared";
import { DEFAULT_CHAT_NOTIFICATION_SETTINGS } from "@scholaros/shared";

function createChatMessage(overrides: Partial<ChatMessageWithUser> = {}): ChatMessageWithUser {
  return {
    id: "msg-1",
    workspace_id: "ws-1",
    user_id: "user-1",
    text: "Hello world",
    recipient_id: null,
    related_task_id: null,
    related_project_id: null,
    reply_to_id: null,
    reply_to_preview: null,
    reply_to_user_id: null,
    reactions: [],
    read_by: [],
    mentions: [],
    edited_at: null,
    deleted_at: null,
    is_pinned: false,
    pinned_by: null,
    pinned_at: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

const initialState = {
  isOpen: false,
  isMinimized: false,
  activeConversation: "workspace" as const,
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

describe("useChatStore", () => {
  beforeEach(() => {
    useChatStore.setState(initialState);
  });

  describe("initial state", () => {
    it("should be closed", () => {
      expect(useChatStore.getState().isOpen).toBe(false);
    });

    it("should not be minimized", () => {
      expect(useChatStore.getState().isMinimized).toBe(false);
    });

    it("should default to workspace conversation", () => {
      expect(useChatStore.getState().activeConversation).toBe("workspace");
    });

    it("should have empty messages", () => {
      expect(useChatStore.getState().messagesByConversation).toEqual({});
    });

    it("should have default notification settings", () => {
      expect(useChatStore.getState().notificationSettings).toEqual(DEFAULT_CHAT_NOTIFICATION_SETTINGS);
    });
  });

  describe("panel actions", () => {
    it("should open chat", () => {
      useChatStore.getState().openChat();
      expect(useChatStore.getState().isOpen).toBe(true);
      expect(useChatStore.getState().isMinimized).toBe(false);
    });

    it("should open chat with initial conversation", () => {
      useChatStore.getState().openChat("user-123");
      expect(useChatStore.getState().isOpen).toBe(true);
      expect(useChatStore.getState().activeConversation).toBe("user-123");
    });

    it("should close chat and reset UI state", () => {
      useChatStore.getState().openChat();
      useChatStore.getState().setShowEmojiPicker(true);
      useChatStore.getState().setShowSearch(true);
      useChatStore.getState().closeChat();
      expect(useChatStore.getState().isOpen).toBe(false);
      expect(useChatStore.getState().showEmojiPicker).toBe(false);
      expect(useChatStore.getState().showSearch).toBe(false);
      expect(useChatStore.getState().replyingTo).toBeNull();
      expect(useChatStore.getState().editingMessage).toBeNull();
    });

    it("should toggle chat open and close", () => {
      useChatStore.getState().toggleChat();
      expect(useChatStore.getState().isOpen).toBe(true);
      useChatStore.getState().toggleChat();
      expect(useChatStore.getState().isOpen).toBe(false);
    });

    it("should toggle minimize", () => {
      useChatStore.getState().toggleMinimize();
      expect(useChatStore.getState().isMinimized).toBe(true);
      useChatStore.getState().toggleMinimize();
      expect(useChatStore.getState().isMinimized).toBe(false);
    });
  });

  describe("conversation actions", () => {
    it("should set active conversation", () => {
      useChatStore.getState().setActiveConversation("user-456");
      expect(useChatStore.getState().activeConversation).toBe("user-456");
    });

    it("should reset reply/edit/search state when switching conversations", () => {
      const msg = createChatMessage();
      useChatStore.getState().setReplyingTo(msg);
      useChatStore.getState().setEditingMessage(msg);
      useChatStore.getState().setShowSearch(true);
      useChatStore.getState().setSearchQuery("test");

      useChatStore.getState().setActiveConversation("user-789");
      expect(useChatStore.getState().replyingTo).toBeNull();
      expect(useChatStore.getState().editingMessage).toBeNull();
      expect(useChatStore.getState().showSearch).toBe(false);
      expect(useChatStore.getState().searchQuery).toBe("");
    });
  });

  describe("message actions", () => {
    it("should set messages for a conversation", () => {
      const messages = [createChatMessage({ id: "m1" }), createChatMessage({ id: "m2" })];
      useChatStore.getState().setMessages("workspace", messages);
      expect(useChatStore.getState().messagesByConversation["workspace"]).toHaveLength(2);
    });

    it("should add a message to a conversation", () => {
      useChatStore.getState().addMessage("workspace", createChatMessage({ id: "m1" }));
      useChatStore.getState().addMessage("workspace", createChatMessage({ id: "m2" }));
      expect(useChatStore.getState().messagesByConversation["workspace"]).toHaveLength(2);
    });

    it("should not add duplicate messages", () => {
      useChatStore.getState().addMessage("workspace", createChatMessage({ id: "m1" }));
      useChatStore.getState().addMessage("workspace", createChatMessage({ id: "m1" }));
      expect(useChatStore.getState().messagesByConversation["workspace"]).toHaveLength(1);
    });

    it("should update a message", () => {
      useChatStore.getState().addMessage("workspace", createChatMessage({ id: "m1", text: "Old" }));
      useChatStore.getState().updateMessage("workspace", "m1", { text: "New" });
      expect(useChatStore.getState().messagesByConversation["workspace"][0].text).toBe("New");
    });

    it("should remove a message", () => {
      useChatStore.getState().addMessage("workspace", createChatMessage({ id: "m1" }));
      useChatStore.getState().addMessage("workspace", createChatMessage({ id: "m2" }));
      useChatStore.getState().removeMessage("workspace", "m1");
      expect(useChatStore.getState().messagesByConversation["workspace"]).toHaveLength(1);
      expect(useChatStore.getState().messagesByConversation["workspace"][0].id).toBe("m2");
    });

    it("should prepend messages without duplicates", () => {
      useChatStore.getState().addMessage("workspace", createChatMessage({ id: "m3", text: "Third" }));
      const older = [
        createChatMessage({ id: "m1", text: "First" }),
        createChatMessage({ id: "m2", text: "Second" }),
        createChatMessage({ id: "m3", text: "Third duplicate" }), // should be filtered out
      ];
      useChatStore.getState().prependMessages("workspace", older);
      const messages = useChatStore.getState().messagesByConversation["workspace"];
      expect(messages).toHaveLength(3);
      expect(messages[0].id).toBe("m1");
      expect(messages[1].id).toBe("m2");
      expect(messages[2].id).toBe("m3");
    });

    it("should handle messages in separate conversations independently", () => {
      useChatStore.getState().addMessage("workspace", createChatMessage({ id: "m1", text: "WS msg" }));
      useChatStore.getState().addMessage("user-1", createChatMessage({ id: "m2", text: "DM msg" }));
      expect(useChatStore.getState().messagesByConversation["workspace"]).toHaveLength(1);
      expect(useChatStore.getState().messagesByConversation["user-1"]).toHaveLength(1);
    });
  });

  describe("unread counts", () => {
    it("should increment unread count", () => {
      useChatStore.getState().incrementUnread("workspace");
      useChatStore.getState().incrementUnread("workspace");
      expect(useChatStore.getState().unreadCounts["workspace"]).toBe(2);
    });

    it("should clear unread count for a conversation", () => {
      useChatStore.getState().incrementUnread("workspace");
      useChatStore.getState().incrementUnread("workspace");
      useChatStore.getState().clearUnread("workspace");
      expect(useChatStore.getState().unreadCounts["workspace"]).toBe(0);
    });

    it("should set unread count directly", () => {
      useChatStore.getState().setUnreadCount("workspace", 5);
      expect(useChatStore.getState().unreadCounts["workspace"]).toBe(5);
    });

    it("should track unread counts per conversation", () => {
      useChatStore.getState().incrementUnread("workspace");
      useChatStore.getState().incrementUnread("user-1");
      useChatStore.getState().incrementUnread("user-1");
      expect(useChatStore.getState().unreadCounts["workspace"]).toBe(1);
      expect(useChatStore.getState().unreadCounts["user-1"]).toBe(2);
    });
  });

  describe("presence", () => {
    it("should update user presence", () => {
      const presence: UserPresenceWithProfile = {
        id: "p1",
        user_id: "user-1",
        workspace_id: "ws-1",
        status: "online",
        is_typing: false,
        typing_in_conversation: null,
        last_seen: "2025-01-01T00:00:00Z",
        last_active: "2025-01-01T00:00:00Z",
        custom_status: null,
      };
      useChatStore.getState().updatePresence("user-1", presence);
      expect(useChatStore.getState().presenceMap["user-1"].status).toBe("online");
    });

    it("should set entire presence map", () => {
      const map = {
        "user-1": {
          id: "p1",
          user_id: "user-1",
          workspace_id: "ws-1",
          status: "online" as const,
          is_typing: false,
          typing_in_conversation: null,
          last_seen: "",
          last_active: "",
          custom_status: null,
        },
      };
      useChatStore.getState().setPresenceMap(map);
      expect(Object.keys(useChatStore.getState().presenceMap)).toHaveLength(1);
    });

    it("should clear presence", () => {
      useChatStore.getState().setPresenceMap({
        "user-1": {
          id: "p1",
          user_id: "user-1",
          workspace_id: "ws-1",
          status: "online",
          is_typing: false,
          typing_in_conversation: null,
          last_seen: "",
          last_active: "",
          custom_status: null,
        },
      });
      useChatStore.getState().clearPresence();
      expect(useChatStore.getState().presenceMap).toEqual({});
    });
  });

  describe("typing indicators", () => {
    it("should set typing users for a conversation", () => {
      useChatStore.getState().setTypingUsers("workspace", ["user-1", "user-2"]);
      expect(useChatStore.getState().typingUsers["workspace"]).toEqual(["user-1", "user-2"]);
    });

    it("should add a typing user", () => {
      useChatStore.getState().addTypingUser("workspace", "user-1");
      useChatStore.getState().addTypingUser("workspace", "user-2");
      expect(useChatStore.getState().typingUsers["workspace"]).toEqual(["user-1", "user-2"]);
    });

    it("should not add duplicate typing user", () => {
      useChatStore.getState().addTypingUser("workspace", "user-1");
      useChatStore.getState().addTypingUser("workspace", "user-1");
      expect(useChatStore.getState().typingUsers["workspace"]).toEqual(["user-1"]);
    });

    it("should remove a typing user", () => {
      useChatStore.getState().addTypingUser("workspace", "user-1");
      useChatStore.getState().addTypingUser("workspace", "user-2");
      useChatStore.getState().removeTypingUser("workspace", "user-1");
      expect(useChatStore.getState().typingUsers["workspace"]).toEqual(["user-2"]);
    });
  });

  describe("UI state", () => {
    it("should set replying to message", () => {
      const msg = createChatMessage();
      useChatStore.getState().setReplyingTo(msg);
      expect(useChatStore.getState().replyingTo).toEqual(msg);
    });

    it("should clear replying to", () => {
      useChatStore.getState().setReplyingTo(createChatMessage());
      useChatStore.getState().setReplyingTo(null);
      expect(useChatStore.getState().replyingTo).toBeNull();
    });

    it("should set editing message", () => {
      const msg = createChatMessage();
      useChatStore.getState().setEditingMessage(msg);
      expect(useChatStore.getState().editingMessage).toEqual(msg);
    });

    it("should toggle emoji picker", () => {
      useChatStore.getState().setShowEmojiPicker(true);
      expect(useChatStore.getState().showEmojiPicker).toBe(true);
    });

    it("should set mention picker and filter", () => {
      useChatStore.getState().setShowMentionPicker(true);
      useChatStore.getState().setMentionFilter("john");
      expect(useChatStore.getState().showMentionPicker).toBe(true);
      expect(useChatStore.getState().mentionFilter).toBe("john");
    });

    it("should set search query and visibility", () => {
      useChatStore.getState().setShowSearch(true);
      useChatStore.getState().setSearchQuery("meeting notes");
      expect(useChatStore.getState().showSearch).toBe(true);
      expect(useChatStore.getState().searchQuery).toBe("meeting notes");
    });

    it("should set pinned messages visibility", () => {
      useChatStore.getState().setShowPinnedMessages(true);
      expect(useChatStore.getState().showPinnedMessages).toBe(true);
    });
  });

  describe("notification settings", () => {
    it("should update notification settings partially", () => {
      useChatStore.getState().updateNotificationSettings({ sound_enabled: false });
      expect(useChatStore.getState().notificationSettings.sound_enabled).toBe(false);
      expect(useChatStore.getState().notificationSettings.enabled).toBe(true); // unchanged
    });

    it("should update multiple notification settings", () => {
      useChatStore.getState().updateNotificationSettings({
        enabled: false,
        notify_on_mention: false,
      });
      expect(useChatStore.getState().notificationSettings.enabled).toBe(false);
      expect(useChatStore.getState().notificationSettings.notify_on_mention).toBe(false);
    });
  });

  describe("last read timestamps", () => {
    it("should update last read timestamp", () => {
      useChatStore.getState().updateLastRead("workspace", "2025-06-15T12:00:00Z");
      expect(useChatStore.getState().lastReadTimestamps["workspace"]).toBe("2025-06-15T12:00:00Z");
    });

    it("should track per conversation", () => {
      useChatStore.getState().updateLastRead("workspace", "2025-01-01T00:00:00Z");
      useChatStore.getState().updateLastRead("user-1", "2025-02-01T00:00:00Z");
      expect(useChatStore.getState().lastReadTimestamps["workspace"]).toBe("2025-01-01T00:00:00Z");
      expect(useChatStore.getState().lastReadTimestamps["user-1"]).toBe("2025-02-01T00:00:00Z");
    });
  });

  describe("resetChat", () => {
    it("should reset all state to initial values", () => {
      useChatStore.getState().openChat("user-1");
      useChatStore.getState().addMessage("workspace", createChatMessage());
      useChatStore.getState().incrementUnread("workspace");
      useChatStore.getState().setShowSearch(true);

      useChatStore.getState().resetChat();
      const state = useChatStore.getState();
      expect(state.isOpen).toBe(false);
      expect(state.activeConversation).toBe("workspace");
      expect(state.messagesByConversation).toEqual({});
      expect(state.unreadCounts).toEqual({});
      expect(state.showSearch).toBe(false);
    });
  });
});

describe("selectors", () => {
  beforeEach(() => {
    useChatStore.setState(initialState);
  });

  describe("selectTotalUnreadCount", () => {
    it("should return 0 with no unreads", () => {
      expect(selectTotalUnreadCount(useChatStore.getState())).toBe(0);
    });

    it("should sum unread counts across conversations", () => {
      useChatStore.getState().setUnreadCount("workspace", 3);
      useChatStore.getState().setUnreadCount("user-1", 2);
      useChatStore.getState().setUnreadCount("user-2", 5);
      expect(selectTotalUnreadCount(useChatStore.getState())).toBe(10);
    });
  });

  describe("selectCurrentMessages", () => {
    it("should return empty array for conversation with no messages", () => {
      expect(selectCurrentMessages(useChatStore.getState())).toEqual([]);
    });

    it("should return messages for active conversation", () => {
      useChatStore.getState().addMessage("workspace", createChatMessage({ id: "m1" }));
      expect(selectCurrentMessages(useChatStore.getState())).toHaveLength(1);
    });

    it("should reflect active conversation change", () => {
      useChatStore.getState().addMessage("workspace", createChatMessage({ id: "m1" }));
      useChatStore.getState().addMessage("user-1", createChatMessage({ id: "m2" }));
      useChatStore.getState().setActiveConversation("user-1");
      const messages = selectCurrentMessages(useChatStore.getState());
      expect(messages).toHaveLength(1);
      expect(messages[0].id).toBe("m2");
    });
  });

  describe("selectCurrentTypingUsers", () => {
    it("should return empty array when no one is typing", () => {
      expect(selectCurrentTypingUsers(useChatStore.getState())).toEqual([]);
    });

    it("should return typing users for active conversation", () => {
      useChatStore.getState().addTypingUser("workspace", "user-1");
      expect(selectCurrentTypingUsers(useChatStore.getState())).toEqual(["user-1"]);
    });
  });

  describe("selectUserPresence", () => {
    it("should return offline for unknown user", () => {
      expect(selectUserPresence(useChatStore.getState(), "unknown")).toBe("offline");
    });

    it("should return user presence status", () => {
      useChatStore.getState().updatePresence("user-1", {
        id: "p1",
        user_id: "user-1",
        workspace_id: "ws-1",
        status: "online",
        is_typing: false,
        typing_in_conversation: null,
        last_seen: "",
        last_active: "",
        custom_status: null,
      });
      expect(selectUserPresence(useChatStore.getState(), "user-1")).toBe("online");
    });
  });
});
