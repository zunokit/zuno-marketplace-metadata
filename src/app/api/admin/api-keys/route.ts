import { ApiWrapper } from "@/shared/lib/api/api-handler";
import { ApiKeyService } from "@/infrastructure/services/api-key.service";
import { CreateApiKeyUseCase } from "@/core/use-cases/api-key/create-api-key.use-case";
import { unwrapOrThrow } from "@/shared/lib/utils/server";
import { ApiKeyDtoMapper } from "@/shared/dto/api-key.dto";
import { logger } from "@/shared/lib/utils/logger";
import { getApiKeyRepository } from "@/infrastructure/di/container";
import {
  createApiKeySchema,
  listApiKeysSchema,
  type CreateApiKeyInput,
  type ListApiKeysInput,
} from "@/shared/lib/validation/api-key.schemas";

/**
 * GET /api/admin/api-keys - List all API keys (admin only)
 */
export const GET = ApiWrapper.create<ListApiKeysInput>(
  async (input, context) => {
    // Build params with validation (adminOnly ensures user or apiKey is defined)
    const userId = context.user?.id || context.apiKey?.userId;
    if (!userId) {
      throw new Error("User ID not found in context");
    }

    const params = ApiKeyService.buildListParams(
      {
        ...input.query,
        userId, // List only current admin's keys
      },
      context
    );

    // Execute query through service layer
    const result = await ApiKeyService.list(params);
    const listResult = unwrapOrThrow(result);

    // Map service DTOs to Better Auth format using utility
    const betterAuthKeys = listResult.keys.map((key) =>
      ApiKeyDtoMapper.fromServiceResult({
        ...key,
        metadata: (key.metadata as Record<string, unknown>) ?? null,
        rateLimitEnabled: null,
        rateLimitMax: null,
        rateLimitTimeWindow: null,
        remaining: null,
      })
    );

    // Map to paginated DTO response
    logger.debug("Admin API keys list retrieved from Better Auth", {
      count: betterAuthKeys.length,
      page: input.query?.page || 1,
      limit: params.limit
    });
    return ApiKeyDtoMapper.toPaginatedResponseDto(
      betterAuthKeys,
      input.query?.page || 1,
      params.limit
    );
  },
  {
    validation: {
      query: listApiKeysSchema.shape.query,
    },
    auth: {
      required: true,
      allowSession: true,
      adminOnly: true,
    },
  }
);

/**
 * POST /api/admin/api-keys - Create new API key (admin only)
 */
export const POST = ApiWrapper.create<CreateApiKeyInput>(
  async (input, context) => {
    // Use application use case (adminOnly ensures user is defined)
    const useCase = new CreateApiKeyUseCase(getApiKeyRepository());
    const apiKey = await useCase.execute({
      userId: context.user!.id,
      name: input.body.name,
      permissions: input.body.permissions,
      expiresIn: input.body.expiresIn,
      metadata: input.body.metadata,
    });

    return ApiKeyDtoMapper.toCreatedResponseDto(apiKey);
  },
  {
    validation: {
      body: createApiKeySchema.shape.body,
    },
    auth: {
      required: true,
      allowSession: true,
      allowApiKey: false,
      adminOnly: true,
    },
  }
);
