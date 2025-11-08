import type { MediaRepository } from "@/core/domain/media/media.repository";
import type { MediaListParams } from "@/core/domain/media/media.entity";
import type { PaginatedResponse } from "@/shared/types";
import type { MediaEntity } from "@/core/domain/media/media.entity";
import type { ICacheService } from "@/core/domain/cache/cache.interface";
import { logger } from "@/shared/lib/utils/logger";
import {
  CacheKeyBuilder,
  CacheTTL,
} from "@/infrastructure/cache/cache.service";

/**
 * List Media Use Case
 * Handles the business logic for listing media files with caching
 */
export class ListMediaUseCase {
  constructor(
    private readonly mediaRepository: MediaRepository,
    private readonly cache: ICacheService
  ) {}

  async execute(params: Partial<MediaListParams>): Promise<PaginatedResponse<MediaEntity>> {
    // Set defaults
    const listParams: MediaListParams = {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      sortBy: params.sortBy ?? "createdAt",
      sortOrder: params.sortOrder ?? "desc",
      search: params.search,
      mediaType: params.mediaType,
      isPinned: params.isPinned,
    };

    logger.debug("Listing media files", { params: listParams });

    // Build cache key from query params
    const cacheKey = CacheKeyBuilder.mediaList({
      page: listParams.page,
      limit: listParams.limit,
      search: listParams.search,
      mediaType: listParams.mediaType,
    });

    // Use cache-aside pattern for list queries
    const result = await this.cache.getOrSet(
      cacheKey,
      async () => {
        return await this.mediaRepository.list(listParams);
      },
      CacheTTL.MEDIA_LIST
    );

    logger.debug("Media files retrieved", {
      count: result.data.length,
      total: result.pagination.total,
      cached: true,
    });

    return result;
  }
}
