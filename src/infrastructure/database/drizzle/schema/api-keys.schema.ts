import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { users } from "./auth.schema";

// ============= API KEYS =============
export const apiKeys = pgTable("api_keys", {
  // Core Identity Fields
  id: text("id").primaryKey(),
  name: text("name").notNull(),

  // Key Management
  start: text("start"), // First few chars for UI display
  prefix: text("prefix"), // Custom prefix (e.g., 'sk_live_', 'pk_test_')
  key: text("key").notNull().unique(), // Hashed API key

  // User Association
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // Rate Limiting
  rateLimitEnabled: boolean("rate_limit_enabled").default(false),
  rateLimitTimeWindow: integer("rate_limit_time_window"), // Time window in ms
  rateLimitMax: integer("rate_limit_max"), // Max requests per window
  requestCount: integer("request_count").default(0), // Current request count

  // Usage Tracking & Refill System
  remaining: integer("remaining"), // Remaining requests (for quota system)
  refillAmount: integer("refill_amount"), // Amount to refill when refilling
  refillInterval: integer("refill_interval"), // Interval in ms to refill
  lastRefillAt: timestamp("last_refill_at"), // When was last refill
  lastRequest: timestamp("last_request"), // When was last API request

  // Status & Expiration
  enabled: boolean("enabled").default(true).notNull(), // Is key active/enabled
  expiresAt: timestamp("expires_at"), // Optional expiration date
  permissions: text("permissions"), // JSON string: '{record<string, string[]>}'

  metadata: jsonb("metadata").$type<{
    // Key type
    scopes?: string[];

    // Security restrictions
    ipWhitelist?: string[]; // ['192.168.1.1', '10.0.0.0/8']
    allowedOrigins?: string[]; // ['https://example.com']
    allowedMethods?: string[]; // ['GET', 'POST', 'PUT', 'DELETE']

    notes?: string; // Internal notes about this key
  }>(),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

// Export table types for TypeScript inference
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;