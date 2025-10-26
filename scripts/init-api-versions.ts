#!/usr/bin/env tsx

/**
 * Initialize API Versions Script
 *
 * This script initializes default API versions in the database
 * Run this after database migrations to ensure API versioning works
 */

import { initializeApiVersions } from "@/shared/lib/utils/api-version";
import { logger } from "@/shared/lib/utils/logger";

async function main() {
  try {
    logger.info("Initializing API versions...");

    await initializeApiVersions();

    logger.info("✅ API versions initialized successfully");
    process.exit(0);
  } catch (error) {
    logger.error("❌ Failed to initialize API versions", { error });
    process.exit(1);
  }
}

main();
