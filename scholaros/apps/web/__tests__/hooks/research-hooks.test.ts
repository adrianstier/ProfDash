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
// Imports under test
// ---------------------------------------------------------------------------
import {
  fieldSiteKeys,
  useFieldSites,
  useFieldSite,
  useCreateFieldSite,
  useUpdateFieldSite,
  useDeleteFieldSite,
} from "@/lib/hooks/use-field-sites";

import {
  experimentKeys,
  useExperiments,
  useExperiment,
  useCreateExperiment,
  useUpdateExperiment,
  useDeleteExperiment,
  EXPERIMENT_STATUS_CONFIG,
  getExperimentStatusConfig,
} from "@/lib/hooks/use-experiments";

import {
  permitKeys,
  usePermits,
  usePermit,
  useCreatePermit,
  useUpdatePermit,
  useDeletePermit,
  PERMIT_STATUS_CONFIG,
  PERMIT_TYPE_CONFIG,
  getPermitStatusConfig,
  getPermitTypeConfig,
  getDaysUntilExpiration,
  getExpirationUrgency,
} from "@/lib/hooks/use-permits";

import {
  fieldworkKeys,
  useFieldworkSchedules,
  useCreateFieldworkSchedule,
  useUpdateFieldworkSchedule,
  useDeleteFieldworkSchedule,
  FIELDWORK_STATUS_CONFIG,
  getFieldworkStatusConfig,
  isUpcomingFieldwork,
  getDaysUntilFieldwork,
  getFieldworkDuration,
} from "@/lib/hooks/use-fieldwork";

import {
  experimentTeamKeys,
  useExperimentTeam,
  useAddTeamMember,
  useRemoveTeamMember,
  TEAM_ROLE_CONFIG,
  getTeamRoleConfig,
} from "@/lib/hooks/use-experiment-team";

// ---------------------------------------------------------------------------
beforeEach(() => {
  mockFetch.mockReset();
});

