import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/shared/config/env";
import * as schema from "./drizzle/schema";
import { tryCatch } from "@/shared/lib/utils/server";
import { createLazyInitializer } from "@/shared/lib/utils/lazy-init";

/**
 * Lazy-initialized PostgreSQL connection
 * Defers connection until first database access
 */
const getConnection = createLazyInitializer(() => {
  const databaseUrl = env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "Database configuration missing. Ensure DATABASE_URL is set."
    );
  }

  return postgres(databaseUrl, {
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
});

/**
 * Lazy-initialized Drizzle ORM instance
 */
const getDb = createLazyInitializer(() => {
  return drizzle(getConnection(), { schema });
});

/**
 * Export database instance with lazy initialization
 * Safe for both build-time imports and runtime usage
 */
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get: (_, prop) => {
    const instance = getDb();
    const value = instance[prop as keyof typeof instance];
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

/**
 * Connection health check
 */
export async function checkDbConnection(): Promise<boolean> {
  const result = await tryCatch(() => getConnection()`SELECT 1`, {
    errorMessage: "Database connection failed",
    shouldLog: true,
  });

  return result.success;
}

/**
 * Graceful shutdown
 */
export async function closeDbConnection(): Promise<void> {
  await getConnection().end();
}

export type Database = typeof db;
export { schema };