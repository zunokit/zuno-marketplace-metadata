import { pgTable, text, integer, bigint } from "drizzle-orm/pg-core";

// ============================================
// RATE LIMIT TABLE
// Better Auth rate limiting storage
// ============================================

export const rateLimit = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull(),
  count: integer("count").notNull().default(0),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
}).enableRLS();

// Export types for TypeScript inference
export type RateLimit = typeof rateLimit.$inferSelect;
export type NewRateLimit = typeof rateLimit.$inferInsert;
