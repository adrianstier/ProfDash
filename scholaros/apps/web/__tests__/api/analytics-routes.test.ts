/**
 * Analytics & Activity API Route Tests
 *
 * Tests for:
 * - GET/POST /api/activity
 * - GET /api/analytics
 * - GET/POST /api/analytics/events
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// --- Chainable mock builder ---
function createMockChain(result: { data: unknown; error: unknown; count?: number | null }) {
  const chain: Record<string, unknown> = {};
  const methods = [
    "select", "insert", "update", "delete", "upsert",
    "eq", "in", "is", "gte", "lte", "gt", "lt",
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

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => createMockChain({ data: null, error: null })),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

// Mock shared schemas
vi.mock("@scholaros/shared", () => ({
  CreateActivitySchema: {
    safeParse: vi.fn((data: Record<string, unknown>) => {
      if (!data.workspace_id || !data.action) {
        return {
          success: false,
          error: { flatten: () => ({ fieldErrors: { action: ["Required"] } }) },
        };
      }
      return { success: true, data };
    }),
  },
}));

vi.mock("@scholaros/shared/schemas", () => ({
  AnalyticsEventBatchSchema: {
    safeParse: vi.fn((data: Record<string, unknown>) => {
      if (!data.events || !Array.isArray(data.events)) {
        return {
          success: false,
          error: { flatten: () => ({ fieldErrors: { events: ["Required"] } }) },
        };
      }
      return { success: true, data };
    }),
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(() => ({
    success: true,
    limit: 60,
    remaining: 59,
    reset: Date.now() + 60000,
  })),
  getRateLimitHeaders: vi.fn(() => ({})),
}));

const mockUser = { id: "user-123", email: "prof@example.com" };
const workspaceId = "550e8400-e29b-41d4-a716-446655440000";

function makeRequest(url: string, options?: RequestInit): Request {
  return new Request(url, options);
}

// ---------------------------------------------------------------------------
// GET /api/activity
// ---------------------------------------------------------------------------
describe("Activity API - GET /api/activity", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { GET } = await import("@/app/api/activity/route");
    const res = await GET(
      makeRequest(`http://localhost/api/activity?workspace_id=${workspaceId}`)
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when workspace_id is missing", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { GET } = await import("@/app/api/activity/route");
    const res = await GET(makeRequest("http://localhost/api/activity"));
    expect(res.status).toBe(400);
  });

  it("returns 403 when not a workspace member", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: null })
    );

    const { GET } = await import("@/app/api/activity/route");
    const res = await GET(
      makeRequest(`http://localhost/api/activity?workspace_id=${workspaceId}`)
    );
    expect(res.status).toBe(403);
  });

  it("returns activity feed for workspace member", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Membership check
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: "member-1" }, error: null })
    );
    // Activity query
    const activityData = [
      { id: "act-1", action: "task_created", user_id: mockUser.id, created_at: "2024-01-15T10:00:00Z" },
    ];
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: activityData, error: null })
    );

    const { GET } = await import("@/app/api/activity/route");
    const res = await GET(
      makeRequest(`http://localhost/api/activity?workspace_id=${workspaceId}`)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("has_more");
  });
});

// ---------------------------------------------------------------------------
// POST /api/activity
// ---------------------------------------------------------------------------
describe("Activity API - POST /api/activity", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { POST } = await import("@/app/api/activity/route");
    const res = await POST(
      makeRequest("http://localhost/api/activity", {
        method: "POST",
        body: JSON.stringify({ workspace_id: workspaceId, action: "task_created" }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid data", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { POST } = await import("@/app/api/activity/route");
    const res = await POST(
      makeRequest("http://localhost/api/activity", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 403 when not a workspace member", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: null })
    );

    const { POST } = await import("@/app/api/activity/route");
    const res = await POST(
      makeRequest("http://localhost/api/activity", {
        method: "POST",
        body: JSON.stringify({ workspace_id: workspaceId, action: "task_created" }),
      })
    );
    expect(res.status).toBe(403);
  });

  it("creates activity entry successfully", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Membership check
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: "member-1" }, error: null })
    );
    // Insert activity
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: "act-1", action: "task_created" }, error: null })
    );

    const { POST } = await import("@/app/api/activity/route");
    const res = await POST(
      makeRequest("http://localhost/api/activity", {
        method: "POST",
        body: JSON.stringify({ workspace_id: workspaceId, action: "task_created" }),
      })
    );
    expect(res.status).toBe(201);
  });
});

// ---------------------------------------------------------------------------
// GET /api/analytics
// ---------------------------------------------------------------------------
describe("Analytics API - GET /api/analytics", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const { GET } = await import("@/app/api/analytics/route");
    const res = await GET(
      makeRequest(`http://localhost/api/analytics?workspace_id=${workspaceId}`) as any
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when workspace_id is missing", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { GET } = await import("@/app/api/analytics/route");
    const res = await GET(
      makeRequest("http://localhost/api/analytics") as any
    );
    expect(res.status).toBe(400);
  });

  it("returns 403 when not a workspace member", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: null })
    );

    const { GET } = await import("@/app/api/analytics/route");
    const res = await GET(
      makeRequest(`http://localhost/api/analytics?workspace_id=${workspaceId}`) as any
    );
    expect(res.status).toBe(403);
  });

  it("returns analytics data for workspace", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Membership check
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: "member-1" }, error: null })
    );

    // Tasks
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({
        data: [
          { id: "t1", status: "done", priority: "p1", category: "research", created_at: "2024-01-15", completed_at: "2024-01-16", assignees: [] },
          { id: "t2", status: "todo", priority: "p2", category: "grants", created_at: "2024-01-15", completed_at: null, assignees: [] },
        ],
        error: null,
      })
    );
    // Projects
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({
        data: [{ id: "p1", type: "manuscript", stage: "drafting", created_at: "2024-01-10" }],
        error: null,
      })
    );
    // Members
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({
        data: [{ user_id: mockUser.id, role: "owner", profiles: { full_name: "Prof", avatar_url: null } }],
        error: null,
      })
    );
    // Activity
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({
        data: [{ id: "act-1", action: "task_created", user_id: mockUser.id, created_at: "2024-01-15T10:00:00Z" }],
        error: null,
      })
    );
    // Completed tasks
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({
        data: [{ id: "t1", completed_at: "2024-01-16T10:00:00Z", assignees: [mockUser.id] }],
        error: null,
      })
    );

    const { GET } = await import("@/app/api/analytics/route");
    const res = await GET(
      makeRequest(`http://localhost/api/analytics?workspace_id=${workspaceId}`) as any
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("summary");
    expect(body).toHaveProperty("tasksByStatus");
    expect(body).toHaveProperty("tasksByPriority");
    expect(body.summary.totalTasks).toBe(2);
  });

  it("handles different period parameters", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: "member-1" }, error: null })
    );

    // Mock all parallel queries
    for (let i = 0; i < 5; i++) {
      mockSupabase.from.mockReturnValueOnce(
        createMockChain({ data: [], error: null })
      );
    }

    const { GET } = await import("@/app/api/analytics/route");
    const res = await GET(
      makeRequest(`http://localhost/api/analytics?workspace_id=${workspaceId}&period=7d`) as any
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.period).toBe("7d");
  });
});

// ---------------------------------------------------------------------------
// GET /api/analytics/events
// ---------------------------------------------------------------------------
describe("Analytics Events API - GET /api/analytics/events", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const { GET } = await import("@/app/api/analytics/events/route");
    const res = await GET(makeRequest("http://localhost/api/analytics/events"));
    expect(res.status).toBe(401);
  });

  it("returns events for authenticated user", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const eventsData = [
      { id: "evt-1", event_name: "page_view", user_id: mockUser.id },
    ];
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: eventsData, error: null })
    );

    const { GET } = await import("@/app/api/analytics/events/route");
    const res = await GET(makeRequest("http://localhost/api/analytics/events"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("events");
  });

  it("gracefully handles missing table", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "42P01", message: "relation does not exist" } })
    );

    const { GET } = await import("@/app/api/analytics/events/route");
    const res = await GET(makeRequest("http://localhost/api/analytics/events"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.events).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// POST /api/analytics/events
// ---------------------------------------------------------------------------
describe("Analytics Events API - POST /api/analytics/events", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const { POST } = await import("@/app/api/analytics/events/route");
    const res = await POST(
      makeRequest("http://localhost/api/analytics/events", {
        method: "POST",
        body: JSON.stringify({ events: [] }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid event data", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { POST } = await import("@/app/api/analytics/events/route");
    const res = await POST(
      makeRequest("http://localhost/api/analytics/events", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 403 when events don't belong to user", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { POST } = await import("@/app/api/analytics/events/route");
    const res = await POST(
      makeRequest("http://localhost/api/analytics/events", {
        method: "POST",
        body: JSON.stringify({
          events: [
            { event_id: "evt-1", user_id: "other-user", event_name: "page_view" },
          ],
        }),
      })
    );
    expect(res.status).toBe(403);
  });

  it("stores events successfully", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: null })
    );

    const { POST } = await import("@/app/api/analytics/events/route");
    const res = await POST(
      makeRequest("http://localhost/api/analytics/events", {
        method: "POST",
        body: JSON.stringify({
          events: [
            {
              event_id: "evt-1",
              user_id: mockUser.id,
              workspace_id: workspaceId,
              event_name: "page_view",
              session_id: "sess-1",
              timestamp: "2024-01-15T10:00:00Z",
            },
          ],
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.stored).toBe(true);
  });

  it("handles graceful degradation when table not configured", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "42P01", message: "does not exist" } })
    );

    const { POST } = await import("@/app/api/analytics/events/route");
    const res = await POST(
      makeRequest("http://localhost/api/analytics/events", {
        method: "POST",
        body: JSON.stringify({
          events: [
            {
              event_id: "evt-1",
              user_id: mockUser.id,
              event_name: "page_view",
            },
          ],
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.stored).toBe(false);
  });
});
