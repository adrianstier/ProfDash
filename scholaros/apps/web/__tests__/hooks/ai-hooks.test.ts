import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// ---------------------------------------------------------------------------
// Global fetch mock
// ---------------------------------------------------------------------------
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { wrapper, queryClient };
}

function okResponse(data: unknown) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(data),
  } as Response);
}

function errorResponse(status: number, body: { error: string }) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

// ---------------------------------------------------------------------------
// Imports under test
// ---------------------------------------------------------------------------
import {
  useExtractTasks,
  useProjectSummary,
  useGrantFitScore,
  useTaskBreakdown,
  useTaskEnhancement,
  useEmailGeneration,
  useContentParsing,
} from "@/lib/hooks/use-ai";

import {
  agentKeys,
  useAgents,
  useAgentInfo,
  useAgentTask,
  useAgentWorkflow,
  useAgentFeedback,
} from "@/lib/hooks/use-agents";

import {
  useSmartParse,
  formatParsedTask,
  parsedResultToTask,
} from "@/lib/hooks/use-smart-parse";

import {
  chatKeys,
  useSendMessage,
  useEditMessage,
  useDeleteMessage,
  useAddReaction,
  useMarkAsRead,
  useMarkMultipleAsRead,
  usePinMessage,
} from "@/lib/hooks/use-chat";

// ---------------------------------------------------------------------------
beforeEach(() => {
  mockFetch.mockReset();
});

