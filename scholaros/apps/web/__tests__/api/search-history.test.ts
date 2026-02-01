/**
 * Search History API Route Tests
 *
 * Tests for GET /api/search/history, POST /api/search/history, DELETE /api/search/history
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

describe("Search History API - GET /api/search/history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { GET } = await import("@/app/api/search/history/route");
    const request = new Request("http://localhost/api/search/history");
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("should return search history without workspace filter", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    const searchData = [
      { query: "NSF grant", result_type: null, result_id: null, result_title: null, created_at: "2024-01-01" },
    ];
    mockSupabase.from.mockImplementation(() => {
      return createChainableMock({ data: searchData, error: null });
    });

    const { GET } = await import("@/app/api/search/history/route");
    const request = new Request("http://localhost/api/search/history");
    const response = await GET(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.searches).toHaveLength(1);
    expect(body.searches[0].query).toBe("NSF grant");
    expect(body.count).toBe(1);
  });

  it("should return 403 when user is not a workspace member", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    // workspace_members check returns null (not a member)
    const memberChain = createChainableMock();
    memberChain.single = vi.fn().mockResolvedValue({ data: null, error: null });
    mockSupabase.from.mockReturnValue(memberChain);

    const { GET } = await import("@/app/api/search/history/route");
    const request = new Request("http://localhost/api/search/history?workspace_id=ws-1");
    const response = await GET(request);
    expect(response.status).toBe(403);
  });

  it("should deduplicate searches by query (case-insensitive)", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    const searchData = [
      { query: "NSF grant", result_type: null, result_id: null, result_title: null, created_at: "2024-01-02" },
      { query: "nsf grant", result_type: null, result_id: null, result_title: null, created_at: "2024-01-01" },
      { query: "DOE proposal", result_type: null, result_id: null, result_title: null, created_at: "2024-01-01" },
    ];
    mockSupabase.from.mockImplementation(() => {
      return createChainableMock({ data: searchData, error: null });
    });

    const { GET } = await import("@/app/api/search/history/route");
    const request = new Request("http://localhost/api/search/history");
    const response = await GET(request);
    const body = await response.json();
    expect(body.searches).toHaveLength(2);
    expect(body.searches[0].query).toBe("NSF grant");
    expect(body.searches[1].query).toBe("DOE proposal");
  });

  it("should handle table-not-exist error gracefully", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    mockSupabase.from.mockImplementation(() => {
      return createChainableMock({
        data: null,
        error: { code: "42P01", message: "table does not exist" },
      });
    });

    const { GET } = await import("@/app/api/search/history/route");
    const request = new Request("http://localhost/api/search/history");
    const response = await GET(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.searches).toEqual([]);
  });
});

describe("Search History API - POST /api/search/history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { POST } = await import("@/app/api/search/history/route");
    const request = new Request("http://localhost/api/search/history", {
      method: "POST",
      body: JSON.stringify({ query: "test" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("should return 400 for invalid data", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    const { POST } = await import("@/app/api/search/history/route");
    const request = new Request("http://localhost/api/search/history", {
      method: "POST",
      body: JSON.stringify({}), // missing required 'query' field
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid request data");
  });

  it("should record search successfully", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    mockSupabase.from.mockImplementation(() => {
      const chain = createChainableMock();
      chain.single = vi.fn().mockResolvedValue({
        data: { id: "sh-1", query: "test query" },
        error: null,
      });
      return chain;
    });

    const { POST } = await import("@/app/api/search/history/route");
    const request = new Request("http://localhost/api/search/history", {
      method: "POST",
      body: JSON.stringify({ query: "test query" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.stored).toBe(true);
  });

  it("should return 403 when workspace membership check fails", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    const memberChain = createChainableMock();
    memberChain.single = vi.fn().mockResolvedValue({ data: null, error: null });
    mockSupabase.from.mockReturnValue(memberChain);

    const { POST } = await import("@/app/api/search/history/route");
    const request = new Request("http://localhost/api/search/history", {
      method: "POST",
      body: JSON.stringify({ query: "test", workspace_id: "550e8400-e29b-41d4-a716-446655440000" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it("should handle table-not-exist gracefully on POST", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    mockSupabase.from.mockImplementation(() => {
      const chain = createChainableMock();
      chain.single = vi.fn().mockResolvedValue({
        data: null,
        error: { code: "42P01", message: "table does not exist" },
      });
      return chain;
    });

    const { POST } = await import("@/app/api/search/history/route");
    const request = new Request("http://localhost/api/search/history", {
      method: "POST",
      body: JSON.stringify({ query: "test" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.stored).toBe(false);
  });
});

describe("Search History API - DELETE /api/search/history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { DELETE } = await import("@/app/api/search/history/route");
    const request = new Request("http://localhost/api/search/history", {
      method: "DELETE",
    });
    const response = await DELETE(request);
    expect(response.status).toBe(401);
  });

  it("should clear search history successfully", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    mockSupabase.from.mockImplementation(() => {
      return createChainableMock({ error: null, count: 5 });
    });

    const { DELETE } = await import("@/app/api/search/history/route");
    const request = new Request("http://localhost/api/search/history", {
      method: "DELETE",
    });
    const response = await DELETE(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.deleted).toBe(5);
  });

  it("should return 403 when workspace membership fails for DELETE", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    const memberChain = createChainableMock();
    memberChain.single = vi.fn().mockResolvedValue({ data: null, error: null });
    mockSupabase.from.mockReturnValue(memberChain);

    const { DELETE } = await import("@/app/api/search/history/route");
    const request = new Request("http://localhost/api/search/history?workspace_id=ws-1", {
      method: "DELETE",
    });
    const response = await DELETE(request);
    expect(response.status).toBe(403);
  });

  it("should handle table-not-exist gracefully on DELETE", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    mockSupabase.from.mockImplementation(() => {
      return createChainableMock({
        error: { code: "42P01", message: "table does not exist" },
        count: null,
      });
    });

    const { DELETE } = await import("@/app/api/search/history/route");
    const request = new Request("http://localhost/api/search/history", {
      method: "DELETE",
    });
    const response = await DELETE(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.deleted).toBe(0);
  });
});
