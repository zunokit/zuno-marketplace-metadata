# Sentry Setup Guide

**Version**: 1.0 | **Last Updated**: 2025-12-27

Complete guide for setting up Sentry error tracking and GitHub issue automation for Zuno Marketplace Metadata.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step-by-Step Setup](#step-by-step-setup)
4. [Environment Variables](#environment-variables)
5. [Sentry Dashboard Configuration](#sentry-dashboard-configuration)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)
8. [Cleanup](#cleanup)

---

## Overview

This integration provides:
- **Error Tracking**: Automatic capture of server and client errors
- **Performance Monitoring**: Trace sampling for API endpoints (10%)
- **GitHub Automation**: Automatic issue creation for production errors
- **Deduplication**: Redis-based fingerprinting prevents duplicate issues

**Architecture**:
```
Sentry → Webhook → /api/sentry/webhook → Dedup Check → GitHub Issue
```

---

## Prerequisites

| Item | Requirement |
|------|-------------|
| **Sentry Account** | Free tier at [sentry.io](https://sentry.io) |
| **GitHub Account** | For issue automation |
| **Project Access** | Admin access to target GitHub repo |
| **Environment** | Node.js 18+, pnpm 8+ |

---

## Step-by-Step Setup

### Step 1: Create Sentry Project

1. Go to [sentry.io](https://sentry.io) and sign up
2. Click **Create New Project**
3. Select **Next.js** as platform
4. Name project: `zuno-metadata`
5. Copy the **DSN** from project settings

### Step 2: Generate Authentication Tokens

#### A. Sentry Auth Token

1. Go to **Settings > Auth Tokens**
2. Click **Create New Token**
3. Scopes: `project:releases`, `project:write`
4. Copy token (format: `sntrys_...`)

#### B. Webhook Secret

Generate secure secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

#### C. GitHub Personal Access Token

1. Go to **GitHub Settings > Developer settings > Personal access tokens**
2. Click **Generate new token (classic)**
3. Scopes: `repo:issues` (required)
4. Copy token (format: `ghp_...`)

### Step 3: Configure Environment Variables

Create or update `.env.local`:

```env
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@o1234.ingest.sentry.io/123456
SENTRY_AUTH_TOKEN=sntrys_xxxxxxxxxxxxxx
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=zuno-metadata
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_WEBHOOK_SECRET=your-generated-webhook-secret

# GitHub Integration
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_REPO=zunokit/zuno-marketplace-metadata
GITHUB_ISSUE_LABEL=sentry,error,production
```

### Step 4: Verify Installation

```bash
# Type check
pnpm typecheck

# Build
pnpm build

# Start dev server
pnpm dev
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | ✅ Yes | - | Sentry project DSN |
| `SENTRY_AUTH_TOKEN` | ✅ Yes | - | Sentry authentication token |
| `SENTRY_ORG` | No | - | Organization slug |
| `SENTRY_PROJECT` | No | - | Project name |
| `SENTRY_TRACES_SAMPLE_RATE` | No | 0.1 | Trace sampling (10% = 3K traces/month) |
| `SENTRY_WEBHOOK_SECRET` | ✅ Yes | - | Webhook signature verification |
| `GITHUB_TOKEN` | ✅ Yes | - | GitHub PAT with `repo:issues` |
| `GITHUB_REPO` | No | zunokit/zuno-marketplace-metadata | Target repo |
| `GITHUB_ISSUE_LABEL` | No | sentry,error,production | Comma-separated labels |

---

## Sentry Dashboard Configuration

### Alert Rule Setup

1. Go to **Settings > Alerts > New Alert Rule**
2. Configure:

| Setting | Value |
|---------|-------|
| **Name** | Production Error Alert |
| **Team** | (Your team) |
| **Environment** | `production` |
| **Trigger** | New issue is created |
| **Filter** | `environment:production` |
| **Frequency** | Immediately |

### Webhook Integration

1. Go to **Settings > Integrations > Webhooks**
2. Click **Add New Webhook**
3. Configure:

| Setting | Value |
|---------|-------|
| **Name** | GitHub Issue Creator |
| **URL** | `https://your-domain.com/api/sentry/webhook` |
| **Secret** | `SENTRY_WEBHOOK_SECRET` value |

4. Select events: `error` (new issue)
5. Click **Test Webhook** to verify

### Webhook URL

For local development, use:
```
http://localhost:3000/api/sentry/webhook
```

For production, use:
```
https://your-domain.com/api/sentry/webhook
```

---

## Testing

### Option A: Test Endpoint (Development Only)

```bash
curl http://localhost:3000/api/test/sentry-error
```

Expected response:
```json
{
  "success": true,
  "message": "Test error captured to Sentry",
  "details": {
    "environment": "development",
    "sentryEnabled": true,
    "sentryProject": "zuno-metadata"
  }
}
```

### Option B: Integration Test Script

```bash
npx tsx scripts/test-sentry-integration.ts
```

This runs 5 tests:
1. Error capture
2. Message capture
3. Performance tracing
4. Error with context
5. Severity levels

Expected output:
```
🧪 Testing Sentry Integration...

1. Testing error capture...
✅ Error captured

2. Testing message capture...
✅ Message captured

3. Testing performance trace...
✅ Trace captured

4. Testing error with context...
✅ Error with context captured

5. Testing different severity levels...
✅ All severity levels captured

✨ Integration test complete!
📊 Results: 5/5 tests passed
```

### Verification Checklist

- [ ] Error appears in Sentry dashboard
- [ ] Event has correct tags and environment
- [ ] Webhook endpoint logs show request
- [ ] GitHub issue created (for production errors)
- [ ] Issue has correct labels
- [ ] Deduplication works (second error doesn't create new issue)

---

## Troubleshooting

### Issue: No events in Sentry

**Check:**
1. `NEXT_PUBLIC_SENTRY_DSN` is set correctly
2. SDK initialized (check browser console)
3. Not filtered by environment (non-production filtered)
4. Network requests not blocked

### Issue: Webhook not triggering

**Check:**
1. Alert rule configured for production
2. Webhook URL is correct and accessible
3. Webhook secret matches `SENTRY_WEBHOOK_SECRET`
4. Server logs show webhook requests

### Issue: GitHub issue not created

**Check:**
1. `GITHUB_TOKEN` has `repo:issues` scope
2. `GITHUB_REPO` format is `owner/repo`
3. GitHub API rate limits not exceeded
4. Redis connection working (for deduplication)

### Issue: Duplicate GitHub issues

**Check:**
1. Redis is connected
2. Fingerprint TTL is set (30 days)
3. Deduplication check is working
4. `SENTRY_WEBHOOK_SECRET` matches

### Issue: Build errors

**Check:**
```bash
# Type check
pnpm typecheck

# Dependencies installed
pnpm install

# Clean build
rm -rf .next && pnpm build
```

---

## Cleanup

After validation complete, remove test artifacts:

```bash
# Remove test endpoint
rm src/app/api/test/sentry-error/route.ts

# Remove test script (optional)
rm scripts/test-sentry-integration.ts
```

---

## Architecture Reference

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Sentry Cloud                                                │
│  Error → Alert → Webhook                                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ POST /api/sentry/webhook                                    │
│  1. Verify signature (HMAC-SHA256)                          │
│  2. Check environment (production only)                     │
│  3. Deduplication check (Redis)                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ GitHub API                                                   │
│  Create issue with labels, body, metadata                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Redis Storage                                               │
│  Store fingerprint (30-day TTL)                             │
└─────────────────────────────────────────────────────────────┘
```

### File Structure

```
sentry.server.config.ts          # Root server config
sentry.client.config.ts          # Root client config
sentry.properties                # Sentry CLI config

src/infrastructure/sentry/
├── sentry.server.config.ts      # Server helpers
├── sentry.client.config.ts      # Client helpers
└── sentry.worker.config.ts      # Worker config

src/app/api/sentry/
└── webhook/route.ts             # Webhook endpoint

src/core/services/sentry-issue/
├── sentry-issue.service.ts      # Business logic
└── sentry-issue.entity.ts       # Entity types

src/infrastructure/
├── github/github-client.ts      # GitHub API
└── cache/sentry-dedup.service.ts # Deduplication

src/shared/lib/utils/
└── sentry-helpers.ts            # Utilities
```

---

## Support

- **Sentry Docs**: https://docs.sentry.io
- **GitHub API Docs**: https://docs.github.com/en/rest
- **Project Issues**: https://github.com/zunokit/zuno-marketplace-metadata/issues

---

**Document Version**: 1.0 | **Related**: [Phase Plans](../plans/251226-sentry-integration/)
