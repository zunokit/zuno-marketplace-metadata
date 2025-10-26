import type { MediaRepository } from "@/core/domain/media/media.repository";
import type { MediaEntity } from "@/core/domain/media/media.entity";
import { logger } from "@/shared/lib/utils/logger";
import { ApiError } from "@/shared/lib/api/api-handler";
import { ErrorCode } from "@/shared/types";
import {
  getCacheService,
  CacheKeyBuilder,
  CacheTTL,
} from "@/infrastructure/cache/cache.service";

/**
 * Get Media Use Case
 * Handles the business logic for retrieving a single media file with caching
 */
export class GetMediaUseCase {
  private readonly cache = getCacheService();

  constructor(private readonly mediaRepository: MediaRepository) {}

  async execute(mediaId: string): Promise<MediaEntity> {
    logger.debug("Getting media by ID", { mediaId });

    // Use cache-aside pattern for single item retrieval
    const cacheKey = CacheKeyBuilder.media(mediaId);

    const media = await this.cache.getOrSet(
      cacheKey,
      async () => {
        const data = await this.mediaRepository.findById(mediaId);

        if (!data) {
          logger.warn("Media not found", { mediaId });
          throw new ApiError(
            `Media with ID ${mediaId} not found`,
            ErrorCode.NOT_FOUND,
            404
          );
        }

        return data;
      },
      CacheTTL.MEDIA_ITEM
    );

    logger.debug("Media retrieved successfully", {
      mediaId,
      fileName: media.fileName,
      cached: true,
    });

    return media;
  }
}
