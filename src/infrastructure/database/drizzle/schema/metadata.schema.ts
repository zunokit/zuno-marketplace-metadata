import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { mediaTypeEnum } from "./media.schema";
import { user } from "./user.schema";

// ============= METADATA =============
export const metadata = pgTable("metadata", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),

  // Ownership - required for access control
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),

  // OpenSea Standard Fields
  name: text("name").notNull(),
  description: text("description"),
  symbol: text("symbol"), // Token symbol (Magic Eden/Metaplex)

  image: text("image").notNull(),
  bannerImage: text("banner_image"),
  featuredImage: text("featured_image"),

  animationUrl: text("animation_url"),
  /*
  A URL to a multi-media attachment for the item. The file extensions GLTF, GLB, WEBM, MP4, M4V, OGV, and OGG are supported, along with the audio-only extensions MP3, WAV, and OGA.
  Animation_url also supports HTML pages, allowing you to build rich experiences and interactive NFTs using JavaScript canvas, WebGL, and more. Scripts and relative paths within the HTML page are now supported. However, access to browser extensions is not supported.
  */

  externalUrl: text("external_url"),
  /*
  This is the URL that will appear on OpenSea for the asset and will allow users to leave OpenSea and view the item on your site.
  */

  backgroundColor: text("background_color"),
  /*
  Background color of the item on OpenSea. Must be a six-character hexadecimal without a pre-pended #.
  */

  attributes: jsonb("attributes").$type<{
    displayType?: "number" | "date" | "boost_number" | "boost_percentage";
    displayValue?: string;
    traitType: string;
    value: string | number;
    maxValue?: number; // For numeric traits with ceiling
  }[]>(),

  // Media info (extracted for quick filter)
  mediaType: mediaTypeEnum("media_type").default("IMAGE").notNull(),

  // Storage (simplified)
  ipfsHash: text("ipfs_hash"),
  ipfsUrl: text("ipfs_url"),
  isPinned: boolean("is_pinned").default(false).notNull(),
  pinnedAt: timestamp("pinned_at", { mode: "date" }),

  // Creator royalties (Magic Eden/Metaplex)
  creators: jsonb("creators").$type<{
    address: string;
    verified: boolean;
    share: number; // Percentage share (0-100)
  }[]>(),
  sellerFeeBasisPoints: integer("seller_fee_basis_points"), // Royalty fee in basis points
  feeRecipient: text("fee_recipient"), // Royalty recipient address

  // Version control
  version: integer("version").default(1).notNull(),
  isLocked: boolean("is_locked").default(false).notNull(),

  // Timestamps
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
}).enableRLS();

// Export table types for TypeScript inference
export type Metadata = typeof metadata.$inferSelect;
export type NewMetadata = typeof metadata.$inferInsert;