import type { ApiKeyEntity } from "@/core/domain/api-key/api-key.entity";
import type { ApiKeyRepository } from "@/core/domain/api-key/api-key.repository";
import { logger } from "@/shared/lib/utils/logger";

export interface DeleteApiKeyParams {
  keyId: string;
}

/**
 * Delete API Key Use Case
 * Handles the business logic for deleting an API key
 */
export class DeleteApiKeyUseCase {
  constructor(private repository: ApiKeyRepository) {}

  async execute(params: DeleteApiKeyParams): Promise<ApiKeyEntity> {
    logger.debug("Deleting API key", { keyId: params.keyId });

    // First, get the API key details before deletion
    const existingKey = await this.repository.findById(params.keyId);

    if (!existingKey) {
      throw new Error("API key not found");
    }

    // Delete the API key
    await this.repository.delete(params.keyId);

    logger.info("API key deleted successfully", {
      keyId: params.keyId,
    });

    // Return the API key that was deleted
    return existingKey;
  }
}
