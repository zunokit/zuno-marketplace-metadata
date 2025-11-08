import type { MediaRepository } from "@/core/domain/media/media.repository";
import type { MediaEntity } from "@/core/domain/media/media.entity";
import { ImageKitService } from "@/infrastructure/services/imagekit.service";
import { logger } from "@/shared/lib/utils/logger";
import { ApiError } from "@/shared/lib/api/api-handler";
import { ErrorCode } from "@/shared/types";
import { getCacheService } from "@/infrastructure/cache/cache.service";

interface UploadMediaInput {
  file: File;
  folder?: string;
  tags?: string[];
  userId: string; // Owner of the media (required for access control)
}

/**
 * Upload Media Use Case
 * Handles the business logic for uploading media files with cache invalidation and ownership tracking
 */
export class UploadMediaUseCase {
  private readonly cache = getCacheService();

  constructor(
    private readonly mediaRepository: MediaRepository,
    private readonly imageKitService: ImageKitService
  ) {}

  async execute(input: UploadMediaInput): Promise<MediaEntity> {
    const { file, folder, tags, userId } = input;

    // 1. Validate file
    if (!file) {
      throw new ApiError("No file provided", ErrorCode.INVALID_INPUT, 400);
    }

    if (file.size === 0) {
      throw new ApiError("File is empty", ErrorCode.INVALID_INPUT, 400);
    }

    logger.info("Uploading file to ImageKit", {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      folder,
      tags,
    });

    // 2. Upload to ImageKit
    const uploadResult = await this.imageKitService.uploadFile({
      file,
      fileName: file.name,
      folder: folder || "media",
      tags,
    });

    logger.info("File uploaded to ImageKit successfully", {
      fileId: uploadResult.fileId,
      url: uploadResult.url,
      mediaType: uploadResult.mediaType,
    });

    // 3. Save to database with userId for ownership tracking
    const media = await this.mediaRepository.create({
      userId,
      fileName: uploadResult.name,
      fileSize: uploadResult.size,
      mimeType: uploadResult.mimeType,
      mediaType: uploadResult.mediaType,
      url: uploadResult.url,
      thumbnailUrl: uploadResult.thumbnailUrl,
      width: uploadResult.width,
      height: uploadResult.height,
    });

    logger.info("Media record saved to database", {
      mediaId: media.id,
      fileName: media.fileName,
    });

    // 4. Invalidate list caches (fire and forget - don't await, catch errors)
    this.cache.invalidateMedia().catch((error) => {
      logger.error("Cache invalidation failed (non-critical)", {
        error: String(error),
      });
    });

    return media;
  }
}
