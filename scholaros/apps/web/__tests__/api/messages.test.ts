/**
 * Messages API Route Tests
 *
 * Tests for:
 * - GET/POST /api/messages
 * - GET/PATCH/DELETE /api/messages/[id]
 * - POST/DELETE /api/messages/[id]/pin
 * - POST/DELETE /api/messages/[id]/reactions
 * - POST/PUT /api/messages/[id]/read
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// --- Chainable mock builder ---
function createMockChain(result: { data: unknown; error: unknown }) {
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
  rpc: vi.fn(() => Promise.resolve({ data: null as unknown, error: null as unknown })),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

// Mock shared schemas
vi.mock("@scholaros/shared", () => ({
  CreateMessageSchema: {
    safeParse: vi.fn((data: Record<string, unknown>) => {
      if (!data.workspace_id || !data.text) {
        return {
          success: false,
          error: { flatten: () => ({ fieldErrors: { text: ["Required"] } }) },
        };
      }
      return { success: true, data };
    }),
  },
  UpdateMessageSchema: {
    safeParse: vi.fn((data: Record<string, unknown>) => {
      if (data.text !== undefined && typeof data.text !== "string") {
        return {
          success: false,
          error: { flatten: () => ({ fieldErrors: { text: ["Must be string"] } }) },
        };
      }
      return { success: true, data };
    }),
  },
  AddReactionSchema: {
    safeParse: vi.fn((data: Record<string, unknown>) => {
      if (!data.reaction || typeof data.reaction !== "string") {
        return {
          success: false,
          error: { flatten: () => ({ fieldErrors: { reaction: ["Required"] } }) },
        };
      }
      return { success: true, data };
    }),
  },
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
// GET /api/messages
// ---------------------------------------------------------------------------
describe("Messages API - GET /api/messages", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { GET } = await import("@/app/api/messages/route");
    const res = await GET(
      makeRequest(`http://localhost/api/messages?workspace_id=${workspaceId}`)
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when workspace_id is missing", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { GET } = await import("@/app/api/messages/route");
    const res = await GET(makeRequest("http://localhost/api/messages"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("workspace_id is required");
  });

  it("returns 403 when not a workspace member", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Membership check fails
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: null })
    );

    const { GET } = await import("@/app/api/messages/route");
    const res = await GET(
      makeRequest(`http://localhost/api/messages?workspace_id=${workspaceId}`)
    );
    expect(res.status).toBe(403);
  });

  it("returns messages for workspace member", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Membership check
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: "member-1" }, error: null })
    );

    // Messages query
    const msgData = [
      { id: "msg-1", text: "Hello", user_id: "user-123", workspace_id: workspaceId },
    ];
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: msgData, error: null })
    );

    const { GET } = await import("@/app/api/messages/route");
    const res = await GET(
      makeRequest(`http://localhost/api/messages?workspace_id=${workspaceId}`)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("has_more");
  });
});

// ---------------------------------------------------------------------------
// POST /api/messages
// ---------------------------------------------------------------------------
describe("Messages API - POST /api/messages", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { POST } = await import("@/app/api/messages/route");
    const res = await POST(
      makeRequest("http://localhost/api/messages", {
        method: "POST",
        body: JSON.stringify({ workspace_id: workspaceId, text: "Hello" }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid data (missing text)", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { POST } = await import("@/app/api/messages/route");
    const res = await POST(
      makeRequest("http://localhost/api/messages", {
        method: "POST",
        body: JSON.stringify({ workspace_id: workspaceId }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 403 when not a workspace member", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Membership check fails
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: null })
    );

    const { POST } = await import("@/app/api/messages/route");
    const res = await POST(
      makeRequest("http://localhost/api/messages", {
        method: "POST",
        body: JSON.stringify({ workspace_id: workspaceId, text: "Hello" }),
      })
    );
    expect(res.status).toBe(403);
  });

  it("creates message successfully", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Membership check
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: "member-1" }, error: null })
    );
    // Insert message
    const msgData = { id: "msg-new", text: "Hello", user_id: mockUser.id };
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: msgData, error: null })
    );
    // Activity log
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: null })
    );

    const { POST } = await import("@/app/api/messages/route");
    const res = await POST(
      makeRequest("http://localhost/api/messages", {
        method: "POST",
        body: JSON.stringify({ workspace_id: workspaceId, text: "Hello" }),
      })
    );
    expect(res.status).toBe(201);
  });
});

// ---------------------------------------------------------------------------
// GET /api/messages/[id]
// ---------------------------------------------------------------------------
describe("Messages API - GET /api/messages/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { GET } = await import("@/app/api/messages/[id]/route");
    const res = await GET(
      makeRequest("http://localhost/api/messages/msg-1"),
      makeParams({ id: "msg-1" })
    );
    expect(res.status).toBe(401);
  });

  it("returns 500 when message query fails", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { message: "DB error" } })
    );

    const { GET } = await import("@/app/api/messages/[id]/route");
    const res = await GET(
      makeRequest("http://localhost/api/messages/msg-1"),
      makeParams({ id: "msg-1" })
    );
    expect(res.status).toBe(500);
  });

  it("returns 403 when user is not workspace member", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Message found
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: "msg-1", workspace_id: workspaceId, text: "Hello" }, error: null })
    );
    // Membership check fails
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: null })
    );

    const { GET } = await import("@/app/api/messages/[id]/route");
    const res = await GET(
      makeRequest("http://localhost/api/messages/msg-1"),
      makeParams({ id: "msg-1" })
    );
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/messages/[id]
// ---------------------------------------------------------------------------
describe("Messages API - PATCH /api/messages/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { PATCH } = await import("@/app/api/messages/[id]/route");
    const res = await PATCH(
      makeRequest("http://localhost/api/messages/msg-1", {
        method: "PATCH",
        body: JSON.stringify({ text: "Updated" }),
      }),
      makeParams({ id: "msg-1" })
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 when message not found", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: null })
    );

    const { PATCH } = await import("@/app/api/messages/[id]/route");
    const res = await PATCH(
      makeRequest("http://localhost/api/messages/not-found", {
        method: "PATCH",
        body: JSON.stringify({ text: "Updated" }),
      }),
      makeParams({ id: "not-found" })
    );
    expect(res.status).toBe(404);
  });

  it("returns 403 when user is not the author", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { user_id: "other-user", workspace_id: workspaceId }, error: null })
    );

    const { PATCH } = await import("@/app/api/messages/[id]/route");
    const res = await PATCH(
      makeRequest("http://localhost/api/messages/msg-1", {
        method: "PATCH",
        body: JSON.stringify({ text: "Updated" }),
      }),
      makeParams({ id: "msg-1" })
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Only the author can edit this message");
  });

  it("edits message successfully", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Existing message owned by user
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { user_id: mockUser.id, workspace_id: workspaceId }, error: null })
    );
    // Update result
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: "msg-1", text: "Updated", edited_at: "2024-01-15" }, error: null })
    );

    const { PATCH } = await import("@/app/api/messages/[id]/route");
    const res = await PATCH(
      makeRequest("http://localhost/api/messages/msg-1", {
        method: "PATCH",
        body: JSON.stringify({ text: "Updated" }),
      }),
      makeParams({ id: "msg-1" })
    );
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/messages/[id]
// ---------------------------------------------------------------------------
describe("Messages API - DELETE /api/messages/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { DELETE } = await import("@/app/api/messages/[id]/route");
    const res = await DELETE(
      makeRequest("http://localhost/api/messages/msg-1", { method: "DELETE" }),
      makeParams({ id: "msg-1" })
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 when message not found", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: null })
    );

    const { DELETE } = await import("@/app/api/messages/[id]/route");
    const res = await DELETE(
      makeRequest("http://localhost/api/messages/not-found", { method: "DELETE" }),
      makeParams({ id: "not-found" })
    );
    expect(res.status).toBe(404);
  });

  it("returns 403 when user is not the author", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { user_id: "other-user" }, error: null })
    );

    const { DELETE } = await import("@/app/api/messages/[id]/route");
    const res = await DELETE(
      makeRequest("http://localhost/api/messages/msg-1", { method: "DELETE" }),
      makeParams({ id: "msg-1" })
    );
    expect(res.status).toBe(403);
  });

  it("soft-deletes message successfully", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Existing message owned by user
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { user_id: mockUser.id }, error: null })
    );
    // Soft delete (update)
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: null })
    );

    const { DELETE } = await import("@/app/api/messages/[id]/route");
    const res = await DELETE(
      makeRequest("http://localhost/api/messages/msg-1", { method: "DELETE" }),
      makeParams({ id: "msg-1" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// POST /api/messages/[id]/pin
// ---------------------------------------------------------------------------
describe("Messages API - POST /api/messages/[id]/pin", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { POST } = await import("@/app/api/messages/[id]/pin/route");
    const res = await POST(
      makeRequest("http://localhost/api/messages/msg-1/pin", { method: "POST" }),
      makeParams({ id: "msg-1" })
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 when message not found", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "PGRST116" } })
    );

    const { POST } = await import("@/app/api/messages/[id]/pin/route");
    const res = await POST(
      makeRequest("http://localhost/api/messages/not-found/pin", { method: "POST" }),
      makeParams({ id: "not-found" })
    );
    expect(res.status).toBe(404);
  });

  it("returns 403 when not a workspace member", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Message found
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId }, error: null })
    );
    // Membership check fails
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: null })
    );

    const { POST } = await import("@/app/api/messages/[id]/pin/route");
    const res = await POST(
      makeRequest("http://localhost/api/messages/msg-1/pin", { method: "POST" }),
      makeParams({ id: "msg-1" })
    );
    expect(res.status).toBe(403);
  });

  it("pins message successfully", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Message found
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId }, error: null })
    );
    // Membership check
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: "member-1", role: "member" }, error: null })
    );
    // Pin update
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: "msg-1", is_pinned: true, text: "Pinned msg" }, error: null })
    );
    // Activity log
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: null })
    );

    const { POST } = await import("@/app/api/messages/[id]/pin/route");
    const res = await POST(
      makeRequest("http://localhost/api/messages/msg-1/pin", { method: "POST" }),
      makeParams({ id: "msg-1" })
    );
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// POST /api/messages/[id]/reactions
// ---------------------------------------------------------------------------
describe("Messages API - POST /api/messages/[id]/reactions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { POST } = await import("@/app/api/messages/[id]/reactions/route");
    const res = await POST(
      makeRequest("http://localhost/api/messages/msg-1/reactions", {
        method: "POST",
        body: JSON.stringify({ reaction: "thumbsup" }),
      }),
      makeParams({ id: "msg-1" })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid reaction data", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { POST } = await import("@/app/api/messages/[id]/reactions/route");
    const res = await POST(
      makeRequest("http://localhost/api/messages/msg-1/reactions", {
        method: "POST",
        body: JSON.stringify({}),
      }),
      makeParams({ id: "msg-1" })
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when message not found", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "PGRST116" } })
    );

    const { POST } = await import("@/app/api/messages/[id]/reactions/route");
    const res = await POST(
      makeRequest("http://localhost/api/messages/not-found/reactions", {
        method: "POST",
        body: JSON.stringify({ reaction: "thumbsup" }),
      }),
      makeParams({ id: "not-found" })
    );
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// POST /api/messages/[id]/read
// ---------------------------------------------------------------------------
describe("Messages API - POST /api/messages/[id]/read", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { POST } = await import("@/app/api/messages/[id]/read/route");
    const res = await POST(
      makeRequest("http://localhost/api/messages/msg-1/read", { method: "POST" }),
      makeParams({ id: "msg-1" })
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 when message not found", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "PGRST116" } })
    );

    const { POST } = await import("@/app/api/messages/[id]/read/route");
    const res = await POST(
      makeRequest("http://localhost/api/messages/not-found/read", { method: "POST" }),
      makeParams({ id: "not-found" })
    );
    expect(res.status).toBe(404);
  });

  it("returns 403 when not a workspace member", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Message found
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId }, error: null })
    );
    // Membership check fails
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: null })
    );

    const { POST } = await import("@/app/api/messages/[id]/read/route");
    const res = await POST(
      makeRequest("http://localhost/api/messages/msg-1/read", { method: "POST" }),
      makeParams({ id: "msg-1" })
    );
    expect(res.status).toBe(403);
  });

  it("marks message as read successfully", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Message found
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId }, error: null })
    );
    // Membership check
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: "member-1" }, error: null })
    );
    // RPC mark_message_read
    mockSupabase.rpc.mockResolvedValueOnce({
      data: [mockUser.id],
      error: null,
    });

    const { POST } = await import("@/app/api/messages/[id]/read/route");
    const res = await POST(
      makeRequest("http://localhost/api/messages/msg-1/read", { method: "POST" }),
      makeParams({ id: "msg-1" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("handles idempotent read via atomic RPC", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Message found
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId }, error: null })
    );
    // Membership check
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: "member-1" }, error: null })
    );
    // RPC mark_message_read (idempotent - user already in read_by)
    mockSupabase.rpc.mockResolvedValueOnce({
      data: [mockUser.id],
      error: null,
    });

    const { POST } = await import("@/app/api/messages/[id]/read/route");
    const res = await POST(
      makeRequest("http://localhost/api/messages/msg-1/read", { method: "POST" }),
      makeParams({ id: "msg-1" })
    );
    expect(res.status).toBe(200);
  });
});
