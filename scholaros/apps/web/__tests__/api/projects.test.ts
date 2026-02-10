/**
 * Projects API Route Tests
 *
 * Tests for GET/POST /api/projects and GET/PATCH/DELETE /api/projects/[id]
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
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

const MOCK_USER = {
  id: "user-123",
  email: "test@example.com",
};

const MOCK_PROJECT = {
  id: "proj-001",
  workspace_id: "550e8400-e29b-41d4-a716-446655440000",
  type: "manuscript",
  title: "My Research Paper",
  summary: "A study on testing",
  status: "active",
  stage: "drafting",
  owner_id: "user-123",
  created_at: "2024-01-15T10:00:00Z",
  updated_at: "2024-01-15T10:00:00Z",
  tasks: [{ count: 3 }],
  milestones: [{ count: 1 }],
};

describe("Projects API - GET /api/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });
    mockSupabase.from.mockImplementation(() => createChainableMock());

    const { GET } = await import("@/app/api/projects/route");
    const request = new Request(
      "http://localhost/api/projects?workspace_id=ws-001"
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

    const { GET } = await import("@/app/api/projects/route");
    const request = new Request("http://localhost/api/projects");
    const response = await GET(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("workspace_id is required");
  });

  it("should return projects for authenticated user", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    const projects = [MOCK_PROJECT];
    mockSupabase.from.mockImplementation(() => {
      return createChainableMock({ data: projects, error: null });
    });

    const { GET } = await import("@/app/api/projects/route");
    const request = new Request(
      "http://localhost/api/projects?workspace_id=550e8400-e29b-41d4-a716-446655440000"
    );
    const response = await GET(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(1);
    expect(body[0].task_count).toBe(3);
    expect(body[0].milestone_count).toBe(1);
  });

  it("should filter by type", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    let eqCalls: string[][] = [];
    mockSupabase.from.mockImplementation(() => {
      const chain = createChainableMock({ data: [], error: null });
      const origEq = chain.eq;
      chain.eq = vi.fn().mockImplementation((...args: string[]) => {
        eqCalls.push(args);
        return origEq(...args);
      });
      return chain;
    });

    const { GET } = await import("@/app/api/projects/route");
    const request = new Request(
      "http://localhost/api/projects?workspace_id=550e8400-e29b-41d4-a716-446655440000&type=manuscript"
    );
    await GET(request);

    const typeCalls = eqCalls.filter(
      (c) => c[0] === "type" && c[1] === "manuscript"
    );
    expect(typeCalls.length).toBeGreaterThan(0);
  });

  it("should filter by status", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    let eqCalls: string[][] = [];
    mockSupabase.from.mockImplementation(() => {
      const chain = createChainableMock({ data: [], error: null });
      const origEq = chain.eq;
      chain.eq = vi.fn().mockImplementation((...args: string[]) => {
        eqCalls.push(args);
        return origEq(...args);
      });
      return chain;
    });

    const { GET } = await import("@/app/api/projects/route");
    const request = new Request(
      "http://localhost/api/projects?workspace_id=550e8400-e29b-41d4-a716-446655440000&status=active"
    );
    await GET(request);

    const statusCalls = eqCalls.filter(
      (c) => c[0] === "status" && c[1] === "active"
    );
    expect(statusCalls.length).toBeGreaterThan(0);
  });

  it("should handle supabase query errors", async () => {
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

    const { GET } = await import("@/app/api/projects/route");
    const request = new Request(
      "http://localhost/api/projects?workspace_id=550e8400-e29b-41d4-a716-446655440000"
    );
    const response = await GET(request);
    expect(response.status).toBe(500);
  });
});

describe("Projects API - POST /api/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });
    mockSupabase.from.mockImplementation(() => createChainableMock());

    const { POST } = await import("@/app/api/projects/route");
    const request = new Request("http://localhost/api/projects", {
      method: "POST",
      body: JSON.stringify({ title: "Test" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("should create project with valid data", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    const createdProject = { ...MOCK_PROJECT, id: "proj-new" };
    mockSupabase.from.mockImplementation(() => {
      const chain = createChainableMock();
      chain.single = vi
        .fn()
        .mockResolvedValue({ data: createdProject, error: null });
      return chain;
    });

    const { POST } = await import("@/app/api/projects/route");
    const request = new Request("http://localhost/api/projects", {
      method: "POST",
      body: JSON.stringify({
        title: "New Research Paper",
        type: "manuscript",
        workspace_id: "550e8400-e29b-41d4-a716-446655440000",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
  });

  it("should return 400 for invalid project type", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    const { POST } = await import("@/app/api/projects/route");
    const request = new Request("http://localhost/api/projects", {
      method: "POST",
      body: JSON.stringify({
        title: "Test Project",
        type: "invalid_type",
        workspace_id: "550e8400-e29b-41d4-a716-446655440000",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
  });

  it("should return 400 for missing required fields", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    const { POST } = await import("@/app/api/projects/route");
    const request = new Request("http://localhost/api/projects", {
      method: "POST",
      body: JSON.stringify({ title: "Test Project" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
  });

  it("should return 500 when supabase insert fails", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    mockSupabase.from.mockImplementation(() => {
      const chain = createChainableMock();
      chain.single = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Insert failed" },
      });
      return chain;
    });

    const { POST } = await import("@/app/api/projects/route");
    const request = new Request("http://localhost/api/projects", {
      method: "POST",
      body: JSON.stringify({
        title: "Test Project",
        type: "manuscript",
        workspace_id: "550e8400-e29b-41d4-a716-446655440000",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
  });
});

describe("Projects API - PATCH /api/projects/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });
    mockSupabase.from.mockImplementation(() => createChainableMock());

    const { PATCH } = await import("@/app/api/projects/[id]/route");
    const request = new Request("http://localhost/api/projects/proj-001", {
      method: "PATCH",
      body: JSON.stringify({ title: "Updated" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "proj-001" }),
    });
    expect(response.status).toBe(401);
  });

  it("should update project successfully", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    const updatedProject = { ...MOCK_PROJECT, title: "Updated Paper Title" };
    mockSupabase.from.mockImplementation(() => {
      const chain = createChainableMock();
      chain.single = vi
        .fn()
        .mockResolvedValue({ data: updatedProject, error: null });
      return chain;
    });

    const { PATCH } = await import("@/app/api/projects/[id]/route");
    const request = new Request("http://localhost/api/projects/proj-001", {
      method: "PATCH",
      body: JSON.stringify({ title: "Updated Paper Title" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "proj-001" }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.title).toBe("Updated Paper Title");
  });

  it("should return 400 for invalid update data", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    const { PATCH } = await import("@/app/api/projects/[id]/route");
    const request = new Request("http://localhost/api/projects/proj-001", {
      method: "PATCH",
      body: JSON.stringify({ type: "invalid_type" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "proj-001" }),
    });
    expect(response.status).toBe(400);
  });
});

describe("Projects API - DELETE /api/projects/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });
    mockSupabase.from.mockImplementation(() => createChainableMock());

    const { DELETE } = await import("@/app/api/projects/[id]/route");
    const request = new Request("http://localhost/api/projects/proj-001", {
      method: "DELETE",
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "proj-001" }),
    });
    expect(response.status).toBe(401);
  });

  it("should delete project successfully", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    let callIdx = 0;
    mockSupabase.from.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) {
        // First call: select to check ownership
        const chain = createChainableMock();
        chain.single = vi.fn().mockResolvedValue({
          data: { id: "proj-001", owner_id: "user-123" },
          error: null,
        });
        return chain;
      }
      // Second call: delete
      return createChainableMock({ error: null });
    });

    const { DELETE } = await import("@/app/api/projects/[id]/route");
    const request = new Request("http://localhost/api/projects/proj-001", {
      method: "DELETE",
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "proj-001" }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  it("should return 404 when project not found", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    mockSupabase.from.mockImplementation(() => {
      const chain = createChainableMock();
      chain.single = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "No rows", code: "PGRST116" },
      });
      return chain;
    });

    const { DELETE } = await import("@/app/api/projects/[id]/route");
    const request = new Request("http://localhost/api/projects/nonexistent", {
      method: "DELETE",
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "nonexistent" }),
    });
    expect(response.status).toBe(404);
  });

  it("should return 403 when user does not own the project", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    mockSupabase.from.mockImplementation(() => {
      const chain = createChainableMock();
      chain.single = vi.fn().mockResolvedValue({
        data: { id: "proj-001", owner_id: "other-user-999" },
        error: null,
      });
      return chain;
    });

    const { DELETE } = await import("@/app/api/projects/[id]/route");
    const request = new Request("http://localhost/api/projects/proj-001", {
      method: "DELETE",
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "proj-001" }),
    });
    expect(response.status).toBe(403);
  });
});
