---
title: "Infisical Cloud Integration - Secret Management"
description: "Replace local .env files with Infisical Cloud for centralized secrets management across dev, staging, and production environments using CLI-only approach"
status: pending
priority: high
effort: 14 hours
branch: develop
tags: [infrastructure, security, secrets, devops]
created: 2025-02-01
---

# Infisical Cloud Integration Implementation Plan

## Executive Summary

This plan implements Infisical Cloud as the centralized secrets management solution for zuno-marketplace-metadata. Using a CLI-only approach with zero code changes to the application, we'll replace 27+ environment variables across dev, staging, and production environments with automated secret injection.

**Strategy**: Infisical CLI Only (Option A)
**Total Effort**: 14 hours
**Duration**: 3-4 days
**Risk Level**: Medium

---

## Prerequisites

### Required Accounts & Tools

| Item | Purpose | Access Level |
|------|---------|--------------|
| **Infisical Cloud Account** | Secrets management platform | Admin |
| **GitHub** | Source control repository | Write access |
| **Vercel** | Production deployment platform | Admin |
| **Node.js 18+** | Runtime environment | - |
| **pnpm 8+** | Package manager | - |
| **Git CLI** | Version control | - |

### Required Permissions

- **Infisical**: Create projects, manage environments, generate service tokens
- **Vercel**: Modify environment variables, configure build settings
- **GitHub**: Push branches, create pull requests
- **DNS/Domain**: Update records if required for Infisical webhooks (optional)

### Existing Environment Variables (27 total)

```bash
# Database (4)
DATABASE_URL
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# Redis (2)
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN

# ImageKit (3)
IMAGEKIT_PUBLIC_KEY
IMAGEKIT_PRIVATE_KEY
IMAGEKIT_URL_ENDPOINT

# Pinata (2)
PINATA_JWT
PINATA_GATEWAY_URL

# App Config (3)
NODE_ENV
CORS_ORIGINS
NEXT_PUBLIC_APP_URL

# Better Auth (2)
BETTER_AUTH_SECRET
BETTER_AUTH_URL

# Admin (2)
ADMIN_EMAIL
ADMIN_PASSWORD

# Logging (1)
LOG_LEVEL

# Cron (1)
CRON_SECRET

# Public API Key (1)
ENABLE_PUBLIC_KEY

# Admin API Keys (1)
API_KEYS

# Homepage (2)
NEXT_PUBLIC_API_VERSION
NEXT_PUBLIC_API_URL

# Sentry (4)
NEXT_PUBLIC_SENTRY_DSN
SENTRY_AUTH_TOKEN
SENTRY_ORG
SENTRY_PROJECT
SENTRY_TRACES_SAMPLE_RATE
```

---

## Phase 1: Infisical Cloud Setup (4 hours)

### Overview
Create Infisical Cloud project, configure environments, and migrate all secrets.

### Dependencies
- None (starting point)

### Tasks

#### 1.1 Create Infisical Cloud Account (30 minutes)

**Objective**: Sign up for Infisical Cloud and set up initial workspace.

**Commands**:
```bash
# Visit https://infisical.com/signup
# Create account using work email
# Verify email address
# Complete onboarding wizard
```

**Validation**:
- [ ] Successfully logged into Infisical Cloud dashboard
- [ ] Workspace created and accessible
- [ ] 2FA enabled (recommended)

**Rollback**:
- Delete account if created incorrectly (contact support)
- No rollback needed if successful

---

#### 1.2 Create Project & Environments (1 hour)

**Objective**: Create a new project for zuno-marketplace-metadata with three environments.

**Commands** (via Infisical Web UI):
1. Create new project named `zuno-marketplace-metadata`
2. Add environments:
   - `dev` - Development environment
   - `staging` - Staging/Preview environment
   - `production` - Production environment

**Validation**:
- [ ] Project created with correct name
- [ ] Three environments configured: dev, staging, production
- [ ] Project ID visible in dashboard

**Rollback**:
- Delete project and recreate
- No impact on existing application

---

#### 1.3 Generate Service Tokens (1 hour)

**Objective**: Create service tokens for each environment to allow CLI access.

**Commands** (via Infisical Web UI):

For each environment (dev, staging, production):

1. Navigate to Project Settings → Service Tokens
2. Click "Create Service Token"
3. Configure:
   - Name: `cli-access-{environment}`
   - Access: Environment-specific (dev/staging/production)
   - Expiration: 90 days (recommended)
   - IP Allowlist: Leave empty for now (add later if needed)
4. Copy token immediately (stored securely)

**Validation**:
- [ ] Service token created for each environment
- [ ] Tokens securely stored (password manager)
- [ ] Token expiration dates set

**Rollback**:
- Revoke and regenerate compromised tokens
- Create new tokens if lost

**Security Note**:
Store service tokens securely. Use environment variable `INFISICAL_TOKEN` for CLI authentication.

---

#### 1.4 Migrate All Secrets to Infisical (1.5 hours)

**Objective**: Transfer all 27 environment variables from local .env files to Infisical.

**Commands**:

**Step 1**: Read existing secrets from local `.env` file:
```bash
cat .env | grep -v '^#' | grep -v '^$'
```

**Step 2**: For each environment, add secrets to Infisical Web UI:

**Development Environment**:
```
DATABASE_URL=postgresql://user:password@localhost:5432/zuno_metadata
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-dev-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-dev-service-key
UPSTASH_REDIS_REST_URL=https://your-dev-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-dev-redis-token
IMAGEKIT_PUBLIC_KEY=your-dev-public-key
IMAGEKIT_PRIVATE_KEY=your-dev-private-key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your-id
PINATA_JWT=your-dev-pinata-jwt
PINATA_GATEWAY_URL=https://gateway.pinata.cloud/ipfs
NODE_ENV=development
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000
BETTER_AUTH_SECRET=your-dev-auth-secret-32chars
BETTER_AUTH_URL=http://localhost:3000
ADMIN_EMAIL=admin@zuno-marketplace.local
ADMIN_PASSWORD=
LOG_LEVEL=debug
CRON_SECRET=your-dev-cron-secret-32chars
ENABLE_PUBLIC_KEY=true
API_KEYS=
NEXT_PUBLIC_API_VERSION=v1
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_TRACES_SAMPLE_RATE=0.1
```

