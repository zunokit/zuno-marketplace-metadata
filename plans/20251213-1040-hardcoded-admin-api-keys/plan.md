# Implementation Plan: Hardcoded Admin API Keys

**Plan ID:** 20251213-1040-hardcoded-admin-api-keys
**Status:** Completed - Pending Minor Fixes
**Complexity:** Medium
**Actual Time:** 2-3 hours

---

## Overview

Add support for hardcoded admin API keys from environment variables. These keys bypass rate limiting, have enterprise-tier permissions, and are seeded into the database on application startup or via script.

**Reference Implementation:** zuno-marketplace-abis (same feature)

---

## Requirements Summary

1. Add `API_KEYS` environment variable (comma-separated, 32+ chars minimum)
2. Create seeder script to initialize hardcoded admin keys from environment
3. Implement rate limiting bypass for hardcoded admin keys
4. Use constant-time string comparison for security (timing attack prevention)
5. SHA-256 hashing for API key storage (Better Auth compatible)
6. Enterprise tier permissions with no rate limiting
7. Support comma-separated multiple keys

---

## Architecture Analysis

### Current State (zuno-marketplace-metadata)

| Component | Location | Status |
|-----------|----------|--------|
| Env Config | `src/shared/config/env.ts` | Uses native zod parsing (not t3-oss/env) |
| API Key Schema | `src/infrastructure/database/drizzle/schema/api-key.schema.ts` | Exists, Better Auth managed |
| Rate Limit Service | `src/infrastructure/services/rate-limit.service.ts` | Exists, tier-based |
| API Handler | `src/shared/lib/api/api-handler.ts` | Handles auth & rate limiting |
| Auth Helpers | `src/infrastructure/auth/auth-helpers.ts` | API key verification |
| Scripts | `scripts/` | Has create-admin.ts, create-public-key.ts |
| Seeder Infrastructure | N/A | **Does not exist** - need standalone script |

### Reference Implementation (zuno-marketplace-abis)

| Component | Implementation |
|-----------|----------------|
| Env Config | t3-oss/env-nextjs with `API_KEYS: z.string().optional()` |
| Seeder | `scripts/seed/seeders/api-key.seeder.ts` - complex seeder framework |
| Rate Limit Bypass | `isHardcodedAdminApiKey()` in api-handler.ts |
| Constant-time Compare | `src/shared/lib/utils/compare-string.ts` |
| Key Hashing | SHA-256 base64url (Better Auth defaultKeyHasher compatible) |

---

## Implementation Plan

### Phase 1: Environment Configuration

**File:** `src/shared/config/env.ts`

Add `API_KEYS` to environment schema:

```typescript
// Add after ENABLE_PUBLIC_KEY
// Hardcoded Admin API Keys (comma-separated, no rate limiting)
// Format: API_KEYS=zuno_xxx_admin_01,zuno_xxx_admin_02
API_KEYS: z.string().optional(),
```

**Changes:**
1. Add `API_KEYS` to envSchema with optional string validation
2. No minimum length enforcement at env level (validate in seeder)

---

### Phase 2: Create Constant-Time Comparison Utility

**File:** `src/shared/lib/utils/constant-time-compare.ts` (NEW)

```typescript
/**
 * Constant-time string comparison to prevent timing attacks
 *
 * Uses XOR comparison of buffer bytes regardless of string length
 * to ensure comparison takes same time whether strings match or not.
 */
export function constantTimeCompare(a: string, b: string): boolean {
  const aLen = Buffer.byteLength(a);
  const bLen = Buffer.byteLength(b);
  const maxLen = Math.max(aLen, bLen);

  const bufferA = Buffer.alloc(maxLen);
  const bufferB = Buffer.alloc(maxLen);

  Buffer.from(a).copy(bufferA);
  Buffer.from(b).copy(bufferB);

  let result = aLen === bLen ? 0 : 1;

  for (let i = 0; i < maxLen; i++) {
    result |= bufferA[i] ^ bufferB[i];
  }

  return result === 0;
}
```

---

### Phase 3: Create API Key Hash Utility

**File:** `src/shared/lib/utils/api-key-hash.ts` (NEW)

```typescript
import crypto from "crypto";

/**
 * Hash API key using SHA-256 + base64url (Better Auth compatible)
 *
 * Better Auth uses: SHA-256 -> base64url encoding (no padding)
 * @see https://github.com/better-auth/better-auth defaultKeyHasher
 */
export function hashApiKey(key: string): string {
  const hash = crypto.createHash("sha256").update(key).digest();
  // Convert to base64url without padding (matches Better Auth's defaultKeyHasher)
  return hash.toString("base64url");
}
```

---

### Phase 4: Create Admin API Key Seeder Script

**File:** `scripts/seed-admin-api-keys.ts` (NEW)

