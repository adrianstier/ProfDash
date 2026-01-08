// Chat and messaging types for ScholarOS
// Adapted from shared-todo-list patterns

// Reaction types (tapback-style)
export type MessageReactionType =
  | "heart"
  | "thumbsup"
  | "thumbsdown"
  | "haha"
  | "exclamation"
  | "question";

export const REACTION_EMOJIS: Record<MessageReactionType, string> = {
  heart: "❤️",
  thumbsup: "👍",
  thumbsdown: "👎",
  haha: "😂",
  exclamation: "❗",
  question: "❓",
};

// Presence status
export type PresenceStatus = "online" | "away" | "dnd" | "offline";

export const PRESENCE_CONFIG: Record<
  PresenceStatus,
  { color: string; label: string; dotColor: string }
> = {
  online: { color: "text-green-500", label: "Online", dotColor: "bg-green-500" },
  away: { color: "text-yellow-500", label: "Away", dotColor: "bg-yellow-500" },
  dnd: { color: "text-red-500", label: "Do Not Disturb", dotColor: "bg-red-500" },
  offline: { color: "text-gray-400", label: "Offline", dotColor: "bg-gray-400" },
};

// Message reaction from a user
export interface MessageReaction {
  user_id: string;
  reaction: MessageReactionType;
  created_at: string;
}

// Chat message interface
export interface ChatMessage {
  id: string;
  workspace_id: string;
  user_id: string;
  text: string;
  recipient_id: string | null; // null = workspace chat, user_id = DM
  related_task_id: string | null;
  related_project_id: string | null;
  reply_to_id: string | null;
  reply_to_preview: string | null;
  reply_to_user_id: string | null;
  reactions: MessageReaction[];
  read_by: string[];
  mentions: string[];
  edited_at: string | null;
  deleted_at: string | null;
  is_pinned: boolean;
  pinned_by: string | null;
  pinned_at: string | null;
  created_at: string;
  updated_at: string;
}

// Message with user profile info (for display)
export interface ChatMessageWithUser extends ChatMessage {
  user?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  reply_to_user?: {
    id: string;
    full_name: string | null;
  } | null;
}

// Create message payload
export interface CreateMessage {
  workspace_id: string;
  text: string;
  recipient_id?: string | null;
  related_task_id?: string | null;
  related_project_id?: string | null;
  reply_to_id?: string | null;
  mentions?: string[];
}

// Update message payload
export interface UpdateMessage {
  text?: string;
  is_pinned?: boolean;
}

// Conversation type for UI
export type ConversationType = "workspace" | "dm";

export interface Conversation {
  type: ConversationType;
  recipient_id?: string; // Only for DMs
  recipient?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  last_message?: ChatMessage;
  unread_count: number;
}

// User presence
export interface UserPresence {
  id: string;
  user_id: string;
  workspace_id: string;
  status: PresenceStatus;
  is_typing: boolean;
  typing_in_conversation: string | null; // 'workspace' or recipient user_id
  last_seen: string;
  last_active: string;
  custom_status: string | null;
}

