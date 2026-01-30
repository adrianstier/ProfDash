/**
 * Research API Route Tests
 *
 * Tests for field sites, experiments, and permits CRUD endpoints
 * Run with: pnpm test
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Creates a thenable mock chain.
 * All chainable methods return the chain itself.
 * `await chain` and `chain.single()` resolve to `result`.
 */
function createMockChain(result: { data: unknown; error: unknown }) {
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
  chain.then = (resolve: (v: unknown) => void) => { resolve(result); return undefined; };
  return chain;
}

// Default result for the default mock chain
const defaultResult = { data: null, error: null };

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => createMockChain(defaultResult)),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

// Mock the shared schemas - they are imported in the routes
vi.mock("@scholaros/shared", () => ({
  CreateFieldSiteSchema: {
    safeParse: vi.fn((data: Record<string, unknown>) => {
      if (!data.workspace_id || !data.name) {
        return {
          success: false,
          error: { errors: [{ message: "Required fields missing" }] },
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
  CreateExperimentSchema: {
    safeParse: vi.fn((data: Record<string, unknown>) => {
      if (!data.title || !data.project_id || !data.workspace_id) {
        return {
          success: false,
          error: { errors: [{ message: "Required fields missing" }] },
        };
      }
      return { success: true, data };
    }),
  },
  CreatePermitSchema: {
    safeParse: vi.fn((data: Record<string, unknown>) => {
      if (!data.title || !data.permit_type || !data.workspace_id) {
        return {
          success: false,
          error: {
            flatten: () => ({
              fieldErrors: { title: ["Required"], permit_type: ["Required"] },
            }),
          },
        };
      }
      return {
        success: true,
        data: {
          ...data,
          start_date: data.start_date ? new Date(data.start_date as string) : null,
          expiration_date: data.expiration_date ? new Date(data.expiration_date as string) : null,
        },
      };
    }),
  },
}));

import { GET as sitesGET, POST as sitesPOST } from "@/app/api/research/sites/route";
import {
  GET as siteByIdGET,
  PATCH as siteByIdPATCH,
  DELETE as siteByIdDELETE,
} from "@/app/api/research/sites/[siteId]/route";

function makeRequest(url: string, options?: RequestInit): Request {
  return new Request(url, options);
}

const mockUser = { id: "user-123", email: "prof@example.com" };
const workspaceId = "550e8400-e29b-41d4-a716-446655440000";

function makeParams<T>(value: T): { params: Promise<T> } {
  return { params: Promise.resolve(value) };
}

describe("Research Sites API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultResult.data = null;
    defaultResult.error = null;
  });

  // ---------------------------------------------------------------------------
  // GET /api/research/sites
  // ---------------------------------------------------------------------------
  describe("GET /api/research/sites", () => {
    it("returns 401 when unauthenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Not authenticated" },
      });

      const res = await sitesGET(
        makeRequest(`http://localhost/api/research/sites?workspace_id=${workspaceId}`)
      );
      expect(res.status).toBe(401);
    });

    it("returns 400 when workspace_id is missing", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const res = await sitesGET(
        makeRequest("http://localhost/api/research/sites")
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("workspace_id is required");
    });

    it("returns 403 when user is not a workspace member", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // membership check returns null
      const memberChain = createMockChain({
        data: null,
        error: { code: "PGRST116" },
      });
      mockSupabase.from.mockReturnValueOnce(memberChain);

      const res = await sitesGET(
        makeRequest(`http://localhost/api/research/sites?workspace_id=${workspaceId}`)
      );
      expect(res.status).toBe(403);
    });

    it("returns field sites for workspace", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // workspace_members check
      mockSupabase.from.mockReturnValueOnce(
        createMockChain({ data: { role: "member" }, error: null })
      );

      // field_sites query
      const sitesData = [
        { id: "site-1", name: "Coral Reef A", workspace_id: workspaceId },
        { id: "site-2", name: "Forest Plot B", workspace_id: workspaceId },
      ];
      mockSupabase.from.mockReturnValueOnce(
        createMockChain({ data: sitesData, error: null })
      );

      const res = await sitesGET(
        makeRequest(`http://localhost/api/research/sites?workspace_id=${workspaceId}`)
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual(sitesData);
    });

    it("filters by active_only when provided", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce(
        createMockChain({ data: { role: "member" }, error: null })
      );

      const sitesChain = createMockChain({ data: [], error: null });
      mockSupabase.from.mockReturnValueOnce(sitesChain);

      await sitesGET(
        makeRequest(
          `http://localhost/api/research/sites?workspace_id=${workspaceId}&active_only=true`
        )
      );

      expect(sitesChain.eq).toHaveBeenCalledWith("is_active", true);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/research/sites
  // ---------------------------------------------------------------------------
  describe("POST /api/research/sites", () => {
    it("returns 401 when unauthenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Not authenticated" },
      });

      const res = await sitesPOST(
        makeRequest("http://localhost/api/research/sites", {
          method: "POST",
          body: JSON.stringify({ workspace_id: workspaceId, name: "Test Site" }),
        })
      );
      expect(res.status).toBe(401);
    });

    it("returns 400 when validation fails", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const res = await sitesPOST(
        makeRequest("http://localhost/api/research/sites", {
          method: "POST",
          body: JSON.stringify({}),
        })
      );
      expect(res.status).toBe(400);
    });

    it("returns 403 when user has insufficient permissions", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce(
        createMockChain({ data: { role: "limited" }, error: null })
      );

      const res = await sitesPOST(
        makeRequest("http://localhost/api/research/sites", {
          method: "POST",
          body: JSON.stringify({ workspace_id: workspaceId, name: "Test Site" }),
        })
      );
      expect(res.status).toBe(403);
    });

    it("creates a field site successfully", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // membership check
      mockSupabase.from.mockReturnValueOnce(
        createMockChain({ data: { role: "member" }, error: null })
      );

      // insert result
      const newSite = { id: "site-new", name: "Marine Station", workspace_id: workspaceId };
      mockSupabase.from.mockReturnValueOnce(
        createMockChain({ data: newSite, error: null })
      );

      const res = await sitesPOST(
        makeRequest("http://localhost/api/research/sites", {
          method: "POST",
          body: JSON.stringify({ workspace_id: workspaceId, name: "Marine Station" }),
        })
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.name).toBe("Marine Station");
    });

    it("returns 409 on duplicate site name", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce(
        createMockChain({ data: { role: "admin" }, error: null })
      );

      mockSupabase.from.mockReturnValueOnce(
        createMockChain({ data: null, error: { code: "23505", message: "Unique constraint" } })
      );

      const res = await sitesPOST(
        makeRequest("http://localhost/api/research/sites", {
          method: "POST",
          body: JSON.stringify({ workspace_id: workspaceId, name: "Duplicate Site" }),
        })
      );
      expect(res.status).toBe(409);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/research/sites/[siteId]
  // ---------------------------------------------------------------------------
  describe("GET /api/research/sites/[siteId]", () => {
    it("returns 401 when unauthenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Not authenticated" },
      });

      const res = await siteByIdGET(
        makeRequest("http://localhost/api/research/sites/site-1"),
        makeParams({ siteId: "site-1" })
      );
      expect(res.status).toBe(401);
    });

    it("returns 404 when site not found", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce(
        createMockChain({ data: null, error: { code: "PGRST116", message: "No rows" } })
      );

      const res = await siteByIdGET(
        makeRequest("http://localhost/api/research/sites/not-found"),
        makeParams({ siteId: "not-found" })
      );
      expect(res.status).toBe(404);
    });

    it("returns 403 when user is not a workspace member", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // get site (found)
      mockSupabase.from.mockReturnValueOnce(
        createMockChain({ data: { id: "site-1", workspace_id: workspaceId, name: "Reef Site" }, error: null })
      );

      // membership check (not a member)
      mockSupabase.from.mockReturnValueOnce(
        createMockChain({ data: null, error: { code: "PGRST116" } })
      );

      const res = await siteByIdGET(
        makeRequest("http://localhost/api/research/sites/site-1"),
        makeParams({ siteId: "site-1" })
      );
      expect(res.status).toBe(403);
    });

    it("returns site data when authorized", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const siteData = { id: "site-1", workspace_id: workspaceId, name: "Reef Site" };
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
      expect(body.name).toBe("Reef Site");
    });
  });

  // ---------------------------------------------------------------------------
  // PATCH /api/research/sites/[siteId]
  // ---------------------------------------------------------------------------
  describe("PATCH /api/research/sites/[siteId]", () => {
    it("returns 401 when unauthenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Not authenticated" },
      });

      const res = await siteByIdPATCH(
        makeRequest("http://localhost/api/research/sites/site-1", {
          method: "PATCH",
          body: JSON.stringify({ name: "Updated" }),
        }),
        makeParams({ siteId: "site-1" })
      );
      expect(res.status).toBe(401);
    });

    it("returns 404 when site not found", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce(
        createMockChain({ data: null, error: { code: "PGRST116" } })
      );

      const res = await siteByIdPATCH(
        makeRequest("http://localhost/api/research/sites/not-found", {
          method: "PATCH",
          body: JSON.stringify({ name: "Updated" }),
        }),
        makeParams({ siteId: "not-found" })
      );
      expect(res.status).toBe(404);
    });

    it("updates a site successfully", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // fetch existing site
      mockSupabase.from.mockReturnValueOnce(
        createMockChain({ data: { workspace_id: workspaceId }, error: null })
      );
      // membership check
      mockSupabase.from.mockReturnValueOnce(
        createMockChain({ data: { role: "member" }, error: null })
      );
      // update result
      mockSupabase.from.mockReturnValueOnce(
        createMockChain({ data: { id: "site-1", name: "Updated Name" }, error: null })
      );

      const res = await siteByIdPATCH(
        makeRequest("http://localhost/api/research/sites/site-1", {
          method: "PATCH",
          body: JSON.stringify({ name: "Updated Name" }),
        }),
        makeParams({ siteId: "site-1" })
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.name).toBe("Updated Name");
    });
  });

  // ---------------------------------------------------------------------------
  // DELETE /api/research/sites/[siteId]
  // ---------------------------------------------------------------------------
  describe("DELETE /api/research/sites/[siteId]", () => {
    it("returns 401 when unauthenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Not authenticated" },
      });

      const res = await siteByIdDELETE(
        makeRequest("http://localhost/api/research/sites/site-1", { method: "DELETE" }),
        makeParams({ siteId: "site-1" })
      );
      expect(res.status).toBe(401);
    });

    it("returns 404 when site not found", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce(
        createMockChain({ data: null, error: { code: "PGRST116" } })
      );

      const res = await siteByIdDELETE(
        makeRequest("http://localhost/api/research/sites/not-found", { method: "DELETE" }),
        makeParams({ siteId: "not-found" })
      );
      expect(res.status).toBe(404);
    });

    it("returns 403 when user is not admin/owner", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

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

    it("deletes a site when user is admin", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

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
  });
});

