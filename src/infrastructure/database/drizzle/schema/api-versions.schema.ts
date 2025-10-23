import {
  pgTable,
  text,
  timestamp,
  boolean,
  varchar,
} from "drizzle-orm/pg-core";

// ============= API VERSIONING =============
export const apiVersions = pgTable("api_versions", {
  id: text("id").primaryKey(), // e.g., 'v1', '1.0.0','v1.0.0'
  label: varchar("label", { length: 32 }).notNull(), // Human friendly label
  isCurrent: boolean("is_current").notNull().default(false),
  deprecated: boolean("deprecated").notNull().default(false),
  releasedAt: timestamp("released_at").notNull(),
  sunsetAt: timestamp("sunset_at"),
});

// Export table types for TypeScript inference
export type ApiVersion = typeof apiVersions.$inferSelect;
export type NewApiVersion = typeof apiVersions.$inferInsert;