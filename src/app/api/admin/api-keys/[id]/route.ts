import { ApiWrapper, ApiError } from "@/shared/lib/api/api-handler";
import { auth } from "@/infrastructure/auth/better-auth.config";
import { ErrorCode } from "@/shared/types";
import { ApiKeyService } from "@/infrastructure/services/api-key.service";
import { unwrapOrThrow } from "@/shared/lib/utils/server";
import {
  ApiKeyDtoMapper,
  type BetterAuthApiKey,
} from "@/shared/dto/api-key.dto";
import {
  updateApiKeySchema,
  deleteApiKeySchema,
  type UpdateApiKeyInput,
  type DeleteApiKeyInput,
} from "@/shared/lib/validation/api-key.schemas";

/**
 * PUT /api/admin/api-keys/[id] - Update API key by ID (admin only)
 */
export const PUT = ApiWrapper.create<UpdateApiKeyInput>(
  async (input, context) => {
    const { params, body } = input;
    const { id } = params;

    // Delegate to service layer (pass request headers for Better Auth session)
    const result = await ApiKeyService.update(
      id,
      body,
      auth.api,
      context.request.headers
    );
    const apiKeyData = unwrapOrThrow(result);

    // Convert service result to BetterAuthApiKey format using utility
    const betterAuthKey = ApiKeyDtoMapper.fromServiceResult(apiKeyData);

    // Map to response DTO
    return ApiKeyDtoMapper.toResponseDto(betterAuthKey);
  },
  {
    auth: {
      required: true,
      allowSession: true,
      allowApiKey: false,
      adminOnly: true,
    },
    validation: {
      params: updateApiKeySchema.shape.params,
      body: updateApiKeySchema.shape.body,
    },
  }
);

/**
 * DELETE /api/admin/api-keys/[id] - Delete API key by ID (admin only)
 */
export const DELETE = ApiWrapper.create<DeleteApiKeyInput>(
  async (input, context) => {
    const { params } = input;
    const { id } = params;

    // Get API key before deletion for response
    const getResult = await ApiKeyService.getById(id);
    const existingKey = unwrapOrThrow(getResult);

    if (!existingKey) {
      throw new ApiError("API key not found", ErrorCode.NOT_FOUND, 404);
    }

    // Delete through service layer (pass request headers for Better Auth session)
    const result = await ApiKeyService.delete(
      id,
      auth.api,
      context.request.headers
    );
    unwrapOrThrow(result);

    // Convert service DTO to Better Auth format using utility
    const betterAuthKey = ApiKeyDtoMapper.fromServiceResult(existingKey);

    // Map to deleted response DTO
    return ApiKeyDtoMapper.toDeletedResponseDto(betterAuthKey);
  },
  {
    auth: {
      required: true,
      allowSession: true,
      allowApiKey: false,
      adminOnly: true,
    },
    validation: {
      params: deleteApiKeySchema.shape.params,
    },
  }
);
