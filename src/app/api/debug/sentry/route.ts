import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

/**
 * GET /api/debug/sentry - Test Sentry integration
 *
 * This endpoint sends a test error to Sentry to verify the integration is working.
 * Access this endpoint in your browser or with curl:
 *
 *   curl http://localhost:3000/api/debug/sentry
 *
 * Then check your Sentry dashboard for the error: "Sentry test - please ignore"
 */
export async function GET() {
  // Capture test exception
  Sentry.captureException(new Error("Sentry test - please ignore"), {
    level: "info",
    tags: {
      test: "sentry-integration",
      project: "zuno-marketplace-metadata",
    },
    extra: {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      message: "This is a test error to verify Sentry integration. You can safely delete this issue.",
    },
  });

  // Add breadcrumb
  Sentry.addBreadcrumb({
    category: "test",
    message: "Sentry test endpoint called",
    level: "info",
  });

  return NextResponse.json({
    success: true,
    message: "Test error sent to Sentry",
    instruction: "Check your Sentry dashboard for the error: 'Sentry test - please ignore'",
    details: {
      environment: process.env.NODE_ENV,
      sentryEnabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * POST /api/debug/sentry - Test Sentry with custom error
 *
 * Send a POST request with a JSON body to test with custom error message:
 *
 *   curl -X POST http://localhost:3000/api/debug/sentry \
 *     -H "Content-Type: application/json" \
 *     -d '{"message": "My custom test error"}'
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message = "Custom Sentry test error" } = body;

    Sentry.captureException(new Error(message), {
      level: "error",
      tags: {
        test: "sentry-integration",
        project: "zuno-marketplace-metadata",
        custom: "true",
      },
      extra: {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        requestBody: body,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Custom error sent to Sentry",
      details: {
        errorMessage: message,
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to parse request body",
        details: {
          hint: "Send JSON body: {\"message\": \"your error message\"}",
        },
      },
      { status: 400 }
    );
  }
}
