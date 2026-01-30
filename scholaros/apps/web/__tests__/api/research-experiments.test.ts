/**
 * Research Experiments API Route Tests
 *
 * Comprehensive tests for:
 *   GET  /api/research/projects/[id]/experiments           (list)
 *   POST /api/research/projects/[id]/experiments           (create)
 *   GET  /api/research/projects/[id]/experiments/[expId]   (get by id)
 *   PATCH /api/research/projects/[id]/experiments/[expId]  (update)
 *   DELETE /api/research/projects/[id]/experiments/[expId] (delete)
 *
 * Run with: pnpm --filter @scholaros/web test -- __tests__/api/research-experiments
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

function createMockChain(result: { data: unknown; error: unknown; count?: number | null }) {
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
  chain.then = (resolve: (v: unknown) => void) => {
    resolve(result);
    return undefined;
  };
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
  CreateExperimentSchema: {
    safeParse: vi.fn((data: Record<string, unknown>) => {
      if (!data.title || !data.project_id || !data.workspace_id) {
        return {
          success: false,
          error: { errors: [{ message: "Required fields missing" }] },
        };
      }
      return { success: true, data };
    }),
  },
  UpdateExperimentSchema: {
    safeParse: vi.fn((data: Record<string, unknown>) => {
      if (Object.keys(data).length === 0) {
        return {
          success: false,
          error: { errors: [{ message: "No fields to update" }] },
        };
      }
      // Validate status if provided
      const validStatuses = ["planned", "active", "paused", "completed", "cancelled"];
      if (data.status && !validStatuses.includes(data.status as string)) {
        return {
          success: false,
          error: { errors: [{ message: "Invalid status value" }] },
        };
      }
      return { success: true, data };
    }),
  },
}));

// ---------------------------------------------------------------------------
// Imports (must come AFTER vi.mock)
// ---------------------------------------------------------------------------

const importExperiments = () =>
  import("@/app/api/research/projects/[id]/experiments/route");

const importExperimentById = () =>
  import("@/app/api/research/projects/[id]/experiments/[expId]/route");

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
const projectId = "proj-research-1";

function authenticatedUser() {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: mockUser },
    error: null,
  });
}

function unauthenticatedUser() {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: null },
    error: { message: "Not authenticated" },
  });
}

/** Creates a mock chain that also carries a count property (for head:true queries). */
function createCountChain(count: number) {
  return createMockChain({ data: null, error: null, count });
}

// ---------------------------------------------------------------------------
// GET /api/research/projects/[id]/experiments
// ---------------------------------------------------------------------------

