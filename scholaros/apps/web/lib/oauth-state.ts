import { createHmac } from "crypto";
import { env } from "@/lib/env";

/**
 * OAuth state HMAC signing utilities.
 *
 * Signs the OAuth state payload with HMAC-SHA256 to prevent forgery.
 * Uses the strongest available server-side secret as the signing key.
 */

function getStateSigningKey(): string {
  return env.TOKEN_ENCRYPTION_KEY || env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

/**
 * Sign a state payload with HMAC-SHA256.
 * @returns The payload with an appended HMAC signature: "payload.signature"
 */
export function signState(payload: string): string {
  const key = getStateSigningKey();
  const signature = createHmac("sha256", key).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

/**
 * Verify a signed state string.
 * @returns The original payload if valid, or null if the signature is invalid.
 */
export function verifyState(signedState: string): string | null {
  const lastDotIndex = signedState.lastIndexOf(".");
  if (lastDotIndex === -1) return null;

  const payload = signedState.substring(0, lastDotIndex);
  const signature = signedState.substring(lastDotIndex + 1);

  const key = getStateSigningKey();
  const expectedSignature = createHmac("sha256", key).update(payload).digest("base64url");

  // Constant-time comparison to prevent timing attacks
  if (signature.length !== expectedSignature.length) return null;
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (!sigBuf.equals(expectedBuf)) return null;

  return payload;
}
