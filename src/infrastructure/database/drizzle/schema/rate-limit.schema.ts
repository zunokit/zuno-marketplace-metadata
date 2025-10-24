import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";

// ============================================
// RATE LIMIT TABLE
// Better Auth rate limiting storage
// ============================================

export const rateLimit = pgTable("rate_limit", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  lastRequest: timestamp("last_request").notNull(),
}).enableRLS();

// Export types for TypeScript inference
export type RateLimit = typeof rateLimit.$inferSelect;
export type NewRateLimit = typeof rateLimit.$inferInsert;
