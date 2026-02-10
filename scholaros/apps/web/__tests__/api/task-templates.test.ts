/**
 * Task Templates API Route Tests
 *
 * Tests for GET/POST/PATCH/DELETE /api/task-templates
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// --- Chainable mock builder ---
function createChainableMock(terminal?: Record<string, unknown>) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = [
    "select",
    "insert",
    "update",
    "delete",
    "eq",
    "in",
    "is",
    "gte",
    "lte",
    "ilike",
    "or",
    "order",
    "limit",
    "range",
    "single",
    "maybeSingle",
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
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
  rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

const MOCK_USER = {
  id: "user-123",
  email: "test@example.com",
};

const WORKSPACE_ID = "550e8400-e29b-41d4-a716-446655440000";

const MOCK_TEMPLATE = {
  id: "tmpl-001",
  workspace_id: WORKSPACE_ID,
  name: "Weekly Lab Report",
  description: "Template for weekly lab reports",
  default_category: "research",
  default_priority: "p2",
  default_assigned_to: null,
  subtasks: [],
  is_shared: true,
  is_builtin: false,
  created_by: "user-123",
  created_at: "2024-01-15T10:00:00Z",
  updated_at: "2024-01-15T10:00:00Z",
  creator: { id: "user-123", full_name: "Test User", avatar_url: null },
  assignee: null,
};

describe("Task Templates API - GET /api/task-templates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.rpc.mockResolvedValue({ data: null, error: null });
  });

  it("should return 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });
    mockSupabase.from.mockImplementation(() => createChainableMock());

    const { GET } = await import("@/app/api/task-templates/route");
    const request = new Request(
      `http://localhost/api/task-templates?workspace_id=${WORKSPACE_ID}`
    );
    const response = await GET(request);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("should return 400 when workspace_id is missing", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    const { GET } = await import("@/app/api/task-templates/route");
    const request = new Request("http://localhost/api/task-templates");
    const response = await GET(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("workspace_id query parameter is required");
  });

  it("should return templates including built-in ones", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    const templates = [
      MOCK_TEMPLATE,
      { ...MOCK_TEMPLATE, id: "tmpl-builtin", name: "Built-in Template", is_builtin: true },
    ];
    mockSupabase.from.mockImplementation(() => {
      return createChainableMock({ data: templates, error: null });
    });

    const { GET } = await import("@/app/api/task-templates/route");
    const request = new Request(
      `http://localhost/api/task-templates?workspace_id=${WORKSPACE_ID}`
    );
    const response = await GET(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(2);
  });

  it("should call rpc to seed built-in templates", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    mockSupabase.from.mockImplementation(() => {
      return createChainableMock({ data: [], error: null });
    });

    const { GET } = await import("@/app/api/task-templates/route");
    const request = new Request(
      `http://localhost/api/task-templates?workspace_id=${WORKSPACE_ID}`
    );
    await GET(request);

    expect(mockSupabase.rpc).toHaveBeenCalledWith("seed_builtin_task_templates", {
      p_workspace_id: WORKSPACE_ID,
    });
  });

  it("should handle query errors", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    mockSupabase.from.mockImplementation(() => {
      return createChainableMock({
        data: null,
        error: { message: "Database error" },
      });
    });

    const { GET } = await import("@/app/api/task-templates/route");
    const request = new Request(
      `http://localhost/api/task-templates?workspace_id=${WORKSPACE_ID}`
    );
    const response = await GET(request);
    expect(response.status).toBe(500);
  });
});

describe("Task Templates API - POST /api/task-templates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });
    mockSupabase.from.mockImplementation(() => createChainableMock());

    const { POST } = await import("@/app/api/task-templates/route");
    const request = new Request("http://localhost/api/task-templates", {
      method: "POST",
      body: JSON.stringify({ name: "Test" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("should create custom template with valid data", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    let callIdx = 0;
    mockSupabase.from.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) {
        // Membership check
        const chain = createChainableMock();
        chain.maybeSingle = vi.fn().mockResolvedValue({
          data: { id: "member-1" },
          error: null,
        });
        return chain;
      }
      if (callIdx === 2) {
        // Duplicate name check
        const chain = createChainableMock();
        chain.maybeSingle = vi.fn().mockResolvedValue({
          data: null,
          error: null,
        });
        return chain;
      }
      // Insert
      const chain = createChainableMock();
      chain.single = vi.fn().mockResolvedValue({
        data: MOCK_TEMPLATE,
        error: null,
      });
      return chain;
    });

    const { POST } = await import("@/app/api/task-templates/route");
    const request = new Request("http://localhost/api/task-templates", {
      method: "POST",
      body: JSON.stringify({
        name: "Weekly Lab Report",
        workspace_id: WORKSPACE_ID,
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
  });

  it("should return 400 for missing required fields (name)", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    const { POST } = await import("@/app/api/task-templates/route");
    const request = new Request("http://localhost/api/task-templates", {
      method: "POST",
      body: JSON.stringify({ workspace_id: WORKSPACE_ID }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
  });

  it("should return 400 for missing workspace_id", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    const { POST } = await import("@/app/api/task-templates/route");
    const request = new Request("http://localhost/api/task-templates", {
      method: "POST",
      body: JSON.stringify({ name: "Some Template" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
  });

  it("should return 403 when user is not a workspace member", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    mockSupabase.from.mockImplementation(() => {
      const chain = createChainableMock();
      chain.maybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });
      return chain;
    });

    const { POST } = await import("@/app/api/task-templates/route");
    const request = new Request("http://localhost/api/task-templates", {
      method: "POST",
      body: JSON.stringify({
        name: "Template",
        workspace_id: WORKSPACE_ID,
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("You are not a member of this workspace");
  });

  it("should return 409 for duplicate template names", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    let callIdx = 0;
    mockSupabase.from.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) {
        // Membership check - user is a member
        const chain = createChainableMock();
        chain.maybeSingle = vi.fn().mockResolvedValue({
          data: { id: "member-1" },
          error: null,
        });
        return chain;
      }
      // Duplicate check - found existing
      const chain = createChainableMock();
      chain.maybeSingle = vi.fn().mockResolvedValue({
        data: { id: "tmpl-existing" },
        error: null,
      });
      return chain;
    });

    const { POST } = await import("@/app/api/task-templates/route");
    const request = new Request("http://localhost/api/task-templates", {
      method: "POST",
      body: JSON.stringify({
        name: "Weekly Lab Report",
        workspace_id: WORKSPACE_ID,
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe("A task template with this name already exists");
  });
});

describe("Task Templates API - PATCH /api/task-templates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 when id query parameter is missing", async () => {
    const { PATCH } = await import("@/app/api/task-templates/route");
    const request = new Request("http://localhost/api/task-templates", {
      method: "PATCH",
      body: JSON.stringify({ name: "Updated" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("id query parameter required");
  });

  it("should return 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { PATCH } = await import("@/app/api/task-templates/route");
    const request = new Request(
      "http://localhost/api/task-templates?id=tmpl-001",
      {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
        headers: { "Content-Type": "application/json" },
      }
    );

    const response = await PATCH(request);
    expect(response.status).toBe(401);
  });

  it("should update template when user is the owner", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    let callIdx = 0;
    mockSupabase.from.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) {
        // Ownership check
        const chain = createChainableMock();
        chain.single = vi.fn().mockResolvedValue({
          data: { created_by: "user-123", is_builtin: false },
          error: null,
        });
        return chain;
      }
      // Update
      const chain = createChainableMock();
      chain.single = vi.fn().mockResolvedValue({
        data: { ...MOCK_TEMPLATE, name: "Updated Template" },
        error: null,
      });
      return chain;
    });

    const { PATCH } = await import("@/app/api/task-templates/route");
    const request = new Request(
      "http://localhost/api/task-templates?id=tmpl-001",
      {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated Template" }),
        headers: { "Content-Type": "application/json" },
      }
    );

    const response = await PATCH(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.name).toBe("Updated Template");
  });

  it("should return 404 when template not found", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    mockSupabase.from.mockImplementation(() => {
      const chain = createChainableMock();
      chain.single = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });
      return chain;
    });

    const { PATCH } = await import("@/app/api/task-templates/route");
    const request = new Request(
      "http://localhost/api/task-templates?id=nonexistent",
      {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
        headers: { "Content-Type": "application/json" },
      }
    );

    const response = await PATCH(request);
    expect(response.status).toBe(404);
  });

  it("should return 403 when user does not own the template", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    mockSupabase.from.mockImplementation(() => {
      const chain = createChainableMock();
      chain.single = vi.fn().mockResolvedValue({
        data: { created_by: "other-user-999", is_builtin: false },
        error: null,
      });
      return chain;
    });

    const { PATCH } = await import("@/app/api/task-templates/route");
    const request = new Request(
      "http://localhost/api/task-templates?id=tmpl-001",
      {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
        headers: { "Content-Type": "application/json" },
      }
    );

    const response = await PATCH(request);
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe(
      "You don't have permission to update this template"
    );
  });

  it("should reject updating built-in templates", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    mockSupabase.from.mockImplementation(() => {
      // Ownership check - built-in template owned by someone else
      const chain = createChainableMock();
      chain.single = vi.fn().mockResolvedValue({
        data: { created_by: "system-user", is_builtin: true },
        error: null,
      });
      return chain;
    });

    const { PATCH } = await import("@/app/api/task-templates/route");
    const request = new Request(
      "http://localhost/api/task-templates?id=tmpl-builtin",
      {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
        headers: { "Content-Type": "application/json" },
      }
    );

    const response = await PATCH(request);
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("Built-in templates cannot be modified");
  });
});

describe("Task Templates API - DELETE /api/task-templates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 when id query parameter is missing", async () => {
    const { DELETE } = await import("@/app/api/task-templates/route");
    const request = new Request("http://localhost/api/task-templates", {
      method: "DELETE",
    });

    const response = await DELETE(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("id query parameter required");
  });

  it("should return 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { DELETE } = await import("@/app/api/task-templates/route");
    const request = new Request(
      "http://localhost/api/task-templates?id=tmpl-001",
      {
        method: "DELETE",
      }
    );

    const response = await DELETE(request);
    expect(response.status).toBe(401);
  });

  it("should delete template when user is the owner", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    let callIdx = 0;
    mockSupabase.from.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) {
        // Ownership check
        const chain = createChainableMock();
        chain.single = vi.fn().mockResolvedValue({
          data: { created_by: "user-123" },
          error: null,
        });
        return chain;
      }
      // Delete
      return createChainableMock({ error: null });
    });

    const { DELETE } = await import("@/app/api/task-templates/route");
    const request = new Request(
      "http://localhost/api/task-templates?id=tmpl-001",
      {
        method: "DELETE",
      }
    );

    const response = await DELETE(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  it("should return 403 when user does not own the template", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    mockSupabase.from.mockImplementation(() => {
      const chain = createChainableMock();
      chain.single = vi.fn().mockResolvedValue({
        data: { created_by: "other-user-999" },
        error: null,
      });
      return chain;
    });

    const { DELETE } = await import("@/app/api/task-templates/route");
    const request = new Request(
      "http://localhost/api/task-templates?id=tmpl-001",
      {
        method: "DELETE",
      }
    );

    const response = await DELETE(request);
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe(
      "You don't have permission to delete this template"
    );
  });

  it("should handle delete errors", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    let callIdx = 0;
    mockSupabase.from.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) {
        // Ownership check
        const chain = createChainableMock();
        chain.single = vi.fn().mockResolvedValue({
          data: { created_by: "user-123" },
          error: null,
        });
        return chain;
      }
      // Delete with error
      return createChainableMock({
        error: { message: "Foreign key constraint" },
      });
    });

    const { DELETE } = await import("@/app/api/task-templates/route");
    const request = new Request(
      "http://localhost/api/task-templates?id=tmpl-001",
      {
        method: "DELETE",
      }
    );

    const response = await DELETE(request);
    expect(response.status).toBe(500);
  });
});
