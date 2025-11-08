import { drizzle } from "drizzle-orm/postgres-js";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/shared/config/env";
import * as schema from "./drizzle/schema";
import { tryCatch } from "@/shared/lib/utils/server";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import { logger } from "@/shared/lib/utils/logger";

/**
 * Database Connection Pool Configuration
 *
 * Optimized for Next.js API routes with proper pool sizing to avoid
 * connection exhaustion and improve performance.
 *
 * Key optimizations:
 * - Reduced max connections (10) suitable for API workloads
 * - Balanced idle timeout (60s) for connection reuse
 * - Proper connection lifecycle management
 * - Environment-aware settings
 */

// Environment-aware connection pool settings
const isDev = env.NODE_ENV === "development";
const isProd = env.NODE_ENV === "production";

const poolConfig = {
  // Connection pool sizing
  // - Development: 5 connections (lower resource usage)
  // - Production: 10 connections (balanced for API load)
  // - Test: 2 connections (minimal for tests)
  max: isDev ? 5 : isProd ? 10 : 2,

  // Idle timeout: how long to keep idle connections
  // - 60 seconds allows good reuse during traffic bursts
  // - Prevents stale connections in serverless environments
  idle_timeout: 60,

  // Connect timeout: max time to establish connection
  // - 5 seconds is sufficient for healthy database
  // - Fails fast on connection issues
  connect_timeout: 5,

  // Connection lifetime: max age before recycling
  // - 30 minutes (1800s) prevents stale connections
  // - Balances between reuse and freshness
  max_lifetime: 60 * 30,

  // Performance optimizations
  // - Disabled prepared statements for better compatibility
  // - Transform undefined to null for PostgreSQL compatibility
  prepare: false,
  transform: {
    undefined: null,
  },

  // Suppress PostgreSQL notice messages (e.g., "relation already exists")
  // to reduce log noise while preserving errors and warnings
  onnotice: () => {
    // Silently ignore notices in production
    // In development, you might want to log them for debugging
  },

  // Debug logging only in development
  debug: isDev,
};

// Create database connection with optimized pool settings
const connection = postgres(env.DATABASE_URL, poolConfig);

// Log pool configuration on startup
if (isDev) {
  logger.info("Database connection pool initialized", {
    max: poolConfig.max,
    idle_timeout: poolConfig.idle_timeout,
    connect_timeout: poolConfig.connect_timeout,
    max_lifetime: poolConfig.max_lifetime,
  });
}

// Create Drizzle instance
export const db = drizzle(connection, { schema });

// Transaction type for external use
export type TransactionClient = PgTransaction<
  PostgresJsQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

/**
 * Execute operations in a database transaction
 * All operations will be rolled back if any error occurs
 *
 * @example
 * ```ts
 * await transaction(async (tx) => {
 *   await tx.insert(metadata).values([...]);
 *   await tx.insert(media).values([...]);
 * });
 * ```
 */
export async function transaction<T>(
  callback: (tx: TransactionClient) => Promise<T>
): Promise<T> {
  return db.transaction(callback);
}

/**
 * Connection health check
 * Tests database connectivity with a simple query
 */
export async function checkDbConnection(): Promise<boolean> {
  const result = await tryCatch(() => connection`SELECT 1 AS health`, {
    errorMessage: "Database connection failed",
    shouldLog: true,
  });

  return result.success;
}

/**
 * Get connection pool statistics
 * Useful for monitoring and debugging connection issues
 */
export function getPoolStats(): {
  max: number;
  idle_timeout: number;
  connect_timeout: number;
  max_lifetime: number;
} {
  return {
    max: poolConfig.max,
    idle_timeout: poolConfig.idle_timeout,
    connect_timeout: poolConfig.connect_timeout,
    max_lifetime: poolConfig.max_lifetime,
  };
}

/**
 * Graceful shutdown
 * Closes all active connections and waits for in-flight queries
 */
export async function closeDbConnection(): Promise<void> {
  logger.info("Closing database connection pool");
  await connection.end();
  logger.info("Database connection pool closed");
}

// Export types
export type Database = typeof db;
export { schema };