#!/usr/bin/env tsx
/**
 * Clean Database and Reseed Script
 *
 * This script will:
 * 1. Clean all data from database tables
 * 2. Recreate the schema
 * 3. Run all seed scripts
 *
 * Usage: pnpm tsx scripts/clean-and-seed.ts
 */

import "dotenv/config";
import { db } from "../src/infrastructure/database/client";
import { sql } from "drizzle-orm";
import { execSync } from "child_process";

// ANSI color codes for output
const color = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  white: "\x1b[37m",
};

function log(message: string, colorCode: string = color.reset): void {
  console.log(`${colorCode}${message}${color.reset}`);
}

function logHeader(title: string): void {
  console.log("");
  console.log(color.blue + "=".repeat(60));
  console.log(color.cyan + `  ${title}`);
  console.log(color.blue + "=".repeat(60));
  console.log("");
}

function logSection(title: string): void {
  console.log("");
  console.log(color.yellow + `▶ ${title}`);
  console.log("");
}

// Tables to clean in dependency order (children first)
const TABLES_TO_CLEAN = [
  "api_key",
  "session",
  "account",
  "metadata",
  "media",
  "api_versions",
  "user",
];

async function cleanDatabase(): Promise<void> {
  logSection("Cleaning Database Tables");

  for (const table of TABLES_TO_CLEAN) {
    try {
      log(`  - Truncating table: ${table}`, color.cyan);
      await db.execute(sql`TRUNCATE TABLE ${sql.raw(table)} CASCADE;`);
      log(`    ✅ ${table} cleaned`, color.green);
    } catch (error) {
      log(`    ❌ Failed to clean ${table}: ${(error as Error).message}`, color.red);
    }
  }

  log("✅ All database tables cleaned", color.green);
}

async function recreateSchema(): Promise<void> {
  logSection("Recreating Database Schema");

  try {
    log("  - Generating migrations...", color.cyan);
    execSync("pnpm db:generate", { stdio: "inherit" });
    log("    ✅ Migrations generated", color.green);

    log("  - Pushing schema to database...", color.cyan);
    execSync("pnpm db:push", { stdio: "inherit" });
    log("    ✅ Schema pushed successfully", color.green);
  } catch (error) {
    log(`    ❌ Schema recreation failed: ${(error as Error).message}`, color.red);
    throw error;
  }
}

async function runSeedScripts(): Promise<void> {
  logSection("Running Seed Scripts");

  const adminKey = "zuno_xxxxxxxxxxxxxxxxxxxx_admin_xxxxxxxxxxxxxxxxxxxx_01";
  const env = { ...process.env, API_KEYS: adminKey };

  try {
    // Create admin user
    log("  - Creating admin user...", color.cyan);
    execSync("pnpm db:create-admin", { stdio: "inherit", env });
    log("    ✅ Admin user created", color.green);

    // Create public API key
    log("  - Creating public API key...", color.cyan);
    execSync("pnpm db:create-public-key", { stdio: "inherit", env });
    log("    ✅ Public API key created", color.green);

    // Seed admin API keys
    log("  - Seeding admin API keys...", color.cyan);
    execSync("pnpm db:seed-api-keys", { stdio: "inherit", env });
    log("    ✅ Admin API keys seeded", color.green);

  } catch (error) {
    log(`    ❌ Seed script failed: ${(error as Error).message}`, color.red);
    throw error;
  }
}

async function showSummary(): Promise<void> {
  logSection("Summary");

  log("✅ Database successfully cleaned and reseeded!", color.green);
  console.log("");

  log("📋 Created Resources:", color.cyan);
  log("  • Admin user: admin@zuno-marketplace.local");
  log(`  • Admin API Key: zuno_xxxxxxxxxxxxxxxxxxxx_admin_xxxxxxxxxxxxxxxxxxxx_01`);
  log("  • Public API Key: Created via seeder");
  console.log("");

  log("🔑 Admin API Key Permissions:", color.cyan);
  log("  • metadata:read, metadata:write, metadata:delete");
  log("  • media:read, media:write, media:delete");
  log("  • admin (admin endpoint access)");
  log("  • admin:* (wildcard admin access)");
  log("  • Rate limiting: DISABLED (unlimited requests)");
  console.log("");

  log("🚀 Usage Example:", color.cyan);
  console.log("  curl -H 'Authorization: Bearer YOUR_ADMIN_KEY_HERE' \\");
  console.log("       -H 'x-api-version: v1' \\");
  console.log("       http://localhost:3000/api/metadata");
  console.log("");
}

async function main(): Promise<void> {
  logHeader("Database Clean and Seed Utility");

  log("⚠️  This will DELETE ALL data in the database!", color.yellow);
  log("   - All metadata records");
  log("   - All media records");
  log("   - All API keys");
  log("   - All users and sessions");
  console.log("");

  // Ask for confirmation
  process.stdout.write("Are you sure you want to continue? (y/N): ");

  const answer = await new Promise<string>((resolve) => {
    process.stdin.once("data", (data) => {
      resolve(data.toString().trim().toLowerCase());
    });
    process.stdin.resume();
  });

  if (answer !== "y" && answer !== "yes") {
    log("Operation cancelled by user.", color.yellow);
    process.exit(0);
  }

  try {
    log("Starting clean and seed process...", color.blue);
    console.log("");

    // Step 1: Clean database
    await cleanDatabase();

    // Step 2: Recreate schema
    await recreateSchema();

    // Step 3: Run seed scripts
    await runSeedScripts();

    // Show summary
    await showSummary();

    log("✨ All done! Your database is fresh and ready to use.", color.magenta);
    process.exit(0);

  } catch (error) {
    log("\n❌ Error during clean and seed process:", color.red);
    console.error(error);
    process.exit(1);
  }
}

// Handle Ctrl+C gracefully
process.on("SIGINT", () => {
  log("\n\nOperation cancelled by user.", color.yellow);
  process.exit(0);
});

// Run main function
main();