describe("Experiments API – GET /api/research/projects/[id]/experiments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultResult.data = null;
    defaultResult.error = null;
  });

  it("returns 401 when unauthenticated", async () => {
    const { GET } = await importExperiments();
    unauthenticatedUser();

    const res = await GET(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments`),
      makeParams({ id: projectId })
    );
    expect(res.status).toBe(401);
  });

  it("returns experiments for research project", async () => {
    const { GET } = await importExperiments();
    authenticatedUser();

    // project lookup
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId, type: "research" }, error: null })
    );
    // membership
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );
    // experiments query
    const experimentsData = [
      { id: "exp-1", title: "Thermal Stress Trial", project_id: projectId, status: "active" },
      { id: "exp-2", title: "Control Group", project_id: projectId, status: "planned" },
    ];
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: experimentsData, error: null })
    );
    // For each experiment: 3 stats queries (team, fieldwork, tasks) x 2 experiments = 6 chains
    for (let i = 0; i < 6; i++) {
      mockSupabase.from.mockReturnValueOnce(createCountChain(0));
    }

    const res = await GET(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments`),
      makeParams({ id: projectId })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(body[0].title).toBe("Thermal Stress Trial");
    expect(body[0]).toHaveProperty("team_count");
    expect(body[0]).toHaveProperty("fieldwork_count");
    expect(body[0]).toHaveProperty("task_count");
  });

  it("returns 404 when project not found", async () => {
    const { GET } = await importExperiments();
    authenticatedUser();

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "PGRST116" } })
    );

    const res = await GET(
      makeRequest("http://localhost/api/research/projects/nonexistent/experiments"),
      makeParams({ id: "nonexistent" })
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Project not found");
  });

  it("returns 400 when project is not type research", async () => {
    const { GET } = await importExperiments();
    authenticatedUser();

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId, type: "manuscript" }, error: null })
    );

    const res = await GET(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments`),
      makeParams({ id: projectId })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("not a research project");
  });

  it("returns 400 for grant-type project", async () => {
    const { GET } = await importExperiments();
    authenticatedUser();

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId, type: "grant" }, error: null })
    );

    const res = await GET(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments`),
      makeParams({ id: projectId })
    );
    expect(res.status).toBe(400);
  });

  it("returns 403 when user not in workspace", async () => {
    const { GET } = await importExperiments();
    authenticatedUser();

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId, type: "research" }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "PGRST116" } })
    );

    const res = await GET(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments`),
      makeParams({ id: projectId })
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Not a member of this workspace");
  });

  it("filters by status query parameter", async () => {
    const { GET } = await importExperiments();
    authenticatedUser();

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId, type: "research" }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );
    const expChain = createMockChain({ data: [], error: null });
    mockSupabase.from.mockReturnValueOnce(expChain);

    await GET(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments?status=active`),
      makeParams({ id: projectId })
    );
    expect(expChain.eq).toHaveBeenCalledWith("status", "active");
  });

  it("filters by site_id query parameter", async () => {
    const { GET } = await importExperiments();
    authenticatedUser();

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId, type: "research" }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );
    const expChain = createMockChain({ data: [], error: null });
    mockSupabase.from.mockReturnValueOnce(expChain);

    await GET(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments?site_id=site-42`),
      makeParams({ id: projectId })
    );
    expect(expChain.eq).toHaveBeenCalledWith("site_id", "site-42");
  });

  it("returns experiments with joined field_sites and profiles data", async () => {
    const { GET } = await importExperiments();
    authenticatedUser();

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId, type: "research" }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );

    const experimentsData = [{
      id: "exp-1",
      title: "Soil Sampling",
      project_id: projectId,
      site: { id: "site-1", name: "Forest Plot", code: "FP-01", location: {} },
      lead: { id: "user-456", full_name: "Dr. Smith", avatar_url: null },
    }];
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: experimentsData, error: null })
    );
    // Stats chains for 1 experiment
    for (let i = 0; i < 3; i++) {
      mockSupabase.from.mockReturnValueOnce(createCountChain(0));
    }

    const res = await GET(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments`),
      makeParams({ id: projectId })
    );
    const body = await res.json();
    expect(body[0].site).toBeDefined();
    expect(body[0].site.name).toBe("Forest Plot");
    expect(body[0].lead).toBeDefined();
    expect(body[0].lead.full_name).toBe("Dr. Smith");
  });

  it("returns 500 on database error fetching experiments", async () => {
    const { GET } = await importExperiments();
    authenticatedUser();

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId, type: "research" }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { message: "DB error" } })
    );

    const res = await GET(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments`),
      makeParams({ id: projectId })
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to fetch experiments");
  });

  it("returns empty array when no experiments exist", async () => {
    const { GET } = await importExperiments();
    authenticatedUser();

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId, type: "research" }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: [], error: null })
    );

    const res = await GET(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments`),
      makeParams({ id: projectId })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// POST /api/research/projects/[id]/experiments
// ---------------------------------------------------------------------------

