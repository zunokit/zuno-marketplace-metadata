import {
  verifySentrySignature,
  getFingerprint,
  getErrorTitle,
  getStackTrace,
  getRequestContext,
  type SentryEvent,
} from "@/shared/lib/utils/sentry-helpers";
import crypto from "crypto";

describe("sentry-helpers", () => {
  describe("verifySentrySignature", () => {
    const secret = "test-webhook-secret";

    it("should return true for valid signature", () => {
      const payload = JSON.stringify({ event_id: "test-123" });
      const hmac = crypto.createHmac("sha256", secret);
      hmac.update(payload);
      const signature = hmac.digest("base64");

      const result = verifySentrySignature(payload, signature, secret);
      expect(result).toBe(true);
    });

    it("should return false for invalid signature", () => {
      const payload = JSON.stringify({ event_id: "test-123" });
      const invalidSignature = "invalid-signature-base64";

      const result = verifySentrySignature(payload, invalidSignature, secret);
      expect(result).toBe(false);
    });

    it("should return false for signature with different payload", () => {
      const payload1 = JSON.stringify({ event_id: "test-123" });
      const payload2 = JSON.stringify({ event_id: "test-456" });
      const hmac = crypto.createHmac("sha256", secret);
      hmac.update(payload1);
      const signature = hmac.digest("base64");

      const result = verifySentrySignature(payload2, signature, secret);
      expect(result).toBe(false);
    });

    it("should return false for signature with different secret", () => {
      const payload = JSON.stringify({ event_id: "test-123" });
      const hmac = crypto.createHmac("sha256", secret);
      hmac.update(payload);
      const signature = hmac.digest("base64");
      const wrongSecret = "wrong-secret";

      const result = verifySentrySignature(payload, signature, wrongSecret);
      expect(result).toBe(false);
    });

    it("should use timing-safe comparison", () => {
      const payload = "test-payload";
      const hmac = crypto.createHmac("sha256", secret);
      hmac.update(payload);
      const validSignature = hmac.digest("base64");

      // Both should return false but take similar time
      const result1 = verifySentrySignature(payload, "wrong1", secret);
      const result2 = verifySentrySignature(payload, "wrong2", secret);
      const result3 = verifySentrySignature(payload, validSignature, secret);

      expect(result1).toBe(false);
      expect(result2).toBe(false);
      expect(result3).toBe(true);
    });
  });

  describe("getFingerprint", () => {
    it("should return first fingerprint if available", () => {
      const event: SentryEvent = {
        event_id: "test-123",
        fingerprint: ["fp1", "fp2"],
      };
      expect(getFingerprint(event)).toBe("fp1");
    });

    it("should return event_id if no fingerprint", () => {
      const event: SentryEvent = {
        event_id: "test-123",
      };
      expect(getFingerprint(event)).toBe("test-123");
    });

    it("should return empty string if no fingerprint or event_id", () => {
      const event: SentryEvent = {
        event_id: "",
      };
      expect(getFingerprint(event)).toBe("");
    });

    it("should handle empty fingerprint array", () => {
      const event: SentryEvent = {
        event_id: "test-123",
        fingerprint: [],
      };
      expect(getFingerprint(event)).toBe("test-123");
    });
  });

  describe("getErrorTitle", () => {
    it("should return type:value format for exception", () => {
      const event: SentryEvent = {
        event_id: "test-123",
        exception: {
          values: [
            {
              type: "TypeError",
              value: "Cannot read property of undefined",
            },
          ],
        },
      };
      expect(getErrorTitle(event)).toBe("TypeError: Cannot read property of undefined");
    });

    it("should return 'Unknown error' when exception type is missing value", () => {
      const event: SentryEvent = {
        event_id: "test-123",
        exception: {
          values: [
            {
              type: "Error",
            },
          ],
        },
      };
      expect(getErrorTitle(event)).toBe("Error: Unknown error");
    });

    it("should return message if no exception", () => {
      const event: SentryEvent = {
        event_id: "test-123",
        message: "Something went wrong",
      };
      expect(getErrorTitle(event)).toBe("Something went wrong");
    });

    it("should return 'Unknown error' if no exception or message", () => {
      const event: SentryEvent = {
        event_id: "test-123",
      };
      expect(getErrorTitle(event)).toBe("Unknown error");
    });

    it("should handle empty exception values array", () => {
      const event: SentryEvent = {
        event_id: "test-123",
        exception: {
          values: [],
        },
        message: "fallback message",
      };
      expect(getErrorTitle(event)).toBe("fallback message");
    });
  });

  describe("getStackTrace", () => {
    it("should return formatted stack trace from frame", () => {
      const event: SentryEvent = {
        event_id: "test-123",
        exception: {
          values: [
            {
              type: "Error",
              stacktrace: {
                frames: [
                  {
                    module: "src/app/api/route",
                    function: "handler",
                    lineno: 42,
                  },
                ],
              },
            },
          ],
        },
      };
      expect(getStackTrace(event)).toBe("src/app/api/route:handler:42");
    });

    it("should return 'unknown' for missing module/function", () => {
      const event: SentryEvent = {
        event_id: "test-123",
        exception: {
          values: [
            {
              type: "Error",
              stacktrace: {
                frames: [
                  {
                    lineno: 42,
                  },
                ],
              },
            },
          ],
        },
      };
      expect(getStackTrace(event)).toBe("unknown:unknown:42");
    });

    it("should return 'No stack trace available' if no frames", () => {
      const event: SentryEvent = {
        event_id: "test-123",
        exception: {
          values: [
            {
              type: "Error",
              stacktrace: {},
            },
          ],
        },
      };
      expect(getStackTrace(event)).toBe("No stack trace available");
    });

    it("should return 'No stack trace available' if no exception", () => {
      const event: SentryEvent = {
        event_id: "test-123",
      };
      expect(getStackTrace(event)).toBe("No stack trace available");
    });
  });

  describe("getRequestContext", () => {
    it("should extract full request context", () => {
      const event: SentryEvent = {
        event_id: "test-123",
        request: {
          url: "https://example.com/api/test",
          method: "POST",
          headers: {
            "User-Agent": "TestAgent/1.0",
          },
        },
        tags: {
          apiKeyId: "key_123",
        },
      };
      const result = getRequestContext(event);
      expect(result).toEqual({
        url: "https://example.com/api/test",
        method: "POST",
        userAgent: "TestAgent/1.0",
        apiKeyId: "key_123",
      });
    });

    it("should use defaults for missing request data", () => {
      const event: SentryEvent = {
        event_id: "test-123",
      };
      const result = getRequestContext(event);
      expect(result).toEqual({
        url: "Unknown",
        method: "UNKNOWN",
        userAgent: "Unknown",
        apiKeyId: undefined,
      });
    });

    it("should handle missing headers", () => {
      const event: SentryEvent = {
        event_id: "test-123",
        request: {
          url: "https://example.com/api/test",
          method: "GET",
        },
      };
      const result = getRequestContext(event);
      expect(result.userAgent).toBe("Unknown");
    });

    it("should handle missing User-Agent header", () => {
      const event: SentryEvent = {
        event_id: "test-123",
        request: {
          url: "https://example.com/api/test",
          method: "POST",
          headers: {},
        },
      };
      const result = getRequestContext(event);
      expect(result.userAgent).toBe("Unknown");
    });

    it("should return undefined for apiKeyId when not in tags", () => {
      const event: SentryEvent = {
        event_id: "test-123",
        request: {
          url: "https://example.com/api/test",
          method: "GET",
        },
        tags: {
          otherTag: "value",
        },
      };
      const result = getRequestContext(event);
      expect(result.apiKeyId).toBeUndefined();
    });
  });
});
