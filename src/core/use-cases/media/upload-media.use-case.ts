import type { MediaRepository } from "@/core/domain/media/media.repository";
import type { MediaEntity } from "@/core/domain/media/media.entity";
import type { ICacheService } from "@/core/domain/cache/cache.interface";
import { ImageKitService } from "@/infrastructure/services/imagekit.service";
import { logger } from "@/shared/lib/utils/logger";
import { ApiError } from "@/shared/lib/api/api-handler";
import { ErrorCode, type MediaType } from "@/shared/types";
import {
  validateFileSize,
  getMaxFileSize,
  formatFileSize
} from "@/shared/config/file-size.config";
import {
  isValidImageType,
  isValidVideoType,
  isValid3DModelType,
} from "@/shared/lib/utils";

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
  constructor(
    private readonly mediaRepository: MediaRepository,
    private readonly imageKitService: ImageKitService,
    private readonly cache: ICacheService
  ) {}

  async execute(input: UploadMediaInput): Promise<MediaEntity> {
    const { file, folder, tags, userId } = input;

    // 1. Validate file exists
    if (!file) {
      throw new ApiError("No file provided", ErrorCode.INVALID_INPUT, 400);
    }

    if (file.size === 0) {
      throw new ApiError("File is empty", ErrorCode.INVALID_INPUT, 400);
    }

    // 2. Validate file type and get media type
    const mediaType = this.getMediaType(file.type);
    if (!mediaType) {
      throw new ApiError(
        `Unsupported file type: ${file.type}`,
        ErrorCode.INVALID_INPUT,
        400
      );
    }

    // 3. Validate file size early (before uploading to ImageKit)
    try {
      validateFileSize(file.size, mediaType, file.name);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "File size validation failed";
      logger.warn("File size validation failed", {
        fileName: file.name,
        fileSize: formatFileSize(file.size),
        maxSize: formatFileSize(getMaxFileSize(mediaType)),
        mediaType,
      });
      throw new ApiError(errorMessage, ErrorCode.INVALID_INPUT, 400);
    }

    logger.info("Uploading file to ImageKit", {
      fileName: file.name,
      fileSize: formatFileSize(file.size),
      fileType: file.type,
      mediaType,
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

  /**
   * Determine media type from MIME type
   */
  private getMediaType(mimeType: string): MediaType | null {
    if (isValidImageType(mimeType)) {
      return mimeType === "image/gif" ? "GIF" : "IMAGE";
    }
    if (isValidVideoType(mimeType)) {
      return "VIDEO";
    }
    if (isValid3DModelType(mimeType)) {
      return "MODEL_3D";
    }
    return null;
  }
}
