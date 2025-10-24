import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./user.schema";

// ============================================
// SESSION TABLE
// Better Auth core table for session management
// ============================================

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),

  // Admin plugin - impersonation support
  impersonatedBy: text("impersonated_by"),
}).enableRLS();

// Export types for TypeScript inference
export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;
