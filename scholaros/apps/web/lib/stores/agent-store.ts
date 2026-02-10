"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AgentType,
  AgentMessage,
  AgentSession,
  AgentTask,
  SuggestedAction,
} from "@scholaros/shared";

// =============================================================================
// Store Types
// =============================================================================

interface AgentContext {
  projectId?: string;
  projectTitle?: string;
  projectType?: string;
  projectStatus?: string;
  projectStage?: string | null;
  taskId?: string;
  grantId?: string;
  documentId?: string;
  [key: string]: unknown;
}

interface AgentState {
  // Current session
  currentSession: AgentSession | null;
  messages: AgentMessage[];
  isStreaming: boolean;

  // Task queue
  pendingTasks: AgentTask[];
  runningTasks: AgentTask[];
  completedTasks: AgentTask[];

  // UI state
  isOpen: boolean;
  selectedAgent: AgentType | null;
  suggestedActions: SuggestedAction[];

  // Context for agent conversations
  context: AgentContext;
  initialMessage: string | null;

  // Settings
  preferences: {
    defaultAgent: AgentType | null;
    streamResponses: boolean;
    showAgentIndicator: boolean;
  };
}

interface AgentActions {
  // Session management
  setSession: (session: AgentSession | null) => void;
  clearSession: () => void;

  // Messages
  addMessage: (message: AgentMessage) => void;
  updateMessage: (messageId: string, updates: Partial<AgentMessage>) => void;
  setMessages: (messages: AgentMessage[]) => void;
  clearMessages: () => void;

  // Streaming
  setStreaming: (isStreaming: boolean) => void;

  // Tasks
  addPendingTask: (task: AgentTask) => void;
  moveToRunning: (taskId: string) => void;
  completeTask: (taskId: string, result?: Record<string, unknown>) => void;
  failTask: (taskId: string, error: string) => void;
  clearTasks: () => void;

  // UI
  openChat: (initialMessage?: string) => void;
  closeChat: () => void;
  toggleChat: () => void;
  selectAgent: (agent: AgentType | null) => void;
  setSuggestedActions: (actions: SuggestedAction[]) => void;

  // Context
  setContext: (context: AgentContext) => void;
  clearContext: () => void;
  getInitialMessage: () => string | null;
  clearInitialMessage: () => void;

  // Settings
  updatePreferences: (preferences: Partial<AgentState["preferences"]>) => void;
}

type AgentStore = AgentState & AgentActions;

// =============================================================================
// Initial State
// =============================================================================

const initialState: AgentState = {
  currentSession: null,
  messages: [],
  isStreaming: false,
  pendingTasks: [],
  runningTasks: [],
  completedTasks: [],
  isOpen: false,
  selectedAgent: null,
  suggestedActions: [],
  context: {},
  initialMessage: null,
  preferences: {
    defaultAgent: null,
    streamResponses: true,
    showAgentIndicator: true,
  },
};

// =============================================================================
// Store Implementation
// =============================================================================

export const useAgentStore = create<AgentStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Session management
      setSession: (session) => set({ currentSession: session }),

      clearSession: () =>
        set({
          currentSession: null,
          messages: [],
          suggestedActions: [],
        }),

      // Messages (capped at 500 per session to prevent unbounded growth)
      addMessage: (message) =>
        set((state) => {
          const MAX_MESSAGES = 500;
          const updated = [...state.messages, message];
          return {
            messages:
              updated.length > MAX_MESSAGES
                ? updated.slice(updated.length - MAX_MESSAGES)
                : updated,
          };
        }),

      updateMessage: (messageId, updates) =>
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === messageId ? { ...msg, ...updates } : msg
          ),
        })),

      setMessages: (messages) => set({ messages }),

      clearMessages: () => set({ messages: [], suggestedActions: [] }),

      // Streaming
      setStreaming: (isStreaming) => set({ isStreaming }),

      // Tasks
      addPendingTask: (task) =>
        set((state) => ({
          pendingTasks: [...state.pendingTasks, task],
        })),

      moveToRunning: (taskId) =>
        set((state) => {
          const task = state.pendingTasks.find((t) => t.id === taskId);
          if (!task) return state;

          return {
            pendingTasks: state.pendingTasks.filter((t) => t.id !== taskId),
            runningTasks: [
              ...state.runningTasks,
              { ...task, status: "running" as const },
            ],
          };
        }),

      completeTask: (taskId, result) =>
        set((state) => {
          const task = state.runningTasks.find((t) => t.id === taskId);
          if (!task) return state;

          return {
            runningTasks: state.runningTasks.filter((t) => t.id !== taskId),
            completedTasks: [
              ...state.completedTasks,
              {
                ...task,
                status: "completed" as const,
                output: result,
                completedAt: new Date(),
              },
            ],
          };
        }),

      failTask: (taskId, error) =>
        set((state) => {
          const task = state.runningTasks.find((t) => t.id === taskId);
          if (!task) return state;

          return {
            runningTasks: state.runningTasks.filter((t) => t.id !== taskId),
            completedTasks: [
              ...state.completedTasks,
              {
                ...task,
                status: "failed" as const,
                error,
                completedAt: new Date(),
              },
            ],
          };
        }),

      clearTasks: () =>
        set({
          pendingTasks: [],
          runningTasks: [],
          completedTasks: [],
        }),

      // UI
      openChat: (initialMessage) => set({ isOpen: true, initialMessage: initialMessage || null }),
      closeChat: () => set({ isOpen: false }),
      toggleChat: () => set((state) => ({ isOpen: !state.isOpen })),
      selectAgent: (agent) => set({ selectedAgent: agent }),
      setSuggestedActions: (actions) => set({ suggestedActions: actions }),

      // Context
      setContext: (context) => set((state) => ({ context: { ...state.context, ...context } })),
      clearContext: () => set({ context: {} }),
      getInitialMessage: () => get().initialMessage,
      clearInitialMessage: () => set({ initialMessage: null }),

      // Settings
      updatePreferences: (preferences) =>
        set((state) => ({
          preferences: { ...state.preferences, ...preferences },
        })),
    }),
    {
      name: "scholaros-agent-store",
      partialize: (state) => ({
        preferences: state.preferences,
      }),
    }
  )
);

// =============================================================================
// Selectors
// =============================================================================

export const useAgentMessages = () => useAgentStore((state) => state.messages);
export const useAgentSession = () =>
  useAgentStore((state) => state.currentSession);
export const useIsStreaming = () => useAgentStore((state) => state.isStreaming);
export const useIsAgentOpen = () => useAgentStore((state) => state.isOpen);
export const useSelectedAgent = () =>
  useAgentStore((state) => state.selectedAgent);
export const useSuggestedActions = () =>
  useAgentStore((state) => state.suggestedActions);
export const useAgentPreferences = () =>
  useAgentStore((state) => state.preferences);
export const useAgentContext = () => useAgentStore((state) => state.context);
export const useInitialMessage = () =>
  useAgentStore((state) => state.initialMessage);
