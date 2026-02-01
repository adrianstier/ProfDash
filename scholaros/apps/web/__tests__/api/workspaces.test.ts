/**
 * Workspaces API Route Tests
 *
 * Tests for:
 * - GET/POST /api/workspaces
 * - GET/PATCH /api/workspaces/[id]
 * - GET /api/workspaces/[id]/members
 * - PATCH/DELETE /api/workspaces/[id]/members/[memberId]
 * - GET/POST /api/workspaces/[id]/invites
 * - DELETE /api/workspaces/[id]/invites/[inviteId]
 * - POST /api/workspaces/accept-invite
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
  rpc: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock("crypto", () => ({
  default: {
    randomBytes: vi.fn(() => ({ toString: () => "mock-token-hex-string-1234567890abcdef" })),
  },
  randomBytes: vi.fn(() => ({ toString: () => "mock-token-hex-string-1234567890abcdef" })),
}));

const mockUser = { id: "user-123", email: "prof@example.com" };
const workspaceId = "550e8400-e29b-41d4-a716-446655440000";

function makeRequest(url: string, options?: RequestInit): Request {
  return new Request(url, options);
}

function makeParams<T>(value: T): { params: Promise<T> } {
  return { params: Promise.resolve(value) };
}

// ---------------------------------------------------------------------------
// GET /api/workspaces
// ---------------------------------------------------------------------------
describe("Workspaces API - GET /api/workspaces", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { GET } = await import("@/app/api/workspaces/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns workspaces for authenticated user", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const wsData = [
      { role: "owner", workspace: { id: workspaceId, name: "Lab", slug: "lab" } },
    ];
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: wsData, error: null })
    );

    const { GET } = await import("@/app/api/workspaces/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].role).toBe("owner");
  });

  it("returns 500 when supabase query fails", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { message: "DB error" } })
    );

    const { GET } = await import("@/app/api/workspaces/route");
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// POST /api/workspaces
// ---------------------------------------------------------------------------
describe("Workspaces API - POST /api/workspaces", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { POST } = await import("@/app/api/workspaces/route");
    const res = await POST(
      makeRequest("http://localhost/api/workspaces", {
        method: "POST",
        body: JSON.stringify({ name: "Lab", slug: "lab" }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid data", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { POST } = await import("@/app/api/workspaces/route");
    const res = await POST(
      makeRequest("http://localhost/api/workspaces", {
        method: "POST",
        body: JSON.stringify({ name: "" }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid slug format", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { POST } = await import("@/app/api/workspaces/route");
    const res = await POST(
      makeRequest("http://localhost/api/workspaces", {
        method: "POST",
        body: JSON.stringify({ name: "Lab", slug: "INVALID SLUG!" }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 409 when slug already exists", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Slug check returns existing workspace
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: "existing-ws" }, error: null })
    );

    const { POST } = await import("@/app/api/workspaces/route");
    const res = await POST(
      makeRequest("http://localhost/api/workspaces", {
        method: "POST",
        body: JSON.stringify({ name: "Lab", slug: "lab" }),
      })
    );
    expect(res.status).toBe(409);
  });

  it("creates workspace successfully", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Slug check - not found
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "PGRST116" } })
    );

    // RPC create_workspace_with_owner
    mockSupabase.rpc.mockResolvedValue({ data: workspaceId, error: null });

    // Fetch created workspace
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: workspaceId, name: "Lab", slug: "lab" }, error: null })
    );

    const { POST } = await import("@/app/api/workspaces/route");
    const res = await POST(
      makeRequest("http://localhost/api/workspaces", {
        method: "POST",
        body: JSON.stringify({ name: "Lab", slug: "lab" }),
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.role).toBe("owner");
  });
});

// ---------------------------------------------------------------------------
// GET /api/workspaces/[id]
// ---------------------------------------------------------------------------
describe("Workspaces API - GET /api/workspaces/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { GET } = await import("@/app/api/workspaces/[id]/route");
    const res = await GET(
      makeRequest(`http://localhost/api/workspaces/${workspaceId}`),
      makeParams({ id: workspaceId })
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 when not a member", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "PGRST116" } })
    );

    const { GET } = await import("@/app/api/workspaces/[id]/route");
    const res = await GET(
      makeRequest(`http://localhost/api/workspaces/${workspaceId}`),
      makeParams({ id: workspaceId })
    );
    expect(res.status).toBe(404);
  });

  it("returns workspace data when authorized", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Membership check
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "owner" }, error: null })
    );
    // Workspace fetch
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: workspaceId, name: "Lab", slug: "lab" }, error: null })
    );

    const { GET } = await import("@/app/api/workspaces/[id]/route");
    const res = await GET(
      makeRequest(`http://localhost/api/workspaces/${workspaceId}`),
      makeParams({ id: workspaceId })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.role).toBe("owner");
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/workspaces/[id]
// ---------------------------------------------------------------------------
describe("Workspaces API - PATCH /api/workspaces/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { PATCH } = await import("@/app/api/workspaces/[id]/route");
    const res = await PATCH(
      makeRequest(`http://localhost/api/workspaces/${workspaceId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
      }),
      makeParams({ id: workspaceId })
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not admin/owner", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );

    const { PATCH } = await import("@/app/api/workspaces/[id]/route");
    const res = await PATCH(
      makeRequest(`http://localhost/api/workspaces/${workspaceId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
      }),
      makeParams({ id: workspaceId })
    );
    expect(res.status).toBe(403);
  });

  it("updates workspace when user is owner", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Membership check
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "owner" }, error: null })
    );
    // Update result
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: workspaceId, name: "Updated Lab" }, error: null })
    );

    const { PATCH } = await import("@/app/api/workspaces/[id]/route");
    const res = await PATCH(
      makeRequest(`http://localhost/api/workspaces/${workspaceId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated Lab" }),
      }),
      makeParams({ id: workspaceId })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Updated Lab");
  });

  it("returns 400 for invalid update data", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "owner" }, error: null })
    );

    const { PATCH } = await import("@/app/api/workspaces/[id]/route");
    const res = await PATCH(
      makeRequest(`http://localhost/api/workspaces/${workspaceId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: "" }), // name requires min 1
      }),
      makeParams({ id: workspaceId })
    );
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// GET /api/workspaces/[id]/members
// ---------------------------------------------------------------------------
describe("Workspaces API - GET /api/workspaces/[id]/members", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { GET } = await import("@/app/api/workspaces/[id]/members/route");
    const res = await GET(
      makeRequest(`http://localhost/api/workspaces/${workspaceId}/members`),
      makeParams({ id: workspaceId })
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 when not a member", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "PGRST116" } })
    );

    const { GET } = await import("@/app/api/workspaces/[id]/members/route");
    const res = await GET(
      makeRequest(`http://localhost/api/workspaces/${workspaceId}/members`),
      makeParams({ id: workspaceId })
    );
    expect(res.status).toBe(404);
  });

  it("returns members list when authorized", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Membership check
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );

    // Members list
    const membersData = [
      { id: "m1", user_id: "user-123", role: "owner", profile: { email: "prof@example.com" } },
    ];
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: membersData, error: null })
    );

    const { GET } = await import("@/app/api/workspaces/[id]/members/route");
    const res = await GET(
      makeRequest(`http://localhost/api/workspaces/${workspaceId}/members`),
      makeParams({ id: workspaceId })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/workspaces/[id]/members/[memberId]
// ---------------------------------------------------------------------------
describe("Workspaces API - PATCH /api/workspaces/[id]/members/[memberId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { PATCH } = await import("@/app/api/workspaces/[id]/members/[memberId]/route");
    const res = await PATCH(
      makeRequest(`http://localhost/api/workspaces/${workspaceId}/members/m1`, {
        method: "PATCH",
        body: JSON.stringify({ role: "admin" }),
      }),
      makeParams({ id: workspaceId, memberId: "m1" })
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not owner", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "admin" }, error: null })
    );

    const { PATCH } = await import("@/app/api/workspaces/[id]/members/[memberId]/route");
    const res = await PATCH(
      makeRequest(`http://localhost/api/workspaces/${workspaceId}/members/m1`, {
        method: "PATCH",
        body: JSON.stringify({ role: "admin" }),
      }),
      makeParams({ id: workspaceId, memberId: "m1" })
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 when trying to change own role", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Owner check
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "owner" }, error: null })
    );
    // Target member is self
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { user_id: mockUser.id }, error: null })
    );

    const { PATCH } = await import("@/app/api/workspaces/[id]/members/[memberId]/route");
    const res = await PATCH(
      makeRequest(`http://localhost/api/workspaces/${workspaceId}/members/m1`, {
        method: "PATCH",
        body: JSON.stringify({ role: "member" }),
      }),
      makeParams({ id: workspaceId, memberId: "m1" })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Cannot change own role");
  });

  it("returns 400 for invalid role", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Owner check
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "owner" }, error: null })
    );

    const { PATCH } = await import("@/app/api/workspaces/[id]/members/[memberId]/route");
    const res = await PATCH(
      makeRequest(`http://localhost/api/workspaces/${workspaceId}/members/m1`, {
        method: "PATCH",
        body: JSON.stringify({ role: "superadmin" }),
      }),
      makeParams({ id: workspaceId, memberId: "m1" })
    );
    expect(res.status).toBe(400);
  });

  it("updates member role successfully", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Owner check
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "owner" }, error: null })
    );
    // Target member is not self
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { user_id: "other-user" }, error: null })
    );
    // Update result
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: "m1", role: "admin" }, error: null })
    );

    const { PATCH } = await import("@/app/api/workspaces/[id]/members/[memberId]/route");
    const res = await PATCH(
      makeRequest(`http://localhost/api/workspaces/${workspaceId}/members/m1`, {
        method: "PATCH",
        body: JSON.stringify({ role: "admin" }),
      }),
      makeParams({ id: workspaceId, memberId: "m1" })
    );
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/workspaces/[id]/members/[memberId]
// ---------------------------------------------------------------------------
describe("Workspaces API - DELETE /api/workspaces/[id]/members/[memberId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { DELETE } = await import("@/app/api/workspaces/[id]/members/[memberId]/route");
    const res = await DELETE(
      makeRequest(`http://localhost/api/workspaces/${workspaceId}/members/m1`, { method: "DELETE" }),
      makeParams({ id: workspaceId, memberId: "m1" })
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 when member not found", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "PGRST116" } })
    );

    const { DELETE } = await import("@/app/api/workspaces/[id]/members/[memberId]/route");
    const res = await DELETE(
      makeRequest(`http://localhost/api/workspaces/${workspaceId}/members/m1`, { method: "DELETE" }),
      makeParams({ id: workspaceId, memberId: "m1" })
    );
    expect(res.status).toBe(404);
  });

  it("returns 403 when non-owner tries to remove another member", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Target member
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { user_id: "other-user", role: "member" }, error: null })
    );
    // Current user's membership (not owner)
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );

    const { DELETE } = await import("@/app/api/workspaces/[id]/members/[memberId]/route");
    const res = await DELETE(
      makeRequest(`http://localhost/api/workspaces/${workspaceId}/members/m1`, { method: "DELETE" }),
      makeParams({ id: workspaceId, memberId: "m1" })
    );
    expect(res.status).toBe(403);
  });

  it("removes member successfully when owner", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Target member
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { user_id: "other-user", role: "member" }, error: null })
    );
    // Current user is owner
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "owner" }, error: null })
    );
    // Delete
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: null })
    );

    const { DELETE } = await import("@/app/api/workspaces/[id]/members/[memberId]/route");
    const res = await DELETE(
      makeRequest(`http://localhost/api/workspaces/${workspaceId}/members/m1`, { method: "DELETE" }),
      makeParams({ id: workspaceId, memberId: "m1" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// GET /api/workspaces/[id]/invites
// ---------------------------------------------------------------------------
describe("Workspaces API - GET /api/workspaces/[id]/invites", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { GET } = await import("@/app/api/workspaces/[id]/invites/route");
    const res = await GET(
      makeRequest(`http://localhost/api/workspaces/${workspaceId}/invites`),
      makeParams({ id: workspaceId })
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not admin/owner", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );

    const { GET } = await import("@/app/api/workspaces/[id]/invites/route");
    const res = await GET(
      makeRequest(`http://localhost/api/workspaces/${workspaceId}/invites`),
      makeParams({ id: workspaceId })
    );
    expect(res.status).toBe(403);
  });

  it("returns invites when user is admin", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Membership check
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "admin" }, error: null })
    );
    // Invites query
    const invitesData = [
      { id: "inv-1", email: "new@example.com", role: "member" },
    ];
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: invitesData, error: null })
    );

    const { GET } = await import("@/app/api/workspaces/[id]/invites/route");
    const res = await GET(
      makeRequest(`http://localhost/api/workspaces/${workspaceId}/invites`),
      makeParams({ id: workspaceId })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// POST /api/workspaces/[id]/invites
// ---------------------------------------------------------------------------
describe("Workspaces API - POST /api/workspaces/[id]/invites", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { POST } = await import("@/app/api/workspaces/[id]/invites/route");
    const res = await POST(
      makeRequest(`http://localhost/api/workspaces/${workspaceId}/invites`, {
        method: "POST",
        body: JSON.stringify({ email: "new@example.com", role: "member" }),
      }),
      makeParams({ id: workspaceId })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid email", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Membership check
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "admin" }, error: null })
    );

    const { POST } = await import("@/app/api/workspaces/[id]/invites/route");
    const res = await POST(
      makeRequest(`http://localhost/api/workspaces/${workspaceId}/invites`, {
        method: "POST",
        body: JSON.stringify({ email: "not-an-email", role: "member" }),
      }),
      makeParams({ id: workspaceId })
    );
    expect(res.status).toBe(400);
  });

  it("returns 403 when user is regular member", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );

    const { POST } = await import("@/app/api/workspaces/[id]/invites/route");
    const res = await POST(
      makeRequest(`http://localhost/api/workspaces/${workspaceId}/invites`, {
        method: "POST",
        body: JSON.stringify({ email: "new@example.com", role: "member" }),
      }),
      makeParams({ id: workspaceId })
    );
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/workspaces/[id]/invites/[inviteId]
// ---------------------------------------------------------------------------
describe("Workspaces API - DELETE /api/workspaces/[id]/invites/[inviteId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { DELETE } = await import("@/app/api/workspaces/[id]/invites/[inviteId]/route");
    const res = await DELETE(
      makeRequest(`http://localhost/api/workspaces/${workspaceId}/invites/inv-1`, { method: "DELETE" }),
      makeParams({ id: workspaceId, inviteId: "inv-1" })
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not admin/owner", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );

    const { DELETE } = await import("@/app/api/workspaces/[id]/invites/[inviteId]/route");
    const res = await DELETE(
      makeRequest(`http://localhost/api/workspaces/${workspaceId}/invites/inv-1`, { method: "DELETE" }),
      makeParams({ id: workspaceId, inviteId: "inv-1" })
    );
    expect(res.status).toBe(403);
  });

  it("deletes invite when user is admin", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Membership check
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "admin" }, error: null })
    );
    // Delete
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: null })
    );

    const { DELETE } = await import("@/app/api/workspaces/[id]/invites/[inviteId]/route");
    const res = await DELETE(
      makeRequest(`http://localhost/api/workspaces/${workspaceId}/invites/inv-1`, { method: "DELETE" }),
      makeParams({ id: workspaceId, inviteId: "inv-1" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// POST /api/workspaces/accept-invite
// ---------------------------------------------------------------------------
describe("Workspaces API - POST /api/workspaces/accept-invite", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { POST } = await import("@/app/api/workspaces/accept-invite/route");
    const res = await POST(
      makeRequest("http://localhost/api/workspaces/accept-invite", {
        method: "POST",
        body: JSON.stringify({ token: "abc123" }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid token", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { POST } = await import("@/app/api/workspaces/accept-invite/route");
    const res = await POST(
      makeRequest("http://localhost/api/workspaces/accept-invite", {
        method: "POST",
        body: JSON.stringify({ token: "" }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("accepts invite successfully", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabase.rpc.mockResolvedValue({
      data: { success: true, workspace_id: workspaceId, role: "member" },
      error: null,
    });

    const { POST } = await import("@/app/api/workspaces/accept-invite/route");
    const res = await POST(
      makeRequest("http://localhost/api/workspaces/accept-invite", {
        method: "POST",
        body: JSON.stringify({ token: "valid-token-123" }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.workspace_id).toBe(workspaceId);
    expect(body.role).toBe("member");
  });

  it("returns 400 when invite is expired", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabase.rpc.mockResolvedValue({
      data: { success: false, error: "Invite has expired" },
      error: null,
    });

    const { POST } = await import("@/app/api/workspaces/accept-invite/route");
    const res = await POST(
      makeRequest("http://localhost/api/workspaces/accept-invite", {
        method: "POST",
        body: JSON.stringify({ token: "expired-token" }),
      })
    );
    expect(res.status).toBe(400);
  });
});
