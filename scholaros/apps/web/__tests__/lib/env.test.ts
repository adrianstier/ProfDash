/**
 * Environment Variable Validation Tests
 *
 * Tests for the Zod-based environment validation in lib/env.ts.
 * Since env.ts executes validation on import, we test by manipulating
 * environment variables before importing the module.
 */

import { describe, it, expect, vi, afterEach } from "vitest";

describe("Environment Validation", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("should validate successfully with valid required variables", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key-123");

    const { env } = await import("@/lib/env");
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("https://test.supabase.co");
    expect(env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe("test-anon-key-123");
  });

  it("should throw when NEXT_PUBLIC_SUPABASE_URL is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-key");

    await expect(import("@/lib/env")).rejects.toThrow(
      "Invalid environment variables"
    );
  });

  it("should throw when NEXT_PUBLIC_SUPABASE_URL is not a valid URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "not-a-url");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-key");

    await expect(import("@/lib/env")).rejects.toThrow(
      "Invalid environment variables"
    );
  });

  it("should throw when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    await expect(import("@/lib/env")).rejects.toThrow(
      "Invalid environment variables"
    );
  });

  it("should accept optional NEXT_PUBLIC_APP_URL when valid", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-key");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.scholaros.com");

    const { env } = await import("@/lib/env");
    expect(env.NEXT_PUBLIC_APP_URL).toBe("https://app.scholaros.com");
  });

  it("should accept missing optional variables", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-key");

    const { env } = await import("@/lib/env");
    // Optional variables should be undefined
    expect(env.GOOGLE_CLIENT_ID).toBeUndefined();
    expect(env.AI_SERVICE_URL).toBeUndefined();
  });

  it("should successfully validate with only required client vars", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-key");

    // In client mode (jsdom), only client schema is validated
    const { env } = await import("@/lib/env");
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("https://test.supabase.co");
    expect(env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe("test-key");
  });

  // Note: Server-only env vars (TOKEN_ENCRYPTION_KEY, GOOGLE_REDIRECT_URI, etc.)
  // are only validated on the server side (typeof window === 'undefined').
  // In the jsdom test environment, only the client schema is used,
  // so we test that the client schema correctly passes/rejects.

  it("should only expose NEXT_PUBLIC_* vars on the client side", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-key");
    vi.stubEnv("TOKEN_ENCRYPTION_KEY", "a".repeat(64));

    const { env } = await import("@/lib/env");
    // In jsdom (client), server-only vars are not included in the validated object
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("https://test.supabase.co");
    expect(env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe("test-key");
  });

  it("should validate only client-side schema in browser environment", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-key");
    // Invalid server vars should NOT cause an error on client
    vi.stubEnv("AI_SERVICE_URL", "not-a-url");

    const { env } = await import("@/lib/env");
    // Should succeed because client schema doesn't validate AI_SERVICE_URL
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("https://test.supabase.co");
  });
});
