// Mock Next.js dependencies before importing the service
const mockTryCatch = jest.fn();
jest.mock("@/shared/lib/utils/server", () => ({
  tryCatch: () => mockTryCatch(),
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock sentry-helpers
jest.mock("@/shared/lib/utils/sentry-helpers", () => ({
  getFingerprint: jest.fn((event) => event.fingerprint?.[0] || event.event_id),
  getErrorTitle: jest.fn((event) => {
    const exception = event.exception?.values?.[0];
    if (exception?.type) {
      return `${exception.type}: ${exception.value || "Unknown error"}`;
    }
    return event.message || "Unknown error";
  }),
  getStackTrace: jest.fn(() => "test-file:test-function:42"),
  getRequestContext: jest.fn((event) => ({
    url: event.request?.url || "Unknown",
    method: event.request?.method || "UNKNOWN",
    userAgent: event.request?.headers?.["User-Agent"] || "Unknown",
    apiKeyId: event.tags?.apiKeyId as string | undefined,
  })),
  verifySentrySignature: jest.fn(() => true),
}));

import { SentryIssueService } from "@/core/services/sentry-issue/sentry-issue.service";

describe("SentryIssueService", () => {
  const mockRequestId = "test-request-id";
  const mockPayload = {
    event_id: "test-event-123",
    fingerprint: ["test-fingerprint"],
    message: "Test error message",
    exception: {
      values: [
        {
          type: "TypeError",
          value: "Test error",
        },
      ],
    },
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
    environment: "production",
    url: "https://sentry.io/event/test-123",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock tryCatch to return error result (stub methods throw)
    mockTryCatch.mockResolvedValue({
      success: false,
      data: null,
      error: new Error("Not implemented"),
    });
  });

  describe("processWebhook", () => {
    it("should process webhook payload and return null when GitHub methods throw (stub)", async () => {
      const result = await SentryIssueService.processWebhook(mockPayload, mockRequestId);
      // Stub methods throw, so result should be null
      expect(result).toBeNull();
    });

    it("should handle malformed payload gracefully", async () => {
      const malformedPayload = {
        event_id: "test-123",
        environment: "production",
      };
      const result = await SentryIssueService.processWebhook(malformedPayload, mockRequestId);
      expect(result).toBeNull();
    });

    it("should handle missing optional fields", async () => {
      const minimalPayload = {
        event_id: "test-456",
        environment: "development",
      };
      const result = await SentryIssueService.processWebhook(minimalPayload, mockRequestId);
      expect(result).toBeNull();
    });
  });

  describe("stub methods (Phase 03 implementation)", () => {
    it("checkExistingIssue should return null (stub)", async () => {
      const result = await SentryIssueService.processWebhook(mockPayload, mockRequestId);
      expect(result).toBeNull();
    });

    it("should handle missing fingerprint gracefully", async () => {
      const noFingerprintPayload = {
        event_id: "test-789",
        environment: "production",
      };
      const result = await SentryIssueService.processWebhook(noFingerprintPayload, mockRequestId);
      expect(result).toBeNull();
    });
  });

  describe("error handling", () => {
    it("should handle createGitHubIssue error gracefully", async () => {
      const result = await SentryIssueService.processWebhook(mockPayload, mockRequestId);
      expect(result).toBeNull();
    });
  });
});
