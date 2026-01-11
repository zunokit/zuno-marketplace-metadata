#!/usr/bin/env tsx
/**
 * Database Truncate Utility
 *
 * Safely truncates all tables in the database
 * Run this to clear all data before reseeding
 *
 * Usage: tsx scripts/db-truncate.ts
 */

import "dotenv/config";
import { db } from "../src/infrastructure/database/client";
import { sql } from "drizzle-orm";

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

function logSection(title: string): void {
  console.log("");
  log("=".repeat(60), colors.blue);
  log(`  ${title}`, colors.cyan);
  log("=".repeat(60), colors.blue);
  console.log("");
}

// Tables to truncate in dependency order (children first)
const TABLES_TO_TRUNCATE = [
  "api_key",
  "session",
  "account",
  "metadata",
  "media",
  "api_versions",
  "public_key_settings",
  "user",
];

async function truncateDatabase(): Promise<void> {
  logSection("Database Truncate Utility");

  log("⚠️  This will DELETE ALL data in the following tables:", colors.yellow);
  TABLES_TO_TRUNCATE.forEach((table) => {
    log(`   - ${table}`, colors.cyan);
  });
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
    log("Operation cancelled by user.", colors.yellow);
    process.exit(0);
  }

  try {
    log("\nTruncating tables...", colors.cyan);
    console.log("");

    for (const table of TABLES_TO_TRUNCATE) {
      try {
        log(`  - Truncating ${table}...`, colors.cyan);
        await db.execute(sql`TRUNCATE TABLE ${sql.raw(table)} CASCADE;`);
        log(`    ✅ ${table} truncated`, colors.green);
      } catch (error) {
        log(`    ❌ Failed to truncate ${table}: ${(error as Error).message}`, colors.red);
      }
    }

    console.log("");
    log("✅ Database truncated successfully!", colors.green);
    console.log("");
    log("🚀 Next steps:", colors.cyan);
    log("   Run: pnpm db:seed", colors.reset);
    log("   Or:  pnpm db:reset (truncate + seed)", colors.reset);
    console.log("");

  } catch (error) {
    log("\n❌ Error truncating database:", colors.red);
    console.error(error);
    process.exit(1);
  }
}

// Handle Ctrl+C gracefully
process.on("SIGINT", () => {
  log("\n\nOperation cancelled by user.", colors.yellow);
  process.exit(0);
});

// Run truncate
truncateDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
