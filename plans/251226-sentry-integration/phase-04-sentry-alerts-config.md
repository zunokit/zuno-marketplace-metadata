# Phase 04: Sentry Alerts Configuration

**Status**: In Progress | **Effort**: 0.5h | **Priority**: P1

**Code Review**: [code-reviewer-251227-0347-sentry-phase04-alerts-config.md](../reports/code-reviewer-251227-0347-sentry-phase04-alerts-config.md) | **Status**: APPROVED

## Overview

Configure Sentry alerts to trigger webhook for all new production errors.

### Implementation Summary

**New Files Added**:
- `src/app/api/test/sentry-error/route.ts` - Test endpoint for validating Sentry alert flow

**Code Changes**: None (Phase 04 is primarily manual configuration)

## Related Files

- Sentry alerts docs: https://docs.sentry.io/product/alerts/

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Alert on all new issues | User requirement, accept noise |
| Filter by environment | Production only |
| Webhook integration | Direct POST to API endpoint |

## Requirements

### Functional
- Create Sentry alert rule
- Configure webhook integration
- Test alert delivery

### Non-Functional
- Real-time alerts (<5 min delay)
- No false positives

## Implementation Steps

### 1. Create Sentry Account

1. Go to https://sentry.io/
2. Sign up for free account
3. Create new project: "zuno-metadata"
4. Select "Next.js" as platform
5. Get DSN from project settings

### 2. Configure Alert Rule

In Sentry Dashboard:

1. Navigate to **Settings > Alerts > New Alert Rule**
2. Configure:

| Setting | Value |
|---------|-------|
| **Name** | "Production Error Alert" |
| **Team** | (Your team) |
| **Environment** | `production` |
| **Trigger** | "New issue is created" |
| **Filter** | `environment:production` |
| **Frequency** | "Immediately" |

### 3. Configure Webhook Integration

In Sentry Dashboard:

1. Navigate to **Settings > Integrations > Webhooks**
2. Click "Add New Webhook"
3. Configure:

| Setting | Value |
|---------|-------|
| **Name** | "GitHub Issue Creator" |
| **URL** | `https://your-domain.com/api/sentry/webhook` |
| **Secret** | `SENTRY_WEBHOOK_SECRET` value from `.env` |

4. Select these events:
   - `error` - New issue
   - `issue` - Issue state changes (optional)

5. Test webhook with Sentry's "Test Webhook" button

### 4. Get Webhook Secret

Generate a secure secret for webhook signature verification:

```bash
# Generate random 32-character secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Add to `.env`:

```env
SENTRY_WEBHOOK_SECRET=your-generated-secret-here
```

### 5. Configure Environment Variables

Update `.env.local` (production values):

```env
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@o1234.ingest.sentry.io/123456
SENTRY_AUTH_TOKEN=sntrys_xxxxxxxxxxxxxx
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=zuno-metadata
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_WEBHOOK_SECRET=your-webhook-secret

# GitHub Integration
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_REPO=zunokit/zuno-marketplace-metadata
GITHUB_ISSUE_LABEL=sentry,error,production
```

### 6. Test Alert Flow

1. Trigger a test error in production:

```typescript
// In any API route:
import * as Sentry from "@sentry/nextjs";

// Test endpoint (remove after testing!)
export async function GET() {
  Sentry.captureException(new Error("Test Sentry integration"));
  return Response.json({ success: true });
}
```

2. Verify in Sentry:
   - Error appears in project
   - Alert fired
   - Webhook called

3. Verify GitHub:
   - New issue created
   - Has correct labels
   - Contains error details

## Todo List

### Code Implementation (COMPLETED)
- [x] Create test error capture endpoint (`src/app/api/test/sentry-error/route.ts`)

### Manual Configuration (PENDING)
- [ ] Create Sentry account
- [ ] Create Sentry project
- [ ] Get DSN and auth token
- [ ] Generate webhook secret
- [ ] Configure alert rule
- [ ] Configure webhook integration
- [ ] Update `.env.local` with production values
- [ ] Test error capture via `/api/test/sentry-error`
- [ ] Test webhook delivery
- [ ] Verify GitHub issue creation
- [ ] Remove test endpoint

## Success Criteria

- ✅ Sentry receives errors from app
- ✅ Alert fires within 5 minutes
- ✅ Webhook POST succeeds
- ✅ GitHub issue created
- ✅ Issue contains error details

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Webhook URL not reachable | Deploy webhook endpoint first |
| Secret mismatch | Double-check env var copy |
| Test errors in production | Create separate test project |

## Configuration Reference

### Sentry Alert Rule Settings

```yaml
name: "Production Error Alert"
query: "is:unresolved environment:production"
mode: "create_new_issue"
frequency: "immediately"
actions:
  - type: "webhook"
    url: "https://your-domain.com/api/sentry/webhook"
    headers:
      - name: "Content-Type"
        value: "application/json"
```

### Webhook Payload Example

```json
{
  "event_id": "abc123",
  "fingerprint": ["{{ default }}"],
  "message": "Error: Something went wrong",
  "exception": {
    "values": [{
      "type": "Error",
      "value": "Something went wrong",
      "stacktrace": { "frames": [...] }
    }]
  },
  "request": {
    "url": "https://api.example.com/metadata",
    "method": "POST",
    "headers": { "User-Agent": "..." }
  },
  "tags": {
    "apiKeyId": "key_123",
    "runtime": "node"
  },
  "environment": "production",
  "url": "https://sentry.io/organizations/org/issues/123/"
}
```

## Next Steps

→ Phase 05: Testing & validation
