# Infisical Secret Migration Guide

## Overview

This guide helps you migrate all environment variables from local `.env` files to Infisical Cloud.

## Secret Migration Checklist (27 total)

Use this checklist to verify all secrets are added to Infisical.

### Development Environment Secrets

Copy these values from your current `.env` file:

#### Database (4)
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `SUPABASE_URL` - Supabase project URL
- [ ] `SUPABASE_ANON_KEY` - Supabase anonymous key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

#### Redis (2)
- [ ] `UPSTASH_REDIS_REST_URL` - Redis REST API endpoint
- [ ] `UPSTASH_REDIS_REST_TOKEN` - Redis authentication token

#### ImageKit (3)
- [ ] `IMAGEKIT_PUBLIC_KEY` - ImageKit public key
- [ ] `IMAGEKIT_PRIVATE_KEY` - ImageKit private key
- [ ] `IMAGEKIT_URL_ENDPOINT` - ImageKit URL endpoint

#### Pinata (2)
- [ ] `PINATA_JWT` - Pinata JWT token for IPFS
- [ ] `PINATA_GATEWAY_URL` - Pinata IPFS gateway URL

#### App Config (3)
- [ ] `NODE_ENV=development`
- [ ] `CORS_ORIGINS=http://localhost:3000,http://localhost:3001`
- [ ] `NEXT_PUBLIC_APP_URL=http://localhost:3000`

#### Better Auth (2)
- [ ] `BETTER_AUTH_SECRET` - Your current auth secret (min 32 chars)
- [ ] `BETTER_AUTH_URL=http://localhost:3000`

#### Admin (2)
- [ ] `ADMIN_EMAIL` - Admin email address
- [ ] `ADMIN_PASSWORD` - Leave empty or set password

#### Logging (1)
- [ ] `LOG_LEVEL=debug`

#### Cron (1)
- [ ] `CRON_SECRET` - Cron job authentication secret

#### Features (2)
- [ ] `ENABLE_PUBLIC_KEY=true`
- [ ] `API_KEYS=` - Comma-separated admin API keys

#### Homepage (2)
- [ ] `NEXT_PUBLIC_API_VERSION=v1`
- [ ] `NEXT_PUBLIC_API_URL=/api`

#### Sentry (4)
- [ ] `NEXT_PUBLIC_SENTRY_DSN` - Sentry DSN
- [ ] `SENTRY_AUTH_TOKEN` - Sentry auth token
- [ ] `SENTRY_ORG` - Sentry organization
- [ ] `SENTRY_PROJECT=zuno-metadata`
- [ ] `SENTRY_TRACES_SAMPLE_RATE=0.1`

### Staging Environment Secrets

Same variables as development, but update:

- [ ] `NODE_ENV=production`
- [ ] `CORS_ORIGINS=https://staging.zuno-marketplace.com`
- [ ] `NEXT_PUBLIC_APP_URL=https://staging.zuno-marketplace.com`
- [ ] `BETTER_AUTH_URL=https://staging.zuno-marketplace.com`
- [ ] `LOG_LEVEL=info`
- [ ] `DATABASE_URL` - Use staging database
- [ ] `SUPABASE_URL` - Use staging Supabase project
- [ ] `SENTRY_PROJECT=zuno-metadata-staging`
- Update all service URLs to staging endpoints

### Production Environment Secrets

Same variables as development, but update:

- [ ] `NODE_ENV=production`
- [ ] `CORS_ORIGINS=https://zuno-marketplace.com,https://app.zuno-marketplace.com`
- [ ] `NEXT_PUBLIC_APP_URL=https://zuno-marketplace.com`
- [ ] `BETTER_AUTH_URL=https://zuno-marketplace.com`
- [ ] `BETTER_AUTH_SECRET` - Generate NEW strong secret (different from dev/staging)
- [ ] `CRON_SECRET` - Generate NEW strong secret
- [ ] `LOG_LEVEL=info`
- [ ] `DATABASE_URL` - Use production database
- [ ] `SUPABASE_URL` - Use production Supabase project
- [ ] `ADMIN_EMAIL=admin@zuno-marketplace.com`
- [ ] `ADMIN_PASSWORD` - Set STRONG password
- [ ] `SENTRY_PROJECT=zuno-metadata-prod`
- Update all service URLs to production endpoints

## Migration Steps

### Step 1: Extract Current Secrets

Run this command to see your current secrets:

```bash
cat .env | grep -v '^#' | grep -v '^$'
```

### Step 2: Add Secrets to Infisical

For each environment (dev, staging, production):

1. **Navigate to Infisical Dashboard:**
   - https://app.infisical.com
   - Project: `zuno-marketplace-metadata`
   - Select environment (dev/staging/production)

2. **Add secrets:**
   - Click "Add Secret"
   - Enter Key and Value
   - Click "Save"

3. **Repeat** for all 27 secrets per environment

### Step 3: Verify Migration

```bash
# After installing Infisical CLI (Phase 2)
infisical export --env=dev

# Should output all 27 secrets as KEY=value pairs
```

## Important Notes

### Critical Secrets (Handle with Care)

These secrets provide full access to critical services:
- `DATABASE_URL` - Direct database access
- `SUPABASE_SERVICE_ROLE_KEY` - Full Supabase access
- `BETTER_AUTH_SECRET` - Session encryption
- `CRON_SECRET` - Cron job authentication
- `UPSTASH_REDIS_REST_TOKEN` - Cache access
- `PINATA_JWT` - IPFS pinning access

### Secret Values

**Development:** Use your current local values from `.env`

**Staging:** Use staging environment values (may not exist yet, create as needed)

**Production:**
- Generate NEW strong secrets for: `BETTER_AUTH_SECRET`, `CRON_SECRET`
- Use production database/services
- Set strong `ADMIN_PASSWORD`
- Update all URLs to production domains

### Secret Rotation

After migration, consider rotating these secrets:
- `BETTER_AUTH_SECRET` - Generate new 32+ character secret
- `CRON_SECRET` - Generate new 32+ character secret
- `UPSTASH_REDIS_REST_TOKEN` - Regenerate in Upstash dashboard
- `PINATA_JWT` - Regenerate in Pinata dashboard

## Troubleshooting

### Missing Secret

If application fails to start after migration:

1. Check Infisical logs for missing variables
2. Verify all 27 secrets are added
3. Compare with `.env.example` for completeness

### Wrong Value

If service connection fails:

1. Verify secret value matches environment
2. Check for typos in key names
3. Ensure environment is correct (dev/staging/production)

### Export Fails

If `infisical export` returns errors:

1. Verify service token is correct
2. Check token expiration date
3. Ensure project ID is correct
4. Verify environment name matches

## Next Steps

After completing this migration:

1. ✅ Proceed to Phase 2: Local Development Setup
2. ✅ Install Infisical CLI
3. ✅ Test local development with Infisical secrets