describe("Research Experiments API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultResult.data = null;
    defaultResult.error = null;
  });

  const importExperiments = () =>
    import("@/app/api/research/projects/[id]/experiments/route");

  describe("GET /api/research/projects/[id]/experiments", () => {
    it("returns 401 when unauthenticated", async () => {
      const { GET } = await importExperiments();

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Not authenticated" },
      });

      const res = await GET(
        makeRequest("http://localhost/api/research/projects/proj-1/experiments"),
        makeParams({ id: "proj-1" })
      );
      expect(res.status).toBe(401);
    });

    it("returns 404 when project not found", async () => {
      const { GET } = await importExperiments();

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce(
        createMockChain({ data: null, error: { code: "PGRST116" } })
      );

      const res = await GET(
        makeRequest("http://localhost/api/research/projects/not-found/experiments"),
        makeParams({ id: "not-found" })
      );
      expect(res.status).toBe(404);
    });

    it("returns 400 when project is not a research project", async () => {
      const { GET } = await importExperiments();

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce(
        createMockChain({ data: { workspace_id: workspaceId, type: "manuscript" }, error: null })
      );

      const res = await GET(
        makeRequest("http://localhost/api/research/projects/proj-1/experiments"),
        makeParams({ id: "proj-1" })
      );
      expect(res.status).toBe(400);
    });

    it("returns 403 when user is not a workspace member", async () => {
      const { GET } = await importExperiments();

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce(
        createMockChain({ data: { workspace_id: workspaceId, type: "research" }, error: null })
      );
      mockSupabase.from.mockReturnValueOnce(
        createMockChain({ data: null, error: { code: "PGRST116" } })
      );

      const res = await GET(
        makeRequest("http://localhost/api/research/projects/proj-1/experiments"),
        makeParams({ id: "proj-1" })
      );
      expect(res.status).toBe(403);
    });
  });

  describe("POST /api/research/projects/[id]/experiments", () => {
    it("returns 401 when unauthenticated", async () => {
      const { POST } = await importExperiments();

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Not authenticated" },
      });

      const res = await POST(
        makeRequest("http://localhost/api/research/projects/proj-1/experiments", {
          method: "POST",
          body: JSON.stringify({ title: "Experiment 1" }),
        }),
        makeParams({ id: "proj-1" })
      );
      expect(res.status).toBe(401);
    });

    it("returns 404 when project not found", async () => {
      const { POST } = await importExperiments();

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce(
        createMockChain({ data: null, error: { code: "PGRST116" } })
      );

      const res = await POST(
        makeRequest("http://localhost/api/research/projects/not-found/experiments", {
          method: "POST",
          body: JSON.stringify({ title: "Experiment 1" }),
        }),
        makeParams({ id: "not-found" })
      );
      expect(res.status).toBe(404);
    });

    it("returns 400 for non-research projects", async () => {
      const { POST } = await importExperiments();

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce(
        createMockChain({ data: { workspace_id: workspaceId, type: "grant" }, error: null })
      );

      const res = await POST(
        makeRequest("http://localhost/api/research/projects/proj-1/experiments", {
          method: "POST",
          body: JSON.stringify({ title: "Experiment 1" }),
        }),
        makeParams({ id: "proj-1" })
      );
      expect(res.status).toBe(400);
    });
  });
});

