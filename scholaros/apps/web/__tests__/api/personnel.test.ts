/**
 * Personnel API Route Tests
 *
 * Tests for GET and POST /api/personnel
 * Run with: pnpm test
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Stores the result that `await query` will resolve to
let queryResult: { data: unknown; error: unknown } = { data: null, error: null };

// Track chained method calls -- the chain is thenable so `await query` works
const mockChain: Record<string, ReturnType<typeof vi.fn>> & { then?: unknown } = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  eq: vi.fn(),
  in: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
  ilike: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
  single: vi.fn(),
  maybeSingle: vi.fn(),
  range: vi.fn(),
};

// Make chain methods return the chain (for chaining) and add `then` for awaiting
function setupChain() {
  for (const key of Object.keys(mockChain)) {
    if (key === "then" || key === "single" || key === "maybeSingle") continue;
    mockChain[key].mockReturnValue(mockChain);
  }
  // single/maybeSingle resolve using queryResult
  mockChain.single.mockImplementation(() => Promise.resolve(queryResult));
  mockChain.maybeSingle.mockImplementation(() => Promise.resolve(queryResult));
  // Make the chain itself thenable -- `await query` resolves to queryResult
  mockChain.then = (resolve: (v: unknown) => void) => {
    resolve(queryResult);
    return undefined;
  };
}

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => {
    setupChain();
    return mockChain;
  }),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

// Import route handlers after mocking
import { GET, POST } from "@/app/api/personnel/route";

// Helper to create Request objects
function makeRequest(url: string, options?: RequestInit): Request {
  return new Request(url, options);
}

const mockUser = { id: "user-123", email: "prof@example.com" };

describe("Personnel API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryResult = { data: null, error: null };
    for (const key of Object.keys(mockChain)) {
      if (key === "then") continue;
      (mockChain[key] as ReturnType<typeof vi.fn>).mockClear();
    }
  });

  // ---------------------------------------------------------------------------
  // GET /api/personnel
  // ---------------------------------------------------------------------------
  describe("GET /api/personnel", () => {
    it("returns 401 when unauthenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Not authenticated" },
      });

      const res = await GET(makeRequest("http://localhost/api/personnel"));
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("returns personnel list for authenticated user", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const personnelData = [
        { id: "p1", name: "Alice", role: "phd-student", user_id: mockUser.id },
        { id: "p2", name: "Bob", role: "postdoc", user_id: mockUser.id },
      ];

      queryResult = { data: personnelData, error: null };

      const res = await GET(makeRequest("http://localhost/api/personnel"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual(personnelData);
      expect(mockSupabase.from).toHaveBeenCalledWith("personnel");
    });

    it("filters by workspace_id when provided", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      queryResult = { data: [], error: null };

      const wsId = "ws-abc-123";
      await GET(makeRequest(`http://localhost/api/personnel?workspace_id=${wsId}`));

      // eq is called for user_id and workspace_id
      expect(mockChain.eq).toHaveBeenCalledWith("user_id", mockUser.id);
      expect(mockChain.eq).toHaveBeenCalledWith("workspace_id", wsId);
    });

    it("filters by role when valid role provided", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      queryResult = { data: [], error: null };

      await GET(
        makeRequest("http://localhost/api/personnel?role=postdoc")
      );

      expect(mockChain.eq).toHaveBeenCalledWith("role", "postdoc");
    });

    it("ignores invalid role filter", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      queryResult = { data: [], error: null };

      await GET(
        makeRequest("http://localhost/api/personnel?role=invalid-role")
      );

      // eq should only be called once for user_id, not for role
      const eqCalls = mockChain.eq.mock.calls;
      const roleCalls = eqCalls.filter(
        (call: string[]) => call[0] === "role"
      );
      expect(roleCalls.length).toBe(0);
    });

    it("returns 500 on database error", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      queryResult = { data: null, error: { message: "Database error" } };

      const res = await GET(makeRequest("http://localhost/api/personnel"));
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe("Database error");
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/personnel
  // ---------------------------------------------------------------------------
  describe("POST /api/personnel", () => {
    it("returns 401 when unauthenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Not authenticated" },
      });

      const res = await POST(
        makeRequest("http://localhost/api/personnel", {
          method: "POST",
          body: JSON.stringify({ name: "Test", role: "postdoc" }),
        })
      );
      expect(res.status).toBe(401);
    });

    it("creates personnel member with valid data", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const newPersonnel = {
        id: "p-new",
        name: "Charlie",
        role: "phd-student",
        user_id: mockUser.id,
      };

      queryResult = { data: newPersonnel, error: null };

      const res = await POST(
        makeRequest("http://localhost/api/personnel", {
          method: "POST",
          body: JSON.stringify({ name: "Charlie", role: "phd-student" }),
        })
      );

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toEqual(newPersonnel);
      expect(mockChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Charlie",
          role: "phd-student",
          user_id: mockUser.id,
        })
      );
    });

    it("returns 400 when name is missing", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const res = await POST(
        makeRequest("http://localhost/api/personnel", {
          method: "POST",
          body: JSON.stringify({ role: "postdoc" }),
        })
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Validation failed");
    });

    it("returns 400 when role is invalid", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const res = await POST(
        makeRequest("http://localhost/api/personnel", {
          method: "POST",
          body: JSON.stringify({ name: "Test", role: "invalid-role" }),
        })
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Validation failed");
    });

    it("returns 400 when name is empty string", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const res = await POST(
        makeRequest("http://localhost/api/personnel", {
          method: "POST",
          body: JSON.stringify({ name: "", role: "postdoc" }),
        })
      );

      expect(res.status).toBe(400);
    });

    it("accepts optional fields", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const newPersonnel = {
        id: "p-new",
        name: "Dana",
        role: "staff",
        year: 3,
        funding: "NSF Grant",
        email: "dana@university.edu",
        notes: "Lab manager",
        user_id: mockUser.id,
      };

      queryResult = { data: newPersonnel, error: null };

      const res = await POST(
        makeRequest("http://localhost/api/personnel", {
          method: "POST",
          body: JSON.stringify({
            name: "Dana",
            role: "staff",
            year: 3,
            funding: "NSF Grant",
            email: "dana@university.edu",
            notes: "Lab manager",
          }),
        })
      );

      expect(res.status).toBe(201);
    });

    it("returns 500 on database insert error", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      queryResult = { data: null, error: { message: "Insert failed" } };

      const res = await POST(
        makeRequest("http://localhost/api/personnel", {
          method: "POST",
          body: JSON.stringify({ name: "Test", role: "postdoc" }),
        })
      );

      expect(res.status).toBe(500);
    });
  });
});
