/**
 * Grants API Route Tests
 *
 * Tests for GET /api/grants/search and GET/POST /api/grants/watchlist
 * Run with: pnpm test
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Build a mock chain that returns itself for everything except terminal methods
const mockChain = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  ilike: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn(),
  maybeSingle: vi.fn(),
  range: vi.fn().mockReturnThis(),
  neq: vi.fn().mockReturnThis(),
};

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => ({ ...mockChain })),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

import { GET as searchGET } from "@/app/api/grants/search/route";
import { GET as watchlistGET, POST as watchlistPOST } from "@/app/api/grants/watchlist/route";

function makeRequest(url: string, options?: RequestInit): Request {
  return new Request(url, options);
}

const mockUser = { id: "user-123", email: "prof@example.com" };

describe("Grants Search API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(mockChain).forEach((fn) => {
      fn.mockClear();
      if (fn !== mockChain.single && fn !== mockChain.maybeSingle) {
        fn.mockReturnThis();
      }
    });
  });

  describe("GET /api/grants/search", () => {
    it("returns 401 when unauthenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Not authenticated" },
      });

      const res = await searchGET(
        makeRequest("http://localhost/api/grants/search")
      );
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("returns opportunities with pagination", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const opportunities = [
        { id: "opp-1", title: "NSF Grant", agency: "NSF" },
        { id: "opp-2", title: "NIH Grant", agency: "NIH" },
      ];

      mockChain.range.mockResolvedValue({
        data: opportunities,
        error: null,
        count: 2,
      });

      const res = await searchGET(
        makeRequest("http://localhost/api/grants/search")
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.opportunities).toEqual(opportunities);
      expect(body.total).toBe(2);
      expect(body.page).toBe(1);
      expect(body.limit).toBe(20);
    });

    it("passes keywords filter", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockChain.range.mockResolvedValue({
        data: [],
        error: null,
        count: 0,
      });

      await searchGET(
        makeRequest("http://localhost/api/grants/search?keywords=ecology")
      );

      expect(mockChain.or).toHaveBeenCalled();
    });

    it("passes agency filter", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockChain.range.mockResolvedValue({
        data: [],
        error: null,
        count: 0,
      });

      await searchGET(
        makeRequest("http://localhost/api/grants/search?agency=NSF")
      );

      expect(mockChain.ilike).toHaveBeenCalledWith("agency", "%NSF%");
    });

    it("passes funding_type filter", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockChain.range.mockResolvedValue({
        data: [],
        error: null,
        count: 0,
      });

      await searchGET(
        makeRequest("http://localhost/api/grants/search?funding_type=R01")
      );

      expect(mockChain.eq).toHaveBeenCalledWith("funding_instrument_type", "R01");
    });

    it("passes amount range filters", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockChain.range.mockResolvedValue({
        data: [],
        error: null,
        count: 0,
      });

      await searchGET(
        makeRequest(
          "http://localhost/api/grants/search?amount_min=100000&amount_max=500000"
        )
      );

      expect(mockChain.gte).toHaveBeenCalledWith("award_ceiling", 100000);
      expect(mockChain.lte).toHaveBeenCalledWith("award_ceiling", 500000);
    });

    it("passes deadline range filters", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockChain.range.mockResolvedValue({
        data: [],
        error: null,
        count: 0,
      });

      await searchGET(
        makeRequest(
          "http://localhost/api/grants/search?deadline_from=2025-01-01&deadline_to=2025-12-31"
        )
      );

      expect(mockChain.gte).toHaveBeenCalledWith("deadline", "2025-01-01");
      expect(mockChain.lte).toHaveBeenCalledWith("deadline", "2025-12-31");
    });

    it("caps limit at 100", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockChain.range.mockResolvedValue({
        data: [],
        error: null,
        count: 0,
      });

      const res = await searchGET(
        makeRequest("http://localhost/api/grants/search?limit=500")
      );

      const body = await res.json();
      expect(body.limit).toBe(100);
    });

    it("returns 500 on database error", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockChain.range.mockResolvedValue({
        data: null,
        error: { message: "DB error" },
        count: null,
      });

      const res = await searchGET(
        makeRequest("http://localhost/api/grants/search")
      );
      expect(res.status).toBe(500);
    });

    it("sanitizes keywords to prevent ILIKE injection", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockChain.range.mockResolvedValue({
        data: [],
        error: null,
        count: 0,
      });

      await searchGET(
        makeRequest("http://localhost/api/grants/search?keywords=test%25_injection")
      );

      // The or call should have sanitized % and _ characters
      const orCall = mockChain.or.mock.calls[0]?.[0] as string | undefined;
      expect(orCall).toBeDefined();
      // The sanitized keywords should escape % and _
      expect(orCall).toContain("test\\%\\_injection");
    });
  });
});

describe("Grants Watchlist API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(mockChain).forEach((fn) => {
      fn.mockClear();
      if (fn !== mockChain.single && fn !== mockChain.maybeSingle) {
        fn.mockReturnThis();
      }
    });
  });

  describe("GET /api/grants/watchlist", () => {
    it("returns 401 when unauthenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Not authenticated" },
      });

      const res = await watchlistGET(
        makeRequest("http://localhost/api/grants/watchlist?workspace_id=ws-1")
      );
      expect(res.status).toBe(401);
    });

    it("returns 400 when workspace_id is missing", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const res = await watchlistGET(
        makeRequest("http://localhost/api/grants/watchlist")
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("workspace_id is required");
    });

    it("returns watchlist items for workspace", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const watchlistData = [
        { id: "w1", opportunity_id: "opp-1", priority: "high", opportunity: { title: "NSF Grant" } },
      ];

      mockChain.order.mockResolvedValue({ data: watchlistData, error: null });

      const res = await watchlistGET(
        makeRequest(
          "http://localhost/api/grants/watchlist?workspace_id=550e8400-e29b-41d4-a716-446655440000"
        )
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual(watchlistData);
    });

    it("returns 500 on database error", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockChain.order.mockResolvedValue({
        data: null,
        error: { message: "DB error" },
      });

      const res = await watchlistGET(
        makeRequest(
          "http://localhost/api/grants/watchlist?workspace_id=550e8400-e29b-41d4-a716-446655440000"
        )
      );
      expect(res.status).toBe(500);
    });
  });

  describe("POST /api/grants/watchlist", () => {
    it("returns 401 when unauthenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Not authenticated" },
      });

      const res = await watchlistPOST(
        makeRequest("http://localhost/api/grants/watchlist", {
          method: "POST",
          body: JSON.stringify({
            workspace_id: "550e8400-e29b-41d4-a716-446655440000",
            opportunity_id: "550e8400-e29b-41d4-a716-446655440001",
          }),
        })
      );
      expect(res.status).toBe(401);
    });

    it("returns 400 when validation fails", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const res = await watchlistPOST(
        makeRequest("http://localhost/api/grants/watchlist", {
          method: "POST",
          body: JSON.stringify({ workspace_id: "not-a-uuid" }),
        })
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Validation failed");
    });

    it("returns 409 when opportunity already in watchlist", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // First from() call checks existing - returns found
      const existingCheck = { ...mockChain };
      existingCheck.single = vi.fn().mockResolvedValue({
        data: { id: "existing-id" },
        error: null,
      });
      mockSupabase.from.mockReturnValueOnce(existingCheck);

      const res = await watchlistPOST(
        makeRequest("http://localhost/api/grants/watchlist", {
          method: "POST",
          body: JSON.stringify({
            workspace_id: "550e8400-e29b-41d4-a716-446655440000",
            opportunity_id: "550e8400-e29b-41d4-a716-446655440001",
          }),
        })
      );
      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.error).toBe("Opportunity already in watchlist");
    });

    it("creates watchlist item successfully", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // First from() call checks existing - not found
      const existingCheck = { ...mockChain };
      existingCheck.single = vi.fn().mockResolvedValue({
        data: null,
        error: { code: "PGRST116" },
      });
      mockSupabase.from.mockReturnValueOnce(existingCheck);

      // Second from() call inserts
      const insertResult = {
        id: "new-watch",
        workspace_id: "550e8400-e29b-41d4-a716-446655440000",
        opportunity_id: "550e8400-e29b-41d4-a716-446655440001",
        priority: "medium",
        status: "watching",
      };

      const insertChain = { ...mockChain };
      insertChain.single = vi.fn().mockResolvedValue({
        data: insertResult,
        error: null,
      });
      mockSupabase.from.mockReturnValueOnce(insertChain);

      const res = await watchlistPOST(
        makeRequest("http://localhost/api/grants/watchlist", {
          method: "POST",
          body: JSON.stringify({
            workspace_id: "550e8400-e29b-41d4-a716-446655440000",
            opportunity_id: "550e8400-e29b-41d4-a716-446655440001",
          }),
        })
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.priority).toBe("medium");
    });

    it("accepts optional notes and priority", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const existingCheck = { ...mockChain };
      existingCheck.single = vi.fn().mockResolvedValue({
        data: null,
        error: { code: "PGRST116" },
      });
      mockSupabase.from.mockReturnValueOnce(existingCheck);

      const insertChain = { ...mockChain };
      insertChain.single = vi.fn().mockResolvedValue({
        data: { id: "new-watch", priority: "high", notes: "Important" },
        error: null,
      });
      mockSupabase.from.mockReturnValueOnce(insertChain);

      const res = await watchlistPOST(
        makeRequest("http://localhost/api/grants/watchlist", {
          method: "POST",
          body: JSON.stringify({
            workspace_id: "550e8400-e29b-41d4-a716-446655440000",
            opportunity_id: "550e8400-e29b-41d4-a716-446655440001",
            priority: "high",
            notes: "Important",
          }),
        })
      );
      expect(res.status).toBe(201);
    });
  });
});
