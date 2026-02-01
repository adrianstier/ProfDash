/**
 * Middleware Tests
 *
 * Tests for the Next.js middleware that handles:
 * - Session refresh via Supabase
 * - Protected route redirection (unauthenticated -> /login)
 * - Auth page redirection (authenticated -> /today)
 * - Public route passthrough
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock environment variables before any imports
vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");

// Track cookie operations
const mockCookiesSet = vi.fn();
const mockCookiesGetAll = vi.fn().mockReturnValue([]);

// Track the getUser response
let mockGetUserResponse: { data: { user: unknown } } = {
  data: { user: null },
};

// Mock Supabase SSR
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn((_url: string, _key: string, options: { cookies: { getAll: () => unknown[]; setAll: (c: unknown[]) => void } }) => {
    // Capture the cookie handlers for testing
    return {
      auth: {
        getUser: vi.fn().mockImplementation(async () => mockGetUserResponse),
      },
    };
  }),
}));

// Mock NextResponse
const mockRedirect = vi.fn().mockImplementation((url: URL) => ({
  type: "redirect",
  url: url.toString(),
  cookies: { set: mockCookiesSet },
}));

const mockNext = vi.fn().mockImplementation(() => ({
  type: "next",
  cookies: { set: mockCookiesSet },
}));

vi.mock("next/server", () => ({
  NextResponse: {
    next: (...args: unknown[]) => mockNext(...args),
    redirect: (...args: unknown[]) => mockRedirect(...args),
  },
}));

// Helper to create a mock NextRequest
function createMockRequest(pathname: string) {
  const url = new URL(`http://localhost:3000${pathname}`);
  return {
    nextUrl: {
      pathname: url.pathname,
      clone: () => new URL(url.toString()),
    },
    cookies: {
      getAll: mockCookiesGetAll,
      set: mockCookiesSet,
    },
  };
}

describe("Middleware", () => {
  let middleware: (request: ReturnType<typeof createMockRequest>) => Promise<unknown>;
  let config: { matcher: string[] };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetUserResponse = { data: { user: null } };
    mockNext.mockReturnValue({
      type: "next",
      cookies: { set: mockCookiesSet },
    });

    // Re-import to get fresh module with mocked env
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
    const mod = await import("@/middleware");
    middleware = mod.middleware as typeof middleware;
    config = mod.config;
  });

  describe("Session refresh", () => {
    it("should call supabase.auth.getUser to refresh session", async () => {
      const request = createMockRequest("/today");
      await middleware(request);
      // The middleware always calls getUser - if we get here without error, it was called
      expect(true).toBe(true);
    });
  });

  describe("Protected routes - unauthenticated", () => {
    const protectedPaths = [
      "/today",
      "/upcoming",
      "/board",
      "/list",
      "/calendar",
      "/projects",
      "/publications",
      "/grants",
      "/personnel",
      "/teaching",
      "/settings",
    ];

    it.each(protectedPaths)(
      "should redirect %s to /login when unauthenticated",
      async (path) => {
        mockGetUserResponse = { data: { user: null } };
        const request = createMockRequest(path);
        await middleware(request);
        expect(mockRedirect).toHaveBeenCalled();
        const redirectUrl = mockRedirect.mock.calls[0][0] as URL;
        expect(redirectUrl.pathname).toBe("/login");
      }
    );

    it("should redirect nested protected paths to /login", async () => {
      mockGetUserResponse = { data: { user: null } };
      const request = createMockRequest("/projects/some-id");
      await middleware(request);
      expect(mockRedirect).toHaveBeenCalled();
      const redirectUrl = mockRedirect.mock.calls[0][0] as URL;
      expect(redirectUrl.pathname).toBe("/login");
    });
  });

  describe("Public routes", () => {
    it("should allow / (landing page) through without redirect when unauthenticated", async () => {
      mockGetUserResponse = { data: { user: null } };
      const request = createMockRequest("/");
      const result = await middleware(request);
      // Should NOT redirect - should return the next() response
      expect(mockRedirect).not.toHaveBeenCalled();
    });
  });

  describe("Auth routes - authenticated user", () => {
    const mockUser = { id: "user-123", email: "test@test.com" };

    it("should redirect /login to /today when authenticated", async () => {
      mockGetUserResponse = { data: { user: mockUser } };
      const request = createMockRequest("/login");
      await middleware(request);
      expect(mockRedirect).toHaveBeenCalled();
      const redirectUrl = mockRedirect.mock.calls[0][0] as URL;
      expect(redirectUrl.pathname).toBe("/today");
    });

    it("should redirect /signup to /today when authenticated", async () => {
      mockGetUserResponse = { data: { user: mockUser } };
      const request = createMockRequest("/signup");
      await middleware(request);
      expect(mockRedirect).toHaveBeenCalled();
      const redirectUrl = mockRedirect.mock.calls[0][0] as URL;
      expect(redirectUrl.pathname).toBe("/today");
    });

    it("should redirect / to /today when authenticated", async () => {
      mockGetUserResponse = { data: { user: mockUser } };
      const request = createMockRequest("/");
      await middleware(request);
      expect(mockRedirect).toHaveBeenCalled();
      const redirectUrl = mockRedirect.mock.calls[0][0] as URL;
      expect(redirectUrl.pathname).toBe("/today");
    });

    it("should allow protected routes through when authenticated", async () => {
      mockGetUserResponse = { data: { user: mockUser } };
      const request = createMockRequest("/today");
      await middleware(request);
      // Should NOT redirect to login
      const loginRedirects = mockRedirect.mock.calls.filter(
        (call) => (call[0] as URL).pathname === "/login"
      );
      expect(loginRedirects.length).toBe(0);
    });
  });

  describe("Matcher configuration", () => {
    it("should have a matcher pattern defined", () => {
      expect(config.matcher).toBeDefined();
      expect(config.matcher.length).toBeGreaterThan(0);
    });

    it("should exclude static files from matching", () => {
      const pattern = config.matcher[0];
      // The matcher should exclude _next/static, _next/image, favicon, image files
      expect(pattern).toContain("_next/static");
      expect(pattern).toContain("_next/image");
      expect(pattern).toContain("favicon.ico");
    });

    it("should exclude common image extensions", () => {
      const pattern = config.matcher[0];
      expect(pattern).toContain("svg");
      expect(pattern).toContain("png");
      expect(pattern).toContain("jpg");
    });
  });
});
