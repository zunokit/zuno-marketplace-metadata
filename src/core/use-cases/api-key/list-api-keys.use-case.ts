import { db } from "@/infrastructure/database/client";
import { apiKey } from "@/infrastructure/database/drizzle/schema";
import { eq, and } from "drizzle-orm";
import type { BetterAuthApiKey } from "@/shared/dto/api-key.dto";
import { logger } from "@/shared/lib/utils/logger";

export interface ListApiKeysParams {
  userId: string;
  page?: number;
  limit?: number;
  enabled?: boolean;
}

/**
 * List API Keys Use Case
 * Handles the business logic for listing API keys for a user
 */
export class ListApiKeysUseCase {
  async execute(params: ListApiKeysParams): Promise<BetterAuthApiKey[]> {
    logger.debug("Listing API keys", { userId: params.userId });

    // Query API keys directly from database using Drizzle
    const conditions = [eq(apiKey.userId, params.userId)];

    if (params.enabled !== undefined) {
      conditions.push(eq(apiKey.enabled, params.enabled));
    }

    const result = await db
      .select()
      .from(apiKey)
      .where(and(...conditions));

    if (!result || result.length === 0) {
      logger.warn("No API keys found", { userId: params.userId });
      return [];
    }

    logger.debug("API keys retrieved", {
      userId: params.userId,
      count: result.length,
    });

    return result as unknown as BetterAuthApiKey[];
  }
}
