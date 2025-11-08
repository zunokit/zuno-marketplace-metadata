import { sql } from "drizzle-orm";

// Helper types for Drizzle operations
export interface DrizzleDeleteResult {
  rowCount: number;
}

export interface DrizzleUpdateResult {
  rowCount: number;
}

// Type-safe helper functions
export function extractRowCount(result: unknown): number {
  // Drizzle drivers return different shapes for write queries. Normalize them here.
  if (typeof result === "object" && result !== null) {
    const record = result as Record<string, unknown>;

    // node-postgres / drizzle-pg
    if (typeof record.rowCount === "number") return record.rowCount as number;

    // sqlite / better-sqlite3
    if (typeof record.changes === "number") return record.changes as number;

    // mysql2
    if (typeof record.affectedRows === "number")
      return record.affectedRows as number;

    // postgres-js (drizzle-orm/postgres-js) exposes `count`
    if (typeof record.count === "number") return record.count as number;

    // libsql / turso
    if (typeof record.rowsAffected === "number")
      return record.rowsAffected as number;
  }

  // Some adapters may return an array of rows (e.g., returning()), fallback to length
  if (Array.isArray(result)) return result.length;

  return 0;
}

export function hasRows(result: unknown): boolean {
  return extractRowCount(result) > 0;
}

// Helper to avoid type issues with query building
export function buildQuery<T>(baseQuery: T): T {
  return baseQuery;
}

// Helper for count SQL
export const countSql = sql`count(*)`;
