import * as Sentry from "@sentry/nextjs";
import {
  isSentryEnabled,
  getSentryEnvironment,
  getTracesSampleRate,
  getProfilesSampleRate,
  isDebugEnabled,
} from "./sentry.config";

// Operational errors to skip (expected business logic errors)
const SKIP_ERROR_PATTERNS = [
  "RATE_LIMIT_EXCEEDED",
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "NOT_FOUND",
  "FORBIDDEN",
  "BAD_REQUEST",
];

// Sensitive query parameters to scrub
const SENSITIVE_PARAMS = ["token", "password", "secret", "apiKey", "api_key"];

// Only initialize if Sentry is enabled for this environment
if (isSentryEnabled()) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
    environment: getSentryEnvironment(),

    // Set release from git SHA (Vercel provides this)
    release:
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.NEXT_PUBLIC_APP_VERSION ||
      "local",

    // Tracing - Environment-aware sampling via config
    tracesSampleRate: getTracesSampleRate(),

    // Profiling - Environment-aware sampling via config
    profilesSampleRate: getProfilesSampleRate(),

    // Integrations (auto-instrumentation)
    integrations: [
      Sentry.httpIntegration(),
      Sentry.postgresIntegration(),
      Sentry.redisIntegration(),
      Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
    ],

    // Filter sensitive data and operational errors
    beforeSend(event, hint) {
      // Skip operational errors (expected business logic errors)
      const errorMessage = event.exception?.values?.[0]?.value || "";
      if (
        SKIP_ERROR_PATTERNS.some((pattern) => errorMessage.includes(pattern))
      ) {
        return null;
      }

      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers["authorization"];
        delete event.request.headers["x-api-key"];
        delete event.request.headers["cookie"];
      }

      // Scrub sensitive query parameters
      if (event.request?.query_string) {
        const qs = event.request.query_string;
        if (typeof qs === "string") {
          let scrubbed = qs;
          for (const param of SENSITIVE_PARAMS) {
            const regex = new RegExp(`(?:^|&)${param}=[^&]*`, "gi");
            scrubbed = scrubbed.replace(regex, `${param}=[REDACTED]`);
          }
          event.request.query_string = scrubbed;
        } else if (Array.isArray(qs)) {
          // Handle tuple array format [key, value][]
          event.request.query_string = qs.map(([key, value]) =>
            SENSITIVE_PARAMS.includes(key) ? [key, "[REDACTED]"] : [key, value]
          ) as typeof qs;
        }
      }

      return event;
    },

    // Debug mode (development only) - controlled by config
    debug: isDebugEnabled(),

    // Ignore specific errors
    ignoreErrors: [
      // Browser extensions
      "top.GLOBALS",
      // Random plugins/extensions
      /.*\b(cordova|sencha)\b.*/,
    ],

    // Denoising (group similar errors)
    denyUrls: [
      // Chrome extensions
      /extensions\//i,
      /^chrome:\/\//i,
    ],
  });
}

export default Sentry;
