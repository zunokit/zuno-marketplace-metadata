import { auth } from "@/infrastructure/auth/better-auth.config";
import type { BetterAuthApiKey } from "@/shared/dto/api-key.dto";
import { logger } from "@/shared/lib/utils/logger";

export interface CreateApiKeyParams {
  userId: string;
  name: string;
  permissions: Record<string, string[]>;
  expiresIn?: number;
  metadata?: {
    scopes?: string[];
    notes?: string;
    type?: "personal" | "organization" | "public";
    ipWhitelist?: string[];
    allowedOrigins?: string[];
  };
}

/**
 * Create API Key Use Case
 * Handles the business logic for creating a new API key
 */
export class CreateApiKeyUseCase {
  async execute(params: CreateApiKeyParams): Promise<BetterAuthApiKey> {
    logger.debug("Creating API key", {
      userId: params.userId,
      name: params.name,
    });

    // Use Better Auth server API to create API key
    const result = await auth.api.createApiKey({
      body: {
        userId: params.userId, // Server-only property
        name: params.name,
        permissions: params.permissions,
        expiresIn: params.expiresIn,
        metadata: params.metadata,
      },
    });

    if (!result) {
      throw new Error("Failed to create API key");
    }

    logger.info("API key created successfully", {
      keyId: result.id,
      name: params.name,
      userId: params.userId,
    });

    return result as BetterAuthApiKey;
  }
}
