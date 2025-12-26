import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { env } from "@/shared/config/env";

/**
 * Test Endpoint for Sentry Integration
 *
 * This endpoint captures a test error to Sentry for testing the alert flow.
 * Should be removed after testing is complete.
 *
 * GET /api/test/sentry-error
 *
 * IMPORTANT: Remove this endpoint after testing!
 */

export async function GET(): Promise<NextResponse> {
  // Only allow in development or with test mode
  if (env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Test endpoint not available in production" },
      { status: 403 }
    );
  }

  // Capture test error to Sentry
  const testError = new Error("Test Sentry integration - Phase 04");
  testError.name = "SentryTestError";

  Sentry.captureException(testError, {
    tags: {
      test: "true",
      phase: "04",
    },
    extra: {
      description: "Test error for validating Sentry alert configuration",
      timestamp: new Date().toISOString(),
    },
  });

  return NextResponse.json({
    success: true,
    message: "Test error captured to Sentry",
    details: {
      environment: env.NODE_ENV,
      sentryEnabled: Boolean(env.NEXT_PUBLIC_SENTRY_DSN),
      sentryProject: env.SENTRY_PROJECT,
      instructions: [
        "1. Check Sentry dashboard for the test error",
        "2. Verify alert fired",
        "3. Verify webhook was called (check logs)",
        "4. Remove this endpoint after testing",
      ],
    },
  });
}
