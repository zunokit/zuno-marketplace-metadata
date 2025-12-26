import * as Sentry from "@sentry/nextjs";
import { env } from "@/shared/config/env";

export const SENTRY_ENABLED = Boolean(env.NEXT_PUBLIC_SENTRY_DSN);

export const initSentryClient = () => {
  if (!SENTRY_ENABLED) return;

  Sentry.setTag("runtime", "browser");
  Sentry.setTag("component", "client");
};

export const captureException = (error: unknown, context?: Record<string, unknown>) => {
  if (!SENTRY_ENABLED) return;

  Sentry.captureException(error, {
    tags: { context: "client" },
    extra: context,
  });
};
