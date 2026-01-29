"use client";

import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel, RealtimePresenceState } from "@supabase/supabase-js";
import type { PresenceStatus } from "@scholaros/shared";

// Type definitions for realtime events
export interface RealtimePresencePayload {
  user_id: string;
  user_name: string;
  avatar_url: string | null;
  status: PresenceStatus;
  last_active: string;
  is_typing: boolean;
  typing_in_conversation: string | null;
}

export interface TaskUpdatePayload {
  type: "created" | "updated" | "deleted";
  task_id: string;
  user_id: string;
  user_name: string;
  data?: Record<string, unknown>;
}

export interface TypingPayload {
  user_id: string;
  user_name: string;
  conversation_key: string; // 'workspace' or recipient user_id
  is_typing: boolean;
}

// Event handlers type
export interface WorkspaceChannelHandlers {
  onPresenceSync?: (state: RealtimePresenceState<RealtimePresencePayload>) => void;
  onPresenceJoin?: (key: string, currentPresence: RealtimePresencePayload, newPresence: RealtimePresencePayload[]) => void;
  onPresenceLeave?: (key: string, currentPresence: RealtimePresencePayload, leftPresence: RealtimePresencePayload[]) => void;
  onTaskUpdate?: (payload: TaskUpdatePayload) => void;
  onTypingUpdate?: (payload: TypingPayload) => void;
  onError?: (error: Error) => void;
}

// Workspace channel manager class
export class WorkspaceChannel {
  private channel: RealtimeChannel | null = null;
  private workspaceId: string;
  private currentUser: {
    id: string;
    name: string;
    avatar_url: string | null;
  } | null = null;
  private handlers: WorkspaceChannelHandlers = {};
  private supabase = createClient();
  private isConnected = false;

  constructor(workspaceId: string) {
    this.workspaceId = workspaceId;
  }

  // Set event handlers
  setHandlers(handlers: WorkspaceChannelHandlers) {
    this.handlers = { ...this.handlers, ...handlers };
    return this;
  }

  // Set current user info for presence
  setCurrentUser(user: { id: string; name: string; avatar_url: string | null }) {
    this.currentUser = user;
    return this;
  }

