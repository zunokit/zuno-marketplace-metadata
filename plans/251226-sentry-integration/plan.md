---
title: "Sentry Integration with GitHub Issue Automation"
description: "Add Sentry error tracking, performance monitoring with GitHub issue automation"
status: pending
priority: P1
effort: 6h
issue: TBD
branch: develop-claude
tags: [feature, infra, observability, monitoring]
created: 2025-12-26
---

# Sentry Integration Plan

## Overview

Integrate Sentry for production error tracking, performance tracing, and automated GitHub issue creation. Uses Sentry free tier with smart sampling (10%) to stay within quotas.

**Referenced Report**: `plans/reports/brainstormer-251226-2228-sentry-integration.md`

## Phases

| # | Phase | Status | Effort | Link |
|---|-------|--------|--------|------|
| 1 | Sentry SDK Setup | Pending | 2h | [phase-01](./phase-01-sentry-sdk-setup.md) |
| 2 | Webhook Handler | Pending | 2h | [phase-02-webhook-handler.md) |
| 3 | GitHub Integration | Pending | 1h | [phase-03-github-integration.md) |
| 4 | Sentry Alerts Config | Pending | 0.5h | [phase-04-sentry-alerts-config.md) |
| 5 | Testing & Validation | Pending | 0.5h | [phase-05-testing-validation.md) |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Sentry Cloud (Free Tier)                                    │
│  Errors → Traces → Webhook → /api/sentry/webhook            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Next.js API Route                                           │
│  Verify signature → Deduplicate → GitHub API → Issue        │
└─────────────────────────────────────────────────────────────┘
```

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| 10% trace sampling | Fits 3K traces/month quota for 1K req/day |
| Redis deduplication | Prevents duplicate GitHub issues |
| Production-only monitoring | Focus resources on production errors |
| All errors → Issues | Zero blind spots, accept noise trade-off |

## Dependencies

| Item | Status | Action |
|------|--------|--------|
| Sentry account | Needed | Create at sentry.io |
| GitHub PAT | Needed | Generate with `repo:issues` scope |
| Sentry DSN | Needed | Get from project setup |
| Webhook URL | Needed | Configure after deployment |

## File Changes

**New Files** (9):
- `src/infrastructure/sentry/sentry.server.config.ts`
- `src/infrastructure/sentry/sentry.client.config.ts`
- `src/infrastructure/sentry/sentry.worker.config.ts`
- `src/app/api/sentry/webhook/route.ts`
- `src/core/services/sentry-issue/sentry-issue.service.ts`
- `src/shared/lib/utils/sentry-helpers.ts`
- `sentry.server.config.ts` (root)
- `sentry.client.config.ts` (root)
- `sentry.properties` (root)

**Modified Files** (5):
- `src/shared/config/env.ts` - Add Sentry env vars
- `src/infrastructure/queue/workers/index.ts` - Add worker Sentry init
- `src/shared/lib/api/api-handler.ts` - Add Sentry error capture
- `.env.example` - Add Sentry config
- `package.json` - Add Sentry dependencies

## Validation Summary

**Validated**: 2025-12-26
**Questions asked**: 4

### Confirmed Decisions
- **Trace Sampling**: 10% sampling accepted (fits free tier, 100 traces/day)
- **Issue Creation**: All errors → GitHub issues (zero blind spots, accept noise)
- **Async Processing**: Fire-and-forget webhook processing (fast response)
- **Deduplication**: Existing Redis with 30-day TTL (no additional infrastructure)

### Action Items
- None - proceed with implementation as planned

## Success Criteria

- ✅ All production errors captured in Sentry
- ✅ GitHub issues created for new errors within 5 minutes
- ✅ Performance traces within 3K/month quota
- ✅ Webhook signature verification working
- ✅ Issue deduplication via Redis
- ✅ Zero performance impact on API response times
