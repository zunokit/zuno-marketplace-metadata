import { auth } from "@/infrastructure/auth/better-auth.config";
import type { BetterAuthApiKey } from "@/shared/dto/api-key.dto";
import { logger } from "@/shared/lib/utils/logger";

export interface UpdateApiKeyParams {
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
  async execute(params: UpdateApiKeyParams): Promise<BetterAuthApiKey> {
    logger.debug("Updating API key", { keyId: params.keyId });

    // Use Better Auth server API to update API key
    const result = await auth.api.updateApiKey({
      body: {
        keyId: params.keyId,
        name: params.name,
        enabled: params.enabled,
        permissions: params.permissions,
        metadata: params.metadata,
      },
    });

    if (!result) {
      throw new Error("Failed to update API key");
    }

    logger.info("API key updated successfully", {
      keyId: params.keyId,
    });

    return result as BetterAuthApiKey;
  }
}
