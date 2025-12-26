/**
 * Simple in-memory rate limiter for API routes
 * For production, consider using Redis or a proper rate limiting service
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store - cleared on server restart
// For production, use Redis or similar persistent store
const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

// Default configurations for different route types
export const RATE_LIMIT_CONFIGS = {
  // Standard API routes
  api: { limit: 100, windowMs: 60 * 1000 }, // 100 requests per minute
  // Auth routes (more restrictive)
  auth: { limit: 10, windowMs: 60 * 1000 }, // 10 requests per minute
  // AI routes (expensive operations)
  ai: { limit: 20, windowMs: 60 * 1000 }, // 20 requests per minute
  // Read-heavy routes
  read: { limit: 200, windowMs: 60 * 1000 }, // 200 requests per minute
} as const;

/**
 * Check rate limit for a given identifier
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = RATE_LIMIT_CONFIGS.api
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // Clean up expired entries periodically
  if (rateLimitStore.size > 10000) {
    cleanupExpiredEntries();
  }

  // No existing entry or window expired - create new entry
  if (!entry || now > entry.resetTime) {
    const resetTime = now + config.windowMs;
    rateLimitStore.set(identifier, { count: 1, resetTime });
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      reset: resetTime,
    };
  }

  // Window still active - check if limit exceeded
  if (entry.count >= config.limit) {
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      reset: entry.resetTime,
    };
  }

  // Increment counter
  entry.count += 1;
  rateLimitStore.set(identifier, entry);

  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - entry.count,
    reset: entry.resetTime,
  };
}

/**
 * Clean up expired entries to prevent memory leaks
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Get rate limit identifier from request
 * Uses IP address or user ID if authenticated
 */
export function getRateLimitIdentifier(
  request: Request,
  userId?: string
): string {
  // Prefer user ID for authenticated requests
  if (userId) {
    return `user:${userId}`;
  }

  // Fall back to IP address
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";
  return `ip:${ip}`;
}

/**
 * Create rate limit response headers
 */
export function getRateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": result.reset.toString(),
  };
}
