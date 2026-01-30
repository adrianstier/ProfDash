/**
 * Research Team Assignments API Route Tests
 *
 * Tests for experiment team assignment endpoints:
 *   GET/POST/DELETE /api/research/projects/[id]/experiments/[expId]/team
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

function createMockChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const methods = [
    "select", "insert", "update", "delete", "eq", "in", "gte", "lte",
    "neq", "ilike", "or", "order", "limit", "range", "head",
  ];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  chain.single = vi.fn(() => Promise.resolve(result));
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  chain.then = (resolve: (v: unknown) => void) => { resolve(result); return undefined; };
  return chain;
}

const defaultResult = { data: null, error: null };

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => createMockChain(defaultResult)),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock("@scholaros/shared", () => ({
  CreateExperimentTeamAssignmentSchema: {
    safeParse: vi.fn((data: Record<string, unknown>) => {
      if (!data.personnel_id) {
        return {
          success: false,
          error: {
            flatten: () => ({
              fieldErrors: { personnel_id: ["Required"] },
            }),
          },
        };
      }
      const validRoles = ["lead", "co_lead", "contributor", "field_assistant", "data_analyst", "consultant"];
      if (data.role && !validRoles.includes(data.role as string)) {
        return {
          success: false,
          error: {
            flatten: () => ({
              fieldErrors: { role: ["Invalid role"] },
            }),
          },
        };
      }
      return {
        success: true,
        data: {
          ...data,
          start_date: data.start_date ? new Date(data.start_date as string) : null,
          end_date: data.end_date ? new Date(data.end_date as string) : null,
        },
      };
    }),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(url: string, options?: RequestInit): Request {
  return new Request(url, options);
}

function makeParams<T>(value: T): { params: Promise<T> } {
  return { params: Promise.resolve(value) };
}

const mockUser = { id: "user-123", email: "prof@example.com" };
const workspaceId = "550e8400-e29b-41d4-a716-446655440000";
const projectId = "proj-001";
const experimentId = "exp-001";
const personnelId = "pers-001";
const assignmentId = "assign-001";

const importTeamRoute = () =>
  import("@/app/api/research/projects/[id]/experiments/[expId]/team/route");

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Team API - GET /api/research/projects/[id]/experiments/[expId]/team", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultResult.data = null;
    defaultResult.error = null;
  });

  it("returns 401 when unauthenticated", async () => {
    const { GET } = await importTeamRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await GET(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/${experimentId}/team`) as any,
      makeParams({ id: projectId, expId: experimentId })
    );
    expect(res.status).toBe(401);
  });

  it("returns team members with personnel details", async () => {
    const { GET } = await importTeamRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    // experiment lookup
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: experimentId, project_id: projectId }, error: null })
    );
    // team assignments query
    const assignments = [
      { id: "a1", experiment_id: experimentId, personnel_id: personnelId, role: "lead", personnel: { id: personnelId, name: "Dr. Smith", email: "smith@example.com", role: "PI" } },
      { id: "a2", experiment_id: experimentId, personnel_id: "pers-002", role: "contributor", personnel: { id: "pers-002", name: "Jane Doe", email: "jane@example.com", role: "PhD Student" } },
    ];
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: assignments, error: null })
    );

    const res = await GET(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/${experimentId}/team`) as any,
      makeParams({ id: projectId, expId: experimentId })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(body[0].personnel.name).toBe("Dr. Smith");
  });

  it("returns 404 when experiment not found", async () => {
    const { GET } = await importTeamRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "PGRST116" } })
    );

    const res = await GET(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/bad-exp/team`) as any,
      makeParams({ id: projectId, expId: "bad-exp" })
    );
    expect(res.status).toBe(404);
  });

  it("returns empty array when no assignments", async () => {
    const { GET } = await importTeamRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: experimentId, project_id: projectId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: [], error: null })
    );

    const res = await GET(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/${experimentId}/team`) as any,
      makeParams({ id: projectId, expId: experimentId })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it("returns 500 on database error", async () => {
    const { GET } = await importTeamRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: experimentId, project_id: projectId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { message: "DB error" } })
    );

    const res = await GET(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/${experimentId}/team`) as any,
      makeParams({ id: projectId, expId: experimentId })
    );
    expect(res.status).toBe(500);
  });
});

describe("Team API - POST /api/research/projects/[id]/experiments/[expId]/team", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultResult.data = null;
    defaultResult.error = null;
  });

  it("returns 401 when unauthenticated", async () => {
    const { POST } = await importTeamRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await POST(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/${experimentId}/team`, {
        method: "POST",
        body: JSON.stringify({ personnel_id: personnelId }),
      }) as any,
      makeParams({ id: projectId, expId: experimentId })
    );
    expect(res.status).toBe(401);
  });

  it("creates assignment with personnel_id", async () => {
    const { POST } = await importTeamRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    // experiment lookup
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: experimentId, project_id: projectId, workspace_id: workspaceId }, error: null })
    );
    // membership
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );
    // duplicate check - no existing assignment
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "PGRST116" } })
    );
    // insert result
    const newAssignment = {
      id: assignmentId,
      experiment_id: experimentId,
      personnel_id: personnelId,
      role: "contributor",
      personnel: { id: personnelId, name: "Dr. Smith", email: "smith@example.com", role: "PI" },
    };
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: newAssignment, error: null })
    );

    const res = await POST(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/${experimentId}/team`, {
        method: "POST",
        body: JSON.stringify({ personnel_id: personnelId }),
      }) as any,
      makeParams({ id: projectId, expId: experimentId })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.personnel_id).toBe(personnelId);
  });

  it("creates assignment with specified role", async () => {
    const { POST } = await importTeamRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: experimentId, project_id: projectId, workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "admin" }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "PGRST116" } })
    );

    const newAssignment = {
      id: "assign-new",
      experiment_id: experimentId,
      personnel_id: personnelId,
      role: "lead",
    };
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: newAssignment, error: null })
    );

    const res = await POST(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/${experimentId}/team`, {
        method: "POST",
        body: JSON.stringify({ personnel_id: personnelId, role: "lead" }),
      }) as any,
      makeParams({ id: projectId, expId: experimentId })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.role).toBe("lead");
  });

  it("returns 400 when personnel_id is missing", async () => {
    const { POST } = await importTeamRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: experimentId, project_id: projectId, workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );

    const res = await POST(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/${experimentId}/team`, {
        method: "POST",
        body: JSON.stringify({}),
      }) as any,
      makeParams({ id: projectId, expId: experimentId })
    );
    expect(res.status).toBe(400);
  });

  it("returns 409 for duplicate assignment", async () => {
    const { POST } = await importTeamRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: experimentId, project_id: projectId, workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );
    // duplicate check - existing found
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: "existing-assign" }, error: null })
    );

    const res = await POST(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/${experimentId}/team`, {
        method: "POST",
        body: JSON.stringify({ personnel_id: personnelId }),
      }) as any,
      makeParams({ id: projectId, expId: experimentId })
    );
    expect(res.status).toBe(409);
  });

  it("returns 400 for invalid role enum value", async () => {
    const { POST } = await importTeamRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: experimentId, project_id: projectId, workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );

    const res = await POST(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/${experimentId}/team`, {
        method: "POST",
        body: JSON.stringify({ personnel_id: personnelId, role: "INVALID_ROLE" }),
      }) as any,
      makeParams({ id: projectId, expId: experimentId })
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when experiment not found", async () => {
    const { POST } = await importTeamRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "PGRST116" } })
    );

    const res = await POST(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/bad-exp/team`, {
        method: "POST",
        body: JSON.stringify({ personnel_id: personnelId }),
      }) as any,
      makeParams({ id: projectId, expId: "bad-exp" })
    );
    expect(res.status).toBe(404);
  });

  it("returns 403 when user not in workspace", async () => {
    const { POST } = await importTeamRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: experimentId, project_id: projectId, workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: null })
    );

    const res = await POST(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/${experimentId}/team`, {
        method: "POST",
        body: JSON.stringify({ personnel_id: personnelId }),
      }) as any,
      makeParams({ id: projectId, expId: experimentId })
    );
    expect(res.status).toBe(403);
  });

  it("returns 500 on insert error", async () => {
    const { POST } = await importTeamRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: experimentId, project_id: projectId, workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "PGRST116" } })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { message: "Insert failed" } })
    );

    const res = await POST(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/${experimentId}/team`, {
        method: "POST",
        body: JSON.stringify({ personnel_id: personnelId }),
      }) as any,
      makeParams({ id: projectId, expId: experimentId })
    );
    expect(res.status).toBe(500);
  });
});

describe("Team API - DELETE /api/research/projects/[id]/experiments/[expId]/team", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultResult.data = null;
    defaultResult.error = null;
  });

  it("returns 401 when unauthenticated", async () => {
    const { DELETE } = await importTeamRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await DELETE(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/${experimentId}/team?assignment_id=${assignmentId}`, { method: "DELETE" }) as any,
      makeParams({ id: projectId, expId: experimentId })
    );
    expect(res.status).toBe(401);
  });

  it("removes assignment successfully", async () => {
    const { DELETE } = await importTeamRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    // assignment lookup
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: assignmentId, experiment_id: experimentId }, error: null })
    );
    // experiment lookup for workspace_id
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId }, error: null })
    );
    // membership
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "admin" }, error: null })
    );
    // delete
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: null })
    );

    const res = await DELETE(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/${experimentId}/team?assignment_id=${assignmentId}`, { method: "DELETE" }) as any,
      makeParams({ id: projectId, expId: experimentId })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 404 when assignment not found", async () => {
    const { DELETE } = await importTeamRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "PGRST116" } })
    );

    const res = await DELETE(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/${experimentId}/team?assignment_id=nonexistent`, { method: "DELETE" }) as any,
      makeParams({ id: projectId, expId: experimentId })
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 when assignment_id is missing", async () => {
    const { DELETE } = await importTeamRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    const res = await DELETE(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/${experimentId}/team`, { method: "DELETE" }) as any,
      makeParams({ id: projectId, expId: experimentId })
    );
    expect(res.status).toBe(400);
  });

  it("returns 403 when user is not in workspace", async () => {
    const { DELETE } = await importTeamRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: assignmentId, experiment_id: experimentId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: null })
    );

    const res = await DELETE(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/${experimentId}/team?assignment_id=${assignmentId}`, { method: "DELETE" }) as any,
      makeParams({ id: projectId, expId: experimentId })
    );
    expect(res.status).toBe(403);
  });

  it("returns 404 when experiment not found during delete", async () => {
    const { DELETE } = await importTeamRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    // assignment found
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: assignmentId, experiment_id: experimentId }, error: null })
    );
    // experiment lookup fails
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: null })
    );

    const res = await DELETE(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/${experimentId}/team?assignment_id=${assignmentId}`, { method: "DELETE" }) as any,
      makeParams({ id: projectId, expId: experimentId })
    );
    expect(res.status).toBe(404);
  });

  it("returns 500 on delete database error", async () => {
    const { DELETE } = await importTeamRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: assignmentId, experiment_id: experimentId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "admin" }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { message: "Delete failed" } })
    );

    const res = await DELETE(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/${experimentId}/team?assignment_id=${assignmentId}`, { method: "DELETE" }) as any,
      makeParams({ id: projectId, expId: experimentId })
    );
    expect(res.status).toBe(500);
  });
});
