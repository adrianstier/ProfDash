/**
 * Research Fieldwork Schedules API Route Tests
 *
 * Tests for fieldwork schedule endpoints:
 *   GET/POST/PATCH/DELETE /api/research/projects/[id]/experiments/[expId]/fieldwork
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
  CreateFieldworkScheduleSchema: {
    safeParse: vi.fn((data: Record<string, unknown>) => {
      if (!data.title || !data.start_date || !data.end_date) {
        return {
          success: false,
          error: {
            flatten: () => ({
              fieldErrors: {
                title: !data.title ? ["Required"] : undefined,
                start_date: !data.start_date ? ["Required"] : undefined,
                end_date: !data.end_date ? ["Required"] : undefined,
              },
            }),
          },
        };
      }
      const startDate = new Date(data.start_date as string);
      const endDate = new Date(data.end_date as string);
      if (endDate < startDate) {
        return {
          success: false,
          error: {
            flatten: () => ({
              fieldErrors: { end_date: ["End date must be on or after start date"] },
            }),
          },
        };
      }
      return {
        success: true,
        data: {
          ...data,
          start_date: startDate,
          end_date: endDate,
        },
      };
    }),
  },
  UpdateFieldworkScheduleSchema: {
    safeParse: vi.fn((data: Record<string, unknown>) => {
      const validStatuses = ["planned", "confirmed", "in_progress", "completed", "cancelled"];
      if (data.status && !validStatuses.includes(data.status as string)) {
        return {
          success: false,
          error: {
            flatten: () => ({
              fieldErrors: { status: ["Invalid status"] },
            }),
          },
        };
      }
      const result: Record<string, unknown> = { ...data };
      if (data.start_date !== undefined) {
        result.start_date = new Date(data.start_date as string);
      }
      if (data.end_date !== undefined) {
        result.end_date = new Date(data.end_date as string);
      }
      return { success: true, data: result };
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
const scheduleId = "sched-001";

const importFieldworkRoute = () =>
  import("@/app/api/research/projects/[id]/experiments/[expId]/fieldwork/route");

// ---------------------------------------------------------------------------
// Tests - GET
// ---------------------------------------------------------------------------

describe("Fieldwork API - GET /api/research/projects/[id]/experiments/[expId]/fieldwork", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultResult.data = null;
    defaultResult.error = null;
  });

  it("returns 401 when unauthenticated", async () => {
    const { GET } = await importFieldworkRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await GET(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/${experimentId}/fieldwork`) as any,
      makeParams({ id: projectId, expId: experimentId })
    );
    expect(res.status).toBe(401);
  });

  it("returns schedules with site info", async () => {
    const { GET } = await importFieldworkRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: experimentId, project_id: projectId }, error: null })
    );

    const schedules = [
      {
        id: "s1",
        title: "Summer Fieldwork",
        start_date: "2025-06-01",
        end_date: "2025-06-15",
        status: "planned",
        site: { id: "site-1", name: "Coral Reef A", code: "CRA" },
        experiment: { id: experimentId, title: "Reef Survey", code: "RS-01" },
      },
    ];
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: schedules, error: null })
    );

    const res = await GET(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/${experimentId}/fieldwork`) as any,
      makeParams({ id: projectId, expId: experimentId })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].site.name).toBe("Coral Reef A");
  });

  it("returns 404 when experiment not found", async () => {
    const { GET } = await importFieldworkRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "PGRST116" } })
    );

    const res = await GET(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/bad-exp/fieldwork`) as any,
      makeParams({ id: projectId, expId: "bad-exp" })
    );
    expect(res.status).toBe(404);
  });

  it("filters by status query param", async () => {
    const { GET } = await importFieldworkRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: experimentId, project_id: projectId }, error: null })
    );

    const fieldworkChain = createMockChain({ data: [], error: null });
    mockSupabase.from.mockReturnValueOnce(fieldworkChain);

    await GET(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/${experimentId}/fieldwork?status=confirmed`) as any,
      makeParams({ id: projectId, expId: experimentId })
    );

    expect(fieldworkChain.eq).toHaveBeenCalledWith("status", "confirmed");
  });

  it("returns empty array when no schedules", async () => {
    const { GET } = await importFieldworkRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: experimentId, project_id: projectId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: [], error: null })
    );

    const res = await GET(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/${experimentId}/fieldwork`) as any,
      makeParams({ id: projectId, expId: experimentId })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it("returns 500 on database error", async () => {
    const { GET } = await importFieldworkRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: experimentId, project_id: projectId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { message: "DB error" } })
    );

    const res = await GET(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/${experimentId}/fieldwork`) as any,
      makeParams({ id: projectId, expId: experimentId })
    );
    expect(res.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// Tests - POST
// ---------------------------------------------------------------------------

describe("Fieldwork API - POST /api/research/projects/[id]/experiments/[expId]/fieldwork", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultResult.data = null;
    defaultResult.error = null;
  });

  it("returns 401 when unauthenticated", async () => {
    const { POST } = await importFieldworkRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await POST(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/${experimentId}/fieldwork`, {
        method: "POST",
        body: JSON.stringify({ title: "Trip", start_date: "2025-06-01", end_date: "2025-06-15" }),
      }) as any,
      makeParams({ id: projectId, expId: experimentId })
    );
    expect(res.status).toBe(401);
  });

  it("creates schedule with required fields", async () => {
    const { POST } = await importFieldworkRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: experimentId, project_id: projectId, workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );

    const newSchedule = {
      id: scheduleId,
      title: "Summer Trip",
      start_date: "2025-06-01",
      end_date: "2025-06-15",
      status: "planned",
    };
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: newSchedule, error: null })
    );

    const res = await POST(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/${experimentId}/fieldwork`, {
        method: "POST",
        body: JSON.stringify({ title: "Summer Trip", start_date: "2025-06-01", end_date: "2025-06-15" }),
      }) as any,
      makeParams({ id: projectId, expId: experimentId })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.title).toBe("Summer Trip");
  });

  it("creates schedule with all fields including logistics", async () => {
    const { POST } = await importFieldworkRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: experimentId, project_id: projectId, workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "admin" }, error: null })
    );

    const fullSchedule = {
      id: "sched-full",
      title: "Winter Expedition",
      start_date: "2025-12-01",
      end_date: "2025-12-20",
      status: "confirmed",
      travel_booked: true,
      accommodation_booked: true,
      permits_verified: true,
      logistics_notes: "Flights confirmed",
      budget_estimate: 5000,
    };
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: fullSchedule, error: null })
    );

    const res = await POST(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/${experimentId}/fieldwork`, {
        method: "POST",
        body: JSON.stringify({
          title: "Winter Expedition",
          start_date: "2025-12-01",
          end_date: "2025-12-20",
          status: "confirmed",
          travel_booked: true,
          accommodation_booked: true,
          permits_verified: true,
          logistics_notes: "Flights confirmed",
          budget_estimate: 5000,
        }),
      }) as any,
      makeParams({ id: projectId, expId: experimentId })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.travel_booked).toBe(true);
    expect(body.accommodation_booked).toBe(true);
    expect(body.permits_verified).toBe(true);
  });

  it("returns 400 when required fields are missing", async () => {
    const { POST } = await importFieldworkRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: experimentId, project_id: projectId, workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );

    const res = await POST(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/${experimentId}/fieldwork`, {
        method: "POST",
        body: JSON.stringify({}),
      }) as any,
      makeParams({ id: projectId, expId: experimentId })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when end_date is before start_date", async () => {
    const { POST } = await importFieldworkRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: experimentId, project_id: projectId, workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );

    const res = await POST(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/${experimentId}/fieldwork`, {
        method: "POST",
        body: JSON.stringify({ title: "Bad Dates", start_date: "2025-12-31", end_date: "2025-01-01" }),
      }) as any,
      makeParams({ id: projectId, expId: experimentId })
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when experiment not found", async () => {
    const { POST } = await importFieldworkRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "PGRST116" } })
    );

    const res = await POST(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/bad-exp/fieldwork`, {
        method: "POST",
        body: JSON.stringify({ title: "Trip", start_date: "2025-06-01", end_date: "2025-06-15" }),
      }) as any,
      makeParams({ id: projectId, expId: "bad-exp" })
    );
    expect(res.status).toBe(404);
  });

  it("returns 403 when user not in workspace", async () => {
    const { POST } = await importFieldworkRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: experimentId, project_id: projectId, workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: null })
    );

    const res = await POST(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/${experimentId}/fieldwork`, {
        method: "POST",
        body: JSON.stringify({ title: "Trip", start_date: "2025-06-01", end_date: "2025-06-15" }),
      }) as any,
      makeParams({ id: projectId, expId: experimentId })
    );
    expect(res.status).toBe(403);
  });

  it("returns 500 on insert error", async () => {
    const { POST } = await importFieldworkRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: experimentId, project_id: projectId, workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { message: "Insert failed" } })
    );

    const res = await POST(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/${experimentId}/fieldwork`, {
        method: "POST",
        body: JSON.stringify({ title: "Trip", start_date: "2025-06-01", end_date: "2025-06-15" }),
      }) as any,
      makeParams({ id: projectId, expId: experimentId })
    );
    expect(res.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// Tests - PATCH
// ---------------------------------------------------------------------------

describe("Fieldwork API - PATCH /api/research/projects/[id]/experiments/[expId]/fieldwork", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultResult.data = null;
    defaultResult.error = null;
  });

  it("returns 401 when unauthenticated", async () => {
    const { PATCH } = await importFieldworkRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await PATCH(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/${experimentId}/fieldwork?schedule_id=${scheduleId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "confirmed" }),
      }) as any,
      makeParams({ id: projectId, expId: experimentId })
    );
    expect(res.status).toBe(401);
  });

  it("updates schedule fields", async () => {
    const { PATCH } = await importFieldworkRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    // schedule lookup
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: scheduleId, experiment_id: experimentId }, error: null })
    );
    // experiment lookup
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId }, error: null })
    );
    // membership
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );
    // update result
    const updated = { id: scheduleId, title: "Updated Trip", status: "confirmed" };
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: updated, error: null })
    );

    const res = await PATCH(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/${experimentId}/fieldwork?schedule_id=${scheduleId}`, {
        method: "PATCH",
        body: JSON.stringify({ title: "Updated Trip", status: "confirmed" }),
      }) as any,
      makeParams({ id: projectId, expId: experimentId })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("confirmed");
  });

  it("updates logistics booleans", async () => {
    const { PATCH } = await importFieldworkRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: scheduleId, experiment_id: experimentId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "admin" }, error: null })
    );

    const updated = {
      id: scheduleId,
      travel_booked: true,
      accommodation_booked: true,
      permits_verified: false,
    };
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: updated, error: null })
    );

    const res = await PATCH(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/${experimentId}/fieldwork?schedule_id=${scheduleId}`, {
        method: "PATCH",
        body: JSON.stringify({ travel_booked: true, accommodation_booked: true, permits_verified: false }),
      }) as any,
      makeParams({ id: projectId, expId: experimentId })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.travel_booked).toBe(true);
    expect(body.accommodation_booked).toBe(true);
    expect(body.permits_verified).toBe(false);
  });

  it("returns 404 when schedule not found", async () => {
    const { PATCH } = await importFieldworkRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "PGRST116" } })
    );

    const res = await PATCH(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/${experimentId}/fieldwork?schedule_id=nonexistent`, {
        method: "PATCH",
        body: JSON.stringify({ status: "confirmed" }),
      }) as any,
      makeParams({ id: projectId, expId: experimentId })
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid status", async () => {
    const { PATCH } = await importFieldworkRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: scheduleId, experiment_id: experimentId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );

    const res = await PATCH(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/${experimentId}/fieldwork?schedule_id=${scheduleId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "BOGUS" }),
      }) as any,
      makeParams({ id: projectId, expId: experimentId })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when schedule_id is missing", async () => {
    const { PATCH } = await importFieldworkRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    const res = await PATCH(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/${experimentId}/fieldwork`, {
        method: "PATCH",
        body: JSON.stringify({ status: "confirmed" }),
      }) as any,
      makeParams({ id: projectId, expId: experimentId })
    );
    expect(res.status).toBe(400);
  });

  it("returns 403 when user not in workspace", async () => {
    const { PATCH } = await importFieldworkRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: scheduleId, experiment_id: experimentId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: null })
    );

    const res = await PATCH(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/${experimentId}/fieldwork?schedule_id=${scheduleId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "confirmed" }),
      }) as any,
      makeParams({ id: projectId, expId: experimentId })
    );
    expect(res.status).toBe(403);
  });

  it("returns 500 on update error", async () => {
    const { PATCH } = await importFieldworkRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: scheduleId, experiment_id: experimentId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { message: "Update failed" } })
    );

    const res = await PATCH(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/${experimentId}/fieldwork?schedule_id=${scheduleId}`, {
        method: "PATCH",
        body: JSON.stringify({ title: "Updated" }),
      }) as any,
      makeParams({ id: projectId, expId: experimentId })
    );
    expect(res.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// Tests - DELETE
// ---------------------------------------------------------------------------

describe("Fieldwork API - DELETE /api/research/projects/[id]/experiments/[expId]/fieldwork", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultResult.data = null;
    defaultResult.error = null;
  });

  it("returns 401 when unauthenticated", async () => {
    const { DELETE } = await importFieldworkRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await DELETE(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/${experimentId}/fieldwork?schedule_id=${scheduleId}`, { method: "DELETE" }) as any,
      makeParams({ id: projectId, expId: experimentId })
    );
    expect(res.status).toBe(401);
  });

  it("deletes schedule successfully", async () => {
    const { DELETE } = await importFieldworkRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: scheduleId, experiment_id: experimentId }, error: null })
    );
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
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/${experimentId}/fieldwork?schedule_id=${scheduleId}`, { method: "DELETE" }) as any,
      makeParams({ id: projectId, expId: experimentId })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 404 when schedule not found", async () => {
    const { DELETE } = await importFieldworkRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "PGRST116" } })
    );

    const res = await DELETE(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/${experimentId}/fieldwork?schedule_id=nonexistent`, { method: "DELETE" }) as any,
      makeParams({ id: projectId, expId: experimentId })
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 when schedule_id is missing", async () => {
    const { DELETE } = await importFieldworkRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    const res = await DELETE(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/${experimentId}/fieldwork`, { method: "DELETE" }) as any,
      makeParams({ id: projectId, expId: experimentId })
    );
    expect(res.status).toBe(400);
  });

  it("returns 403 when user not in workspace", async () => {
    const { DELETE } = await importFieldworkRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: scheduleId, experiment_id: experimentId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: null })
    );

    const res = await DELETE(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/${experimentId}/fieldwork?schedule_id=${scheduleId}`, { method: "DELETE" }) as any,
      makeParams({ id: projectId, expId: experimentId })
    );
    expect(res.status).toBe(403);
  });

  it("returns 500 on delete database error", async () => {
    const { DELETE } = await importFieldworkRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: scheduleId, experiment_id: experimentId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { message: "Delete failed" } })
    );

    const res = await DELETE(
      makeRequest(`http://localhost/api/research/projects/${projectId}/experiments/${experimentId}/fieldwork?schedule_id=${scheduleId}`, { method: "DELETE" }) as any,
      makeParams({ id: projectId, expId: experimentId })
    );
    expect(res.status).toBe(500);
  });
});
