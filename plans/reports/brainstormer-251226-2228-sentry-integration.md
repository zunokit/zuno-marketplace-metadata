# Sentry Integration Brainstorm Report

**Date**: 2025-12-26
**Project**: Zuno Marketplace Metadata
**Session**: 251226-2228-sentry-integration

---

## Problem Statement

Add Sentry observability to Zuno Marketplace Metadata for:
- Silent production errors
- Performance degradation detection
- Debugging context improvement
- Automated GitHub issue creation from errors

**Constraints**:
- Free tier only
- Low traffic (<1K requests/day)
- Clean Architecture must be preserved

---

## Requirements Analysis

### User Requirements
| Requirement | Priority | Notes |
|-------------|----------|-------|
| Error tracking | Critical | All production errors |
| Performance tracing | Critical | Full tracing with sampling |
| Issue automation | Critical | GitHub Issues for ALL new errors |
| Environment filtering | Required | Production only |

### Non-Functional Requirements
- Zero cost (free tier)
- Minimal performance overhead
- Clean Architecture compliance
- Existing infra compatibility (Redis, Next.js 16)

---

## Evaluated Approaches

### Option A: Sentry Free Tier ✅ SELECTED
| Aspect | Evaluation |
|--------|------------|
| **Pros** | Industry standard, best DX, excellent Next.js SDK, extensive docs |
| **Cons** | Quota limits (5K errors, 3K traces/month), no native issue workflows |
| **Verdict** | **Selected** - Mitigated via smart sampling & custom webhook |

### Option B: GlitchTip (Self-Hosted)
| Aspect | Evaluation |
|--------|------------|
| **Pros** | Open-source, unlimited usage, native issue automation |
| **Cons** | Requires deployment/maintenance, different from standard |
| **Verdict** | Rejected - User preferred Sentry ecosystem |

### Option C: Lightweight Stack (Logtail + Vercel)
| Aspect | Evaluation |
|--------|------------|
| **Pros** | Purpose-built for Next.js, simple, free |
| **Cons** | Less powerful, no tracing, basic features only |
| **Verdict** | Rejected - Insufficient for "full tracing" requirement |

---

## Final Solution

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Sentry Cloud (Free Tier)                      │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│  │   Error     │  │ Performance  │  │   Alert Webhook     │   │
│  │  Tracking   │  │    Tracing   │  │  (on new error)     │   │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬──────────┘   │
└─────────┼─────────────────┼────────────────────┼──────────────┘
          │                 │                    │
          ▼                 ▼                    ▼
    ┌──────────────┐  ┌──────────────┐   ┌─────────────────┐
    │ @sentry/     │  │ @sentry/     │   │ /api/sentry/    │
    │ nextjs SDK   │  │ node SDK     │   │ webhook         │
    │ (API routes) │  │ (BullMQ)     │   │                 │
    └──────────────┘  └──────────────┘   └────────┬────────┘
                                                  │
                                                  ▼
                                          ┌─────────────┐
                                          │ GitHub API  │
                                          │ (octokit)   │
                                          └──────┬──────┘
                                                 │
                                                 ▼
                                          ┌──────────────┐
                                          │ GitHub Issue │
                                          │   Created    │
                                          └──────────────┘
```

### Component Specifications

| Component | Package | Config |
|-----------|---------|--------|
| Next.js SDK | `@sentry/nextjs` | 10% production sampling |
| Worker SDK | `@sentry/node` | Manual error capture |
| Webhook Handler | Custom API route | Validates, deduplicates |
| GitHub Client | `octokit` | Creates issues |
| Deduplication | Redis (existing) | Stores fingerprints |

### Sampling Strategy

```typescript
// Sampling to stay within free tier
tracesSampleRate: {
  production: 0.1,   // 10% = ~100 traces/day
  development: 1.0,  // 100% in dev
  preview: 1.0,      // 100% in preview
}

// With 1K req/day at 10% sampling:
// - 100 traces/day * 30 days = 3K traces/month ✅
```

### GitHub Issue Flow

```
1. Sentry detects new error fingerprint
2. Sentry Alert fires → POST to /api/sentry/webhook
3. Webhook handler:
   a. Verify signature
   b. Check Redis for existing issue (deduplication)
   c. Call GitHub API to create issue
   d. Store fingerprint in Redis
   e. Return 200
4. GitHub issue created with full context
```

### Issue Template

```markdown
## 🚨 Production Error from Sentry

