/**
 * Presence API Route Tests
 *
 * Tests for GET /api/presence, POST /api/presence, PATCH /api/presence
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// --- Chainable mock builder ---
function createChainableMock(terminal?: Record<string, unknown>) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = [
    "select", "insert", "update", "delete", "upsert",
    "eq", "in", "is", "gte", "lte", "ilike", "or",
    "order", "limit", "range", "single", "maybeSingle",
  ];

  for (const m of methods) {
    chain[m] = vi.fn().mockImplementation(() => chain);
  }

  chain.then = vi.fn().mockImplementation((resolve: (v: unknown) => void) => {
    const val = terminal ?? { data: null, error: null };
    return Promise.resolve(val).then(resolve);
  });

  return chain;
}

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

const MOCK_USER = { id: "user-123", email: "test@example.com" };

describe("Presence API - GET /api/presence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { GET } = await import("@/app/api/presence/route");
    const request = new Request("http://localhost/api/presence?workspace_id=ws-1");
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("should return 400 when workspace_id is missing", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    const { GET } = await import("@/app/api/presence/route");
    const request = new Request("http://localhost/api/presence");
    const response = await GET(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("workspace_id is required");
  });

  it("should return 403 when user is not a workspace member", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    // First from() call is for workspace_members check
    const memberChain = createChainableMock();
    memberChain.single = vi.fn().mockResolvedValue({ data: null, error: null });

    mockSupabase.from.mockReturnValue(memberChain);

    const { GET } = await import("@/app/api/presence/route");
    const request = new Request("http://localhost/api/presence?workspace_id=ws-1");
    const response = await GET(request);
    expect(response.status).toBe(403);
  });

  it("should return presence data for workspace members", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    const presenceData = [
      { id: "p1", user_id: "user-1", status: "online", user: { id: "user-1", full_name: "Alice" } },
    ];

    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // workspace_members check
        const chain = createChainableMock();
        chain.single = vi.fn().mockResolvedValue({ data: { id: "m1" }, error: null });
        return chain;
      }
      // user_presence query
      return createChainableMock({ data: presenceData, error: null });
    });

    const { GET } = await import("@/app/api/presence/route");
    const request = new Request("http://localhost/api/presence?workspace_id=ws-1");
    const response = await GET(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toEqual(presenceData);
  });
});

describe("Presence API - POST /api/presence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { POST } = await import("@/app/api/presence/route");
    const request = new Request("http://localhost/api/presence", {
      method: "POST",
      body: JSON.stringify({ workspace_id: "ws-1", status: "online" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("should return 400 when workspace_id is missing", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    const { POST } = await import("@/app/api/presence/route");
    const request = new Request("http://localhost/api/presence", {
      method: "POST",
      body: JSON.stringify({ status: "online" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("should return 403 when user is not a workspace member", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    const memberChain = createChainableMock();
    memberChain.single = vi.fn().mockResolvedValue({ data: null, error: null });
    mockSupabase.from.mockReturnValue(memberChain);

    const { POST } = await import("@/app/api/presence/route");
    const request = new Request("http://localhost/api/presence", {
      method: "POST",
      body: JSON.stringify({ workspace_id: "ws-1", status: "online" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it("should upsert presence data successfully", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    const upsertedData = { id: "p1", user_id: "user-123", status: "online" };

    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // workspace_members check
        const chain = createChainableMock();
        chain.single = vi.fn().mockResolvedValue({ data: { id: "m1" }, error: null });
        return chain;
      }
      // upsert chain
      const chain = createChainableMock();
      chain.single = vi.fn().mockResolvedValue({ data: upsertedData, error: null });
      return chain;
    });

    const { POST } = await import("@/app/api/presence/route");
    const request = new Request("http://localhost/api/presence", {
      method: "POST",
      body: JSON.stringify({ workspace_id: "ws-1", status: "online" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(upsertedData);
  });
});

describe("Presence API - PATCH /api/presence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { PATCH } = await import("@/app/api/presence/route");
    const request = new Request("http://localhost/api/presence", {
      method: "PATCH",
      body: JSON.stringify({ workspace_id: "ws-1", is_typing: true }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request);
    expect(response.status).toBe(401);
  });

  it("should return 400 when workspace_id is missing", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    const { PATCH } = await import("@/app/api/presence/route");
    const request = new Request("http://localhost/api/presence", {
      method: "PATCH",
      body: JSON.stringify({ is_typing: true }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request);
    expect(response.status).toBe(400);
  });

  it("should update typing status successfully", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // workspace_members check
        const chain = createChainableMock();
        chain.single = vi.fn().mockResolvedValue({ data: { id: "m1" }, error: null });
        return chain;
      }
      // upsert for typing
      return createChainableMock({ data: null, error: null });
    });

    const { PATCH } = await import("@/app/api/presence/route");
    const request = new Request("http://localhost/api/presence", {
      method: "PATCH",
      body: JSON.stringify({
        workspace_id: "ws-1",
        is_typing: true,
        typing_in_conversation: "workspace",
      }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });
});
