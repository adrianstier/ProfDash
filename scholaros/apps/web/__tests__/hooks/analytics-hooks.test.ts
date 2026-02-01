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
// Mock dependencies required by analytics hooks
// ---------------------------------------------------------------------------

// Mock use-user (required by use-analytics-events)
vi.mock("@/lib/hooks/use-user", () => ({
  useUser: () => ({
    user: { id: "test-user-id" },
    isLoading: false,
    isError: false,
  }),
}));

// Mock workspace store (required by use-analytics-events and use-search)
vi.mock("@/lib/stores/workspace-store", () => ({
  useWorkspaceStore: (selector?: (s: any) => any) => {
    const state = {
      currentWorkspaceId: "ws-1",
    };
    return selector ? selector(state) : state;
  },
}));

// Mock analytics store (required by use-onboarding)
vi.mock("@/lib/stores/analytics-store", () => ({
  useAnalyticsStore: () => ({
    startOnboardingSession: vi.fn(),
    advanceOnboardingStep: vi.fn(),
    completeOnboardingSession: vi.fn().mockReturnValue({
      startedAt: Date.now() - 10000,
      completedSteps: [1, 2, 3],
    }),
    skipOnboardingSession: vi.fn(),
    onboardingSession: {
      stepStartedAt: Date.now() - 5000,
      interactionCount: 3,
    },
    recordOnboardingInteraction: vi.fn(),
  }),
}));

// Mock Supabase client (required by use-user)
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: () =>
        Promise.resolve({
          data: { user: { id: "test-user-id", email: "test@test.com" } },
          error: null,
        }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: { id: "test-user-id", full_name: "Test User" },
              error: null,
            }),
        }),
      }),
    }),
  }),
}));

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
import { useAnalytics } from "@/lib/hooks/use-analytics";

import {
  useAnalyticsEvents,
  analyticsKeys,
} from "@/lib/hooks/use-analytics-events";

import {
  searchKeys,
  useSearch,
  useSearchHistory,
  useRecordSearchHistory,
  useClearSearchHistory,
} from "@/lib/hooks/use-search";

// ---------------------------------------------------------------------------
beforeEach(() => {
  mockFetch.mockReset();
});

// ===========================================================================
// 1. use-analytics
// ===========================================================================
describe("use-analytics", () => {
  describe("useAnalytics", () => {
    it("is disabled when workspaceId is null", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useAnalytics(null), { wrapper });
      expect(result.current.fetchStatus).toBe("idle");
    });

    it("fetches analytics data", async () => {
      const data = {
        summary: { totalTasks: 10, completedTasks: 5 },
        period: "30d",
      };
      mockFetch.mockReturnValueOnce(okResponse(data));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useAnalytics("ws-1"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("workspace_id=ws-1");
      expect(url).toContain("period=30d");
    });

    it("supports custom period", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ period: "7d" }));
      const { wrapper } = createWrapper();
      renderHook(() => useAnalytics("ws-1", "7d"), { wrapper });

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("period=7d");
    });

    it("throws on error", async () => {
      mockFetch.mockReturnValueOnce(
        errorResponse(500, { error: "Analytics failed" })
      );
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useAnalytics("ws-1"), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe("Analytics failed");
    });
  });
});

