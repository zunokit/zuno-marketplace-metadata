import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";

// ============================================
// USER TABLE
// Better Auth core table for user management
// ============================================

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),

  // Admin fields
  role: text("role").notNull().default("user"),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
}).enableRLS();

// Export types for TypeScript inference
export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
