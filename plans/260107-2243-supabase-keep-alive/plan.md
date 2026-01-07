# Implementation Plan: GitHub Actions Workflow for Supabase Keep-Alive

**Status:** pending
**Created:** 2025-01-07
**Complexity:** Low (~30 minutes)
**Priority:** Medium

---

## Problem Statement

Supabase free tier databases automatically pause after **7 days of inactivity**, causing:
- Cold start delays (5-10 seconds) on next API request
- Potential connection timeouts in dependent services
- Disrupted development workflows
- Poor user experience on first request after dormancy

**Impact:** Production database may become inaccessible during low-traffic periods, requiring manual wake-up.

---

## Solution Overview

**Approach:** GitHub Actions scheduled workflow with HTTP health check

**Method:**
- Daily cron job calling existing `/api/health` endpoint
- Zero dependencies (uses curl pre-installed on runners)
- No secrets required (public endpoint, no authentication)
- Fast execution (~2 seconds per run)

**Why This Approach:**
- ✅ Leverages existing infrastructure (no code changes)
- ✅ Minimal complexity (YAGNI principle)
- ✅ Free forever (0.4% of GitHub Actions free tier)
- ✅ Reliable and maintainable (KISS principle)

---

## Architecture

```
┌─────────────────────┐    cron (daily)    ┌──────────────────────┐
│  GitHub Actions     │ ──────────────────>│  Vercel App          │
│  (ubuntu-latest)    │   HTTP GET /api/health  (vercel.app)     │
│                     │                    └────────┬─────────────┘
│  - Runs at 00:00 UTC                    │
│  - Calls health endpoint                │
│  - Validates response                   ▼
│  - Reports status              ┌─────────────────┐
│                                 │  Supabase DB    │
└─────────────────────────────────│  (stays active) │
                                  └─────────────────┘
```

---

## Implementation Plan

### Phase 1: Workflow Creation (15 min)

**Step 1.1:** Create GitHub Actions workflow file

**File:** `.github/workflows/keep-supabase-alive.yml`

```yaml
name: Keep Supabase Database Active

on:
  schedule:
    - cron: '0 0 * * *'  # Runs daily at 00:00 UTC
  workflow_dispatch:      # Allow manual triggering from GitHub UI

jobs:
  keep-alive:
    name: Ping Health Check
    runs-on: ubuntu-latest
    timeout-minutes: 5

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Ping Health Check Endpoint
        id: health-check
        run: |
          echo "🔍 Pinging health check endpoint..."
          response=$(curl -s -o /dev/null -w "%{http_code}" "${{ vars.APP_URL }}/api/health")

          echo "📊 Response Status Code: $response"

          if [ "$response" -eq 200 ]; then
            echo "✅ Success: Database kept alive"
            echo "status=success" >> $GITHUB_OUTPUT
          else
            echo "❌ Failure: Health check returned HTTP $response"
            echo "status=failure" >> $GITHUB_OUTPUT
            exit 1
          fi

      - name: Report Success
        if: success()
        run: |
          echo "### ✅ Supabase Keep-Alive Successful" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "- **Time**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")" >> $GITHUB_STEP_SUMMARY
          echo "- **Status**: Database is active" >> $GITHUB_STEP_SUMMARY
          echo "- **Endpoint**: ${{ vars.APP_URL }}/api/health" >> $GITHUB_STEP_SUMMARY

      - name: Report Failure
        if: failure()
        run: |
          echo "### ❌ Supabase Keep-Alive Failed" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "- **Time**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")" >> $GITHUB_STEP_SUMMARY
          echo "- **Status**: Health check failed" >> $GITHUB_STEP_SUMMARY
          echo "- **Endpoint**: ${{ vars.APP_URL }}/api/health" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "⚠️ **Action Required**: Database may be paused. Check Vercel deployment."
```

**Step 1.2:** Configure GitHub repository variable

**Location:** GitHub Repository → Settings → Secrets and variables → Actions → Variables

**Variable Name:** `APP_URL`
**Variable Value:** `https://zuno-marketplace-metadata.vercel.app`

> **Note:** Replace with actual Vercel URL if different. Can be found in Vercel dashboard or by checking deployment URLs.

### Phase 2: Testing & Validation (10 min)

**Step 2.1:** Manual workflow test
1. Commit workflow file to `develop-claude` branch
2. Push to GitHub
3. Navigate to Actions tab in GitHub
4. Select "Keep Supabase Database Active" workflow
5. Click "Run workflow" → Run workflow
6. Verify execution succeeds with green checkmark

