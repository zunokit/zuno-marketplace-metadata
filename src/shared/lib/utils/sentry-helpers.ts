import crypto from "crypto";

/**
 * Verify Sentry webhook signature
 *
 * Sentry signs webhook payloads with a secret
 * Documentation: https://docs.sentry.com/product/integrations/webhooks/
 */
export function verifySentrySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payload);
  const digest = hmac.digest("base64");
  const signatureBuffer = Buffer.from(signature);
  const digestBuffer = Buffer.from(digest);

  // timingSafeEqual throws if buffers have different lengths
  if (signatureBuffer.length !== digestBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(signatureBuffer, digestBuffer);
}

/**
 * Extract fingerprint from Sentry event
 */
export function getFingerprint(event: SentryEvent): string {
  return event.fingerprint?.[0] || event.event_id || "";
}

/**
 * Extract error title
 */
export function getErrorTitle(event: SentryEvent): string {
  const exception = event.exception?.values?.[0];
  if (exception?.type) {
    return `${exception.type}: ${exception.value || "Unknown error"}`;
  }
  return event.message || "Unknown error";
}

/**
 * Extract stack trace
 */
export function getStackTrace(event: SentryEvent): string {
  const exception = event.exception?.values?.[0];
  const frame = exception?.stacktrace?.frames?.[0];

  if (!frame) return "No stack trace available";

  return `${frame.module || "unknown"}:${frame.function || "unknown"}:${frame.lineno || 0}`;
}

/**
 * Extract request context
 */
export function getRequestContext(event: SentryEvent): RequestContext {
  const request = event.request;
  return {
    url: request?.url || "Unknown",
    method: request?.method || "UNKNOWN",
    userAgent: request?.headers?.["User-Agent"] || "Unknown",
    apiKeyId: event.tags?.apiKeyId as string | undefined,
  };
}

// Type definitions
export interface SentryEvent {
  event_id: string;
  fingerprint?: string[];
  message?: string;
  exception?: {
    values?: Array<{
      type?: string;
      value?: string;
      stacktrace?: {
        frames?: Array<{
          module?: string;
          function?: string;
          lineno?: number;
          colno?: number;
        }>;
      };
    }>;
  };
  request?: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
  };
  tags?: Record<string, unknown>;
}

export interface RequestContext {
  url: string;
  method: string;
  userAgent: string;
  apiKeyId?: string;
}

/**
 * Sentry Webhook Payload
 * Expected structure from Sentry alert webhooks
 * https://docs.sentry.com/product/integrations/webhooks/
 */
export interface SentryWebhookPayload {
  event_id: string;
  fingerprint?: string[];
  message?: string;
  exception?: {
    values?: Array<{
      type?: string;
      value?: string;
      stacktrace?: {
        frames?: Array<{
          module?: string;
          function?: string;
          lineno?: number;
          colno?: number;
        }>;
      };
    }>;
  };
  request?: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
  };
  tags?: Record<string, unknown>;
  environment: string;
  url?: string; // Sentry event URL
}
