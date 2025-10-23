import type { MediaRepository } from "@/core/domain/media/media.repository";
import type { MediaEntity } from "@/core/domain/media/media.entity";
import { logger } from "@/shared/lib/utils/logger";
import { ApiError } from "@/shared/lib/api/api-handler";
import { ErrorCode } from "@/shared/types";

/**
 * Get Media Use Case
 * Handles the business logic for retrieving a single media file
 */
export class GetMediaUseCase {
  constructor(private readonly mediaRepository: MediaRepository) {}

  async execute(mediaId: string): Promise<MediaEntity> {
    logger.debug("Getting media by ID", { mediaId });

    const media = await this.mediaRepository.findById(mediaId);

    if (!media) {
      logger.warn("Media not found", { mediaId });
      throw new ApiError(`Media with ID ${mediaId} not found`, ErrorCode.NOT_FOUND, 404);
    }

    logger.debug("Media retrieved successfully", {
      mediaId,
      fileName: media.fileName,
    });

    return media;
  }
}