**Step 2.2:** Verify health check response
```bash
# Test manually from local machine
curl -I https://zuno-marketplace-metadata.vercel.app/api/health
# Expected: HTTP/2 200
```

**Step 2.3:** Check database activity
1. Access Supabase dashboard
2. Navigate to Database → Reports
3. Verify recent query activity
4. Confirm database shows "Active" status (not paused)

### Phase 3: Monitoring Setup (5 min)

**Step 3.1:** Enable email notifications (optional)
1. GitHub Repository → Settings → Notifications
2. Configure "Actions" notifications
3. Enable email for "Workflow failures"

**Step 3.2:** Set up monitoring
1. Monitor workflow runs for 7 days
2. Verify daily execution at 00:00 UTC
3. Confirm no database auto-pause occurs
4. Check GitHub Actions usage stays within limits

---

## Technical Specifications

### Health Check Endpoint Analysis

**File:** `src/app/api/health/route.ts`

**Current Implementation:**
```typescript
export const GET = ApiWrapper.create(
  async (input, context) => {
    const healthCheckUseCase = new HealthCheckUseCase();
    const result = await healthCheckUseCase.execute();
    return result;
  },
  {
    auth: { required: false } // Publicly accessible
  }
);
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-01-07T00:00:00Z",
    "services": {
      "database": "healthy",
      "redis": "healthy",
      "imagekit": "healthy",
      "pinata": "healthy",
      "queue": "healthy"
    }
  }
}
```

**Perfect for our use case:**
- ✅ No authentication required (public endpoint)
- ✅ Checks database connectivity (keeps it active)
- ✅ Returns HTTP 200 on success
- ✅ Fast execution (< 1 second)
- ✅ Production-ready and stable

### GitHub Actions Workflow Configuration

**Schedule:**
- Cron Expression: `0 0 * * *`
- Frequency: Daily at 00:00 UTC
- Safety Margin: 6x buffer (7-day pause threshold)

**Resource Usage:**
- Runs: ~30 times/month
- Execution Time: ~2 seconds/run
- Total Usage: ~60 seconds/month
- Free Tier Impact: 0.4% (2000 minutes available)

**Cost:** Free forever

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `.github/workflows/keep-supabase-alive.yml` | CREATE | GitHub Actions workflow file |

**Total Files:** 1 new file

---

## Environment Variables & Configuration

### GitHub Repository Variables (Not Secrets)

**Required Variables:**

| Variable Name | Value | Example | Notes |
|---------------|-------|---------|-------|
| `APP_URL` | Production Vercel URL | `https://zuno-marketplace-metadata.vercel.app` | Auto-generated by Vercel |

**How to Add:**
1. Go to Repository → Settings → Secrets and variables → Actions
2. Click "Variables" tab
3. Click "New repository variable"
4. Name: `APP_URL`
5. Value: `<your-vercel-url>`
6. Click "Add variable"

### No Secrets Required

This solution intentionally uses **repository variables** (not secrets) because:
- Public endpoint requires no authentication
- URL is not sensitive information
- Simplifies configuration and debugging

---

## Success Criteria

✅ **Functional Requirements:**
- [ ] Workflow runs automatically every 24 hours at 00:00 UTC
- [ ] Successfully calls `/api/health` endpoint
- [ ] Receives HTTP 200 response
- [ ] Database remains active (no 7-day auto-pause)
- [ ] Workflow fails fast if endpoint returns non-200 status
- [ ] Manual trigger available via `workflow_dispatch`
- [ ] GitHub Actions summary shows clear success/failure status

✅ **Non-Functional Requirements:**
- [ ] Execution time < 10 seconds
- [ ] Zero dependencies (no npm install)
- [ ] No secrets required (uses public endpoint)
- [ ] GitHub Actions usage < 1% of free tier
- [ ] Clear error messages in workflow logs

✅ **Monitoring Requirements:**
- [ ] Email notifications enabled for failures
- [ ] Workflow runs visible in Actions tab
- [ ] Success/failure clearly indicated

---

## Risk Assessment & Mitigation

| Risk | Probability | Impact | Mitigation Strategy |
|------|------------|--------|---------------------|
| **Vercel app goes down** | Low | High | GitHub Actions fails → notification sent → manual intervention |
| **APP_URL incorrect** | Low | Medium | Clear error message in workflow logs → update variable |
| **Health check endpoint changes** | Very Low | Low | Endpoint is stable, part of core API (unlikely to change) |
| **GitHub Actions outage** | Very Low | Low | 99.95% uptime SLA, minimal risk |
| **Rate limiting from health checks** | Very Low | Low | Only 30 requests/month, negligible |
| **Supabase policy changes** | Low | Medium | Monitor Supabase changelog, adapt if needed |
| **Workflow fails silently** | Low | Medium | Email notifications enabled + manual monitoring |

