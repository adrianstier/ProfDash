/**
 * Rate Limiter Tests
 *
 * Tests for the in-memory rate limiting utility used by API routes.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We need to import fresh modules for each test to reset the in-memory store
let checkRateLimit: typeof import("@/lib/rate-limit").checkRateLimit;
let getRateLimitIdentifier: typeof import("@/lib/rate-limit").getRateLimitIdentifier;
let getRateLimitHeaders: typeof import("@/lib/rate-limit").getRateLimitHeaders;
let RATE_LIMIT_CONFIGS: typeof import("@/lib/rate-limit").RATE_LIMIT_CONFIGS;

describe("Rate Limiter", () => {
  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("@/lib/rate-limit");
    checkRateLimit = mod.checkRateLimit;
    getRateLimitIdentifier = mod.getRateLimitIdentifier;
    getRateLimitHeaders = mod.getRateLimitHeaders;
    RATE_LIMIT_CONFIGS = mod.RATE_LIMIT_CONFIGS;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("RATE_LIMIT_CONFIGS", () => {
    it("should define api config with 100 requests per minute", () => {
      expect(RATE_LIMIT_CONFIGS.api.limit).toBe(100);
      expect(RATE_LIMIT_CONFIGS.api.windowMs).toBe(60 * 1000);
    });

    it("should define auth config with 10 requests per minute", () => {
      expect(RATE_LIMIT_CONFIGS.auth.limit).toBe(10);
      expect(RATE_LIMIT_CONFIGS.auth.windowMs).toBe(60 * 1000);
    });

    it("should define ai config with 20 requests per minute", () => {
      expect(RATE_LIMIT_CONFIGS.ai.limit).toBe(20);
      expect(RATE_LIMIT_CONFIGS.ai.windowMs).toBe(60 * 1000);
    });

    it("should define read config with 200 requests per minute", () => {
      expect(RATE_LIMIT_CONFIGS.read.limit).toBe(200);
      expect(RATE_LIMIT_CONFIGS.read.windowMs).toBe(60 * 1000);
    });
  });

  describe("checkRateLimit", () => {
    it("should allow the first request", () => {
      const result = checkRateLimit("test-ip-1");
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(99); // default api limit is 100
    });

    it("should decrement remaining count on subsequent requests", () => {
      const r1 = checkRateLimit("test-ip-2");
      const r2 = checkRateLimit("test-ip-2");
      const r3 = checkRateLimit("test-ip-2");

      expect(r1.remaining).toBe(99);
      expect(r2.remaining).toBe(98);
      expect(r3.remaining).toBe(97);
    });

    it("should block requests when limit is exceeded", () => {
      const config = { limit: 3, windowMs: 60000 };

      checkRateLimit("test-ip-3", config); // 1
      checkRateLimit("test-ip-3", config); // 2
      checkRateLimit("test-ip-3", config); // 3 (at limit)
      const blocked = checkRateLimit("test-ip-3", config); // 4 (over limit)

      expect(blocked.success).toBe(false);
      expect(blocked.remaining).toBe(0);
    });

    it("should track different identifiers independently", () => {
      const config = { limit: 2, windowMs: 60000 };

      checkRateLimit("ip-a", config);
      checkRateLimit("ip-a", config);
      const blockedA = checkRateLimit("ip-a", config);

      const allowedB = checkRateLimit("ip-b", config);

      expect(blockedA.success).toBe(false);
      expect(allowedB.success).toBe(true);
      expect(allowedB.remaining).toBe(1);
    });

    it("should use default api config when none provided", () => {
      const result = checkRateLimit("default-config-test");
      expect(result.limit).toBe(100);
    });

    it("should respect custom config", () => {
      const config = { limit: 5, windowMs: 30000 };
      const result = checkRateLimit("custom-config-test", config);
      expect(result.limit).toBe(5);
      expect(result.remaining).toBe(4);
    });

    it("should return reset time in the future", () => {
      const now = Date.now();
      const result = checkRateLimit("reset-time-test");
      expect(result.reset).toBeGreaterThan(now);
    });

    it("should reset after window expires", () => {
      vi.useFakeTimers();
      const config = { limit: 2, windowMs: 1000 }; // 1 second window

      checkRateLimit("expire-test", config);
      checkRateLimit("expire-test", config);
      const blocked = checkRateLimit("expire-test", config);
      expect(blocked.success).toBe(false);

      // Advance time past the window
      vi.advanceTimersByTime(1500);

      const allowed = checkRateLimit("expire-test", config);
      expect(allowed.success).toBe(true);
      expect(allowed.remaining).toBe(1); // Reset to limit - 1

      vi.useRealTimers();
    });

    it("should report remaining as 0 when at exact limit", () => {
      const config = { limit: 1, windowMs: 60000 };
      const result = checkRateLimit("exact-limit", config);
      expect(result.remaining).toBe(0); // limit(1) - count(1) = 0
      expect(result.success).toBe(true);
    });
  });

  describe("getRateLimitIdentifier", () => {
    it("should use userId when provided", () => {
      const request = new Request("http://localhost/api/test", {
        headers: { "x-forwarded-for": "1.2.3.4" },
      });
      const id = getRateLimitIdentifier(request, "user-abc");
      expect(id).toBe("user:user-abc");
    });

    it("should use IP from x-forwarded-for when no userId", () => {
      const request = new Request("http://localhost/api/test", {
        headers: { "x-forwarded-for": "1.2.3.4" },
      });
      const id = getRateLimitIdentifier(request);
      expect(id).toBe("ip:1.2.3.4");
    });

    it("should use first IP from x-forwarded-for with multiple IPs", () => {
      const request = new Request("http://localhost/api/test", {
        headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8, 9.10.11.12" },
      });
      const id = getRateLimitIdentifier(request);
      expect(id).toBe("ip:1.2.3.4");
    });

    it("should return ip:unknown when no forwarded-for header", () => {
      const request = new Request("http://localhost/api/test");
      const id = getRateLimitIdentifier(request);
      expect(id).toBe("ip:unknown");
    });

    it("should prefer userId over IP address", () => {
      const request = new Request("http://localhost/api/test", {
        headers: { "x-forwarded-for": "1.2.3.4" },
      });
      const id = getRateLimitIdentifier(request, "user-123");
      expect(id).toBe("user:user-123");
    });
  });

  describe("getRateLimitHeaders", () => {
    it("should return proper rate limit headers", () => {
      const result = {
        success: true,
        limit: 100,
        remaining: 95,
        reset: 1700000000000,
      };
      const headers = getRateLimitHeaders(result);
      expect(headers).toEqual({
        "X-RateLimit-Limit": "100",
        "X-RateLimit-Remaining": "95",
        "X-RateLimit-Reset": "1700000000000",
      });
    });

    it("should stringify numeric values", () => {
      const result = {
        success: false,
        limit: 10,
        remaining: 0,
        reset: 123456,
      };
      const headers = getRateLimitHeaders(result) as Record<string, string>;
      expect(headers["X-RateLimit-Limit"]).toBe("10");
      expect(headers["X-RateLimit-Remaining"]).toBe("0");
      expect(headers["X-RateLimit-Reset"]).toBe("123456");
    });
  });
});
