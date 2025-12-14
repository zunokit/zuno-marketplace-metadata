# Phase 5: Environment Example & Documentation

---

## Update .env.example

**File:** `.env.example`

Add the following section after the existing environment variables:

```env
# =================================
# Admin API Keys (Optional)
# =================================
# Hardcoded admin API keys for server-to-server communication
# These keys bypass rate limiting and have full admin permissions
#
# Format: Comma-separated list of API keys
# Requirements:
#   - Each key must be at least 32 characters
#   - Use secure random strings (not guessable)
#   - Store securely in production (use secrets manager)
#
# Example:
#   API_KEYS=zuno_prod_admin_key_01_xxxxxxxxxxxx,zuno_prod_admin_key_02_xxxxxxxxxxxx
#
# Generate secure keys:
#   openssl rand -base64 32 | tr -d '/+=' | head -c 40
#   # Or: node -e "console.log('zuno_admin_' + require('crypto').randomBytes(24).toString('base64url'))"
#
# WARNING: Never commit actual keys to version control!
# API_KEYS=
```

---

## Update README.md (Optional)

Add to the Environment Variables section:

```markdown
### Admin API Keys (Optional)

For server-to-server integrations requiring unlimited access:

| Variable | Description | Required |
|----------|-------------|----------|
| `API_KEYS` | Comma-separated admin API keys | No |

**Features:**
- Bypass rate limiting
- Enterprise tier permissions
- Full admin access

**Setup:**
1. Generate secure keys: `openssl rand -base64 32`
2. Set in environment: `API_KEYS=key1,key2`
3. Seed to database: `pnpm db:seed-api-keys`
```

---

## Package.json Script

Add to `package.json` scripts:

```json
{
  "scripts": {
    "db:seed-api-keys": "tsx scripts/seed-admin-api-keys.ts"
  }
}
```

Position after `db:create-public-key`:

```json
{
  "scripts": {
    "db:create-admin": "tsx scripts/create-admin.ts",
    "db:create-public-key": "tsx scripts/create-public-key.ts",
    "db:seed-api-keys": "tsx scripts/seed-admin-api-keys.ts",
    "test": "jest --config tests/setup/jest.config.js"
  }
}
```

---

## Deployment Documentation

### Production Setup

1. **Generate Keys:**
   ```bash
   # Generate 2 admin keys (40 chars each)
   for i in 1 2; do
     echo "zuno_admin_$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"
   done
   ```

2. **Set Environment:**
   ```bash
   # In production secrets manager or .env
   API_KEYS=zuno_admin_xxx...,zuno_admin_yyy...
   ```

3. **Deploy & Seed:**
   ```bash
   pnpm db:migrate
   pnpm db:seed-api-keys
   ```

### Key Rotation

1. Generate new key
2. Add to `API_KEYS` (keep old key temporarily)
3. Run `pnpm db:seed-api-keys`
4. Update client applications
5. Remove old key from `API_KEYS`
6. Disable old key in database (via admin UI)

---

## Security Best Practices

1. **Never commit keys** - Use environment variables or secrets manager
2. **Rotate regularly** - At least every 90 days
3. **Monitor usage** - Check audit logs for admin key activity
4. **Limit distribution** - Only share with trusted services
5. **Use strong keys** - Minimum 32 characters, random
