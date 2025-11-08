import type {
  ApiKeyEntity,
  ApiKeyListParams,
} from "@/core/domain/api-key/api-key.entity";
import type { ApiKeyRepository } from "@/core/domain/api-key/api-key.repository";
import { logger } from "@/shared/lib/utils/logger";

/**
 * List API Keys Use Case
 * Handles the business logic for listing API keys for a user
 */
export class ListApiKeysUseCase {
  constructor(private repository: ApiKeyRepository) {}

  async execute(params: ApiKeyListParams): Promise<ApiKeyEntity[]> {
    logger.debug("Listing API keys", { userId: params.userId });

    const result = await this.repository.list(params);

    if (result.length === 0) {
      logger.warn("No API keys found", { userId: params.userId });
      return [];
    }

    logger.debug("API keys retrieved", {
      userId: params.userId,
      count: result.length,
    });

    return result;
  }
}
