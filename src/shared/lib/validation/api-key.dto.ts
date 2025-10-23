import { z } from "zod";

/**
 * API Key Validation Schemas
 */

export const createApiKeySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    userId: z.string().optional(),
    expiresIn: z.number().positive().optional(), // Days until expiration
    metadata: z.object({
      tier: z.enum(["public", "free", "pro", "enterprise"]).optional(),
      scopes: z.array(z.string()).optional(),
      ipWhitelist: z.array(z.string()).optional(),
      allowedOrigins: z.array(z.string()).optional(),
      notes: z.string().optional(),
    }).optional(),
    rateLimitEnabled: z.boolean().optional(),
    rateLimitMax: z.number().positive().optional(),
    rateLimitTimeWindow: z.number().positive().optional(),
  }),
});

export const updateApiKeySchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    enabled: z.boolean().optional(),
    expiresAt: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),
});

export const getApiKeySchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const deleteApiKeySchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const listApiKeysSchema = z.object({
  query: z.object({
    userId: z.string().optional(),
    enabled: z.coerce.boolean().optional(),
    limit: z.coerce.number().min(1).max(100).default(20),
    offset: z.coerce.number().min(0).default(0),
  }),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type UpdateApiKeyInput = z.infer<typeof updateApiKeySchema>;
export type GetApiKeyInput = z.infer<typeof getApiKeySchema>;
export type DeleteApiKeyInput = z.infer<typeof deleteApiKeySchema>;
export type ListApiKeysInput = z.infer<typeof listApiKeysSchema>;
