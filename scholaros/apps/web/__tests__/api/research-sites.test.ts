/**
 * Research Field Sites API Route Tests
 *
 * Comprehensive tests for:
 *   GET  /api/research/sites            (list)
 *   POST /api/research/sites            (create)
 *   GET  /api/research/sites/[siteId]   (get by id)
 *   PATCH /api/research/sites/[siteId]  (update)
 *   DELETE /api/research/sites/[siteId] (delete)
 *
 * Run with: pnpm --filter @scholaros/web test -- __tests__/api/research-sites
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

function createMockChain(result: { data: unknown; error: unknown; count?: number | null }) {
  const chain: Record<string, unknown> = {};
  const methods = [
    "select", "insert", "update", "delete", "eq", "in", "gte", "lte",
    "neq", "ilike", "or", "order", "limit", "range", "head",
  ];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  chain.single = vi.fn(() => Promise.resolve(result));
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  chain.then = (resolve: (v: unknown) => void) => {
    resolve(result);
    return undefined;
  };
  return chain;
}

const defaultResult = { data: null, error: null };

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => createMockChain(defaultResult)),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock("@scholaros/shared", () => ({
  CreateFieldSiteSchema: {
    safeParse: vi.fn((data: Record<string, unknown>) => {
      if (!data.workspace_id || !data.name) {
        return {
          success: false,
          error: { errors: [{ message: "Required fields missing" }] },
        };
      }
      if (data.location && typeof data.location !== "object") {
        return {
          success: false,
          error: { errors: [{ message: "Invalid location data" }] },
        };
      }
      return { success: true, data };
    }),
  },
  UpdateFieldSiteSchema: {
    safeParse: vi.fn((data: Record<string, unknown>) => {
      if (Object.keys(data).length === 0) {
        return {
          success: false,
          error: { errors: [{ message: "No fields to update" }] },
        };
      }
      return { success: true, data };
    }),
  },
}));

// ---------------------------------------------------------------------------
// Imports (must come AFTER vi.mock)
// ---------------------------------------------------------------------------

import { GET as sitesGET, POST as sitesPOST } from "@/app/api/research/sites/route";
import {
  GET as siteByIdGET,
  PATCH as siteByIdPATCH,
  DELETE as siteByIdDELETE,
} from "@/app/api/research/sites/[siteId]/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(url: string, options?: RequestInit): Request {
  return new Request(url, options);
}

function makeParams<T>(value: T): { params: Promise<T> } {
  return { params: Promise.resolve(value) };
}

const mockUser = { id: "user-123", email: "prof@example.com" };
const workspaceId = "550e8400-e29b-41d4-a716-446655440000";

function authenticatedUser() {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: mockUser },
    error: null,
  });
}

function unauthenticatedUser() {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: null },
    error: { message: "Not authenticated" },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Field Sites API – GET /api/research/sites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultResult.data = null;
    defaultResult.error = null;
  });

  it("returns 401 when unauthenticated", async () => {
    unauthenticatedUser();
    const res = await sitesGET(
      makeRequest(`http://localhost/api/research/sites?workspace_id=${workspaceId}`)
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when workspace_id is missing", async () => {
    authenticatedUser();
    const res = await sitesGET(makeRequest("http://localhost/api/research/sites"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("workspace_id is required");
  });

  it("returns 403 when user is not a workspace member", async () => {
    authenticatedUser();
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "PGRST116" } })
    );
    const res = await sitesGET(
      makeRequest(`http://localhost/api/research/sites?workspace_id=${workspaceId}`)
    );
    expect(res.status).toBe(403);
  });

  it("returns sites for workspace", async () => {
    authenticatedUser();
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );
    const sitesData = [
      { id: "site-1", name: "Alpine Station", workspace_id: workspaceId },
      { id: "site-2", name: "Wetland Reserve", workspace_id: workspaceId },
    ];
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: sitesData, error: null })
    );

    const res = await sitesGET(
      makeRequest(`http://localhost/api/research/sites?workspace_id=${workspaceId}`)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(body[0].name).toBe("Alpine Station");
  });

  it("filters by active_only=true", async () => {
    authenticatedUser();
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );
    const sitesChain = createMockChain({ data: [], error: null });
    mockSupabase.from.mockReturnValueOnce(sitesChain);

    await sitesGET(
      makeRequest(`http://localhost/api/research/sites?workspace_id=${workspaceId}&active_only=true`)
    );
    expect(sitesChain.eq).toHaveBeenCalledWith("is_active", true);
  });

  it("does not filter by is_active when active_only is false", async () => {
    authenticatedUser();
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );
    const sitesChain = createMockChain({ data: [{ id: "site-inactive" }], error: null });
    mockSupabase.from.mockReturnValueOnce(sitesChain);

    const res = await sitesGET(
      makeRequest(`http://localhost/api/research/sites?workspace_id=${workspaceId}&active_only=false`)
    );
    expect(res.status).toBe(200);
    // eq is called for workspace_id but NOT for is_active
    const eqCalls = (sitesChain.eq as ReturnType<typeof vi.fn>).mock.calls;
    const isActiveCalls = eqCalls.filter(
      (c: unknown[]) => c[0] === "is_active"
    );
    expect(isActiveCalls).toHaveLength(0);
  });

  it("returns empty array when no sites exist", async () => {
    authenticatedUser();
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: [], error: null })
    );

    const res = await sitesGET(
      makeRequest(`http://localhost/api/research/sites?workspace_id=${workspaceId}`)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it("returns 500 on database error", async () => {
    authenticatedUser();
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { message: "Database connection lost" } })
    );

    const res = await sitesGET(
      makeRequest(`http://localhost/api/research/sites?workspace_id=${workspaceId}`)
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to fetch field sites");
  });
});

// ---------------------------------------------------------------------------
// POST /api/research/sites
// ---------------------------------------------------------------------------

describe("Field Sites API – POST /api/research/sites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultResult.data = null;
    defaultResult.error = null;
  });

  it("returns 401 when unauthenticated", async () => {
    unauthenticatedUser();
    const res = await sitesPOST(
      makeRequest("http://localhost/api/research/sites", {
        method: "POST",
        body: JSON.stringify({ workspace_id: workspaceId, name: "Test" }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("creates site with minimal data (workspace_id + name)", async () => {
    authenticatedUser();
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );
    const newSite = { id: "site-new", name: "Glacier Point", workspace_id: workspaceId };
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: newSite, error: null })
    );

    const res = await sitesPOST(
      makeRequest("http://localhost/api/research/sites", {
        method: "POST",
        body: JSON.stringify({ workspace_id: workspaceId, name: "Glacier Point" }),
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe("Glacier Point");
    expect(body.id).toBe("site-new");
  });

  it("creates site with all fields", async () => {
    authenticatedUser();
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "admin" }, error: null })
    );
    const fullSite = {
      id: "site-full",
      name: "Coral Reef Observatory",
      code: "CRO-01",
      workspace_id: workspaceId,
      location: { latitude: -17.5, longitude: 145.7 },
      timezone: "Australia/Brisbane",
      contacts: [{ name: "Jane Doe", email: "jane@reef.edu" }],
      is_active: true,
    };
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: fullSite, error: null })
    );

    const res = await sitesPOST(
      makeRequest("http://localhost/api/research/sites", {
        method: "POST",
        body: JSON.stringify({
          workspace_id: workspaceId,
          name: "Coral Reef Observatory",
          code: "CRO-01",
          location: { latitude: -17.5, longitude: 145.7 },
          timezone: "Australia/Brisbane",
          contacts: [{ name: "Jane Doe", email: "jane@reef.edu" }],
        }),
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.code).toBe("CRO-01");
    expect(body.location).toEqual({ latitude: -17.5, longitude: 145.7 });
  });

  it("returns 400 when name is missing", async () => {
    authenticatedUser();
    const res = await sitesPOST(
      makeRequest("http://localhost/api/research/sites", {
        method: "POST",
        body: JSON.stringify({ workspace_id: workspaceId }),
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid request body");
  });

  it("returns 400 when workspace_id is missing", async () => {
    authenticatedUser();
    const res = await sitesPOST(
      makeRequest("http://localhost/api/research/sites", {
        method: "POST",
        body: JSON.stringify({ name: "Orphan Site" }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 403 when user not in workspace", async () => {
    authenticatedUser();
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "PGRST116" } })
    );

    const res = await sitesPOST(
      makeRequest("http://localhost/api/research/sites", {
        method: "POST",
        body: JSON.stringify({ workspace_id: workspaceId, name: "Denied Site" }),
      })
    );
    expect(res.status).toBe(403);
  });

  it("returns 403 when user has limited role", async () => {
    authenticatedUser();
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "limited" }, error: null })
    );

    const res = await sitesPOST(
      makeRequest("http://localhost/api/research/sites", {
        method: "POST",
        body: JSON.stringify({ workspace_id: workspaceId, name: "Limited Site" }),
      })
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Insufficient permissions");
  });

  it("returns 409 on duplicate site name in workspace", async () => {
    authenticatedUser();
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "admin" }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "23505", message: "Unique constraint violation" } })
    );

    const res = await sitesPOST(
      makeRequest("http://localhost/api/research/sites", {
        method: "POST",
        body: JSON.stringify({ workspace_id: workspaceId, name: "Duplicate Site" }),
      })
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain("already exists");
  });

  it("returns 400 on invalid location data", async () => {
    authenticatedUser();
    const res = await sitesPOST(
      makeRequest("http://localhost/api/research/sites", {
        method: "POST",
        body: JSON.stringify({
          workspace_id: workspaceId,
          name: "Bad Location Site",
          location: "not-an-object",
        }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 500 on unexpected database error during insert", async () => {
    authenticatedUser();
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "42P01", message: "Relation does not exist" } })
    );

    const res = await sitesPOST(
      makeRequest("http://localhost/api/research/sites", {
        method: "POST",
        body: JSON.stringify({ workspace_id: workspaceId, name: "DB Error Site" }),
      })
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to create field site");
  });
});

// ---------------------------------------------------------------------------
// GET /api/research/sites/[siteId]
// ---------------------------------------------------------------------------

describe("Field Sites API – GET /api/research/sites/[siteId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultResult.data = null;
    defaultResult.error = null;
  });

  it("returns 401 when unauthenticated", async () => {
    unauthenticatedUser();
    const res = await siteByIdGET(
      makeRequest("http://localhost/api/research/sites/site-1"),
      makeParams({ siteId: "site-1" })
    );
    expect(res.status).toBe(401);
  });

  it("returns site by ID", async () => {
    authenticatedUser();
    const siteData = {
      id: "site-1",
      name: "Desert Station",
      workspace_id: workspaceId,
      code: "DS-01",
    };
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: siteData, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );

    const res = await siteByIdGET(
      makeRequest("http://localhost/api/research/sites/site-1"),
      makeParams({ siteId: "site-1" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("site-1");
    expect(body.name).toBe("Desert Station");
    expect(body.code).toBe("DS-01");
  });

  it("returns 404 when site not found", async () => {
    authenticatedUser();
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "PGRST116", message: "No rows" } })
    );

    const res = await siteByIdGET(
      makeRequest("http://localhost/api/research/sites/nonexistent"),
      makeParams({ siteId: "nonexistent" })
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Field site not found");
  });

  it("returns 403 when user is not in the site workspace", async () => {
    authenticatedUser();
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: "site-1", workspace_id: "other-workspace", name: "Secret Site" }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: null })
    );

    const res = await siteByIdGET(
      makeRequest("http://localhost/api/research/sites/site-1"),
      makeParams({ siteId: "site-1" })
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Not authorized to view this site");
  });

  it("returns 500 on unexpected database error", async () => {
    authenticatedUser();
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "42P01", message: "DB error" } })
    );

    const res = await siteByIdGET(
      makeRequest("http://localhost/api/research/sites/site-1"),
      makeParams({ siteId: "site-1" })
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to fetch field site");
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/research/sites/[siteId]
// ---------------------------------------------------------------------------

describe("Field Sites API – PATCH /api/research/sites/[siteId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultResult.data = null;
    defaultResult.error = null;
  });

  it("returns 401 when unauthenticated", async () => {
    unauthenticatedUser();
    const res = await siteByIdPATCH(
      makeRequest("http://localhost/api/research/sites/site-1", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
      }),
      makeParams({ siteId: "site-1" })
    );
    expect(res.status).toBe(401);
  });

  it("updates site fields successfully", async () => {
    authenticatedUser();
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: "site-1", name: "Renamed Station", is_active: false }, error: null })
    );

    const res = await siteByIdPATCH(
      makeRequest("http://localhost/api/research/sites/site-1", {
        method: "PATCH",
        body: JSON.stringify({ name: "Renamed Station", is_active: false }),
      }),
      makeParams({ siteId: "site-1" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Renamed Station");
    expect(body.is_active).toBe(false);
  });

  it("returns 404 when site not found", async () => {
    authenticatedUser();
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "PGRST116" } })
    );

    const res = await siteByIdPATCH(
      makeRequest("http://localhost/api/research/sites/missing", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
      }),
      makeParams({ siteId: "missing" })
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 on invalid update data (empty body)", async () => {
    authenticatedUser();
    const res = await siteByIdPATCH(
      makeRequest("http://localhost/api/research/sites/site-1", {
        method: "PATCH",
        body: JSON.stringify({}),
      }),
      makeParams({ siteId: "site-1" })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid request body");
  });

  it("returns 403 when user has limited role", async () => {
    authenticatedUser();
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "limited" }, error: null })
    );

    const res = await siteByIdPATCH(
      makeRequest("http://localhost/api/research/sites/site-1", {
        method: "PATCH",
        body: JSON.stringify({ name: "Nope" }),
      }),
      makeParams({ siteId: "site-1" })
    );
    expect(res.status).toBe(403);
  });

  it("returns 409 on duplicate name during update", async () => {
    authenticatedUser();
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "admin" }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "23505", message: "Unique constraint" } })
    );

    const res = await siteByIdPATCH(
      makeRequest("http://localhost/api/research/sites/site-1", {
        method: "PATCH",
        body: JSON.stringify({ name: "Already Exists" }),
      }),
      makeParams({ siteId: "site-1" })
    );
    expect(res.status).toBe(409);
  });

  it("returns 500 on unexpected database error during update", async () => {
    authenticatedUser();
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "owner" }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "42P01", message: "DB error" } })
    );

    const res = await siteByIdPATCH(
      makeRequest("http://localhost/api/research/sites/site-1", {
        method: "PATCH",
        body: JSON.stringify({ name: "Failing" }),
      }),
      makeParams({ siteId: "site-1" })
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to update field site");
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/research/sites/[siteId]
// ---------------------------------------------------------------------------

describe("Field Sites API – DELETE /api/research/sites/[siteId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultResult.data = null;
    defaultResult.error = null;
  });

  it("returns 401 when unauthenticated", async () => {
    unauthenticatedUser();
    const res = await siteByIdDELETE(
      makeRequest("http://localhost/api/research/sites/site-1", { method: "DELETE" }),
      makeParams({ siteId: "site-1" })
    );
    expect(res.status).toBe(401);
  });

  it("deletes site when user is admin", async () => {
    authenticatedUser();
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "admin" }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: null })
    );

    const res = await siteByIdDELETE(
      makeRequest("http://localhost/api/research/sites/site-1", { method: "DELETE" }),
      makeParams({ siteId: "site-1" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("deletes site when user is owner", async () => {
    authenticatedUser();
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "owner" }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: null })
    );

    const res = await siteByIdDELETE(
      makeRequest("http://localhost/api/research/sites/site-1", { method: "DELETE" }),
      makeParams({ siteId: "site-1" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 404 when site not found", async () => {
    authenticatedUser();
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "PGRST116" } })
    );

    const res = await siteByIdDELETE(
      makeRequest("http://localhost/api/research/sites/gone", { method: "DELETE" }),
      makeParams({ siteId: "gone" })
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Field site not found");
  });

  it("returns 403 when non-admin member tries to delete", async () => {
    authenticatedUser();
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );

    const res = await siteByIdDELETE(
      makeRequest("http://localhost/api/research/sites/site-1", { method: "DELETE" }),
      makeParams({ siteId: "site-1" })
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Admin access required to delete sites");
  });

  it("returns 403 when limited user tries to delete", async () => {
    authenticatedUser();
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "limited" }, error: null })
    );

    const res = await siteByIdDELETE(
      makeRequest("http://localhost/api/research/sites/site-1", { method: "DELETE" }),
      makeParams({ siteId: "site-1" })
    );
    expect(res.status).toBe(403);
  });

  it("returns 403 when user has no membership at all", async () => {
    authenticatedUser();
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: null })
    );

    const res = await siteByIdDELETE(
      makeRequest("http://localhost/api/research/sites/site-1", { method: "DELETE" }),
      makeParams({ siteId: "site-1" })
    );
    expect(res.status).toBe(403);
  });

  it("returns 500 on database error during delete", async () => {
    authenticatedUser();
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "admin" }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { message: "FK constraint" } })
    );

    const res = await siteByIdDELETE(
      makeRequest("http://localhost/api/research/sites/site-1", { method: "DELETE" }),
      makeParams({ siteId: "site-1" })
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to delete field site");
  });
});
