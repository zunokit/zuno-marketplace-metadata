import type { MetadataRepository } from "@/core/domain/metadata/metadata.repository";
import type { MetadataEntity } from "@/core/domain/metadata/metadata.entity";
import { logger } from "@/shared/lib/utils/logger";
import { ApiError } from "@/shared/lib/api/api-handler";
import { ErrorCode } from "@/shared/types";
import {
  getCacheService,
  CacheKeyBuilder,
  CacheTTL,
} from "@/infrastructure/cache/cache.service";

interface GetMetadataInput {
  metadataId: string;
  userId?: string; // For ownership validation
  isAdmin?: boolean; // Admins can access all metadata
}

/**
 * Get Metadata Use Case
 * Handles the business logic for retrieving metadata with caching and ownership validation
 */
export class GetMetadataUseCase {
  private readonly cache = getCacheService();

  constructor(private readonly metadataRepository: MetadataRepository) {}

  async execute(input: GetMetadataInput): Promise<MetadataEntity> {
    const { metadataId, userId, isAdmin = false } = input;

    logger.debug("Getting metadata by ID", { metadataId, userId, isAdmin });

    // Use cache-aside pattern for single item retrieval
    const cacheKey = CacheKeyBuilder.metadata(metadataId);

    const metadata = await this.cache.getOrSet(
      cacheKey,
      async () => {
        const data = await this.metadataRepository.findById(metadataId);

        if (!data) {
          logger.warn("Metadata not found", { metadataId });
          throw new ApiError(
            `Metadata with ID ${metadataId} not found`,
            ErrorCode.NOT_FOUND,
            404
          );
        }

        return data;
      },
      CacheTTL.METADATA_ITEM
    );

    // Ownership validation (IDOR protection)
    if (!isAdmin && userId && metadata.userId !== userId) {
      logger.warn("Unauthorized access attempt to metadata", {
        metadataId,
        requestUserId: userId,
        ownerUserId: metadata.userId,
      });
      throw new ApiError(
        "You do not have permission to access this metadata",
        ErrorCode.FORBIDDEN,
        403
      );
    }

    logger.debug("Metadata retrieved successfully", {
      metadataId,
      name: metadata.name,
      version: metadata.version,
      cached: true,
    });

    return metadata;
  }
}
