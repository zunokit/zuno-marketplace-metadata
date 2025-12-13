import { ApiWrapper } from "@/shared/lib/api/api-handler";
import { GetPublicKeyUseCase } from "@/core/use-cases/public-key/get-public-key.use-case";
import { logger } from "@/shared/lib/utils/logger";
import { env } from "@/shared/config/env";

/**
 * GET /api/public-key
 *
 * Returns a public API key for guest/anonymous access to the home page.
 * The key is fetched from database and has read-only permissions.
 *
 * Can be disabled via ENABLE_PUBLIC_KEY=false
 */
export const GET = ApiWrapper.create(
  async (input, context) => {
    logger.info("Public key requested", {
      requestId: context.requestId,
    });

    // Check if public key is enabled
    if (!env.ENABLE_PUBLIC_KEY) {
      logger.warn("Public key access is disabled");
      return {
        error: "Public key access is disabled",
        enabled: false,
      };
    }

    // Get public key from database
    const useCase = new GetPublicKeyUseCase();
    const result = await useCase.execute();

    logger.info("Public key retrieved successfully", {
      keyId: result.id,
    });

    return {
      apiKey: result.key,
      enabled: true,
    };
  },
  {
    auth: {
      required: false, // Public endpoint - no auth needed
    },
  }
);
