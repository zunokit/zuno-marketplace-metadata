import type { MetadataRepository } from "@/core/domain/metadata/metadata.repository";
import type { MetadataEntity } from "@/core/domain/metadata/metadata.entity";
import type { ICacheService } from "@/core/domain/cache/cache.interface";
import { logger } from "@/shared/lib/utils/logger";
import { ApiError } from "@/shared/lib/api/api-handler";
import { ErrorCode } from "@/shared/types";
import {
  CacheKeyBuilder,
  CacheTTL,
} from "@/infrastructure/cache/cache.service";

interface GetMetadataInput {
  metadataId: string;
}

/**
 * Get Metadata Use Case
 * Handles the business logic for retrieving metadata with caching
 */
export class GetMetadataUseCase {
  constructor(
    private readonly metadataRepository: MetadataRepository,
    private readonly cache: ICacheService
  ) {}

  async execute(input: GetMetadataInput): Promise<MetadataEntity> {
    const { metadataId } = input;

    logger.debug("Getting metadata by ID", { metadataId });

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

    logger.debug("Metadata retrieved successfully", {
      metadataId,
      name: metadata.name,
      version: metadata.version,
      cached: true,
    });

    return metadata;
  }
}