**Staging Environment**:
```
DATABASE_URL=postgresql://staging-user:password@staging-db-host:5432/zuno_metadata_staging
SUPABASE_URL=https://your-staging-project.supabase.co
SUPABASE_ANON_KEY=your-staging-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-staging-service-key
UPSTASH_REDIS_REST_URL=https://your-staging-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-staging-redis-token
IMAGEKIT_PUBLIC_KEY=your-staging-public-key
IMAGEKIT_PRIVATE_KEY=your-staging-private-key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your-id
PINATA_JWT=your-staging-pinata-jwt
PINATA_GATEWAY_URL=https://gateway.pinata.cloud/ipfs
NODE_ENV=production
CORS_ORIGINS=https://staging.zuno-marketplace.com
NEXT_PUBLIC_APP_URL=https://staging.zuno-marketplace.com
BETTER_AUTH_SECRET=your-staging-auth-secret-32chars
BETTER_AUTH_URL=https://staging.zuno-marketplace.com
ADMIN_EMAIL=admin@zuno-marketplace.local
ADMIN_PASSWORD=
LOG_LEVEL=info
CRON_SECRET=your-staging-cron-secret-32chars
ENABLE_PUBLIC_KEY=true
API_KEYS=
NEXT_PUBLIC_API_VERSION=v1
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_SENTRY_DSN=https://dsn@sentry.io/staging-project
SENTRY_AUTH_TOKEN=your-staging-auth-token
SENTRY_ORG=your-org
SENTRY_PROJECT=zuno-metadata-staging
SENTRY_TRACES_SAMPLE_RATE=0.1
```

**Production Environment**:
```
DATABASE_URL=postgresql://prod-user:password@prod-db-host:5432/zuno_metadata_prod
SUPABASE_URL=https://your-prod-project.supabase.co
SUPABASE_ANON_KEY=your-prod-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-prod-service-key
UPSTASH_REDIS_REST_URL=https://your-prod-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-prod-redis-token
IMAGEKIT_PUBLIC_KEY=your-prod-public-key
IMAGEKIT_PRIVATE_KEY=your-prod-private-key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your-id
PINATA_JWT=your-prod-pinata-jwt
PINATA_GATEWAY_URL=https://gateway.pinata.cloud/ipfs
NODE_ENV=production
CORS_ORIGINS=https://zuno-marketplace.com,https://app.zuno-marketplace.com
NEXT_PUBLIC_APP_URL=https://zuno-marketplace.com
BETTER_AUTH_SECRET=your-prod-auth-secret-32chars
BETTER_AUTH_URL=https://zuno-marketplace.com
ADMIN_EMAIL=admin@zuno-marketplace.com
ADMIN_PASSWORD=<secure-password>
LOG_LEVEL=info
CRON_SECRET=your-prod-cron-secret-32chars
ENABLE_PUBLIC_KEY=true
API_KEYS=
NEXT_PUBLIC_API_VERSION=v1
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_SENTRY_DSN=https://dsn@sentry.io/prod-project
SENTRY_AUTH_TOKEN=your-prod-auth-token
SENTRY_ORG=your-org
SENTRY_PROJECT=zuno-metadata-prod
SENTRY_TRACES_SAMPLE_RATE=0.1
```

**Step 3**: Verify all secrets imported correctly:
```bash
# Via CLI (after installation in Phase 2)
infisical export --env=dev --project-id=<project-id>
```

**Validation**:
- [ ] All 27 secrets added to each environment
- [ ] Secret values verified in Infisical UI
- [ ] No missing or duplicate secrets
- [ ] `NODE_ENV` correctly set per environment

**Rollback**:
- Delete secrets from Infisical
- Continue using local .env files
- No impact until Phase 2

**Critical Secrets** (handle with extreme care):
- `DATABASE_URL` - Database credentials
- `SUPABASE_SERVICE_ROLE_KEY` - Full database access
- `BETTER_AUTH_SECRET` - Session encryption
- `CRON_SECRET` - Cron job authentication
- `UPSTASH_REDIS_REST_TOKEN` - Cache access
- `PINATA_JWT` - IPFS pinning access

---

### Phase 1 Acceptance Criteria

- [ ] Infisical Cloud account created and verified
- [ ] Project `zuno-marketplace-metadata` exists
- [ ] Three environments: dev, staging, production
- [ ] Service tokens generated and stored securely
- [ ] All 27 secrets migrated to all three environments
- [ ] Secrets validated in Infisical dashboard

---

## Phase 2: Local Development Setup (2 hours)

### Overview
Install Infisical CLI and configure local development environment to use Infisical secrets.

### Dependencies
- ✅ Phase 1 complete

### Tasks

#### 2.1 Install Infisical CLI (30 minutes)

**Objective**: Install Infisical CLI globally and locally.

**Commands**:

**macOS/Linux**:
```bash
# Install using Homebrew
brew install infisical/tap/infisical

# Or using npm
npm install -g infisical

# Verify installation
infisical --version
```

**Windows**:
```bash
# Install using npm
npm install -g infisical

# Or download from https://infisical.com/docs/cli/overview

# Verify installation
infisical --version
```

**Validation**:
- [ ] `infisical` command available in terminal
- [ ] Version displayed (should be latest stable)
- [ ] CLI help accessible: `infisical --help`

**Rollback**:
- Uninstall CLI: `npm uninstall -g infisical`
- Continue using local .env files

---

#### 2.2 Configure Infisical CLI (30 minutes)

**Objective**: Configure CLI to use service tokens for authentication.

**Commands**:

**Option 1: Environment Variable (Recommended)**:
```bash
# Add to shell profile (~/.bashrc, ~/.zshrc, ~/.profile)
export INFISICAL_TOKEN=<your-dev-service-token>

# Reload shell
source ~/.bashrc  # or ~/.zshrc
```

**Option 2: Local Configuration File**:
```bash
# Create Infisical config directory
mkdir -p ~/.infisical

# Create config file
cat > ~/.infisical/config.yml <<EOF
token: <your-dev-service-token>
domain: https://app.infisical.com
projectID: <your-project-id>
EOF
```

**Option 3: Command-line Flag (For temporary use)**:
```bash
export INFISICAL_TOKEN=<your-dev-service-token>
```

**Verify Configuration**:
```bash
# Test connection
infisical export --env=dev

# Should output all secrets as KEY=value pairs
```

**Validation**:
- [ ] CLI authenticated successfully
- [ ] Can export secrets from dev environment
- [ ] All 27 secrets visible in export output

**Rollback**:
- Remove INFISICAL_TOKEN from environment
- Delete ~/.infisical/config.yml
- Continue using local .env files