describe("Experiments API – POST /api/research/projects/[id]/experiments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultResult.data = null;
    defaultResult.error = null;
  });

  it("returns 401 when unauthenticated", async () => {
    const { POST } = await importExperiments();
    unauthenticatedUser();

    const res = await POST(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments`, {
        method: "POST",
        body: JSON.stringify({ title: "Test Exp" }),
      }),
      makeParams({ id: projectId })
    );
    expect(res.status).toBe(401);
  });

  it("creates experiment with minimal data (title)", async () => {
    const { POST } = await importExperiments();
    authenticatedUser();

    // project
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId, type: "research" }, error: null })
    );
    // membership
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );
    // max sort_order
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: null })
    );
    // insert
    const newExp = {
      id: "exp-new",
      title: "Water Quality Test",
      project_id: projectId,
      workspace_id: workspaceId,
      sort_order: 0,
      site: null,
      lead: null,
    };
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: newExp, error: null })
    );

    const res = await POST(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments`, {
        method: "POST",
        body: JSON.stringify({ title: "Water Quality Test" }),
      }),
      makeParams({ id: projectId })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.title).toBe("Water Quality Test");
    expect(body.team_count).toBe(0);
    expect(body.fieldwork_count).toBe(0);
    expect(body.task_count).toBe(0);
  });

  it("creates experiment with all fields", async () => {
    const { POST } = await importExperiments();
    authenticatedUser();

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId, type: "research" }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "admin" }, error: null })
    );
    // max sort_order returns existing
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { sort_order: 3 }, error: null })
    );
    const fullExp = {
      id: "exp-full",
      title: "Full Experiment",
      code: "EXP-001",
      project_id: projectId,
      workspace_id: workspaceId,
      site_id: "site-1",
      lead_id: "user-456",
      status: "planned",
      start_date: "2025-06-01",
      end_date: "2025-12-31",
      description: "A comprehensive study",
      sort_order: 4,
      site: { id: "site-1", name: "Forest Plot", code: "FP-01", location: {} },
      lead: { id: "user-456", full_name: "Dr. Smith", avatar_url: null },
    };
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: fullExp, error: null })
    );

    const res = await POST(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments`, {
        method: "POST",
        body: JSON.stringify({
          title: "Full Experiment",
          code: "EXP-001",
          site_id: "site-1",
          lead_id: "user-456",
          status: "planned",
          start_date: "2025-06-01",
          end_date: "2025-12-31",
          description: "A comprehensive study",
        }),
      }),
      makeParams({ id: projectId })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.code).toBe("EXP-001");
    expect(body.site).toBeDefined();
    expect(body.lead).toBeDefined();
    expect(body.sort_order).toBe(4);
  });

  it("returns 400 when title is missing", async () => {
    const { POST } = await importExperiments();
    authenticatedUser();

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId, type: "research" }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );

    const res = await POST(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments`, {
        method: "POST",
        body: JSON.stringify({ description: "No title provided" }),
      }),
      makeParams({ id: projectId })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid request body");
  });

  it("returns 404 when project not found", async () => {
    const { POST } = await importExperiments();
    authenticatedUser();

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "PGRST116" } })
    );

    const res = await POST(
      makeRequest("http://localhost/api/research/projects/missing/experiments", {
        method: "POST",
        body: JSON.stringify({ title: "Orphan Exp" }),
      }),
      makeParams({ id: "missing" })
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Project not found");
  });

  it("returns 400 for non-research project", async () => {
    const { POST } = await importExperiments();
    authenticatedUser();

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId, type: "grant" }, error: null })
    );

    const res = await POST(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments`, {
        method: "POST",
        body: JSON.stringify({ title: "Wrong Type" }),
      }),
      makeParams({ id: projectId })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("research projects");
  });

  it("returns 403 when user has limited role", async () => {
    const { POST } = await importExperiments();
    authenticatedUser();

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId, type: "research" }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "limited" }, error: null })
    );

    const res = await POST(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments`, {
        method: "POST",
        body: JSON.stringify({ title: "Denied Exp" }),
      }),
      makeParams({ id: projectId })
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Insufficient permissions");
  });

  it("returns 409 on duplicate experiment code", async () => {
    const { POST } = await importExperiments();
    authenticatedUser();

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId, type: "research" }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "23505", message: "Unique constraint" } })
    );

    const res = await POST(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments`, {
        method: "POST",
        body: JSON.stringify({ title: "Dup Code Exp" }),
      }),
      makeParams({ id: projectId })
    );
    expect(res.status).toBe(409);
  });

  it("returns 500 on unexpected database error during insert", async () => {
    const { POST } = await importExperiments();
    authenticatedUser();

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId, type: "research" }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "42P01", message: "Relation not found" } })
    );

    const res = await POST(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments`, {
        method: "POST",
        body: JSON.stringify({ title: "DB Error Exp" }),
      }),
      makeParams({ id: projectId })
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to create experiment");
  });
});

// ---------------------------------------------------------------------------
// GET /api/research/projects/[id]/experiments/[expId]
// ---------------------------------------------------------------------------

