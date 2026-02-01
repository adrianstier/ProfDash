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
  useGrantSearch,
  useWatchlist,
  useAddToWatchlist,
  useUpdateWatchlistItem,
  useRemoveFromWatchlist,
  useSavedSearches,
  useCreateSavedSearch,
  useDeleteSavedSearch,
  useCreateOpportunity,
} from "@/lib/hooks/use-grants";

import {
  useCalendarConnection,
  useCalendarEvents,
  useCalendarList,
  useDisconnectGoogleCalendar,
  useUpdateCalendarConnection,
  useRefreshCalendarEvents,
} from "@/lib/hooks/use-calendar";

import {
  personnelKeys,
  usePersonnel,
  usePersonnelById,
  useCreatePersonnel,
  useUpdatePersonnel,
  useDeletePersonnel,
} from "@/lib/hooks/use-personnel";

import {
  usePublications,
  usePublication,
  useCreatePublication,
  useUpdatePublication,
  useDeletePublication,
  useImportFromDOI,
} from "@/lib/hooks/use-publications";

import {
  useWorkspaces,
  useWorkspace,
  useWorkspaceMembers,
  useWorkspaceInvites,
  useCreateWorkspace,
  useUpdateWorkspace,
  useInviteMember,
  useCancelInvite,
  useUpdateMemberRole,
  useRemoveMember,
  useAcceptInvite,
} from "@/lib/hooks/use-workspaces";

import {
  documentKeys,
  useDocuments,
  useDocumentById,
  useUploadDocument,
  useProcessDocument,
  useDeleteDocument,
  formatFileSize,
  getFileTypeLabel,
} from "@/lib/hooks/use-documents";

// ---------------------------------------------------------------------------
beforeEach(() => {
  mockFetch.mockReset();
});

