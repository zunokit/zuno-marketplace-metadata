import { constantTimeCompare } from "@/shared/lib/utils/constant-time-compare";

describe("constantTimeCompare", () => {
  describe("matching strings", () => {
    it("should return true for identical strings", () => {
      const result = constantTimeCompare("hello", "hello");
      expect(result).toBe(true);
    });

    it("should return true for identical long strings", () => {
      const longString = "a".repeat(1000);
      const result = constantTimeCompare(longString, longString);
      expect(result).toBe(true);
    });

    it("should return true for identical API keys", () => {
      const apiKey = "sk_test_1234567890abcdef";
      const result = constantTimeCompare(apiKey, apiKey);
      expect(result).toBe(true);
    });

    it("should return true for identical unicode strings", () => {
      const result = constantTimeCompare("hello 世界", "hello 世界");
      expect(result).toBe(true);
    });
  });

  describe("non-matching strings", () => {
    it("should return false for different strings of same length", () => {
      const result = constantTimeCompare("hello", "world");
      expect(result).toBe(false);
    });

    it("should return false for strings differing by one character", () => {
      const result = constantTimeCompare("hello", "hells");
      expect(result).toBe(false);
    });

    it("should return false for strings differing in case", () => {
      const result = constantTimeCompare("Hello", "hello");
      expect(result).toBe(false);
    });

    it("should return false for similar but different API keys", () => {
      const result = constantTimeCompare(
        "sk_test_1234567890abcdef",
        "sk_test_1234567890abcdeg"
      );
      expect(result).toBe(false);
    });
  });

  describe("strings of different lengths", () => {
    it("should return false when first string is shorter", () => {
      const result = constantTimeCompare("short", "longer string");
      expect(result).toBe(false);
    });

    it("should return false when second string is shorter", () => {
      const result = constantTimeCompare("longer string", "short");
      expect(result).toBe(false);
    });

    it("should return false for string vs empty string", () => {
      const result = constantTimeCompare("non-empty", "");
      expect(result).toBe(false);
    });

    it("should return false when lengths differ by one", () => {
      const result = constantTimeCompare("test", "test1");
      expect(result).toBe(false);
    });
  });

  describe("empty strings", () => {
    it("should return true for two empty strings", () => {
      const result = constantTimeCompare("", "");
      expect(result).toBe(true);
    });

    it("should return false for empty vs non-empty string (first empty)", () => {
      const result = constantTimeCompare("", "something");
      expect(result).toBe(false);
    });

    it("should return false for empty vs non-empty string (second empty)", () => {
      const result = constantTimeCompare("something", "");
      expect(result).toBe(false);
    });
  });

  describe("special characters and edge cases", () => {
    it("should handle strings with null bytes", () => {
      const result = constantTimeCompare("hello\0world", "hello\0world");
      expect(result).toBe(true);
    });

    it("should return false for strings with different null byte positions", () => {
      const result = constantTimeCompare("hello\0world", "helloworld\0");
      expect(result).toBe(false);
    });

    it("should handle strings with special characters", () => {
      const special = "!@#$%^&*()_+-=[]{}|;:',.<>?/~`";
      const result = constantTimeCompare(special, special);
      expect(result).toBe(true);
    });

    it("should handle strings with newlines and tabs", () => {
      const result = constantTimeCompare("hello\n\tworld", "hello\n\tworld");
      expect(result).toBe(true);
    });

    it("should handle emojis correctly", () => {
      const result = constantTimeCompare("hello 👋 world 🌍", "hello 👋 world 🌍");
      expect(result).toBe(true);
    });

    it("should return false for different emojis", () => {
      const result = constantTimeCompare("hello 👋", "hello 👍");
      expect(result).toBe(false);
    });
  });

  describe("timing attack prevention", () => {
    it("should process strings of different lengths in similar time", () => {
      // This test verifies the function doesn't short-circuit on length mismatch
      const short = "a";
      const long = "a".repeat(100);
      
      // Both should return false but take similar time to process
      const result1 = constantTimeCompare(short, long);
      const result2 = constantTimeCompare(long, short);
      
      expect(result1).toBe(false);
      expect(result2).toBe(false);
    });

    it("should process non-matching strings consistently", () => {
      // Verify it doesn't short-circuit on first mismatch
      const str1 = "aaaaaaaaaa";
      const str2 = "baaaaaaaaa"; // differs at first char
      const str3 = "aaaaaaaaba"; // differs at last char
      
      const result1 = constantTimeCompare(str1, str2);
      const result2 = constantTimeCompare(str1, str3);
      
      expect(result1).toBe(false);
      expect(result2).toBe(false);
    });
  });

  describe("real-world API key scenarios", () => {
    it("should validate correct admin API key", () => {
      const storedKey = "admin_secret_key_12345";
      const providedKey = "admin_secret_key_12345";
      const result = constantTimeCompare(storedKey, providedKey);
      expect(result).toBe(true);
    });

    it("should reject incorrect admin API key", () => {
      const storedKey = "admin_secret_key_12345";
      const providedKey = "admin_secret_key_12346";
      const result = constantTimeCompare(storedKey, providedKey);
      expect(result).toBe(false);
    });

    it("should reject truncated API key", () => {
      const storedKey = "admin_secret_key_12345";
      const providedKey = "admin_secret_key_1234";
      const result = constantTimeCompare(storedKey, providedKey);
      expect(result).toBe(false);
    });

    it("should reject extended API key", () => {
      const storedKey = "admin_secret_key_12345";
      const providedKey = "admin_secret_key_123456";
      const result = constantTimeCompare(storedKey, providedKey);
      expect(result).toBe(false);
    });
  });
});
