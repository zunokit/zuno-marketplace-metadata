#!/usr/bin/env node

/**
 * Create Public API Key
 *
 * This script creates a public API key for guest/anonymous access to the home page.
 * The key will have read-only permissions for metadata and media.
 *
 * Usage: npx tsx scripts/create-public-key.ts
 */

import { db } from "../src/infrastructure/database/client";
import { apiKey, user, publicKeySettings } from "../src/infrastructure/database/drizzle/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { auth } from "../src/infrastructure/auth/better-auth.config";

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message: string, color: string = colors.reset): void {
  console.log(`${color}${message}${colors.reset}`);
}

async function createPublicApiKey() {
  try {
    log("\n🔑 Creating Public API Key...\n", colors.blue);

    // 1. Find or create system user
    log("1. Checking for system user...", colors.cyan);
    let systemUser = await db
      .select()
      .from(user)
      .where(eq(user.email, "system@internal"))
      .limit(1)
      .then((rows) => rows[0]);

    if (!systemUser) {
      log("   Creating system user...", colors.yellow);
      const [newUser] = await db
        .insert(user)
        .values({
          id: nanoid(),
          email: "system@internal",
          name: "System",
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      systemUser = newUser;
      log("   ✅ System user created", colors.green);
    } else {
      log("   ✅ System user found", colors.green);
    }

    // 2. Check if public key already exists
    log("\n2. Checking for existing public API key...", colors.cyan);
    const existingKeys = await db
      .select()
      .from(apiKey)
      .where(eq(apiKey.userId, systemUser.id));

    const existingPublicKey = existingKeys.find((key) => {
      try {
        const metadata = typeof key.metadata === "string"
          ? JSON.parse(key.metadata)
          : key.metadata;
        return metadata?.type === "public";
      } catch {
        return false;
      }
    });

    if (existingPublicKey) {
      log("   ⚠️  Public API key already exists!", colors.yellow);
      log(`   Key ID: ${existingPublicKey.id}`, colors.cyan);
      log(`   Key: ${existingPublicKey.key}`, colors.cyan);
      log(`   Start: ${existingPublicKey.start}`, colors.cyan);

      // Ask if user wants to create a new one
      const readline = await import("readline");
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const answer = await new Promise<string>((resolve) => {
        rl.question("\n   Do you want to create a new one? (y/N): ", resolve);
      });
      rl.close();

      if (answer.toLowerCase() !== "y") {
        log("\n✅ Using existing public API key", colors.green);
        return;
      }

      // Disable the old key
      await db
        .update(apiKey)
        .set({ enabled: false })
        .where(eq(apiKey.id, existingPublicKey.id));
      log("\n   ✅ Old public key disabled", colors.yellow);
    } else {
      log("   ✅ No existing public key found", colors.green);
    }

    // 3. Create public API key using Better Auth
    log("\n3. Creating API key via Better Auth...", colors.cyan);
    const result = await auth.api.createApiKey({
      body: {
        userId: systemUser.id,
        name: "Public API Key (Guest Access)",
        permissions: {
          metadata: ["read", "write"],
          media: ["read", "write"],
        },
        metadata: {
          type: "public",
          scopes: ["metadata:read", "metadata:write", "media:read", "media:write"],
          notes: "Guest/anonymous access for home page with write permissions",
        },
      },
    });

    if (!result || !result.key) {
      throw new Error("Failed to create API key - no key returned");
    }

    log(`   ✅ API key created successfully!`, colors.green);

    // 4. Enable rate limiting
    log("\n4. Configuring rate limiting...", colors.cyan);
    await db
      .update(apiKey)
      .set({
        rateLimitEnabled: true,
        rateLimitMax: 100,
        rateLimitTimeWindow: 60000, // 100 requests per minute
      })
      .where(eq(apiKey.id, result.id));

    log("   ✅ Rate limiting configured", colors.green);

    // 5. Save plain text key to public_key_settings
    log("\n5. Saving plain text key to public_key_settings...", colors.cyan);

    // Check if settings already exist
    const [existingSettings] = await db
      .select()
      .from(publicKeySettings)
      .where(eq(publicKeySettings.id, "default"))
      .limit(1);

    if (existingSettings) {
      // Update existing
      await db
        .update(publicKeySettings)
        .set({
          apiKey: result.key,
          enabled: true,
          updatedAt: new Date(),
        })
        .where(eq(publicKeySettings.id, "default"));
    } else {
      // Create new
      await db.insert(publicKeySettings).values({
        id: "default",
        apiKey: result.key,
        enabled: true,
      });
    }

    log("   ✅ Plain text key saved for frontend use", colors.green);

    // 6. Display summary
    log("\n" + "=".repeat(60), colors.cyan);
    log("\n✨ Public API Key Created Successfully!\n", colors.green);
    log("📋 Details:", colors.cyan);
    log(`   ID:      ${result.id}`, colors.reset);
    log(`   Name:    Public API Key (Guest Access)`, colors.reset);
    log(`   Key:     ${result.key}`, colors.yellow);
    log(`   Enabled: true`, colors.reset);
    log(`   Permissions: metadata:read, media:read`, colors.reset);
    log(`   Rate Limit: 100 requests/minute`, colors.reset);

    log("\n⚠️  IMPORTANT: Save the key above - it won't be shown again!", colors.yellow);
    log("\n🚀 Next steps:", colors.cyan);
    log("   1. The home page will now fetch this key automatically", colors.reset);
    log("   2. Test it: Visit http://localhost:3000", colors.reset);
    log("   3. Run E2E tests: pnpm test:e2e\n", colors.reset);
    log("=".repeat(60), colors.cyan);

  } catch (error) {
    log("\n❌ Error creating public API key:", colors.red);
    console.error(error);
    process.exit(1);
  }
}

// Run the script
createPublicApiKey()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
