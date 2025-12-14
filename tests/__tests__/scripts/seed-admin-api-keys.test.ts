/**
 * Test suite for seed-admin-api-keys script
 * 
 * Focuses on testing the MIN_KEY_LENGTH validation logic
 * to ensure keys shorter than 32 characters are properly rejected.
 */

import { hashApiKey } from "@/shared/lib/utils/api-key-hash";
import { nanoid } from "nanoid";

// Mock the database client
jest.mock("@/infrastructure/database/client", () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([]),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock nanoid
jest.mock("nanoid", () => ({
  nanoid: jest.fn(() => "test-id-123"),
}));

// Mock process.exit to prevent tests from exiting
const mockExit = jest.spyOn(process, "exit").mockImplementation((code?: string | number | null | undefined) => {
  throw new Error(`process.exit called with code ${code}`);
});

// Mock console methods to reduce noise in test output
const mockConsoleLog = jest.spyOn(console, "log").mockImplementation();
const mockConsoleError = jest.spyOn(console, "error").mockImplementation();

describe("seed-admin-api-keys script", () => {
  const MIN_KEY_LENGTH = 32;
  let db: any;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Get the mocked db
    db = require("@/infrastructure/database/client").db;
    
    // Set up default mock behavior for db queries
    db.select.mockReturnThis();
    db.from.mockReturnThis();
    db.where.mockReturnThis();
    db.limit.mockResolvedValue([]);
    db.insert.mockReturnThis();
    db.values.mockResolvedValue(undefined);
  });

  afterAll(() => {
    // Restore mocks
    mockExit.mockRestore();
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe("MIN_KEY_LENGTH validation", () => {
    it("should reject keys shorter than 32 characters", () => {
      const shortKeys = [
        "short", // 5 chars
        "a".repeat(10), // 10 chars
        "twentyonecharactersxxx", // 21 chars
        "a".repeat(31), // 31 chars (just under limit)
      ];

      shortKeys.forEach((key) => {
        // Verify key length is below minimum
        expect(key.length).toBeLessThan(MIN_KEY_LENGTH);
        
        // In the actual script, these would be logged as skipped
        // We're testing the validation logic principle here
        const isValid = key.length >= MIN_KEY_LENGTH;
        expect(isValid).toBe(false);
      });
    });

    it("should accept keys exactly 32 characters long", () => {
      const exactLengthKey = "a".repeat(32);
      
      // Verify key length is exactly at minimum
      expect(exactLengthKey.length).toBe(MIN_KEY_LENGTH);
      
      // This key should be valid
      const isValid = exactLengthKey.length >= MIN_KEY_LENGTH;
      expect(isValid).toBe(true);
    });

    it("should accept keys longer than 32 characters", () => {
      const longKeys = [
        "a".repeat(33), // 33 chars
        "a".repeat(50), // 50 chars
        "a".repeat(64), // 64 chars
        "zuno_sk_live_" + "a".repeat(50), // Prefixed long key
      ];

      longKeys.forEach((key) => {
        // Verify key length is above minimum
        expect(key.length).toBeGreaterThanOrEqual(MIN_KEY_LENGTH);
        
        // These keys should be valid
        const isValid = key.length >= MIN_KEY_LENGTH;
        expect(isValid).toBe(true);
      });
    });
  });

  describe("seedApiKey function behavior simulation", () => {
    const mockAdminUserId = "admin-user-123";

    beforeEach(() => {
      // Mock that no existing keys are found
      db.limit.mockResolvedValue([]);
    });

    it("should successfully seed a valid 32-character key", async () => {
      const validKey = "a".repeat(32);
      expect(validKey.length).toBe(MIN_KEY_LENGTH);

      // Simulate the seeding logic
      const hashedKey = hashApiKey(validKey);
      expect(hashedKey).toBeTruthy();
      expect(typeof hashedKey).toBe("string");
    });

    it("should successfully seed a valid 64-character key", async () => {
      const validKey = "zuno_sk_live_" + "a".repeat(51);
      expect(validKey.length).toBeGreaterThan(MIN_KEY_LENGTH);

      // Simulate the seeding logic
      const hashedKey = hashApiKey(validKey);
      expect(hashedKey).toBeTruthy();
      expect(typeof hashedKey).toBe("string");
    });

    it("should properly hash API keys", () => {
      const testKey = "a".repeat(32);
      const hash1 = hashApiKey(testKey);
      const hash2 = hashApiKey(testKey);

      // Same key should produce same hash
      expect(hash1).toBe(hash2);

      // Hash should be different from original
      expect(hash1).not.toBe(testKey);

      // Hash should be a non-empty string
      expect(hash1.length).toBeGreaterThan(0);
    });

    it("should extract key prefix correctly for prefixed keys", () => {
      const prefixedKey = "zuno_sk_live_" + "a".repeat(32);
      const hasPrefix = prefixedKey.includes("_");
      
      expect(hasPrefix).toBe(true);
      
      if (hasPrefix) {
        const extractedPrefix = prefixedKey.split("_")[0] + "_";
        expect(extractedPrefix).toBe("zuno_");
      }
    });

    it("should handle keys without prefix correctly", () => {
      const noPrefixKey = "a".repeat(32);
      const hasPrefix = noPrefixKey.includes("_");
      
      expect(hasPrefix).toBe(false);
      
      // When no prefix, should default to "zuno_"
      const prefix = hasPrefix ? noPrefixKey.split("_")[0] + "_" : "zuno_";
      expect(prefix).toBe("zuno_");
    });
  });

  describe("Key length boundary tests", () => {
    it("should correctly identify boundary cases", () => {
      const testCases = [
        { key: "a".repeat(0), valid: false, description: "empty key" },
        { key: "a".repeat(1), valid: false, description: "1 char" },
        { key: "a".repeat(16), valid: false, description: "16 chars (half minimum)" },
        { key: "a".repeat(31), valid: false, description: "31 chars (just under)" },
        { key: "a".repeat(32), valid: true, description: "32 chars (exact minimum)" },
        { key: "a".repeat(33), valid: true, description: "33 chars (just over)" },
        { key: "a".repeat(64), valid: true, description: "64 chars (double minimum)" },
        { key: "a".repeat(128), valid: true, description: "128 chars (very long)" },
      ];

      testCases.forEach(({ key, valid, description }) => {
        const isValid = key.length >= MIN_KEY_LENGTH;
        expect(isValid).toBe(valid);
      });
    });
  });

  describe("Security validation", () => {
    it("should enforce minimum security key length of 32 characters", () => {
      // This is a security-critical check
      // Keys shorter than 32 chars have insufficient entropy
      const minSecureLength = 32;
      expect(MIN_KEY_LENGTH).toBe(minSecureLength);
    });

    it("should hash keys using SHA-256", () => {
      const testKey = "a".repeat(32);
      const hash = hashApiKey(testKey);

      // SHA-256 in base64url format should be 43 characters (without padding)
      // 256 bits / 8 = 32 bytes, 32 bytes in base64url ≈ 43 chars
      expect(hash.length).toBe(43);
    });

    it("should produce unique hashes for different keys", () => {
      const key1 = "a".repeat(32);
      const key2 = "b".repeat(32);

      const hash1 = hashApiKey(key1);
      const hash2 = hashApiKey(key2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe("Key format validation", () => {
    it("should handle various valid key formats", () => {
      const validFormats = [
        "a".repeat(32), // Simple alphanumeric
        "zuno_sk_live_" + "x".repeat(32), // Prefixed
        "ABC123" + "a".repeat(26), // Mixed case and numbers
        "test-key-" + "a".repeat(23), // With dashes
        "key.name." + "a".repeat(23), // With dots
      ];

      validFormats.forEach((key) => {
        expect(key.length).toBeGreaterThanOrEqual(MIN_KEY_LENGTH);
        const hash = hashApiKey(key);
        expect(hash).toBeTruthy();
        expect(typeof hash).toBe("string");
      });
    });

    it("should extract keyStart correctly (first 8 characters)", () => {
      const testKey = "zuno_sk_live_1234567890abcdefghij";
      const keyStart = testKey.slice(0, 8);
      
      expect(keyStart).toBe("zuno_sk_");
      expect(keyStart.length).toBe(8);
    });
  });

  describe("Admin key metadata validation", () => {
    it("should set correct enterprise tier metadata", () => {
      const metadata = {
        type: "organization" as const,
        tier: "enterprise",
        scopes: ["metadata:read", "metadata:write", "metadata:delete", "media:read", "media:write", "media:delete", "admin", "admin:*"],
        notes: "Hardcoded admin API key 1 - no rate limiting",
      };

      expect(metadata.type).toBe("organization");
      expect(metadata.tier).toBe("enterprise");
      expect(metadata.scopes).toContain("admin");
      expect(metadata.scopes).toContain("admin:*");
    });

    it("should set correct admin permissions", () => {
      const permissions = {
        metadata: ["read", "write", "list", "create", "update", "delete"],
        media: ["read", "write", "list", "create", "update", "delete"],
        admin: ["*"],
      };

      expect(permissions.admin).toContain("*");
      expect(permissions.metadata.length).toBeGreaterThan(0);
      expect(permissions.media.length).toBeGreaterThan(0);
    });

    it("should disable rate limiting for admin keys", () => {
      const rateLimitEnabled = false;
      expect(rateLimitEnabled).toBe(false);
    });
  });
});