---

#### 2.3 Update package.json Scripts (45 minutes)

**Objective**: Modify npm scripts to inject Infisical secrets before running commands.

**Commands**:

Edit `package.json` to wrap scripts with Infisical CLI:

```json
{
  "scripts": {
    "dev": "infisical run --env=dev -- next dev",
    "build": "infisical run --env=production -- next build",
    "start": "infisical run --env=production -- next start",
    "workers": "infisical run --env=dev -- tsx src/infrastructure/queue/workers/index.ts",

    // Keep original scripts as fallback (optional)
    "dev:local": "next dev",
    "build:local": "next build",
    "start:local": "next start",
    "workers:local": "tsx src/infrastructure/queue/workers/index.ts",

    // Database scripts
    "db:generate": "infisical run --env=dev -- drizzle-kit generate",
    "db:migrate": "infisical run --env=dev -- drizzle-kit migrate",
    "db:studio": "infisical run --env=dev -- drizzle-kit studio",
    "db:push": "infisical run --env=dev -- drizzle-kit push",
    "db:seed": "infisical run --env=dev -- tsx scripts/seed/index.ts",
    "db:truncate": "infisical run --env=dev -- tsx scripts/db-truncate.ts",
    "db:reset": "infisical run --env=dev -- tsx scripts/db-truncate.ts && infisical run --env=dev -- tsx scripts/seed/index.ts",
    "db:seed:prod": "infisical run --env=production -- NODE_ENV=production tsx scripts/seed/index.ts",

    // Test scripts (optional - can use local env)
    "test": "jest --config tests/setup/jest.config.js",
    "test:watch": "jest --watch --config tests/setup/jest.config.js",
    "test:coverage": "jest --coverage --config tests/setup/jest.config.js",
    "test:e2e": "infisical run --env=dev -- npx tsx scripts/test-all.ts",
    "test:all": "pnpm test && pnpm test:e2e",

    // Type checking (no secrets needed)
    "typecheck": "tsc --noEmit",
    "lint": "eslint"
  }
}
```

**Validation**:
- [ ] All scripts updated to use `infisical run --env=<environment>`
- [ ] Fallback scripts (with `:local` suffix) available for emergencies
- [ ] Scripts cover all use cases: dev, build, workers, database

**Rollback**:
- Restore original package.json from git
- Use `git checkout -- package.json`

---

#### 2.4 Backup and Update .gitignore (15 minutes)

**Objective**: Ensure .env files are not committed and backup existing secrets.

**Commands**:

```bash
# Create backup directory (local only)
mkdir -p ~/.infisical-backups/zuno-marketplace-metadata

# Backup current .env file
cp .env ~/.infisical-backups/zuno-marketplace-metadata/.env.backup.$(date +%Y%m%d)

# Verify .gitignore contains .env
cat .gitignore | grep "^\.env$"

# If not present, add it
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.*.local" >> .gitignore
```

**Update .gitignore content** (if needed):
```gitignore
# Environment variables
.env
.env.local
.env.*.local
.env.production
.env.development
.env.staging

# Infisical
.infisical/
```

**Validation**:
- [ ] Backup created at `~/.infisical-backups/zuno-marketplace-metadata/`
- [ ] .gitignore contains `.env` and related patterns
- [ ] No .env files in git repository (verify with `git ls-files | grep "\.env"`)

**Rollback**:
- Restore from backup: `cp ~/.infisical-backups/zuno-marketplace-metadata/.env.backup.YYYYMMDD .env`
- Undo .gitignore changes if needed

---

### Phase 2 Acceptance Criteria

- [ ] Infisical CLI installed and verified
- [ ] CLI authenticated with dev service token
- [ ] All package.json scripts updated to use Infisical
- [ ] Fallback scripts available for emergencies
- [ ] Backup of .env created
- [ ] .gitignore updated to prevent .env commits

---

## Phase 3: Vercel Integration (3 hours)

### Overview
Configure Vercel to inject Infisical secrets during build and runtime.

### Dependencies
- ✅ Phase 1 complete (service tokens available)
- ✅ Phase 2 complete (Infisical CLI available)

### Tasks

#### 3.1 Install Infisical CLI as Dev Dependency (15 minutes)

**Objective**: Add Infisical CLI to project dependencies for Vercel builds.

**Commands**:

```bash
pnpm add -D infisical

# Verify installation
pnpm infisical --version
```

**Validation**:
- [ ] `infisical` added to package.json devDependencies
- [ ] Version displayed
- [ ] Available in node_modules/.bin

**Rollback**:
- Remove dependency: `pnpm remove infisical`

---

#### 3.2 Create vercel.json Configuration (1 hour)

**Objective**: Configure Vercel to run Infisical CLI during build.

**Commands**:

Create `vercel.json` in project root:

```json
{
  "buildCommand": "infisical run --env=${VERCEL_ENV} -- pnpm build",
  "installCommand": "pnpm install",
  "framework": null,
  "regions": ["iad1"],
  "env": {
    "INFISICAL_TOKEN": "@infisical_token"
  },
  "build": {
    "env": {
      "VERCEL_ENV": "$VERCEL_ENV"
    }
  }
}
```

**Alternative Configuration** (if using Vercel Environment Variables exclusively):

Create `vercel.json`:
```json
{
  "buildCommand": "pnpm build",
  "installCommand": "pnpm install",
  "framework": "nextjs"
}
```

Then configure build command in Vercel UI or `package.json`:
```json
{
  "scripts": {
    "build": "infisical run --env=production -- next build"
  }
}
```

**Validation**:
- [ ] vercel.json created in project root
- [ ] Build command references Infisical CLI
- [ ] Environment variable for INFISICAL_TOKEN configured

**Rollback**:
- Delete vercel.json
- Restore original build command in package.json

---

#### 3.3 Configure Vercel Environment Variables (1 hour)

**Objective**: Add Infisical service token to Vercel environment variables.

**Commands** (via Vercel Dashboard):

**For Production**:
1. Go to Vercel Project → Settings → Environment Variables
2. Add environment variable:
   - Name: `INFISICAL_TOKEN`
   - Value: `<your-production-service-token>`
   - Environment: Production
3. Add environment variable:
   - Name: `VERCEL_ENV`
   - Value: `production`
   - Environment: Production

**For Preview/Staging**:
1. Add environment variable:
   - Name: `INFISICAL_TOKEN`
   - Value: `<your-staging-service-token>`
   - Environment: Preview, Development
