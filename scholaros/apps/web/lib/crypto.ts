import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * Token encryption utilities using AES-256-GCM
 *
 * This module provides secure encryption for sensitive data like OAuth tokens.
 * Uses AES-256-GCM which provides both confidentiality and authenticity.
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM standard IV length
// AUTH_TAG_LENGTH = 16 (GCM auth tag length) - implicit in getAuthTag()

/**
 * Get the encryption key from environment
 * Falls back to a warning in development if not set
 */
function getEncryptionKey(): Buffer | null {
  const keyHex = process.env.TOKEN_ENCRYPTION_KEY;

  if (!keyHex) {
    if (process.env.NODE_ENV === "production") {
      console.error("TOKEN_ENCRYPTION_KEY is required in production");
      return null;
    }
    // In development, warn but allow unencrypted storage
    console.warn("TOKEN_ENCRYPTION_KEY not set - tokens will NOT be encrypted");
    return null;
  }

  return Buffer.from(keyHex, "hex");
}

/**
 * Encrypt a token string
 *
 * @param plaintext - The token to encrypt
 * @returns Encrypted string in format: iv:authTag:ciphertext (all base64)
 *          Returns original string if encryption key not available
 */
export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey();

  if (!key) {
    // Return plaintext if no key (dev mode only)
    return plaintext;
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:ciphertext (all base64 encoded)
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted}`;
}

/**
 * Decrypt an encrypted token string
 *
 * @param encryptedData - The encrypted string from encryptToken
 * @returns Original plaintext token
 * @throws Error if decryption fails or data is tampered
 */
export function decryptToken(encryptedData: string): string {
  const key = getEncryptionKey();

  if (!key) {
    // Return as-is if no key (assumes unencrypted in dev mode)
    return encryptedData;
  }

  // Check if this looks like encrypted data (has the iv:authTag:cipher format)
  const parts = encryptedData.split(":");
  if (parts.length !== 3) {
    // Not encrypted format - might be legacy unencrypted token
    console.warn("Token does not appear to be encrypted - returning as-is");
    return encryptedData;
  }

  const [ivBase64, authTagBase64, ciphertext] = parts;

  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Check if a string appears to be encrypted
 *
 * @param data - String to check
 * @returns true if the string has the encrypted format
 */
export function isEncrypted(data: string): boolean {
  const parts = data.split(":");
  return parts.length === 3;
}

/**
 * Generate a new encryption key (for setup/rotation)
 *
 * @returns Hex-encoded 32-byte key suitable for TOKEN_ENCRYPTION_KEY env var
 */
export function generateEncryptionKey(): string {
  return randomBytes(32).toString("hex");
}