// ===========================================================================
// 2. use-analytics-events
// ===========================================================================
describe("use-analytics-events", () => {
  describe("analyticsKeys", () => {
    it("all key is ['analytics']", () => {
      expect(analyticsKeys.all).toEqual(["analytics"]);
    });

    it("events key appends 'events'", () => {
      expect(analyticsKeys.events()).toEqual(["analytics", "events"]);
    });

    it("onboarding key appends 'onboarding'", () => {
      expect(analyticsKeys.onboarding()).toEqual(["analytics", "onboarding"]);
    });

    it("onboardingFunnel key includes cohort dates", () => {
      expect(analyticsKeys.onboardingFunnel("2025-01-01", "2025-01-31")).toEqual([
        "analytics",
        "onboarding",
        "funnel",
        "2025-01-01",
        "2025-01-31",
      ]);
    });

    it("search key appends 'search'", () => {
      expect(analyticsKeys.search()).toEqual(["analytics", "search"]);
    });

    it("searchMetrics includes date range", () => {
      expect(analyticsKeys.searchMetrics("2025-01-01", "2025-01-31")).toEqual([
        "analytics",
        "search",
        "metrics",
        "2025-01-01",
        "2025-01-31",
      ]);
    });

    it("recurringTasks key appends 'recurring-tasks'", () => {
      expect(analyticsKeys.recurringTasks()).toEqual([
        "analytics",
        "recurring-tasks",
      ]);
    });

    it("recurringTaskAdoption includes workspaceId", () => {
      expect(analyticsKeys.recurringTaskAdoption("ws-1")).toEqual([
        "analytics",
        "recurring-tasks",
        "adoption",
        "ws-1",
      ]);
    });

    it("dashboard includes workspaceId and period", () => {
      expect(analyticsKeys.dashboard("ws-1", "30d")).toEqual([
        "analytics",
        "dashboard",
        "ws-1",
        "30d",
      ]);
    });
  });

  describe("useAnalyticsEvents", () => {
    it("returns track function and convenience trackers", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useAnalyticsEvents(), { wrapper });

      expect(result.current.track).toBeDefined();
      expect(result.current.trackOnboardingStarted).toBeDefined();
      expect(result.current.trackOnboardingStepViewed).toBeDefined();
      expect(result.current.trackOnboardingStepCompleted).toBeDefined();
      expect(result.current.trackOnboardingSkipped).toBeDefined();
      expect(result.current.trackOnboardingCompleted).toBeDefined();
      expect(result.current.trackSearchOpened).toBeDefined();
      expect(result.current.trackSearchQueryEntered).toBeDefined();
      expect(result.current.trackSearchResultSelected).toBeDefined();
      expect(result.current.trackSearchClosed).toBeDefined();
      expect(result.current.trackSearchNoResults).toBeDefined();
      expect(result.current.trackRecurringTaskCreated).toBeDefined();
      expect(result.current.trackRecurringTaskCompleted).toBeDefined();
      expect(result.current.trackRecurringTaskEdited).toBeDefined();
      expect(result.current.flush).toBeDefined();
      expect(result.current.sessionId).toBeTruthy();
    });

    it("track function does not throw", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useAnalyticsEvents(), { wrapper });

      expect(() => {
        result.current.track("search_opened" as any, { trigger: "click" });
      }).not.toThrow();
    });

    it("flush does not throw when queue is empty", async () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useAnalyticsEvents(), { wrapper });

      await expect(result.current.flush()).resolves.not.toThrow();
    });

    it("sessionId is consistent across renders", () => {
      const { wrapper } = createWrapper();
      const { result, rerender } = renderHook(
        () => useAnalyticsEvents(),
        { wrapper }
      );

      const firstSessionId = result.current.sessionId;
      rerender();
      expect(result.current.sessionId).toBe(firstSessionId);
    });
  });
});

// ===========================================================================
// 3. use-search
// ===========================================================================
describe("use-search", () => {
  describe("searchKeys", () => {
    it("all key is ['search']", () => {
      expect(searchKeys.all).toEqual(["search"]);
    });

    it("results key includes query and options", () => {
      const key = searchKeys.results("test", ["task"], "ws-1");
      expect(key).toEqual([
        "search",
        "results",
        { query: "test", types: ["task"], workspaceId: "ws-1" },
      ]);
    });

    it("history key appends 'history'", () => {
      expect(searchKeys.history()).toEqual(["search", "history"]);
    });

    it("historyFiltered includes filter options", () => {
      expect(searchKeys.historyFiltered("ws-1", true)).toEqual([
        "search",
        "history",
        { workspaceId: "ws-1", selectedOnly: true },
      ]);
    });
  });

  describe("useSearch", () => {
    it("is disabled when query is empty", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useSearch(""), { wrapper });
      expect(result.current.fetchStatus).toBe("idle");
    });

    it("fetches search results for a query", async () => {
      const response = {
        results: [{ id: "t1", title: "Test Task", type: "task" }],
        grouped: { tasks: [], projects: [], grants: [], publications: [], navigation: [] },
        total: 1,
        query: "test",
        limit: 10,
      };
      mockFetch.mockReturnValueOnce(okResponse(response));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useSearch("test"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("q=test");
    });

    it("includes types filter", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ results: [], grouped: {}, total: 0 }));
      const { wrapper } = createWrapper();
      renderHook(
        () => useSearch("test", { types: ["task" as any, "project" as any] }),
        { wrapper }
      );

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("types=task%2Cproject");
    });

    it("can be disabled via options", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () => useSearch("test", { enabled: false }),
        { wrapper }
      );
      expect(result.current.fetchStatus).toBe("idle");
    });
  });

  describe("useSearchHistory", () => {
    it("fetches search history", async () => {
      mockFetch.mockReturnValueOnce(
        okResponse({ searches: [], count: 0 })
      );
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useSearchHistory(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("/api/search/history");
    });

    it("includes selectedOnly filter", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ searches: [], count: 0 }));
      const { wrapper } = createWrapper();
      renderHook(() => useSearchHistory({ selectedOnly: true }), { wrapper });

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("selected_only=true");
    });

    it("can be disabled", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () => useSearchHistory({ enabled: false }),
        { wrapper }
      );
      expect(result.current.fetchStatus).toBe("idle");
    });
  });

  describe("useRecordSearchHistory", () => {
    it("sends POST to /api/search/history", async () => {
      mockFetch.mockReturnValueOnce(
        okResponse({ success: true, stored: true })
      );
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useRecordSearchHistory(), { wrapper });

      await act(async () => {
        result.current.mutate({
          query: "NSF grant",
          result_type: "grant" as any,
          selected: true,
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/search/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });

  describe("useClearSearchHistory", () => {
    it("sends DELETE to /api/search/history", async () => {
      mockFetch.mockReturnValueOnce(
        okResponse({ success: true, deleted: 5 })
      );
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useClearSearchHistory(), { wrapper });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain("/api/search/history");
      expect(options?.method).toBe("DELETE");
    });
  });
});