describe("Research Permits API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultResult.data = null;
    defaultResult.error = null;
  });

  const importPermits = () =>
    import("@/app/api/research/projects/[id]/permits/route");

  describe("GET /api/research/projects/[id]/permits", () => {
    it("returns 401 when unauthenticated", async () => {
      const { GET } = await importPermits();

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const res = await GET(
        makeRequest("http://localhost/api/research/projects/proj-1/permits") as any,
        makeParams({ id: "proj-1" })
      );
      expect(res.status).toBe(401);
    });

    it("returns 404 when project not found", async () => {
      const { GET } = await importPermits();

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce(
        createMockChain({ data: null, error: { code: "PGRST116" } })
      );

      const res = await GET(
        makeRequest("http://localhost/api/research/projects/not-found/permits") as any,
        makeParams({ id: "not-found" })
      );
      expect(res.status).toBe(404);
    });

    it("returns 403 when user is not a workspace member", async () => {
      const { GET } = await importPermits();

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce(
        createMockChain({ data: { id: "proj-1", workspace_id: workspaceId }, error: null })
      );
      mockSupabase.from.mockReturnValueOnce(
        createMockChain({ data: null, error: { code: "PGRST116" } })
      );

      const res = await GET(
        makeRequest("http://localhost/api/research/projects/proj-1/permits") as any,
        makeParams({ id: "proj-1" })
      );
      expect(res.status).toBe(403);
    });

    it("returns permits for a project", async () => {
      const { GET } = await importPermits();

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // project found
      mockSupabase.from.mockReturnValueOnce(
        createMockChain({ data: { id: "proj-1", workspace_id: workspaceId }, error: null })
      );
      // membership check
      mockSupabase.from.mockReturnValueOnce(
        createMockChain({ data: { id: "member-1" }, error: null })
      );
      // permits query - thenable chain resolves to permits data
      const permitsData = [
        { id: "permit-1", title: "IACUC Approval", permit_type: "IACUC", status: "active" },
      ];
      mockSupabase.from.mockReturnValueOnce(
        createMockChain({ data: permitsData, error: null })
      );

      const res = await GET(
        makeRequest("http://localhost/api/research/projects/proj-1/permits") as any,
        makeParams({ id: "proj-1" })
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual(permitsData);
    });
  });

  describe("POST /api/research/projects/[id]/permits", () => {
    it("returns 401 when unauthenticated", async () => {
      const { POST } = await importPermits();

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const res = await POST(
        makeRequest("http://localhost/api/research/projects/proj-1/permits", {
          method: "POST",
          body: JSON.stringify({
            title: "IACUC Protocol",
            permit_type: "IACUC",
            workspace_id: workspaceId,
          }),
        }) as any,
        makeParams({ id: "proj-1" })
      );
      expect(res.status).toBe(401);
    });

    it("returns 404 when project not found", async () => {
      const { POST } = await importPermits();

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce(
        createMockChain({ data: null, error: { code: "PGRST116" } })
      );

      const res = await POST(
        makeRequest("http://localhost/api/research/projects/not-found/permits", {
          method: "POST",
          body: JSON.stringify({
            title: "IACUC Protocol",
            permit_type: "IACUC",
            workspace_id: workspaceId,
          }),
        }) as any,
        makeParams({ id: "not-found" })
      );
      expect(res.status).toBe(404);
    });

    it("returns 400 when validation fails", async () => {
      const { POST } = await importPermits();

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce(
        createMockChain({ data: { id: "proj-1", workspace_id: workspaceId }, error: null })
      );
      mockSupabase.from.mockReturnValueOnce(
        createMockChain({ data: { role: "member" }, error: null })
      );

      const res = await POST(
        makeRequest("http://localhost/api/research/projects/proj-1/permits", {
          method: "POST",
          body: JSON.stringify({}),
        }) as any,
        makeParams({ id: "proj-1" })
      );
      expect(res.status).toBe(400);
    });

    it("creates a permit successfully", async () => {
      const { POST } = await importPermits();

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce(
        createMockChain({ data: { id: "proj-1", workspace_id: workspaceId }, error: null })
      );
      mockSupabase.from.mockReturnValueOnce(
        createMockChain({ data: { role: "member" }, error: null })
      );

      const newPermit = { id: "permit-new", title: "IACUC Protocol", permit_type: "IACUC", status: "pending" };
      mockSupabase.from.mockReturnValueOnce(
        createMockChain({ data: newPermit, error: null })
      );

      const res = await POST(
        makeRequest("http://localhost/api/research/projects/proj-1/permits", {
          method: "POST",
          body: JSON.stringify({
            title: "IACUC Protocol",
            permit_type: "IACUC",
            workspace_id: workspaceId,
          }),
        }) as any,
        makeParams({ id: "proj-1" })
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.title).toBe("IACUC Protocol");
    });
  });
});