// ===========================================================================
// 1. use-grants
// ===========================================================================
describe("use-grants", () => {
  describe("useGrantSearch", () => {
    it("fetches search results", async () => {
      const response = { opportunities: [], total: 0, page: 1, limit: 20 };
      mockFetch.mockReturnValueOnce(okResponse(response));

      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () => useGrantSearch({ keywords: "NSF" }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("keywords=NSF");
    });

    it("can be disabled", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () => useGrantSearch({}, false),
        { wrapper }
      );
      expect(result.current.fetchStatus).toBe("idle");
    });

    it("includes all filter parameters", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ opportunities: [], total: 0, page: 1, limit: 20 }));
      const { wrapper } = createWrapper();
      renderHook(
        () =>
          useGrantSearch({
            keywords: "bio",
            agency: "NIH",
            funding_type: "grant",
            amount_min: 100000,
            amount_max: 500000,
            page: 2,
            limit: 10,
          }),
        { wrapper }
      );

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("agency=NIH");
      expect(url).toContain("amount_min=100000");
      expect(url).toContain("amount_max=500000");
    });
  });

  describe("useWatchlist", () => {
    it("is disabled when workspaceId is null", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useWatchlist(null), { wrapper });
      expect(result.current.fetchStatus).toBe("idle");
    });

    it("fetches watchlist items", async () => {
      const items = [{ id: "w1", opportunity_id: "o1" }];
      mockFetch.mockReturnValueOnce(okResponse(items));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useWatchlist("ws-1"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/grants/watchlist?workspace_id=ws-1"
      );
    });

    it("returns empty array on 404", async () => {
      mockFetch.mockReturnValueOnce(
        Promise.resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve([]),
        } as Response)
      );
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useWatchlist("ws-1"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([]);
    });
  });

  describe("useAddToWatchlist", () => {
    it("sends POST to /api/grants/watchlist", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ id: "w2" }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useAddToWatchlist(), { wrapper });

      await act(async () => {
        result.current.mutate({ workspace_id: "ws-1", opportunity_id: "o1" });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/grants/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });

  describe("useUpdateWatchlistItem", () => {
    it("sends PATCH to /api/grants/watchlist/:id", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ id: "w1" }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useUpdateWatchlistItem(), { wrapper });

      await act(async () => {
        result.current.mutate({ id: "w1", status: "applied" as any });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/grants/watchlist/w1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });

  describe("useRemoveFromWatchlist", () => {
    it("sends DELETE to /api/grants/watchlist/:id", async () => {
      mockFetch.mockReturnValueOnce(
        Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response)
      );
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useRemoveFromWatchlist(), { wrapper });

      await act(async () => {
        result.current.mutate("w1");
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/grants/watchlist/w1", {
        method: "DELETE",
      });
    });
  });

  describe("useSavedSearches", () => {
    it("is disabled when workspaceId is null", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useSavedSearches(null), { wrapper });
      expect(result.current.fetchStatus).toBe("idle");
    });

    it("fetches saved searches", async () => {
      mockFetch.mockReturnValueOnce(okResponse([]));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useSavedSearches("ws-1"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe("useCreateSavedSearch", () => {
    it("sends POST to /api/grants/saved-searches", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ id: "ss1" }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useCreateSavedSearch(), { wrapper });

      await act(async () => {
        result.current.mutate({
          workspace_id: "ws-1",
          name: "Search 1",
          query: {} as any,
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/grants/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });

  describe("useDeleteSavedSearch", () => {
    it("sends DELETE to /api/grants/saved-searches/:id", async () => {
      mockFetch.mockReturnValueOnce(
        Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response)
      );
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDeleteSavedSearch(), { wrapper });

      await act(async () => {
        result.current.mutate("ss1");
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe("useCreateOpportunity", () => {
    it("sends POST to /api/grants/opportunities", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ id: "opp1" }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useCreateOpportunity(), { wrapper });

      await act(async () => {
        result.current.mutate({ title: "New Grant" });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/grants/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });
});

// ===========================================================================
// 2. use-calendar
// ===========================================================================
describe("use-calendar", () => {
  describe("useCalendarConnection", () => {
    it("fetches connection status", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ connected: true }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useCalendarConnection(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.connected).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith("/api/calendar/connection");
    });

    it("returns disconnected on 404", async () => {
      mockFetch.mockReturnValueOnce(
        Promise.resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve({ connected: false }),
        } as Response)
      );
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useCalendarConnection(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.connected).toBe(false);
    });
  });

  describe("useCalendarEvents", () => {
    it("fetches events with date range", async () => {
      mockFetch.mockReturnValueOnce(okResponse([]));
      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () =>
          useCalendarEvents({
            start: "2025-01-01",
            end: "2025-01-31",
          }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("start=2025-01-01");
      expect(url).toContain("end=2025-01-31");
    });

    it("can be disabled", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () => useCalendarEvents({ enabled: false }),
        { wrapper }
      );
      expect(result.current.fetchStatus).toBe("idle");
    });

    it("includes refresh param", async () => {
      mockFetch.mockReturnValueOnce(okResponse([]));
      const { wrapper } = createWrapper();
      renderHook(() => useCalendarEvents({ refresh: true }), { wrapper });

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("refresh=true");
    });
  });

  describe("useCalendarList", () => {
    it("fetches calendar list", async () => {
      mockFetch.mockReturnValueOnce(okResponse([]));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useCalendarList(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/calendar/calendars");
    });
  });

  describe("useDisconnectGoogleCalendar", () => {
    it("sends DELETE to /api/auth/google", async () => {
      mockFetch.mockReturnValueOnce(
        Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response)
      );
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDisconnectGoogleCalendar(), { wrapper });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/auth/google", {
        method: "DELETE",
      });
    });
  });

  describe("useUpdateCalendarConnection", () => {
    it("sends PATCH to /api/calendar/connection", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ connected: true, sync_enabled: true }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useUpdateCalendarConnection(), { wrapper });

      await act(async () => {
        result.current.mutate({ sync_enabled: true });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/calendar/connection", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });

  describe("useRefreshCalendarEvents", () => {
    it("fetches events with refresh=true", async () => {
      mockFetch.mockReturnValueOnce(okResponse([]));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useRefreshCalendarEvents(), { wrapper });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("refresh=true");
    });
  });
});

// ===========================================================================
// 3. use-personnel
// ===========================================================================
describe("use-personnel", () => {
  describe("personnelKeys", () => {
    it("all key is ['personnel']", () => {
      expect(personnelKeys.all).toEqual(["personnel"]);
    });

    it("list key includes filters", () => {
      expect(personnelKeys.list({ workspace_id: "ws-1" })).toEqual([
        "personnel",
        "list",
        { workspace_id: "ws-1" },
      ]);
    });

    it("detail key includes id", () => {
      expect(personnelKeys.detail("p1")).toEqual(["personnel", "detail", "p1"]);
    });
  });

  describe("usePersonnel", () => {
    it("fetches personnel list", async () => {
      mockFetch.mockReturnValueOnce(okResponse([]));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => usePersonnel(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it("fetches with workspace filter", async () => {
      mockFetch.mockReturnValueOnce(okResponse([]));
      const { wrapper } = createWrapper();
      renderHook(() => usePersonnel({ workspace_id: "ws-1" }), { wrapper });

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("workspace_id=ws-1");
    });

    it("fetches with role filter", async () => {
      mockFetch.mockReturnValueOnce(okResponse([]));
      const { wrapper } = createWrapper();
      renderHook(() => usePersonnel({ role: "phd" }), { wrapper });

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("role=phd");
    });
  });

  describe("usePersonnelById", () => {
    it("is disabled when id is undefined", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => usePersonnelById(undefined), { wrapper });
      expect(result.current.fetchStatus).toBe("idle");
    });

    it("fetches a single person", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ id: "p1", name: "Alice" }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => usePersonnelById("p1"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/personnel/p1");
    });
  });

  describe("useCreatePersonnel", () => {
    it("sends POST to /api/personnel", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ id: "p2" }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useCreatePersonnel(), { wrapper });

      await act(async () => {
        result.current.mutate({ name: "Bob", role: "phd" as any });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/personnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });

  describe("useUpdatePersonnel", () => {
    it("sends PATCH to /api/personnel/:id", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ id: "p1" }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useUpdatePersonnel(), { wrapper });

      await act(async () => {
        result.current.mutate({ id: "p1", name: "Alice Updated" });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/personnel/p1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });

  describe("useDeletePersonnel", () => {
    it("sends DELETE to /api/personnel/:id", async () => {
      mockFetch.mockReturnValueOnce(
        Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response)
      );
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDeletePersonnel(), { wrapper });

      await act(async () => {
        result.current.mutate("p1");
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/personnel/p1", {
        method: "DELETE",
      });
    });
  });
});

// ===========================================================================
// 4. use-publications
// ===========================================================================
describe("use-publications", () => {
  describe("usePublications", () => {
    it("fetches publications with no filters", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ data: [], count: 0 }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => usePublications(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it("fetches with status filter", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ data: [], count: 0 }));
      const { wrapper } = createWrapper();
      renderHook(() => usePublications({ status: "published" as any }), { wrapper });

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("status=published");
    });

    it("fetches with year filter", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ data: [], count: 0 }));
      const { wrapper } = createWrapper();
      renderHook(() => usePublications({ year: 2024 }), { wrapper });

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("year=2024");
    });
  });

  describe("usePublication", () => {
    it("fetches a single publication", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ id: "pub1" }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => usePublication("pub1"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/publications/pub1");
    });
  });

  describe("useCreatePublication", () => {
    it("sends POST to /api/publications", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ id: "pub2" }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useCreatePublication(), { wrapper });

      await act(async () => {
        result.current.mutate({ title: "New Paper" } as any);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/publications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });

  describe("useUpdatePublication", () => {
    it("sends PATCH to /api/publications/:id", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ id: "pub1" }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useUpdatePublication(), { wrapper });

      await act(async () => {
        result.current.mutate({ id: "pub1", title: "Updated" });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/publications/pub1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });

  describe("useDeletePublication", () => {
    it("sends DELETE to /api/publications/:id", async () => {
      mockFetch.mockReturnValueOnce(
        Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response)
      );
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDeletePublication(), { wrapper });

      await act(async () => {
        result.current.mutate("pub1");
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe("useImportFromDOI", () => {
    it("sends POST to /api/publications/import", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ id: "pub3" }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useImportFromDOI(), { wrapper });

      await act(async () => {
        result.current.mutate({ doi: "10.1234/test" });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/publications/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });

    it("handles 409 conflict with existing publication", async () => {
      mockFetch.mockReturnValueOnce(
        Promise.resolve({
          ok: false,
          status: 409,
          json: () => Promise.resolve({ error: "Exists", existingId: "pub-old" }),
        } as Response)
      );
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useImportFromDOI(), { wrapper });

      await act(async () => {
        result.current.mutate({ doi: "10.1234/dup" });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toContain("pub-old");
    });
  });
});

// ===========================================================================
// 5. use-workspaces
// ===========================================================================
describe("use-workspaces", () => {
  describe("useWorkspaces", () => {
    it("fetches user workspaces", async () => {
      mockFetch.mockReturnValueOnce(okResponse([]));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useWorkspaces(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/workspaces");
    });
  });

  describe("useWorkspace", () => {
    it("is disabled when id is null", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useWorkspace(null), { wrapper });
      expect(result.current.fetchStatus).toBe("idle");
    });

    it("fetches a single workspace", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ id: "ws-1", name: "Lab" }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useWorkspace("ws-1"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/workspaces/ws-1");
    });
  });

  describe("useWorkspaceMembers", () => {
    it("is disabled when workspaceId is null", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useWorkspaceMembers(null), { wrapper });
      expect(result.current.fetchStatus).toBe("idle");
    });

    it("fetches members", async () => {
      mockFetch.mockReturnValueOnce(okResponse([]));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useWorkspaceMembers("ws-1"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/workspaces/ws-1/members");
    });
  });

  describe("useWorkspaceInvites", () => {
    it("is disabled when workspaceId is null", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useWorkspaceInvites(null), { wrapper });
      expect(result.current.fetchStatus).toBe("idle");
    });

    it("fetches invites", async () => {
      mockFetch.mockReturnValueOnce(okResponse([]));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useWorkspaceInvites("ws-1"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/workspaces/ws-1/invites");
    });
  });

  describe("useCreateWorkspace", () => {
    it("sends POST to /api/workspaces", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ id: "ws-2" }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useCreateWorkspace(), { wrapper });

      await act(async () => {
        result.current.mutate({ name: "New Lab", slug: "new-lab" });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });

  describe("useUpdateWorkspace", () => {
    it("sends PATCH to /api/workspaces/:id", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ id: "ws-1" }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useUpdateWorkspace(), { wrapper });

      await act(async () => {
        result.current.mutate({ id: "ws-1", name: "Updated Lab" });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/workspaces/ws-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });

  describe("useInviteMember", () => {
    it("sends POST to /api/workspaces/:id/invites", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ id: "inv-1" }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useInviteMember(), { wrapper });

      await act(async () => {
        result.current.mutate({
          workspaceId: "ws-1",
          email: "test@test.com",
          role: "member" as any,
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/workspaces/ws-1/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });

  describe("useCancelInvite", () => {
    it("sends DELETE to /api/workspaces/:id/invites/:inviteId", async () => {
      mockFetch.mockReturnValueOnce(
        Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response)
      );
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useCancelInvite(), { wrapper });

      await act(async () => {
        result.current.mutate({ workspaceId: "ws-1", inviteId: "inv-1" });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/workspaces/ws-1/invites/inv-1", {
        method: "DELETE",
      });
    });
  });

  describe("useUpdateMemberRole", () => {
    it("sends PATCH to /api/workspaces/:id/members/:memberId", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ id: "m1" }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useUpdateMemberRole(), { wrapper });

      await act(async () => {
        result.current.mutate({
          workspaceId: "ws-1",
          memberId: "m1",
          role: "admin" as any,
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/workspaces/ws-1/members/m1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });

  describe("useRemoveMember", () => {
    it("sends DELETE to /api/workspaces/:id/members/:memberId", async () => {
      mockFetch.mockReturnValueOnce(
        Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response)
      );
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useRemoveMember(), { wrapper });

      await act(async () => {
        result.current.mutate({ workspaceId: "ws-1", memberId: "m1" });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe("useAcceptInvite", () => {
    it("sends POST to /api/workspaces/accept-invite", async () => {
      mockFetch.mockReturnValueOnce(
        okResponse({ workspace_id: "ws-1", role: "member" })
      );
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useAcceptInvite(), { wrapper });

      await act(async () => {
        result.current.mutate("some-token");
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/workspaces/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });
});

// ===========================================================================
// 6. use-documents
// ===========================================================================
describe("use-documents", () => {
  describe("documentKeys", () => {
    it("all key is ['documents']", () => {
      expect(documentKeys.all).toEqual(["documents"]);
    });

    it("list key includes filters", () => {
      expect(documentKeys.list({ workspace_id: "ws-1" })).toEqual([
        "documents",
        "list",
        { workspace_id: "ws-1" },
      ]);
    });

    it("detail key includes id", () => {
      expect(documentKeys.detail("d1")).toEqual(["documents", "detail", "d1"]);
    });
  });

  describe("useDocuments", () => {
    it("fetches documents", async () => {
      mockFetch.mockReturnValueOnce(okResponse([]));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDocuments(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it("fetches with workspace filter", async () => {
      mockFetch.mockReturnValueOnce(okResponse([]));
      const { wrapper } = createWrapper();
      renderHook(() => useDocuments({ workspace_id: "ws-1" }), { wrapper });

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("workspace_id=ws-1");
    });
  });

  describe("useDocumentById", () => {
    it("is disabled when id is undefined", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDocumentById(undefined), { wrapper });
      expect(result.current.fetchStatus).toBe("idle");
    });

    it("fetches a single document", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ id: "d1" }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDocumentById("d1"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/documents/d1");
    });
  });

  describe("useDeleteDocument", () => {
    it("sends DELETE to /api/documents/:id", async () => {
      mockFetch.mockReturnValueOnce(
        Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response)
      );
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDeleteDocument(), { wrapper });

      await act(async () => {
        result.current.mutate("d1");
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/documents/d1", {
        method: "DELETE",
      });
    });
  });

  describe("useProcessDocument", () => {
    it("sends POST to /api/documents/:id/process", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ success: true }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useProcessDocument(), { wrapper });

      await act(async () => {
        result.current.mutate({
          id: "d1",
          extraction_type: "general",
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/documents/d1/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });

  // --- Helpers ---
  describe("formatFileSize", () => {
    it("formats bytes", () => {
      expect(formatFileSize(500)).toBe("500 B");
    });

    it("formats kilobytes", () => {
      expect(formatFileSize(2048)).toBe("2.0 KB");
    });

    it("formats megabytes", () => {
      expect(formatFileSize(1048576)).toBe("1.0 MB");
    });

    it("formats large files", () => {
      expect(formatFileSize(5242880)).toBe("5.0 MB");
    });
  });

  describe("getFileTypeLabel", () => {
    it("returns PDF for application/pdf", () => {
      expect(getFileTypeLabel("application/pdf")).toBe("PDF");
    });

    it("returns Word for docx mime type", () => {
      expect(
        getFileTypeLabel(
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
      ).toBe("Word");
    });

    it("returns Text for text/plain", () => {
      expect(getFileTypeLabel("text/plain")).toBe("Text");
    });

    it("returns File for unknown types", () => {
      expect(getFileTypeLabel("application/octet-stream")).toBe("File");
    });
  });
});
