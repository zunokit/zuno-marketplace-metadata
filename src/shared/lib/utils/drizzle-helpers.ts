import { sql } from "drizzle-orm";

// Helper types for Drizzle operations
export interface DrizzleDeleteResult {
  rowCount: number;
}

export interface DrizzleUpdateResult {
  rowCount: number;
}

// Type-safe helper functions
export function extractRowCount(result: any): number {
  return result?.rowCount ?? 0;
}

export function hasRows(result: any): boolean {
  return extractRowCount(result) > 0;
}

// Helper to avoid type issues with query building
export function buildQuery<T>(baseQuery: T): T {
  return baseQuery;
}

// Helper for count SQL
export const countSql = sql`count(*)`;