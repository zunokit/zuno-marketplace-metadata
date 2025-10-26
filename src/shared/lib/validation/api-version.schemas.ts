import { z } from "zod";

/**
 * API Version Validation Schemas
 */

export const createApiVersionSchema = z.object({
  body: z.object({
    id: z.string().min(1, "Version ID is required").max(32),
    label: z.string().min(1, "Label is required").max(32),
    isCurrent: z.boolean().optional().default(false),
    releasedAt: z.coerce.date(),
    sunsetAt: z.coerce.date().optional(),
  }),
});

export const updateApiVersionSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    label: z.string().min(1).max(32).optional(),
    isCurrent: z.boolean().optional(),
    deprecated: z.boolean().optional(),
    sunsetAt: z.coerce.date().nullable().optional(),
  }),
});

export const deleteApiVersionSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

export type CreateApiVersionInput = z.infer<typeof createApiVersionSchema>;
export type UpdateApiVersionInput = z.infer<typeof updateApiVersionSchema>;
export type DeleteApiVersionInput = z.infer<typeof deleteApiVersionSchema>;