// ===========================================================================
// 1. use-field-sites
// ===========================================================================
describe("use-field-sites", () => {
  // --- Query key tests ---
  describe("fieldSiteKeys", () => {
    it("all key is ['field-sites']", () => {
      expect(fieldSiteKeys.all).toEqual(["field-sites"]);
    });

    it("lists key appends 'list'", () => {
      expect(fieldSiteKeys.lists()).toEqual(["field-sites", "list"]);
    });

    it("list key includes workspaceId and activeOnly", () => {
      expect(fieldSiteKeys.list("ws-1", true)).toEqual([
        "field-sites",
        "list",
        "ws-1",
        { activeOnly: true },
      ]);
    });

    it("list key defaults activeOnly to undefined", () => {
      expect(fieldSiteKeys.list("ws-1")).toEqual([
        "field-sites",
        "list",
        "ws-1",
        { activeOnly: undefined },
      ]);
    });

    it("detail key includes the id", () => {
      expect(fieldSiteKeys.detail("site-1")).toEqual([
        "field-sites",
        "detail",
        "site-1",
      ]);
    });
  });

  // --- useFieldSites ---
  describe("useFieldSites", () => {
    it("is disabled when workspaceId is null", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useFieldSites(null), { wrapper });
      expect(result.current.fetchStatus).toBe("idle");
    });

    it("fetches field sites for a valid workspaceId", async () => {
      const sites = [{ id: "s1", name: "Site A" }];
      mockFetch.mockReturnValueOnce(okResponse(sites));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useFieldSites("ws-1"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(sites);
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/research/sites?workspace_id=ws-1"
      );
    });

    it("appends active_only param when activeOnly is true", async () => {
      mockFetch.mockReturnValueOnce(okResponse([]));
      const { wrapper } = createWrapper();
      renderHook(() => useFieldSites("ws-1", true), { wrapper });

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/research/sites?workspace_id=ws-1&active_only=true"
      );
    });

    it("throws on fetch error", async () => {
      mockFetch.mockReturnValueOnce(
        errorResponse(500, { error: "Server error" })
      );
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useFieldSites("ws-1"), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe("Server error");
    });
  });

  // --- useFieldSite ---
  describe("useFieldSite", () => {
    it("is disabled when siteId is null", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useFieldSite(null), { wrapper });
      expect(result.current.fetchStatus).toBe("idle");
    });

    it("fetches a single field site", async () => {
      const site = { id: "s1", name: "Site A" };
      mockFetch.mockReturnValueOnce(okResponse(site));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useFieldSite("s1"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/research/sites/s1");
    });
  });

  // --- useCreateFieldSite ---
  describe("useCreateFieldSite", () => {
    it("sends POST to /api/research/sites", async () => {
      const newSite = { id: "s2", name: "Site B" };
      mockFetch.mockReturnValueOnce(okResponse(newSite));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useCreateFieldSite(), { wrapper });

      await act(async () => {
        result.current.mutate({ name: "Site B", workspace_id: "ws-1" } as any);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/research/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });

  // --- useUpdateFieldSite ---
  describe("useUpdateFieldSite", () => {
    it("sends PATCH to /api/research/sites/:id", async () => {
      const updated = { id: "s1", name: "Updated Site" };
      mockFetch.mockReturnValueOnce(okResponse(updated));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useUpdateFieldSite(), { wrapper });

      await act(async () => {
        result.current.mutate({ id: "s1", name: "Updated Site" } as any);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/research/sites/s1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });

  // --- useDeleteFieldSite ---
  describe("useDeleteFieldSite", () => {
    it("sends DELETE to /api/research/sites/:id", async () => {
      mockFetch.mockReturnValueOnce(
        Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response)
      );

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDeleteFieldSite(), { wrapper });

      await act(async () => {
        result.current.mutate("s1");
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/research/sites/s1", {
        method: "DELETE",
      });
    });
  });
});

// ===========================================================================
// 2. use-experiments
// ===========================================================================
describe("use-experiments", () => {
  describe("experimentKeys", () => {
    it("all key is ['experiments']", () => {
      expect(experimentKeys.all).toEqual(["experiments"]);
    });

    it("list key includes projectId and filters", () => {
      expect(experimentKeys.list("p1", { status: "active" })).toEqual([
        "experiments",
        "list",
        "p1",
        { status: "active" },
      ]);
    });

    it("list key with no filters", () => {
      expect(experimentKeys.list("p1")).toEqual([
        "experiments",
        "list",
        "p1",
        undefined,
      ]);
    });

    it("detail key includes the id", () => {
      expect(experimentKeys.detail("exp-1")).toEqual([
        "experiments",
        "detail",
        "exp-1",
      ]);
    });
  });

  describe("useExperiments", () => {
    it("is disabled when projectId is null", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useExperiments(null), { wrapper });
      expect(result.current.fetchStatus).toBe("idle");
    });

    it("fetches experiments without filters", async () => {
      mockFetch.mockReturnValueOnce(okResponse([]));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useExperiments("p1"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/research/projects/p1/experiments"
      );
    });

    it("fetches experiments with status filter", async () => {
      mockFetch.mockReturnValueOnce(okResponse([]));
      const { wrapper } = createWrapper();
      renderHook(() => useExperiments("p1", { status: "active" as any }), {
        wrapper,
      });

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/research/projects/p1/experiments?status=active"
      );
    });

    it("fetches experiments with siteId filter", async () => {
      mockFetch.mockReturnValueOnce(okResponse([]));
      const { wrapper } = createWrapper();
      renderHook(() => useExperiments("p1", { siteId: "site-1" }), {
        wrapper,
      });

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/research/projects/p1/experiments?site_id=site-1"
      );
    });

    it("fetches experiments with both filters", async () => {
      mockFetch.mockReturnValueOnce(okResponse([]));
      const { wrapper } = createWrapper();
      renderHook(
        () => useExperiments("p1", { status: "active" as any, siteId: "site-1" }),
        { wrapper }
      );

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/research/projects/p1/experiments?status=active&site_id=site-1"
      );
    });
  });

  describe("useExperiment", () => {
    it("is disabled when projectId is null", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useExperiment(null, "e1"), {
        wrapper,
      });
      expect(result.current.fetchStatus).toBe("idle");
    });

    it("is disabled when experimentId is null", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useExperiment("p1", null), {
        wrapper,
      });
      expect(result.current.fetchStatus).toBe("idle");
    });

    it("fetches a single experiment", async () => {
      const exp = { id: "e1", title: "Experiment 1" };
      mockFetch.mockReturnValueOnce(okResponse(exp));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useExperiment("p1", "e1"), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/research/projects/p1/experiments/e1"
      );
    });
  });

  describe("useCreateExperiment", () => {
    it("sends POST to project experiments endpoint", async () => {
      const exp = { id: "e2", title: "New Experiment" };
      mockFetch.mockReturnValueOnce(okResponse(exp));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useCreateExperiment("p1"), {
        wrapper,
      });

      await act(async () => {
        result.current.mutate({ title: "New Experiment" } as any);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/research/projects/p1/experiments",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: expect.any(String),
        }
      );
    });
  });

  describe("useUpdateExperiment", () => {
    it("sends PATCH to specific experiment endpoint", async () => {
      const exp = { id: "e1", title: "Updated" };
      mockFetch.mockReturnValueOnce(okResponse(exp));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useUpdateExperiment("p1"), {
        wrapper,
      });

      await act(async () => {
        result.current.mutate({
          experimentId: "e1",
          title: "Updated",
        } as any);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/research/projects/p1/experiments/e1",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: expect.any(String),
        }
      );
    });
  });

  describe("useDeleteExperiment", () => {
    it("sends DELETE to specific experiment endpoint", async () => {
      mockFetch.mockReturnValueOnce(
        Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response)
      );

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDeleteExperiment("p1"), {
        wrapper,
      });

      await act(async () => {
        result.current.mutate("e1");
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/research/projects/p1/experiments/e1",
        { method: "DELETE" }
      );
    });
  });

  describe("status helpers", () => {
    it("EXPERIMENT_STATUS_CONFIG has all statuses", () => {
      const statuses = ["planning", "active", "fieldwork", "analysis", "completed", "on_hold"];
      for (const s of statuses) {
        expect(EXPERIMENT_STATUS_CONFIG[s as keyof typeof EXPERIMENT_STATUS_CONFIG]).toBeDefined();
      }
    });

    it("getExperimentStatusConfig returns config for valid status", () => {
      const config = getExperimentStatusConfig("active");
      expect(config.label).toBe("Active");
    });
  });
});

