import {
  pgTable,
  text,
  timestamp,
  integer,
  uuid,
  jsonb,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./user.schema";
import { apiKey } from "./api-key.schema";

// ============= AUDIT LOGS =============
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Can be from session or API key
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  apiKeyId: text("api_key_id").references(() => apiKey.id, {
    onDelete: "set null",
  }),

  method: varchar("method", { length: 10 }).notNull(), // GET, POST, PUT, DELETE
  path: varchar("path", { length: 500 }).notNull(),
  action: varchar("action", { length: 100 }).notNull(),

  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: varchar("user_agent", { length: 500 }),

  resourceType: varchar("resource_type", { length: 50 }),
  resourceId: text("resource_id"), // Changed from uuid to text to support various ID formats

  statusCode: integer("status_code").notNull(),
  duration: integer("duration"), // milliseconds

  metadata: jsonb("metadata").$type<{
    error?: string;
    requestBody?: Record<string, unknown>;
    responseSize?: number;
  }>(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}).enableRLS();

// Export table types for TypeScript inference
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;