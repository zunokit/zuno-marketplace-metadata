# Infisical Integration Brainstorm
**Date**: 2025-02-01

## Problem Statement

Replace local `.env` file-based secrets management with Infisical Cloud for centralized, secure secrets management across all environments (development, staging, production).

**Current State:**
- 27+ environment variables stored in `.env.local` files
- Secrets validated via Zod schema in `src/shared/config/env.ts`
- Manual secret rotation
- No centralized secret management
- Risk of secrets in git history or local copies
- No audit trail for secret access

**Target State:**
- All secrets managed in Infisical Cloud
- Automatic secret injection via CLI
- Automated secret rotation
- Centralized access control and audit logging
- Consistent secrets across team environments

## Requirements

### Functional Requirements
- Manage all current environment variables in Infisical Cloud
- Support dev, staging, production environments
- Automatic secret rotation (downtime acceptable)
- Integration with Vercel deployment
- Manual CLI usage for local development

### Non-Functional Requirements
- Zero/minimal code changes to application
- Maintain existing Zod validation in `src/shared/config/env.ts`
- Zero or minimal downtime during secret rotation
- Fast integration timeline
- Backward compatible with current deployment flow

### Constraints
- Vercel deployment platform
- Infisical Cloud (SaaS), not self-hosted
- CLI-based injection approach
- All environments must use Infisical

## Evaluated Approaches

### Option A: Infisical CLI Only (RECOMMENDED) ✅

**Approach:**
Use Infisical CLI to inject secrets into environment at runtime, before Next.js application starts. No code changes required - application continues to read from `process.env` as it does today.

**How It Works:**
1. Infisical CLI installed globally or via npx
2. CLI fetches secrets from Infisical Cloud using service token
3. CLI sets environment variables and spawns child process (Next.js)
4. Application runs with injected secrets
5. For rotation: Update secret in Infisical, restart application (triggers CLI re-fetch)

**Vercel Integration:**
- Add Infisical CLI as build dependency
- Create `vercel.json` or `next.config.js` pre-build hook
- CLI injects secrets before `pnpm build`
- CLI runs on deployment environment before `pnpm start`

**Pros:**
- **Zero code changes** to application
- **Fast implementation** (1-2 days)
- **Minimal complexity** - CLI handles everything
- **Backward compatible** - existing code unchanged
- **Simple rollback** - remove CLI wrapper, restore `.env` files
- **TypeScript validation preserved** - Zod schema still validates secrets
- **Easy to understand** - clear separation between secrets and app logic

**Cons:**
- **Application restart required** for secret rotation
- **Secrets in memory** - injected into process environment
- **Build-time secrets** - CLI must run during build AND runtime
- **Vercel build limits** - CLI execution time counts towards build duration
- **Cold start impact** - CLI adds latency on serverless cold starts

**Implementation Effort:** Low
**Risk:** Low
**Maintenance:** Low

---

### Option B: CLI + Hot-Reload Wrapper

**Approach:**
Same as Option A, but add a wrapper script that monitors Infisical for secret changes and triggers hot-reload without full application restart.

**How It Works:**
1. Infisical CLI injects initial secrets
2. Wrapper script monitors Infisical webhook or polls for changes
3. On secret update: Inject new secrets, send hot-reload signal to app
4. Application reloads configuration without full restart

**Pros:**
- **Near-zero downtime** during secret rotation
- **Better for high-availability** requirements
- **Minimal code changes** - wrapper outside app

**Cons:**
- **High complexity** - monitoring, signaling, state management
- **Race conditions** - secrets updating while requests in-flight
- **Not needed per user requirements** - downtime acceptable
- **Over-engineering** for current use case

**Implementation Effort:** Medium-High
**Risk:** Medium
**Maintenance:** High

---

### Option C: Next.js SDK (Rejected)

**Approach:**
Use Infisical Next.js SDK to fetch secrets at runtime within application code.

**How It Works:**
1. Install `@infisical/sdk` package
2. Replace `process.env` reads in `src/shared/config/env.ts` with SDK calls
3. SDK fetches secrets from Infisical Cloud on startup
4. Application validates secrets with existing Zod schema

**Pros:**
- **Runtime secret updates** - can fetch secrets on demand
- **No CLI dependency** in deployment pipeline
- **Type-safe** - SDK provides TypeScript types
- **Hot reload possible** - re-fetch secrets without restart

