import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { user } from "./user.schema";

// ============================================
// SESSION TABLE
// Better Auth core table for session management
// ============================================

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    // Admin plugin - impersonation support
    impersonatedBy: text("impersonated_by"),
  },
  (table) => ({
    // Indexes for better query performance
    tokenIdx: index("session_token_idx").on(table.token),
    userIdIdx: index("session_user_id_idx").on(table.userId),
    expiresAtIdx: index("session_expires_at_idx").on(table.expiresAt),
    // Composite index for common queries
    userExpiresIdx: index("session_user_expires_idx").on(
      table.userId,
      table.expiresAt
    ),
  })
).enableRLS();

// Export types for TypeScript inference
export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;