// ===========================================================================
// 1. use-ai
// ===========================================================================
describe("use-ai", () => {
  describe("useExtractTasks", () => {
    it("sends POST to /api/ai/extract-tasks", async () => {
      const response = { tasks: [], source_summary: "None found" };
      mockFetch.mockReturnValueOnce(okResponse(response));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useExtractTasks(), { wrapper });

      await act(async () => {
        result.current.mutate({ text: "Review paper by Friday" });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/ai/extract-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });

    it("throws on error", async () => {
      mockFetch.mockReturnValueOnce(
        errorResponse(500, { error: "AI service down" })
      );
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useExtractTasks(), { wrapper });

      await act(async () => {
        result.current.mutate({ text: "test" });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe("AI service down");
    });
  });

  describe("useProjectSummary", () => {
    it("sends POST to /api/ai/project-summary", async () => {
      const response = {
        status_summary: "Good",
        accomplishments: [],
        blockers: [],
        next_actions: [],
        health_score: 80,
      };
      mockFetch.mockReturnValueOnce(okResponse(response));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useProjectSummary(), { wrapper });

      await act(async () => {
        result.current.mutate({
          project: {
            title: "Test",
            type: "general",
            status: "active",
          },
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/ai/project-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });

  describe("useGrantFitScore", () => {
    it("sends POST to /api/ai/fit-score", async () => {
      const response = { score: 75, reasons: [], gaps: [], suggestions: [], summary: "" };
      mockFetch.mockReturnValueOnce(okResponse(response));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useGrantFitScore(), { wrapper });

      await act(async () => {
        result.current.mutate({
          opportunity: { title: "NSF Grant" },
          profile: { keywords: ["biology"] },
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/ai/fit-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });

  describe("useTaskBreakdown", () => {
    it("sends POST to /api/ai/breakdown-task", async () => {
      mockFetch.mockReturnValueOnce(
        okResponse({
          success: true,
          result: {
            original_task: "Test",
            subtasks: [],
            approach_summary: "",
            prerequisites: [],
            complexity_rating: "low",
            tips: [],
          },
        })
      );

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useTaskBreakdown(), { wrapper });

      await act(async () => {
        result.current.mutate({
          task_title: "Write paper",
          workspace_id: "ws-1",
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/ai/breakdown-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });

    it("handles success: false response", async () => {
      mockFetch.mockReturnValueOnce(
        okResponse({ success: false, error: "Could not breakdown" })
      );

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useTaskBreakdown(), { wrapper });

      await act(async () => {
        result.current.mutate({ task_title: "X", workspace_id: "ws-1" });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe("Could not breakdown");
    });
  });

  describe("useTaskEnhancement", () => {
    it("sends POST to /api/ai/enhance-task", async () => {
      mockFetch.mockReturnValueOnce(
        okResponse({
          success: true,
          result: {
            enhanced_title: "Better Title",
            improvements_made: ["clarity"],
            confidence: 0.9,
          },
        })
      );

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useTaskEnhancement(), { wrapper });

      await act(async () => {
        result.current.mutate({
          task_title: "do thing",
          workspace_id: "ws-1",
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe("useEmailGeneration", () => {
    it("sends POST to /api/ai/generate-email", async () => {
      mockFetch.mockReturnValueOnce(
        okResponse({
          success: true,
          result: {
            subject: "Update",
            body: "Dear...",
            tone_applied: "formal",
            key_points: [],
          },
        })
      );

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useEmailGeneration(), { wrapper });

      await act(async () => {
        result.current.mutate({
          workspace_id: "ws-1",
          email_type: "progress_report",
          subject_context: "Q1 report",
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe("useContentParsing", () => {
    it("sends POST to /api/ai/parse-content", async () => {
      mockFetch.mockReturnValueOnce(
        okResponse({
          success: true,
          result: {
            items: [],
            summary: "",
            content_type_detected: "general",
            key_themes: [],
            people_mentioned: [],
            dates_mentioned: [],
            action_item_count: 0,
          },
        })
      );

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useContentParsing(), { wrapper });

      await act(async () => {
        result.current.mutate({
          content: "Meeting notes...",
          workspace_id: "ws-1",
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });
});

// ===========================================================================
// 2. use-agents
// ===========================================================================
describe("use-agents", () => {
  describe("agentKeys", () => {
    it("all key is ['agents']", () => {
      expect(agentKeys.all).toEqual(["agents"]);
    });

    it("list key appends 'list'", () => {
      expect(agentKeys.list()).toEqual(["agents", "list"]);
    });

    it("detail key includes type", () => {
      expect(agentKeys.detail("task")).toEqual(["agents", "detail", "task"]);
    });

    it("workflows key appends 'workflows'", () => {
      expect(agentKeys.workflows()).toEqual(["agents", "workflows"]);
    });
  });

  describe("useAgents", () => {
    it("fetches list of agents", async () => {
      const agents = [{ type: "task", name: "Task Agent" }];
      mockFetch.mockReturnValueOnce(okResponse(agents));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useAgents(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(agents);
      expect(mockFetch).toHaveBeenCalledWith("/api/agents");
    });
  });

  describe("useAgentInfo", () => {
    it("is disabled when agentType is empty", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useAgentInfo(""), { wrapper });
      expect(result.current.fetchStatus).toBe("idle");
    });

    it("fetches agent info", async () => {
      const info = { type: "task", name: "Task Agent", capabilities: [], tools: [] };
      mockFetch.mockReturnValueOnce(okResponse(info));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useAgentInfo("task"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/agents/task");
    });
  });

  describe("useAgentTask", () => {
    it("sends POST to /api/agents/execute", async () => {
      const response = { taskId: "task-1", status: "completed", result: {} };
      mockFetch.mockReturnValueOnce(okResponse(response));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useAgentTask(), { wrapper });

      await act(async () => {
        result.current.mutate({
          agentType: "task",
          taskType: "extract_tasks",
          input: { text: "test" },
        } as any);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/agents/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });

  describe("useAgentWorkflow", () => {
    it("sends POST to /api/agents/orchestrate", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ status: "completed" }));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useAgentWorkflow(), { wrapper });

      await act(async () => {
        result.current.mutate({ workflow: "test" } as any);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/agents/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });

  describe("useAgentFeedback", () => {
    it("sends POST to /api/agents/feedback", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ status: "ok" }));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useAgentFeedback(), { wrapper });

      await act(async () => {
        result.current.mutate({
          sessionId: "s1",
          messageId: "m1",
          feedbackType: "thumbs_up",
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/agents/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });
});

// ===========================================================================
// 3. use-smart-parse
// ===========================================================================
describe("use-smart-parse", () => {
  describe("useSmartParse", () => {
    it("sends POST to /api/ai/smart-parse", async () => {
      mockFetch.mockReturnValueOnce(
        okResponse({
          success: true,
          result: {
            main_task: { title: "Review paper", priority: "p2" },
            subtasks: [],
            summary: "Review task",
          },
        })
      );

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useSmartParse(), { wrapper });

      await act(async () => {
        result.current.mutate({ text: "Review paper", workspaceId: "ws-1" });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/ai/smart-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });

    it("throws on error response", async () => {
      mockFetch.mockReturnValueOnce(
        errorResponse(500, { error: "Parse failed" })
      );

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useSmartParse(), { wrapper });

      await act(async () => {
        result.current.mutate({ text: "test", workspaceId: "ws-1" });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe("Parse failed");
    });

    it("throws when success is false", async () => {
      mockFetch.mockReturnValueOnce(
        okResponse({ success: false, error: "Cannot parse" })
      );

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useSmartParse(), { wrapper });

      await act(async () => {
        result.current.mutate({ text: "test", workspaceId: "ws-1" });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe("Cannot parse");
    });
  });

  describe("formatParsedTask", () => {
    it("formats a simple task", () => {
      const result = formatParsedTask({
        main_task: { title: "Test Task", priority: "p2" },
        subtasks: [],
        summary: null,
      } as any);

      expect(result).toContain("**Test Task**");
    });

    it("includes description when present", () => {
      const result = formatParsedTask({
        main_task: { title: "Test", description: "Some details", priority: "p2" },
        subtasks: [],
        summary: null,
      } as any);

      expect(result).toContain("Some details");
    });

    it("includes subtasks when present", () => {
      const result = formatParsedTask({
        main_task: { title: "Main", priority: "p2" },
        subtasks: [
          { text: "Sub 1", priority: "p3" },
          { text: "Sub 2", priority: "p3" },
        ],
        summary: null,
      } as any);

      expect(result).toContain("Subtasks:");
      expect(result).toContain("1. Sub 1");
      expect(result).toContain("2. Sub 2");
    });

    it("includes summary when present", () => {
      const result = formatParsedTask({
        main_task: { title: "Test", priority: "p2" },
        subtasks: [],
        summary: "A summary",
      } as any);

      expect(result).toContain("_A summary_");
    });
  });

  describe("parsedResultToTask", () => {
    it("converts parsed result to task payload", () => {
      const task = parsedResultToTask(
        {
          main_task: {
            title: "Review paper",
            description: "Peer review",
            category: "research",
            priority: "p1",
            due_date: "2025-02-15",
          },
          subtasks: [],
          summary: "",
        } as any,
        "ws-1"
      );

      expect(task.title).toBe("Review paper");
      expect(task.description).toBe("Peer review");
      expect(task.category).toBe("research");
      expect(task.priority).toBe("p1");
      expect(task.due).toBe("2025-02-15");
      expect(task.workspace_id).toBe("ws-1");
    });

    it("defaults category to misc when not provided", () => {
      const task = parsedResultToTask(
        {
          main_task: { title: "Test", priority: "p3" },
          subtasks: [],
          summary: "",
        } as any,
        "ws-1"
      );

      expect(task.category).toBe("misc");
    });
  });
});

// ===========================================================================
// 4. use-chat
// ===========================================================================
describe("use-chat", () => {
  describe("chatKeys", () => {
    it("all key is ['chat']", () => {
      expect(chatKeys.all).toEqual(["chat"]);
    });

    it("messages key includes workspaceId", () => {
      expect(chatKeys.messages("ws-1")).toEqual(["chat", "messages", "ws-1"]);
    });

    it("conversation key includes recipientId", () => {
      expect(chatKeys.conversation("ws-1", "u1")).toEqual([
        "chat",
        "messages",
        "ws-1",
        "u1",
      ]);
    });

    it("conversation key uses 'workspace' for null recipientId", () => {
      expect(chatKeys.conversation("ws-1", null)).toEqual([
        "chat",
        "messages",
        "ws-1",
        "workspace",
      ]);
    });

    it("pinnedMessages key extends conversation key", () => {
      expect(chatKeys.pinnedMessages("ws-1", "u1")).toEqual([
        "chat",
        "messages",
        "ws-1",
        "u1",
        "pinned",
      ]);
    });

    it("presence key includes workspaceId", () => {
      expect(chatKeys.presence("ws-1")).toEqual(["chat", "presence", "ws-1"]);
    });

    it("activity key includes workspaceId", () => {
      expect(chatKeys.activity("ws-1")).toEqual(["chat", "activity", "ws-1"]);
    });
  });

  describe("useSendMessage", () => {
    it("sends POST to /api/messages", async () => {
      const message = { id: "m1", workspace_id: "ws-1", recipient_id: null };
      mockFetch.mockReturnValueOnce(okResponse(message));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useSendMessage(), { wrapper });

      await act(async () => {
        result.current.mutate({
          workspace_id: "ws-1",
          content: "Hello",
        } as any);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });

  describe("useEditMessage", () => {
    it("sends PATCH to /api/messages/:id", async () => {
      const updated = { id: "m1", workspace_id: "ws-1", recipient_id: null };
      mockFetch.mockReturnValueOnce(okResponse(updated));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useEditMessage(), { wrapper });

      await act(async () => {
        result.current.mutate({
          id: "m1",
          data: { content: "Edited" } as any,
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/messages/m1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });

  describe("useDeleteMessage", () => {
    it("sends DELETE to /api/messages/:id", async () => {
      mockFetch.mockReturnValueOnce(
        Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response)
      );

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDeleteMessage(), { wrapper });

      await act(async () => {
        result.current.mutate({
          id: "m1",
          workspaceId: "ws-1",
          recipientId: null,
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/messages/m1", {
        method: "DELETE",
      });
    });
  });

  describe("useAddReaction", () => {
    it("sends POST to /api/messages/:id/reactions", async () => {
      const updated = { id: "m1", workspace_id: "ws-1", recipient_id: null };
      mockFetch.mockReturnValueOnce(okResponse(updated));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useAddReaction(), { wrapper });

      await act(async () => {
        result.current.mutate({
          messageId: "m1",
          reaction: "thumbs_up" as any,
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/messages/m1/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });

  describe("useMarkAsRead", () => {
    it("sends POST to /api/messages/:id/read", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ success: true }));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useMarkAsRead(), { wrapper });

      await act(async () => {
        result.current.mutate("m1");
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/messages/m1/read", {
        method: "POST",
      });
    });
  });

  describe("useMarkMultipleAsRead", () => {
    it("sends PUT to /api/messages/read", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ success: true }));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useMarkMultipleAsRead(), { wrapper });

      await act(async () => {
        result.current.mutate(["m1", "m2"]);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/messages/read", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });

  describe("usePinMessage", () => {
    it("sends POST when pinning", async () => {
      const updated = { id: "m1", workspace_id: "ws-1", recipient_id: null };
      mockFetch.mockReturnValueOnce(okResponse(updated));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => usePinMessage(), { wrapper });

      await act(async () => {
        result.current.mutate({ messageId: "m1", pin: true });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/messages/m1/pin", {
        method: "POST",
      });
    });

    it("sends DELETE when unpinning", async () => {
      const updated = { id: "m1", workspace_id: "ws-1", recipient_id: null };
      mockFetch.mockReturnValueOnce(okResponse(updated));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => usePinMessage(), { wrapper });

      await act(async () => {
        result.current.mutate({ messageId: "m1", pin: false });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/messages/m1/pin", {
        method: "DELETE",
      });
    });
  });
});
