import crypto from "crypto";
import { hashApiKey } from "@/shared/lib/utils/api-key-hash";

describe("hashApiKey", () => {
  describe("Basic Functionality", () => {
    it("should hash a simple API key", () => {
      const key = "test-api-key-123";
      const hash = hashApiKey(key);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should return different hashes for different keys", () => {
      const key1 = "test-api-key-1";
      const key2 = "test-api-key-2";

      const hash1 = hashApiKey(key1);
      const hash2 = hashApiKey(key2);

      expect(hash1).not.toBe(hash2);
    });

    it("should return the same hash for the same key (deterministic)", () => {
      const key = "test-api-key-123";

      const hash1 = hashApiKey(key);
      const hash2 = hashApiKey(key);

      expect(hash1).toBe(hash2);
    });

    it("should handle empty string", () => {
      const hash = hashApiKey("");
      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
    });

    it("should handle special characters", () => {
      const key = "api-key-!@#$%^&*()_+-={}[]|:;<>?,./";
      const hash = hashApiKey(key);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
    });

    it("should handle Unicode characters", () => {
      const key = "api-key-你好世界-🚀";
      const hash = hashApiKey(key);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
    });
  });

  describe("SHA-256 Algorithm", () => {
    it("should use SHA-256 hashing algorithm", () => {
      const key = "test-api-key-123";
      const hash = hashApiKey(key);

      // Manually compute SHA-256 hash
      const expectedHash = crypto
        .createHash("sha256")
        .update(key)
        .digest("base64url");

      expect(hash).toBe(expectedHash);
    });

    it("should produce 256-bit hash (43-44 chars in base64url)", () => {
      const key = "test-api-key-123";
      const hash = hashApiKey(key);

      // SHA-256 produces 256 bits = 32 bytes
      // Base64url encoding: ceil(32 * 4/3) = 43 chars (no padding)
      expect(hash.length).toBe(43);
    });
  });

  describe("Base64url Encoding", () => {
    it("should use base64url encoding (no padding)", () => {
      const key = "test-api-key-123";
      const hash = hashApiKey(key);

      // Base64url should not contain padding characters
      expect(hash).not.toContain("=");

      // Base64url should only contain URL-safe characters
      expect(hash).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it("should not contain standard base64 characters (+, /)", () => {
      // Test with multiple keys to ensure no + or / characters appear
      const keys = [
        "test-key-1",
        "test-key-2",
        "test-key-3",
        "api-key-special-chars",
        "another-test-key",
        "key-with-numbers-12345",
      ];

      keys.forEach((key) => {
        const hash = hashApiKey(key);
        expect(hash).not.toContain("+");
        expect(hash).not.toContain("/");
      });
    });

    it("should use URL-safe characters (-, _)", () => {
      // Generate many hashes to increase probability of getting - and _
      const keys = Array.from({ length: 100 }, (_, i) => `test-key-${i}`);
      const hashes = keys.map(hashApiKey);

      // At least one hash should contain - or _
      const hasUrlSafeChars = hashes.some(
        (hash) => hash.includes("-") || hash.includes("_")
      );
      expect(hasUrlSafeChars).toBe(true);
    });
  });

  describe("Better Auth Compatibility", () => {
    it("should match Better Auth defaultKeyHasher format (SHA-256 + base64url)", () => {
      const key = "admin-api-key-example";
      const hash = hashApiKey(key);

      // Better Auth's defaultKeyHasher uses:
      // 1. SHA-256 algorithm
      // 2. base64url encoding (RFC 4648 §5)
      // 3. No padding

      // Verify format matches expected Better Auth output
      const expectedHash = crypto
        .createHash("sha256")
        .update(key)
        .digest("base64url");

      expect(hash).toBe(expectedHash);
    });

    it("should be compatible with Better Auth storage format", () => {
      const key = "zk_live_abc123def456";
      const hash = hashApiKey(key);

      // Verify the hash can be stored and compared
      expect(hash).toBeDefined();
      expect(hash.length).toBe(43); // SHA-256 base64url length
      expect(hash).not.toContain("="); // No padding
    });

    it("should produce consistent hashes for typical API key formats", () => {
      const typicalKeys = [
        "zk_live_1234567890abcdef",
        "zk_test_abcdefghijklmnop",
        "sk_live_xxxxxxxxxxxxxxxx",
        "pk_test_yyyyyyyyyyyyyyyy",
      ];

      typicalKeys.forEach((key) => {
        const hash1 = hashApiKey(key);
        const hash2 = hashApiKey(key);

        expect(hash1).toBe(hash2);
        expect(hash1.length).toBe(43);
        expect(hash1).toMatch(/^[A-Za-z0-9_-]+$/);
      });
    });
  });

  describe("Security Properties", () => {
    it("should produce significantly different hashes for similar keys", () => {
      const key1 = "api-key-123456789";
      const key2 = "api-key-123456788"; // Only last digit different

      const hash1 = hashApiKey(key1);
      const hash2 = hashApiKey(key2);

      // Hashes should be completely different (avalanche effect)
      expect(hash1).not.toBe(hash2);

      // Count different characters (should be many)
      let diffCount = 0;
      for (let i = 0; i < hash1.length; i++) {
        if (hash1[i] !== hash2[i]) diffCount++;
      }
      // SHA-256's avalanche effect: changing 1 bit should change ~50% of output
      expect(diffCount).toBeGreaterThan(hash1.length * 0.4); // At least 40% different
    });

    it("should not be reversible (one-way hash)", () => {
      const key = "secret-api-key";
      const hash = hashApiKey(key);

      // The hash should not contain the original key
      expect(hash).not.toContain(key);
      expect(hash.toLowerCase()).not.toContain(key.toLowerCase());
    });
  });

  describe("Edge Cases", () => {
    it("should handle very long keys", () => {
      const longKey = "a".repeat(10000);
      const hash = hashApiKey(longKey);

      expect(hash).toBeDefined();
      expect(hash.length).toBe(43); // SHA-256 always produces same length
    });

    it("should handle keys with newlines", () => {
      const key = "api-key\nwith\nnewlines";
      const hash = hashApiKey(key);

      expect(hash).toBeDefined();
      expect(hash.length).toBe(43);
    });

    it("should handle keys with null bytes", () => {
      const key = "api-key\x00with\x00null";
      const hash = hashApiKey(key);

      expect(hash).toBeDefined();
      expect(hash.length).toBe(43);
    });
  });

  describe("Known Test Vectors", () => {
    // These test vectors verify exact output for known inputs
    it("should produce expected hash for known input 1", () => {
      const key = "test-key";
      const hash = hashApiKey(key);

      // Pre-computed hash for "test-key"
      const expected = crypto
        .createHash("sha256")
        .update("test-key")
        .digest("base64url");

      expect(hash).toBe(expected);
      expect(hash).toBe("Yq-HBHZPr46oL8Yc6cTDkItsuX1GOmNOnlh9fIhdsO8");
    });

    it("should produce expected hash for known input 2", () => {
      const key = "admin-key-123";
      const hash = hashApiKey(key);

      // Pre-computed hash for "admin-key-123"
      const expected = crypto
        .createHash("sha256")
        .update("admin-key-123")
        .digest("base64url");

      expect(hash).toBe(expected);
      expect(hash).toBe("aqOnJU_IU4zFEH9LhodDF_aLFUHKDnJRdmzydlENeOk");
    });

    it("should produce expected hash for empty string", () => {
      const key = "";
      const hash = hashApiKey(key);

      // Pre-computed hash for empty string
      const expected = crypto.createHash("sha256").update("").digest("base64url");

      expect(hash).toBe(expected);
      expect(hash).toBe("47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZG3hSuFU");
    });
  });
});