2. Add environment variable:
   - Name: `VERCEL_ENV`
   - Value: `staging`
   - Environment: Preview, Development

**Via CLI**:
```bash
# Production
vercel env add INFISICAL_TOKEN production
# Paste production service token when prompted

vercel env add VERCEL_ENV production
# Enter: production

# Preview/Development
vercel env add INFISICAL_TOKEN preview
# Paste staging service token when prompted

vercel env add INFISICAL_TOKEN development
# Paste staging service token when prompted

vercel env add VERCEL_ENV preview
# Enter: staging

vercel env add VERCEL_ENV development
# Enter: dev
```

**Important Note**:
Remove all existing environment variables from Vercel that are now managed by Infisical. Keep only:
- `INFISICAL_TOKEN` (new)
- `VERCEL_ENV` (new)

**Validation**:
- [ ] INFISICAL_TOKEN added to production environment
- [ ] INFISICAL_TOKEN added to preview/development environments
- [ ] VERCEL_ENV configured for all environments
- [ ] Old environment variables removed from Vercel (except new ones)
- [ ] Variables visible in Vercel dashboard

**Rollback**:
- Re-add all original environment variables to Vercel
- Delete INFISICAL_TOKEN and VERCEL_ENV
- Delete vercel.json

---

#### 3.4 Update Build Settings (15 minutes)

**Objective**: Configure Vercel build settings to use Infisical CLI.

**Commands** (via Vercel Dashboard):

1. Go to Vercel Project → Settings → General
2. Build Command: `pnpm build` (already uses infisical via package.json)
3. Output Directory: `.next` (default for Next.js)
4. Install Command: `pnpm install`

**Verify build command in package.json**:
```json
{
  "scripts": {
    "build": "infisical run --env=production -- next build"
  }
}
```

**Validation**:
- [ ] Build command references package.json script
- [ ] Output directory set to `.next`
- [ ] Install command set to `pnpm install`

**Rollback**:
- Restore original build settings
- Use fallback build command if needed

---

#### 3.5 Configure Deploy Hooks (Optional - 30 minutes)

**Objective**: Set up Vercel deploy hooks for automated secret refresh.

**Commands** (via Vercel Dashboard):

1. Go to Vercel Project → Settings → Git
2. Create deploy hooks:
   - Name: `infisical-refresh-production`
   - Branch: `main`
3. Save deploy hook URL

**Note**: This is optional. Use this hook to trigger deployments when secrets change in Infisical.

**Validation**:
- [ ] Deploy hook created
- [ ] Hook URL available for use

**Rollback**:
- Delete deploy hooks

---

### Phase 3 Acceptance Criteria

- [ ] Infisical CLI installed as dev dependency
- [ ] vercel.json created with Infisical build command
- [ ] INFISICAL_TOKEN configured in Vercel (production + preview)
- [ ] VERCEL_ENV configured in Vercel
- [ ] Old environment variables removed from Vercel
- [ ] Build settings updated to use Infisical
- [ ] Optional: Deploy hooks configured

---

## Phase 4: Testing & Validation (3 hours)

### Overview
Test Infisical integration across all environments and validate functionality.

### Dependencies
- ✅ Phase 1 complete (secrets in Infisical)
- ✅ Phase 2 complete (local setup)
- ✅ Phase 3 complete (Vercel configured)

### Tasks

#### 4.1 Test Local Development (45 minutes)

**Objective**: Verify local development works with Infisical secrets.

**Commands**:

```bash
# Ensure INFISICAL_TOKEN is set
echo $INFISICAL_TOKEN

# Test CLI export
infisical export --env=dev

# Start dev server
pnpm dev

# Open http://localhost:3000
# Test application functionality:
# - Health check: http://localhost:3000/api/health
# - Admin dashboard: http://localhost:3000/admin
# - API endpoints with test API key
```

**Validation Checklist**:
- [ ] Dev server starts without errors
- [ ] Environment variables loaded from Infisical
- [ ] Database connection successful
- [ ] Redis connection successful
- [ ] ImageKit authentication successful
- [ ] Pinata IPFS authentication successful
- [ ] Admin dashboard accessible
- [ ] API endpoints responsive
- [ ] No errors in console logs

**Rollback**:
- Stop dev server
- Use fallback script: `pnpm dev:local`
- Continue with local .env file

---

#### 4.2 Test Secret Rotation (30 minutes)

**Objective**: Verify application can be restarted with updated secrets.

**Commands**:

```bash
# 1. Update a test secret in Infisical (dev environment)
# Go to Infisical UI → dev environment
# Edit LOG_LEVEL from "debug" to "info"

# 2. Restart dev server
# Ctrl+C to stop
pnpm dev

# 3. Verify secret updated
curl http://localhost:3000/api/health
# Check logs to confirm LOG_LEVEL=info

# 4. Revert change in Infisical
# Edit LOG_LEVEL back to "debug"

# 5. Restart again
pnpm dev
```

**Validation**:
- [ ] Secret changes reflected after restart
- [ ] Application starts successfully with new secrets
- [ ] No errors during secret reload
- [ ] Original secrets restored correctly

**Rollback**:
- Revert secret changes in Infisical
- Restart application
- Monitor for errors

---

#### 4.3 Test Build Process (45 minutes)

**Objective**: Verify production build works with Infisical.

**Commands**:

```bash
# Build locally (simulating Vercel build)
pnpm build

# Verify build completes successfully
# Check for errors in build output

# Test production build locally
pnpm start

# Test application
curl http://localhost:3000/api/health
```

**Validation**:
- [ ] Build completes without errors
- [ ] Secrets injected during build
- [ ] Production server starts
- [ ] Application functions correctly
- [ ] Environment variables set to production values

**Rollback**:
- Use fallback build command: `pnpm build:local`
- Troubleshoot build errors

---

#### 4.4 Test Vercel Preview Deployment (1 hour)

**Objective**: Deploy to Vercel preview environment and validate.

**Commands**:

```bash
# Create feature branch
git checkout -b feature/infisical-integration

# Commit changes
git add .
git commit -m "feat: integrate Infisical Cloud for secrets management"

# Push to GitHub
git push origin feature/infisical-integration

# Open Vercel dashboard
# Monitor preview deployment
```

