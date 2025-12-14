/**
 * User Seeder
 * Seeds admin and public API users
 */

import { Seeder, SeedContext, SeedResult } from "../types";
import { db } from "@/infrastructure/database/client";
import { user } from "@/infrastructure/database/drizzle/schema/user.schema";
import { account } from "@/infrastructure/database/drizzle/schema/account.schema";
import { IdGenerator, EntityPrefix } from "@/shared/lib/utils/id-generator";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { hashPassword } from "better-auth/crypto";

interface AdminCredentials {
  email: string;
  password: string;
  wasGenerated: boolean;
}

export class UserSeeder implements Seeder {
  name = "users";
  dependencies: string[] = [];
  parallel = false;

  async execute(context: SeedContext): Promise<SeedResult> {
    const startTime = Date.now();
    let created = 0;
    let skipped = 0;
    const updated = 0;

    try {
      // Admin user
      const adminCreated = await this.createAdminUser(context);
      if (adminCreated) created++;
      else skipped++;

      // Public API user
      const publicCreated = await this.createPublicUser(context);
      if (publicCreated) created++;
      else skipped++;

      const duration = Date.now() - startTime;

      context.logger?.success(
        `User seeding completed: ${created} created, ${skipped} skipped, ${updated} updated`,
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

      context.logger?.error(`User seeding failed: ${errorMessage}`, {
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
   * Create admin user with password authentication
   */
  private async createAdminUser(context: SeedContext): Promise<boolean> {
    try {
      const credentials = this.getAdminCredentials();

      // Check if admin already exists
      const existing = await (context.db as typeof db)
        .select()
        .from(user)
        .where(eq(user.email, credentials.email))
        .limit(1);

      if (existing.length > 0) {
        context.logger?.info(`Admin user already exists: ${credentials.email}`);
        context.shared.adminUserId = existing[0].id;
        return false;
      }

      // Generate IDs
      const userId = IdGenerator.generate({
        prefix: EntityPrefix.USER,
        apiVersion: "v1",
      });
      const accountId = IdGenerator.generate({
        prefix: EntityPrefix.ACCOUNT,
        apiVersion: "v1",
      });

      // Hash password with bcrypt
      const hashedPass = await hashPassword(credentials.password);

      // Create admin user
      const [adminUser] = await (context.db as typeof db)
        .insert(user)
        .values({
          id: userId,
          email: credentials.email,
          name: process.env.ADMIN_NAME || "Admin",
          emailVerified: true,
          role: "admin",
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Create account record (for password authentication)
      await (context.db as typeof db).insert(account).values({
        id: accountId,
        userId: adminUser.id,
        accountId: adminUser.email,
        providerId: "credential",
        password: hashedPass,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Store admin user ID in shared context
      context.shared.adminUserId = adminUser.id;

      // Log credentials if generated
      if (credentials.wasGenerated) {
        context.logger?.warn("⚠️  AUTO-GENERATED ADMIN PASSWORD");
        context.logger?.info(`Email: ${credentials.email}`);
        context.logger?.info(`Password: ${credentials.password}`);
        context.logger?.warn(
          "🔒 CHANGE PASSWORD IMMEDIATELY AFTER FIRST LOGIN"
        );

        // Save to credentials file
        await this.saveCredentialsFile(adminUser.id, credentials);
      }

      context.logger?.info(`Created admin user: ${adminUser.id}`);
      return true;
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        context.logger?.info("Admin user already exists, skipping...");
        return false;
      }
      throw error;
    }
  }

  /**
   * Create public API user (for public API keys)
   */
  private async createPublicUser(context: SeedContext): Promise<boolean> {
    try {
      // Use fixed ID for public user
      const publicUserId =
        process.env.PUBLIC_API_USER_ID || "usr_v1_public_system";

      // Check if public user already exists
      const [existing] = await (context.db as typeof db)
        .select()
        .from(user)
        .where(eq(user.id, publicUserId))
        .limit(1);

      if (existing) {
        context.logger?.info("Public user already exists, skipping...");
        // Still set in shared context for API key seeder
        context.shared.publicUserId = publicUserId;
        return false;
      }

      await (context.db as typeof db).insert(user).values({
        id: publicUserId,
        email: "public@zuno-marketplace.local",
        emailVerified: true,
        name: "Public API User",
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        role: "user",
        banned: true, // Prevent login - this user is for API keys only
        banReason:
          "System account - API keys only. Direct login is not permitted.",
        banExpires: null, // Permanent ban
      });

      context.logger?.info(`Created public user: ${publicUserId}`);
      context.logger?.info(
        `💡 Make sure PUBLIC_API_USER_ID="${publicUserId}" is set in your .env`
      );

      // Store in shared context
      context.shared.publicUserId = publicUserId;

      return true;
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        context.logger?.info("Public user already exists, skipping...");
        return false;
      }
      throw error;
    }
  }

  /**
   * Get or generate admin credentials
   */
  private getAdminCredentials(): AdminCredentials {
    const email = process.env.ADMIN_EMAIL || "admin@zuno-marketplace.local";

    // Priority 1: Use env variable if set
    if (process.env.ADMIN_PASSWORD) {
      return {
        email,
        password: process.env.ADMIN_PASSWORD,
        wasGenerated: false,
      };
    }

    // Priority 2: Auto-generate secure password
    const password = crypto.randomBytes(16).toString("hex");

    return {
      email,
      password,
      wasGenerated: true,
    };
  }

  /**
   * Save credentials to file for reference
   */
  private async saveCredentialsFile(
    userId: string,
    credentials: AdminCredentials
  ): Promise<void> {
    if (!credentials.wasGenerated) return;

    try {
      const credentialsFile = path.join(
        process.cwd(),
        ".admin-credentials.txt"
      );
      const credentialsContent = `
ZUNO MARKETPLACE - ADMIN CREDENTIALS
=====================================
Generated: ${new Date().toISOString()}

User ID:  ${userId}
Email:    ${credentials.email}
Password: ${credentials.password}

⚠️  IMPORTANT SECURITY NOTICE:
- Change this password immediately after first login
- Delete this file after saving the credentials securely
- Never commit this file to version control
`;

      await fs.writeFile(credentialsFile, credentialsContent, "utf-8");
    } catch (error) {
      // Non-critical error, continue without failing
      console.warn("Could not save credentials file:", error);
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
