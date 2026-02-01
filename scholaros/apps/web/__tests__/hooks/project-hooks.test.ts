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
  useProjects,
  useProject,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useMilestones,
  useCreateMilestone,
  useUpdateMilestone,
  useDeleteMilestone,
  useNotes,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
} from "@/lib/hooks/use-projects";

import {
  usePhases,
  usePhase,
  useCreatePhase,
  useUpdatePhase,
  useDeletePhase,
  useStartPhase,
  useCompletePhase,
  useWorkstreams,
  useWorkstream,
  useCreateWorkstream,
  useUpdateWorkstream,
  useDeleteWorkstream,
  useDeliverables,
  useCreateDeliverable,
  useUpdateDeliverable,
  useDeleteDeliverable,
  useRoles,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  useAssignments,
  useCreateAssignment,
  useDeleteAssignment,
  useApplyTemplate,
} from "@/lib/hooks/use-project-hierarchy";

import {
  useTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  RSE_7_PHASE_TEMPLATE,
} from "@/lib/hooks/use-templates";

// ---------------------------------------------------------------------------
beforeEach(() => {
  mockFetch.mockReset();
});

// ===========================================================================
// 1. use-projects
// ===========================================================================
describe("use-projects", () => {
  describe("useProjects", () => {
    it("is disabled when workspace_id is empty", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () => useProjects({ workspace_id: "" }),
        { wrapper }
      );
      expect(result.current.fetchStatus).toBe("idle");
    });

    it("fetches projects with workspace_id", async () => {
      const projects = [{ id: "p1", title: "Project 1" }];
      mockFetch.mockReturnValueOnce(okResponse(projects));

      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () => useProjects({ workspace_id: "ws-1" }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(projects);
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("workspace_id=ws-1");
    });

    it("fetches projects with type filter", async () => {
      mockFetch.mockReturnValueOnce(okResponse([]));
      const { wrapper } = createWrapper();
      renderHook(
        () => useProjects({ workspace_id: "ws-1", type: "manuscript" }),
        { wrapper }
      );

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("type=manuscript");
    });

    it("fetches projects with status filter", async () => {
      mockFetch.mockReturnValueOnce(okResponse([]));
      const { wrapper } = createWrapper();
      renderHook(
        () => useProjects({ workspace_id: "ws-1", status: "active" }),
        { wrapper }
      );

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("status=active");
    });

    it("throws on fetch error", async () => {
      mockFetch.mockReturnValueOnce(
        Promise.resolve({ ok: false, json: () => Promise.resolve({}) } as Response)
      );
      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () => useProjects({ workspace_id: "ws-1" }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useProject", () => {
    it("is disabled when id is null", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useProject(null), { wrapper });
      expect(result.current.fetchStatus).toBe("idle");
    });

    it("fetches a single project", async () => {
      const project = { id: "p1", title: "Project 1", milestones: [], notes: [], tasks: [] };
      mockFetch.mockReturnValueOnce(okResponse(project));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useProject("p1"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/projects/p1");
    });
  });

  describe("useCreateProject", () => {
    it("sends POST to /api/projects", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ id: "p2" }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useCreateProject(), { wrapper });

      await act(async () => {
        result.current.mutate({ workspace_id: "ws-1", title: "New", type: "general", status: "active" } as any);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });

  describe("useUpdateProject", () => {
    it("sends PATCH to /api/projects/:id", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ id: "p1", title: "Updated" }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useUpdateProject(), { wrapper });

      await act(async () => {
        result.current.mutate({ id: "p1", title: "Updated" });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/projects/p1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });

  describe("useDeleteProject", () => {
    it("sends DELETE to /api/projects/:id", async () => {
      mockFetch.mockReturnValueOnce(
        Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response)
      );
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDeleteProject(), { wrapper });

      await act(async () => {
        result.current.mutate("p1");
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/projects/p1", {
        method: "DELETE",
      });
    });
  });

  // --- Milestones ---
  describe("useMilestones", () => {
    it("is disabled when projectId is null", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useMilestones(null), { wrapper });
      expect(result.current.fetchStatus).toBe("idle");
    });

    it("fetches milestones", async () => {
      const milestones = [{ id: "m1", title: "Milestone 1" }];
      mockFetch.mockReturnValueOnce(okResponse(milestones));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useMilestones("p1"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/projects/p1/milestones");
    });
  });

  describe("useCreateMilestone", () => {
    it("sends POST to /api/projects/:id/milestones", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ id: "m2" }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useCreateMilestone(), { wrapper });

      await act(async () => {
        result.current.mutate({ projectId: "p1", title: "New Milestone" });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/projects/p1/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });

  describe("useUpdateMilestone", () => {
    it("sends PATCH to /api/projects/:id/milestones/:id", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ id: "m1" }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useUpdateMilestone(), { wrapper });

      await act(async () => {
        result.current.mutate({ projectId: "p1", milestoneId: "m1", title: "Updated" });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/projects/p1/milestones/m1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });

  describe("useDeleteMilestone", () => {
    it("sends DELETE to /api/projects/:id/milestones/:id", async () => {
      mockFetch.mockReturnValueOnce(
        Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response)
      );
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDeleteMilestone(), { wrapper });

      await act(async () => {
        result.current.mutate({ projectId: "p1", milestoneId: "m1" });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/projects/p1/milestones/m1", {
        method: "DELETE",
      });
    });
  });

  // --- Notes ---
  describe("useNotes", () => {
    it("is disabled when projectId is null", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useNotes(null), { wrapper });
      expect(result.current.fetchStatus).toBe("idle");
    });

    it("fetches notes", async () => {
      mockFetch.mockReturnValueOnce(okResponse([{ id: "n1", content: "Note" }]));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useNotes("p1"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/projects/p1/notes");
    });
  });

  describe("useCreateNote", () => {
    it("sends POST to /api/projects/:id/notes", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ id: "n2" }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useCreateNote(), { wrapper });

      await act(async () => {
        result.current.mutate({ projectId: "p1", content: "New Note" });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/projects/p1/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });

  describe("useUpdateNote", () => {
    it("sends PATCH to /api/projects/:id/notes/:id", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ id: "n1" }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useUpdateNote(), { wrapper });

      await act(async () => {
        result.current.mutate({ projectId: "p1", noteId: "n1", content: "Updated" });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/projects/p1/notes/n1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });

  describe("useDeleteNote", () => {
    it("sends DELETE to /api/projects/:id/notes/:id", async () => {
      mockFetch.mockReturnValueOnce(
        Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response)
      );
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDeleteNote(), { wrapper });

      await act(async () => {
        result.current.mutate({ projectId: "p1", noteId: "n1" });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/projects/p1/notes/n1", {
        method: "DELETE",
      });
    });
  });
});

