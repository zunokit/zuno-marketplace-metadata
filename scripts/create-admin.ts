import "dotenv/config"; // Load .env file
import { db } from "../src/infrastructure/database/client";
import { user } from "../src/infrastructure/database/drizzle/schema/user.schema";
import { account } from "../src/infrastructure/database/drizzle/schema/account.schema";
import { IdGenerator, EntityPrefix } from "../src/shared/lib/utils/id-generator";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

/**
 * Script to create admin user
 * Usage: tsx scripts/create-admin.ts
 */

/**
 * Generate a secure random password
 */
function generateSecurePassword(length: number = 24): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
  const randomBytes = crypto.randomBytes(length);
  let password = "";

  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length];
  }

  return password;
}

/**
 * Save credentials to .admin-credentials file
 */
function saveCredentials(email: string, password: string, userId: string) {
  const credentialsPath = path.join(process.cwd(), ".admin-credentials");
  const timestamp = new Date().toISOString();

  const content = `# Admin Credentials
# Generated at: ${timestamp}
# IMPORTANT: Keep this file secure and do not commit to version control

Admin Email: ${email}
Admin Password: ${password}
User ID: ${userId}

Sign in URL: ${process.env.BETTER_AUTH_URL || "http://localhost:3000"}/api/auth/signin

---
Note: This file contains sensitive credentials. Make sure it's listed in .gitignore
`;

  fs.writeFileSync(credentialsPath, content, { encoding: "utf-8" });
  console.log("\n✅ Credentials saved to .admin-credentials");
}

async function createAdminUser() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@zuno-marketplace.local";
  // Generate secure password if not provided in env
  const adminPassword = process.env.ADMIN_PASSWORD || generateSecurePassword(24);
  const adminName = process.env.ADMIN_NAME || "Admin";

  console.log("Creating admin user...");
  console.log("Email:", adminEmail);

  try {
    // Check if admin already exists
    const existingAdmin = await db
      .select()
      .from(user)
      .where(eq(user.email, adminEmail))
      .limit(1);

    if (existingAdmin.length > 0) {
      console.log("❌ Admin user already exists!");
      console.log("User ID:", existingAdmin[0].id);
      process.exit(1);
    }

    // Generate user ID
    const userId = IdGenerator.generate({
      prefix: EntityPrefix.USER,
      apiVersion: "v1",
    });

    // Hash password using Better Auth's method (bcrypt)
    // For simplicity, we'll use a basic hash here
    // Better Auth will handle proper hashing when user signs in
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create user
    await db.insert(user).values({
      id: userId,
      email: adminEmail,
      name: adminName,
      emailVerified: true,
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log("✅ Admin user created successfully!");
    console.log("User ID:", userId);

    // Create account with password
    const accountId = IdGenerator.generate({
      prefix: EntityPrefix.ACCOUNT,
      apiVersion: "v1",
    });

    await db.insert(account).values({
      id: accountId,
      accountId: adminEmail,
      providerId: "credential",
      userId: userId,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log("✅ Admin account created successfully!");

    // Save credentials to file
    saveCredentials(adminEmail, adminPassword, userId);

    console.log("\n🎉 You can now sign in with:");
    console.log("Email:", adminEmail);
    console.log("Password: [See .admin-credentials file]");
    console.log("\nSign in at:", process.env.BETTER_AUTH_URL || "http://localhost:3000");
    console.log("\n⚠️  IMPORTANT: Your credentials have been saved to .admin-credentials");
    console.log("    Keep this file secure and do not commit it to version control!");
  } catch (error) {
    console.error("❌ Error creating admin user:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

createAdminUser();
