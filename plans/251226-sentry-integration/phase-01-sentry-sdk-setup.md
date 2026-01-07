# Phase 01: Sentry SDK Setup

**Status**: Pending | **Effort**: 2h | **Priority**: P1

## Overview

Install and configure Sentry SDK for Next.js 16 with environment-based sampling.

## Related Files

- Brainstorm report: `plans/reports/brainstormer-251226-2228-sentry-integration.md`
- Sentry docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| `@sentry/nextjs` SDK | Official Next.js integration, automatic instrumentation |
| 10% production sampling | Fits free tier quota (3K traces/month) |
| Environment-based config | Different settings for dev/preview/production |

## Requirements

### Functional
- Install Sentry SDK packages
- Configure server-side SDK for API routes
- Configure client-side SDK for browser errors
- Configure worker SDK for BullMQ jobs
- Add environment variables

### Non-Functional
- Zero performance impact when disabled
- Clean Architecture compliance
- Type-safe configuration

## Architecture

```
sentry.server.config.ts  → API routes, server components
sentry.client.config.ts  → Browser, client components
sentry.worker.config.ts  → BullMQ background workers
```

## File Changes

### New Files

| File | Purpose |
|------|---------|
| `sentry.server.config.ts` | Root Next.js server config (Sentry SDK requirement) |
| `sentry.client.config.ts` | Root Next.js client config (Sentry SDK requirement) |
| `sentry.properties` | Sentry CLI configuration |
| `src/infrastructure/sentry/sentry.server.config.ts` | Server-side Sentry init |
| `src/infrastructure/sentry/sentry.client.config.ts` | Client-side Sentry init |
| `src/infrastructure/sentry/sentry.worker.config.ts` | Worker Sentry init |

### Modified Files

| File | Changes |
|------|---------|
| `src/shared/config/env.ts` | Add Sentry environment variable validation |
| `package.json` | Add `@sentry/nextjs` dependency |
| `.env.example` | Add Sentry config template |

## Implementation Steps

### 1. Install Dependencies

```bash
pnpm add @sentry/nextjs
```

### 2. Create Root Config Files

**File: `sentry.server.config.ts`**
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || "0.1"),
  // Disable session replay for free tier
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
});
```

**File: `sentry.client.config.ts`**
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || "0.1"),
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
});
```

### 3. Create Infrastructure Config

**File: `src/infrastructure/sentry/sentry.server.config.ts`**
```typescript
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
```

**File: `src/infrastructure/sentry/sentry.client.config.ts`**
```typescript
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
```

**File: `src/infrastructure/sentry/sentry.worker.config.ts`**
```typescript
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
```

### 4. Update Environment Config

**File: `src/shared/config/env.ts`**
```typescript
// Add to existing env schema:
NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
SENTRY_AUTH_TOKEN: z.string().optional(),
SENTRY_ORG: z.string().optional(),
SENTRY_PROJECT: z.string().optional(),
SENTRY_TRACES_SAMPLE_RATE: z.string().default("0.1"),
SENTRY_WEBHOOK_SECRET: z.string().optional(),
```

### 5. Update Worker Index

**File: `src/infrastructure/queue/workers/index.ts`**
```typescript
import { initSentryWorker } from "@/infrastructure/sentry/sentry.worker.config";

// Initialize Sentry for workers
initSentryWorker();

// ... rest of file
```

### 6. Update .env.example

```env
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://dsn@sentry.io/project
SENTRY_AUTH_TOKEN=your-auth-token
SENTRY_ORG=your-org
SENTRY_PROJECT=zuno-metadata
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_WEBHOOK_SECRET=your-webhook-signing-secret

# GitHub Integration (for issue automation)
GITHUB_TOKEN=ghp_your-personal-access-token
GITHUB_REPO=zunokit/zuno-marketplace-metadata
GITHUB_ISSUE_LABEL=sentry,error,production
```

## Todo List

- [ ] Install `@sentry/nextjs` package
- [ ] Create `sentry.server.config.ts` in root
- [ ] Create `sentry.client.config.ts` in root
- [ ] Create `sentry.properties` in root
- [ ] Create `src/infrastructure/sentry/` directory
- [ ] Create server config in infrastructure
- [ ] Create client config in infrastructure
- [ ] Create worker config in infrastructure
- [ ] Update `src/shared/config/env.ts`
- [ ] Update `src/infrastructure/queue/workers/index.ts`
- [ ] Update `.env.example`

## Success Criteria

- ✅ Package installed successfully
- ✅ TypeScript compiles without errors
- ✅ All config files created
- ✅ Environment variables validated
- ✅ Workers initialize without error

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| SDK breaks local dev | Check `SENTRY_ENABLED` before init |
| Exceeds quota quickly | Default to 10% sampling, monitor |
| Version conflict | Use pinned version, test upgrade |

## Next Steps

→ Phase 02: Create webhook handler for Sentry alerts
