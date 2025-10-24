import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/shared/config/env";
import * as schema from "./drizzle/schema";
import { tryCatch } from "@/shared/lib/utils/server";

// Create database connection
const connection = postgres(env.DATABASE_URL);

// Create Drizzle instance
export const db = drizzle(connection, { schema });

// Connection health check
export async function checkDbConnection(): Promise<boolean> {
  const result = await tryCatch(
    () => connection`SELECT 1`,
    {
      errorMessage: "Database connection failed",
      shouldLog: true,
    }
  );

  return result.success;
}

// Graceful shutdown
export async function closeDbConnection(): Promise<void> {
  await connection.end();
}

export type Database = typeof db;
export { schema };