import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./user.schema";

// ============================================
// ACCOUNT TABLE
// Better Auth core table for OAuth provider accounts
// ============================================

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
}).enableRLS();

// Export types for TypeScript inference
export type Account = typeof account.$inferSelect;
export type NewAccount = typeof account.$inferInsert;
