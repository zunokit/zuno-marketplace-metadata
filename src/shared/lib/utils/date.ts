/**
 * Date utility functions for safe date handling across different environments
 *
 * Handles inconsistencies between:
 * - Local development (Drizzle returns Date objects)
 * - Production/Vercel (dates may be serialized as strings)
 * - Better Auth responses (mixed date formats)
 */

/**
 * Safely convert date value to ISO string
 *
 * Handles:
 * - Date objects → converts to ISO string
 * - ISO strings → returns as-is
 * - null/undefined → returns null
 * - Invalid dates → returns null
 *
 * @param date - Date value in any format
 * @returns ISO 8601 date string or null
 *
 * @example
 * ```ts
 * toISOString(new Date()) // "2025-10-26T10:00:00.000Z"
 * toISOString("2025-10-26T10:00:00.000Z") // "2025-10-26T10:00:00.000Z"
 * toISOString(null) // null
 * toISOString(undefined) // null
 * ```
 */
export function toISOString(
  date: string | Date | null | undefined
): string | null {
  if (!date) return null;
  if (typeof date === "string") return date;
  if (date instanceof Date) return date.toISOString();

  // Fallback: try to create Date object from unknown format
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Date(date as any).toISOString();
  } catch {
    return null;
  }
}

/**
 * Safely convert date value to ISO string with fallback to current date
 *
 * Use this for required date fields (like createdAt, updatedAt)
 * that must always have a value
 *
 * @param date - Date value in any format
 * @returns ISO 8601 date string (never null)
 *
 * @example
 * ```ts
 * toISOStringOrNow(new Date()) // "2025-10-26T10:00:00.000Z"
 * toISOStringOrNow(null) // Current date ISO string
 * toISOStringOrNow(undefined) // Current date ISO string
 * ```
 */
export function toISOStringOrNow(
  date: string | Date | null | undefined
): string {
  return toISOString(date) || new Date().toISOString();
}
