"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { useAgentStore } from "@/lib/stores/agent-store";
import type {
  AgentType,
  AgentMessage,
  ChatRequest,
  ChatResponse,
  ExecuteTaskRequest,
  ExecuteTaskResponse,
  OrchestrateRequest,
  OrchestrateResponse,
  SuggestedAction,
} from "@scholaros/shared";

// =============================================================================
// API Functions
// =============================================================================

async function fetchAgents(): Promise<AgentInfo[]> {
  const response = await fetch("/api/agents");
  if (!response.ok) {
    throw new Error("Failed to fetch agents");
  }
  return response.json();
}

async function fetchAgentInfo(agentType: string): Promise<AgentInfo> {
  const response = await fetch(`/api/agents/${agentType}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch agent: ${agentType}`);
  }
  return response.json();
}

async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  const response = await fetch("/api/agents/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to send message");
  }
  return response.json();
}

async function executeAgentTask(
  request: ExecuteTaskRequest
): Promise<ExecuteTaskResponse> {
  const response = await fetch("/api/agents/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to execute task");
  }
  return response.json();
}

async function orchestrateWorkflow(
  request: OrchestrateRequest
): Promise<OrchestrateResponse> {
  const response = await fetch("/api/agents/orchestrate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to orchestrate workflow");
  }
  return response.json();
}

async function submitFeedback(params: {
  sessionId: string;
  messageId: string;
  feedbackType: "thumbs_up" | "thumbs_down" | "correction" | "suggestion" | "rating";
  rating?: number;
  comment?: string;
  correction?: string;
}): Promise<{ status: string }> {
  const response = await fetch("/api/agents/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    throw new Error("Failed to submit feedback");
  }
  return response.json();
}

// =============================================================================
// Types
// =============================================================================

interface AgentInfo {
  type: string;
  name: string;
  description: string;
  capabilities: Array<{
    name: string;
    description: string;
  }>;
  tools: Array<{
    name: string;
    description: string;
  }>;
}

interface UseAgentChatOptions {
  sessionId?: string;
  agentType?: AgentType;
  context?: Record<string, unknown>;
  onMessage?: (message: AgentMessage) => void;
  onError?: (error: Error) => void;
  onSuggestedActions?: (actions: SuggestedAction[]) => void;
}

interface UseAgentChatReturn {
  messages: AgentMessage[];
  isLoading: boolean;
  error: Error | null;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  suggestedActions: SuggestedAction[];
}

// =============================================================================
// Query Keys
// =============================================================================

export const agentKeys = {
  all: ["agents"] as const,
  list: () => [...agentKeys.all, "list"] as const,
  detail: (type: string) => [...agentKeys.all, "detail", type] as const,
  workflows: () => [...agentKeys.all, "workflows"] as const,
};

// =============================================================================
// Hooks
// =============================================================================

/**
 * Fetch list of available agents
 */
