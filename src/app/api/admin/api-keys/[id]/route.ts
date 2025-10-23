import { ApiWrapper } from "@/shared/lib/api/api-handler";
import { ApiKeyService } from "@/infrastructure/services/api-key.service";
import { logger } from "@/shared/lib/utils/logger";
import {
  getApiKeySchema,
  updateApiKeySchema,
  deleteApiKeySchema,
  type GetApiKeyInput,
  type UpdateApiKeyInput,
  type DeleteApiKeyInput,
} from "@/shared/lib/validation/api-key.dto";

/**
 * GET /api/admin/api-keys/[id] - Get API key details
 */
export const GET = ApiWrapper.create<GetApiKeyInput>(
  async (input, context) => {
    const { params } = input;

    logger.info("Getting API key details", {
      id: params.id,
      requestId: context.requestId,
    });

    const apiKey = await ApiKeyService.getById(params.id);

    if (!apiKey) {
      throw new Error("API key not found");
    }

    return apiKey;
  },
  {
    auth: {
      required: true,
      requiredScopes: ["admin:read", "api-keys:read"],
    },
    validation: {
      params: getApiKeySchema.shape.params,
    },
  }
);

/**
 * PUT /api/admin/api-keys/[id] - Update API key
 */
export const PUT = ApiWrapper.create<UpdateApiKeyInput>(
  async (input, context) => {
    const { params, body } = input;

    logger.info("Updating API key", {
      id: params.id,
      requestId: context.requestId,
    });

    const userId = context.apiKey?.userId || "";

    // Parse expiresAt if provided - properly typed
    const updates: {
      name?: string;
      enabled?: boolean;
      expiresAt?: Date | null;
      metadata?: Record<string, unknown>;
    } = {
      name: body.name,
      enabled: body.enabled,
      metadata: body.metadata,
    };

    if (body.expiresAt !== undefined) {
      updates.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    }

    const result = await ApiKeyService.update(params.id, userId, updates);

    if (!result) {
      throw new Error("API key not found or unauthorized");
    }

    logger.info("API key updated successfully", {
      id: result.id,
    });

    return result;
  },
  {
    auth: {
      required: true,
      requiredScopes: ["admin:write", "api-keys:write"],
    },
    validation: {
      params: updateApiKeySchema.shape.params,
      body: updateApiKeySchema.shape.body,
    },
  }
);

/**
 * DELETE /api/admin/api-keys/[id] - Revoke API key
 */
export const DELETE = ApiWrapper.create<DeleteApiKeyInput>(
  async (input, context) => {
    const { params } = input;

    logger.info("Revoking API key", {
      id: params.id,
      requestId: context.requestId,
    });

    const userId = context.apiKey?.userId || "";
    const success = await ApiKeyService.revoke(params.id, userId);

    if (!success) {
      throw new Error("API key not found or unauthorized");
    }

    logger.info("API key revoked successfully", {
      id: params.id,
    });

    return { success: true, message: "API key revoked successfully" };
  },
  {
    auth: {
      required: true,
      requiredScopes: ["admin:write", "api-keys:write"],
    },
    validation: {
      params: deleteApiKeySchema.shape.params,
    },
  }
);