```typescript
#!/usr/bin/env node
/**
 * Seed Admin API Keys
 *
 * Seeds hardcoded admin API keys from API_KEYS environment variable.
 * Keys have enterprise tier permissions with no rate limiting.
 *
 * Usage: pnpm db:seed-api-keys
 */

import "dotenv/config";
import { db } from "../src/infrastructure/database/client";
import { apiKey } from "../src/infrastructure/database/drizzle/schema/api-key.schema";
import { user } from "../src/infrastructure/database/drizzle/schema/user.schema";
import { IdGenerator, EntityPrefix } from "../src/shared/lib/utils/id-generator";
import { hashApiKey } from "../src/shared/lib/utils/api-key-hash";
import { eq } from "drizzle-orm";

const MIN_KEY_LENGTH = 32;

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message: string, color = colors.reset): void {
  console.log(`${color}${message}${colors.reset}`);
}

async function getOrCreateAdminUser(): Promise<string> {
  // Try to find existing admin user
  const [adminUser] = await db
    .select()
    .from(user)
    .where(eq(user.role, "admin"))
    .limit(1);

  if (adminUser) {
    log(`   Found admin user: ${adminUser.email}`, colors.cyan);
    return adminUser.id;
  }

  // Fallback: create system admin user
  const systemUserId = IdGenerator.generate({
    prefix: EntityPrefix.USER,
    apiVersion: "v1",
  });

  await db.insert(user).values({
    id: systemUserId,
    email: "system-admin@internal",
    name: "System Admin",
    emailVerified: true,
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  log(`   Created system admin user: system-admin@internal`, colors.green);
  return systemUserId;
}

async function seedApiKey(
  plaintextKey: string,
  adminUserId: string,
  index: number
): Promise<boolean> {
  // Validate key length
  if (plaintextKey.length < MIN_KEY_LENGTH) {
    log(`   Key ${index}: Too short (${plaintextKey.length} < ${MIN_KEY_LENGTH}), skipping`, colors.yellow);
    return false;
  }

  // Hash the key
  const hashedKey = hashApiKey(plaintextKey);

  // Check if already exists
  const [existing] = await db
    .select()
    .from(apiKey)
    .where(eq(apiKey.key, hashedKey))
    .limit(1);

  if (existing) {
    log(`   Key ${index}: Already exists (hash match), skipping`, colors.yellow);
    return false;
  }

  // Generate ID
  const keyId = IdGenerator.generate({
    prefix: EntityPrefix.API_KEY,
    apiVersion: "v1",
  });

  // Extract display info
  const keyStart = plaintextKey.slice(0, 8);
  const keyPrefix = plaintextKey.includes("_")
    ? plaintextKey.split("_")[0] + "_"
    : "zuno_";

  // Enterprise tier metadata
  const metadata = JSON.stringify({
    type: "enterprise",
    tier: "enterprise",
    scopes: ["*"],
    notes: `Hardcoded admin API key ${index} - no rate limiting`,
  });

  // Full permissions
  const permissions = JSON.stringify({
    metadata: ["read", "write", "list", "create", "update", "delete"],
    media: ["read", "write", "list", "create", "update", "delete"],
    admin: ["*"],
  });

  // Insert
  await db.insert(apiKey).values({
    id: keyId,
    name: `Admin API Key ${index}`,
    key: hashedKey,
    start: keyStart,
    prefix: keyPrefix,
    userId: adminUserId,
    enabled: true,
    rateLimitEnabled: false, // No rate limiting for admin keys
    permissions,
    metadata,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  log(`   Key ${index}: Created (${keyStart}...) - enterprise tier`, colors.green);
  return true;
}

async function main() {
  log("\n=== Admin API Key Seeder ===\n", colors.blue);

  const apiKeysEnv = process.env.API_KEYS;

  if (!apiKeysEnv) {
    log("No API_KEYS environment variable found.", colors.yellow);
    log("Set API_KEYS=key1,key2,... to seed admin keys.\n", colors.cyan);
    process.exit(0);
  }

  // Parse keys
  const keys = apiKeysEnv
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

  if (keys.length === 0) {
    log("API_KEYS is set but contains no valid keys.", colors.yellow);
    process.exit(0);
  }

  log(`Found ${keys.length} API key(s) to seed.\n`, colors.cyan);

  try {
    // Get admin user
    log("1. Resolving admin user...", colors.cyan);
    const adminUserId = await getOrCreateAdminUser();

    // Seed each key
    log("\n2. Seeding API keys...", colors.cyan);
    let created = 0;
    let skipped = 0;

    for (let i = 0; i < keys.length; i++) {
      const success = await seedApiKey(keys[i], adminUserId, i + 1);
      if (success) created++;
      else skipped++;
    }

    // Summary
    log("\n" + "=".repeat(50), colors.cyan);
    log(`\nSeeding complete: ${created} created, ${skipped} skipped`, colors.green);
    log("\nAdmin API keys have:", colors.cyan);
    log("  - Enterprise tier (unlimited requests)", colors.reset);
    log("  - Full permissions (metadata, media, admin)", colors.reset);
    log("  - Rate limiting disabled", colors.reset);
    log("=".repeat(50) + "\n", colors.cyan);

  } catch (error) {
    log("\nError seeding API keys:", colors.red);
    console.error(error);
    process.exit(1);
  }

  process.exit(0);
}

main();
```

