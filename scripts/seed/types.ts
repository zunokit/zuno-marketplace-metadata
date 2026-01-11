/**
 * Seed System Types
 * Type definitions for the seed system
 */

import type { SeedLogger } from "./logger";

/**
 * Seed configuration
 */
export interface SeedConfig {
  environment: "development" | "staging" | "production";
  clearExisting: boolean;
  skipSeeders: string[];
  batchSize: number;
  useTransactions: boolean;
  logLevel: "silent" | "minimal" | "verbose";
}

/**
 * Seed context passed to each seeder
 */
export interface SeedContext {
  db: unknown; // Drizzle database instance (typed as unknown for flexibility)
  config: SeedConfig;
  results: SeedResult[];
  shared: Record<string, unknown>; // Shared data between seeders
  logger?: SeedLogger;
}

/**
 * Result from executing a seeder
 */
export interface SeedResult {
  seeder: string;
  created: number;
  skipped: number;
  updated: number;
  duration: number;
  success: boolean;
  error?: string;
}

/**
 * Seeder interface
 */
export interface Seeder {
  name: string;
  dependencies: string[]; // Names of seeders that must run before this one
  parallel: boolean; // Can this seeder run in parallel with others?
  execute(context: SeedContext): Promise<SeedResult>;
}
