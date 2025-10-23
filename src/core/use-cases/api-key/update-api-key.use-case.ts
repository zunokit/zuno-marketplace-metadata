import { ApiKeyService } from "@/infrastructure/services/api-key.service";
import { logger } from "@/shared/lib/utils/logger";
import { ApiError } from "@/shared/lib/api/api-handler";
import { ErrorCode } from "@/shared/types";

interface UpdateApiKeyInput {
  id: string;
  userId: string;
  updates: {
    name?: string;
    enabled?: boolean;
    expiresAt?: string | null;
    metadata?: Record<string, unknown>;
  };
}

/**
 * Update API Key Use Case
 * Handles the business logic for updating API keys
 */
export class UpdateApiKeyUseCase {
  async execute(input: UpdateApiKeyInput) {
    const { id, userId, updates } = input;

    logger.info("Updating API key", { id, userId });

    // Transform expiresAt from string to Date
    const transformedUpdates: {
      name?: string;
      enabled?: boolean;
      expiresAt?: Date | null;
      metadata?: Record<string, unknown>;
    } = {
      name: updates.name,
      enabled: updates.enabled,
      metadata: updates.metadata,
    };

    if (updates.expiresAt !== undefined) {
      transformedUpdates.expiresAt = updates.expiresAt ? new Date(updates.expiresAt) : null;
    }

    const result = await ApiKeyService.update(id, userId, transformedUpdates);

    if (!result) {
      throw new ApiError("API key not found or unauthorized", ErrorCode.NOT_FOUND, 404);
    }

    logger.info("API key updated successfully", { id: result.id });

    return result;
  }
}