**Cons:**
- **Code changes required** - modify `src/shared/config/env.ts` and all `process.env` accesses
- **Breaking changes** - existing infrastructure clients need updates
- **More complex** - SDK initialization, caching, error handling
- **Slower startup** - SDK adds network latency
- **Higher risk** - more surface area for bugs
- **Violates KISS** - CLI approach is simpler for same result

**Implementation Effort:** Medium
**Risk:** Medium
**Maintenance:** Medium

**Why Rejected:**
User explicitly chose CLI approach for minimal code changes. SDK requires significant refactoring without clear benefits for this use case.

---

## Recommended Solution: Option A - Infisical CLI Only

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Infisical Cloud                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                     │
│  │   Dev   │  │ Staging │  │  Prod   │                     │
│  └─────────┘  └─────────┘  └─────────┘                     │
└─────────────────────┬───────────────────────────────────────┘
                      │ Service Token
                      ▼
              ┌───────────────┐
              │ Infisical CLI │
              └───────┬───────┘
                      │ Injects secrets
                      ▼
              ┌───────────────┐
              │   process.env │
              └───────┬───────┘
                      │
    ┌─────────────────┼─────────────────┐
    ▼                 ▼                 ▼
┌──────────┐    ┌──────────┐    ┌──────────┐
│ Next.js  │    │   API    │    │ Workers  │
│ App      │    │  Routes  │    │  BullMQ  │
└────┬─────┘    └────┬─────┘    └────┬─────┘
     │               │               │
     └───────────────┼───────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │ src/shared/config/    │
         │ env.ts (Zod Schema)  │
         └───────────────────────┘
```

### Implementation Plan

#### Phase 1: Infisical Setup (4 hours)

**Tasks:**
1. Create Infisical Cloud account
2. Create project: `zuno-marketplace-metadata`
3. Create environments: `dev`, `staging`, `production`
4. Generate service tokens for each environment
5. Store service tokens securely (Vercel env vars for production, local env for dev)

**Secrets to Migrate:**
```env
# Database
DATABASE_URL
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# Redis
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN

# ImageKit
IMAGEKIT_PUBLIC_KEY
IMAGEKIT_PRIVATE_KEY
IMAGEKIT_URL_ENDPOINT

# Pinata
PINATA_JWT
PINATA_GATEWAY_URL

# Auth
BETTER_AUTH_SECRET
BETTER_AUTH_URL

# Admin
ADMIN_EMAIL
ADMIN_PASSWORD

# App Config
NODE_ENV
CORS_ORIGINS
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_API_VERSION
NEXT_PUBLIC_API_URL

# Monitoring
CRON_SECRET
LOG_LEVEL
NEXT_PUBLIC_SENTRY_DSN
SENTRY_AUTH_TOKEN
SENTRY_ORG
SENTRY_PROJECT
SENTRY_TRACES_SAMPLE_RATE
SENTRY_PROFILES_SAMPLE_RATE

