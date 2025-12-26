import * as Sentry from "@sentry/nextjs";
import { env } from "@/shared/config/env";

/**
 * Initialize Sentry for server-side
 *
 * This is called by Next.js automatically via sentry.server.config.ts
 * This file exports additional helpers for manual instrumentation
 */

export const SENTRY_ENABLED = Boolean(env.NEXT_PUBLIC_SENTRY_DSN);

export const initSentryServer = () => {
  if (!SENTRY_ENABLED) return;

  Sentry.setTag("runtime", "node");
  Sentry.setTag("component", "server");
};

export const captureException = (error: unknown, context?: Record<string, unknown>) => {
  if (!SENTRY_ENABLED) return;

  Sentry.captureException(error, {
    tags: { context: "server" },
    extra: context,
  });
};

export const captureMessage = (message: string, level: "info" | "warning" | "error" = "info") => {
  if (!SENTRY_ENABLED) return;

  Sentry.captureMessage(message, { level, tags: { context: "server" } });
};
