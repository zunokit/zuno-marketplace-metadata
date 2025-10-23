import type { MediaRepository } from "@/core/domain/media/media.repository";
import type { MediaListParams } from "@/core/domain/media/media.entity";
import type { PaginatedResponse } from "@/shared/types";
import type { MediaEntity } from "@/core/domain/media/media.entity";
import { logger } from "@/shared/lib/utils/logger";

/**
 * List Media Use Case
 * Handles the business logic for listing media files
 */
export class ListMediaUseCase {
  constructor(private readonly mediaRepository: MediaRepository) {}

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

    // Fetch from repository
    const result = await this.mediaRepository.list(listParams);

    logger.debug("Media files retrieved", {
      count: result.data.length,
      total: result.pagination.total,
    });

    return result;
  }
}