export interface UserPresenceWithProfile extends UserPresence {
  user?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

// Activity types
export type ActivityAction =
  // Task actions
  | "task_created"
  | "task_updated"
  | "task_deleted"
  | "task_completed"
  | "task_reopened"
  | "task_assigned"
  | "task_priority_changed"
  | "task_due_date_changed"
  | "task_status_changed"
  | "subtask_added"
  | "subtask_completed"
  | "subtask_deleted"
  | "notes_updated"
  // Project actions
  | "project_created"
  | "project_updated"
  | "project_stage_changed"
  | "project_milestone_completed"
  // Chat actions
  | "message_sent"
  | "message_pinned"
  // AI actions
  | "ai_tasks_extracted"
  | "ai_task_enhanced"
  | "ai_task_breakdown";

export const ACTIVITY_ACTION_CONFIG: Record<
  ActivityAction,
  { label: string; icon: string; color: string }
> = {
  task_created: { label: "created a task", icon: "Plus", color: "text-green-500" },
  task_updated: { label: "updated a task", icon: "Pencil", color: "text-blue-500" },
  task_deleted: { label: "deleted a task", icon: "Trash2", color: "text-red-500" },
  task_completed: { label: "completed a task", icon: "CheckCircle", color: "text-green-500" },
  task_reopened: { label: "reopened a task", icon: "RotateCcw", color: "text-yellow-500" },
  task_assigned: { label: "assigned a task", icon: "UserPlus", color: "text-blue-500" },
  task_priority_changed: { label: "changed priority", icon: "Flag", color: "text-orange-500" },
  task_due_date_changed: { label: "changed due date", icon: "Calendar", color: "text-purple-500" },
  task_status_changed: { label: "changed status", icon: "ArrowRight", color: "text-blue-500" },
  subtask_added: { label: "added a subtask", icon: "ListPlus", color: "text-green-500" },
  subtask_completed: { label: "completed a subtask", icon: "CheckSquare", color: "text-green-500" },
  subtask_deleted: { label: "removed a subtask", icon: "ListMinus", color: "text-red-500" },
  notes_updated: { label: "updated notes", icon: "FileText", color: "text-gray-500" },
  project_created: { label: "created a project", icon: "FolderPlus", color: "text-green-500" },
  project_updated: { label: "updated a project", icon: "Folder", color: "text-blue-500" },
  project_stage_changed: { label: "moved project stage", icon: "ArrowRight", color: "text-purple-500" },
  project_milestone_completed: { label: "completed a milestone", icon: "Flag", color: "text-green-500" },
  message_sent: { label: "sent a message", icon: "MessageSquare", color: "text-blue-500" },
  message_pinned: { label: "pinned a message", icon: "Pin", color: "text-yellow-500" },
  ai_tasks_extracted: { label: "extracted tasks with AI", icon: "Sparkles", color: "text-purple-500" },
  ai_task_enhanced: { label: "enhanced a task with AI", icon: "Wand2", color: "text-purple-500" },
  ai_task_breakdown: { label: "broke down a task with AI", icon: "ListTree", color: "text-purple-500" },
};

// Activity log entry
export interface ActivityEntry {
  id: string;
  workspace_id: string;
  user_id: string;
  action: ActivityAction;
  task_id: string | null;
  project_id: string | null;
  message_id: string | null;
  entity_title: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface ActivityEntryWithUser extends ActivityEntry {
  user?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

// AI Smart Parse types
export interface SmartParseSubtask {
  text: string;
  priority: "p1" | "p2" | "p3" | "p4";
  estimated_minutes?: number;
}

export interface SmartParseResult {
  main_task: {
    title: string;
    description?: string;
    category?: string;
    priority: "p1" | "p2" | "p3" | "p4";
    due_date?: string;
    assigned_to?: string;
    project_id?: string;
  };
  subtasks: SmartParseSubtask[];
  summary: string;
  was_complex: boolean;
  confidence: number;
}

// Notification settings
export interface ChatNotificationSettings {
  enabled: boolean;
  sound_enabled: boolean;
  browser_notifications_enabled: boolean;
  notify_on_mention: boolean;
  notify_on_dm: boolean;
  muted_conversations: string[]; // 'workspace' or user_ids
}

export const DEFAULT_CHAT_NOTIFICATION_SETTINGS: ChatNotificationSettings = {
  enabled: true,
  sound_enabled: true,
  browser_notifications_enabled: false,
  notify_on_mention: true,
  notify_on_dm: true,
  muted_conversations: [],
};

// Emoji picker categories (for chat input)
export const EMOJI_CATEGORIES = {
  recent: ["😀", "😂", "❤️", "👍", "🎉", "🔥", "✨", "🚀"],
  smileys: ["😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂", "😉", "😌"],
  gestures: ["👍", "👎", "👏", "🙌", "🤝", "🙏", "💪", "✌️", "🤞", "🤙", "👋", "✋"],
  symbols: ["❤️", "🧡", "💛", "💚", "💙", "💜", "💯", "✨", "🔥", "⭐", "💫", "🎉"],
  academic: ["📚", "📖", "📝", "✏️", "🎓", "🔬", "🧪", "🔭", "💡", "📊", "📈", "🏆"],
} as const;

export type EmojiCategory = keyof typeof EMOJI_CATEGORIES;
