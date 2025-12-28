/**
 * Sentry Debug Page
 *
 * Simple client-side testing for Sentry integration.
 * Tests browser-side error capturing directly without API routes.
 *
 * @route /debug/sentry
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Bug, CheckCircle2, AlertTriangle, RefreshCw, Activity, Layers, User, Clock } from "lucide-react";
import * as Sentry from "@sentry/nextjs";

type TestResult = {
  id: string;
  action: string;
  status: "pending" | "success" | "error";
  message: string;
  eventId?: string;
  timestamp: Date;
};

export default function SentryDebugPage() {
  const [results, setResults] = useState<TestResult[]>([]);

  const addResult = (
    action: string,
    status: "success" | "error",
    message: string,
    eventId?: string
  ) => {
    const result: TestResult = {
      id: Math.random().toString(36).substring(7),
      action,
      status,
      message,
      eventId,
      timestamp: new Date(),
    };
    setResults((prev) => [result, ...prev].slice(0, 10));
  };

  // Get configuration from environment
  const config = {
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "Not configured",
    environment: process.env.NODE_ENV || "unknown",
    enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  };

  // Test: Capture Message
  const testCaptureMessage = () => {
    try {
      const eventId = Sentry.captureMessage("Debug test message from browser", "info");
      addResult("Capture Message", "success", `Event sent to Sentry`, eventId);
    } catch (error) {
      addResult("Capture Message", "error", (error as Error).message);
    }
  };

  // Test: Capture Exception
  const testCaptureException = () => {
    try {
      const testError = new Error("Debug test exception from browser");
      const eventId = Sentry.captureException(testError);
      addResult("Capture Exception", "success", `Event sent to Sentry`, eventId);
    } catch (error) {
      addResult("Capture Exception", "error", (error as Error).message);
    }
  };

  // Test: Add Breadcrumbs
  const testBreadcrumbs = () => {
    try {
      Sentry.addBreadcrumb({
        category: "debug",
        message: "Breadcrumb 1: User clicked test button",
        level: "info",
      });

      setTimeout(() => {
        Sentry.addBreadcrumb({
          category: "debug",
          message: "Breadcrumb 2: Sending to Sentry",
          level: "info",
        });

        const eventId = Sentry.captureMessage("Debug breadcrumb test completed", "info");
        addResult("Breadcrumbs", "success", `2 breadcrumbs created + message sent`, eventId);
      }, 100);
    } catch (error) {
      addResult("Breadcrumbs", "error", (error as Error).message);
    }
  };

  // Test: Set User Context
  const testUserContext = () => {
    try {
      Sentry.setUser({
        id: "debug-test-user-123",
        email: "debug-test@example.com",
        username: "debug_test_user",
      });

      const eventId = Sentry.captureMessage("Debug user context test", "info");
      addResult("User Context", "success", `User context set + event sent`, eventId);

      // Clear user after
      Sentry.setUser(null);
    } catch (error) {
      addResult("User Context", "error", (error as Error).message);
    }
  };

  // Test: Performance Transaction
  const testTransaction = async () => {
    try {
      await Sentry.startSpan(
        {
          name: "debug-browser-transaction",
          op: "debug.test",
        },
        async (span) => {
          // Simulate work
          await new Promise((resolve) => setTimeout(resolve, 100));

          span?.setAttribute("test.attribute", "test-value");

          // Child span
          await Sentry.startSpan(
            {
              name: "debug-child-span",
              op: "debug.child",
            },
            async () => {
              await new Promise((resolve) => setTimeout(resolve, 50));
            }
          );
        }
      );

      addResult("Transaction", "success", "Performance transaction created");
    } catch (error) {
      addResult("Transaction", "error", (error as Error).message);
    }
  };

  // Test: Console Error
  const testConsoleError = () => {
    try {
      console.error("[Sentry Debug] This is a test error message");
      addResult("Console Error", "success", "Error logged to console (should be captured by Sentry)");
    } catch (error) {
      addResult("Console Error", "error", (error as Error).message);
    }
  };

  // Test: Unhandled Promise Rejection
  const testPromiseRejection = () => {
    try {
      Promise.reject(new Error("Debug test unhandled promise rejection"));
      addResult("Promise Rejection", "success", "Rejection triggered (should be captured by Sentry)");
    } catch (error) {
      addResult("Promise Rejection", "error", (error as Error).message);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Bug className="h-8 w-8 text-orange-500" />
          <h1 className="text-3xl font-bold">Sentry Debug Console</h1>
        </div>
        <p className="text-muted-foreground">
          Client-side testing for browser Sentry integration
        </p>
      </div>

      {/* Configuration Display */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Current Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Environment</div>
              <div className="font-semibold">{config.environment}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Enabled</div>
              <Badge variant={config.enabled ? "default" : "secondary"}>
                {config.enabled ? "Yes" : "No"}
              </Badge>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">DSN</div>
              <div className="font-mono text-xs truncate">
                {config.dsn.length > 40 ? `${config.dsn.substring(0, 40)}...` : config.dsn}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Actions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test Actions</CardTitle>
          <CardDescription>
            Click to send test events to Sentry. Check your dashboard for events.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <TestButton
              icon={<Activity className="h-4 w-4" />}
              label="Capture Message"
              description="Send info message"
              onClick={testCaptureMessage}
            />
            <TestButton
              icon={<Bug className="h-4 w-4" />}
              label="Capture Exception"
              description="Send error exception"
              onClick={testCaptureException}
            />
            <TestButton
              icon={<Layers className="h-4 w-4" />}
              label="Add Breadcrumbs"
              description="Create breadcrumb trail"
              onClick={testBreadcrumbs}
            />
            <TestButton
              icon={<User className="h-4 w-4" />}
              label="Set User Context"
              description="Set user identification"
              onClick={testUserContext}
            />
            <TestButton
              icon={<Clock className="h-4 w-4" />}
              label="Performance Transaction"
              description="Create performance span"
              onClick={testTransaction}
            />
            <TestButton
              icon={<AlertTriangle className="h-4 w-4" />}
              label="Console Error"
              description="Log error to console"
              onClick={testConsoleError}
            />
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Test Results</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setResults([])}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.map((result) => (
                <div
                  key={result.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                >
                  {result.status === "success" ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{result.action}</span>
                      <Badge
                        variant={result.status === "success" ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {result.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{result.message}</p>
                    {result.eventId && (
                      <p className="text-xs font-mono text-muted-foreground mt-1">
                        Event ID: {result.eventId}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {result.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Guide */}
      <Alert className="mt-6">
        <Bug className="h-4 w-4" />
        <AlertTitle>How to Use</AlertTitle>
        <AlertDescription>
          <ol className="list-decimal list-inside space-y-1 mt-2">
            <li>Click any test button above to send an event to Sentry</li>
            <li>Check your Sentry dashboard (zunokit → zuno-metadata)</li>
            <li>Look for events with message starting with &quot;Debug test&quot;</li>
            <li>Use CLI for verification: <code>sentry-cli send-event -m &quot;Test&quot;</code></li>
          </ol>
        </AlertDescription>
      </Alert>
    </div>
  );
}

function TestButton({
  icon,
  label,
  description,
  onClick,
}: {
  icon?: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant="outline"
      className="h-auto p-4 flex-col items-start gap-1"
      onClick={onClick}
    >
      <div className="flex items-center gap-2 w-full">
        {icon || <div className="w-3 h-3 rounded bg-blue-500" />}
        <span className="font-medium">{label}</span>
      </div>
      <span className="text-xs text-muted-foreground">{description}</span>
    </Button>
  );
}