describe("Experiments API – GET /api/research/projects/[id]/experiments/[expId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultResult.data = null;
    defaultResult.error = null;
  });

  it("returns 401 when unauthenticated", async () => {
    const { GET } = await importExperimentById();
    unauthenticatedUser();

    const res = await GET(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/exp-1`),
      makeParams({ id: projectId, expId: "exp-1" })
    );
    expect(res.status).toBe(401);
  });

  it("returns experiment with details and counts", async () => {
    const { GET } = await importExperimentById();
    authenticatedUser();

    const expData = {
      id: "exp-1",
      title: "Stream Monitoring",
      workspace_id: workspaceId,
      project_id: projectId,
      site: { id: "site-1", name: "River Site", code: "RS", location: {}, timezone: "UTC", access_requirements: "None" },
      lead: { id: "user-456", full_name: "Dr. Jones", avatar_url: null, email: "jones@uni.edu" },
    };
    // experiment query
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: expData, error: null })
    );
    // membership
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );
    // team count, fieldwork count, task count
    mockSupabase.from.mockReturnValueOnce(createCountChain(3));
    mockSupabase.from.mockReturnValueOnce(createCountChain(5));
    mockSupabase.from.mockReturnValueOnce(createCountChain(12));

    const res = await GET(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/exp-1`),
      makeParams({ id: projectId, expId: "exp-1" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe("Stream Monitoring");
    expect(body.site.name).toBe("River Site");
    expect(body.lead.full_name).toBe("Dr. Jones");
    expect(body.team_count).toBe(3);
    expect(body.fieldwork_count).toBe(5);
    expect(body.task_count).toBe(12);
  });

  it("returns 404 when experiment not found", async () => {
    const { GET } = await importExperimentById();
    authenticatedUser();

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "PGRST116", message: "No rows" } })
    );

    const res = await GET(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/nonexistent`),
      makeParams({ id: projectId, expId: "nonexistent" })
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Experiment not found");
  });

  it("returns 403 when user is not in workspace", async () => {
    const { GET } = await importExperimentById();
    authenticatedUser();

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({
        data: { id: "exp-1", workspace_id: "other-workspace", title: "Secret" },
        error: null,
      })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: null })
    );

    const res = await GET(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/exp-1`),
      makeParams({ id: projectId, expId: "exp-1" })
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Not authorized to view this experiment");
  });

  it("returns 500 on unexpected database error", async () => {
    const { GET } = await importExperimentById();
    authenticatedUser();

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "42P01", message: "DB error" } })
    );

    const res = await GET(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/exp-1`),
      makeParams({ id: projectId, expId: "exp-1" })
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to fetch experiment");
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/research/projects/[id]/experiments/[expId]
// ---------------------------------------------------------------------------

describe("Experiments API – PATCH /api/research/projects/[id]/experiments/[expId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultResult.data = null;
    defaultResult.error = null;
  });

  it("returns 401 when unauthenticated", async () => {
    const { PATCH } = await importExperimentById();
    unauthenticatedUser();

    const res = await PATCH(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/exp-1`, {
        method: "PATCH",
        body: JSON.stringify({ title: "Updated" }),
      }),
      makeParams({ id: projectId, expId: "exp-1" })
    );
    expect(res.status).toBe(401);
  });

  it("updates experiment status", async () => {
    const { PATCH } = await importExperimentById();
    authenticatedUser();

    // existing experiment
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId }, error: null })
    );
    // membership
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );
    // update result
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({
        data: { id: "exp-1", title: "Experiment 1", status: "completed", site: null, lead: null },
        error: null,
      })
    );

    const res = await PATCH(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/exp-1`, {
        method: "PATCH",
        body: JSON.stringify({ status: "completed" }),
      }),
      makeParams({ id: projectId, expId: "exp-1" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("completed");
  });

  it("updates experiment title and dates", async () => {
    const { PATCH } = await importExperimentById();
    authenticatedUser();

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "admin" }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({
        data: {
          id: "exp-1",
          title: "Renamed Experiment",
          start_date: "2025-07-01",
          end_date: "2026-01-31",
          site: null,
          lead: null,
        },
        error: null,
      })
    );

    const res = await PATCH(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/exp-1`, {
        method: "PATCH",
        body: JSON.stringify({
          title: "Renamed Experiment",
          start_date: "2025-07-01",
          end_date: "2026-01-31",
        }),
      }),
      makeParams({ id: projectId, expId: "exp-1" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe("Renamed Experiment");
    expect(body.start_date).toBe("2025-07-01");
  });

  it("updates experiment site_id", async () => {
    const { PATCH } = await importExperimentById();
    authenticatedUser();

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({
        data: {
          id: "exp-1",
          site_id: "site-new",
          site: { id: "site-new", name: "New Site", code: "NS", location: {} },
          lead: null,
        },
        error: null,
      })
    );

    const res = await PATCH(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/exp-1`, {
        method: "PATCH",
        body: JSON.stringify({ site_id: "site-new" }),
      }),
      makeParams({ id: projectId, expId: "exp-1" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.site_id).toBe("site-new");
  });

  it("returns 404 when experiment not found", async () => {
    const { PATCH } = await importExperimentById();
    authenticatedUser();

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "PGRST116" } })
    );

    const res = await PATCH(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/gone`, {
        method: "PATCH",
        body: JSON.stringify({ title: "Nope" }),
      }),
      makeParams({ id: projectId, expId: "gone" })
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Experiment not found");
  });

  it("returns 400 on invalid status value", async () => {
    const { PATCH } = await importExperimentById();
    authenticatedUser();

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );

    const res = await PATCH(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/exp-1`, {
        method: "PATCH",
        body: JSON.stringify({ status: "invalid_status" }),
      }),
      makeParams({ id: projectId, expId: "exp-1" })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid request body");
  });

  it("returns 400 on empty update body", async () => {
    const { PATCH } = await importExperimentById();
    authenticatedUser();

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );

    const res = await PATCH(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/exp-1`, {
        method: "PATCH",
        body: JSON.stringify({}),
      }),
      makeParams({ id: projectId, expId: "exp-1" })
    );
    expect(res.status).toBe(400);
  });

  it("returns 403 when user has limited role", async () => {
    const { PATCH } = await importExperimentById();
    authenticatedUser();

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "limited" }, error: null })
    );

    const res = await PATCH(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/exp-1`, {
        method: "PATCH",
        body: JSON.stringify({ title: "Nope" }),
      }),
      makeParams({ id: projectId, expId: "exp-1" })
    );
    expect(res.status).toBe(403);
  });

  it("returns 409 on duplicate experiment code", async () => {
    const { PATCH } = await importExperimentById();
    authenticatedUser();

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "admin" }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "23505", message: "Unique constraint" } })
    );

    const res = await PATCH(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/exp-1`, {
        method: "PATCH",
        body: JSON.stringify({ code: "EXISTING-CODE" }),
      }),
      makeParams({ id: projectId, expId: "exp-1" })
    );
    expect(res.status).toBe(409);
  });

  it("returns 500 on unexpected database error during update", async () => {
    const { PATCH } = await importExperimentById();
    authenticatedUser();

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "owner" }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "42P01", message: "DB error" } })
    );

    const res = await PATCH(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/exp-1`, {
        method: "PATCH",
        body: JSON.stringify({ title: "Failing" }),
      }),
      makeParams({ id: projectId, expId: "exp-1" })
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to update experiment");
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/research/projects/[id]/experiments/[expId]
// ---------------------------------------------------------------------------

describe("Experiments API – DELETE /api/research/projects/[id]/experiments/[expId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultResult.data = null;
    defaultResult.error = null;
  });

  it("returns 401 when unauthenticated", async () => {
    const { DELETE } = await importExperimentById();
    unauthenticatedUser();

    const res = await DELETE(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/exp-1`, {
        method: "DELETE",
      }),
      makeParams({ id: projectId, expId: "exp-1" })
    );
    expect(res.status).toBe(401);
  });

  it("deletes experiment when user is admin", async () => {
    const { DELETE } = await importExperimentById();
    authenticatedUser();

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "admin" }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: null })
    );

    const res = await DELETE(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/exp-1`, {
        method: "DELETE",
      }),
      makeParams({ id: projectId, expId: "exp-1" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("deletes experiment when user is owner", async () => {
    const { DELETE } = await importExperimentById();
    authenticatedUser();

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "owner" }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: null })
    );

    const res = await DELETE(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/exp-1`, {
        method: "DELETE",
      }),
      makeParams({ id: projectId, expId: "exp-1" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 404 when experiment not found", async () => {
    const { DELETE } = await importExperimentById();
    authenticatedUser();

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "PGRST116" } })
    );

    const res = await DELETE(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/gone`, {
        method: "DELETE",
      }),
      makeParams({ id: projectId, expId: "gone" })
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Experiment not found");
  });

  it("returns 403 when non-admin member tries to delete", async () => {
    const { DELETE } = await importExperimentById();
    authenticatedUser();

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );

    const res = await DELETE(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/exp-1`, {
        method: "DELETE",
      }),
      makeParams({ id: projectId, expId: "exp-1" })
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Admin access required to delete experiments");
  });

  it("returns 403 when limited user tries to delete", async () => {
    const { DELETE } = await importExperimentById();
    authenticatedUser();

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "limited" }, error: null })
    );

    const res = await DELETE(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/exp-1`, {
        method: "DELETE",
      }),
      makeParams({ id: projectId, expId: "exp-1" })
    );
    expect(res.status).toBe(403);
  });

  it("returns 403 when user has no membership", async () => {
    const { DELETE } = await importExperimentById();
    authenticatedUser();

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: null })
    );

    const res = await DELETE(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/exp-1`, {
        method: "DELETE",
      }),
      makeParams({ id: projectId, expId: "exp-1" })
    );
    expect(res.status).toBe(403);
  });

  it("returns 500 on database error during delete", async () => {
    const { DELETE } = await importExperimentById();
    authenticatedUser();

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "admin" }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { message: "FK constraint prevents delete" } })
    );

    const res = await DELETE(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/exp-1`, {
        method: "DELETE",
      }),
      makeParams({ id: projectId, expId: "exp-1" })
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to delete experiment");
  });
});
