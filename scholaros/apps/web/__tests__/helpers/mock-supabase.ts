/**
 * Supabase Mock Helpers
 *
 * Provides a fully mocked Supabase client with chainable query methods
 * for use in unit tests.
 */

import { vi } from "vitest";

export interface MockSupabaseQueryBuilder {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  neq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
  gt: ReturnType<typeof vi.fn>;
  lt: ReturnType<typeof vi.fn>;
  like: ReturnType<typeof vi.fn>;
  ilike: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  or: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  match: ReturnType<typeof vi.fn>;
  then: ReturnType<typeof vi.fn>;
}

/**
 * Create a mock query builder where every chainable method returns `this`
 * and terminal methods (`single`, `maybeSingle`) also return `this` by default.
 *
 * Override terminal methods in individual tests to set resolved data:
 * ```ts
 * builder.single.mockResolvedValueOnce({ data: myRow, error: null });
 * ```
 */
function createMockQueryBuilder(): MockSupabaseQueryBuilder {
  const builder: Partial<MockSupabaseQueryBuilder> = {};

  const chainableMethods = [
    "select",
    "insert",
    "update",
    "delete",
    "upsert",
    "eq",
    "neq",
    "in",
    "gte",
    "lte",
    "gt",
    "lt",
    "like",
    "ilike",
    "is",
    "or",
    "order",
    "limit",
    "range",
    "match",
  ] as const;

  // Build chain first so mockReturnThis refers to the completed object
  for (const method of chainableMethods) {
    builder[method] = vi.fn();
  }

  // Terminal methods default to resolving { data: null, error: null }
  builder.single = vi.fn().mockResolvedValue({ data: null, error: null });
  builder.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  builder.then = vi.fn();

  const complete = builder as MockSupabaseQueryBuilder;

  // Make chainable methods return the builder itself
  for (const method of chainableMethods) {
    complete[method].mockReturnValue(complete);
  }

  return complete;
}

export interface MockSupabaseClient {
  from: ReturnType<typeof vi.fn>;
  auth: {
    getUser: ReturnType<typeof vi.fn>;
    getSession: ReturnType<typeof vi.fn>;
    signInWithPassword: ReturnType<typeof vi.fn>;
    signOut: ReturnType<typeof vi.fn>;
    onAuthStateChange: ReturnType<typeof vi.fn>;
  };
  rpc: ReturnType<typeof vi.fn>;
  /** The shared query builder. Use this to set expectations/return values. */
  _queryBuilder: MockSupabaseQueryBuilder;
}

/**
 * Create a fully mocked Supabase client.
 *
 * `client.from("any_table")` returns a shared query builder whose methods
 * can be individually overridden.
 */
export function createMockSupabaseClient(): MockSupabaseClient {
  const queryBuilder = createMockQueryBuilder();

  const client: MockSupabaseClient = {
    from: vi.fn().mockReturnValue(queryBuilder),
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
      signInWithPassword: vi
        .fn()
        .mockResolvedValue({ data: { user: null, session: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    _queryBuilder: queryBuilder,
  };

  return client;
}

/**
 * Configure the mock auth to return a specific user.
 * Pass `null` to simulate an unauthenticated state.
 */
export function mockSupabaseAuth(
  client: MockSupabaseClient,
  user?: { id: string; email?: string } | null
): void {
  if (user) {
    client.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: user.id,
          email: user.email ?? "test@example.com",
          app_metadata: {},
          user_metadata: {},
          aud: "authenticated",
          created_at: new Date().toISOString(),
        },
      },
      error: null,
    });
  } else {
    client.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated", status: 401 },
    });
  }
}
