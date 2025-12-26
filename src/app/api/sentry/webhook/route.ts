import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/shared/lib/utils/logger";
import { env } from "@/shared/config/env";
import {
  verifySentrySignature,
  type SentryWebhookPayload,
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
export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID();

  try {
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
  } catch (error) {
    logger.error("Sentry webhook handler failed", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    return new NextResponse("Internal server error", { status: 500 });
  }
}
