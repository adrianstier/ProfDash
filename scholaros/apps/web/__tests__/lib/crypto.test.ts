/**
 * Crypto Tests
 *
 * Tests for AES-256-GCM encryption/decryption utilities used for OAuth token storage.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { randomBytes } from "crypto";

describe("Crypto utilities", () => {
  // Generate a valid 32-byte hex key for tests
  const testKey = randomBytes(32).toString("hex");

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  async function importCrypto() {
    return import("@/lib/crypto");
  }

  describe("encryptToken / decryptToken with key", () => {
    it("should encrypt and decrypt a token round-trip", async () => {
      vi.stubEnv("TOKEN_ENCRYPTION_KEY", testKey);
      vi.stubEnv("NODE_ENV", "production");
      const { encryptToken, decryptToken } = await importCrypto();

      const plaintext = "my-secret-oauth-token-12345";
      const encrypted = encryptToken(plaintext);
      expect(encrypted).not.toBe(plaintext);

      const decrypted = decryptToken(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it("should produce different ciphertexts for same plaintext (random IV)", async () => {
      vi.stubEnv("TOKEN_ENCRYPTION_KEY", testKey);
      vi.stubEnv("NODE_ENV", "production");
      const { encryptToken } = await importCrypto();

      const plaintext = "same-token";
      const enc1 = encryptToken(plaintext);
      const enc2 = encryptToken(plaintext);

      expect(enc1).not.toBe(enc2);
    });

    it("should handle empty string", async () => {
      vi.stubEnv("TOKEN_ENCRYPTION_KEY", testKey);
      vi.stubEnv("NODE_ENV", "production");
      const { encryptToken, decryptToken } = await importCrypto();

      const encrypted = encryptToken("");
      const decrypted = decryptToken(encrypted);
      expect(decrypted).toBe("");
    });

    it("should handle special characters", async () => {
      vi.stubEnv("TOKEN_ENCRYPTION_KEY", testKey);
      vi.stubEnv("NODE_ENV", "production");
      const { encryptToken, decryptToken } = await importCrypto();

      const plaintext = "token/with+special=chars&and!symbols@#$%";
      const encrypted = encryptToken(plaintext);
      const decrypted = decryptToken(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it("should handle unicode characters", async () => {
      vi.stubEnv("TOKEN_ENCRYPTION_KEY", testKey);
      vi.stubEnv("NODE_ENV", "production");
      const { encryptToken, decryptToken } = await importCrypto();

      const plaintext = "token-with-unicode-\u00e9\u00e8\u00ea-\u2603";
      const encrypted = encryptToken(plaintext);
      const decrypted = decryptToken(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it("should handle long strings", async () => {
      vi.stubEnv("TOKEN_ENCRYPTION_KEY", testKey);
      vi.stubEnv("NODE_ENV", "production");
      const { encryptToken, decryptToken } = await importCrypto();

      const plaintext = "a".repeat(10000);
      const encrypted = encryptToken(plaintext);
      const decrypted = decryptToken(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it("encrypted output should have iv:authTag:ciphertext format", async () => {
      vi.stubEnv("TOKEN_ENCRYPTION_KEY", testKey);
      vi.stubEnv("NODE_ENV", "production");
      const { encryptToken } = await importCrypto();

      const encrypted = encryptToken("test-token");
      const parts = encrypted.split(":");
      expect(parts.length).toBe(3);
      // Each part should be base64 encoded
      parts.forEach((part) => {
        expect(part.length).toBeGreaterThan(0);
      });
    });
  });

  describe("encryptToken / decryptToken without key (dev mode)", () => {
    it("should return plaintext when no key is set in dev mode", async () => {
      vi.stubEnv("TOKEN_ENCRYPTION_KEY", "");
      vi.stubEnv("NODE_ENV", "development");
      const { encryptToken } = await importCrypto();

      const plaintext = "my-token";
      const result = encryptToken(plaintext);
      expect(result).toBe(plaintext);
    });

    it("should return encrypted data as-is when no key for decryption", async () => {
      vi.stubEnv("TOKEN_ENCRYPTION_KEY", "");
      vi.stubEnv("NODE_ENV", "development");
      const { decryptToken } = await importCrypto();

      const data = "some-unencrypted-token";
      const result = decryptToken(data);
      expect(result).toBe(data);
    });
  });

  describe("decryptToken with legacy unencrypted data", () => {
    it("should return data as-is when it does not match encrypted format", async () => {
      vi.stubEnv("TOKEN_ENCRYPTION_KEY", testKey);
      vi.stubEnv("NODE_ENV", "production");
      const { decryptToken } = await importCrypto();

      // Data without colons is not encrypted format
      const legacy = "plain-oauth-token-no-colons";
      const result = decryptToken(legacy);
      expect(result).toBe(legacy);
    });
  });

  describe("isEncrypted", () => {
    it("should return true for encrypted format (3 parts separated by colons)", async () => {
      vi.stubEnv("TOKEN_ENCRYPTION_KEY", testKey);
      vi.stubEnv("NODE_ENV", "production");
      const { isEncrypted, encryptToken } = await importCrypto();

      const encrypted = encryptToken("test");
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it("should return false for plain strings", async () => {
      vi.stubEnv("TOKEN_ENCRYPTION_KEY", "");
      vi.stubEnv("NODE_ENV", "development");
      const { isEncrypted } = await importCrypto();

      expect(isEncrypted("plain-token")).toBe(false);
      expect(isEncrypted("")).toBe(false);
    });

    it("should return false for strings with fewer than 3 colon-separated parts", async () => {
      vi.stubEnv("TOKEN_ENCRYPTION_KEY", "");
      vi.stubEnv("NODE_ENV", "development");
      const { isEncrypted } = await importCrypto();

      expect(isEncrypted("part1:part2")).toBe(false);
      expect(isEncrypted("noparts")).toBe(false);
    });

    it("should return true for strings with exactly 3 colon-separated parts", async () => {
      vi.stubEnv("TOKEN_ENCRYPTION_KEY", "");
      vi.stubEnv("NODE_ENV", "development");
      const { isEncrypted } = await importCrypto();

      expect(isEncrypted("a:b:c")).toBe(true);
    });
  });

  describe("generateEncryptionKey", () => {
    it("should generate a 64-character hex string (32 bytes)", async () => {
      vi.stubEnv("TOKEN_ENCRYPTION_KEY", "");
      vi.stubEnv("NODE_ENV", "development");
      const { generateEncryptionKey } = await importCrypto();

      const key = generateEncryptionKey();
      expect(key.length).toBe(64);
      expect(/^[0-9a-f]+$/.test(key)).toBe(true);
    });

    it("should generate unique keys", async () => {
      vi.stubEnv("TOKEN_ENCRYPTION_KEY", "");
      vi.stubEnv("NODE_ENV", "development");
      const { generateEncryptionKey } = await importCrypto();

      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();
      expect(key1).not.toBe(key2);
    });
  });
});
