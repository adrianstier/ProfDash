/**
 * Tasks API Route Tests
 *
 * Tests for GET /api/tasks, POST /api/tasks,
 * GET/PATCH/DELETE /api/tasks/[id]
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
    chain[m] = vi.fn().mockImplementation(() => {
      // If this call has a queued terminal value, return it
      if (chain._terminal) {
        const val = chain._terminal;
        chain._terminal = undefined as unknown as ReturnType<typeof vi.fn>;
        return val;
      }
      return chain;
    });
  }

  // Allow setting a terminal resolved value (used for await)
  chain._terminal = undefined as unknown as ReturnType<typeof vi.fn>;

  // Make the chain thenable so `await query` resolves to a value
  chain.then = vi.fn().mockImplementation((resolve: (v: unknown) => void) => {
    const val = terminal ?? { data: null, error: null, count: null };
    return Promise.resolve(val).then(resolve);
  });

  return chain;
}

let queryChain: ReturnType<typeof createChainableMock>;
let countChain: ReturnType<typeof createChainableMock>;
let fromCallCount: number;

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

// Track which chain to return from `from()`
function setupFrom(opts?: {
  queryResult?: Record<string, unknown>;
  countResult?: Record<string, unknown>;
}) {
  fromCallCount = 0;
  queryChain = createChainableMock(
    opts?.queryResult ?? { data: [], error: null }
  );
  countChain = createChainableMock(
    opts?.countResult ?? { count: 0, error: null }
  );

  mockSupabase.from.mockImplementation(() => {
    fromCallCount++;
    // The tasks GET route calls from("tasks") twice: once for data, once for count
    // But since both share the same from call, we return different chains
    // Actually both just return a chainable - the difference is in `select` args
    // We'll just return the same chain for simplicity
    return queryChain;
  });
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(() => ({
    success: true,
    limit: 200,
    remaining: 199,
    reset: Date.now() + 60000,
  })),
  getRateLimitIdentifier: vi.fn(() => "user:test-user-id"),
  getRateLimitHeaders: vi.fn(() => ({})),
  RATE_LIMIT_CONFIGS: {
    read: { limit: 200, windowMs: 60000 },
    api: { limit: 100, windowMs: 60000 },
  },
}));

const MOCK_USER = {
  id: "user-123",
  email: "test@example.com",
};

const MOCK_TASK = {
  id: "task-001",
  title: "Write paper",
  description: "Draft the methodology section",
  category: "research",
  priority: "p2",
  status: "todo",
  due: null,
  project_id: null,
  workspace_id: "ws-001",
  user_id: "user-123",
  created_at: "2024-01-15T10:00:00Z",
  updated_at: "2024-01-15T10:00:00Z",
};

describe("Tasks API - GET /api/tasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when unauthenticated", async () => {
    setupFrom();
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { GET } = await import("@/app/api/tasks/route");
    const request = new Request("http://localhost/api/tasks?workspace_id=ws-001");
    const response = await GET(request);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("should return tasks for authenticated user", async () => {
    const tasks = [MOCK_TASK];
    setupFrom();
    // Override `then` to return tasks data
    queryChain.then = vi.fn().mockImplementation((resolve: (v: unknown) => void) => {
      return Promise.resolve({ data: tasks, error: null }).then(resolve);
    });

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    // The route uses Promise.all with two queries.
    // We need the `from` to return chains that resolve properly.
    // Since both queries call from("tasks"), we need them to resolve differently.
    let callIdx = 0;
    mockSupabase.from.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) {
        // Count query (select with count/head)
        const chain = createChainableMock({ count: 1, error: null });
        return chain;
      }
      // Data query
      const chain = createChainableMock({ data: tasks, error: null });
      return chain;
    });

    const { GET } = await import("@/app/api/tasks/route");
    const request = new Request("http://localhost/api/tasks?workspace_id=ws-001");
    const response = await GET(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("pagination");
  });

  it("should parse pagination parameters", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    mockSupabase.from.mockImplementation(() => {
      return createChainableMock({ data: [], error: null, count: 0 });
    });

    const { GET } = await import("@/app/api/tasks/route");
    const request = new Request(
      "http://localhost/api/tasks?workspace_id=ws-001&page=2&limit=10"
    );
    const response = await GET(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.pagination).toBeDefined();
    expect(body.pagination.page).toBe(2);
    expect(body.pagination.limit).toBe(10);
  });

  it("should clamp limit to MAX_PAGE_SIZE (100)", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    mockSupabase.from.mockImplementation(() => {
      return createChainableMock({ data: [], error: null, count: 0 });
    });

    const { GET } = await import("@/app/api/tasks/route");
    const request = new Request(
      "http://localhost/api/tasks?workspace_id=ws-001&limit=500"
    );
    const response = await GET(request);
    const body = await response.json();
    expect(body.pagination.limit).toBe(100);
  });

  it("should apply status filter", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    let eqCalls: string[][] = [];
    mockSupabase.from.mockImplementation(() => {
      const chain = createChainableMock({ data: [], error: null, count: 0 });
      const origEq = chain.eq;
      chain.eq = vi.fn().mockImplementation((...args: string[]) => {
        eqCalls.push(args);
        return origEq(...args);
      });
      return chain;
    });

    const { GET } = await import("@/app/api/tasks/route");
    const request = new Request(
      "http://localhost/api/tasks?workspace_id=ws-001&status=done"
    );
    await GET(request);

    // Check that eq was called with "status", "done"
    const statusCalls = eqCalls.filter(
      (c) => c[0] === "status" && c[1] === "done"
    );
    expect(statusCalls.length).toBeGreaterThan(0);
  });

  it("should apply priority filter", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    let eqCalls: string[][] = [];
    mockSupabase.from.mockImplementation(() => {
      const chain = createChainableMock({ data: [], error: null, count: 0 });
      const origEq = chain.eq;
      chain.eq = vi.fn().mockImplementation((...args: string[]) => {
        eqCalls.push(args);
        return origEq(...args);
      });
      return chain;
    });

    const { GET } = await import("@/app/api/tasks/route");
    const request = new Request(
      "http://localhost/api/tasks?workspace_id=ws-001&priority=p1"
    );
    await GET(request);

    const priorityCalls = eqCalls.filter(
      (c) => c[0] === "priority" && c[1] === "p1"
    );
    expect(priorityCalls.length).toBeGreaterThan(0);
  });

  it("should apply category filter", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    let eqCalls: string[][] = [];
    mockSupabase.from.mockImplementation(() => {
      const chain = createChainableMock({ data: [], error: null, count: 0 });
      const origEq = chain.eq;
      chain.eq = vi.fn().mockImplementation((...args: string[]) => {
        eqCalls.push(args);
        return origEq(...args);
      });
      return chain;
    });

    const { GET } = await import("@/app/api/tasks/route");
    const request = new Request(
      "http://localhost/api/tasks?workspace_id=ws-001&category=research"
    );
    await GET(request);

    const categoryCalls = eqCalls.filter(
      (c) => c[0] === "category" && c[1] === "research"
    );
    expect(categoryCalls.length).toBeGreaterThan(0);
  });

  it("should apply project_id filter", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    let eqCalls: string[][] = [];
    mockSupabase.from.mockImplementation(() => {
      const chain = createChainableMock({ data: [], error: null, count: 0 });
      const origEq = chain.eq;
      chain.eq = vi.fn().mockImplementation((...args: string[]) => {
        eqCalls.push(args);
        return origEq(...args);
      });
      return chain;
    });

    const { GET } = await import("@/app/api/tasks/route");
    const request = new Request(
      "http://localhost/api/tasks?workspace_id=ws-001&project_id=proj-123"
    );
    await GET(request);

    const projectCalls = eqCalls.filter(
      (c) => c[0] === "project_id" && c[1] === "proj-123"
    );
    expect(projectCalls.length).toBeGreaterThan(0);
  });
});

describe("Tasks API - POST /api/tasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when unauthenticated", async () => {
    setupFrom();
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { POST } = await import("@/app/api/tasks/route");
    const request = new Request("http://localhost/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title: "Test task" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("should create task with valid data", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    const createdTask = { ...MOCK_TASK, id: "task-new" };
    mockSupabase.from.mockImplementation(() => {
      const chain = createChainableMock();
      chain.single = vi.fn().mockResolvedValue({ data: createdTask, error: null });
      return chain;
    });

    const { POST } = await import("@/app/api/tasks/route");
    const request = new Request("http://localhost/api/tasks", {
      method: "POST",
      body: JSON.stringify({
        title: "New task",
        category: "research",
        priority: "p2",
        workspace_id: "550e8400-e29b-41d4-a716-446655440000",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
  });

  it("should return 400 for invalid data (missing title)", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    const { POST } = await import("@/app/api/tasks/route");
    const request = new Request("http://localhost/api/tasks", {
      method: "POST",
      body: JSON.stringify({ description: "No title provided" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeDefined();
  });

  it("should return 400 for invalid priority value", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    const { POST } = await import("@/app/api/tasks/route");
    const request = new Request("http://localhost/api/tasks", {
      method: "POST",
      body: JSON.stringify({
        title: "Test task",
        priority: "invalid-priority",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
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
        error: { message: "Insert failed", code: "23505" },
      });
      return chain;
    });

    const { POST } = await import("@/app/api/tasks/route");
    const request = new Request("http://localhost/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title: "New task" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
  });
});

describe("Tasks API - PATCH /api/tasks/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when unauthenticated", async () => {
    setupFrom();
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { PATCH } = await import("@/app/api/tasks/[id]/route");
    const request = new Request("http://localhost/api/tasks/task-001", {
      method: "PATCH",
      body: JSON.stringify({ title: "Updated" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "task-001" }),
    });
    expect(response.status).toBe(401);
  });

  it("should update task fields", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    const updatedTask = { ...MOCK_TASK, title: "Updated title", status: "progress" };
    mockSupabase.from.mockImplementation(() => {
      const chain = createChainableMock();
      chain.single = vi.fn().mockResolvedValue({ data: updatedTask, error: null });
      return chain;
    });

    const { PATCH } = await import("@/app/api/tasks/[id]/route");
    const request = new Request("http://localhost/api/tasks/task-001", {
      method: "PATCH",
      body: JSON.stringify({ title: "Updated title", status: "progress" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "task-001" }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.title).toBe("Updated title");
  });

  it("should return 404 for non-existent task", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    mockSupabase.from.mockImplementation(() => {
      const chain = createChainableMock();
      chain.single = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "No rows found", code: "PGRST116" },
      });
      return chain;
    });

    const { PATCH } = await import("@/app/api/tasks/[id]/route");
    const request = new Request("http://localhost/api/tasks/nonexistent", {
      method: "PATCH",
      body: JSON.stringify({ title: "Updated" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "nonexistent" }),
    });
    expect(response.status).toBe(404);
  });

  it("should return 400 for invalid update data", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    const { PATCH } = await import("@/app/api/tasks/[id]/route");
    const request = new Request("http://localhost/api/tasks/task-001", {
      method: "PATCH",
      body: JSON.stringify({ priority: "invalid-priority" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "task-001" }),
    });
    expect(response.status).toBe(400);
  });
});

describe("Tasks API - DELETE /api/tasks/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when unauthenticated", async () => {
    setupFrom();
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { DELETE } = await import("@/app/api/tasks/[id]/route");
    const request = new Request("http://localhost/api/tasks/task-001", {
      method: "DELETE",
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "task-001" }),
    });
    expect(response.status).toBe(401);
  });

  it("should delete task successfully", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    mockSupabase.from.mockImplementation(() => {
      const chain = createChainableMock();
      // delete().eq() resolves with count
      chain.then = vi.fn().mockImplementation((resolve: (v: unknown) => void) => {
        return Promise.resolve({ error: null, count: 1 }).then(resolve);
      });
      chain.eq = vi.fn().mockImplementation(() => {
        return { then: chain.then };
      });
      return chain;
    });

    const { DELETE } = await import("@/app/api/tasks/[id]/route");
    const request = new Request("http://localhost/api/tasks/task-001", {
      method: "DELETE",
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "task-001" }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  it("should return 404 when task not found", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    mockSupabase.from.mockImplementation(() => {
      const chain = createChainableMock();
      chain.then = vi.fn().mockImplementation((resolve: (v: unknown) => void) => {
        return Promise.resolve({ error: null, count: 0 }).then(resolve);
      });
      chain.eq = vi.fn().mockImplementation(() => {
        return { then: chain.then };
      });
      return chain;
    });

    const { DELETE } = await import("@/app/api/tasks/[id]/route");
    const request = new Request("http://localhost/api/tasks/nonexistent", {
      method: "DELETE",
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "nonexistent" }),
    });
    expect(response.status).toBe(404);
  });
});