// ===========================================================================
// 3. use-permits
// ===========================================================================
describe("use-permits", () => {
  describe("permitKeys", () => {
    it("all key is ['permits']", () => {
      expect(permitKeys.all).toEqual(["permits"]);
    });

    it("list key includes projectId and filters", () => {
      expect(permitKeys.list("p1", { status: "active" })).toEqual([
        "permits",
        "list",
        "p1",
        { status: "active" },
      ]);
    });

    it("detail key includes the id", () => {
      expect(permitKeys.detail("perm-1")).toEqual([
        "permits",
        "detail",
        "perm-1",
      ]);
    });

    it("expiring key includes workspaceId and days", () => {
      expect(permitKeys.expiring("ws-1", 30)).toEqual([
        "permits",
        "expiring",
        "ws-1",
        30,
      ]);
    });
  });

  describe("usePermits", () => {
    it("is disabled when projectId is null", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => usePermits(null), { wrapper });
      expect(result.current.fetchStatus).toBe("idle");
    });

    it("fetches permits without filters", async () => {
      mockFetch.mockReturnValueOnce(okResponse([]));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => usePermits("p1"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/research/projects/p1/permits"
      );
    });

    it("fetches permits with status filter", async () => {
      mockFetch.mockReturnValueOnce(okResponse([]));
      const { wrapper } = createWrapper();
      renderHook(() => usePermits("p1", { status: "active" as any }), {
        wrapper,
      });

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/research/projects/p1/permits?status=active"
      );
    });

    it("fetches permits with permitType filter", async () => {
      mockFetch.mockReturnValueOnce(okResponse([]));
      const { wrapper } = createWrapper();
      renderHook(() => usePermits("p1", { permitType: "IACUC" as any }), {
        wrapper,
      });

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/research/projects/p1/permits?permit_type=IACUC"
      );
    });

    it("fetches permits with includeExpired filter", async () => {
      mockFetch.mockReturnValueOnce(okResponse([]));
      const { wrapper } = createWrapper();
      renderHook(() => usePermits("p1", { includeExpired: true }), {
        wrapper,
      });

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/research/projects/p1/permits?include_expired=true"
      );
    });
  });

  describe("usePermit", () => {
    it("is disabled when projectId is null", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => usePermit(null, "perm-1"), {
        wrapper,
      });
      expect(result.current.fetchStatus).toBe("idle");
    });

    it("is disabled when permitId is null", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => usePermit("p1", null), {
        wrapper,
      });
      expect(result.current.fetchStatus).toBe("idle");
    });

    it("fetches a single permit", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ id: "perm-1" }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => usePermit("p1", "perm-1"), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/research/projects/p1/permits/perm-1"
      );
    });
  });

  describe("useCreatePermit", () => {
    it("sends POST to project permits endpoint", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ id: "perm-2" }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useCreatePermit("p1"), { wrapper });

      await act(async () => {
        result.current.mutate({ permit_number: "P-001" } as any);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/research/projects/p1/permits",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: expect.any(String),
        }
      );
    });
  });

  describe("useUpdatePermit", () => {
    it("sends PATCH to specific permit endpoint", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ id: "perm-1" }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useUpdatePermit("p1"), { wrapper });

      await act(async () => {
        result.current.mutate({ permitId: "perm-1", status: "active" } as any);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/research/projects/p1/permits/perm-1",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: expect.any(String),
        }
      );
    });
  });

  describe("useDeletePermit", () => {
    it("sends DELETE to specific permit endpoint", async () => {
      mockFetch.mockReturnValueOnce(
        Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response)
      );
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDeletePermit("p1"), { wrapper });

      await act(async () => {
        result.current.mutate("perm-1");
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/research/projects/p1/permits/perm-1",
        { method: "DELETE" }
      );
    });
  });

  describe("status and type helpers", () => {
    it("PERMIT_STATUS_CONFIG has all statuses", () => {
      const statuses = ["pending", "active", "expired", "renewal_pending", "suspended"];
      for (const s of statuses) {
        expect(PERMIT_STATUS_CONFIG[s as keyof typeof PERMIT_STATUS_CONFIG]).toBeDefined();
      }
    });

    it("getPermitStatusConfig returns correct config", () => {
      expect(getPermitStatusConfig("active").label).toBe("Active");
    });

    it("PERMIT_TYPE_CONFIG has all types", () => {
      const types = [
        "IACUC", "IBC", "collection", "CITES", "export",
        "import", "IRB", "MOU", "institutional", "other",
      ];
      for (const t of types) {
        expect(PERMIT_TYPE_CONFIG[t as keyof typeof PERMIT_TYPE_CONFIG]).toBeDefined();
      }
    });

    it("getPermitTypeConfig returns correct config", () => {
      expect(getPermitTypeConfig("IACUC").label).toBe("IACUC");
    });
  });

  describe("getDaysUntilExpiration", () => {
    it("returns null for null input", () => {
      expect(getDaysUntilExpiration(null)).toBeNull();
    });

    it("returns null for undefined input", () => {
      expect(getDaysUntilExpiration(undefined)).toBeNull();
    });

    it("returns positive days for future date", () => {
      const future = new Date();
      future.setDate(future.getDate() + 10);
      expect(getDaysUntilExpiration(future)).toBe(10);
    });

    it("returns 0 for today", () => {
      const today = new Date();
      expect(getDaysUntilExpiration(today)).toBe(0);
    });

    it("returns negative days for past date", () => {
      const past = new Date();
      past.setDate(past.getDate() - 5);
      expect(getDaysUntilExpiration(past)).toBe(-5);
    });

    it("handles string date input", () => {
      const future = new Date();
      future.setDate(future.getDate() + 7);
      const result = getDaysUntilExpiration(future.toISOString());
      expect(result).toBe(7);
    });
  });

  describe("getExpirationUrgency", () => {
    it("returns null for null date", () => {
      expect(getExpirationUrgency(null)).toBeNull();
    });

    it("returns 'expired' for past date", () => {
      const past = new Date();
      past.setDate(past.getDate() - 1);
      expect(getExpirationUrgency(past)).toBe("expired");
    });

    it("returns 'critical' for date within 14 days", () => {
      const soon = new Date();
      soon.setDate(soon.getDate() + 7);
      expect(getExpirationUrgency(soon)).toBe("critical");
    });

    it("returns 'warning' for date within reminderDays", () => {
      const upcoming = new Date();
      upcoming.setDate(upcoming.getDate() + 30);
      expect(getExpirationUrgency(upcoming, 60)).toBe("warning");
    });

    it("returns 'ok' for date far in the future", () => {
      const far = new Date();
      far.setDate(far.getDate() + 365);
      expect(getExpirationUrgency(far)).toBe("ok");
    });
  });
});

