# Phase 02: Webhook Handler

**Status**: DONE | **Effort**: 2h | **Priority**: P1
**Review Date**: 2025-12-26
**Review Report**: `plans/reports/code-reviewer-251226-2310-sentry-phase02-webhook-handler.md`
**Completed**: 2025-12-26T23:18:00Z
**Tests**: 29/29 passed | Code reviewed | User approved

## Overview

Create API endpoint to receive Sentry alerts and trigger GitHub issue creation.

## Related Files

- Phase 01: `phase-01-sentry-sdk-setup.md`
- Sentry webhooks docs: https://docs.sentry.io/product/integrations/webhooks/

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| `/api/sentry/webhook` endpoint | Follows existing API route pattern |
| Signature verification | Security requirement, prevents spoofing |
| Async processing | Don't block Sentry webhook response |

## Requirements

### Functional
- Receive Sentry alert webhooks
- Verify webhook signature
- Extract error context
- Trigger issue creation service
- Return 200 quickly (async processing)

### Non-Functional
- Security: Signature verification required
- Performance: <100ms response time
- Reliability: Idempotent operations

## Architecture

```
Sentry Alert → POST /api/sentry/webhook
  ↓
Verify Signature
  ↓
Extract Error Data
  ↓
Enqueue Background Job (or direct call)
  ↓
GitHub Issue Service → Create Issue
```

## File Changes

### New Files

| File | Purpose |
|------|---------|
| `src/app/api/sentry/webhook/route.ts` | Webhook endpoint |
| `src/core/services/sentry-issue/sentry-issue.entity.ts` | Issue entity |
| `src/core/services/sentry-issue/sentry-issue.service.ts` | Business logic |
| `src/shared/lib/utils/sentry-helpers.ts` | Utility functions |

### Modified Files

| File | Changes |
|------|---------|
| `src/shared/config/env.ts` | Add webhook secret validation |

## Implementation Steps

### 1. Create Sentry Helpers

**File: `src/shared/lib/utils/sentry-helpers.ts`**
```typescript
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
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
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
interface SentryEvent {
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

interface RequestContext {
  url: string;
  method: string;
  userAgent: string;
  apiKeyId?: string;
}
```

### 2. Create Issue Entity

**File: `src/core/services/sentry-issue/sentry-issue.entity.ts`**
```typescript
/**
 * Sentry Issue Entity
 *
 * Represents a GitHub issue created from a Sentry error
 */

export interface SentryIssue {
  fingerprint: string;
  eventId: string;
  title: string;
  message: string;
  stackTrace: string;
  requestContext: {
    url: string;
    method: string;
    userAgent: string;
    apiKeyId?: string;
  };
  tags: Record<string, unknown>;
  environment: string;
  sentryUrl: string;
}

export interface CreatedIssue {
  issueNumber: number;
  issueUrl: string;
  fingerprint: string;
}
```

### 3. Create Webhook Route

**File: `src/app/api/sentry/webhook/route.ts`**
```typescript
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/shared/lib/utils/logger";
import { tryCatch } from "@/shared/lib/utils/server";
import { env } from "@/shared/config/env";
import {
  verifySentrySignature,
  getFingerprint,
  getErrorTitle,
  getStackTrace,
  getRequestContext,
} from "@/shared/lib/utils/sentry-helpers";
import { SentryIssueService } from "@/core/services/sentry-issue/sentry-issue.service";

/**
 * Sentry Webhook Handler
 *
 * Receives alerts from Sentry and creates GitHub issues
 *
 * POST /api/sentry/webhook
 *
 * Expected payload: Sentry alert webhook
 * https://docs.sentry.com/product/integrations/webhooks/
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  return tryCatch(
    async () => {
      // 1. Extract signature
      const signature = request.headers.get("sentry-hook-signature");
      if (!signature) {
        logger.warn("Missing Sentry signature", { requestId });
        return new NextResponse("Missing signature", { status: 401 });
      }

      // 2. Read raw payload for signature verification
      const rawPayload = await request.text();

      // 3. Verify signature
      if (!env.SENTRY_WEBHOOK_SECRET) {
        logger.error("SENTRY_WEBHOOK_SECRET not configured");
        return new NextResponse("Webhook not configured", { status: 500 });
      }

      const isValid = verifySentrySignature(
        rawPayload,
        signature,
        env.SENTRY_WEBHOOK_SECRET
      );

      if (!isValid) {
        logger.warn("Invalid Sentry signature", { requestId });
        return new NextResponse("Invalid signature", { status: 401 });
      }

      // 4. Parse payload
      const payload = JSON.parse(rawPayload) as SentryWebhookPayload;

      logger.info("Received Sentry webhook", {
        requestId,
        eventId: payload.event_id,
        environment: payload.environment,
      });

      // 5. Process webhook asynchronously
      // Don't await - return 200 immediately
      SentryIssueService.processWebhook(payload, requestId).catch((error) => {
        logger.error("Failed to process Sentry webhook", {
          requestId,
          error: error instanceof Error ? error.message : String(error),
        });
      });

      return new NextResponse("OK", { status: 200 });
    },
    {
      errorMessage: "Sentry webhook handler failed",
      shouldLog: true,
    }
  );
}

// Type definitions
interface SentryWebhookPayload {
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
```

