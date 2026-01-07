"use client";

import * as Sentry from "@sentry/nextjs";
import {
  isSentryEnabled,
  getSentryEnvironment,
  getTracesSampleRate,
  getReplaysSessionSampleRate,
  getReplaysOnErrorSampleRate,
  isDebugEnabled,
} from "./sentry.config";

// SENTRY_CLIENT_INIT_FILE - This file is required for Turbopack support
// See: https://github.com/getsentry/sentry-javascript/issues/8105
//
// This file replaces `sentry.client.config.ts` for Turbopack-based projects
// It initializes Sentry on the client side (browser)

// Only initialize if Sentry is enabled
if (isSentryEnabled()) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
    environment: getSentryEnvironment(),

    // Set release from git SHA (Vercel provides this)
    release:
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.NEXT_PUBLIC_APP_VERSION ||
      "local",

    // Tracing - Environment-aware sampling via shared config
    tracesSampleRate: getTracesSampleRate(),

    // Session Replay - Environment-aware sampling via shared config
    replaysSessionSampleRate: getReplaysSessionSampleRate(),
    replaysOnErrorSampleRate: getReplaysOnErrorSampleRate(),

    // Debug mode - Controlled by shared config
    debug: isDebugEnabled(),

    // Integrations
    integrations: [
      Sentry.browserTracingIntegration(),
      // Only add replay integration if sample rate > 0
      ...(getReplaysSessionSampleRate() > 0 || getReplaysOnErrorSampleRate() > 0
        ? [
            Sentry.replayIntegration({
              maskAllText: true,
              blockAllMedia: true,
            }),
          ]
        : []),
      Sentry.captureConsoleIntegration({
        levels: ["error", "warn"],
      }),
    ],

    // Filter sensitive data
    beforeSend(event, hint) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers["authorization"];
        delete event.request.headers["x-api-key"];
        delete event.request.headers["cookie"];
      }

      // Scrub sensitive query parameters
      const SENSITIVE_PARAMS = ["token", "password", "secret", "apiKey", "api_key"];
      if (event.request?.query_string) {
        const qs = event.request.query_string;
        if (typeof qs === "string") {
          let scrubbed = qs;
          for (const param of SENSITIVE_PARAMS) {
            const regex = new RegExp(`(?:^|&)${param}=[^&]*`, "gi");
            scrubbed = scrubbed.replace(regex, `${param}=[REDACTED]`);
          }
          event.request.query_string = scrubbed;
        }
      }

      // Skip operational errors (not bugs)
      const SKIP_ERROR_PATTERNS = [
        "RATE_LIMIT_EXCEEDED",
        "VALIDATION_ERROR",
        "UNAUTHORIZED",
        "NOT_FOUND",
        "FORBIDDEN",
        "BAD_REQUEST",
      ];

      const errorMessage = event.exception?.values?.[0]?.value || "";
      if (SKIP_ERROR_PATTERNS.some((pattern) => errorMessage.includes(pattern))) {
        return null;
      }

      return event;
    },

    // Ignore browser extension errors
    ignoreErrors: [
      "top.GLOBALS",
      /.*\b(cordova|sencha)\b.*/,
      /Facebook\b.*\bdidn't work\b/,
      /^.*network error.*$/,
    ],

    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      /^resource:\/\//i,
      /^moz-extension:\/\//i,
    ],

    // Initial scope
    initialScope: {
      tags: {
        runtime: "browser",
      },
    },
  });

  // Log initialization in development
  if (isDebugEnabled()) {
    console.log("[Sentry] Client initialized", {
      enabled: isSentryEnabled(),
      environment: getSentryEnvironment(),
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN ? "configured" : "missing",
    });
  }
}


export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