export function useAgents() {
  return useQuery({
    queryKey: agentKeys.list(),
    queryFn: fetchAgents,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch detailed info about a specific agent
 */
export function useAgentInfo(agentType: string) {
  return useQuery({
    queryKey: agentKeys.detail(agentType),
    queryFn: () => fetchAgentInfo(agentType),
    enabled: !!agentType,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Interactive chat with agents
 */
export function useAgentChat(options: UseAgentChatOptions = {}): UseAgentChatReturn {
  const {
    sessionId,
    agentType,
    context = {},
    onMessage,
    onError,
    onSuggestedActions,
  } = options;

  const store = useAgentStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const messageIdCounter = useRef(0);

  const sendMessage = useCallback(
    async (content: string) => {
      setIsLoading(true);
      setError(null);

      // Add user message to store
      const userMessage: AgentMessage = {
        id: `msg-${++messageIdCounter.current}`,
        sessionId: sessionId || "default",
        role: "user",
        content,
        createdAt: new Date(),
      };
      store.addMessage(userMessage);

      try {
        const request: ChatRequest = {
          sessionId,
          message: content,
          context,
          agentType,
          stream: false,
        };

        const response = await sendChatMessage(request);

        // Add assistant message to store
        const assistantMessage: AgentMessage = {
          id: response.messageId,
          sessionId: response.sessionId,
          role: "assistant",
          agentType: response.agentType,
          content: response.content,
          toolCalls: response.toolCalls,
          metadata: response.metadata,
          createdAt: new Date(),
        };
        store.addMessage(assistantMessage);

        // Update session
        store.setSession({
          id: response.sessionId,
          workspaceId: "default",
          userId: "default",
          sessionType: "chat",
          status: "idle",
          context: {
            messageCount: store.messages.length + 2,
            lastActivityAt: new Date().toISOString(),
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Handle suggested actions
        if (response.suggestedActions?.length) {
          store.setSuggestedActions(response.suggestedActions);
          onSuggestedActions?.(response.suggestedActions);
        }

        onMessage?.(assistantMessage);
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        setError(error);
        onError?.(error);

        // Add error message
        store.addMessage({
          id: `msg-error-${++messageIdCounter.current}`,
          sessionId: sessionId || "default",
          role: "system",
          content: `Error: ${error.message}`,
          createdAt: new Date(),
        });
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, agentType, context, store, onMessage, onError, onSuggestedActions]
  );

  const clearMessages = useCallback(() => {
    store.clearMessages();
    store.clearSession();
  }, [store]);

  return {
    messages: store.messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    suggestedActions: store.suggestedActions,
  };
}

/**
 * Execute a specific agent task
 */
export function useAgentTask() {
  const store = useAgentStore();

  return useMutation({
    mutationFn: executeAgentTask,
    onMutate: (request) => {
      // Add to pending tasks
      store.addPendingTask({
        id: `task-${Date.now()}`,
        workspaceId: "default",
        userId: "default",
        agentType: request.agentType,
        taskType: request.taskType,
        status: "pending",
        input: request.input,
        progress: 0,
        createdAt: new Date(),
      });
    },
    onSuccess: (response) => {
      if (response.status === "completed") {
        store.completeTask(response.taskId, response.result);
      } else if (response.status === "failed") {
        store.failTask(response.taskId, response.error || "Unknown error");
      }
    },
    onError: (error) => {
      // Mark task as failed
      console.error("Task execution failed:", error);
    },
  });
}

/**
 * Execute a multi-agent workflow
 */
export function useAgentWorkflow() {
  return useMutation({
    mutationFn: orchestrateWorkflow,
  });
}

/**
 * Submit feedback on an agent response
 */
export function useAgentFeedback() {
  return useMutation({
    mutationFn: submitFeedback,
  });
}

/**
 * Convenience hook for common agent actions
 */
export function useAgentActions() {
  const store = useAgentStore();
  const taskMutation = useAgentTask();
  const workflowMutation = useAgentWorkflow();
  const feedbackMutation = useAgentFeedback();

  return {
    // UI actions
    openChat: store.openChat,
    closeChat: store.closeChat,
    toggleChat: store.toggleChat,
    selectAgent: store.selectAgent,

    // Task actions
    executeTask: taskMutation.mutateAsync,
    isExecutingTask: taskMutation.isPending,

    // Workflow actions
    runWorkflow: workflowMutation.mutateAsync,
    isRunningWorkflow: workflowMutation.isPending,

    // Feedback
    submitFeedback: feedbackMutation.mutateAsync,

    // State
    isOpen: store.isOpen,
    selectedAgent: store.selectedAgent,
    suggestedActions: store.suggestedActions,
  };
}

/**
 * Hook for extracting tasks from text (common operation)
 */
export function useExtractTasksAgent() {
  const taskMutation = useAgentTask();

  const extractTasks = useCallback(
    async (text: string, context?: string) => {
      return taskMutation.mutateAsync({
        agentType: "task",
        taskType: "extract_tasks",
        input: { text, context },
      });
    },
    [taskMutation]
  );

  return {
    extractTasks,
    isExtracting: taskMutation.isPending,
    error: taskMutation.error,
    result: taskMutation.data,
  };
}

/**
 * Hook for summarizing projects (common operation)
 */
export function useSummarizeProjectAgent() {
  const taskMutation = useAgentTask();

  const summarizeProject = useCallback(
    async (projectId: string) => {
      return taskMutation.mutateAsync({
        agentType: "project",
        taskType: "summarize_project",
        input: { projectId },
      });
    },
    [taskMutation]
  );

  return {
    summarizeProject,
    isSummarizing: taskMutation.isPending,
    error: taskMutation.error,
    result: taskMutation.data,
  };
}

/**
 * Hook for grant fit analysis (common operation)
 */
export function useGrantFitAgent() {
  const taskMutation = useAgentTask();

  const analyzeFit = useCallback(
    async (opportunityId: string, profile?: Record<string, unknown>) => {
      return taskMutation.mutateAsync({
        agentType: "grant",
        taskType: "analyze_fit",
        input: { opportunityId, profile },
      });
    },
    [taskMutation]
  );

  return {
    analyzeFit,
    isAnalyzing: taskMutation.isPending,
    error: taskMutation.error,
    result: taskMutation.data,
  };
}
