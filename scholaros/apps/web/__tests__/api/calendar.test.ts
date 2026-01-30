/**
 * Calendar API Route Tests
 *
 * Tests for GET /api/calendar/events and GET/PATCH /api/calendar/connection
 * Run with: pnpm test
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Build a mock chain
const mockChain = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
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
};

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => ({ ...mockChain })),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

// Mock env and crypto modules used by calendar events route
vi.mock("@/lib/env", () => ({
  env: {
    GOOGLE_CLIENT_ID: "mock-client-id",
    GOOGLE_CLIENT_SECRET: "mock-client-secret",
  },
}));

vi.mock("@/lib/crypto", () => ({
  decryptToken: vi.fn((token: string) => `decrypted-${token}`),
  encryptToken: vi.fn((token: string) => `encrypted-${token}`),
}));

// We import the connection route (simpler, no external fetch calls)
import { GET as connectionGET, PATCH as connectionPATCH } from "@/app/api/calendar/connection/route";

function makeRequest(url: string, options?: RequestInit): Request {
  return new Request(url, options);
}

const mockUser = { id: "user-123", email: "prof@example.com" };

describe("Calendar Connection API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(mockChain).forEach((fn) => {
      fn.mockClear();
      if (fn !== mockChain.single && fn !== mockChain.maybeSingle) {
        fn.mockReturnThis();
      }
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/calendar/connection
  // ---------------------------------------------------------------------------
  describe("GET /api/calendar/connection", () => {
    it("returns 401 when unauthenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Not authenticated" },
      });

      const res = await connectionGET();
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("returns connected: false when no connection exists", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockChain.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "No rows" },
      });

      const res = await connectionGET();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.connected).toBe(false);
    });

    it("returns connection details when connected", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const connection = {
        id: "conn-1",
        provider: "google",
        sync_enabled: true,
        selected_calendars: ["primary"],
        last_sync_at: "2025-01-01T00:00:00Z",
        created_at: "2024-12-01T00:00:00Z",
        access_token_encrypted: "secret",
        refresh_token_encrypted: "secret",
      };

      mockChain.single.mockResolvedValue({
        data: connection,
        error: null,
      });

      const res = await connectionGET();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.connected).toBe(true);
      expect(body.provider).toBe("google");
      expect(body.sync_enabled).toBe(true);
      // Tokens should NOT be exposed
      expect(body.access_token_encrypted).toBeUndefined();
      expect(body.refresh_token_encrypted).toBeUndefined();
    });

    it("returns 500 on non-PGRST116 database error", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockChain.single.mockResolvedValue({
        data: null,
        error: { code: "42P01", message: "Table not found" },
      });

      const res = await connectionGET();
      expect(res.status).toBe(500);
    });
  });

  // ---------------------------------------------------------------------------
  // PATCH /api/calendar/connection
  // ---------------------------------------------------------------------------
  describe("PATCH /api/calendar/connection", () => {
    it("returns 401 when unauthenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Not authenticated" },
      });

      const res = await connectionPATCH(
        makeRequest("http://localhost/api/calendar/connection", {
          method: "PATCH",
          body: JSON.stringify({ sync_enabled: true }),
        })
      );
      expect(res.status).toBe(401);
    });

    it("returns 400 when no fields provided", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const res = await connectionPATCH(
        makeRequest("http://localhost/api/calendar/connection", {
          method: "PATCH",
          body: JSON.stringify({}),
        })
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Validation failed");
    });

    it("updates sync_enabled setting", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const updatedConnection = {
        provider: "google",
        sync_enabled: false,
        selected_calendars: ["primary"],
        last_sync_at: "2025-01-01T00:00:00Z",
      };

      mockChain.single.mockResolvedValue({
        data: updatedConnection,
        error: null,
      });

      const res = await connectionPATCH(
        makeRequest("http://localhost/api/calendar/connection", {
          method: "PATCH",
          body: JSON.stringify({ sync_enabled: false }),
        })
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.sync_enabled).toBe(false);
      expect(body.connected).toBe(true);
    });

    it("updates selected_calendars", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const updatedConnection = {
        provider: "google",
        sync_enabled: true,
        selected_calendars: ["primary", "work"],
        last_sync_at: "2025-01-01T00:00:00Z",
      };

      mockChain.single.mockResolvedValue({
        data: updatedConnection,
        error: null,
      });

      const res = await connectionPATCH(
        makeRequest("http://localhost/api/calendar/connection", {
          method: "PATCH",
          body: JSON.stringify({ selected_calendars: ["primary", "work"] }),
        })
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.selected_calendars).toEqual(["primary", "work"]);
    });

    it("returns 500 on database update error", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockChain.single.mockResolvedValue({
        data: null,
        error: { message: "Update failed" },
      });

      const res = await connectionPATCH(
        makeRequest("http://localhost/api/calendar/connection", {
          method: "PATCH",
          body: JSON.stringify({ sync_enabled: true }),
        })
      );
      expect(res.status).toBe(500);
    });
  });
});

describe("Calendar Events API - Auth & Connection Checks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(mockChain).forEach((fn) => {
      fn.mockClear();
      if (fn !== mockChain.single && fn !== mockChain.maybeSingle) {
        fn.mockReturnThis();
      }
    });
  });

  // We test the events route auth and connection logic
  // The full Google API fetch is complex to mock, so we focus on the guard clauses

  it("events route returns 401 when unauthenticated", async () => {
    // Import dynamically to use the mocks
    const { GET: eventsGET } = await import("@/app/api/calendar/events/route");

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const res = await eventsGET(
      makeRequest("http://localhost/api/calendar/events")
    );
    expect(res.status).toBe(401);
  });

  it("events route returns 404 when no calendar connected", async () => {
    const { GET: eventsGET } = await import("@/app/api/calendar/events/route");

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockChain.single.mockResolvedValue({
      data: null,
      error: { code: "PGRST116", message: "No rows" },
    });

    const res = await eventsGET(
      makeRequest("http://localhost/api/calendar/events")
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.needsConnection).toBe(true);
  });

  it("events route returns 400 when sync is disabled", async () => {
    const { GET: eventsGET } = await import("@/app/api/calendar/events/route");

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockChain.single.mockResolvedValue({
      data: {
        id: "conn-1",
        user_id: mockUser.id,
        provider: "google",
        sync_enabled: false,
        access_token_encrypted: "enc-token",
      },
      error: null,
    });

    const res = await eventsGET(
      makeRequest("http://localhost/api/calendar/events")
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Calendar sync disabled");
  });

  it("events route returns cached events when available and not refreshing", async () => {
    const { GET: eventsGET } = await import("@/app/api/calendar/events/route");

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // First from() call - calendar_connections
    const connChain = { ...mockChain };
    connChain.single = vi.fn().mockResolvedValue({
      data: {
        id: "conn-1",
        user_id: mockUser.id,
        provider: "google",
        sync_enabled: true,
        access_token_encrypted: "enc-token",
        last_sync_at: "2025-01-01T00:00:00Z",
      },
      error: null,
    });
    mockSupabase.from.mockReturnValueOnce(connChain);

    // Second from() call - calendar_events_cache
    const cacheChain = { ...mockChain };
    const cachedEvents = [
      { id: "evt-1", summary: "Meeting", start_time: "2025-01-15T10:00:00Z" },
    ];
    cacheChain.limit = vi.fn().mockResolvedValue({
      data: cachedEvents,
      error: null,
    });
    mockSupabase.from.mockReturnValueOnce(cacheChain);

    const res = await eventsGET(
      makeRequest("http://localhost/api/calendar/events")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual(cachedEvents);
    expect(body.pagination.source).toBe("cache");
  });
});
