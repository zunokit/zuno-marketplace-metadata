import { z } from "zod";

/**
 * POST /api/admin/api-keys - Create API key
 */
export const createApiKeySchema = z.object({
  body: z.object({
    name: z.string().min(3).max(100),
    permissions: z.record(z.string(), z.array(z.string())),
    expiresIn: z
      .number()
      .int()
      .min(60)
      .max(365 * 24 * 60 * 60)
      .optional(), // Min 60 seconds (1 minute), max 1 year in seconds
    metadata: z
      .object({
        scopes: z.array(z.string()).optional(),
        notes: z.string().max(500).optional(),
        type: z.enum(["personal", "organization", "public"]).optional(),
        ipWhitelist: z.array(z.string()).optional(),
        allowedOrigins: z.array(z.string()).optional(),
      })
      .optional(),
  }),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;

/**
 * GET /api/admin/api-keys - List API keys
 */
export const listApiKeysSchema = z.object({
  query: z
    .object({
      page: z.coerce.number().int().positive().default(1).optional(),
      limit: z.coerce.number().int().positive().max(100).default(20).optional(),
      enabled: z.coerce.boolean().optional(),
    })
    .optional(),
});

export type ListApiKeysInput = z.infer<typeof listApiKeysSchema>;

/**
 * PUT /api/admin/api-keys/[id] - Update API key
 */
export const updateApiKeySchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    name: z.string().min(3).max(100).optional(),
    enabled: z.boolean().optional(),
    permissions: z.record(z.string(), z.array(z.string())).optional(),
    metadata: z
      .object({
        scopes: z.array(z.string()).optional(),
        notes: z.string().max(500).optional(),
        type: z.enum(["personal", "organization", "public"]).optional(),
        ipWhitelist: z.array(z.string()).optional(),
        allowedOrigins: z.array(z.string()).optional(),
      })
      .optional(),
  }),
});

export type UpdateApiKeyInput = z.infer<typeof updateApiKeySchema>;

/**
 * DELETE /api/admin/api-keys/[id] - Delete API key
 */
export const deleteApiKeySchema = z.object({
  params: z.object({
    id: z.string(),
  }),
});

// Form schema for UI validation (simplified version for forms)
export const apiKeyFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(100),
  permissions: z.record(z.string(), z.array(z.string())).refine((perms) => {
    const values = Object.values(perms) as string[][];
    return (
      Object.keys(perms).length > 0 &&
      values.some((actions) => actions.length > 0)
    );
  }, "At least one permission must be selected"),
  expiresIn: z
    .string()
    .optional()
    .refine(
      (val) => !val || (parseInt(val) >= 1 && parseInt(val) <= 365),
      "Expiration must be between 1 and 365 days"
    ),
  rateLimitEnabled: z.boolean().optional(),
  rateLimitMax: z
    .string()
    .optional()
    .refine(
      (val) => !val || (parseInt(val) >= 1 && parseInt(val) <= 10000),
      "Max requests must be between 1 and 10000"
    ),
  rateLimitTimeWindow: z
    .string()
    .optional()
    .refine(
      (val) => !val || (parseInt(val) >= 1 && parseInt(val) <= 86400),
      "Time window must be between 1 and 86400 seconds (24 hours)"
    ),
  notes: z
    .string()
    .max(500, "Notes must be less than 500 characters")
    .optional(),
});

export type DeleteApiKeyInput = z.infer<typeof deleteApiKeySchema>;
export type ApiKeyFormValues = z.infer<typeof apiKeyFormSchema>;
