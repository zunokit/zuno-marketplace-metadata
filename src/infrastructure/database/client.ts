import { drizzle } from "drizzle-orm/postgres-js";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/shared/config/env";
import * as schema from "./drizzle/schema";
import { tryCatch } from "@/shared/lib/utils/server";
import type { ExtractTablesWithRelations } from "drizzle-orm";

// Create database connection with optimized settings
const connection = postgres(env.DATABASE_URL, {
  // Connection pool settings
  max: 20, // Maximum number of connections
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout in seconds

  // Query timeout settings
  timeout: 30, // Query timeout in seconds (reduced from default)

  // Connection retry settings
  max_lifetime: 60 * 30, // Maximum connection lifetime (30 minutes)

  // Performance optimizations
  prepare: false, // Disable prepared statements for better performance
  transform: {
    undefined: null, // Transform undefined to null
  },

  // Debug settings (only in development)
  debug: env.NODE_ENV === "development",
});

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

// Connection health check
export async function checkDbConnection(): Promise<boolean> {
  const result = await tryCatch(() => connection`SELECT 1`, {
    errorMessage: "Database connection failed",
    shouldLog: true,
  });

  return result.success;
}

// Graceful shutdown
export async function closeDbConnection(): Promise<void> {
  await connection.end();
}

export type Database = typeof db;
export { schema };