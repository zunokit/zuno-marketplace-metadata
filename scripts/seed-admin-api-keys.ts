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
import { hashApiKey } from "../src/shared/lib/utils/api-key-hash";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

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
  const systemUserId = nanoid();

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
  const keyId = nanoid();

  // Extract display info
  const keyStart = plaintextKey.slice(0, 8);
  const keyPrefix = plaintextKey.includes("_")
    ? plaintextKey.split("_")[0] + "_"
    : "zuno_";

  // Enterprise tier metadata
  const metadata = {
    type: "organization" as const,
    tier: "enterprise",
    scopes: ["metadata:read", "metadata:write", "metadata:delete", "media:read", "media:write", "media:delete", "admin", "admin:*"],
    notes: `Hardcoded admin API key ${index} - no rate limiting`,
  };

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
    metadata: JSON.stringify(metadata), // ✅ Store as JSON string
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
