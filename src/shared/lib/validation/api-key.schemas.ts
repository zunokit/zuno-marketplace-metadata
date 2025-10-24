import { z } from "zod";

/**
 * POST /api/admin/api-keys - Create API key
 */
export const createApiKeySchema = z.object({
  body: z.object({
    name: z.string().min(3).max(100),
    permissions: z.record(z.string(), z.array(z.string())),
    expiresIn: z.number().int().positive().max(3650).optional(),
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

export type DeleteApiKeyInput = z.infer<typeof deleteApiKeySchema>;
