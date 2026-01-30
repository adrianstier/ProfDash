/**
 * Research Dashboard API Route Tests
 *
 * Tests for dashboard stats endpoint:
 *   GET /api/research/projects/[id]/dashboard
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

const importDashboardRoute = () =>
  import("@/app/api/research/projects/[id]/dashboard/route");

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Dashboard API - GET /api/research/projects/[id]/dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultResult.data = null;
    defaultResult.error = null;
  });

  it("returns 401 when unauthenticated", async () => {
    const { GET } = await importDashboardRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await GET(
      makeRequest(`http://localhost/api/research/projects/${projectId}/dashboard`) as any,
      makeParams({ id: projectId })
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 when project not found", async () => {
    const { GET } = await importDashboardRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "PGRST116" } })
    );

    const res = await GET(
      makeRequest("http://localhost/api/research/projects/bad-id/dashboard") as any,
      makeParams({ id: "bad-id" })
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 for non-research project", async () => {
    const { GET } = await importDashboardRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    // project found but type is manuscript
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({
        data: { id: projectId, workspace_id: workspaceId, type: "manuscript", title: "Paper" },
        error: null,
      })
    );
    // membership check
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: "mem-1" }, error: null })
    );

    const res = await GET(
      makeRequest(`http://localhost/api/research/projects/${projectId}/dashboard`) as any,
      makeParams({ id: projectId })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("research projects");
  });

  it("returns 403 when user not in workspace", async () => {
    const { GET } = await importDashboardRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({
        data: { id: projectId, workspace_id: workspaceId, type: "research", title: "Field Study" },
        error: null,
      })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: null })
    );

    const res = await GET(
      makeRequest(`http://localhost/api/research/projects/${projectId}/dashboard`) as any,
      makeParams({ id: projectId })
    );
    expect(res.status).toBe(403);
  });

  it("returns experiment stats with counts by status", async () => {
    const { GET } = await importDashboardRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    // project
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({
        data: { id: projectId, workspace_id: workspaceId, type: "research", title: "Field Study" },
        error: null,
      })
    );
    // membership
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: "mem-1" }, error: null })
    );
    // experiments
    const experiments = [
      { id: "exp-1", status: "active", title: "Exp1", fieldwork_start: null, fieldwork_end: null, lead_id: "u1", site_id: "s1" },
      { id: "exp-2", status: "planning", title: "Exp2", fieldwork_start: null, fieldwork_end: null, lead_id: null, site_id: null },
      { id: "exp-3", status: "completed", title: "Exp3", fieldwork_start: null, fieldwork_end: null, lead_id: "u2", site_id: "s2" },
    ];
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: experiments, error: null })
    );
    // permits
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: [], error: null })
    );
    // fieldwork (no experiments so won't query, but experimentIds.length > 0)
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: [], error: null })
    );
    // team assignments
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: [], error: null })
    );

    const res = await GET(
      makeRequest(`http://localhost/api/research/projects/${projectId}/dashboard`) as any,
      makeParams({ id: projectId })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.experiments.total).toBe(3);
    expect(body.experiments.active).toBe(1);
    expect(body.experiments.planning).toBe(1);
    expect(body.experiments.completed).toBe(1);
  });

  it("returns permit stats with active and pending counts", async () => {
    const { GET } = await importDashboardRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({
        data: { id: projectId, workspace_id: workspaceId, type: "research", title: "Field Study" },
        error: null,
      })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: "mem-1" }, error: null })
    );
    // experiments - empty
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: [], error: null })
    );
    // permits
    const permits = [
      { id: "p1", status: "active", title: "IACUC", permit_type: "IACUC", expiration_date: "2099-12-31", renewal_reminder_days: 60 },
      { id: "p2", status: "pending", title: "IBC", permit_type: "IBC", expiration_date: "2099-12-31", renewal_reminder_days: 60 },
      { id: "p3", status: "active", title: "Collection", permit_type: "collection", expiration_date: "2099-12-31", renewal_reminder_days: 60 },
    ];
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: permits, error: null })
    );
    // no experiments => no fieldwork/team queries

    const res = await GET(
      makeRequest(`http://localhost/api/research/projects/${projectId}/dashboard`) as any,
      makeParams({ id: projectId })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.permits.total).toBe(3);
    expect(body.permits.active).toBe(2);
    expect(body.permits.pending).toBe(1);
  });

  it("returns upcoming fieldwork", async () => {
    const { GET } = await importDashboardRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({
        data: { id: projectId, workspace_id: workspaceId, type: "research", title: "Field Study" },
        error: null,
      })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: "mem-1" }, error: null })
    );
    // experiments
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: [{ id: "exp-1", status: "active", title: "Exp1", fieldwork_start: null, fieldwork_end: null, lead_id: "u1", site_id: "s1" }], error: null })
    );
    // permits
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: [], error: null })
    );
    // fieldwork
    const fieldwork = [
      {
        id: "fw-1",
        title: "Summer Field Trip",
        start_date: "2025-07-01",
        end_date: "2025-07-15",
        status: "planned",
        site: { id: "s1", name: "Reef A", code: "RA" },
        experiment: { id: "exp-1", title: "Exp1", code: "E1" },
      },
    ];
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: fieldwork, error: null })
    );
    // team assignments
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: [], error: null })
    );

    const res = await GET(
      makeRequest(`http://localhost/api/research/projects/${projectId}/dashboard`) as any,
      makeParams({ id: projectId })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.fieldwork.upcoming_count).toBe(1);
    expect(body.fieldwork.upcoming[0].title).toBe("Summer Field Trip");
  });

  it("returns needs_attention items for experiments without leads", async () => {
    const { GET } = await importDashboardRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({
        data: { id: projectId, workspace_id: workspaceId, type: "research", title: "Study" },
        error: null,
      })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: "mem-1" }, error: null })
    );
    // experiments - one without lead
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({
        data: [
          { id: "exp-1", status: "active", title: "No Lead Experiment", fieldwork_start: null, fieldwork_end: null, lead_id: null, site_id: "s1" },
        ],
        error: null,
      })
    );
    // permits
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: [], error: null })
    );
    // fieldwork
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: [], error: null })
    );
    // team assignments
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: [], error: null })
    );

    const res = await GET(
      makeRequest(`http://localhost/api/research/projects/${projectId}/dashboard`) as any,
      makeParams({ id: projectId })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.needs_attention.length).toBeGreaterThan(0);
    expect(body.needs_attention[0].type).toBe("experiment");
    expect(body.needs_attention[0].message).toContain("no assigned lead");
  });

  it("returns team member count", async () => {
    const { GET } = await importDashboardRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({
        data: { id: projectId, workspace_id: workspaceId, type: "research", title: "Study" },
        error: null,
      })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: "mem-1" }, error: null })
    );
    // experiments
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({
        data: [{ id: "exp-1", status: "active", title: "Exp1", fieldwork_start: null, fieldwork_end: null, lead_id: "u1", site_id: "s1" }],
        error: null,
      })
    );
    // permits
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: [], error: null })
    );
    // fieldwork
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: [], error: null })
    );
    // team assignments - 3 assignments, 2 unique personnel_ids
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({
        data: [
          { personnel_id: "pers-1" },
          { personnel_id: "pers-2" },
          { personnel_id: "pers-1" },
        ],
        error: null,
      })
    );

    const res = await GET(
      makeRequest(`http://localhost/api/research/projects/${projectId}/dashboard`) as any,
      makeParams({ id: projectId })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.team.total_members).toBe(2);
  });

  it("handles empty project with no experiments or permits", async () => {
    const { GET } = await importDashboardRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({
        data: { id: projectId, workspace_id: workspaceId, type: "research", title: "Empty Study" },
        error: null,
      })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: "mem-1" }, error: null })
    );
    // experiments - empty
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: [], error: null })
    );
    // permits - empty
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: [], error: null })
    );
    // no experiments => no fieldwork/team queries

    const res = await GET(
      makeRequest(`http://localhost/api/research/projects/${projectId}/dashboard`) as any,
      makeParams({ id: projectId })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.experiments.total).toBe(0);
    expect(body.permits.total).toBe(0);
    expect(body.team.total_members).toBe(0);
    expect(body.fieldwork.upcoming_count).toBe(0);
    expect(body.fieldwork.upcoming).toEqual([]);
    expect(body.needs_attention).toEqual([]);
  });

  it("returns project info in response", async () => {
    const { GET } = await importDashboardRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({
        data: { id: projectId, workspace_id: workspaceId, type: "research", title: "Coral Study" },
        error: null,
      })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: "mem-1" }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: [], error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: [], error: null })
    );

    const res = await GET(
      makeRequest(`http://localhost/api/research/projects/${projectId}/dashboard`) as any,
      makeParams({ id: projectId })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.project.id).toBe(projectId);
    expect(body.project.title).toBe("Coral Study");
    expect(body.project.type).toBe("research");
  });

  it("returns expiring_permits in response", async () => {
    const { GET } = await importDashboardRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({
        data: { id: projectId, workspace_id: workspaceId, type: "research", title: "Study" },
        error: null,
      })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: "mem-1" }, error: null })
    );
    // experiments
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: [], error: null })
    );
    // permits - one expiring soon (within renewal_reminder_days)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 5);
    const permits = [
      {
        id: "p1",
        status: "active",
        title: "Expiring Permit",
        permit_type: "IACUC",
        expiration_date: tomorrow.toISOString().split("T")[0],
        renewal_reminder_days: 60,
      },
    ];
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: permits, error: null })
    );

    const res = await GET(
      makeRequest(`http://localhost/api/research/projects/${projectId}/dashboard`) as any,
      makeParams({ id: projectId })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.expiring_permits.length).toBeGreaterThan(0);
    expect(body.permits.expiring_soon).toBeGreaterThan(0);
  });
});