---

### Phase 5: Update API Handler for Rate Limit Bypass

**File:** `src/shared/lib/api/api-handler.ts`

Add import and helper function at top of file:

```typescript
import { constantTimeCompare } from "@/shared/lib/utils/constant-time-compare";
import { env } from "@/shared/config/env";

/**
 * Check if API key is a hardcoded admin key (bypasses rate limiting)
 * Uses constant-time comparison to prevent timing attacks.
 */
function isHardcodedAdminApiKey(apiKeyValue: string): boolean {
  if (!env.API_KEYS) return false;

  const adminKeys = env.API_KEYS.split(",").map((k) => k.trim());

  for (const adminKey of adminKeys) {
    if (constantTimeCompare(apiKeyValue, adminKey)) {
      return true;
    }
  }

  return false;
}
```

Modify `handleAuth` method to bypass rate limiting for hardcoded admin keys:

```typescript
// Inside handleAuth, after API key is verified successfully:
// (Around line 490, after apiKey is set in context)

// Check if this is a hardcoded admin key - bypass rate limiting
const isHardcodedAdmin = isHardcodedAdminApiKey(apiKeyValue);

if (isHardcodedAdmin) {
  logger.debug("Hardcoded admin API key - bypassing rate limit", {
    keyId: apiKey.id,
  });
  context.rateLimit = {
    limit: Infinity,
    remaining: Infinity,
    reset: 0,
  };
} else {
  // Existing rate limit check code...
  try {
    const rateLimitResult = await RateLimitService.checkLimit(
      { id: apiKey.id, metadata: apiKey.metadata || null },
      {
        ip: getIpAddress(request),
        origin: request.headers.get("origin") || undefined,
      }
    );
    // ... rest of existing code
  }
}
```

---

### Phase 6: Add Package Script

**File:** `package.json`

Add script entry:

```json
{
  "scripts": {
    // ... existing scripts
    "db:seed-api-keys": "tsx scripts/seed-admin-api-keys.ts"
  }
}
```

---

### Phase 7: Update Environment Example

**File:** `.env.example`

Add example:

```env
# Hardcoded Admin API Keys (comma-separated, minimum 32 characters each)
# Format: API_KEYS=zuno_xxx_admin_key_01_xxxxxxxx,zuno_xxx_admin_key_02_xxxxxxxx
# These keys bypass rate limiting and have full admin permissions
# API_KEYS=
```

---

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `src/shared/config/env.ts` | MODIFY | Add `API_KEYS` optional string |
| `src/shared/lib/utils/constant-time-compare.ts` | CREATE | Constant-time string comparison |
| `src/shared/lib/utils/api-key-hash.ts` | CREATE | SHA-256 key hashing utility |
| `scripts/seed-admin-api-keys.ts` | CREATE | Seeder script for admin keys |
| `src/shared/lib/api/api-handler.ts` | MODIFY | Add `isHardcodedAdminApiKey()` and bypass logic |
| `package.json` | MODIFY | Add `db:seed-api-keys` script |
| `.env.example` | MODIFY | Add `API_KEYS` example |

---

## Security Considerations

1. **Timing Attack Prevention:** Use constant-time comparison for all API key checks
2. **Key Storage:** Store only SHA-256 hashes, never plaintext
3. **Minimum Length:** Enforce 32+ character minimum for security
4. **Environment Security:** Keys stored only in environment variables
5. **Audit Trail:** Log admin key usage for monitoring
6. **Bypass Logging:** Log when rate limiting is bypassed for admin keys

---

## Testing Checklist

1. [ ] Set `API_KEYS=testkey123456789012345678901234` in `.env.local`
2. [ ] Run `pnpm db:seed-api-keys` - verify key created
3. [ ] Run again - verify duplicate detection (skipped)
4. [ ] Make API request with seeded key - verify no rate limiting
5. [ ] Make API request with regular key - verify rate limiting works
6. [ ] Test with invalid/short keys - verify rejection
7. [ ] Verify key hash matches Better Auth format

---

## Integration Notes

- This implementation mirrors zuno-marketplace-abis for consistency
- Keys are compatible with Better Auth's API key plugin
- Enterprise tier in `rate-limit.service.ts` already returns `Infinity` limits
- Seeder can be run manually or integrated into CI/CD deploy scripts

---

## Post-Implementation

1. Update deployment documentation
2. Add admin key rotation procedure
3. Consider adding key expiration support
4. Monitor audit logs for admin key usage patterns

## Code Review Status

✅ **Review Completed:** 2025-12-13
📄 **Review Report:** `reports/code-reviewer-251213-hardcoded-admin-api-keys.md`

### Required Fixes (High Priority)
1. Add `import crypto from "crypto";` to `src/shared/lib/api/api-handler.ts`
2. Remove unused imports (`IdGenerator`, `EntityPrefix`) from `scripts/seed-admin-api-keys.ts`

### Optional Improvements
1. Add test coverage for new security functions
2. Consider input validation for environment variables
3. Add more context to rate limit bypass logs
