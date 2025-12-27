/**
 * Test Sentry Integration
 *
 * Run: npx tsx scripts/test-sentry-integration.ts
 *
 * Tests Sentry error capture, message capture, and performance tracing.
 * Run this script after configuring Sentry environment variables.
 */

import * as Sentry from "@sentry/nextjs";
import { env } from "../src/shared/config/env";

async function testSentryIntegration() {
  console.log("🧪 Testing Sentry Integration...\n");

  // Check if Sentry is configured
  if (!env.NEXT_PUBLIC_SENTRY_DSN) {
    console.error("❌ NEXT_PUBLIC_SENTRY_DSN not configured");
    console.log("Set NEXT_PUBLIC_SENTRY_DSN in .env.local to run tests\n");
    process.exit(1);
  }

  console.log(`Environment: ${env.NODE_ENV}`);
  console.log(`Sentry Project: ${env.SENTRY_PROJECT || "not set"}\n`);

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Error capture
  console.log("1. Testing error capture...");
  try {
    Sentry.captureException(new Error("Test error from integration test"));
    console.log("✅ Error captured\n");
    testsPassed++;
  } catch (error) {
    console.log("❌ Error capture failed:", error);
    testsFailed++;
  }

  // Test 2: Message capture
  console.log("2. Testing message capture...");
  try {
    Sentry.captureMessage("Test message from integration test", "info");
    console.log("✅ Message captured\n");
    testsPassed++;
  } catch (error) {
    console.log("❌ Message capture failed:", error);
    testsFailed++;
  }

  // Test 3: Performance tracing
  console.log("3. Testing performance trace...");
  try {
    // Use startSpan for newer Sentry versions (v8+)
    await Sentry.startSpan(
      {
        name: "test-transaction",
        op: "test",
      },
      async (span) => {
        // Create a child span
        await Sentry.startSpan(
          {
            name: "test-child",
            op: "test.child",
            parentSpan: span,
          },
          async () => {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        );
      }
    );

    console.log("✅ Trace captured\n");
    testsPassed++;
  } catch (error) {
    console.log("❌ Trace capture failed:", error);
    testsFailed++;
  }

  // Test 4: Error with context
  console.log("4. Testing error with context...");
  try {
    Sentry.captureException(
      new Error("Test error with context"),
      {
        tags: {
          test: "integration",
          phase: "05",
        },
        extra: {
          timestamp: new Date().toISOString(),
          environment: env.NODE_ENV,
        },
        user: {
          id: "test-user-123",
        },
      }
    );
    console.log("✅ Error with context captured\n");
    testsPassed++;
  } catch (error) {
    console.log("❌ Error with context failed:", error);
    testsFailed++;
  }

  // Test 5: Different severity levels
  console.log("5. Testing different severity levels...");
  try {
    Sentry.captureMessage("Info message", "info");
    Sentry.captureMessage("Warning message", "warning");
    Sentry.captureMessage("Error message", "error");
    console.log("✅ All severity levels captured\n");
    testsPassed++;
  } catch (error) {
    console.log("❌ Severity levels failed:", error);
    testsFailed++;
  }

  // Summary
  console.log("✨ Integration test complete!");
  console.log(`\n📊 Results: ${testsPassed}/${testsPassed + testsFailed} tests passed`);

  if (testsFailed > 0) {
    console.log(`⚠️  ${testsFailed} test(s) failed`);
    process.exit(1);
  }

  console.log("\n📝 Next steps:");
  console.log("   1. Check Sentry dashboard for events");
  console.log("   2. Verify all events have correct tags and context");
  console.log("   3. Check transaction traces in Performance tab");
  console.log("   4. Remove this script after validation\n");
}

// Run tests
testSentryIntegration().catch((error) => {
  console.error("Fatal error running tests:", error);
  process.exit(1);
});
