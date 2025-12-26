import * as Sentry from "@sentry/node";
import { env } from "@/shared/config/env";

export const initSentryWorker = () => {
  if (!env.NEXT_PUBLIC_SENTRY_DSN) return;

  Sentry.init({
    dsn: env.NEXT_PUBLIC_SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: 0, // No tracing for workers (save quota)
    beforeSend(event) {
      // Add worker-specific context
      event.tags = { ...event.tags, component: "worker" };
      return event;
    },
  });
};

export const captureException = (error: unknown) => {
  if (!env.NEXT_PUBLIC_SENTRY_DSN) return;

  Sentry.captureException(error);
};
