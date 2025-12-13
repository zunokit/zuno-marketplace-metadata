import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";

/**
 * Public Key Settings Table
 *
 * Stores the plain text public API key for guest/anonymous access.
 * This is separate from the api_key table because Better Auth hashes API keys.
 *
 * Security Note: This key is intentionally stored as plain text because:
 * 1. It's public-facing (used by anonymous users)
 * 2. It has read-only permissions
 * 3. It's rate-limited
 */
export const publicKeySettings = pgTable("public_key_settings", {
  id: text("id").primaryKey().default("default"),
  apiKey: text("api_key").notNull(), // Plain text public API key
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export type PublicKeySettings = typeof publicKeySettings.$inferSelect;
export type NewPublicKeySettings = typeof publicKeySettings.$inferInsert;
