import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

// ============================================
// VERIFICATION TABLE
// Better Auth core table for email/phone verification
// ============================================

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }),
  updatedAt: timestamp("updated_at", { mode: "date" }),
}).enableRLS();

// Export types for TypeScript inference
export type Verification = typeof verification.$inferSelect;
export type NewVerification = typeof verification.$inferInsert;
