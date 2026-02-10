/**
 * Auth API Route Tests
 *
 * Tests for:
 * - GET/DELETE /api/auth/google
 * - GET /api/auth/google/callback
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

vi.mock("@/lib/env", () => ({
  env: {
    GOOGLE_CLIENT_ID: "test-client-id",
    GOOGLE_CLIENT_SECRET: "test-client-secret",
    GOOGLE_REDIRECT_URI: "http://localhost:3000/api/auth/google/callback",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    AI_SERVICE_URL: "",
    AI_SERVICE_KEY: "",
  },
}));

vi.mock("@/lib/crypto", () => ({
  encryptToken: vi.fn((token: string) => `encrypted_${token}`),
}));

vi.mock("@/lib/oauth-state", () => ({
  signState: vi.fn((payload: string) => `${payload}.test-signature`),
  verifyState: vi.fn((signedState: string) => {
    const lastDot = signedState.lastIndexOf(".");
    if (lastDot === -1) return null;
    const payload = signedState.substring(0, lastDot);
    const signature = signedState.substring(lastDot + 1);
    if (signature !== "test-signature") return null;
    return payload;
  }),
}));

const mockUser = { id: "user-123", email: "prof@example.com" };

function makeRequest(url: string, options?: RequestInit): Request {
  return new Request(url, options);
}

// ---------------------------------------------------------------------------
// GET /api/auth/google
// ---------------------------------------------------------------------------
describe("Auth API - GET /api/auth/google", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { GET } = await import("@/app/api/auth/google/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns Google OAuth URL for authenticated user", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { GET } = await import("@/app/api/auth/google/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.authUrl).toBeDefined();
    expect(body.authUrl).toContain("accounts.google.com");
    expect(body.authUrl).toContain("client_id=test-client-id");
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/auth/google
// ---------------------------------------------------------------------------
describe("Auth API - DELETE /api/auth/google", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { DELETE } = await import("@/app/api/auth/google/route");
    const res = await DELETE();
    expect(res.status).toBe(401);
  });

  it("disconnects Google Calendar successfully", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Delete calendar connection
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: null })
    );
    // Delete cached events
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: null })
    );

    const { DELETE } = await import("@/app/api/auth/google/route");
    const res = await DELETE();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 500 when delete fails", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { message: "DB error" } })
    );

    const { DELETE } = await import("@/app/api/auth/google/route");
    const res = await DELETE();
    expect(res.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// GET /api/auth/google/callback
// ---------------------------------------------------------------------------
describe("Auth API - GET /api/auth/google/callback", () => {
  beforeEach(() => vi.clearAllMocks());

  it("redirects with error when OAuth returns error", async () => {
    const { GET } = await import("@/app/api/auth/google/callback/route");
    const res = await GET(
      makeRequest("http://localhost/api/auth/google/callback?error=access_denied")
    );
    expect(res.status).toBe(307);
    const location = res.headers.get("location") || "";
    expect(location).toContain("error=access_denied");
  });

  it("redirects with error when code is missing", async () => {
    const { GET } = await import("@/app/api/auth/google/callback/route");
    const res = await GET(
      makeRequest("http://localhost/api/auth/google/callback?state=abc")
    );
    expect(res.status).toBe(307);
    const location = res.headers.get("location") || "";
    expect(location).toContain("error=missing_params");
  });

  it("redirects with error when state is missing", async () => {
    const { GET } = await import("@/app/api/auth/google/callback/route");
    const res = await GET(
      makeRequest("http://localhost/api/auth/google/callback?code=abc")
    );
    expect(res.status).toBe(307);
    const location = res.headers.get("location") || "";
    expect(location).toContain("error=missing_params");
  });

  it("redirects with error for invalid state", async () => {
    const { GET } = await import("@/app/api/auth/google/callback/route");
    const res = await GET(
      makeRequest("http://localhost/api/auth/google/callback?code=abc&state=invalid-base64!!!")
    );
    expect(res.status).toBe(307);
    const location = res.headers.get("location") || "";
    expect(location).toContain("error=invalid_state");
  });

  it("redirects with error for expired state", async () => {
    const payload = Buffer.from(JSON.stringify({
      userId: mockUser.id,
      timestamp: Date.now() - 20 * 60 * 1000, // 20 minutes ago (>15 min)
    })).toString("base64");
    const state = `${payload}.test-signature`;

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { GET } = await import("@/app/api/auth/google/callback/route");
    const res = await GET(
      makeRequest(`http://localhost/api/auth/google/callback?code=abc&state=${encodeURIComponent(state)}`)
    );
    expect(res.status).toBe(307);
    const location = res.headers.get("location") || "";
    expect(location).toContain("error=expired_state");
  });

  it("redirects with error when user mismatch", async () => {
    const payload = Buffer.from(JSON.stringify({
      userId: "different-user",
      timestamp: Date.now(),
    })).toString("base64");
    const state = `${payload}.test-signature`;

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { GET } = await import("@/app/api/auth/google/callback/route");
    const res = await GET(
      makeRequest(`http://localhost/api/auth/google/callback?code=abc&state=${encodeURIComponent(state)}`)
    );
    expect(res.status).toBe(307);
    const location = res.headers.get("location") || "";
    expect(location).toContain("error=unauthorized");
  });
});
