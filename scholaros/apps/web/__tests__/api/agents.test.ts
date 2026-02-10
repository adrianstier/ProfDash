/**
 * Agents API Route Tests
 *
 * Tests for:
 * - GET /api/agents
 * - POST /api/agents/chat
 * - POST /api/agents/execute
 * - POST /api/agents/feedback
 * - POST /api/agents/orchestrate
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
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock("@/lib/auth/workspace", () => ({
  verifyWorkspaceMembership: vi.fn(() =>
    Promise.resolve({ id: "mem-1", role: "member" })
  ),
}));

// Mock global fetch for AI service calls
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const mockUser = { id: "user-123", email: "prof@example.com" };

function makeRequest(url: string, options?: RequestInit): Request {
  return new Request(url, options);
}

// ---------------------------------------------------------------------------
// GET /api/agents
// ---------------------------------------------------------------------------
describe("Agents API - GET /api/agents", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { GET } = await import("@/app/api/agents/route");
    const res = await GET(makeRequest("http://localhost/api/agents") as any);
    expect(res.status).toBe(401);
  });

  it("returns agents list from AI service", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { name: "task", description: "Task agent" },
        { name: "project", description: "Project agent" },
      ]),
    });

    const { GET } = await import("@/app/api/agents/route");
    const res = await GET(makeRequest("http://localhost/api/agents") as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it("returns 503 when AI service is down", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockFetch.mockRejectedValue(new Error("Connection refused"));

    const { GET } = await import("@/app/api/agents/route");
    const res = await GET(makeRequest("http://localhost/api/agents") as any);
    expect(res.status).toBe(503);
  });

  it("forwards AI service errors", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve("Internal error"),
    });

    const { GET } = await import("@/app/api/agents/route");
    const res = await GET(makeRequest("http://localhost/api/agents") as any);
    expect(res.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// POST /api/agents/chat
// ---------------------------------------------------------------------------
describe("Agents API - POST /api/agents/chat", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { POST } = await import("@/app/api/agents/chat/route");
    const res = await POST(
      makeRequest("http://localhost/api/agents/chat", {
        method: "POST",
        body: JSON.stringify({ message: "Help me plan my research" }),
      }) as any
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for empty message", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { POST } = await import("@/app/api/agents/chat/route");
    const res = await POST(
      makeRequest("http://localhost/api/agents/chat", {
        method: "POST",
        body: JSON.stringify({ message: "" }),
      }) as any
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing message field", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { POST } = await import("@/app/api/agents/chat/route");
    const res = await POST(
      makeRequest("http://localhost/api/agents/chat", {
        method: "POST",
        body: JSON.stringify({}),
      }) as any
    );
    expect(res.status).toBe(400);
  });

  it("forwards chat to AI service and transforms response", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Workspace query
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: [{ workspace_id: "ws-1" }], error: null })
    );

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        session_id: "sess-1",
        message_id: "msg-1",
        content: "I can help with that!",
        agent_type: "task",
        tool_calls: [],
        suggested_actions: [],
        metadata: {},
      }),
    });

    const { POST } = await import("@/app/api/agents/chat/route");
    const res = await POST(
      makeRequest("http://localhost/api/agents/chat", {
        method: "POST",
        body: JSON.stringify({ message: "Help me plan my research" }),
      }) as any
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sessionId).toBe("sess-1");
    expect(body.content).toBeDefined();
  });

  it("returns 500 when AI service request fails", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: [{ workspace_id: "ws-1" }], error: null })
    );

    mockFetch.mockRejectedValue(new Error("Network error"));

    const { POST } = await import("@/app/api/agents/chat/route");
    const res = await POST(
      makeRequest("http://localhost/api/agents/chat", {
        method: "POST",
        body: JSON.stringify({ message: "Help me plan" }),
      }) as any
    );
    expect(res.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// POST /api/agents/execute
// ---------------------------------------------------------------------------
describe("Agents API - POST /api/agents/execute", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { POST } = await import("@/app/api/agents/execute/route");
    const res = await POST(
      makeRequest("http://localhost/api/agents/execute", {
        method: "POST",
        body: JSON.stringify({
          agentType: "task",
          taskType: "create",
          input: { title: "New task" },
        }),
      }) as any
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid agent type", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { POST } = await import("@/app/api/agents/execute/route");
    const res = await POST(
      makeRequest("http://localhost/api/agents/execute", {
        method: "POST",
        body: JSON.stringify({
          agentType: "invalid-agent",
          taskType: "create",
          input: {},
        }),
      }) as any
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing taskType", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { POST } = await import("@/app/api/agents/execute/route");
    const res = await POST(
      makeRequest("http://localhost/api/agents/execute", {
        method: "POST",
        body: JSON.stringify({
          agentType: "task",
          input: {},
        }),
      }) as any
    );
    expect(res.status).toBe(400);
  });

  it("executes agent task successfully", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Workspace membership check
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: [{ workspace_id: "ws-1" }], error: null })
    );

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        task_id: "task-exec-1",
        status: "completed",
        result: { created: true },
      }),
    });

    const { POST } = await import("@/app/api/agents/execute/route");
    const res = await POST(
      makeRequest("http://localhost/api/agents/execute", {
        method: "POST",
        body: JSON.stringify({
          agentType: "task",
          taskType: "create",
          input: { title: "New task" },
        }),
      }) as any
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.taskId).toBe("task-exec-1");
  });
});

// ---------------------------------------------------------------------------
// POST /api/agents/feedback
// ---------------------------------------------------------------------------
describe("Agents API - POST /api/agents/feedback", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { POST } = await import("@/app/api/agents/feedback/route");
    const res = await POST(
      makeRequest("http://localhost/api/agents/feedback", {
        method: "POST",
        body: JSON.stringify({
          sessionId: "sess-1",
          messageId: "msg-1",
          feedbackType: "thumbs_up",
        }),
      }) as any
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing required fields", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { POST } = await import("@/app/api/agents/feedback/route");
    const res = await POST(
      makeRequest("http://localhost/api/agents/feedback", {
        method: "POST",
        body: JSON.stringify({ sessionId: "sess-1" }),
      }) as any
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid feedback type", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { POST } = await import("@/app/api/agents/feedback/route");
    const res = await POST(
      makeRequest("http://localhost/api/agents/feedback", {
        method: "POST",
        body: JSON.stringify({
          sessionId: "sess-1",
          messageId: "msg-1",
          feedbackType: "invalid_type",
        }),
      }) as any
    );
    expect(res.status).toBe(400);
  });

  it("submits feedback successfully", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Mock agent_sessions lookup for workspace verification
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({
        data: { workspace_id: "ws-1" },
        error: null,
      })
    );

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        status: "received",
        message_id: "msg-1",
        feedback_type: "thumbs_up",
      }),
    });

    const { POST } = await import("@/app/api/agents/feedback/route");
    const res = await POST(
      makeRequest("http://localhost/api/agents/feedback", {
        method: "POST",
        body: JSON.stringify({
          sessionId: "sess-1",
          messageId: "msg-1",
          feedbackType: "thumbs_up",
        }),
      }) as any
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("received");
  });
});

// ---------------------------------------------------------------------------
// POST /api/agents/orchestrate
// ---------------------------------------------------------------------------
describe("Agents API - POST /api/agents/orchestrate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { POST } = await import("@/app/api/agents/orchestrate/route");
    const res = await POST(
      makeRequest("http://localhost/api/agents/orchestrate", {
        method: "POST",
        body: JSON.stringify({
          workflow: {
            id: "wf-1",
            name: "Test workflow",
            description: "Test",
            steps: [],
          },
        }),
      }) as any
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid workflow definition", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { POST } = await import("@/app/api/agents/orchestrate/route");
    const res = await POST(
      makeRequest("http://localhost/api/agents/orchestrate", {
        method: "POST",
        body: JSON.stringify({ workflow: {} }),
      }) as any
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing workflow steps", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { POST } = await import("@/app/api/agents/orchestrate/route");
    const res = await POST(
      makeRequest("http://localhost/api/agents/orchestrate", {
        method: "POST",
        body: JSON.stringify({
          workflow: {
            id: "wf-1",
            name: "Test",
            description: "Test",
          },
        }),
      }) as any
    );
    expect(res.status).toBe(400);
  });

  it("orchestrates workflow successfully", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Workspace membership check
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: [{ workspace_id: "ws-1" }], error: null })
    );

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        execution_id: "exec-1",
        status: "completed",
        results: {
          step1: {
            step_id: "s1",
            status: "completed",
            output: { result: true },
            execution_time_ms: 100,
            agent_type: "task",
          },
        },
      }),
    });

    const { POST } = await import("@/app/api/agents/orchestrate/route");
    const res = await POST(
      makeRequest("http://localhost/api/agents/orchestrate", {
        method: "POST",
        body: JSON.stringify({
          workflow: {
            id: "wf-1",
            name: "Test workflow",
            description: "Test",
            steps: [
              {
                id: "s1",
                name: "Step 1",
                agent: "task",
                action: "create",
                input: { title: "New" },
              },
            ],
          },
        }),
      }) as any
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.executionId).toBe("exec-1");
    expect(body.status).toBe("completed");
  });

  it("returns 500 when orchestration fails", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Workspace membership check
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: [{ workspace_id: "ws-1" }], error: null })
    );

    mockFetch.mockRejectedValue(new Error("Service unavailable"));

    const { POST } = await import("@/app/api/agents/orchestrate/route");
    const res = await POST(
      makeRequest("http://localhost/api/agents/orchestrate", {
        method: "POST",
        body: JSON.stringify({
          workflow: {
            id: "wf-1",
            name: "Test workflow",
            description: "Test",
            steps: [
              {
                id: "s1",
                name: "Step 1",
                agent: "task",
                action: "create",
                input: {},
              },
            ],
          },
        }),
      }) as any
    );
    expect(res.status).toBe(500);
  });
});
