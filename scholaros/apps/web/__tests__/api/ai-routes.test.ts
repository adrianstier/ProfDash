/**
 * AI API Route Tests
 *
 * Tests for:
 * - POST /api/ai/breakdown-task
 * - POST /api/ai/enhance-task
 * - POST /api/ai/extract-tasks
 * - POST /api/ai/fit-score
 * - POST /api/ai/generate-email
 * - POST /api/ai/parse-content
 * - POST /api/ai/smart-parse
 * - POST /api/ai/project-summary
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

// Mock Anthropic
const mockAnthropicCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockAnthropicCreate },
  })),
}));

// Mock academic patterns
vi.mock("@/lib/utils/academic-patterns", () => ({
  detectAcademicPattern: vi.fn(() => null),
  getAcademicPatternsContext: vi.fn(() => ""),
}));

// Mock env
vi.mock("@/lib/env", () => ({
  env: {
    AI_SERVICE_URL: "http://localhost:8000",
    AI_SERVICE_KEY: "test-key",
    GOOGLE_CLIENT_ID: "test-client-id",
    GOOGLE_CLIENT_SECRET: "test-secret",
    GOOGLE_REDIRECT_URI: "http://localhost/callback",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  },
}));

// Mock shared schemas for smart-parse
vi.mock("@scholaros/shared", () => ({
  SmartParseRequestSchema: {
    safeParse: vi.fn((data: Record<string, unknown>) => {
      if (!data.text || !data.workspace_id) {
        return {
          success: false,
          error: { flatten: () => ({ fieldErrors: { text: ["Required"] } }) },
        };
      }
      return { success: true, data };
    }),
  },
  SmartParseResultSchema: {
    safeParse: vi.fn(() => ({ success: true })),
  },
}));

// Mock global fetch for AI service proxy routes
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const mockUser = { id: "user-123", email: "prof@example.com" };
const workspaceId = "550e8400-e29b-41d4-a716-446655440000";

function makeRequest(url: string, options?: RequestInit): Request {
  return new Request(url, options);
}

// ---------------------------------------------------------------------------
// POST /api/ai/breakdown-task
// ---------------------------------------------------------------------------
describe("AI API - POST /api/ai/breakdown-task", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { POST } = await import("@/app/api/ai/breakdown-task/route");
    const res = await POST(
      makeRequest("http://localhost/api/ai/breakdown-task", {
        method: "POST",
        body: JSON.stringify({
          task_title: "Write paper",
          workspace_id: workspaceId,
        }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing task_title", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { POST } = await import("@/app/api/ai/breakdown-task/route");
    const res = await POST(
      makeRequest("http://localhost/api/ai/breakdown-task", {
        method: "POST",
        body: JSON.stringify({ workspace_id: workspaceId }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid workspace_id format", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { POST } = await import("@/app/api/ai/breakdown-task/route");
    const res = await POST(
      makeRequest("http://localhost/api/ai/breakdown-task", {
        method: "POST",
        body: JSON.stringify({ task_title: "Test", workspace_id: "not-a-uuid" }),
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

    const { POST } = await import("@/app/api/ai/breakdown-task/route");
    const res = await POST(
      makeRequest("http://localhost/api/ai/breakdown-task", {
        method: "POST",
        body: JSON.stringify({
          task_title: "Write paper",
          workspace_id: workspaceId,
        }),
      })
    );
    expect(res.status).toBe(403);
  });

  it("returns breakdown result from AI", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Membership check
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: "member-1" }, error: null })
    );
    // Projects query
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: [], error: null })
    );

    // Mock Anthropic response
    mockAnthropicCreate.mockResolvedValue({
      content: [{
        type: "text",
        text: JSON.stringify({
          subtasks: [
            { text: "Draft introduction", priority: "p2", estimated_minutes: 60, order: 1, dependencies: [] },
          ],
          summary: "Breaking down the paper writing",
          total_estimated_minutes: 60,
          complexity: "medium",
          suggestions: ["Start with outline"],
        }),
      }],
    });

    // Activity log
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: null })
    );

    const { POST } = await import("@/app/api/ai/breakdown-task/route");
    const res = await POST(
      makeRequest("http://localhost/api/ai/breakdown-task", {
        method: "POST",
        body: JSON.stringify({
          task_title: "Write paper",
          workspace_id: workspaceId,
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.result.subtasks).toBeDefined();
  });

  it("returns 500 when AI returns no text", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: "member-1" }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: [], error: null })
    );

    mockAnthropicCreate.mockResolvedValue({ content: [] });

    const { POST } = await import("@/app/api/ai/breakdown-task/route");
    const res = await POST(
      makeRequest("http://localhost/api/ai/breakdown-task", {
        method: "POST",
        body: JSON.stringify({
          task_title: "Write paper",
          workspace_id: workspaceId,
        }),
      })
    );
    expect(res.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// POST /api/ai/enhance-task
// ---------------------------------------------------------------------------
describe("AI API - POST /api/ai/enhance-task", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { POST } = await import("@/app/api/ai/enhance-task/route");
    const res = await POST(
      makeRequest("http://localhost/api/ai/enhance-task", {
        method: "POST",
        body: JSON.stringify({
          task_title: "Fix stuff",
          workspace_id: workspaceId,
        }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing required fields", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { POST } = await import("@/app/api/ai/enhance-task/route");
    const res = await POST(
      makeRequest("http://localhost/api/ai/enhance-task", {
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

    const { POST } = await import("@/app/api/ai/enhance-task/route");
    const res = await POST(
      makeRequest("http://localhost/api/ai/enhance-task", {
        method: "POST",
        body: JSON.stringify({
          task_title: "Fix stuff",
          workspace_id: workspaceId,
        }),
      })
    );
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// POST /api/ai/extract-tasks
// ---------------------------------------------------------------------------
describe("AI API - POST /api/ai/extract-tasks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { POST } = await import("@/app/api/ai/extract-tasks/route");
    const res = await POST(
      makeRequest("http://localhost/api/ai/extract-tasks", {
        method: "POST",
        body: JSON.stringify({ text: "Meeting notes with lots of content here and more text." }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for text too short", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { POST } = await import("@/app/api/ai/extract-tasks/route");
    const res = await POST(
      makeRequest("http://localhost/api/ai/extract-tasks", {
        method: "POST",
        body: JSON.stringify({ text: "short" }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 503 when AI service is not configured", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Temporarily override env
    const envModule = await import("@/lib/env");
    const originalUrl = envModule.env.AI_SERVICE_URL;
    (envModule.env as Record<string, unknown>).AI_SERVICE_URL = "";

    const { POST } = await import("@/app/api/ai/extract-tasks/route");
    const res = await POST(
      makeRequest("http://localhost/api/ai/extract-tasks", {
        method: "POST",
        body: JSON.stringify({ text: "Meeting notes with lots of content here and more text." }),
      })
    );
    expect(res.status).toBe(503);

    // Restore
    (envModule.env as Record<string, unknown>).AI_SERVICE_URL = originalUrl;
  });

  it("proxies to AI service successfully", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ tasks: [{ title: "Review data" }] }),
    });

    const { POST } = await import("@/app/api/ai/extract-tasks/route");
    const res = await POST(
      makeRequest("http://localhost/api/ai/extract-tasks", {
        method: "POST",
        body: JSON.stringify({ text: "Meeting notes with lots of content here and more text." }),
      })
    );
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// POST /api/ai/fit-score
// ---------------------------------------------------------------------------
describe("AI API - POST /api/ai/fit-score", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { POST } = await import("@/app/api/ai/fit-score/route");
    const res = await POST(
      makeRequest("http://localhost/api/ai/fit-score", {
        method: "POST",
        body: JSON.stringify({
          opportunity: { title: "NSF Grant" },
          profile: { keywords: ["ecology"] },
        }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing opportunity", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { POST } = await import("@/app/api/ai/fit-score/route");
    const res = await POST(
      makeRequest("http://localhost/api/ai/fit-score", {
        method: "POST",
        body: JSON.stringify({ profile: {} }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("proxies to AI service successfully", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ score: 85 }),
    });

    const { POST } = await import("@/app/api/ai/fit-score/route");
    const res = await POST(
      makeRequest("http://localhost/api/ai/fit-score", {
        method: "POST",
        body: JSON.stringify({
          opportunity: { title: "NSF Grant" },
          profile: { keywords: ["ecology"] },
        }),
      })
    );
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// POST /api/ai/generate-email
// ---------------------------------------------------------------------------
describe("AI API - POST /api/ai/generate-email", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { POST } = await import("@/app/api/ai/generate-email/route");
    const res = await POST(
      makeRequest("http://localhost/api/ai/generate-email", {
        method: "POST",
        body: JSON.stringify({
          workspace_id: workspaceId,
          email_type: "meeting_request",
          subject_context: "Discuss NSF proposal",
        }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing email_type", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { POST } = await import("@/app/api/ai/generate-email/route");
    const res = await POST(
      makeRequest("http://localhost/api/ai/generate-email", {
        method: "POST",
        body: JSON.stringify({
          workspace_id: workspaceId,
          subject_context: "Test",
        }),
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

    const { POST } = await import("@/app/api/ai/generate-email/route");
    const res = await POST(
      makeRequest("http://localhost/api/ai/generate-email", {
        method: "POST",
        body: JSON.stringify({
          workspace_id: workspaceId,
          email_type: "meeting_request",
          subject_context: "Discuss NSF proposal",
        }),
      })
    );
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// POST /api/ai/parse-content
// ---------------------------------------------------------------------------
describe("AI API - POST /api/ai/parse-content", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { POST } = await import("@/app/api/ai/parse-content/route");
    const res = await POST(
      makeRequest("http://localhost/api/ai/parse-content", {
        method: "POST",
        body: JSON.stringify({
          content: "Meeting discussed next steps for the grant proposal",
          workspace_id: workspaceId,
        }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for empty content", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { POST } = await import("@/app/api/ai/parse-content/route");
    const res = await POST(
      makeRequest("http://localhost/api/ai/parse-content", {
        method: "POST",
        body: JSON.stringify({
          content: "",
          workspace_id: workspaceId,
        }),
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

    const { POST } = await import("@/app/api/ai/parse-content/route");
    const res = await POST(
      makeRequest("http://localhost/api/ai/parse-content", {
        method: "POST",
        body: JSON.stringify({
          content: "Meeting discussed next steps for the grant proposal",
          workspace_id: workspaceId,
        }),
      })
    );
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// POST /api/ai/smart-parse
// ---------------------------------------------------------------------------
describe("AI API - POST /api/ai/smart-parse", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { POST } = await import("@/app/api/ai/smart-parse/route");
    const res = await POST(
      makeRequest("http://localhost/api/ai/smart-parse", {
        method: "POST",
        body: JSON.stringify({
          text: "Submit NSF report by Friday",
          workspace_id: workspaceId,
        }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing text", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { POST } = await import("@/app/api/ai/smart-parse/route");
    const res = await POST(
      makeRequest("http://localhost/api/ai/smart-parse", {
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

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: null })
    );

    const { POST } = await import("@/app/api/ai/smart-parse/route");
    const res = await POST(
      makeRequest("http://localhost/api/ai/smart-parse", {
        method: "POST",
        body: JSON.stringify({
          text: "Submit NSF report by Friday",
          workspace_id: workspaceId,
        }),
      })
    );
    expect(res.status).toBe(403);
  });

  it("parses natural language into task successfully", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Membership check
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: "member-1" }, error: null })
    );
    // Members query
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: [], error: null })
    );
    // Projects query
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: [], error: null })
    );

    // Mock Anthropic response
    mockAnthropicCreate.mockResolvedValue({
      content: [{
        type: "text",
        text: JSON.stringify({
          main_task: {
            title: "Submit NSF report",
            category: "grants",
            priority: "p1",
            due_date: "2024-01-19",
          },
          subtasks: [],
          summary: "Submit NSF report by Friday",
          was_complex: false,
          confidence: 0.95,
        }),
      }],
    });

    // Activity log
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: null })
    );

    const { POST } = await import("@/app/api/ai/smart-parse/route");
    const res = await POST(
      makeRequest("http://localhost/api/ai/smart-parse", {
        method: "POST",
        body: JSON.stringify({
          text: "Submit NSF report by Friday",
          workspace_id: workspaceId,
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.result.main_task.title).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// POST /api/ai/project-summary
// ---------------------------------------------------------------------------
describe("AI API - POST /api/ai/project-summary", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { POST } = await import("@/app/api/ai/project-summary/route");
    const res = await POST(
      makeRequest("http://localhost/api/ai/project-summary", {
        method: "POST",
        body: JSON.stringify({
          project: { title: "NSF Grant", type: "grant", status: "active" },
        }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid project data", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { POST } = await import("@/app/api/ai/project-summary/route");
    const res = await POST(
      makeRequest("http://localhost/api/ai/project-summary", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(400);
  });

  it("proxies to AI service successfully", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ summary: "Project is on track" }),
    });

    const { POST } = await import("@/app/api/ai/project-summary/route");
    const res = await POST(
      makeRequest("http://localhost/api/ai/project-summary", {
        method: "POST",
        body: JSON.stringify({
          project: { title: "NSF Grant", type: "grant", status: "active" },
        }),
      })
    );
    expect(res.status).toBe(200);
  });
});
