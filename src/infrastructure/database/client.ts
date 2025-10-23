import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/shared/config/env";
import * as schema from "./drizzle/schema";

// Create database connection
const connection = postgres(env.DATABASE_URL);

// Create Drizzle instance
export const db = drizzle(connection, { schema });

// Connection health check
export async function checkDbConnection(): Promise<boolean> {
  try {
    await connection`SELECT 1`;
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
}

// Graceful shutdown
export async function closeDbConnection(): Promise<void> {
  await connection.end();
}

export type Database = typeof db;
export { schema };