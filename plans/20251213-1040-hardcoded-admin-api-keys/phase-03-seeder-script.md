# Phase 3: Admin API Key Seeder Script

**Path:** `scripts/seed-admin-api-keys.ts`

---

## Full Implementation

```typescript
#!/usr/bin/env node
/**
 * Seed Admin API Keys
 *
 * Seeds hardcoded admin API keys from API_KEYS environment variable.
 * Keys have enterprise tier permissions with no rate limiting.
 *
 * Usage: pnpm db:seed-api-keys
 *
 * Environment:
 *   API_KEYS - Comma-separated API keys (minimum 32 chars each)
 *
 * Example:
 *   API_KEYS=zuno_prod_admin_key_01_xxxxx,zuno_prod_admin_key_02_xxxxx pnpm db:seed-api-keys
 */

import "dotenv/config";
import { db } from "../src/infrastructure/database/client";
import { apiKey } from "../src/infrastructure/database/drizzle/schema/api-key.schema";
import { user } from "../src/infrastructure/database/drizzle/schema/user.schema";
import {
  IdGenerator,
  EntityPrefix,
} from "../src/shared/lib/utils/id-generator";
import { hashApiKey } from "../src/shared/lib/utils/api-key-hash";
import { eq } from "drizzle-orm";

// ============ Constants ============

const MIN_KEY_LENGTH = 32;

// ============ Console Colors ============

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

// ============ Helper Functions ============

/**
 * Get or create an admin user for API key ownership
 */
async function getOrCreateAdminUser(): Promise<string> {
  // First, try to find existing admin user
  const [adminUser] = await db
    .select()
    .from(user)
    .where(eq(user.role, "admin"))
    .limit(1);

  if (adminUser) {
    log(`   Found admin user: ${adminUser.email}`, colors.cyan);
    return adminUser.id;
  }

  // No admin found - create system admin user
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

/**
 * Check if error is a unique constraint violation
 */
function isUniqueConstraintError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error);
  return (
    message.includes("duplicate key") ||
    message.includes("unique constraint") ||
    message.includes("already exists")
  );
}

/**
 * Seed a single API key
 */
async function seedApiKey(
  plaintextKey: string,
  adminUserId: string,
  index: number
): Promise<boolean> {
  try {
    // Validate minimum length
    if (plaintextKey.length < MIN_KEY_LENGTH) {
      log(
        `   Key ${index}: Too short (${plaintextKey.length} chars < ${MIN_KEY_LENGTH} required), skipping`,
        colors.yellow
      );
      return false;
    }

    // Hash the key (Better Auth compatible)
    const hashedKey = hashApiKey(plaintextKey);

    // Check if key already exists (by hash)
    const [existing] = await db
      .select()
      .from(apiKey)
      .where(eq(apiKey.key, hashedKey))
      .limit(1);

    if (existing) {
      log(`   Key ${index}: Already exists (hash match), skipping`, colors.yellow);
      return false;
    }

    // Generate unique ID
    const keyId = IdGenerator.generate({
      prefix: EntityPrefix.API_KEY,
      apiVersion: "v1",
    });

    // Extract display info from key
    const keyStart = plaintextKey.slice(0, 8);
    const keyPrefix = plaintextKey.includes("_")
      ? plaintextKey.split("_")[0] + "_"
      : "zuno_";

    // Enterprise tier metadata (no rate limiting)
    const metadata = JSON.stringify({
      type: "enterprise",
      tier: "enterprise",
      scopes: ["*"],
      notes: `Hardcoded admin API key ${index} - no rate limiting`,
    });

    // Full permissions for all resources
    const permissions = JSON.stringify({
      metadata: ["read", "write", "list", "create", "update", "delete"],
      media: ["read", "write", "list", "create", "update", "delete"],
      admin: ["*"],
    });

    // Insert API key
    await db.insert(apiKey).values({
      id: keyId,
      name: `Admin API Key ${index}`,
      key: hashedKey,
      start: keyStart,
      prefix: keyPrefix,
      userId: adminUserId,
      enabled: true,
      rateLimitEnabled: false, // Critical: no rate limiting
      permissions,
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    log(
      `   Key ${index}: Created (${keyStart}...) - enterprise tier, no rate limit`,
      colors.green
    );
    return true;
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      log(
        `   Key ${index}: Already exists (unique constraint), skipping`,
        colors.yellow
      );
      return false;
    }
    throw error;
  }
}

// ============ Main Function ============

async function main() {
  log("\n" + "=".repeat(60), colors.blue);
  log("  Admin API Key Seeder", colors.blue);
  log("=".repeat(60) + "\n", colors.blue);

  // Check for API_KEYS environment variable
  const apiKeysEnv = process.env.API_KEYS;

  if (!apiKeysEnv) {
    log("No API_KEYS environment variable found.", colors.yellow);
    log("\nTo seed admin API keys, set the API_KEYS environment variable:", colors.cyan);
    log("  API_KEYS=key1,key2,key3 pnpm db:seed-api-keys", colors.reset);
    log("\nKeys must be at least 32 characters long.\n", colors.cyan);
    process.exit(0);
  }

  // Parse comma-separated keys
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
    // Step 1: Get or create admin user
    log("Step 1: Resolving admin user for key ownership...", colors.cyan);
    const adminUserId = await getOrCreateAdminUser();

    // Step 2: Seed each key
    log("\nStep 2: Seeding API keys...", colors.cyan);
    let created = 0;
    let skipped = 0;

    for (let i = 0; i < keys.length; i++) {
      const success = await seedApiKey(keys[i], adminUserId, i + 1);
      if (success) created++;
      else skipped++;
    }

    // Summary
    log("\n" + "=".repeat(60), colors.cyan);
    log(`\nSeeding complete!`, colors.green);
    log(`  Created: ${created}`, colors.green);
    log(`  Skipped: ${skipped}`, colors.yellow);

    log("\nAdmin API keys have:", colors.cyan);
    log("  - Enterprise tier (unlimited rate limit)", colors.reset);
    log("  - Full permissions (metadata, media, admin)", colors.reset);
    log("  - Rate limiting disabled", colors.reset);

    log("\n" + "=".repeat(60) + "\n", colors.cyan);
  } catch (error) {
    log("\nError seeding API keys:", colors.red);
    console.error(error);
    process.exit(1);
  }

  process.exit(0);
}

// Run
main();
```

---

## Package.json Script

Add to `package.json`:

```json
{
  "scripts": {
    "db:seed-api-keys": "tsx scripts/seed-admin-api-keys.ts"
  }
}
```

---

## Usage Examples

```bash
# Seed from .env.local
pnpm db:seed-api-keys

# Seed with inline keys
API_KEYS=zuno_admin_key_123456789012345678,zuno_admin_key_987654321098765432 pnpm db:seed-api-keys

# Run during deployment
pnpm db:migrate && pnpm db:seed-api-keys
```

---

## Idempotency

The seeder is fully idempotent:
- Checks for existing keys by hash before inserting
- Catches unique constraint violations gracefully
- Safe to run multiple times

---

## Security Notes

1. Keys are never logged in full - only first 8 characters shown
2. Plaintext keys only exist in environment variable
3. Database stores only SHA-256 hashes
4. Keys linked to admin user for audit trail
