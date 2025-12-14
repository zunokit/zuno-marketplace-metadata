/**
 * Seed Configuration
 * Centralized configuration for the seed system
 */

import { SeedConfig } from "./types";

export const DEFAULT_SEED_CONFIG: SeedConfig = {
  environment: "development",
  clearExisting: false,
  skipSeeders: [],
  batchSize: 100,
  useTransactions: true,
  logLevel: "verbose",
};

export const PRODUCTION_SEED_CONFIG: SeedConfig = {
  environment: "production",
  clearExisting: false,
  skipSeeders: ["test-data", "development-only"],
  batchSize: 50,
  useTransactions: true,
  logLevel: "minimal",
};

export const STAGING_SEED_CONFIG: SeedConfig = {
  environment: "staging",
  clearExisting: true,
  skipSeeders: ["test-data"],
  batchSize: 100,
  useTransactions: true,
  logLevel: "verbose",
};

/**
 * Get seed configuration based on environment
 */
export function getSeedConfig(): SeedConfig {
  const env = process.env.NODE_ENV || "development";

  switch (env as "development" | "staging" | "production") {
    case "production":
      return PRODUCTION_SEED_CONFIG;
    case "staging":
      return STAGING_SEED_CONFIG;
    default:
      return DEFAULT_SEED_CONFIG;
  }
}

/**
 * Override configuration with environment variables
 */
export function overrideConfig(config: SeedConfig): SeedConfig {
  return {
    ...config,
    clearExisting:
      process.env.SEED_CLEAR_EXISTING === "true" || config.clearExisting,
    batchSize: parseInt(
      process.env.SEED_BATCH_SIZE || config.batchSize.toString()
    ),
    useTransactions:
      process.env.SEED_USE_TRANSACTIONS !== "false" && config.useTransactions,
    logLevel: (process.env.SEED_LOG_LEVEL as any) || config.logLevel,
    skipSeeders:
      process.env.SEED_SKIP?.split(",").filter(Boolean) || config.skipSeeders,
  };
}
