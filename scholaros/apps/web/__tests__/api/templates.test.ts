/**
 * Templates API Route Tests
 *
 * Tests for GET /api/templates, POST /api/templates,
 * PATCH /api/templates, DELETE /api/templates
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

const MOCK_TEMPLATE = {
  id: "tmpl-1",
  name: "Research Paper",
  description: "Template for research papers",
  project_type: "manuscript",
  is_public: true,
  workspace_id: null,
  created_by: "user-123",
  phases: [],
  roles: [],
  workstreams: [],
};

describe("Templates API - GET /api/templates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { GET } = await import("@/app/api/templates/route");
    const request = new Request("http://localhost/api/templates");
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("should return public templates when no workspace_id", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    const templates = [MOCK_TEMPLATE];
    mockSupabase.from.mockImplementation(() => {
      return createChainableMock({ data: templates, error: null });
    });

    const { GET } = await import("@/app/api/templates/route");
    const request = new Request("http://localhost/api/templates");
    const response = await GET(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(templates);
  });

  it("should filter templates by workspace_id", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    const templates = [MOCK_TEMPLATE];
    const chain = createChainableMock({ data: templates, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const { GET } = await import("@/app/api/templates/route");
    const request = new Request("http://localhost/api/templates?workspace_id=ws-1");
    const response = await GET(request);
    expect(response.status).toBe(200);
    // Verify the `or` filter was called for workspace filtering
    expect(chain.or).toHaveBeenCalled();
  });

  it("should return 500 when database errors", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    mockSupabase.from.mockImplementation(() => {
      return createChainableMock({ data: null, error: { message: "DB error" } });
    });

    const { GET } = await import("@/app/api/templates/route");
    const request = new Request("http://localhost/api/templates");
    const response = await GET(request);
    expect(response.status).toBe(500);
  });
});

describe("Templates API - POST /api/templates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { POST } = await import("@/app/api/templates/route");
    const request = new Request("http://localhost/api/templates", {
      method: "POST",
      body: JSON.stringify({ name: "Test Template" }),
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

    const { POST } = await import("@/app/api/templates/route");
    const request = new Request("http://localhost/api/templates", {
      method: "POST",
      body: JSON.stringify({}), // Missing required fields
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
  });

  it("should create template successfully", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    const newTemplate = { ...MOCK_TEMPLATE, id: "tmpl-new" };
    mockSupabase.from.mockImplementation(() => {
      const chain = createChainableMock();
      chain.single = vi.fn().mockResolvedValue({ data: newTemplate, error: null });
      return chain;
    });

    const { POST } = await import("@/app/api/templates/route");
    const request = new Request("http://localhost/api/templates", {
      method: "POST",
      body: JSON.stringify({
        name: "Research Paper",
        phase_definitions: [],
        role_definitions: [],
      }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(201);
  });

  it("should return 409 for duplicate template name in workspace", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    // The first from() call checks for duplicates, returns an existing one
    mockSupabase.from.mockImplementation(() => {
      const chain = createChainableMock();
      chain.maybeSingle = vi.fn().mockResolvedValue({
        data: { id: "existing-tmpl" },
        error: null,
      });
      return chain;
    });

    const { POST } = await import("@/app/api/templates/route");
    const request = new Request("http://localhost/api/templates", {
      method: "POST",
      body: JSON.stringify({
        name: "Research Paper",
        workspace_id: "550e8400-e29b-41d4-a716-446655440000",
        phase_definitions: [],
        role_definitions: [],
      }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toContain("already exists");
  });
});

describe("Templates API - PATCH /api/templates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 when id param is missing", async () => {
    const { PATCH } = await import("@/app/api/templates/route");
    const request = new Request("http://localhost/api/templates", {
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

    const { PATCH } = await import("@/app/api/templates/route");
    const request = new Request("http://localhost/api/templates?id=tmpl-1", {
      method: "PATCH",
      body: JSON.stringify({ name: "Updated" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request);
    expect(response.status).toBe(401);
  });

  it("should return 403 when user is not the creator", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // Creator check
        const chain = createChainableMock();
        chain.single = vi.fn().mockResolvedValue({
          data: { created_by: "other-user-456" },
          error: null,
        });
        return chain;
      }
      return createChainableMock();
    });

    const { PATCH } = await import("@/app/api/templates/route");
    const request = new Request("http://localhost/api/templates?id=tmpl-1", {
      method: "PATCH",
      body: JSON.stringify({ name: "Updated Name" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request);
    expect(response.status).toBe(403);
  });

  it("should update template successfully", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    const updatedTemplate = { ...MOCK_TEMPLATE, name: "Updated Template" };

    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // Creator check
        const chain = createChainableMock();
        chain.single = vi.fn().mockResolvedValue({
          data: { created_by: "user-123" },
          error: null,
        });
        return chain;
      }
      // Update chain
      const chain = createChainableMock();
      chain.single = vi.fn().mockResolvedValue({ data: updatedTemplate, error: null });
      return chain;
    });

    const { PATCH } = await import("@/app/api/templates/route");
    const request = new Request("http://localhost/api/templates?id=tmpl-1", {
      method: "PATCH",
      body: JSON.stringify({ name: "Updated Template" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.name).toBe("Updated Template");
  });
});

describe("Templates API - DELETE /api/templates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 when id param is missing", async () => {
    const { DELETE } = await import("@/app/api/templates/route");
    const request = new Request("http://localhost/api/templates", {
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

    const { DELETE } = await import("@/app/api/templates/route");
    const request = new Request("http://localhost/api/templates?id=tmpl-1", {
      method: "DELETE",
    });
    const response = await DELETE(request);
    expect(response.status).toBe(401);
  });

  it("should return 403 when user is not the creator", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        const chain = createChainableMock();
        chain.single = vi.fn().mockResolvedValue({
          data: { created_by: "other-user" },
          error: null,
        });
        return chain;
      }
      return createChainableMock();
    });

    const { DELETE } = await import("@/app/api/templates/route");
    const request = new Request("http://localhost/api/templates?id=tmpl-1", {
      method: "DELETE",
    });
    const response = await DELETE(request);
    expect(response.status).toBe(403);
  });

  it("should delete template successfully", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // Creator check
        const chain = createChainableMock();
        chain.single = vi.fn().mockResolvedValue({
          data: { created_by: "user-123" },
          error: null,
        });
        return chain;
      }
      // Delete chain
      return createChainableMock({ error: null });
    });

    const { DELETE } = await import("@/app/api/templates/route");
    const request = new Request("http://localhost/api/templates?id=tmpl-1", {
      method: "DELETE",
    });
    const response = await DELETE(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });
});