**Validation Checklist**:
- [ ] Preview deployment builds successfully
- [ ] No build errors in Vercel logs
- [ ] Application deployed to preview URL
- [ ] Health check passes on preview URL
- [ ] Secrets injected from staging environment
- [ ] Admin dashboard accessible
- [ ] API endpoints responsive
- [ ] No runtime errors in Vercel logs

**Troubleshooting**:
If build fails:
1. Check Vercel build logs for errors
2. Verify INFISICAL_TOKEN is set correctly
3. Verify vercel.json configuration
4. Test locally with same environment
5. Rollback and use fallback scripts

**Rollback**:
- Delete preview deployment
- Revert changes to local files
- Use original environment variables

---

#### 4.5 Test Production Deployment (Scheduled - 30 minutes)

**Objective**: Deploy to production and validate.

**Commands** (coordinate with team):

```bash
# Merge feature branch to main/develop
git checkout main
git merge feature/infisical-integration

# Push to GitHub
git push origin main

# Monitor Vercel production deployment
# Check deployment logs
# Test production URL
```

**Validation Checklist**:
- [ ] Production deployment builds successfully
- [ ] No build errors
- [ ] Application deployed to production URL
- [ ] Health check passes on production URL
- [ ] Secrets injected from production environment
- [ ] All services (DB, Redis, ImageKit, Pinata) connected
- [ ] Admin dashboard accessible
- [ ] API endpoints responsive
- [ ] No runtime errors
- [ ] Monitoring/alerts working

**Rollback**:
- Revert deployment in Vercel
- Restore previous working deployment
- Investigate logs and fix issues

---

### Phase 4 Acceptance Criteria

- [ ] Local development works with Infisical secrets
- [ ] Secret rotation verified with restart
- [ ] Local build process successful
- [ ] Vercel preview deployment successful
- [ ] Production deployment successful (when scheduled)
- [ ] All application functions work in all environments
- [ ] No errors in logs
- [ ] Rollback procedures tested

---

## Phase 5: Documentation & Cleanup (2 hours)

### Overview
Update documentation and clean up obsolete files.

### Dependencies
- ✅ Phase 4 complete (all tests passing)

### Tasks

#### 5.1 Update README.md (45 minutes)

**Objective**: Document Infisical integration in project README.

**Commands**:

Edit `README.md`:

### Add to "Prerequisites" section:
```markdown
### Prerequisites

| Requirement | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 18+ | Runtime environment |
| **PostgreSQL** | 14+ | Primary database |
| **Redis** | 7+ | Caching & job queue |
| **pnpm** | 8+ | Package manager |
| **Infisical CLI** | Latest | Secrets management |
| **Infisical Account** | - | Secrets platform |
```

### Add new section before "Installation":
```markdown
### Infisical Cloud Setup

This project uses [Infisical Cloud](https://infisical.com/) for secrets management. All environment variables are stored in Infisical and injected at runtime.

**Quick Setup:**

1. **Install Infisical CLI:**
   ```bash
   npm install -g infisical
   ```

2. **Authenticate with Infisical:**
   ```bash
   export INFISICAL_TOKEN=<your-service-token>
   ```

3. **Run application with Infisical:**
   ```bash
   pnpm dev  # Automatically uses Infisical
   ```

**Accessing Infisical:**
- Dashboard: https://app.infisical.com
- Project: `zuno-marketplace-metadata`
- Environments: `dev`, `staging`, `production`

For detailed setup instructions, see [Deployment Guide](docs/deployment-guide.md#infisical-secrets-management).
```

### Update "Environment Configuration" section:
```markdown
### Environment Configuration

This project uses **Infisical Cloud** for secrets management. Environment variables are automatically injected via Infisical CLI.

**No manual `.env` file needed** for development. Just run:
```bash
pnpm dev
```

All secrets are managed centrally in Infisical Cloud:
- **Dev**: Automatically loaded when running `pnpm dev`
- **Staging**: Automatically loaded for Vercel preview deployments
- **Production**: Automatically loaded for Vercel production deployments

**To update secrets:**
1. Log in to [Infisical Dashboard](https://app.infisical.com)
2. Navigate to `zuno-marketplace-metadata` project
3. Select environment (dev/staging/production)
4. Add or modify secrets
5. Restart application (changes take effect on next build/restart)

**For local development with fallback .env:**
If you need to use a local .env file temporarily, run:
```bash
pnpm dev:local  # Uses local .env instead of Infisical
```

**Required Environment Variables** (managed in Infisical):

#### Database (PostgreSQL/Supabase)
```
DATABASE_URL=postgresql://user:password@host:5432/database
SUPABASE_URL=https://project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### Redis Cache (Upstash)
```
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

#### Media Processing (ImageKit)
```
IMAGEKIT_PUBLIC_KEY=public_key
IMAGEKIT_PRIVATE_KEY=private_key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your-id
```

#### IPFS Storage (Pinata)
```
PINATA_JWT=your-jwt-token
PINATA_GATEWAY_URL=https://gateway.pinata.cloud/ipfs
```

#### Authentication (Better Auth)
```
BETTER_AUTH_SECRET=your-secret-min-32-chars
BETTER_AUTH_URL=http://localhost:3000
```

#### Application
```
NODE_ENV=development
CORS_ORIGINS=http://localhost:3000
LOG_LEVEL=debug
CRON_SECRET=your-cron-secret
```

#### Admin Credentials
```
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=  # Leave empty for auto-generation
```

See `.env.example` for complete list of variables.
```

### Update "Available Commands" section:
```markdown
#### Application

```bash
pnpm dev              # Start Next.js dev server (uses Infisical)
pnpm dev:local        # Start with local .env (fallback)
pnpm build            # Build for production (uses Infisical)
pnpm build:local      # Build with local .env (fallback)
pnpm start            # Start production server (uses Infisical)
pnpm start:local      # Start with local .env (fallback)
pnpm workers          # Start BullMQ workers (uses Infisical)
pnpm workers:local    # Start workers with local .env (fallback)
```

All commands automatically use Infisical secrets. Use `:local` suffix for fallback with local .env files.
```

**Validation**:
- [ ] README.md updated with Infisical information
- [ ] Setup instructions clear and accurate
- [ ] Commands documented with Infisical context
- [ ] Links to Infisical dashboard included

**Rollback**:
- Revert README.md changes
- Restore previous content from git

---

#### 5.2 Update Deployment Guide (45 minutes)

**Objective**: Add comprehensive Infisical documentation to deployment guide.

**Commands**:

If `docs/deployment-guide.md` exists, add new section. If not, create it:

```markdown
# Infisical Secrets Management

## Overview

This project uses [Infisical Cloud](https://infisical.com/) for centralized secrets management. All environment variables are stored securely in Infisical and injected at runtime using the Infisical CLI.

## Architecture

```
┌─────────────────┐
│  Infisical Cloud│  (Secure secrets storage)
│  - dev          │
│  - staging      │
│  - production   │
└────────┬────────┘
         │ Infisical CLI
         ▼
┌─────────────────┐
│  Application    │  (Runtime environment injection)
│  - local dev    │
│  - Vercel build │
│  - workers      │
└─────────────────┘
```

## Key Benefits

- **Centralized Management**: All secrets in one place
- **Environment Isolation**: Separate secrets for dev/staging/production
- **Audit Trail**: Track secret access and changes
- **Zero Code Changes**: No modifications to application code needed
- **Automatic Injection**: Secrets loaded via CLI wrapper

## Setup Guide

### 1. Infisical Cloud Setup

#### Create Account & Project

1. Sign up at [infisical.com/signup](https://infisical.com/signup)
2. Create project: `zuno-marketplace-metadata`
3. Create environments: `dev`, `staging`, `production`

#### Generate Service Tokens

For each environment, generate a service token:

1. Navigate to Project Settings → Service Tokens
2. Click "Create Service Token"
3. Configure:
   - Name: `cli-access-{environment}`
   - Access: Environment-specific
   - Expiration: 90 days
4. Copy token and store securely

**Store tokens in password manager** - they cannot be retrieved after creation.

#### Import Secrets

Import all environment variables into Infisical:

**Development**:
```
DATABASE_URL=postgresql://user:password@localhost:5432/zuno_metadata
SUPABASE_URL=https://your-project.supabase.co
# ... (see .env.example for complete list)
```

**Staging**:
```
DATABASE_URL=postgresql://staging:password@staging-db:5432/zuno_staging
SUPABASE_URL=https://staging-project.supabase.co
# ... (production config)
```

**Production**:
```
DATABASE_URL=postgresql://prod:password@prod-db:5432/zuno_prod
SUPABASE_URL=https://prod-project.supabase.co
# ... (production config)
```

### 2. Local Development Setup

#### Install CLI

```bash
npm install -g infisical
```

#### Authenticate

```bash
export INFISICAL_TOKEN=<your-dev-service-token>
```

Add to `~/.bashrc` or `~/.zshrc` for persistence:
```bash
echo 'export INFISICAL_TOKEN=<your-dev-service-token>' >> ~/.bashrc
source ~/.bashrc
```

#### Test Connection

```bash
# Verify authentication
infisical export --env=dev

# Should output all secrets as KEY=value pairs
```

#### Run Application

```bash
pnpm dev  # Automatically uses Infisical secrets
```

### 3. Vercel Integration

#### Add Service Token to Vercel

**Production**:
1. Vercel Project → Settings → Environment Variables
2. Add: `INFISICAL_TOKEN` = `<your-production-token>`
3. Environment: Production
4. Add: `VERCEL_ENV` = `production`
5. Environment: Production

**Preview/Development**:
1. Add: `INFISICAL_TOKEN` = `<your-staging-token>`
2. Environment: Preview, Development
3. Add: `VERCEL_ENV` = `staging`
4. Environment: Preview, Development

#### Configure Build

`vercel.json`:
```json
{
  "buildCommand": "pnpm build",
  "installCommand": "pnpm install"
}
```

`package.json`:
```json
{
  "scripts": {
    "build": "infisical run --env=production -- next build"
  }
}
```

#### Deploy

```bash
git push origin main
# Vercel automatically builds with Infisical secrets
```

## Secret Management

### Adding/Updating Secrets

1. Log in to [Infisical Dashboard](https://app.infisical.com)
2. Navigate to `zuno-marketplace-metadata` project
3. Select environment (dev/staging/production)
4. Click "Add Secret" or edit existing secret
5. Save changes
6. **Restart application** for changes to take effect

### Rotating Secrets

1. Update secret in Infisical
2. Deploy new version to environment:
   - **Local**: Restart dev server (`pnpm dev`)
   - **Staging**: Push new commit to trigger preview deployment
   - **Production**: Push to main branch for production deployment

### Accessing Secrets in Code

No code changes needed. Secrets are available as environment variables:

```typescript
// Example usage in src/shared/config/env.ts
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  // ...
});

const env = envSchema.parse(process.env);
```

## Troubleshooting

### CLI Authentication Failed

```bash
# Verify token is set
echo $INFISICAL_TOKEN

# Test connection
infisical export --env=dev

# If fails, reset token
export INFISICAL_TOKEN=<new-token>
```

### Build Errors in Vercel

1. Check build logs in Vercel Dashboard
2. Verify `INFISICAL_TOKEN` is set correctly
3. Verify `vercel.json` configuration
4. Check package.json build script

### Secrets Not Injecting

```bash
# Manually test injection
infisical run --env=dev -- env | grep DATABASE_URL

# Should output DATABASE_URL with value
```

### Fallback to Local .env

If Infisical is unavailable, use fallback scripts:

```bash
pnpm dev:local      # Uses local .env
pnpm build:local    # Uses local .env
pnpm start:local    # Uses local .env
```

## Security Best Practices

1. **Never commit service tokens** to git
2. **Rotate tokens regularly** (recommended: every 90 days)
3. **Use IP allowlists** for service tokens (optional)
4. **Monitor access logs** in Infisical Dashboard
5. **Use least privilege** - create environment-specific tokens
6. **Enable 2FA** on Infisical account
7. **Audit secret access** regularly

## Rollback Procedure

If Infisical integration fails:

1. **Local Development**:
   ```bash
   pnpm dev:local  # Use local .env
   ```

2. **Vercel Deployment**:
   - Re-add all environment variables to Vercel
   - Remove `INFISICAL_TOKEN` from Vercel
   - Remove Infisical from `package.json` build scripts
   - Revert `vercel.json` changes

3. **Complete Rollback**:
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

## Additional Resources

- [Infisical Documentation](https://infisical.com/docs)
- [Infisical CLI Guide](https://infisical.com/docs/cli/overview)
- [Infisical Cloud Pricing](https://infisical.com/pricing)
```

**Validation**:
- [ ] Deployment guide created or updated
- [ ] All sections complete and accurate
- [ ] Commands tested and working
- [ ] Troubleshooting section comprehensive

**Rollback**:
- Delete or revert deployment guide changes