### 4. Create Issue Service (Stub)

**File: `src/core/services/sentry-issue/sentry-issue.service.ts`**
```typescript
import { logger } from "@/shared/lib/utils/logger";
import { tryCatch } from "@/shared/lib/utils/server";
import type { SentryIssue, CreatedIssue } from "./sentry-issue.entity";
import {
  getFingerprint,
  getErrorTitle,
  getStackTrace,
  getRequestContext,
} from "@/shared/lib/utils/sentry-helpers";

/**
 * Sentry Issue Service
 *
 * Business logic for creating GitHub issues from Sentry errors
 */

export class SentryIssueService {
  /**
   * Process Sentry webhook and create GitHub issue
   *
   * This method is called asynchronously from the webhook handler
   */
  static async processWebhook(
    payload: SentryWebhookPayload,
    requestId: string
  ): Promise<CreatedIssue | null> {
    return tryCatch(
      async () => {
        // 1. Extract error data
        const issue: SentryIssue = {
          fingerprint: getFingerprint(payload),
          eventId: payload.event_id,
          title: getErrorTitle(payload),
          message: payload.message || "No message",
          stackTrace: getStackTrace(payload),
          requestContext: getRequestContext(payload),
          tags: payload.tags || {},
          environment: payload.environment,
          sentryUrl: payload.url || "",
        };

        // 2. Check for existing issue (deduplication)
        const existingIssue = await this.checkExistingIssue(issue.fingerprint);
        if (existingIssue) {
          logger.info("Issue already exists, skipping creation", {
            requestId,
            fingerprint: issue.fingerprint,
            issueNumber: existingIssue.issueNumber,
          });
          return existingIssue;
        }

        // 3. Create GitHub issue
        const createdIssue = await this.createGitHubIssue(issue);

        // 4. Store fingerprint for deduplication
        await this.storeFingerprint(issue.fingerprint, createdIssue);

        logger.info("Created GitHub issue from Sentry error", {
          requestId,
          issueNumber: createdIssue.issueNumber,
          fingerprint: issue.fingerprint,
        });

        return createdIssue;
      },
      {
        errorMessage: "Failed to process Sentry webhook",
        context: { requestId, eventId: payload.event_id },
        shouldLog: true,
      }
    );
  }

  /**
   * Check if issue already exists for this fingerprint
   */
  private static async checkExistingIssue(
    fingerprint: string
  ): Promise<CreatedIssue | null> {
    // TODO: Implement in Phase 03 (GitHub Integration)
    return null;
  }

  /**
   * Create GitHub issue
   */
  private static async createGitHubIssue(
    issue: SentryIssue
  ): Promise<CreatedIssue> {
    // TODO: Implement in Phase 03 (GitHub Integration)
    throw new Error("Not implemented");
  }

  /**
   * Store fingerprint for deduplication
   */
  private static async storeFingerprint(
    fingerprint: string,
    createdIssue: CreatedIssue
  ): Promise<void> {
    // TODO: Implement in Phase 03 (GitHub Integration)
  }
}

// Type re-export
type SentryWebhookPayload = import("@/shared/lib/utils/sentry-helpers").SentryEvent & {
  environment: string;
  url?: string;
};
```

## Todo List

- [x] Create `src/shared/lib/utils/sentry-helpers.ts`
- [x] Create `src/core/services/sentry-issue/sentry-issue.entity.ts`
- [x] Create `src/app/api/sentry/webhook/route.ts`
- [x] Create `src/core/services/sentry-issue/sentry-issue.service.ts`
- [x] Update `src/shared/config/env.ts` with webhook secret
- [x] Test webhook signature verification

## Success Criteria

- ✅ Webhook endpoint responds 200
- ✅ Signature verification works
- ✅ Invalid signatures rejected with 401
- ✅ Valid signatures accepted and logged

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Webhook spoofing | Signature verification required |
| Missing secret config | Return 500, log error |
| Payload too large | Stream processing, size check |
| Duplicate issues | Deduplication in Phase 03 |

## Security Considerations

- **Signature verification**: Required to prevent fake webhooks
- **Timing-safe comparison**: Use `crypto.timingSafeEqual`
- **Async processing**: Don't block on GitHub API calls

## Next Steps

→ Phase 03: Implement GitHub integration and deduplication
