import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  bigint,
  real,
  pgEnum,
} from "drizzle-orm/pg-core";
import { user } from "./user.schema";

// ============= ENUMS =============
export const mediaTypeEnum = pgEnum("media_type", [
  "IMAGE",
  "VIDEO",
  "GIF",
  "MODEL_3D",
]);

// ============= MEDIA STORAGE =============
export const media = pgTable("media", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),

  // Ownership - required for access control
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),

  // File info
  fileName: text("file_name").notNull(),
  fileSize: bigint("file_size", { mode: "number" }).notNull(),
  mimeType: text("mime_type").notNull(),
  mediaType: mediaTypeEnum("media_type").notNull(),

  // Storage URLs
  url: text("url").notNull(), // Primary URL (ImageKit/Supabase)
  ipfsHash: text("ipfs_hash"),
  ipfsUrl: text("ipfs_url"),

  // Dimensions
  width: integer("width"),
  height: integer("height"),
  duration: real("duration"),

  // Optimization
  thumbnailUrl: text("thumbnail_url"),
  optimizedUrl: text("optimized_url"),

  // Metadata
  isPinned: boolean("is_pinned").default(false).notNull(),
  pinnedAt: timestamp("pinned_at", { mode: "date" }),

  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}).enableRLS();

// Export table types for TypeScript inference
export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;