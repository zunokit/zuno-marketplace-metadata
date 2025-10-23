import { ApiWrapper } from "@/shared/lib/api/api-handler";
import { ApiKeyService } from "@/infrastructure/services/api-key.service";
import { logger } from "@/shared/lib/utils/logger";
import {
  createApiKeySchema,
  listApiKeysSchema,
  type CreateApiKeyInput,
  type ListApiKeysInput,
} from "@/shared/lib/validation/api-key.dto";

/**
 * GET /api/admin/api-keys - List API keys
 */
export const GET = ApiWrapper.create<ListApiKeysInput>(
  async (input, context) => {
    const { query } = input;

    logger.info("Listing API keys", {
      requestId: context.requestId,
      userId: context.apiKey?.userId,
    });

    // Get user ID to list keys for
    const userId = query.userId || context.apiKey?.userId || "";

    const result = await ApiKeyService.listByUser(userId, {
      limit: query.limit,
      offset: query.offset,
      enabled: query.enabled,
    });

    return result;
  },
  {
    auth: {
      required: true,
      requiredScopes: ["admin:read", "api-keys:read"],
    },
    validation: {
      query: listApiKeysSchema.shape.query,
    },
  }
);

/**
 * POST /api/admin/api-keys - Create new API key
 */
export const POST = ApiWrapper.create<CreateApiKeyInput>(
  async (input, context) => {
    const { body } = input;

    logger.info("Creating new API key", {
      name: body.name,
      requestId: context.requestId,
      userId: context.apiKey?.userId,
    });

    // Calculate expiration date if provided
    let expiresAt: Date | undefined;
    if (body.expiresIn) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + body.expiresIn);
    }

    const result = await ApiKeyService.create({
      name: body.name,
      userId: body.userId || context.apiKey?.userId || "",
      expiresAt,
      metadata: body.metadata,
      rateLimitEnabled: body.rateLimitEnabled,
      rateLimitMax: body.rateLimitMax,
      rateLimitTimeWindow: body.rateLimitTimeWindow,
    });

    logger.info("API key created successfully", {
      id: result.id,
      userId: result.userId,
      name: result.name,
    });

    return {
      ...result,
      warning: "Save this key now - it will not be shown again!",
    };
  },
  {
    auth: {
      required: true,
      requiredScopes: ["admin:write", "api-keys:write"],
    },
    validation: {
      body: createApiKeySchema.shape.body,
    },
  }
);
