/**
 * Realtime / WorkspaceChannel Tests
 *
 * Tests for the workspace realtime channel manager including:
 * - Channel creation and singleton behavior
 * - Handler management
 * - Connection state tracking
 * - Channel cleanup
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Supabase client
const mockTrack = vi.fn().mockResolvedValue(undefined);
const mockUntrack = vi.fn().mockResolvedValue(undefined);
const mockSend = vi.fn().mockResolvedValue(undefined);
const mockPresenceState = vi.fn().mockReturnValue({});
const mockSubscribe = vi.fn().mockImplementation((callback: (status: string) => void) => {
  // Immediately call with SUBSCRIBED
  callback("SUBSCRIBED");
});

const mockOn = vi.fn().mockReturnThis();

const mockChannel = {
  on: mockOn,
  subscribe: mockSubscribe,
  track: mockTrack,
  untrack: mockUntrack,
  send: mockSend,
  presenceState: mockPresenceState,
};

const mockRemoveChannel = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    channel: vi.fn().mockReturnValue(mockChannel),
    removeChannel: mockRemoveChannel,
  }),
}));

// Import after mocks
import {
  WorkspaceChannel,
  getWorkspaceChannel,
  removeWorkspaceChannel,
  cleanupAllChannels,
} from "@/lib/realtime/workspace-channel";

describe("WorkspaceChannel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create a channel with the given workspace ID", () => {
      const channel = new WorkspaceChannel("ws-123");
      expect(channel.channelName).toBe("workspace:ws-123");
    });

    it("should start disconnected", () => {
      const channel = new WorkspaceChannel("ws-123");
      expect(channel.connected).toBe(false);
    });
  });

  describe("setHandlers", () => {
    it("should return this for chaining", () => {
      const channel = new WorkspaceChannel("ws-123");
      const result = channel.setHandlers({ onPresenceSync: vi.fn() });
      expect(result).toBe(channel);
    });
  });

  describe("setCurrentUser", () => {
    it("should return this for chaining", () => {
      const channel = new WorkspaceChannel("ws-123");
      const result = channel.setCurrentUser({
        id: "user-1",
        name: "Test User",
        avatar_url: null,
      });
      expect(result).toBe(channel);
    });
  });

  describe("connect", () => {
    it("should not connect without a current user", async () => {
      const channel = new WorkspaceChannel("ws-123");
      await channel.connect();
      expect(channel.connected).toBe(false);
    });

    it("should connect when user is set", async () => {
      const channel = new WorkspaceChannel("ws-123");
      channel.setCurrentUser({
        id: "user-1",
        name: "Test User",
        avatar_url: null,
      });
      await channel.connect();
      expect(channel.connected).toBe(true);
    });

    it("should not reconnect if already connected", async () => {
      const channel = new WorkspaceChannel("ws-123");
      channel.setCurrentUser({
        id: "user-1",
        name: "Test User",
        avatar_url: null,
      });
      await channel.connect();
      const subscribeCalls = mockSubscribe.mock.calls.length;

      await channel.connect(); // second connect call
      // subscribe should not be called again
      expect(mockSubscribe.mock.calls.length).toBe(subscribeCalls);
    });

    it("should track presence after connecting", async () => {
      const channel = new WorkspaceChannel("ws-123");
      channel.setCurrentUser({
        id: "user-1",
        name: "Test User",
        avatar_url: null,
      });
      await channel.connect();
      expect(mockTrack).toHaveBeenCalled();
    });
  });

  describe("disconnect", () => {
    it("should do nothing when not connected", async () => {
      const channel = new WorkspaceChannel("ws-123");
      await channel.disconnect();
      expect(mockUntrack).not.toHaveBeenCalled();
    });

    it("should untrack and remove channel on disconnect", async () => {
      const channel = new WorkspaceChannel("ws-123");
      channel.setCurrentUser({
        id: "user-1",
        name: "Test User",
        avatar_url: null,
      });
      await channel.connect();
      await channel.disconnect();

      expect(mockUntrack).toHaveBeenCalled();
      expect(mockRemoveChannel).toHaveBeenCalled();
      expect(channel.connected).toBe(false);
    });
  });

  describe("getPresenceState", () => {
    it("should return null when not connected", () => {
      const channel = new WorkspaceChannel("ws-123");
      const state = channel.getPresenceState();
      expect(state).toBeNull();
    });

    it("should return presence state when connected", async () => {
      const channel = new WorkspaceChannel("ws-123");
      channel.setCurrentUser({
        id: "user-1",
        name: "Test User",
        avatar_url: null,
      });
      await channel.connect();
      const state = channel.getPresenceState();
      expect(state).toEqual({});
    });
  });

  describe("broadcastTaskUpdate", () => {
    it("should not send when not connected", async () => {
      const channel = new WorkspaceChannel("ws-123");
      await channel.broadcastTaskUpdate("created", "task-1");
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("should broadcast task update when connected", async () => {
      const channel = new WorkspaceChannel("ws-123");
      channel.setCurrentUser({
        id: "user-1",
        name: "Test User",
        avatar_url: null,
      });
      await channel.connect();
      await channel.broadcastTaskUpdate("updated", "task-1", { title: "New" });

      expect(mockSend).toHaveBeenCalledWith({
        type: "broadcast",
        event: "task_update",
        payload: expect.objectContaining({
          type: "updated",
          task_id: "task-1",
          user_id: "user-1",
          user_name: "Test User",
          data: { title: "New" },
        }),
      });
    });
  });

  describe("broadcastTyping", () => {
    it("should not send when not connected", async () => {
      const channel = new WorkspaceChannel("ws-123");
      await channel.broadcastTyping("workspace", true);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("should broadcast typing indicator when connected", async () => {
      const channel = new WorkspaceChannel("ws-123");
      channel.setCurrentUser({
        id: "user-1",
        name: "Test User",
        avatar_url: null,
      });
      await channel.connect();
      await channel.broadcastTyping("workspace", true);

      expect(mockSend).toHaveBeenCalledWith({
        type: "broadcast",
        event: "typing",
        payload: expect.objectContaining({
          user_id: "user-1",
          is_typing: true,
          conversation_key: "workspace",
        }),
      });
    });
  });
});

describe("getWorkspaceChannel (singleton)", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Clean up to reset the singleton map
    await cleanupAllChannels();
  });

  it("should return the same instance for the same workspace ID", () => {
    const ch1 = getWorkspaceChannel("ws-abc");
    const ch2 = getWorkspaceChannel("ws-abc");
    expect(ch1).toBe(ch2);
  });

  it("should return different instances for different workspace IDs", () => {
    const ch1 = getWorkspaceChannel("ws-abc");
    const ch2 = getWorkspaceChannel("ws-xyz");
    expect(ch1).not.toBe(ch2);
  });
});

describe("removeWorkspaceChannel", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await cleanupAllChannels();
  });

  it("should remove a channel by workspace ID", async () => {
    const ch = getWorkspaceChannel("ws-remove-test");
    ch.setCurrentUser({ id: "u1", name: "User", avatar_url: null });
    await ch.connect();
    await removeWorkspaceChannel("ws-remove-test");

    // Getting it again should create a new instance
    const ch2 = getWorkspaceChannel("ws-remove-test");
    expect(ch2).not.toBe(ch);
  });

  it("should do nothing for non-existent workspace ID", async () => {
    // Should not throw
    await removeWorkspaceChannel("non-existent");
  });
});

describe("cleanupAllChannels", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await cleanupAllChannels();
  });

  it("should disconnect all channels", async () => {
    getWorkspaceChannel("ws-1");
    getWorkspaceChannel("ws-2");

    await cleanupAllChannels();

    // After cleanup, getting channel should return new instances
    const ch = getWorkspaceChannel("ws-1");
    expect(ch.connected).toBe(false);
  });
});
