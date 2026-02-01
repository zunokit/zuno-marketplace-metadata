# Infisical Setup - Phase 2 Manual Tasks

## Task 2.4: Backup Your .env Files

**Automated Steps Completed:**
- ✅ .gitignore updated with Infisical patterns
- ✅ Backup directory created: `.archived-envs/`

**Manual Step Required:**

### Backup Your .env File

Run these commands in your terminal:

```bash
# Check if .env exists
test -f .env && echo ".env exists" || echo ".env not found (no backup needed)"

# Backup .env if it exists
test -f .env && cp .env .archived-envs/.env.backup.$(date +%Y%m%d)

# Backup .env.example
cp .env.example .archived-envs/.env.example.backup.$(date +%Y%m%d)

# List backups
ls -la .archived-envs/
```

**If you get date command errors on Windows:**

```powershell
# PowerShell
if (Test-Path .env) { Copy-Item .env .archived-envs\.env.backup.$((Get-Date).ToString('yyyyMMdd')) }
Copy-Item .env.example .archived-envs\.env.example.backup.$((Get-Date).ToString('yyyyMMdd'))

# List backups
Get-ChildItem .archived-envs
```

---

## Updated .gitignore

Added patterns:
- `.infisical/` - Infisical CLI cache and config

Existing patterns (unchanged):
- `.env*` - Environment files
- `!.env.example` - Keep example file

---

## Package.json Scripts Updated

All scripts now use Infisical CLI:

### Development (uses dev environment)
```bash
pnpm dev              # Start dev server
pnpm workers          # Start workers
pnpm db:generate      # Generate migrations
pnpm db:migrate       # Apply migrations
pnpm db:studio        # Open Drizzle Studio
pnpm db:push          # Push schema
pnpm db:seed          # Seed database
pnpm db:truncate      # Truncate database
pnpm db:reset         # Reset database
pnpm test:e2e         # Run E2E tests
```

### Production (uses production environment)
```bash
pnpm build            # Build for production
pnpm start            # Start production server
pnpm db:seed:prod    # Seed production database
```

### Fallback (uses local .env files)
```bash
pnpm dev:local        # Start dev server with local .env
pnpm build:local      # Build with local .env
pnpm start:local      # Start with local .env
pnpm workers:local    # Start workers with local .env
```

### No secrets needed (unchanged)
```bash
pnpm typecheck        # TypeScript type checking
pnpm lint             # ESLint
pnpm test             # Unit tests
pnpm test:watch       # Watch mode tests
pnpm test:coverage    # Test coverage
pnpm test:all        # All tests
```

---

## Next Steps

### Task 2.4 Completion Checklist

- [ ] Run backup commands above
- [ ] Verify .env files backed up to `.archived-envs/`
- [ ] Verify .gitignore updated
- [ ] Verify package.json scripts updated

### Ready to Test Local Development

Once backup is complete, run:

```bash
# Test local development with Infisical
pnpm dev
```

This should:
1. Fetch secrets from Infisical dev environment
2. Start Next.js dev server
3. Load all 27 secrets into process.env

---

**❓ Have you completed the backup?**

- [ ] Yes, .env backed up
- [ ] No, need help

**After backup confirmation, I'll test local development.**
