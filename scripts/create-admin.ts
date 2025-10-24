import "dotenv/config"; // Load .env file
import { db } from "../src/infrastructure/database/client";
import { user, account } from "../src/infrastructure/database/drizzle/schema/auth.schema";
import { IdGenerator, EntityPrefix } from "../src/shared/lib/utils/id-generator";
import { eq } from "drizzle-orm";
import * as crypto from "crypto";

/**
 * Script to create admin user
 * Usage: tsx scripts/create-admin.ts
 */

async function createAdminUser() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@zuno.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123456";
  const adminName = process.env.ADMIN_NAME || "Admin";

  console.log("Creating admin user...");
  console.log("Email:", adminEmail);
  console.log("Password:", adminPassword);

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
    const bcrypt = require("bcryptjs");
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
    console.log("\n🎉 You can now sign in with:");
    console.log("Email:", adminEmail);
    console.log("Password:", adminPassword);
    console.log("\nSign in at: http://localhost:3000/admin/signin");
  } catch (error) {
    console.error("❌ Error creating admin user:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

createAdminUser();