// ===========================================================================
// 4. use-fieldwork
// ===========================================================================
describe("use-fieldwork", () => {
  describe("fieldworkKeys", () => {
    it("all key is ['fieldwork']", () => {
      expect(fieldworkKeys.all).toEqual(["fieldwork"]);
    });

    it("list key includes projectId, experimentId, and filters", () => {
      expect(
        fieldworkKeys.list("p1", "e1", { status: "planned" })
      ).toEqual(["fieldwork", "list", "p1", "e1", { status: "planned" }]);
    });

    it("projectList key includes projectId", () => {
      expect(fieldworkKeys.projectList("p1")).toEqual([
        "fieldwork",
        "project",
        "p1",
      ]);
    });
  });

  describe("useFieldworkSchedules", () => {
    it("is disabled when projectId is null", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () => useFieldworkSchedules(null, "e1"),
        { wrapper }
      );
      expect(result.current.fetchStatus).toBe("idle");
    });

    it("is disabled when experimentId is null", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () => useFieldworkSchedules("p1", null),
        { wrapper }
      );
      expect(result.current.fetchStatus).toBe("idle");
    });

    it("fetches fieldwork schedules without filters", async () => {
      mockFetch.mockReturnValueOnce(okResponse([]));
      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () => useFieldworkSchedules("p1", "e1"),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/research/projects/p1/experiments/e1/fieldwork"
      );
    });

    it("fetches fieldwork schedules with status filter", async () => {
      mockFetch.mockReturnValueOnce(okResponse([]));
      const { wrapper } = createWrapper();
      renderHook(
        () => useFieldworkSchedules("p1", "e1", { status: "planned" as any }),
        { wrapper }
      );

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/research/projects/p1/experiments/e1/fieldwork?status=planned"
      );
    });
  });

  describe("useCreateFieldworkSchedule", () => {
    it("sends POST to fieldwork endpoint", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ id: "fw-1" }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () => useCreateFieldworkSchedule("p1", "e1"),
        { wrapper }
      );

      await act(async () => {
        result.current.mutate({ title: "Field trip" } as any);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/research/projects/p1/experiments/e1/fieldwork",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: expect.any(String),
        }
      );
    });
  });

  describe("useUpdateFieldworkSchedule", () => {
    it("sends PATCH to fieldwork endpoint with schedule_id param", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ id: "fw-1" }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () => useUpdateFieldworkSchedule("p1", "e1"),
        { wrapper }
      );

      await act(async () => {
        result.current.mutate({
          scheduleId: "fw-1",
          status: "confirmed",
        } as any);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/research/projects/p1/experiments/e1/fieldwork?schedule_id=fw-1",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: expect.any(String),
        }
      );
    });
  });

  describe("useDeleteFieldworkSchedule", () => {
    it("sends DELETE to fieldwork endpoint with schedule_id param", async () => {
      mockFetch.mockReturnValueOnce(
        Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response)
      );
      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () => useDeleteFieldworkSchedule("p1", "e1"),
        { wrapper }
      );

      await act(async () => {
        result.current.mutate("fw-1");
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/research/projects/p1/experiments/e1/fieldwork?schedule_id=fw-1",
        { method: "DELETE" }
      );
    });
  });

  describe("status helpers", () => {
    it("FIELDWORK_STATUS_CONFIG has all statuses", () => {
      const statuses = ["planned", "confirmed", "in_progress", "completed", "cancelled"];
      for (const s of statuses) {
        expect(
          FIELDWORK_STATUS_CONFIG[s as keyof typeof FIELDWORK_STATUS_CONFIG]
        ).toBeDefined();
      }
    });

    it("getFieldworkStatusConfig returns config for valid status", () => {
      expect(getFieldworkStatusConfig("confirmed").label).toBe("Confirmed");
    });
  });

  describe("isUpcomingFieldwork", () => {
    it("returns false for null", () => {
      expect(isUpcomingFieldwork(null)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(isUpcomingFieldwork(undefined)).toBe(false);
    });

    it("returns true for a date within 30 days", () => {
      const soon = new Date();
      soon.setDate(soon.getDate() + 15);
      expect(isUpcomingFieldwork(soon)).toBe(true);
    });

    it("returns false for a date beyond daysAhead", () => {
      const far = new Date();
      far.setDate(far.getDate() + 60);
      expect(isUpcomingFieldwork(far, 30)).toBe(false);
    });

    it("returns false for a past date", () => {
      const past = new Date();
      past.setDate(past.getDate() - 5);
      expect(isUpcomingFieldwork(past)).toBe(false);
    });

    it("returns true for today", () => {
      const today = new Date();
      expect(isUpcomingFieldwork(today)).toBe(true);
    });
  });

  describe("getDaysUntilFieldwork", () => {
    it("returns null for null", () => {
      expect(getDaysUntilFieldwork(null)).toBeNull();
    });

    it("returns positive number for future date", () => {
      const future = new Date();
      future.setDate(future.getDate() + 10);
      expect(getDaysUntilFieldwork(future)).toBe(10);
    });
  });

  describe("getFieldworkDuration", () => {
    it("returns null if start is null", () => {
      expect(getFieldworkDuration(null, new Date())).toBeNull();
    });

    it("returns null if end is null", () => {
      expect(getFieldworkDuration(new Date(), null)).toBeNull();
    });

    it("returns 1 for same-day start and end", () => {
      const date = new Date("2025-06-15");
      expect(getFieldworkDuration(date, date)).toBe(1);
    });

    it("returns correct duration for multi-day range", () => {
      const start = new Date("2025-06-15");
      const end = new Date("2025-06-20");
      expect(getFieldworkDuration(start, end)).toBe(6); // 5 days + 1 inclusive
    });

    it("handles string dates", () => {
      expect(getFieldworkDuration("2025-06-15", "2025-06-17")).toBe(3);
    });
  });
});

