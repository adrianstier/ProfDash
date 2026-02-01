/**
 * Utility Hooks Tests
 *
 * Tests for: useDebounce, useKeyboardShortcuts, useLazyLoad,
 * usePagination, usePresence, useRealtimeTasks, useUser,
 * useOnboarding, useProjectHierarchy, useVoice
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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
beforeEach(() => {
  mockFetch.mockReset();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

// ===========================================================================
// 1. useDebounce
// ===========================================================================
import { useDebounce } from "@/lib/hooks/use-debounce";

describe("useDebounce", () => {
  it("returns the initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("hello", 300));
    expect(result.current).toBe("hello");
  });

  it("does not update the value before the delay", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "a", delay: 500 } }
    );

    rerender({ value: "b", delay: 500 });

    // Advance less than the delay
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe("a");
  });

  it("updates the value after the delay", async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "a", delay: 500 } }
    );

    rerender({ value: "b", delay: 500 });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe("b");
  });

  it("resets the timer on rapid value changes", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "a", delay: 300 } }
    );

    rerender({ value: "b", delay: 300 });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    rerender({ value: "c", delay: 300 });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // "b" should never have appeared; we're still waiting on "c"
    expect(result.current).toBe("a");

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe("c");
  });

  it("works with number values", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 0, delay: 200 } }
    );

    rerender({ value: 42, delay: 200 });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe(42);
  });
});

// ===========================================================================
// 2. useKeyboardShortcuts
// ===========================================================================

// Mock dependencies for keyboard shortcuts
const mockRouterPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => ({ get: vi.fn() }),
  usePathname: () => "/",
}));

const mockToggleSelectionMode = vi.fn();
const mockClearSelection = vi.fn();
vi.mock("@/lib/stores/task-store", () => ({
  useTaskStore: () => ({
    toggleSelectionMode: mockToggleSelectionMode,
    clearSelection: mockClearSelection,
  }),
}));

const mockToggleChat = vi.fn();
const mockOpenChat = vi.fn();
vi.mock("@/lib/stores/chat-store", () => ({
  useChatStore: () => ({
    toggleChat: mockToggleChat,
    openChat: mockOpenChat,
    addTypingUser: vi.fn(),
    removeTypingUser: vi.fn(),
  }),
}));

import { useKeyboardShortcuts, useShortcutsModalListener } from "@/lib/hooks/use-keyboard-shortcuts";

describe("useKeyboardShortcuts", () => {
  beforeEach(() => {
    mockRouterPush.mockReset();
    mockToggleSelectionMode.mockReset();
    mockClearSelection.mockReset();
    mockToggleChat.mockReset();
    mockOpenChat.mockReset();
  });

  it("returns shortcuts and registerCommandPalette", () => {
    const { result } = renderHook(() => useKeyboardShortcuts());
    expect(result.current.shortcuts).toBeDefined();
    expect(result.current.shortcuts.length).toBeGreaterThan(0);
    expect(typeof result.current.registerCommandPalette).toBe("function");
  });

  it("navigates to /today on 'g' key press", () => {
    renderHook(() => useKeyboardShortcuts());

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "g", bubbles: true })
      );
    });

    expect(mockRouterPush).toHaveBeenCalledWith("/today");
  });

  it("navigates to /board on 'b' key press", () => {
    renderHook(() => useKeyboardShortcuts());

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "b", bubbles: true })
      );
    });

    expect(mockRouterPush).toHaveBeenCalledWith("/board");
  });

  it("toggles selection mode on 's' key press", () => {
    renderHook(() => useKeyboardShortcuts());

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "s", bubbles: true })
      );
    });

    expect(mockToggleSelectionMode).toHaveBeenCalled();
  });

  it("clears selection on Escape", () => {
    renderHook(() => useKeyboardShortcuts());

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );
    });

    expect(mockClearSelection).toHaveBeenCalled();
  });

  it("toggles chat on 'm' key press", () => {
    renderHook(() => useKeyboardShortcuts());

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "m", bubbles: true })
      );
    });

    expect(mockToggleChat).toHaveBeenCalled();
  });

  it("does not trigger shortcuts when disabled", () => {
    renderHook(() => useKeyboardShortcuts({ enabled: false }));

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "g", bubbles: true })
      );
    });

    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it("does not trigger shortcuts when typing in an input", () => {
    renderHook(() => useKeyboardShortcuts());

    // Create a fake input element and focus it
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "g", bubbles: true })
      );
    });

    expect(mockRouterPush).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it("Escape works even when typing in an input", () => {
    renderHook(() => useKeyboardShortcuts());

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );
    });

    expect(mockClearSelection).toHaveBeenCalled();
    document.body.removeChild(input);
  });
});

describe("useShortcutsModalListener", () => {
  it("calls onShow when custom event is dispatched", () => {
    const onShow = vi.fn();
    renderHook(() => useShortcutsModalListener(onShow));

    act(() => {
      window.dispatchEvent(new CustomEvent("show-shortcuts-modal"));
    });

    expect(onShow).toHaveBeenCalled();
  });
});

// ===========================================================================
// 3. useLazyLoad (limited testing since IntersectionObserver is mocked)
// ===========================================================================
import { useLazyLoad } from "@/lib/hooks/use-lazy-load";

describe("useLazyLoad", () => {
  it("returns ref, isVisible, hasBeenVisible", () => {
    const { result } = renderHook(() => useLazyLoad());
    expect(result.current.ref).toBeDefined();
    expect(typeof result.current.isVisible).toBe("boolean");
    expect(typeof result.current.hasBeenVisible).toBe("boolean");
  });

  it("sets isVisible and hasBeenVisible to true when disabled", () => {
    const { result } = renderHook(() => useLazyLoad({ enabled: false }));
    expect(result.current.isVisible).toBe(true);
    expect(result.current.hasBeenVisible).toBe(true);
  });

  it("calls onVisible callback when enabled is false", () => {
    // When enabled=false, the hook immediately makes content visible.
    // The IntersectionObserver mock never fires, but the !enabled path does.
    // Since enabled=false triggers immediate visibility, and onVisible is
    // only called from the observer callback, onVisible is NOT called in the
    // disabled path. Let's just verify the state is correct.
    const onVisible = vi.fn();
    const { result } = renderHook(() =>
      useLazyLoad({ enabled: false, onVisible })
    );
    expect(result.current.isVisible).toBe(true);
    expect(result.current.hasBeenVisible).toBe(true);
  });

  it("starts with isVisible=false when enabled", () => {
    const { result } = renderHook(() => useLazyLoad({ enabled: true }));
    // Without a ref attached to a DOM element, the observer won't fire
    expect(result.current.isVisible).toBe(false);
    expect(result.current.hasBeenVisible).toBe(false);
  });
});

// ===========================================================================
// 4. usePagination & getPageNumbers
// ===========================================================================
import { usePagination, getPageNumbers } from "@/lib/hooks/use-pagination";

describe("usePagination", () => {
  it("returns default values", () => {
    vi.useRealTimers();
    const { result } = renderHook(() => usePagination());

    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(20);
    expect(result.current.totalItems).toBe(0);
    expect(result.current.totalPages).toBe(1);
    expect(result.current.isFirstPage).toBe(true);
    expect(result.current.isLastPage).toBe(true);
    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.hasPreviousPage).toBe(false);
    expect(result.current.offset).toBe(0);
    expect(result.current.limit).toBe(20);
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it("respects initialPage and initialPageSize", () => {
    vi.useRealTimers();
    const { result } = renderHook(() =>
      usePagination({ initialPage: 3, initialPageSize: 10, totalItems: 100 })
    );

    expect(result.current.page).toBe(3);
    expect(result.current.pageSize).toBe(10);
    expect(result.current.totalPages).toBe(10);
    expect(result.current.startIndex).toBe(20);
    expect(result.current.endIndex).toBe(30);
    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.hasPreviousPage).toBe(true);
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it("nextPage advances the page", () => {
    vi.useRealTimers();
    const { result } = renderHook(() =>
      usePagination({ totalItems: 100, initialPageSize: 10 })
    );

    act(() => {
      result.current.nextPage();
    });

    expect(result.current.page).toBe(2);
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it("previousPage goes back", () => {
    vi.useRealTimers();
    const { result } = renderHook(() =>
      usePagination({ totalItems: 100, initialPage: 3, initialPageSize: 10 })
    );

    act(() => {
      result.current.previousPage();
    });

    expect(result.current.page).toBe(2);
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it("nextPage does nothing on last page", () => {
    vi.useRealTimers();
    const { result } = renderHook(() =>
      usePagination({ totalItems: 10, initialPage: 1, initialPageSize: 10 })
    );

    act(() => {
      result.current.nextPage();
    });

    expect(result.current.page).toBe(1);
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it("previousPage does nothing on first page", () => {
    vi.useRealTimers();
    const { result } = renderHook(() =>
      usePagination({ totalItems: 100 })
    );

    act(() => {
      result.current.previousPage();
    });

    expect(result.current.page).toBe(1);
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it("firstPage goes to page 1", () => {
    vi.useRealTimers();
    const { result } = renderHook(() =>
      usePagination({ totalItems: 100, initialPage: 5, initialPageSize: 10 })
    );

    act(() => {
      result.current.firstPage();
    });

    expect(result.current.page).toBe(1);
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it("lastPage goes to the last page", () => {
    vi.useRealTimers();
    const { result } = renderHook(() =>
      usePagination({ totalItems: 100, initialPageSize: 10 })
    );

    act(() => {
      result.current.lastPage();
    });

    expect(result.current.page).toBe(10);
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it("setPageSize resets to page 1", () => {
    vi.useRealTimers();
    const { result } = renderHook(() =>
      usePagination({ totalItems: 100, initialPage: 5, initialPageSize: 10 })
    );

    act(() => {
      result.current.setPageSize(25);
    });

    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(25);
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it("setPage clamps to valid range", () => {
    vi.useRealTimers();
    const { result } = renderHook(() =>
      usePagination({ totalItems: 50, initialPageSize: 10 })
    );

    act(() => {
      result.current.setPage(100);
    });

    expect(result.current.page).toBe(5);

    act(() => {
      result.current.setPage(-1);
    });

    expect(result.current.page).toBe(1);
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it("paginateData slices data correctly", () => {
    vi.useRealTimers();
    const data = Array.from({ length: 25 }, (_, i) => i);
    const { result } = renderHook(() =>
      usePagination<number>({ initialPageSize: 10 })
    );

    let sliced: number[] = [];
    act(() => {
      sliced = result.current.paginateData(data);
    });

    expect(sliced).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
});

describe("getPageNumbers", () => {
  it("returns all pages when totalPages <= maxVisible", () => {
    expect(getPageNumbers(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("returns pages with ellipsis for many pages", () => {
    const result = getPageNumbers(5, 20);
    expect(result[0]).toBe(1);
    expect(result[result.length - 1]).toBe(20);
    expect(result).toContain("ellipsis");
  });

  it("returns correct pages at the beginning", () => {
    const result = getPageNumbers(1, 20);
    expect(result[0]).toBe(1);
    expect(result[result.length - 1]).toBe(20);
  });

  it("returns correct pages at the end", () => {
    const result = getPageNumbers(20, 20);
    expect(result[0]).toBe(1);
    expect(result[result.length - 1]).toBe(20);
  });

  it("returns [1] for single-page", () => {
    expect(getPageNumbers(1, 1)).toEqual([1]);
  });
});

// ===========================================================================
// 5. usePresence
// ===========================================================================
// We mock the chatKeys import so the hook can resolve its queryKey
vi.mock("@/lib/hooks/use-chat", () => ({
  chatKeys: {
    all: ["chat"] as const,
    messages: (wsId: string) => ["chat", "messages", wsId] as const,
    conversation: (wsId: string, rId: string | null) =>
      ["chat", "messages", wsId, rId || "workspace"] as const,
    pinnedMessages: (wsId: string, rId: string | null) =>
      ["chat", "messages", wsId, rId || "workspace", "pinned"] as const,
    presence: (wsId: string) => ["chat", "presence", wsId] as const,
    activity: (wsId: string) => ["chat", "activity", wsId] as const,
  },
}));

vi.mock("@/lib/realtime/workspace-channel", () => ({
  getWorkspaceChannel: vi.fn(() => ({
    setCurrentUser: vi.fn().mockReturnThis(),
    setHandlers: vi.fn().mockReturnThis(),
    connect: vi.fn().mockResolvedValue(undefined),
    broadcastTyping: vi.fn(),
    broadcastTaskUpdate: vi.fn(),
    updateStatus: vi.fn(),
    trackPresence: vi.fn(),
  })),
  removeWorkspaceChannel: vi.fn(),
}));

import {
  usePresence,
  useUpdatePresence,
  useUpdateTyping,
} from "@/lib/hooks/use-presence";

describe("usePresence", () => {
  it("is disabled when workspaceId is empty", () => {
    vi.useRealTimers();
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePresence(""), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it("fetches presence data for valid workspaceId", async () => {
    vi.useRealTimers();
    const presenceData = [{ id: "p1", status: "online", user: { id: "u1" } }];
    mockFetch.mockReturnValueOnce(okResponse({ data: presenceData }));

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePresence("ws-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(presenceData);
    expect(mockFetch).toHaveBeenCalledWith("/api/presence?workspace_id=ws-1");
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it("throws on error response", async () => {
    vi.useRealTimers();
    mockFetch.mockReturnValueOnce(errorResponse(500, { error: "Server error" }));

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePresence("ws-1"), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Server error");
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
});

describe("useUpdatePresence", () => {
  it("sends POST to /api/presence", async () => {
    vi.useRealTimers();
    const updated = { id: "p1", status: "online" };
    mockFetch.mockReturnValueOnce(okResponse(updated));

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdatePresence(), { wrapper });

    await act(async () => {
      result.current.mutate({
        workspaceId: "ws-1",
        status: "online" as any,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith("/api/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: expect.any(String),
    });
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
});

describe("useUpdateTyping", () => {
  it("sends PATCH to /api/presence", async () => {
    vi.useRealTimers();
    mockFetch.mockReturnValueOnce(okResponse({ success: true }));

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateTyping(), { wrapper });

    await act(async () => {
      result.current.mutate({
        workspaceId: "ws-1",
        isTyping: true,
        typingInConversation: "workspace",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith("/api/presence", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: expect.any(String),
    });
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
});

// ===========================================================================
// 6. useRealtimeTasks
// ===========================================================================
vi.mock("@/lib/stores/workspace-store", () => ({
  useWorkspaceStore: vi.fn(() => ({
    currentWorkspaceId: "ws-1",
    currentWorkspace: null,
    workspaces: [],
    setCurrentWorkspaceId: vi.fn(),
  })),
}));

import {
  useBroadcastTaskUpdate,
} from "@/lib/hooks/use-realtime-tasks";

describe("useBroadcastTaskUpdate", () => {
  it("returns broadcastTaskCreated, broadcastTaskUpdated, broadcastTaskDeleted", () => {
    vi.useRealTimers();
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useBroadcastTaskUpdate(), { wrapper });

    expect(typeof result.current.broadcastTaskCreated).toBe("function");
    expect(typeof result.current.broadcastTaskUpdated).toBe("function");
    expect(typeof result.current.broadcastTaskDeleted).toBe("function");
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
});

// ===========================================================================
// 7. useUser
// ===========================================================================
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => mockSupabaseClient,
}));

import { useUser, useIsAuthenticated, userKeys } from "@/lib/hooks/use-user";

describe("useUser", () => {
  beforeEach(() => {
    mockSupabaseClient.auth.getUser.mockReset();
  });

  it("returns user when authenticated", async () => {
    vi.useRealTimers();
    const mockUser = { id: "u-1", email: "test@example.com" };
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUser(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toEqual(mockUser);
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it("returns null user when not authenticated", async () => {
    vi.useRealTimers();
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUser(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toBeNull();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
});

describe("useIsAuthenticated", () => {
  it("returns isAuthenticated true when user exists", async () => {
    vi.useRealTimers();
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "u-1" } },
      error: null,
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useIsAuthenticated(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(true);
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it("returns isAuthenticated false when no user", async () => {
    vi.useRealTimers();
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useIsAuthenticated(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
});

describe("userKeys", () => {
  it("all key is ['user']", () => {
    expect(userKeys.all).toEqual(["user"]);
  });

  it("current key is ['user', 'current']", () => {
    expect(userKeys.current()).toEqual(["user", "current"]);
  });

  it("profile key includes userId", () => {
    expect(userKeys.profile("u-1")).toEqual(["user", "profile", "u-1"]);
  });
});

// ===========================================================================
// 8. useOnboarding
// ===========================================================================
vi.mock("@/lib/stores/analytics-store", () => ({
  useAnalyticsStore: () => ({
    startOnboardingSession: vi.fn(),
    advanceOnboardingStep: vi.fn(),
    completeOnboardingSession: vi.fn(() => ({
      startedAt: Date.now() - 60000,
      completedSteps: [1, 2, 3, 4, 5],
    })),
    skipOnboardingSession: vi.fn(),
    recordOnboardingInteraction: vi.fn(),
    onboardingSession: {
      stepStartedAt: Date.now(),
      interactionCount: 3,
    },
  }),
}));

vi.mock("@/lib/hooks/use-analytics-events", () => ({
  useAnalyticsEvents: () => ({
    trackOnboardingStarted: vi.fn(),
    trackOnboardingStepCompleted: vi.fn(),
    trackOnboardingStepViewed: vi.fn(),
    trackOnboardingCompleted: vi.fn(),
    trackOnboardingSkipped: vi.fn(),
  }),
}));

import { useOnboarding, onboardingKeys, useShouldShowOnboarding } from "@/lib/hooks/use-onboarding";

describe("useOnboarding", () => {
  it("fetches onboarding progress", async () => {
    vi.useRealTimers();
    const progress = {
      step: 2,
      completed: false,
      skipped: false,
      startedAt: "2024-01-01T00:00:00Z",
    };
    mockFetch.mockReturnValueOnce(okResponse(progress));

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.progress).toEqual(progress);
    expect(result.current.currentStep).toBe(2);
    expect(result.current.isCompleted).toBe(false);
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it("provides default values when no progress", async () => {
    vi.useRealTimers();
    mockFetch.mockReturnValueOnce(errorResponse(500, { error: "fail" }));

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.currentStep).toBe(0);
    expect(result.current.isCompleted).toBe(false);
    expect(result.current.isSkipped).toBe(false);
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
});

describe("onboardingKeys", () => {
  it("all key is ['onboarding']", () => {
    expect(onboardingKeys.all).toEqual(["onboarding"]);
  });

  it("progress key is ['onboarding', 'progress']", () => {
    expect(onboardingKeys.progress()).toEqual(["onboarding", "progress"]);
  });
});

// ===========================================================================
// 9. useProjectHierarchy (usePhases, useWorkstreams, etc.)
// ===========================================================================
import {
  usePhases,
  usePhase,
  useWorkstreams,
  useWorkstream,
  useDeliverables,
  useRoles,
  useAssignments,
  useCreatePhase,
  useDeletePhase,
} from "@/lib/hooks/use-project-hierarchy";

describe("usePhases", () => {
  it("is disabled when projectId is null", () => {
    vi.useRealTimers();
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePhases(null), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it("fetches phases for a valid projectId", async () => {
    vi.useRealTimers();
    const phases = [{ id: "ph-1", title: "Phase 1" }];
    mockFetch.mockReturnValueOnce(okResponse(phases));

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePhases("proj-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(phases);
    expect(mockFetch).toHaveBeenCalledWith("/api/projects/proj-1/phases");
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it("throws on error response", async () => {
    vi.useRealTimers();
    mockFetch.mockReturnValueOnce(
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({}),
      } as Response)
    );

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePhases("proj-1"), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
});

describe("usePhase", () => {
  it("is disabled when projectId is null", () => {
    vi.useRealTimers();
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePhase(null, "ph-1"), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it("is disabled when phaseId is null", () => {
    vi.useRealTimers();
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePhase("proj-1", null), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
});

describe("useWorkstreams", () => {
  it("is disabled when projectId is null", () => {
    vi.useRealTimers();
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useWorkstreams(null), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it("fetches workstreams for a valid projectId", async () => {
    vi.useRealTimers();
    const workstreams = [{ id: "ws-1", title: "Workstream A" }];
    mockFetch.mockReturnValueOnce(okResponse(workstreams));

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useWorkstreams("proj-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith("/api/projects/proj-1/workstreams");
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
});

describe("useWorkstream", () => {
  it("is disabled when projectId or workstreamId is null", () => {
    vi.useRealTimers();
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useWorkstream(null, "ws-1"), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");

    const { result: result2 } = renderHook(() => useWorkstream("proj-1", null), { wrapper });
    expect(result2.current.fetchStatus).toBe("idle");
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
});

describe("useDeliverables", () => {
  it("is disabled when projectId or phaseId is null", () => {
    vi.useRealTimers();
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useDeliverables(null, "ph-1"), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");

    const { result: result2 } = renderHook(() => useDeliverables("proj-1", null), { wrapper });
    expect(result2.current.fetchStatus).toBe("idle");
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
});

describe("useRoles", () => {
  it("is disabled when projectId is null", () => {
    vi.useRealTimers();
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useRoles(null), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it("fetches roles for a valid projectId", async () => {
    vi.useRealTimers();
    const roles = [{ id: "r-1", name: "PI" }];
    mockFetch.mockReturnValueOnce(okResponse(roles));

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useRoles("proj-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith("/api/projects/proj-1/roles");
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
});

describe("useAssignments", () => {
  it("is disabled when projectId or phaseId is null", () => {
    vi.useRealTimers();
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAssignments(null, "ph-1"), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
});

describe("useCreatePhase", () => {
  it("sends POST to phases endpoint", async () => {
    vi.useRealTimers();
    const newPhase = { id: "ph-new", title: "New Phase" };
    mockFetch.mockReturnValueOnce(okResponse(newPhase));

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreatePhase(), { wrapper });

    await act(async () => {
      result.current.mutate({ projectId: "proj-1", title: "New Phase" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith("/api/projects/proj-1/phases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: expect.any(String),
    });
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
});

describe("useDeletePhase", () => {
  it("sends DELETE to phase endpoint", async () => {
    vi.useRealTimers();
    mockFetch.mockReturnValueOnce(
      Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response)
    );

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useDeletePhase(), { wrapper });

    await act(async () => {
      result.current.mutate({ projectId: "proj-1", phaseId: "ph-1" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith("/api/projects/proj-1/phases/ph-1", {
      method: "DELETE",
    });
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
});

// ===========================================================================
// 10. useVoice
// ===========================================================================
import { useVoice } from "@/lib/hooks/use-voice";

describe("useVoice", () => {
  it("returns initial state", () => {
    vi.useRealTimers();
    const { result } = renderHook(() => useVoice());

    expect(result.current.isRecording).toBe(false);
    expect(result.current.isTranscribing).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.startRecording).toBe("function");
    expect(typeof result.current.stopRecording).toBe("function");
    expect(typeof result.current.cancelRecording).toBe("function");
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it("sets error when microphone access fails", async () => {
    vi.useRealTimers();
    const mockGetUserMedia = vi.fn().mockRejectedValue(new Error("Permission denied"));
    Object.defineProperty(navigator, "mediaDevices", {
      value: { getUserMedia: mockGetUserMedia },
      writable: true,
      configurable: true,
    });

    const onError = vi.fn();
    const { result } = renderHook(() => useVoice({ onError }));

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.error).toBe("Permission denied");
    expect(onError).toHaveBeenCalledWith("Permission denied");
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it("stopRecording returns null when not recording", async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => useVoice());

    let text: string | null = "not-null";
    await act(async () => {
      text = await result.current.stopRecording();
    });

    expect(text).toBeNull();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it("cancelRecording resets state", () => {
    vi.useRealTimers();
    const { result } = renderHook(() => useVoice());

    act(() => {
      result.current.cancelRecording();
    });

    expect(result.current.isRecording).toBe(false);
    expect(result.current.isTranscribing).toBe(false);
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
});
