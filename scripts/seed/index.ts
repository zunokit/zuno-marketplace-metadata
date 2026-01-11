#!/usr/bin/env tsx
/**
 * Seed System Entry Point
 * Professional seed system with clean architecture
 */

import "dotenv/config";
import { db } from "@/infrastructure/database/client";
import { SeedOrchestrator } from "./orchestrator";
import { UserSeeder } from "./seeders/user.seeder";
import { ApiKeySeeder } from "./seeders/api-key.seeder";
import { ApiVersionSeeder } from "./seeders/api-version.seeder";
import { SeedLogger } from "./logger";
import { getSeedConfig, overrideConfig } from "./config";

/**
 * Main seed function
 */
export async function seed(config?: {
  environment?: "development" | "staging" | "production";
  clearExisting?: boolean;
  skipSeeders?: string[];
  batchSize?: number;
  useTransactions?: boolean;
  logLevel?: "silent" | "minimal" | "verbose";
}): Promise<void> {
  const seedConfig = overrideConfig({ ...getSeedConfig(), ...config });
  const logger = new SeedLogger(seedConfig);

  try {
    logger.section("Initializing Seed System");

    logger.info("Database connection established");

    // Initialize orchestrator
    const orchestrator = new SeedOrchestrator(seedConfig);

    // Register seeders in dependency order
    // Order: users -> api-versions -> api-keys
    orchestrator.register(new UserSeeder()); // Creates admin + public users
    orchestrator.register(new ApiVersionSeeder()); // Creates API versions
    orchestrator.register(new ApiKeySeeder()); // Creates admin + public API keys

    logger.info(`Registered ${orchestrator.getSeeders().length} seeders`);

    // Execute seeding
    const results = await orchestrator.execute(db);

    // Check for failures
    const failedSeeders = results.filter((r) => !r.success);
    if (failedSeeders.length > 0) {
      logger.error(`${failedSeeders.length} seeders failed`);

      if (seedConfig.environment === "production") {
        process.exit(1);
      }
    }

    logger.success("Seed system completed successfully");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger.error(`Seed system failed: ${errorMessage}`, {
      error: errorMessage,
      stack: errorStack,
    });

    if (seedConfig.environment === "production") {
      process.exit(1);
    } else {
      throw error;
    }
  }
}

/**
 * CLI entry point
 */
if (require.main === module) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const config: Record<string, string | number | boolean> = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace("--", "");
    const value = args[i + 1];

    if (key && value) {
      // Convert string values to appropriate types
      if (key === "clearExisting") {
        config[key] = value === "true";
      } else if (key === "batchSize") {
        config[key] = parseInt(value);
      } else if (key === "useTransactions") {
        config[key] = value === "true";
      } else {
        config[key] = value;
      }
    }
  }

  // Run seeding
  seed(config)
    .then(() => {
      console.log("✅ Seeding completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("❌ Seeding failed:", errorMessage);
      process.exit(1);
    });
}

// Export for programmatic use
export { SeedOrchestrator } from "./orchestrator";
export { SeedLogger } from "./logger";
export { getSeedConfig, overrideConfig } from "./config";
export * from "./types";