### Failure Handling Procedure

**If workflow fails:**
1. GitHub Actions marks run as ❌ failed
2. Step summary shows failure details
3. GitHub sends email notification (if enabled)
4. **Immediate Action:**
   - Check Vercel deployment status
   - Verify `/api/health` endpoint is accessible
   - Manually trigger workflow via `workflow_dispatch`
5. **If database paused:**
   - Access Supabase dashboard
   - Navigate to Database
   - Click "Resume" to wake database
   - Re-trigger workflow to verify

**Monitoring:**
- Check workflow runs: Actions → Keep Supabase Database Active
- Green ✅ = Database active, everything working
- Red ❌ = Investigation required

---

## Testing Strategy

### Unit Testing (Not Required)

No unit tests needed - this is infrastructure automation, not application code.

### Integration Testing

**Manual Test Checklist:**

1. **Workflow Creation Test**
   - [ ] Create `.github/workflows/keep-supabase-alive.yml`
   - [ ] Verify YAML syntax is valid
   - [ ] Commit and push to GitHub

2. **Variable Configuration Test**
   - [ ] Add `APP_URL` variable to GitHub
   - [ ] Verify variable is accessible in workflow

3. **Manual Trigger Test**
   - [ ] Navigate to Actions tab
   - [ ] Select "Keep Supabase Database Active" workflow
   - [ ] Click "Run workflow"
   - [ ] Monitor execution in real-time
   - [ ] Verify success message appears

4. **Health Check Endpoint Test**
   ```bash
   curl -I https://zuno-marketplace-metadata.vercel.app/api/health
   ```
   - [ ] Verify HTTP 200 response
   - [ ] Check response time < 2 seconds

5. **Database Activity Test**
   - [ ] Access Supabase dashboard
   - [ ] Navigate to Database → Reports
   - [ ] Verify recent query activity logged
   - [ ] Confirm database status: "Active"

### Automated Testing (Scheduled)

**7-Day Validation Period:**
- Monitor workflow runs daily
- Verify execution at 00:00 UTC each day
- Confirm no database auto-pause occurs
- Check GitHub Actions usage metrics

---

## Deployment Strategy

### Deployment Steps

1. **Pre-Deployment**
   - [ ] Verify Vercel deployment URL
   - [ ] Test `/api/health` endpoint manually
   - [ ] Confirm Supabase database is currently active

2. **Deployment**
   - [ ] Create workflow file locally
   - [ ] Add `APP_URL` variable to GitHub
   - [ ] Commit workflow file to `develop-claude` branch
   - [ ] Push to GitHub remote
   - [ ] Verify workflow appears in Actions tab

3. **Post-Deployment**
   - [ ] Trigger manual workflow run
   - [ ] Verify success (green checkmark)
   - [ ] Check workflow logs for errors
   - [ ] Enable email notifications for failures
   - [ ] Set calendar reminder to check in 7 days

### Rollback Procedure

**If issues occur:**
1. Delete workflow file: `.github/workflows/keep-supabase-alive.yml`
2. Commit and push deletion
3. Workflow will no longer execute

**Note:** Rollback is safe - no application code changes to revert.

---

## Maintenance & Operations

### Ongoing Maintenance

**Weekly (First 4 weeks):**
- Check workflow runs for success
- Verify GitHub Actions usage
- Monitor database status in Supabase

**Monthly (After stable):**
- Review workflow execution logs
- Check for any failures
- Verify GitHub Actions usage remains acceptable

**As Needed:**
- Update `APP_URL` if Vercel deployment changes
- Adjust schedule if needed (modify cron expression)
- Troubleshoot any failures

### Monitoring Checklist

**Daily Monitoring (Automated):**
- ✅ Workflow runs at 00:00 UTC
- ✅ Returns HTTP 200 response
- ✅ Database remains active

**Weekly Review (Manual):**
- Check Actions tab for recent workflow runs
- Verify no red (failed) runs
- Confirm database status in Supabase dashboard

**Monthly Review (Manual):**
- Review GitHub Actions usage metrics
- Ensure cost remains free
- Check for any workflow performance issues

---

## Troubleshooting Guide

### Common Issues & Solutions