// ===========================================================================
// 5. use-experiment-team
// ===========================================================================
describe("use-experiment-team", () => {
  describe("experimentTeamKeys", () => {
    it("all key is ['experiment-team']", () => {
      expect(experimentTeamKeys.all).toEqual(["experiment-team"]);
    });

    it("list key includes projectId and experimentId", () => {
      expect(experimentTeamKeys.list("p1", "e1")).toEqual([
        "experiment-team",
        "list",
        "p1",
        "e1",
      ]);
    });
  });

  describe("useExperimentTeam", () => {
    it("is disabled when projectId is null", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () => useExperimentTeam(null, "e1"),
        { wrapper }
      );
      expect(result.current.fetchStatus).toBe("idle");
    });

    it("is disabled when experimentId is null", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () => useExperimentTeam("p1", null),
        { wrapper }
      );
      expect(result.current.fetchStatus).toBe("idle");
    });

    it("fetches team assignments", async () => {
      const members = [{ id: "m1", role: "lead" }];
      mockFetch.mockReturnValueOnce(okResponse(members));
      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () => useExperimentTeam("p1", "e1"),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(members);
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/research/projects/p1/experiments/e1/team"
      );
    });
  });

  describe("useAddTeamMember", () => {
    it("sends POST to team endpoint", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ id: "m2" }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () => useAddTeamMember("p1", "e1"),
        { wrapper }
      );

      await act(async () => {
        result.current.mutate({ user_id: "u1", role: "contributor" } as any);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/research/projects/p1/experiments/e1/team",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: expect.any(String),
        }
      );
    });
  });

  describe("useRemoveTeamMember", () => {
    it("sends DELETE to team endpoint with assignment_id param", async () => {
      mockFetch.mockReturnValueOnce(
        Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response)
      );
      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () => useRemoveTeamMember("p1", "e1"),
        { wrapper }
      );

      await act(async () => {
        result.current.mutate("assign-1");
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/research/projects/p1/experiments/e1/team?assignment_id=assign-1",
        { method: "DELETE" }
      );
    });
  });

  describe("role helpers", () => {
    it("TEAM_ROLE_CONFIG has all roles", () => {
      const roles = [
        "lead", "co_lead", "contributor",
        "field_assistant", "data_analyst", "consultant",
      ];
      for (const r of roles) {
        expect(
          TEAM_ROLE_CONFIG[r as keyof typeof TEAM_ROLE_CONFIG]
        ).toBeDefined();
      }
    });

    it("getTeamRoleConfig returns config for valid role", () => {
      expect(getTeamRoleConfig("lead").label).toBe("Lead");
    });

    it("getTeamRoleConfig returns contributor for unknown role", () => {
      expect(getTeamRoleConfig("unknown_role" as any).label).toBe("Contributor");
    });
  });
});
