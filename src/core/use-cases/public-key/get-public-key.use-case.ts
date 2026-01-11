import { db } from "@/infrastructure/database/client";
import { publicKeySettings } from "@/infrastructure/database/drizzle/schema";
import { eq } from "drizzle-orm";
import { ApiError } from "@/shared/lib/api/api-handler";
import { ErrorCode } from "@/shared/types";
import { logger } from "@/shared/lib/utils/logger";

interface PublicKeyResult {
  id: string;
  key: string;
  start: string;
}

/**
 * Get Public Key Use Case
 *
 * Returns a plain text public API key for guest/anonymous access.
 * The key is stored in the public_key_settings table (not hashed).
 */
export class GetPublicKeyUseCase {
  async execute(): Promise<PublicKeyResult> {
    try {
      // Query for the public key settings
      const [settings] = await db
        .select()
        .from(publicKeySettings)
        .where(eq(publicKeySettings.id, "default"))
        .limit(1);

      if (!settings || !settings.enabled) {
        logger.error("No public API key found or key is disabled");
        throw new ApiError(
          "Public API key not configured. Please run: pnpm db:create-public-key",
          ErrorCode.NOT_FOUND,
          404
        );
      }

      logger.info("Public key retrieved successfully");

      return {
        id: settings.id,
        key: settings.apiKey,
        start: settings.apiKey.substring(0, 10),
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      logger.error("Failed to get public key", { error });
      throw new ApiError(
        "Failed to retrieve public API key",
        ErrorCode.INTERNAL_ERROR,
        500
      );
    }
  }
}