**Issue 1: Workflow fails with "curl: (6) Could not resolve host"**
- **Cause:** `APP_URL` variable is incorrect or not set
- **Solution:** Verify `APP_URL` variable in GitHub repository settings
- **Example:** Should be `https://zuno-marketplace-metadata.vercel.app`

**Issue 2: Workflow fails with HTTP 404**
- **Cause:** Health check endpoint not deployed or incorrect path
- **Solution:**
  - Verify Vercel deployment is successful
  - Test endpoint manually: `curl -I https://your-url.vercel.app/api/health`
  - Check Vercel deployment logs for errors

**Issue 3: Workflow succeeds but database still pauses**
- **Cause:** Health check not reaching database (cached response)
- **Solution:**
  - Verify health check endpoint actually queries database
  - Check Supabase logs for incoming connections
  - Increase frequency to every 12 hours: `cron: '0 */12 * * *'`

**Issue 4: Workflow not running on schedule**
- **Cause:** GitHub Actions schedule delay or misconfiguration
- **Solution:**
  - GitHub Actions may delay scheduled workflows up to 1 hour (normal)
  - Verify cron syntax: `0 0 * * *` (daily at midnight UTC)
  - Check GitHub status page for outages

**Issue 5: Workflow runs but no email notification on failure**
- **Cause:** Email notifications not configured
- **Solution:**
  - Go to Repository → Settings → Notifications
  - Enable "Actions" notifications
  - Subscribe to "Workflow failures"

---

## Alternative Approaches (Rejected)

### ❌ Direct Database Query Approach
**Why Rejected:**
- Requires Supabase service role key (security risk)
- Installs supabase-js every run (slow: ~30s)
- Bypasses application layer
- Doesn't validate actual app health

### ❌ Third-Party Cron Services
**Why Rejected:**
- External service dependency
- Vendor lock-in risk
- Limited free tiers
- Another account to manage
- Privacy concerns

### ❌ Serverless Functions (Vercel Cron)
**Why Rejected:**
- Overkill for simple HTTP request
- More complex configuration
- Not free on all platforms

---

## References

### Documentation
- **GitHub Actions Documentation:** https://docs.github.com/en/actions
- **Cron Syntax:** https://crontab.guru/#0_0_*_*_*
- **Supabase Free Tier Limits:** https://supabase.com/docs/guides/platform/access-control/resource-limits

### Related Files
- **Brainstorm Report:** `plans/reports/brainstormer-260107-2236-supabase-keep-alive.md`
- **Health Check Endpoint:** `src/app/api/health/route.ts`
- **Health Check Use Case:** `src/core/use-cases/health/health-check.use-case.ts`

### Environment Files
- **Environment Template:** `.env.example`
- **README:** `README.md` (deployment section)

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| **Phase 1: Workflow Creation** | 15 min | None |
| **Phase 2: Testing & Validation** | 10 min | Phase 1 complete |
| **Phase 3: Monitoring Setup** | 5 min | Phase 2 complete |
| **Phase 4: 7-Day Validation** | 7 days | Phase 3 complete |

**Total Implementation Time:** 30 minutes
**Total Validation Time:** 7 days (to confirm no auto-pause)

---

## Open Questions

❓ **Question 1:** What is the actual Vercel deployment URL?
- *Current placeholder:* `https://zuno-marketplace-metadata.vercel.app`
- *Action required:* Verify in Vercel dashboard before deployment

❓ **Question 2:** Should we create a separate workflow for development/staging environment?
- *Current scope:* Production only
- *Future consideration:* Could extend to dev/staging if needed

❓ **Question 3:** Do we need a backup strategy if GitHub Actions fails?
- *Current approach:* Email notifications + manual trigger
- *Future consideration:** External monitoring service (e.g., UptimeRobot)

---

## Next Steps

1. **Immediate (Now):**
   - Verify Vercel deployment URL
   - Create workflow file locally
   - Add `APP_URL` variable to GitHub

2. **Short-term (This week):**
   - Deploy workflow to GitHub
   - Run manual test
   - Enable email notifications

3. **Long-term (Next 7 days):**
   - Monitor daily workflow runs
   - Verify database remains active
   - Document any issues encountered

---

## Approval

**Ready for Implementation:** ✅ Yes

**Reasoning:**
- Solution is low-risk and reversible
- Uses existing infrastructure
- Zero application code changes
- Free and maintainable
- Follows YAGNI, KISS, DRY principles

**Estimated Cost:** $0/month (GitHub Actions free tier)

**Estimated Effort:** 30 minutes

---

**Plan End**
