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
// Helper: create a wrapper with a fresh QueryClient per test
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
  useTasks,
  useTasksWithPagination,
  useTodayTasks,
  useUpcomingTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useToggleTaskComplete,
  useCompleteRecurringTask,
  useBulkUpdateTasks,
  useBulkDeleteTasks,
} from "@/lib/hooks/use-tasks";

import {
  useTaskTemplates,
  useCreateTaskTemplate,
  useDeleteTaskTemplate,
} from "@/lib/hooks/use-task-templates";

// ---------------------------------------------------------------------------
beforeEach(() => {
  mockFetch.mockReset();
});

// ===========================================================================
// 1. use-tasks
// ===========================================================================
describe("use-tasks", () => {
  const mockTasksResponse = {
    data: [
      { id: "t1", title: "Task 1", status: "todo" },
      { id: "t2", title: "Task 2", status: "done" },
    ],
    pagination: {
      page: 1,
      limit: 20,
      total: 2,
      totalPages: 1,
      hasMore: false,
    },
  };

  // --- useTasks ---
  describe("useTasks", () => {
    it("fetches tasks with no filters", async () => {
      mockFetch.mockReturnValueOnce(okResponse(mockTasksResponse));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useTasks(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      // useTasks selects only .data
      expect(result.current.data).toEqual(mockTasksResponse.data);
    });

    it("fetches tasks with status filter", async () => {
      mockFetch.mockReturnValueOnce(okResponse(mockTasksResponse));
      const { wrapper } = createWrapper();
      renderHook(() => useTasks({ status: "todo" }), { wrapper });

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("status=todo");
    });

    it("fetches tasks with category filter", async () => {
      mockFetch.mockReturnValueOnce(okResponse(mockTasksResponse));
      const { wrapper } = createWrapper();
      renderHook(() => useTasks({ category: "research" }), { wrapper });

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("category=research");
    });

    it("fetches tasks with priority filter", async () => {
      mockFetch.mockReturnValueOnce(okResponse(mockTasksResponse));
      const { wrapper } = createWrapper();
      renderHook(() => useTasks({ priority: "p1" }), { wrapper });

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("priority=p1");
    });

    it("fetches tasks with workspace_id filter", async () => {
      mockFetch.mockReturnValueOnce(okResponse(mockTasksResponse));
      const { wrapper } = createWrapper();
      renderHook(() => useTasks({ workspace_id: "ws-1" }), { wrapper });

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("workspace_id=ws-1");
    });

    it("fetches tasks with pagination params", async () => {
      mockFetch.mockReturnValueOnce(okResponse(mockTasksResponse));
      const { wrapper } = createWrapper();
      renderHook(() => useTasks({ page: 2, limit: 10 }), { wrapper });

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("page=2");
      expect(url).toContain("limit=10");
    });

    it("throws on fetch error", async () => {
      mockFetch.mockReturnValueOnce(
        Promise.resolve({ ok: false, json: () => Promise.resolve({}) } as Response)
      );
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useTasks(), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe("Failed to fetch tasks");
    });
  });

  // --- useTasksWithPagination ---
  describe("useTasksWithPagination", () => {
    it("returns full pagination info", async () => {
      mockFetch.mockReturnValueOnce(okResponse(mockTasksResponse));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useTasksWithPagination(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      // Does not use select, returns full response
      expect(result.current.data).toEqual(mockTasksResponse);
    });
  });

  // --- useTodayTasks ---
  describe("useTodayTasks", () => {
    it("fetches with due=today filter", async () => {
      mockFetch.mockReturnValueOnce(okResponse(mockTasksResponse));
      const { wrapper } = createWrapper();
      renderHook(() => useTodayTasks(), { wrapper });

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("due=today");
    });
  });

  // --- useUpcomingTasks ---
  describe("useUpcomingTasks", () => {
    it("fetches with due=upcoming filter", async () => {
      mockFetch.mockReturnValueOnce(okResponse(mockTasksResponse));
      const { wrapper } = createWrapper();
      renderHook(() => useUpcomingTasks(), { wrapper });

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("due=upcoming");
    });
  });

  // --- useCreateTask ---
  describe("useCreateTask", () => {
    it("sends POST to /api/tasks", async () => {
      const newTask = { id: "t3", title: "New Task" };
      mockFetch.mockReturnValueOnce(okResponse(newTask));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useCreateTask(), { wrapper });

      await act(async () => {
        result.current.mutate({ title: "New Task" } as any);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });

    it("throws on error response", async () => {
      mockFetch.mockReturnValueOnce(
        errorResponse(400, { error: "Title is required" })
      );
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useCreateTask(), { wrapper });

      await act(async () => {
        result.current.mutate({ title: "" } as any);
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe("Title is required");
    });
  });

  // --- useUpdateTask ---
  describe("useUpdateTask", () => {
    it("sends PATCH to /api/tasks/:id", async () => {
      const updated = { id: "t1", title: "Updated" };
      mockFetch.mockReturnValueOnce(okResponse(updated));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useUpdateTask(), { wrapper });

      await act(async () => {
        result.current.mutate({ id: "t1", title: "Updated" });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/tasks/t1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });

  // --- useDeleteTask ---
  describe("useDeleteTask", () => {
    it("sends DELETE to /api/tasks/:id", async () => {
      mockFetch.mockReturnValueOnce(
        Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response)
      );

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDeleteTask(), { wrapper });

      await act(async () => {
        result.current.mutate("t1");
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/tasks/t1", {
        method: "DELETE",
      });
    });

    it("throws on error response", async () => {
      mockFetch.mockReturnValueOnce(
        errorResponse(404, { error: "Task not found" })
      );
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDeleteTask(), { wrapper });

      await act(async () => {
        result.current.mutate("nonexistent");
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe("Task not found");
    });
  });

  // --- useToggleTaskComplete ---
  describe("useToggleTaskComplete", () => {
    it("toggles a todo task to done", async () => {
      const updated = { id: "t1", status: "done" };
      mockFetch.mockReturnValueOnce(okResponse(updated));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useToggleTaskComplete(), { wrapper });

      await act(async () => {
        result.current.mutate({
          id: "t1",
          status: "todo",
          title: "Test",
        } as any);
      });

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      const body = JSON.parse(mockFetch.mock.calls[0][1]?.body);
      expect(body.status).toBe("done");
    });

    it("toggles a done task to todo", async () => {
      const updated = { id: "t1", status: "todo" };
      mockFetch.mockReturnValueOnce(okResponse(updated));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useToggleTaskComplete(), { wrapper });

      await act(async () => {
        result.current.mutate({
          id: "t1",
          status: "done",
          title: "Test",
        } as any);
      });

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      const body = JSON.parse(mockFetch.mock.calls[0][1]?.body);
      expect(body.status).toBe("todo");
    });
  });

  // --- useCompleteRecurringTask ---
  describe("useCompleteRecurringTask", () => {
    it("sends POST to /api/tasks/:id/complete-recurring", async () => {
      const response = {
        completed: { id: "t1", status: "done" },
        nextOccurrence: { id: "t2", status: "todo" },
        message: "Task completed",
      };
      mockFetch.mockReturnValueOnce(okResponse(response));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useCompleteRecurringTask(), {
        wrapper,
      });

      await act(async () => {
        result.current.mutate({ id: "t1" });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/tasks/t1/complete-recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });

    it("supports stopRecurrence option", async () => {
      mockFetch.mockReturnValueOnce(
        okResponse({ completed: {}, nextOccurrence: null, message: "Stopped" })
      );

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useCompleteRecurringTask(), {
        wrapper,
      });

      await act(async () => {
        result.current.mutate({ id: "t1", options: { stopRecurrence: true } });
      });

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      const body = JSON.parse(mockFetch.mock.calls[0][1]?.body);
      expect(body.stopRecurrence).toBe(true);
    });
  });

  // --- useBulkUpdateTasks ---
  describe("useBulkUpdateTasks", () => {
    it("sends PATCH to /api/tasks/bulk", async () => {
      const response = { success: true, updated: 2, data: [] };
      mockFetch.mockReturnValueOnce(okResponse(response));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useBulkUpdateTasks(), { wrapper });

      await act(async () => {
        result.current.mutate({
          taskIds: ["t1", "t2"],
          updates: { status: "done" },
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/tasks/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });

  // --- useBulkDeleteTasks ---
  describe("useBulkDeleteTasks", () => {
    it("sends DELETE to /api/tasks/bulk", async () => {
      const response = { success: true, deleted: 2 };
      mockFetch.mockReturnValueOnce(okResponse(response));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useBulkDeleteTasks(), { wrapper });

      await act(async () => {
        result.current.mutate({ taskIds: ["t1", "t2"] });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/tasks/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });
});

// ===========================================================================
// 2. use-task-templates
// ===========================================================================
describe("use-task-templates", () => {
  describe("useTaskTemplates", () => {
    it("is disabled when workspaceId is null", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useTaskTemplates(null), { wrapper });
      expect(result.current.fetchStatus).toBe("idle");
    });

    it("is disabled when workspaceId is undefined", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useTaskTemplates(undefined), {
        wrapper,
      });
      expect(result.current.fetchStatus).toBe("idle");
    });

    it("fetches templates for a workspace", async () => {
      const templates = [{ id: "tpl1", name: "Template 1" }];
      mockFetch.mockReturnValueOnce(okResponse(templates));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useTaskTemplates("ws-1"), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(templates);
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("workspace_id=ws-1");
    });

    it("throws on fetch error", async () => {
      mockFetch.mockReturnValueOnce(
        Promise.resolve({ ok: false, json: () => Promise.resolve({}) } as Response)
      );
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useTaskTemplates("ws-1"), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useCreateTaskTemplate", () => {
    it("sends POST to /api/task-templates", async () => {
      const newTemplate = { id: "tpl2", name: "New Template" };
      mockFetch.mockReturnValueOnce(okResponse(newTemplate));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useCreateTaskTemplate(), { wrapper });

      await act(async () => {
        result.current.mutate({
          workspace_id: "ws-1",
          name: "New Template",
        } as any);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/task-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });

  describe("useDeleteTaskTemplate", () => {
    it("sends DELETE to /api/task-templates with id param", async () => {
      mockFetch.mockReturnValueOnce(
        Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response)
      );

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDeleteTaskTemplate(), { wrapper });

      await act(async () => {
        result.current.mutate("tpl1");
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("id=tpl1");
      expect(mockFetch.mock.calls[0][1]?.method).toBe("DELETE");
    });
  });
});
