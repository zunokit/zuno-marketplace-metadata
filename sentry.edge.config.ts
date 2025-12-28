import * as Sentry from "@sentry/nextjs";
import {
  isSentryEnabled,
  getSentryEnvironment,
  getTracesSampleRate,
  getProfilesSampleRate,
  isDebugEnabled,
} from "./sentry.config";

// Sensitive patterns to redact from error messages
const SENSITIVE_PATTERNS = [
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, // Bearer tokens
  /sk_[a-zA-Z0-9]{20,}/g, // API keys (sk_live_, sk_test_)
  /"[^"]*apiKey[^"]*":\s*"[^"]+"/g, // JSON apiKey values
  /token[^"]*[:=]\s*[A-Za-z0-9\-._~+/]{10,}/gi, // Tokens in logs
  /password[^"]*[:=]\s*"[^"]+"/gi, // Passwords in logs
  /secret[^"]*[:=]\s*"[^"]+"/gi, // Secrets in logs
];

/**
 * Sanitize error message by redacting sensitive patterns
 */
function sanitizeMessage(message: string): string {
  let sanitized = message;
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[REDACTED]");
  }
  return sanitized;
}

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

    // Smart sampling for distributed tracing
    tracesSampleRate: getTracesSampleRate(),

    // Profiling - Enable for performance analysis
    profilesSampleRate: getProfilesSampleRate(),

    // Integrations (auto-instrumentation)
    integrations: [
      Sentry.httpIntegration(),
      Sentry.postgresIntegration(),
      Sentry.redisIntegration(),
    ],

    // Filter sensitive data and operational errors
    beforeSend(event, hint) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers["authorization"];
        delete event.request.headers["x-api-key"];
        delete event.request.headers["cookie"];
      }

      // Skip operational errors (not bugs)
      const skipCodes = [
        "RATE_LIMITED", // Expected user behavior
        "VALIDATION_ERROR", // Bad input
        "UNAUTHORIZED", // Auth failure
        "FORBIDDEN", // Permission denied
        "NOT_FOUND", // Resource missing
      ];

      if (event.tags?.code && skipCodes.includes(event.tags.code as string)) {
        return null; // Don't send
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

      // Sanitize error messages to remove sensitive data
      if (event.exception?.values) {
        for (const exception of event.exception.values) {
          if (exception.value) {
            exception.value = sanitizeMessage(exception.value);
          }
        }
      }

      // Sanitize breadcrumbs messages
      if (event.breadcrumbs) {
        for (const breadcrumb of event.breadcrumbs) {
          if (breadcrumb.message) {
            breadcrumb.message = sanitizeMessage(breadcrumb.message);
          }
        }
      }

      // Add request context
      if (event.request) {
        event.contexts = {
          ...event.contexts,
          app: {
            request_id: event.request.headers?.["x-request-id"],
          },
        };
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