# Features
ENABLE_PUBLIC_KEY
API_KEYS
```

#### Phase 2: Local Development Setup (2 hours)

**Tasks:**
1. Install Infisical CLI globally:
   ```bash
   npm install -g infisical
   # or
   brew install infisical/tap/infisical
   ```

2. Login to Infisical:
   ```bash
   infisical login
   ```

3. Update `package.json` scripts:
   ```json
   {
     "scripts": {
       "dev": "infisical run --env=dev -- pnpm dev",
       "dev:staging": "infisical run --env=staging -- pnpm dev",
       "workers": "infisical run --env=dev -- pnpm workers",
       "workers:staging": "infisical run --env=staging -- pnpm workers"
     }
   }
   ```

4. Update README.md with new development workflow:
   ```bash
   # Development now requires Infisical
   pnpm dev              # Uses secrets from Infisical dev environment
   pnpm dev:staging      # Uses secrets from Infisical staging environment
   ```

**Note:** Existing `.env.local` becomes obsolete. Move it to `.env.local.backup` before testing.

#### Phase 3: Vercel Integration (3 hours)

**Tasks:**
1. Install Infisical CLI as dev dependency:
   ```bash
   pnpm add -D infisical
   ```

2. Create `vercel.json` for build-time injection:
   ```json
   {
     "buildCommand": "infisical run --env=$VERCEL_ENV -- pnpm build",
     "devCommand": "infisical run --env=$VERCEL_ENV -- pnpm dev",
     "installCommand": "pnpm install",
     "framework": null
   }
   ```

3. Configure Vercel environment variables:
   ```env
   # Required for CLI authentication
   INFISICAL_TOKEN=<service-token-for-environment>
   INFISICAL_PROJECT_ID=<project-id-from-infisical>
   INFISICAL_ENV=production  # or staging
   ```

4. Update `next.config.js` for runtime injection (if needed):
   ```js
   // next.config.js
   const { execSync } = require('child_process');

   // Only inject in production, development handled by npm scripts
   if (process.env.NODE_ENV === 'production') {
     try {
       const secrets = execSync('infisical run --env=production -- printenv').toString();
       secrets.split('\n').forEach(line => {
         const [key, value] = line.split('=');
         if (key && value) process.env[key] = value;
       });
     } catch (error) {
       console.error('Failed to inject secrets from Infisical:', error);
     }
   }
   ```

**Alternative:** Use Vercel's build hooks in `vercel.json`:
```json
{
  "build": {
    "env": {
      "INFISICAL_TOKEN": "@infisical-token"
    }
  }
}
```

#### Phase 4: Testing & Validation (3 hours)

**Tasks:**
1. **Local Development Testing:**
   ```bash
   # Start with Infisical
   pnpm dev
   # Verify all services connect (DB, Redis, ImageKit, Pinata)
   # Test API endpoints with authentication
   ```

2. **Secret Rotation Testing:**
   - Update a secret in Infisical dev environment
   - Restart application: `pnpm dev`
   - Verify new secret is used
   - Document rotation procedure

3. **Vercel Preview Testing:**
   - Create Vercel preview deployment
   - Verify secrets injected from staging environment
   - Test all integrations

4. **Production Testing:**
   - Deploy to production with care
   - Monitor for CLI execution issues
   - Validate all services work correctly

#### Phase 5: Documentation & Cleanup (2 hours)

**Tasks:**
1. Update `README.md`:
   - Remove `.env.local` setup instructions
   - Add Infisical setup guide
   - Update development workflow
   - Add secret rotation procedure

2. Update `docs/deployment-guide.md`:
   - Add Infisical configuration
   - Document Vercel integration
   - Add troubleshooting section

3. Clean up obsolete files:
   - Archive `.env.local.example` → `.env.local.example.backup`
   - Remove hardcoded secrets from code if any found

4. Update `.gitignore`:
   ```
   # Keep existing ignores
   # Infisical CLI cache
   .infisical/
   ```

### Success Metrics

**Functional:**
- [ ] All 27+ secrets successfully injected from Infisical
- [ ] Application starts without errors in all environments
- [ ] All external services (DB, Redis, ImageKit, Pinata) connect successfully
- [ ] Secret rotation works with application restart
- [ ] Vercel deployments complete successfully

**Performance:**
- [ ] Application cold start latency < 5 seconds (including CLI)
- [ ] Vercel build time increase < 30 seconds
- [ ] No noticeable performance degradation in API responses

**Operational:**
- [ ] Zero code changes to application logic
- [ ] Team can onboard new developers in < 10 minutes
- [ ] Secret access audit logs available in Infisical
- [ ] Rollback plan tested (can revert to .env files in < 1 hour)

## Risks & Mitigation

### Risk 1: Vercel Build Timeout
**Severity:** Medium
**Probability:** Low

**Scenario:**
Infisical CLI execution adds latency to Vercel builds, potentially exceeding timeout limits for large projects.

**Mitigation:**
- Test CLI execution time in staging first
- Use Vercel CLI cache for secrets: `infisical run --cache=true`
- Configure longer build timeout in `vercel.json`
- Fallback: Move CLI to runtime injection only (build uses Vercel env vars)

**Contingency:**
If timeout persists, use Vercel Environment Variables for build-time secrets, Infisical only for runtime.

### Risk 2: Secret Rotation Downtime
**Severity:** Medium
**Probability:** Medium

**Scenario:**
Application restart during secret rotation causes brief downtime (1-5 seconds per restart).

**Mitigation:**
- Schedule rotations during low-traffic periods
- Use Vercel's zero-downtime deployments (multiple instances)
- Document rotation procedure for team awareness

**Acceptance:**
User explicitly stated downtime is acceptable during development. Production can use zero-downtime deployments.

### Risk 3: CLI Authentication Failure
**Severity:** High
**Probability:** Low

**Scenario:**
Infisical service token expires or becomes invalid, causing application to fail at startup.

**Mitigation:**
- Set up token expiration monitoring in Infisical
- Create automated token rotation script
- Alert team before token expiration
- Document manual token update procedure

**Contingency:**
Store token in Vercel Environment Variables with long expiry, update via dashboard.

### Risk 4: Network Latency
**Severity:** Low
**Probability:** Low

**Scenario:**
Infisical API network calls add latency to application startup, affecting cold starts.

**Mitigation:**
- Use CLI caching: `--cache=t1h` (1 hour cache)
- Deploy Vercel functions in regions close to Infisical Cloud (US)
- Monitor cold start metrics

### Risk 5: Secret Exposure in Logs
**Severity:** Medium
**Probability**: Low

**Scenario:**
CLI or application logs secrets inadvertently, exposing them in Vercel logs.

**Mitigation:**
- Verify CLI `--silent` flag to suppress secrets in output
- Ensure existing log filtering in `logger.ts` covers all secrets
- Test Vercel log viewer for secret exposure

## Alternatives Considered & Rejected

### Rejected: HashiCorp Vault
**Reason:** Over-engineering for this use case. Vault requires infrastructure setup, higher complexity, steeper learning curve. Infisical provides same functionality with better developer experience.

### Rejected: AWS Secrets Manager
**Reason:** Vendor lock-in to AWS. Infisical is cloud-agnostic, better UI, built for application secrets. AWS requires IAM roles, more complex integration.

### Rejected: Doppler
**Reason:** Good alternative, but Infisical has better CLI features and more comprehensive platform. Chose Infisical based on CLI injection simplicity.

### Rejected: Environment Variables Only (Status Quo)
**Reason:** No audit trail, manual rotation, risk of leaks, no centralized management. Security and operational overhead justify migration.

## Implementation Timeline

**Total Effort:** 14-16 hours over 3-4 days

| Phase | Tasks | Duration | Owner |
|-------|-------|----------|-------|
| 1 | Infisical Setup | 4h | DevOps/Backend |
| 2 | Local Dev Setup | 2h | Backend |
| 3 | Vercel Integration | 3h | DevOps |
| 4 | Testing & Validation | 3h | QA/Backend |
| 5 | Documentation & Cleanup | 2h | Backend |

**Dependencies:**
- Phase 2 requires Phase 1 completion
- Phase 3 requires Phase 1 completion
- Phase 4 requires Phase 2 & 3 completion
- Phase 5 requires Phase 4 completion

**Parallel Work:** Phase 2 and 3 can proceed in parallel after Phase 1

## Cost Considerations

**Infisical Cloud Pricing (as of 2025):**
- Free tier: Up to 3 projects, 50 secrets, 10,000 API calls/month
- Team tier: $10/user/month, unlimited secrets, 100,000 API calls/month
- Enterprise: Custom pricing

**Current Usage:**
- 1 project
- 27 secrets
- Estimated: ~500 CLI injections/day (dev + staging + production)

**Recommendation:** Start with free tier, upgrade to Team tier if limits exceeded.

**Vercel Costs:** No additional costs (CLI uses existing build time allocation)

## Next Steps

1. **Confirm Approach:** User agrees with Option A recommendation
2. **Create Implementation Plan:** Run `/plan` command with this brainstorm summary
3. **Execute Implementation:** Follow plan phases
4. **Monitor & Iterate:** Track metrics, adjust as needed

## Unresolved Questions

None identified. All requirements and constraints are clear.

## Summary

**Recommended Solution:** Option A - Infisical CLI Only

**Key Benefits:**
- Zero code changes to application
- Fast implementation (2-3 days)
- Minimal complexity and risk
- Backward compatible
- Easy rollback

**Key Trade-offs:**
- Application restart required for secret rotation (acceptable per requirements)
- Slight build-time overhead for Vercel deployments
- Secrets in process memory (same as current approach)

**Decision Criteria:**
- ✅ Meets all functional requirements
- ✅ Fits all constraints (Vercel, CLI, all environments)
- ✅ Aligns with KISS/YAGNI/DRY principles
- ✅ Low implementation effort and risk
- ✅ Easy to maintain and extend

**Verdict:** Proceed with Option A implementation.
