import type { ApiKeyEntity } from "@/core/domain/api-key/api-key.entity";
import type { ApiKeyRepository } from "@/core/domain/api-key/api-key.repository";
import { logger } from "@/shared/lib/utils/logger";

export interface UpdateApiKeyInput {
  keyId: string;
  name?: string;
  enabled?: boolean;
  permissions?: Record<string, string[]>;
  metadata?: {
    scopes?: string[];
    notes?: string;
    type?: "personal" | "organization" | "public";
    ipWhitelist?: string[];
    allowedOrigins?: string[];
  };
}

/**
 * Update API Key Use Case
 * Handles the business logic for updating an existing API key
 */
export class UpdateApiKeyUseCase {
  constructor(private repository: ApiKeyRepository) {}

  async execute(params: UpdateApiKeyInput): Promise<ApiKeyEntity> {
    logger.debug("Updating API key", { keyId: params.keyId });

    const { keyId, ...updateParams } = params;
    const result = await this.repository.update(keyId, updateParams);

    if (!result) {
      throw new Error("Failed to update API key");
    }

    logger.info("API key updated successfully", {
      keyId: params.keyId,
    });

    return result;
  }
}
