import { z } from "zod";
import { commonSchemas } from "@/shared/lib/api/api-handler";

// Metadata attribute schema
export const metadataAttributeSchema = z.object({
  displayType: z
    .enum(["number", "date", "boost_number", "boost_percentage"])
    .optional(),
  displayValue: z.string().optional(),
  traitType: z.string().min(1, "Trait type is required"),
  value: z.union([z.string(), z.number()]),
  maxValue: z.number().optional(),
});

// Creator schema
export const creatorSchema = z.object({
  address: z.string().min(1, "Creator address is required"),
  verified: z.boolean().default(false),
  share: z.number().min(0).max(100, "Share must be between 0 and 100"),
});

// Base metadata schema
export const metadataSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  description: z
    .string()
    .max(2000, "Description too long")
    .nullable()
    .optional(),
  symbol: z.string().max(10, "Symbol too long").optional(),

  image: z.string().url("Invalid image URL"),
  bannerImage: z.string().url("Invalid banner image URL").optional(),
  featuredImage: z.string().url("Invalid featured image URL").optional(),

  animationUrl: z.string().url("Invalid animation URL").optional(),
  externalUrl: z.string().url("Invalid external URL").nullable().optional(),

  backgroundColor: z
    .string()
    .regex(
      /^[0-9A-Fa-f]{6}$/,
      "Background color must be a 6-character hex code without #"
    )
    .optional(),

  attributes: z.array(metadataAttributeSchema).default([]),

  mediaType: z.enum(["IMAGE", "VIDEO", "GIF", "MODEL_3D"]).default("IMAGE"),

  creators: z.array(creatorSchema).default([]),
  sellerFeeBasisPoints: z
    .number()
    .int("Seller fee must be an integer")
    .min(0)
    .max(10000, "Seller fee cannot exceed 100%")
    .optional(),
  feeRecipient: z.string().optional(),
});

// Create metadata schema
export const createMetadataSchema = z.object({
  body: metadataSchema,
});

// Update metadata schema (all fields optional except version handling)
export const updateMetadataSchema = z.object({
  body: metadataSchema.partial().extend({
    version: z.number().optional(),
    isLocked: z.boolean().optional(),
  }),
  params: commonSchemas.id,
});

// List metadata schema
export const listMetadataSchema = z.object({
  query: commonSchemas.pagination.merge(
    z.object({
      sortBy: z
        .enum(["name", "createdAt", "updatedAt", "version"])
        .optional()
        .default("createdAt"),
      sortOrder: z.enum(["asc", "desc"]).default("desc"),
      search: z.string().min(1, "Search query cannot be empty").optional(),
      mediaType: z.enum(["IMAGE", "VIDEO", "GIF", "MODEL_3D"]).optional(),
      isPinned: z
        .enum(["true", "false"])
        .transform((val) => val === "true")
        .optional(),
      isLocked: z
        .enum(["true", "false"])
        .transform((val) => val === "true")
        .optional(),
    })
  ),
});

// Get metadata schema
export const getMetadataSchema = z.object({
  params: commonSchemas.id,
  query: z
    .object({
      version: z.coerce
        .number()
        .int()
        .min(1, "Version must be at least 1")
        .optional(),
    })
    .optional(),
});

// Delete metadata schema
export const deleteMetadataSchema = z.object({
  params: commonSchemas.id,
});

// ============= TYPE EXPORTS =============
// Export inferred types for use in routes
export type GetMetadataInput = z.infer<typeof getMetadataSchema>;
export type UpdateMetadataInput = z.infer<typeof updateMetadataSchema>;
export type DeleteMetadataInput = z.infer<typeof deleteMetadataSchema>;
export type CreateMetadataInput = z.infer<typeof createMetadataSchema>;
export type ListMetadataInput = z.infer<typeof listMetadataSchema>;

// Batch operations
export const batchCreateMetadataSchema = z.object({
  body: z.object({
    metadata: z
      .array(metadataSchema)
      .min(1, "At least one metadata item required")
      .max(50, "Maximum 50 items per batch"),
  }),
});

export const batchUpdateMetadataSchema = z.object({
  body: z.object({
    updates: z
      .array(
        z.object({
          id: z.string().min(1, "ID is required"),
          data: metadataSchema.partial(),
        })
      )
      .min(1, "At least one update required")
      .max(50, "Maximum 50 updates per batch"),
  }),
});

export const batchDeleteMetadataSchema = z.object({
  body: z.object({
    ids: z
      .array(z.string().min(1, "ID is required"))
      .min(1, "At least one ID required")
      .max(50, "Maximum 50 IDs per batch"),
  }),
});

// Validation helpers
export function validateHexColor(color: string): boolean {
  return /^[0-9A-Fa-f]{6}$/.test(color);
}

export function validateAttributes(attributes: unknown[]): boolean {
  if (!Array.isArray(attributes)) return false;

  // Check for duplicate trait types
  const traitTypes = new Set<string>();
  for (const attr of attributes) {
    if (typeof attr === "object" && attr !== null && "traitType" in attr) {
      const record = attr as Record<string, unknown>;
      const traitType = record.traitType;

      if (typeof traitType !== "string") continue;

      if (traitTypes.has(traitType)) {
        return false; // Duplicate trait type
      }
      traitTypes.add(traitType);
    }
  }

  return true;
}

export function validateCreators(creators: unknown[]): boolean {
  if (!Array.isArray(creators)) return false;

  // Total share should not exceed 100
  let totalShare = 0;
  for (const creator of creators) {
    if (typeof creator === "object" && creator !== null && "share" in creator) {
      const record = creator as Record<string, unknown>;
      const share = record.share;

      if (typeof share === "number") {
        totalShare += share;
      }
    }
  }

  return totalShare <= 100;
}

// Additional type exports for nested schemas
export type MetadataAttribute = z.infer<typeof metadataAttributeSchema>;
export type Creator = z.infer<typeof creatorSchema>;
export type MetadataInput = z.infer<typeof metadataSchema>;
