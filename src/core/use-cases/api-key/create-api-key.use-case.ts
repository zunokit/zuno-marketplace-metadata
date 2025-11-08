import type {
  CreateApiKeyParams,
  CreatedApiKeyEntity,
} from "@/core/domain/api-key/api-key.entity";
import type { ApiKeyRepository } from "@/core/domain/api-key/api-key.repository";
import { logger } from "@/shared/lib/utils/logger";

/**
 * Create API Key Use Case
 * Handles the business logic for creating a new API key
 */
export class CreateApiKeyUseCase {
  constructor(private repository: ApiKeyRepository) {}

  async execute(params: CreateApiKeyParams): Promise<CreatedApiKeyEntity> {
    logger.debug("Creating API key", {
      userId: params.userId,
      name: params.name,
    });

    const result = await this.repository.create(params);

    logger.info("API key created successfully", {
      keyId: result.id,
      name: params.name,
      userId: params.userId,
    });

    return result;
  }
}