  // Connect to the workspace channel
  async connect(): Promise<void> {
    if (this.isConnected || !this.currentUser) {
      return;
    }

    const channelName = `workspace:${this.workspaceId}`;

    this.channel = this.supabase.channel(channelName, {
      config: {
        presence: {
          key: this.currentUser.id,
        },
      },
    });

    // Set up presence event handlers
    this.channel
      .on("presence", { event: "sync" }, () => {
        if (this.channel && this.handlers.onPresenceSync) {
          const state = this.channel.presenceState<RealtimePresencePayload>();
          this.handlers.onPresenceSync(state);
        }
      })
      .on("presence", { event: "join" }, ({ key, currentPresences, newPresences }) => {
        if (this.handlers.onPresenceJoin && currentPresences[0] && newPresences) {
          this.handlers.onPresenceJoin(
            key,
            currentPresences[0] as unknown as RealtimePresencePayload,
            newPresences as unknown as RealtimePresencePayload[]
          );
        }
      })
      .on("presence", { event: "leave" }, ({ key, currentPresences, leftPresences }) => {
        if (this.handlers.onPresenceLeave && currentPresences[0] && leftPresences) {
          this.handlers.onPresenceLeave(
            key,
            currentPresences[0] as unknown as RealtimePresencePayload,
            leftPresences as unknown as RealtimePresencePayload[]
          );
        }
      });

    // Set up broadcast event handlers
    this.channel
      .on("broadcast", { event: "task_update" }, ({ payload }) => {
        if (this.handlers.onTaskUpdate) {
          this.handlers.onTaskUpdate(payload as TaskUpdatePayload);
        }
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (this.handlers.onTypingUpdate) {
          this.handlers.onTypingUpdate(payload as TypingPayload);
        }
      });

    // Subscribe to the channel
    await new Promise<void>((resolve, reject) => {
      this.channel!.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          this.isConnected = true;
          resolve();
        } else if (status === "CHANNEL_ERROR") {
          const error = new Error("Failed to subscribe to workspace channel");
          if (this.handlers.onError) {
            this.handlers.onError(error);
          }
          reject(error);
        }
      });
    });

    // Track presence after subscription
    await this.trackPresence("online");
  }

  // Track presence state
  async trackPresence(status: PresenceStatus = "online", isTyping: boolean = false, typingInConversation: string | null = null): Promise<void> {
    if (!this.channel || !this.currentUser) {
      return;
    }

    const presencePayload: RealtimePresencePayload = {
      user_id: this.currentUser.id,
      user_name: this.currentUser.name,
      avatar_url: this.currentUser.avatar_url,
      status,
      last_active: new Date().toISOString(),
      is_typing: isTyping,
      typing_in_conversation: typingInConversation,
    };

    await this.channel.track(presencePayload);
  }

  // Update presence status
  async updateStatus(status: PresenceStatus): Promise<void> {
    await this.trackPresence(status);
  }

  // Broadcast typing indicator
  async broadcastTyping(conversationKey: string, isTyping: boolean): Promise<void> {
    if (!this.channel || !this.currentUser) {
      return;
    }

    // Update presence with typing status
    await this.trackPresence("online", isTyping, isTyping ? conversationKey : null);

    // Also broadcast typing event for immediate updates
    await this.channel.send({
      type: "broadcast",
      event: "typing",
      payload: {
        user_id: this.currentUser.id,
        user_name: this.currentUser.name,
        conversation_key: conversationKey,
        is_typing: isTyping,
      } as TypingPayload,
    });
  }

  // Broadcast task update
  async broadcastTaskUpdate(type: TaskUpdatePayload["type"], taskId: string, data?: Record<string, unknown>): Promise<void> {
    if (!this.channel || !this.currentUser) {
      return;
    }

    await this.channel.send({
      type: "broadcast",
      event: "task_update",
      payload: {
        type,
        task_id: taskId,
        user_id: this.currentUser.id,
        user_name: this.currentUser.name,
        data,
      } as TaskUpdatePayload,
    });
  }

  // Get current presence state
  getPresenceState(): RealtimePresenceState<RealtimePresencePayload> | null {
    if (!this.channel) {
      return null;
    }
    return this.channel.presenceState<RealtimePresencePayload>();
  }

  // Disconnect from the channel
  async disconnect(): Promise<void> {
    if (!this.channel) {
      return;
    }

    // Untrack presence before leaving
    await this.channel.untrack();

    // Remove the channel
    await this.supabase.removeChannel(this.channel);

    this.channel = null;
    this.isConnected = false;
  }

  // Check if connected
  get connected(): boolean {
    return this.isConnected;
  }

  // Get channel name
  get channelName(): string {
    return `workspace:${this.workspaceId}`;
  }
}

// Singleton map for workspace channels
const workspaceChannels = new Map<string, WorkspaceChannel>();

// Get or create a workspace channel
export function getWorkspaceChannel(workspaceId: string): WorkspaceChannel {
  let channel = workspaceChannels.get(workspaceId);
  if (!channel) {
    channel = new WorkspaceChannel(workspaceId);
    workspaceChannels.set(workspaceId, channel);
  }
  return channel;
}

// Remove a workspace channel
export async function removeWorkspaceChannel(workspaceId: string): Promise<void> {
  const channel = workspaceChannels.get(workspaceId);
  if (channel) {
    await channel.disconnect();
    workspaceChannels.delete(workspaceId);
  }
}

// Cleanup all channels
export async function cleanupAllChannels(): Promise<void> {
  const promises = Array.from(workspaceChannels.values()).map((channel) =>
    channel.disconnect()
  );
  await Promise.all(promises);
  workspaceChannels.clear();
}
