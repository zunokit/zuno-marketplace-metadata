# Phase 1 Completion Checklist

## Task 1.1: Create Infisical Cloud Account
- [ ] Account created at https://infisical.com/signup
- [ ] Email verified
- [ ] 2FA enabled (recommended)
- [ ] Can log into https://app.infisical.com

## Task 1.2: Create Project & Environments
- [ ] Project created: `zuno-marketplace-metadata`
- [ ] Environment `dev` created
- [ ] Environment `staging` created
- [ ] Environment `production` created
- [ ] Project ID noted and saved

## Task 1.3: Generate Service Tokens
- [ ] Dev service token created
- [ ] Staging service token created
- [ ] Production service token created
- [ ] All tokens stored in password manager
- [ ] Token expiration dates noted

## Task 1.4: Migrate Secrets to Infisical

### Development Environment (27 secrets)
- [ ] DATABASE_URL
- [ ] SUPABASE_URL
- [ ] SUPABASE_ANON_KEY
- [ ] SUPABASE_SERVICE_ROLE_KEY
- [ ] UPSTASH_REDIS_REST_URL
- [ ] UPSTASH_REDIS_REST_TOKEN
- [ ] IMAGEKIT_PUBLIC_KEY
- [ ] IMAGEKIT_PRIVATE_KEY
- [ ] IMAGEKIT_URL_ENDPOINT
- [ ] PINATA_JWT
- [ ] PINATA_GATEWAY_URL
- [ ] NODE_ENV
- [ ] CORS_ORIGINS
- [ ] NEXT_PUBLIC_APP_URL
- [ ] BETTER_AUTH_SECRET
- [ ] BETTER_AUTH_URL
- [ ] ADMIN_EMAIL
- [ ] ADMIN_PASSWORD
- [ ] LOG_LEVEL
- [ ] CRON_SECRET
- [ ] ENABLE_PUBLIC_KEY
- [ ] API_KEYS
- [ ] NEXT_PUBLIC_API_VERSION
- [ ] NEXT_PUBLIC_API_URL
- [ ] NEXT_PUBLIC_SENTRY_DSN
- [ ] SENTRY_AUTH_TOKEN
- [ ] SENTRY_ORG
- [ ] SENTRY_PROJECT
- [ ] SENTRY_TRACES_SAMPLE_RATE

### Staging Environment (27 secrets)
- [ ] All 27 secrets added
- [ ] Values updated for staging
- [ ] `NODE_ENV=production`
- [ ] CORS origins updated
- [ ] URLs updated to staging

### Production Environment (27 secrets)
- [ ] All 27 secrets added
- [ ] Values updated for production
- [ ] `NODE_ENV=production`
- [ ] CORS origins updated
- [ ] URLs updated to production
- [ ] `BETTER_AUTH_SECRET` regenerated (NEW)
- [ ] `CRON_SECRET` regenerated (NEW)
- [ ] `ADMIN_PASSWORD` set (STRONG)

## Phase 1 Validation

- [ ] Can access project dashboard
- [ ] All 3 environments visible
- [ ] All secrets visible in each environment
- [ ] Service tokens work (test after Phase 2)
- [ ] No missing or duplicate secrets

## Notes

**Project ID:** ____________________________

**Dev Service Token:** Stored in password manager
**Staging Service Token:** Stored in password manager
**Production Service Token:** Stored in password manager

## Ready for Phase 2

- [ ] All Phase 1 tasks complete
- [ ] Migration guide reviewed
- [ ] Ready to proceed to Local Development Setup
