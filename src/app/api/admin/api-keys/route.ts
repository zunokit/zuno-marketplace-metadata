import { ApiWrapper, ApiError } from "@/shared/lib/api/api-handler";
import { auth } from "@/infrastructure/auth/better-auth.config";
import { ErrorCode } from "@/shared/types";
import { ApiKeyService } from "@/infrastructure/services/api-key.service";
import { unwrapOrThrow } from "@/shared/lib/utils/server";
import { ApiKeyDtoMapper } from "@/shared/dto/api-key.dto";
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
    // Build params with validation (adminOnly ensures user is defined)
    const params = ApiKeyService.buildListParams(
      {
        ...input.query,
        userId: context.user!.id, // List only current admin's keys
      },
      context
    );

    // Execute query through service layer
    const result = await ApiKeyService.list(params);
    const listResult = unwrapOrThrow(result);

    // Map service DTOs to Better Auth format for DTO mapper
    const betterAuthKeys = listResult.keys.map((key) => ({
      id: key.id,
      name: key.name,
      userId: key.userId,
      enabled: key.enabled,
      permissions: key.permissions,
      metadata: (key.metadata as Record<string, unknown>) ?? null,
      expiresAt: key.expiresAt,
      createdAt: key.createdAt,
      updatedAt: key.updatedAt,
      start: null,
      rateLimitEnabled: null,
      rateLimitMax: null,
      rateLimitTimeWindow: null,
      remaining: null,
    }));

    // Map to paginated DTO response
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
    // Delegate to service layer (adminOnly ensures user is defined)
    const result = await ApiKeyService.create(
      {
        userId: context.user!.id,
        name: input.body.name,
        permissions: input.body.permissions,
        expiresIn: input.body.expiresIn,
        metadata: input.body.metadata,
      },
      auth.api
    );

    const apiKey = unwrapOrThrow(result);

    // Map to created DTO response (type is already BetterAuthApiKey from service)
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