---

#### 5.3 Create Quick Start Guide (15 minutes)

**Objective**: Create a quick reference guide for developers.

**Commands**:

Create `docs/infisical-quickstart.md`:

```markdown
# Infisical Quick Start

## First-Time Setup (5 minutes)

1. **Install CLI**:
   ```bash
   npm install -g infisical
   ```

2. **Get Token**:
   - Ask team admin for dev service token
   - Or request access in Infisical

3. **Authenticate**:
   ```bash
   export INFISICAL_TOKEN=<your-token>
   ```

4. **Add to shell** (persistent):
   ```bash
   echo 'export INFISICAL_TOKEN=<your-token>' >> ~/.bashrc
   source ~/.bashrc
   ```

5. **Run**:
   ```bash
   pnpm dev  # That's it!
   ```

## Common Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server with Infisical |
| `pnpm dev:local` | Fallback to local .env |
| `infisical export --env=dev` | View all secrets |
| `pnpm build` | Build for production with Infisical |

## Need Help?

- Full guide: [Deployment Guide](./deployment-guide.md#infisical-secrets-management)
- Infisical docs: https://infisical.com/docs
- Team channel: #infrastructure
```

**Validation**:
- [ ] Quick start guide created
- [ ] Instructions clear and concise
- [ ] Links to detailed docs

**Rollback**:
- Delete quick start guide

---

#### 5.4 Clean Up Obsolete Files (15 minutes)

**Objective**: Remove or archive obsolete configuration files.

**Commands**:

```bash
# Archive .env files (don't delete - keep for reference)
mkdir -p .archived-envs
mv .env .archived-envs/.env.backup.$(date +%Y%m%d)
mv .env.example .archived-envs/.env.example.backup

# Create new .env.example with Infisical instructions
cat > .env.example <<'EOF'
# ================================================
# INFISCAL SECRETS MANAGEMENT
# ================================================
#
# This project uses Infisical Cloud for secrets management.
# No manual .env file needed for development.
#
# Setup Instructions:
# 1. Install Infisical CLI: npm install -g infisical
# 2. Get token from team admin or Infisical Dashboard
# 3. Authenticate: export INFISICAL_TOKEN=<token>
# 4. Run: pnpm dev
#
# For fallback mode (Infisical unavailable):
# 1. Copy this file to .env
# 2. Fill in all required values
# 3. Run: pnpm dev:local
#
# Infisical Dashboard: https://app.infisical.com
# Project: zuno-marketplace-metadata
# Environments: dev, staging, production
#
# ================================================
# REQUIRED ENVIRONMENT VARIABLES
# ================================================

# Database (PostgreSQL or Supabase)
DATABASE_URL=postgresql://user:password@localhost:5432/zuno_metadata
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Redis Cache (Upstash or self-hosted)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# Media Processing (ImageKit)
IMAGEKIT_PUBLIC_KEY=your-imagekit-public-key
IMAGEKIT_PRIVATE_KEY=your-imagekit-private-key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your-id

# IPFS Storage (Pinata)
PINATA_JWT=your-pinata-jwt
PINATA_GATEWAY_URL=https://gateway.pinata.cloud/ipfs

# App Config
NODE_ENV=development
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Better Auth
BETTER_AUTH_SECRET=your-secret-key-min-32-characters-long
BETTER_AUTH_URL=http://localhost:3000

# Admin
ADMIN_EMAIL=admin@zuno-marketplace.local
ADMIN_PASSWORD=

# Logging
LOG_LEVEL=debug

# Cron Jobs
CRON_SECRET=your-random-secret-min-32-characters

# Public API Key
ENABLE_PUBLIC_KEY=true

# Admin API Keys
API_KEYS=

# Homepage
NEXT_PUBLIC_API_VERSION=v1
NEXT_PUBLIC_API_URL=/api

# Sentry (Optional)
NEXT_PUBLIC_SENTRY_DSN=https://dsn@sentry.io/project
SENTRY_AUTH_TOKEN=your-auth-token
SENTRY_ORG=your-org
SENTRY_PROJECT=zuno-metadata
SENTRY_TRACES_SAMPLE_RATE=0.1
EOF

# Update .gitignore to ensure .archived-envs is not committed
cat >> .gitignore <<'EOF'

# Archived environment files
.archived-envs/
EOF

# Remove any other obsolete env files
find . -maxdepth 1 -name ".env.*" -not -name ".env.example" -delete
```

**Validation**:
- [ ] Original .env files archived
- [ ] New .env.example with Infisical instructions
- [ ] .gitignore updated
- [ ] No obsolete env files remaining

**Rollback**:
- Restore from archived files
- Revert .gitignore changes

---

### Phase 5 Acceptance Criteria

- [ ] README.md updated with Infisical information
- [ ] Deployment guide created/updated with comprehensive docs
- [ ] Quick start guide created
- [ ] Obsolete .env files archived
- [ ] .env.example updated with Infisical instructions
- [ ] All documentation accurate and tested
- [ ] Team can follow documentation successfully

---

## Timeline

### Day 1: Setup & Configuration (6 hours)
- **Morning** (4h): Phase 1 - Infisical Cloud Setup
- **Afternoon** (2h): Phase 2 - Local Development Setup

### Day 2: Vercel Integration & Testing (6 hours)
- **Morning** (3h): Phase 3 - Vercel Integration
- **Afternoon** (3h): Phase 4 - Testing & Validation (local + build)

### Day 3: Deployment & Documentation (2 hours)
- **Morning** (2h): Phase 5 - Documentation & Cleanup

**Total Effort**: 14 hours
**Duration**: 3 days (flexible)

---

## Success Metrics

### Quantitative Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Secret Migration** | 100% | All 27 secrets in Infisical |
| **Environment Coverage** | 3/3 | Dev, staging, production |
| **Build Success Rate** | 100% | All Vercel builds succeed |
| **Uptime During Migration** | 100% | No production downtime |
| **Documentation Completeness** | 100% | All docs updated |

### Qualitative Metrics

- ✅ All secrets centralized and accessible from Infisical
- ✅ Zero code changes to application logic
- ✅ Local development workflow unchanged for developers
- ✅ Secret rotation verified with application restart
- ✅ Team can update secrets without deployment
- ✅ Audit trail for all secret access
- ✅ Rollback procedures tested and documented

---

## Risk Management

### Risk Matrix

