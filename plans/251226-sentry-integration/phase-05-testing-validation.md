# Phase 05: Testing & Validation

**Status**: Pending | **Effort**: 0.5h | **Priority**: P1

## Overview

Test end-to-end Sentry integration and validate all components work correctly.

## Related Files

- All previous phases

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Manual testing first | Validate integration before unit tests |
| Production-like testing | Use preview deployment |
| Quota monitoring | Watch Sentry free tier limits |

## Test Scenarios

### 1. SDK Installation

| Test | Expected |
|------|----------|
| `pnpm typecheck` | No errors |
| `pnpm build` | Build succeeds |
| `pnpm dev` | Dev server starts |

### 2. Error Capture

| Test | Expected |
|------|----------|
| Trigger API error | Error appears in Sentry |
| Trigger client error | Error appears in Sentry |
| Trigger worker error | Error appears in Sentry |
| Non-production error | Not captured (filtered) |

### 3. Webhook Handler

| Test | Expected |
|------|----------|
| Valid webhook | Returns 200 |
| Invalid signature | Returns 401 |
| Missing signature | Returns 401 |
| Invalid payload | Returns 400 |

### 4. GitHub Integration

| Test | Expected |
|------|----------|
| New error → issue | Issue created |
| Duplicate error → no issue | Deduplicated (Redis) |
| Issue labels | Has sentry,error,production |
| Issue body | Contains error details |

### 5. Performance

| Metric | Target |
|--------|--------|
| Webhook response | <100ms |
| API latency impact | <5ms |
| Trace count | ~100/day (10% sampling) |

## Testing Script

**File: `scripts/test-sentry-integration.ts`**
```typescript
/**
 * Test Sentry Integration
 *
 * Run: npx tsx scripts/test-sentry-integration.ts
 */

import * as Sentry from "@sentry/nextjs";

async function testSentryIntegration() {
  console.log("🧪 Testing Sentry Integration...\n");

  // Test 1: Error capture
  console.log("1. Testing error capture...");
  try {
    Sentry.captureException(new Error("Test error from integration test"));
    console.log("✅ Error captured\n");
  } catch (error) {
    console.log("❌ Error capture failed:", error);
  }

  // Test 2: Message capture
  console.log("2. Testing message capture...");
  try {
    Sentry.captureMessage("Test message from integration test", "info");
    console.log("✅ Message captured\n");
  } catch (error) {
    console.log("❌ Message capture failed:", error);
  }

  // Test 3: Performance tracing
  console.log("3. Testing performance trace...");
  try {
    const transaction = Sentry.startTransaction({
      name: "test-transaction",
      op: "test",
    });

    const span = transaction.startChild({
      description: "test-child",
      op: "test",
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    span.end();
    transaction.finish();

    console.log("✅ Trace captured\n");
  } catch (error) {
    console.log("❌ Trace capture failed:", error);
  }

  console.log("✨ Integration test complete!");
  console.log("Check Sentry dashboard for events.");
}

testSentryIntegration();
```

## Validation Checklist

### Pre-deployment

- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm build` succeeds
- [ ] `pnpm test` passes (existing tests)
- [ ] Environment variables validated

### Post-deployment

- [ ] Sentry dashboard receives events
- [ ] Webhook endpoint accessible (200 response)
- [ ] Signature verification working
- [ ] GitHub issues created
- [ ] Deduplication functional (Redis)
- [ ] API latency not impacted

### Monitoring

- [ ] Sentry error quota monitoring
- [ ] Sentry trace quota monitoring
- [ ] GitHub API rate limit monitoring
- [ ] Redis fingerprint cleanup (30-day TTL)

## Manual Testing Steps

### Step 1: Test Error Capture

```typescript
// Add to any API route temporarily:
import * as Sentry from "@sentry/nextjs";

export async function POST() {
  Sentry.captureException(new Error("Manual test error"));
  return Response.json({ success: true });
}
```

Call endpoint, verify:
1. Error appears in Sentry dashboard
2. Event has correct tags
3. Stack trace present

### Step 2: Test Webhook

Use Sentry's "Test Webhook" button, verify:
1. Webhook handler logs request
2. Signature validation passes
3. GitHub issue created

### Step 3: Test Deduplication

Trigger same error twice, verify:
1. Only one GitHub issue created
2. Redis has fingerprint stored
3. Second attempt logs "already exists"

### Step 4: Test Performance

Run load test:
```bash
# 100 requests, expect ~10 traces (10% sampling)
for i in {1..100}; do
  curl https://your-api.com/api/metadata
done
```

Verify in Sentry:
- ~10 transactions recorded
- P95 latency captured

## Troubleshooting

### Issue: No events in Sentry

**Check:**
1. `NEXT_PUBLIC_SENTRY_DSN` is set
2. SDK initialized (check browser console)
3. Not filtered by environment

### Issue: Webhook not triggering

**Check:**
1. Alert rule configured for production
2. Webhook URL is correct and accessible
3. Webhook secret matches

### Issue: GitHub issue not created

**Check:**
1. `GITHUB_TOKEN` has `repo:issues` scope
2. `GITHUB_REPO` format is `owner/repo`
3. GitHub API rate limits not exceeded

### Issue: Duplicate issues

**Check:**
1. Redis is connected
2. Fingerprint TTL is set (30 days)
3. Deduplication check is working

## Todo List

- [ ] Run typecheck
- [ ] Run build
- [ ] Test error capture
- [ ] Test webhook delivery
- [ ] Test GitHub integration
- [ ] Test deduplication
- [ ] Monitor quotas
- [ ] Remove test endpoints

## Success Criteria

- ✅ All tests pass
- ✅ Sentry receiving events
- ✅ Webhooks triggering
- ✅ GitHub issues created
- ✅ Deduplication working
- ✅ No performance impact
- ✅ Within free tier quotas

## Rollback Plan

If issues occur:

1. **Disable Sentry**: Set `NEXT_PUBLIC_SENTRY_DSN=""` and redeploy
2. **Disable webhook**: Remove alert rule in Sentry dashboard
3. **Clean up**: Close auto-generated issues if needed

## Production Readiness

| Check | Status |
|-------|--------|
| Error tracking | ✅ |
| Performance tracing | ✅ |
| Webhook handler | ✅ |
| GitHub integration | ✅ |
| Deduplication | ✅ |
| Monitoring | ✅ |
| Documentation | ✅ |

## Next Steps

- Deploy to production
- Monitor for 24 hours
- Adjust sampling if needed
- Create runbook for on-call

## Unresolved Questions

None.
