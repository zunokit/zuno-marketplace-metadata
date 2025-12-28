/**
 * Shared Sentry Configuration
 *
 * Centralized configuration for Sentry initialization across server, edge, and client.
 * NOTE: This file must be at root level (next to sentry.*.config.ts) for proper module resolution.
 *
 * Environment Variables:
 * - NEXT_PUBLIC_SENTRY_DSN: Sentry DSN (public)
 * - SENTRY_DSN: Sentry DSN (server-side fallback)
 * - SENTRY_ENABLED: Enable/disable Sentry server-side (default: true if DSN present)
 * - NEXT_PUBLIC_SENTRY_ENABLED: Enable/disable Sentry client-side (default: true if DSN present)
 */

/**
 * Check if Sentry should be enabled for the current environment
 */
export function isSentryEnabled(): boolean {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
  if (!dsn) {
    return false;
  }

  if (process.env.SENTRY_ENABLED === "false") {
    return false;
  }

  if (process.env.NEXT_PUBLIC_SENTRY_ENABLED === "false") {
    return false;
  }

  return true;
}

/**
 * Get the Sentry environment name based on deployment context
 */
export function getSentryEnvironment(): string {
  const vercelEnv = process.env.VERCEL_ENV || process.env.NEXT_PUBLIC_VERCEL_ENV;
  const gitRef = process.env.VERCEL_GIT_COMMIT_REF || process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF;
  const nodeEnv = process.env.NODE_ENV;

  if (vercelEnv === "production") {
    return "production";
  }

  if (vercelEnv === "staging") {
    return "staging";
  }

  if (vercelEnv === "preview" || (gitRef && !vercelEnv)) {
    if (gitRef === "develop") {
      return "develop";
    }

    if (gitRef === "staging") {
      return "staging";
    }

    if (gitRef && gitRef !== "develop" && gitRef !== "staging") {
      return gitRef.replace(/\//g, "-").replace(/[^a-zA-Z0-9\-_]/g, "");
    }

    return "preview";
  }

  if (!vercelEnv && !gitRef) {
    if (nodeEnv === "development") {
      return "local";
    }
  }

  return nodeEnv || "unknown";
}

/**
 * Get traces sample rate based on environment
 */
export function getTracesSampleRate(): number {
  if (process.env.SENTRY_TRACES_SAMPLE_RATE) {
    const rate = parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE);
    if (!isNaN(rate) && rate >= 0 && rate <= 1) {
      return rate;
    }
  }

  const env = getSentryEnvironment();

  if (env === "production" || env === "staging") {
    return 1.0;
  }

  return 0.0;
}

/**
 * Get profiles sample rate based on environment
 */
export function getProfilesSampleRate(): number {
  if (process.env.SENTRY_PROFILES_SAMPLE_RATE) {
    const rate = parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE);
    if (!isNaN(rate) && rate >= 0 && rate <= 1) {
      return rate;
    }
  }

  const env = getSentryEnvironment();

  if (env === "production" || env === "staging") {
    return 0.1;
  }

  return 0.0;
}

/**
 * Get session replay sample rate for normal sessions
 *
 * For local/dev: Disabled (causes fetch errors in development)
 * For production: Disabled (cost saving)
 */
export function getReplaysSessionSampleRate(): number {
  const env = getSentryEnvironment();

  if (env === "production") {
    return 0.0; // Disabled to save quota
  }

  return 0.0; // Disabled in local (causes fetch errors)
}

/**
 * Get session replay sample rate for error sessions
 *
 * Records sessions when errors occur for debugging
 */
export function getReplaysOnErrorSampleRate(): number {
  const env = getSentryEnvironment();

  if (env === "production" || env === "staging") {
    return 1.0;
  }

  return 0.0; // Disabled in local (causes fetch errors)
}

/**
 * Check if debug mode should be enabled
 */
export function isDebugEnabled(): boolean {
  const env = getSentryEnvironment();

  if (env === "local") {
    return true;
  }

  return process.env.SENTRY_DEBUG === "true";
}
