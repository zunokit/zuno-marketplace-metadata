import type { MediaRepository } from "@/core/domain/media/media.repository";
import type { MediaEntity } from "@/core/domain/media/media.entity";
import { ImageKitService } from "@/infrastructure/services/imagekit.service";
import { logger } from "@/shared/lib/utils/logger";
import { ApiError } from "@/shared/lib/api/api-handler";
import { ErrorCode } from "@/shared/types";

/**
 * Delete Media Use Case
 * Handles the business logic for deleting media files
 */
export class DeleteMediaUseCase {
  constructor(
    private readonly mediaRepository: MediaRepository,
    private readonly imageKitService: ImageKitService
  ) {}

  async execute(mediaId: string): Promise<MediaEntity> {
    // 1. Check if media exists
    const media = await this.mediaRepository.findById(mediaId);

    if (!media) {
      logger.warn("Media not found for deletion", { mediaId });
      throw new ApiError(`Media with ID ${mediaId} not found`, ErrorCode.NOT_FOUND, 404);
    }

    // 2. Extract file ID from URL
    const fileId = this.imageKitService.extractFileIdFromUrl(media.url);

    // 3. Delete from ImageKit first (if file ID exists)
    if (fileId) {
      try {
        await this.imageKitService.deleteFile(fileId);
        logger.info("Media deleted from ImageKit", {
          mediaId,
          fileId,
        });
      } catch (error) {
        logger.error("Failed to delete from ImageKit, proceeding with database deletion", {
          mediaId,
          fileId,
          error: error instanceof Error ? error.message : String(error),
        });
        // Continue with DB deletion even if ImageKit deletion fails
      }
    }

    // 4. Delete from database
    const deleted = await this.mediaRepository.delete(mediaId);

    if (!deleted) {
      throw new ApiError("Failed to delete media from database", ErrorCode.INTERNAL_ERROR, 500);
    }

    logger.info("Media deleted successfully", {
      mediaId,
      fileName: media.fileName,
    });

    return media;
  }
}
