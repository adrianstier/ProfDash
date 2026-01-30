/**
 * Research Permits API Route Tests
 *
 * Tests for permits CRUD endpoints:
 *   GET/POST  /api/research/projects/[id]/permits
 *   GET/PATCH/DELETE /api/research/projects/[id]/permits/[permitId]
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

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

const defaultResult = { data: null, error: null };

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => createMockChain(defaultResult)),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock("@scholaros/shared", () => ({
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
      const validTypes = ["IACUC", "IBC", "collection", "CITES", "export", "import", "IRB", "MOU", "institutional", "other"];
      if (!validTypes.includes(data.permit_type as string)) {
        return {
          success: false,
          error: {
            flatten: () => ({
              fieldErrors: { permit_type: ["Invalid permit type"] },
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
  UpdatePermitSchema: {
    safeParse: vi.fn((data: Record<string, unknown>) => {
      const validStatuses = ["pending", "active", "expired", "renewal_pending", "suspended"];
      if (data.status && !validStatuses.includes(data.status as string)) {
        return {
          success: false,
          error: {
            flatten: () => ({
              fieldErrors: { status: ["Invalid status"] },
            }),
          },
        };
      }
      return {
        success: true,
        data: {
          ...data,
          start_date: data.start_date !== undefined
            ? (data.start_date ? new Date(data.start_date as string) : null)
            : undefined,
          expiration_date: data.expiration_date !== undefined
            ? (data.expiration_date ? new Date(data.expiration_date as string) : null)
            : undefined,
        },
      };
    }),
  },
}));

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
const projectId = "proj-001";
const permitId = "permit-001";

// ---------------------------------------------------------------------------
// Import route handlers (dynamic to pick up mocks)
// ---------------------------------------------------------------------------

const importPermitsRoute = () =>
  import("@/app/api/research/projects/[id]/permits/route");

const importPermitByIdRoute = () =>
  import("@/app/api/research/projects/[id]/permits/[permitId]/route");

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Permits API - GET /api/research/projects/[id]/permits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultResult.data = null;
    defaultResult.error = null;
  });

  it("returns 401 when unauthenticated", async () => {
    const { GET } = await importPermitsRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await GET(
      makeRequest("http://localhost/api/research/projects/proj-1/permits") as any,
      makeParams({ id: "proj-1" })
    );
    expect(res.status).toBe(401);
  });

  it("returns permits list for a project", async () => {
    const { GET } = await importPermitsRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    // project lookup
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: projectId, workspace_id: workspaceId }, error: null })
    );
    // membership
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: "mem-1" }, error: null })
    );
    // permits query
    const permits = [
      { id: "p1", title: "IACUC", permit_type: "IACUC", status: "active" },
      { id: "p2", title: "IBC", permit_type: "IBC", status: "pending" },
    ];
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: permits, error: null })
    );

    const res = await GET(
      makeRequest(`http://localhost/api/research/projects/${projectId}/permits`) as any,
      makeParams({ id: projectId })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(permits);
    expect(body).toHaveLength(2);
  });

  it("returns 404 when project not found", async () => {
    const { GET } = await importPermitsRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "PGRST116" } })
    );

    const res = await GET(
      makeRequest("http://localhost/api/research/projects/bad-id/permits") as any,
      makeParams({ id: "bad-id" })
    );
    expect(res.status).toBe(404);
  });

  it("returns 403 when user is not in workspace", async () => {
    const { GET } = await importPermitsRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: projectId, workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "PGRST116" } })
    );

    const res = await GET(
      makeRequest(`http://localhost/api/research/projects/${projectId}/permits`) as any,
      makeParams({ id: projectId })
    );
    expect(res.status).toBe(403);
  });

  it("filters by status query param", async () => {
    const { GET } = await importPermitsRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: projectId, workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: "mem-1" }, error: null })
    );

    const permitsChain = createMockChain({ data: [], error: null });
    mockSupabase.from.mockReturnValueOnce(permitsChain);

    await GET(
      makeRequest(`http://localhost/api/research/projects/${projectId}/permits?status=active`) as any,
      makeParams({ id: projectId })
    );

    expect(permitsChain.eq).toHaveBeenCalledWith("status", "active");
  });

  it("filters by permit_type query param", async () => {
    const { GET } = await importPermitsRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: projectId, workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: "mem-1" }, error: null })
    );

    const permitsChain = createMockChain({ data: [], error: null });
    mockSupabase.from.mockReturnValueOnce(permitsChain);

    await GET(
      makeRequest(`http://localhost/api/research/projects/${projectId}/permits?permit_type=IACUC`) as any,
      makeParams({ id: projectId })
    );

    expect(permitsChain.eq).toHaveBeenCalledWith("permit_type", "IACUC");
  });

  it("excludes expired permits by default", async () => {
    const { GET } = await importPermitsRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: projectId, workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: "mem-1" }, error: null })
    );

    const permitsChain = createMockChain({ data: [], error: null });
    mockSupabase.from.mockReturnValueOnce(permitsChain);

    await GET(
      makeRequest(`http://localhost/api/research/projects/${projectId}/permits`) as any,
      makeParams({ id: projectId })
    );

    expect(permitsChain.neq).toHaveBeenCalledWith("status", "expired");
  });

  it("returns 500 on database error", async () => {
    const { GET } = await importPermitsRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: projectId, workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: "mem-1" }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { message: "DB error" } })
    );

    const res = await GET(
      makeRequest(`http://localhost/api/research/projects/${projectId}/permits`) as any,
      makeParams({ id: projectId })
    );
    expect(res.status).toBe(500);
  });
});

describe("Permits API - POST /api/research/projects/[id]/permits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultResult.data = null;
    defaultResult.error = null;
  });

  it("returns 401 when unauthenticated", async () => {
    const { POST } = await importPermitsRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await POST(
      makeRequest("http://localhost/api/research/projects/proj-1/permits", {
        method: "POST",
        body: JSON.stringify({ title: "Test", permit_type: "IACUC", workspace_id: workspaceId }),
      }) as any,
      makeParams({ id: "proj-1" })
    );
    expect(res.status).toBe(401);
  });

  it("creates permit with minimal data", async () => {
    const { POST } = await importPermitsRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: projectId, workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );

    const newPermit = { id: "permit-new", title: "IACUC Protocol", permit_type: "IACUC", status: "pending" };
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: newPermit, error: null })
    );

    const res = await POST(
      makeRequest(`http://localhost/api/research/projects/${projectId}/permits`, {
        method: "POST",
        body: JSON.stringify({ title: "IACUC Protocol", permit_type: "IACUC", workspace_id: workspaceId }),
      }) as any,
      makeParams({ id: projectId })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.title).toBe("IACUC Protocol");
  });

  it("creates permit with all fields", async () => {
    const { POST } = await importPermitsRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: projectId, workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "admin" }, error: null })
    );

    const fullPermit = {
      id: "permit-full",
      title: "Collection Permit",
      permit_type: "collection",
      status: "active",
      permit_number: "CP-2024-001",
      issuing_authority: "State Wildlife Agency",
      pi_name: "Dr. Smith",
      start_date: "2024-01-01",
      expiration_date: "2025-01-01",
      notes: "Annual collection permit",
    };
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: fullPermit, error: null })
    );

    const res = await POST(
      makeRequest(`http://localhost/api/research/projects/${projectId}/permits`, {
        method: "POST",
        body: JSON.stringify({
          title: "Collection Permit",
          permit_type: "collection",
          workspace_id: workspaceId,
          permit_number: "CP-2024-001",
          issuing_authority: "State Wildlife Agency",
          pi_name: "Dr. Smith",
          start_date: "2024-01-01",
          expiration_date: "2025-01-01",
          notes: "Annual collection permit",
        }),
      }) as any,
      makeParams({ id: projectId })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.permit_number).toBe("CP-2024-001");
  });

  it("returns 400 when required fields are missing", async () => {
    const { POST } = await importPermitsRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: projectId, workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );

    const res = await POST(
      makeRequest(`http://localhost/api/research/projects/${projectId}/permits`, {
        method: "POST",
        body: JSON.stringify({}),
      }) as any,
      makeParams({ id: projectId })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid permit_type", async () => {
    const { POST } = await importPermitsRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: projectId, workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );

    const res = await POST(
      makeRequest(`http://localhost/api/research/projects/${projectId}/permits`, {
        method: "POST",
        body: JSON.stringify({ title: "Bad Permit", permit_type: "INVALID_TYPE", workspace_id: workspaceId }),
      }) as any,
      makeParams({ id: projectId })
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when project not found", async () => {
    const { POST } = await importPermitsRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "PGRST116" } })
    );

    const res = await POST(
      makeRequest("http://localhost/api/research/projects/bad-id/permits", {
        method: "POST",
        body: JSON.stringify({ title: "Test", permit_type: "IACUC", workspace_id: workspaceId }),
      }) as any,
      makeParams({ id: "bad-id" })
    );
    expect(res.status).toBe(404);
  });

  it("returns 403 when user is not in workspace", async () => {
    const { POST } = await importPermitsRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: projectId, workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: null })
    );

    const res = await POST(
      makeRequest(`http://localhost/api/research/projects/${projectId}/permits`, {
        method: "POST",
        body: JSON.stringify({ title: "Test", permit_type: "IACUC", workspace_id: workspaceId }),
      }) as any,
      makeParams({ id: projectId })
    );
    expect(res.status).toBe(403);
  });

  it("returns 500 on insert error", async () => {
    const { POST } = await importPermitsRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: projectId, workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { message: "Insert failed" } })
    );

    const res = await POST(
      makeRequest(`http://localhost/api/research/projects/${projectId}/permits`, {
        method: "POST",
        body: JSON.stringify({ title: "Test", permit_type: "IACUC", workspace_id: workspaceId }),
      }) as any,
      makeParams({ id: projectId })
    );
    expect(res.status).toBe(500);
  });
});

describe("Permits API - GET /api/research/projects/[id]/permits/[permitId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultResult.data = null;
    defaultResult.error = null;
  });

  it("returns 401 when unauthenticated", async () => {
    const { GET } = await importPermitByIdRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await GET(
      makeRequest(`http://localhost/api/research/projects/${projectId}/permits/${permitId}`) as any,
      makeParams({ id: projectId, permitId })
    );
    expect(res.status).toBe(401);
  });

  it("returns permit by id", async () => {
    const { GET } = await importPermitByIdRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    const permitData = { id: permitId, title: "IACUC Approval", permit_type: "IACUC", project_id: projectId };
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: permitData, error: null })
    );

    const res = await GET(
      makeRequest(`http://localhost/api/research/projects/${projectId}/permits/${permitId}`) as any,
      makeParams({ id: projectId, permitId })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe("IACUC Approval");
  });

  it("returns 404 when permit not found", async () => {
    const { GET } = await importPermitByIdRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "PGRST116" } })
    );

    const res = await GET(
      makeRequest(`http://localhost/api/research/projects/${projectId}/permits/nonexistent`) as any,
      makeParams({ id: projectId, permitId: "nonexistent" })
    );
    expect(res.status).toBe(404);
  });
});

describe("Permits API - PATCH /api/research/projects/[id]/permits/[permitId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultResult.data = null;
    defaultResult.error = null;
  });

  it("returns 401 when unauthenticated", async () => {
    const { PATCH } = await importPermitByIdRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await PATCH(
      makeRequest(`http://localhost/api/research/projects/${projectId}/permits/${permitId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "active" }),
      }) as any,
      makeParams({ id: projectId, permitId })
    );
    expect(res.status).toBe(401);
  });

  it("updates permit status", async () => {
    const { PATCH } = await importPermitByIdRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    // existing permit lookup
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: permitId, project_id: projectId, workspace_id: workspaceId }, error: null })
    );
    // membership
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );
    // update result
    const updated = { id: permitId, status: "active", title: "IACUC Approval" };
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: updated, error: null })
    );

    const res = await PATCH(
      makeRequest(`http://localhost/api/research/projects/${projectId}/permits/${permitId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "active" }),
      }) as any,
      makeParams({ id: projectId, permitId })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("active");
  });

  it("updates permit dates", async () => {
    const { PATCH } = await importPermitByIdRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: permitId, project_id: projectId, workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );
    const updated = { id: permitId, start_date: "2025-01-01", expiration_date: "2026-01-01" };
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: updated, error: null })
    );

    const res = await PATCH(
      makeRequest(`http://localhost/api/research/projects/${projectId}/permits/${permitId}`, {
        method: "PATCH",
        body: JSON.stringify({ start_date: "2025-01-01", expiration_date: "2026-01-01" }),
      }) as any,
      makeParams({ id: projectId, permitId })
    );
    expect(res.status).toBe(200);
  });

  it("updates permit documents", async () => {
    const { PATCH } = await importPermitByIdRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: permitId, project_id: projectId, workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "admin" }, error: null })
    );
    const docs = [{ name: "permit.pdf", url: "https://example.com/permit.pdf" }];
    const updated = { id: permitId, documents: docs };
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: updated, error: null })
    );

    const res = await PATCH(
      makeRequest(`http://localhost/api/research/projects/${projectId}/permits/${permitId}`, {
        method: "PATCH",
        body: JSON.stringify({ documents: docs }),
      }) as any,
      makeParams({ id: projectId, permitId })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.documents).toEqual(docs);
  });

  it("returns 404 when permit not found", async () => {
    const { PATCH } = await importPermitByIdRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "PGRST116" } })
    );

    const res = await PATCH(
      makeRequest(`http://localhost/api/research/projects/${projectId}/permits/nonexistent`, {
        method: "PATCH",
        body: JSON.stringify({ status: "active" }),
      }) as any,
      makeParams({ id: projectId, permitId: "nonexistent" })
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid status value", async () => {
    const { PATCH } = await importPermitByIdRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: permitId, project_id: projectId, workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );

    const res = await PATCH(
      makeRequest(`http://localhost/api/research/projects/${projectId}/permits/${permitId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "BOGUS_STATUS" }),
      }) as any,
      makeParams({ id: projectId, permitId })
    );
    expect(res.status).toBe(400);
  });

  it("returns 403 when user is not in workspace", async () => {
    const { PATCH } = await importPermitByIdRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: permitId, project_id: projectId, workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: null })
    );

    const res = await PATCH(
      makeRequest(`http://localhost/api/research/projects/${projectId}/permits/${permitId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "active" }),
      }) as any,
      makeParams({ id: projectId, permitId })
    );
    expect(res.status).toBe(403);
  });
});

describe("Permits API - DELETE /api/research/projects/[id]/permits/[permitId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultResult.data = null;
    defaultResult.error = null;
  });

  it("returns 401 when unauthenticated", async () => {
    const { DELETE } = await importPermitByIdRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await DELETE(
      makeRequest(`http://localhost/api/research/projects/${projectId}/permits/${permitId}`, { method: "DELETE" }) as any,
      makeParams({ id: projectId, permitId })
    );
    expect(res.status).toBe(401);
  });

  it("deletes a permit as admin", async () => {
    const { DELETE } = await importPermitByIdRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    // existing permit
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: permitId, project_id: projectId, workspace_id: workspaceId }, error: null })
    );
    // membership with admin role
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "admin" }, error: null })
    );
    // delete
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: null })
    );

    const res = await DELETE(
      makeRequest(`http://localhost/api/research/projects/${projectId}/permits/${permitId}`, { method: "DELETE" }) as any,
      makeParams({ id: projectId, permitId })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("deletes a permit as owner", async () => {
    const { DELETE } = await importPermitByIdRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: permitId, project_id: projectId, workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "owner" }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: null })
    );

    const res = await DELETE(
      makeRequest(`http://localhost/api/research/projects/${projectId}/permits/${permitId}`, { method: "DELETE" }) as any,
      makeParams({ id: projectId, permitId })
    );
    expect(res.status).toBe(200);
  });

  it("returns 404 when permit not found", async () => {
    const { DELETE } = await importPermitByIdRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: null, error: { code: "PGRST116" } })
    );

    const res = await DELETE(
      makeRequest(`http://localhost/api/research/projects/${projectId}/permits/nonexistent`, { method: "DELETE" }) as any,
      makeParams({ id: projectId, permitId: "nonexistent" })
    );
    expect(res.status).toBe(404);
  });

  it("returns 403 when non-admin tries to delete", async () => {
    const { DELETE } = await importPermitByIdRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: permitId, project_id: projectId, workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "member" }, error: null })
    );

    const res = await DELETE(
      makeRequest(`http://localhost/api/research/projects/${projectId}/permits/${permitId}`, { method: "DELETE" }) as any,
      makeParams({ id: projectId, permitId })
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("owners and admins");
  });

  it("returns 403 when limited user tries to delete", async () => {
    const { DELETE } = await importPermitByIdRoute();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { id: permitId, project_id: projectId, workspace_id: workspaceId }, error: null })
    );
    mockSupabase.from.mockReturnValueOnce(
      createMockChain({ data: { role: "limited" }, error: null })
    );

    const res = await DELETE(
      makeRequest(`http://localhost/api/research/projects/${projectId}/permits/${permitId}`, { method: "DELETE" }) as any,
      makeParams({ id: projectId, permitId })
    );
    expect(res.status).toBe(403);
  });
});