| Risk | Probability | Impact | Severity | Mitigation |
|------|-------------|--------|----------|------------|
| Vercel build timeout | Medium | High | High | Use build caching, increase timeouts, optimize build |
| Secret rotation downtime | Low | Medium | Medium | Schedule during low-traffic, use zero-downtime deployments |
| CLI authentication failure | Low | High | High | Monitor tokens, automate rotation, backup tokens |
| Network latency | Low | Low | Low | Use CLI caching, regional deployment |
| Service token compromise | Low | Critical | Critical | Rotate tokens immediately, use IP allowlists, monitor logs |
| Infisical service outage | Low | High | High | Fallback scripts available, cached secrets |
| Missing secret in migration | Medium | High | High | Test all environments, comprehensive validation |
| Developer workflow disruption | Low | Medium | Medium | Clear documentation, training session |

### Contingency Plans

#### Plan A: Vercel Build Timeout
**Trigger**: Build exceeds 15 minutes
**Actions**:
1. Increase Vercel build timeout to 30 minutes
2. Add build caching to `vercel.json`
3. Optimize Next.js build (disable telemetry, parallelize)
4. Consider regional deployment closer to Infisical servers

#### Plan B: Secret Rotation Issues
**Trigger**: Application fails after secret update
**Actions**:
1. Revert secret change in Infisical
2. Restart application
3. Investigate logs for errors
4. Test secret changes in staging first
5. Schedule production rotations during maintenance windows

#### Plan C: CLI Authentication Failures
**Trigger**: `infisical export` returns auth error
**Actions**:
1. Verify `INFISICAL_TOKEN` is set
2. Check token expiration date
3. Regenerate service token
4. Clear CLI cache: `rm -rf ~/.infisical/cache/`
5. Test with new token

#### Plan D: Infisical Service Outage
**Trigger**: Cannot connect to Infisical Cloud
**Actions**:
1. Use fallback scripts (`:local` suffix)
2. Deploy with cached local .env
3. Monitor Infisical status page
4. Revert to original Vercel environment variables if prolonged outage

---

## Rollback Procedures

### Full Rollback to Previous State

**Scenario**: Critical issue requiring complete rollback

**Commands**:

```bash
# 1. Revert all changes
git revert <commit-hash> --no-commit
git commit -m "revert: rollback Infisical integration"

# 2. Restore environment variables in Vercel
# - Add all 27 environment variables back to Vercel
# - Remove INFISICAL_TOKEN and VERCEL_ENV

# 3. Delete vercel.json
rm vercel.json

# 4. Restore package.json scripts
git checkout HEAD -- package.json

# 5. Push changes
git push origin main

# 6. Deploy previous working version
# via Vercel Dashboard or CLI
```

### Partial Rollback

**Scenario**: Local development issues only

**Commands**:

```bash
# Use fallback scripts
pnpm dev:local
pnpm build:local
pnpm workers:local
```

**Scenario**: Vercel production issues only

**Commands**:

```bash
# 1. Revert deployment in Vercel Dashboard
# 2. Re-add environment variables to Vercel
# 3. Remove INFISICAL_TOKEN from Vercel
# 4. Redeploy
```

---

## Post-Implementation Tasks

### Week 1: Monitoring & Validation
- [ ] Monitor Vercel build logs for errors
- [ ] Check application logs for secret loading issues
- [ ] Validate all services (DB, Redis, ImageKit, Pinata) working
- [ ] Collect team feedback on new workflow

### Week 2: Optimization & Training
- [ ] Team training session on Infisical usage
- [ ] Document common issues and solutions
- [ ] Set up alerts for secret rotation
- [ ] Configure IP allowlists for service tokens

### Week 3: Security & Compliance
- [ ] Audit secret access logs in Infisical
- [ ] Rotate initial service tokens
- [ ] Enable 2FA for all Infisical users
- [ ] Review and update secret permissions

### Month 1: Maintenance
- [ ] Scheduled secret rotation (tokens)
- [ ] Review service token expiration dates
- [ ] Update documentation based on learnings
- [ ] Plan for additional Infisical features (optional)

---

## Resources

### Documentation
- [Infisical Documentation](https://infisical.com/docs)
- [Infisical CLI Guide](https://infisical.com/docs/cli/overview)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

### Tools
- [Infisical Dashboard](https://app.infisical.com)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [Infisical CLI GitHub](https://github.com/Infisical/infisical)

### Support
- Infisical Support: support@infisical.com
- Vercel Support: support@vercel.com
- Team channel: #infrastructure

---

## Appendix

### A. Environment Variables Checklist

Copy and use this checklist to verify all secrets are in Infisical:

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

### B. Command Reference

```bash
# Infisical CLI
infisical --version                    # Check version
infisical export --env=dev            # Export secrets
infisical run --env=dev -- <command>  # Run command with secrets

# Development
pnpm dev              # Start with Infisical
pnpm dev:local        # Start with local .env
pnpm build            # Build with Infisical
pnpm build:local      # Build with local .env

# Database
pnpm db:generate      # Generate migrations (Infisical)
pnpm db:migrate       # Apply migrations (Infisical)
pnpm db:studio        # Open Drizzle Studio (Infisical)

# Workers
pnpm workers          # Start workers (Infisical)
pnpm workers:local    # Start workers (local .env)
```

### C. Troubleshooting Quick Reference

| Issue | Solution |
|-------|----------|
| `INFISICAL_TOKEN` not found | `export INFISICAL_TOKEN=<token>` |
| Build timeout | Increase Vercel timeout, add caching |
| Secret not injected | Run `infisical export --env=dev` to verify |
| CLI auth failed | Check token expiration, regenerate |
| Vercel build fails | Check build logs, verify token |
| Local dev fails | Use `pnpm dev:local` fallback |

---

## Conclusion

This plan provides a complete, phased approach to integrating Infisical Cloud for secrets management. By following this plan, we will:

1. ✅ Centralize all secrets in Infisical Cloud
2. ✅ Automate secret injection via CLI
3. ✅ Maintain zero code changes to the application
4. ✅ Provide comprehensive fallback mechanisms
5. ✅ Document all procedures for the team
6. ✅ Ensure security best practices
7. ✅ Enable easy secret rotation and management

**Next Steps**:
1. Review and approve this plan
2. Schedule implementation sprint
3. Assign tasks to team members
4. Begin Phase 1: Infisical Cloud Setup

**Questions or Concerns**:
- Contact: [DevOps Lead]
- Channel: #infrastructure
- Document: `plans/250201-infisical-integration/plan.md`
