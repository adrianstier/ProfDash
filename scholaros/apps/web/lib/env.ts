import { z } from "zod";

/**
 * Environment variable validation schema for client-side (NEXT_PUBLIC_* only)
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url({
    message: "NEXT_PUBLIC_SUPABASE_URL must be a valid URL",
  }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, {
    message: "NEXT_PUBLIC_SUPABASE_ANON_KEY is required",
  }),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

/**
 * Environment variable validation schema for server-side (all variables)
 */
const serverEnvSchema = clientEnvSchema.extend({
  // Optional: Service role key for server-side operations
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // Optional: Google OAuth for calendar integration
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),

  // Encryption key for sensitive data (OAuth tokens)
  // Must be 32 bytes (256 bits) encoded as hex (64 characters)
  TOKEN_ENCRYPTION_KEY: z
    .string()
    .length(64, {
      message:
        "TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)",
    })
    .optional(),

  // Optional: AI Service configuration
  AI_SERVICE_URL: z.string().url().optional(),
  AI_SERVICE_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  // Node environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

/**
 * Check if we're on the server
 */
const isServer = typeof window === "undefined";

/**
 * Validate environment variables
 * Uses different schemas for client vs server
 */
function validateEnv() {
  // On the client, we only have access to NEXT_PUBLIC_* variables
  // Next.js inlines these at build time
  const envObject = isServer
    ? process.env
    : {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      };

  const schema = isServer ? serverEnvSchema : clientEnvSchema;
  const parsed = schema.safeParse(envObject);

  if (!parsed.success) {
    console.error(
      "Invalid environment variables:",
      parsed.error.flatten().fieldErrors
    );
    throw new Error(
      `Invalid environment variables: ${Object.keys(parsed.error.flatten().fieldErrors).join(", ")}`
    );
  }

  return parsed.data as z.infer<typeof serverEnvSchema>;
}

/**
 * Validated environment variables
 * Use this instead of process.env directly for type-safe access
 */
export const env = validateEnv();

/**
 * Type-safe environment variable access
 */
export type Env = z.infer<typeof serverEnvSchema>;