**Fingerprint**: `{{fingerprint}}`
**Environment**: Production
**First Seen**: {{timestamp}}
**Occurrences**: {{count}}

### Error
```
{{error.message}}
```

### Stack Trace
```
{{error.stacktrace}}
```

### Request Context
- **URL**: {{request.url}}
- **Method**: {{request.method}}
- **User Agent**: {{request.userAgent}}
- **API Key**: {{apiKeyId}}

### Sentry Link
{{sentryUrl}}

### Tags
sentry, production, auto-generated
```

---

## Trade-offs

| Decision | Benefit | Cost |
|----------|---------|------|
| Sentry Free | Industry standard, best DX | Quota limits, needs sampling |
| All errors → Issues | Zero blind spots | High noise, issue management needed |
| Custom webhook automation | Free vs paid feature | Maintenance overhead |
| 10% trace sampling | Fits quota, good coverage | May miss some slow requests |

---

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Exceed error quota | Stop capturing | Medium | Monitor usage, add alerts |
| Issue spam | Repo clutter | High | Add labels, auto-close stale |
| Webhook failure | Missing issues | Low | Retry logic, fallback email |
| Sampling misses issues | Performance blind spots | Low | Increase sample if quota allows |
| GitHub API rate limit | Issues not created | Low | Batch operations, exponential backoff |

---

## Success Criteria

- ✅ All production errors captured in Sentry
- ✅ GitHub issues created for new errors within 5 minutes
- ✅ Performance traces within 3K/month quota
- ✅ MTTD (Mean Time To Detect) < 5 minutes
- ✅ MTTR (Mean Time To Resolve) reduced by 50%
- ✅ Zero performance impact on API response times

---

## Implementation Dependencies

| Item | Status | Action |
|------|--------|--------|
| Sentry account (free) | Needed | Create at sentry.io |
| GitHub Personal Access Token | Needed | Generate with `repo:issues` scope |
| Sentry DSN | Needed | Get from Sentry project |
| Sentry webhook URL | Needed | Configure after deployment |

---

## File Structure Changes

```
src/
├── app/
│   └── api/
│       └── sentry/
│           └── webhook/
│               └── route.ts          # New: Sentry webhook handler
├── core/
│   └── services/
│       └── sentry-issue-service.ts   # New: GitHub issue creation logic
├── infrastructure/
│   └── sentry/
│       ├── server.ts                 # New: Sentry server config
│       ├── client.ts                 # New: Sentry client config
│       └── worker.ts                 # New: BullMQ worker integration
└── shared/
    └── utils/
        └── sentry-helpers.ts         # New: Tag extraction, fingerprinting

.github/
└── workflows/
    └── sentry-issue-sync.yml         # Optional: Auto-label issues

.env.local                            # Update: Add Sentry vars
sentry.server.config.ts               # New: Next.js server config
sentry.client.config.ts               # New: Next.js client config
sentry.properties                     # New: Sentry CLI config
```

---

## Environment Variables

```env
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://dsn@sentry.io/project
SENTRY_AUTH_TOKEN=your-auth-token
SENTRY_ORG=your-org
SENTRY_PROJECT=zuno-metadata

# GitHub Integration
GITHUB_TOKEN=ghp_your-personal-access-token
GITHUB_REPO=zunokit/zuno-marketplace-metadata
GITHUB_ISSUE_LABEL=sentry,error,production

# Webhook Security
SENTRY_WEBHOOK_SECRET=your-webhook-signing-secret
```

---

## Implementation Steps Summary

1. **Setup Sentry** - Create account, project, get DSN
2. **Install SDKs** - `@sentry/nextjs`, `@sentry/node`, `octokit`
3. **Configure SDK** - Server, client, worker configs with sampling
4. **Create Webhook Handler** - `/api/sentry/webhook` route
5. **Implement Issue Service** - GitHub API integration with deduplication
6. **Configure Sentry Alerts** - Webhook integration for new errors
7. **Add Performance Monitoring** - Span instrumentation for critical paths
8. **Test & Validate** - Error capture, issue creation, deduplication
9. **Monitor Quotas** - Set up alerts for usage limits

---

## Unresolved Questions

None. All requirements clarified.

---

## Next Steps

1. Review and approve this brainstorming report
2. Create detailed implementation plan with `/plan`
3. Execute implementation following development workflow
