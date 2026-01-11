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
import { UpdateApiKeyUseCase } from "@/core/use-cases/api-key/update-api-key.use-case";
import { DeleteApiKeyUseCase } from "@/core/use-cases/api-key/delete-api-key.use-case";
import { getApiKeyRepository } from "@/infrastructure/di/container";

/**
 * PUT /api/admin/api-keys/[id] - Update API key by ID (admin only)
 */
export const PUT = ApiWrapper.create<UpdateApiKeyInput>(
  async (input, context) => {
    const { params, body } = input;
    const { id } = params;

    // Use application use case
    const useCase = new UpdateApiKeyUseCase(getApiKeyRepository());
    const betterAuthKey = await useCase.execute({
      keyId: id,
      name: body.name,
      enabled: body.enabled,
      permissions: body.permissions,
      metadata: body.metadata,
    });

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

    const deleteUseCase = new DeleteApiKeyUseCase(getApiKeyRepository());
    const betterAuthKey = await deleteUseCase.execute({ keyId: id });

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
