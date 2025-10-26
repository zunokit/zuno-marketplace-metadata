import { db } from "@/infrastructure/database/client";
import { apiKey } from "@/infrastructure/database/drizzle/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/infrastructure/auth/better-auth.config";
import type { BetterAuthApiKey } from "@/shared/dto/api-key.dto";
import { logger } from "@/shared/lib/utils/logger";

export interface DeleteApiKeyParams {
  keyId: string;
}

/**
 * Delete API Key Use Case
 * Handles the business logic for deleting an API key
 */
export class DeleteApiKeyUseCase {
  async execute(params: DeleteApiKeyParams): Promise<BetterAuthApiKey> {
    logger.debug("Deleting API key", { keyId: params.keyId });

    // First, get the API key details before deletion from database
    const [existingKey] = await db
      .select()
      .from(apiKey)
      .where(eq(apiKey.id, params.keyId))
      .limit(1);

    if (!existingKey) {
      throw new Error("API key not found");
    }

    // Use Better Auth server API to delete API key
    const result = await auth.api.deleteApiKey({
      body: {
        keyId: params.keyId,
      },
    });

    if (!result || !result.success) {
      throw new Error("Failed to delete API key");
    }

    logger.info("API key deleted successfully", {
      keyId: params.keyId,
    });

    // Return the API key that was deleted
    return existingKey as unknown as BetterAuthApiKey;
  }
}