// ===========================================================================
// 2. use-project-hierarchy
// ===========================================================================
describe("use-project-hierarchy", () => {
  // --- Phases ---
  describe("usePhases", () => {
    it("is disabled when projectId is null", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => usePhases(null), { wrapper });
      expect(result.current.fetchStatus).toBe("idle");
    });

    it("fetches phases for a project", async () => {
      const phases = [{ id: "ph1", title: "Phase 1" }];
      mockFetch.mockReturnValueOnce(okResponse(phases));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => usePhases("p1"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/projects/p1/phases");
    });
  });

  describe("usePhase", () => {
    it("is disabled when projectId is null", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => usePhase(null, "ph1"), { wrapper });
      expect(result.current.fetchStatus).toBe("idle");
    });

    it("is disabled when phaseId is null", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => usePhase("p1", null), { wrapper });
      expect(result.current.fetchStatus).toBe("idle");
    });

    it("fetches a single phase", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ id: "ph1" }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => usePhase("p1", "ph1"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/projects/p1/phases/ph1");
    });
  });

  describe("useCreatePhase", () => {
    it("sends POST", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ id: "ph2" }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useCreatePhase(), { wrapper });

      await act(async () => {
        result.current.mutate({ projectId: "p1", title: "Phase 2" });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/projects/p1/phases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });

  describe("useUpdatePhase", () => {
    it("sends PATCH", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ id: "ph1" }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useUpdatePhase(), { wrapper });

      await act(async () => {
        result.current.mutate({ projectId: "p1", phaseId: "ph1", title: "Updated" });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/projects/p1/phases/ph1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });

  describe("useDeletePhase", () => {
    it("sends DELETE", async () => {
      mockFetch.mockReturnValueOnce(
        Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response)
      );
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDeletePhase(), { wrapper });

      await act(async () => {
        result.current.mutate({ projectId: "p1", phaseId: "ph1" });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/projects/p1/phases/ph1", {
        method: "DELETE",
      });
    });
  });

  describe("useStartPhase", () => {
    it("sends POST to start endpoint", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ id: "ph1", status: "in_progress" }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useStartPhase(), { wrapper });

      await act(async () => {
        result.current.mutate({ projectId: "p1", phaseId: "ph1" });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/projects/p1/phases/ph1/start",
        { method: "POST" }
      );
    });
  });

  describe("useCompletePhase", () => {
    it("sends POST to complete endpoint", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ id: "ph1", status: "completed" }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useCompletePhase(), { wrapper });

      await act(async () => {
        result.current.mutate({ projectId: "p1", phaseId: "ph1" });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/projects/p1/phases/ph1/complete",
        { method: "POST" }
      );
    });
  });

  // --- Workstreams ---
  describe("useWorkstreams", () => {
    it("is disabled when projectId is null", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useWorkstreams(null), { wrapper });
      expect(result.current.fetchStatus).toBe("idle");
    });

    it("fetches workstreams", async () => {
      mockFetch.mockReturnValueOnce(okResponse([{ id: "ws1" }]));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useWorkstreams("p1"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/projects/p1/workstreams");
    });
  });

  describe("useWorkstream", () => {
    it("is disabled when either id is null", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useWorkstream(null, "ws1"), { wrapper });
      expect(result.current.fetchStatus).toBe("idle");
    });

    it("fetches a single workstream", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ id: "ws1" }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useWorkstream("p1", "ws1"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/projects/p1/workstreams/ws1");
    });
  });

  describe("useCreateWorkstream", () => {
    it("sends POST", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ id: "ws2" }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useCreateWorkstream(), { wrapper });

      await act(async () => {
        result.current.mutate({ projectId: "p1", title: "Workstream 2" });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/projects/p1/workstreams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });

  describe("useUpdateWorkstream", () => {
    it("sends PATCH", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ id: "ws1" }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useUpdateWorkstream(), { wrapper });

      await act(async () => {
        result.current.mutate({ projectId: "p1", workstreamId: "ws1", title: "Updated" });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/projects/p1/workstreams/ws1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });

  describe("useDeleteWorkstream", () => {
    it("sends DELETE", async () => {
      mockFetch.mockReturnValueOnce(
        Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response)
      );
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDeleteWorkstream(), { wrapper });

      await act(async () => {
        result.current.mutate({ projectId: "p1", workstreamId: "ws1" });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  // --- Deliverables ---
  describe("useDeliverables", () => {
    it("is disabled when either id is null", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDeliverables(null, "ph1"), { wrapper });
      expect(result.current.fetchStatus).toBe("idle");
    });

    it("fetches deliverables", async () => {
      mockFetch.mockReturnValueOnce(okResponse([{ id: "d1" }]));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDeliverables("p1", "ph1"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/projects/p1/phases/ph1/deliverables");
    });
  });

  describe("useCreateDeliverable", () => {
    it("sends POST", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ id: "d2" }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useCreateDeliverable(), { wrapper });

      await act(async () => {
        result.current.mutate({ projectId: "p1", phaseId: "ph1", title: "Deliverable" });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/projects/p1/phases/ph1/deliverables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });

  // --- Roles ---
  describe("useRoles", () => {
    it("is disabled when projectId is null", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useRoles(null), { wrapper });
      expect(result.current.fetchStatus).toBe("idle");
    });

    it("fetches roles", async () => {
      mockFetch.mockReturnValueOnce(okResponse([{ id: "r1", name: "Developer" }]));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useRoles("p1"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/projects/p1/roles");
    });
  });

  describe("useCreateRole", () => {
    it("sends POST", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ id: "r2" }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useCreateRole(), { wrapper });

      await act(async () => {
        result.current.mutate({ projectId: "p1", name: "QA" });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/projects/p1/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });

  // --- Assignments ---
  describe("useAssignments", () => {
    it("is disabled when either id is null", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useAssignments("p1", null), { wrapper });
      expect(result.current.fetchStatus).toBe("idle");
    });

    it("fetches assignments", async () => {
      mockFetch.mockReturnValueOnce(okResponse([{ id: "a1" }]));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useAssignments("p1", "ph1"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/projects/p1/phases/ph1/assignments");
    });
  });

  describe("useCreateAssignment", () => {
    it("sends POST", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ id: "a2" }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useCreateAssignment(), { wrapper });

      await act(async () => {
        result.current.mutate({ projectId: "p1", phaseId: "ph1", user_id: "u1" });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/projects/p1/phases/ph1/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });

  // --- Apply Template ---
  describe("useApplyTemplate", () => {
    it("sends POST to apply-template endpoint", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ success: true, phases: [], roles: [] }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useApplyTemplate(), { wrapper });

      await act(async () => {
        result.current.mutate({ projectId: "p1", templateId: "tpl1" });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/projects/p1/apply-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });
});

// ===========================================================================
// 3. use-templates
// ===========================================================================
describe("use-templates", () => {
  describe("useTemplates", () => {
    it("fetches templates without workspace filter", async () => {
      mockFetch.mockReturnValueOnce(okResponse([]));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useTemplates(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("/api/templates");
    });

    it("fetches templates with workspace filter", async () => {
      mockFetch.mockReturnValueOnce(okResponse([]));
      const { wrapper } = createWrapper();
      renderHook(() => useTemplates("ws-1"), { wrapper });

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("workspace_id=ws-1");
    });
  });

  describe("useCreateTemplate", () => {
    it("sends POST to /api/templates", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ id: "tpl1" }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useCreateTemplate(), { wrapper });

      await act(async () => {
        result.current.mutate({ name: "Template", phase_definitions: [] });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });
  });

  describe("useUpdateTemplate", () => {
    it("sends PATCH to /api/templates with id param", async () => {
      mockFetch.mockReturnValueOnce(okResponse({ id: "tpl1" }));
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useUpdateTemplate(), { wrapper });

      await act(async () => {
        result.current.mutate({ templateId: "tpl1", name: "Updated" });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("id=tpl1");
      expect(mockFetch.mock.calls[0][1]?.method).toBe("PATCH");
    });
  });

  describe("useDeleteTemplate", () => {
    it("sends DELETE to /api/templates with id param", async () => {
      mockFetch.mockReturnValueOnce(
        Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response)
      );
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDeleteTemplate(), { wrapper });

      await act(async () => {
        result.current.mutate("tpl1");
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("id=tpl1");
      expect(mockFetch.mock.calls[0][1]?.method).toBe("DELETE");
    });
  });

  describe("RSE_7_PHASE_TEMPLATE", () => {
    it("has 7 phase definitions", () => {
      expect(RSE_7_PHASE_TEMPLATE.phase_definitions).toHaveLength(7);
    });

    it("has 7 role definitions", () => {
      expect(RSE_7_PHASE_TEMPLATE.role_definitions).toHaveLength(7);
    });

    it("first phase has no dependencies", () => {
      expect(RSE_7_PHASE_TEMPLATE.phase_definitions[0].blocked_by_index).toEqual([]);
    });

    it("has a name and description", () => {
      expect(RSE_7_PHASE_TEMPLATE.name).toBe("RSE 7-Phase MVP");
      expect(RSE_7_PHASE_TEMPLATE.description).toBeTruthy();
    });
  });
});
