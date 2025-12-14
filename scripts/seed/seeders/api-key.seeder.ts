/**
 * API Key Seeder
 * Seeds hardcoded admin API keys and public API key
 */

import { Seeder, SeedContext, SeedResult } from "../types";
import { db } from "@/infrastructure/database/client";
import {
  apiKey,
  publicKeySettings,
} from "@/infrastructure/database/drizzle/schema";
import { eq } from "drizzle-orm";
import { hashApiKey } from "@/shared/lib/utils/api-key-hash";
import { nanoid } from "nanoid";
import { auth } from "@/infrastructure/auth/better-auth.config";

const MIN_KEY_LENGTH = 32;

export class ApiKeySeeder implements Seeder {
  name = "api-keys";
  dependencies = ["users"];
  parallel = false;

  async execute(context: SeedContext): Promise<SeedResult> {
    const startTime = Date.now();
    let created = 0;
    let skipped = 0;
    const updated = 0;

    try {
      // 1. Seed admin API keys from environment
      const adminResult = await this.seedAdminApiKeys(context);
      created += adminResult.created;
      skipped += adminResult.skipped;

      // 2. Create public API key
      const publicResult = await this.createPublicApiKey(context);
      if (publicResult) created++;
      else skipped++;

      const duration = Date.now() - startTime;

      context.logger?.success(
        `API key seeding completed: ${created} created, ${skipped} skipped`,
        { duration }
      );

      return {
        seeder: this.name,
        created,
        skipped,
        updated,
        duration,
        success: true,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      context.logger?.error(`API key seeding failed: ${errorMessage}`, {
        error: errorMessage,
      });

      return {
        seeder: this.name,
        created,
        skipped,
        updated,
        duration,
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Seed admin API keys from API_KEYS environment variable
   */
  private async seedAdminApiKeys(
    context: SeedContext
  ): Promise<{ created: number; skipped: number }> {
    let created = 0;
    let skipped = 0;

    const apiKeysEnv = process.env.API_KEYS;

    if (!apiKeysEnv) {
      context.logger?.info("No API_KEYS env variable found, skipping admin keys...");
      return { created, skipped };
    }

    const keys = apiKeysEnv
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    if (keys.length === 0) {
      context.logger?.info("No valid API keys found in API_KEYS env");
      return { created, skipped };
    }

    context.logger?.info(`Found ${keys.length} admin API keys to seed`);

    // Get admin user ID from shared context
    const adminUserId = context.shared.adminUserId as string | undefined;
    if (!adminUserId) {
      throw new Error(
        "Admin user ID not found in shared context. Users seeder must run first."
      );
    }

    for (let i = 0; i < keys.length; i++) {
      const plaintextKey = keys[i];
      const keyCreated = await this.createAdminApiKey(
        context,
        plaintextKey,
        adminUserId,
        i + 1
      );

      if (keyCreated) {
        created++;
      } else {
        skipped++;
      }
    }

    return { created, skipped };
  }

  /**
   * Create a single admin API key
   */
  private async createAdminApiKey(
    context: SeedContext,
    plaintextKey: string,
    userId: string,
    index: number
  ): Promise<boolean> {
    try {
      // Validate key length
      if (plaintextKey.length < MIN_KEY_LENGTH) {
        context.logger?.warn(
          `Admin key ${index}: Too short (${plaintextKey.length} < ${MIN_KEY_LENGTH}), skipping`
        );
        return false;
      }

      // Hash the API key
      const hashedKey = hashApiKey(plaintextKey);

      // Check if key already exists (by hash)
      const [existing] = await (context.db as typeof db)
        .select()
        .from(apiKey)
        .where(eq(apiKey.key, hashedKey))
        .limit(1);

      if (existing) {
        context.logger?.info(
          `Admin key ${index} already exists (hash match), skipping`
        );
        return false;
      }

      // Generate ID
      const keyId = nanoid();

      // Extract prefix and start for display
      const keyStart = plaintextKey.slice(0, 8);
      const keyPrefix = plaintextKey.includes("_")
        ? plaintextKey.split("_")[0] + "_"
        : "zuno_";

      // Enterprise tier metadata (using "organization" type as schema doesn't have "enterprise")
      const metadataObj = {
        type: "organization" as const,
        scopes: ["*"], // Wildcard for admin - has all permissions
        notes: `Hardcoded admin API key ${index} - no rate limiting, enterprise tier`,
      };
      // Drizzle requires JSON string for text fields with .$type<>()
      const metadata = JSON.stringify(metadataObj) as any;

      // Full permissions
      const permissions = JSON.stringify({
        metadata: ["read", "write", "list", "create", "update", "delete"],
        media: ["read", "write", "list", "create", "update", "delete"],
        admin: ["*"],
      });

      // Insert API key
      await (context.db as typeof db).insert(apiKey).values({
        id: keyId,
        name: `Admin API Key ${index}`,
        key: hashedKey,
        start: keyStart,
        prefix: keyPrefix,
        userId: userId,
        enabled: true,
        rateLimitEnabled: false, // No rate limiting for admin keys
        permissions,
        metadata, // Drizzle handles serialization
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      context.logger?.info(
        `Created admin key ${index}: ${keyStart}... (enterprise tier, no rate limit)`
      );
      return true;
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        context.logger?.info(
          `Admin key ${index} already exists (unique constraint), skipping`
        );
        return false;
      }
      throw error;
    }
  }

  /**
   * Create public API key for guest access
   */
  private async createPublicApiKey(context: SeedContext): Promise<boolean> {
    try {
      context.logger?.info("Creating public API key...");

      // Get public user ID from shared context
      const publicUserId = context.shared.publicUserId as string | undefined;
      if (!publicUserId) {
        throw new Error(
          "Public user ID not found in shared context. Users seeder must run first."
        );
      }

      // Check if public key already exists
      const existingKeys = await (context.db as typeof db)
        .select()
        .from(apiKey)
        .where(eq(apiKey.userId, publicUserId));

      const existingPublicKey = existingKeys.find((key) => {
        try {
          const metadata =
            typeof key.metadata === "string"
              ? JSON.parse(key.metadata)
              : key.metadata;
          return metadata?.type === "public";
        } catch {
          return false;
        }
      });

      if (existingPublicKey) {
        context.logger?.info("Public API key already exists, skipping");
        return false;
      }

      // Create public API key using Better Auth
      const result = await auth.api.createApiKey({
        body: {
          userId: publicUserId,
          name: "Public API Key (Guest Access)",
          permissions: {
            metadata: ["read", "write"],
            media: ["read", "write"],
          },
          metadata: {
            type: "public",
            scopes: [
              "metadata:read",
              "metadata:write",
              "media:read",
              "media:write",
            ],
            notes: "Guest/anonymous access for home page with write permissions",
          },
        },
      });

      if (!result || !result.key) {
        throw new Error("Failed to create public API key - no key returned");
      }

      // Configure rate limiting
      await (context.db as typeof db)
        .update(apiKey)
        .set({
          rateLimitEnabled: true,
          rateLimitMax: 100,
          rateLimitTimeWindow: 60000, // 100 requests per minute
        })
        .where(eq(apiKey.id, result.id));

      // Save plain text key to public_key_settings for frontend use
      const [existingSettings] = await (context.db as typeof db)
        .select()
        .from(publicKeySettings)
        .where(eq(publicKeySettings.id, "default"))
        .limit(1);

      if (existingSettings) {
        // Update existing
        await (context.db as typeof db)
          .update(publicKeySettings)
          .set({
            apiKey: result.key,
            enabled: true,
            updatedAt: new Date(),
          })
          .where(eq(publicKeySettings.id, "default"));
      } else {
        // Create new
        await (context.db as typeof db).insert(publicKeySettings).values({
          id: "default",
          apiKey: result.key,
          enabled: true,
        });
      }

      context.logger?.info(`Created public API key: ${result.key.slice(0, 16)}...`);
      context.logger?.info("Rate limiting: 100 requests/minute");

      return true;
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        context.logger?.info("Public API key already exists, skipping");
        return false;
      }
      throw error;
    }
  }

  private isUniqueConstraintError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const message = error.message.toLowerCase();
    return (
      message.includes("duplicate key") ||
      message.includes("unique constraint") ||
      message.includes("already exists")
    );
  }
}
