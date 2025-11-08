import type { MediaRepository } from "@/core/domain/media/media.repository";
import type { MediaEntity } from "@/core/domain/media/media.entity";
import type { ICacheService } from "@/core/domain/cache/cache.interface";
import { ImageKitService } from "@/infrastructure/services/imagekit.service";
import { logger } from "@/shared/lib/utils/logger";
import { ApiError } from "@/shared/lib/api/api-handler";
import { ErrorCode, type MediaType } from "@/shared/types";
import {
  validateFileSize,
  formatFileSize
} from "@/shared/config/file-size.config";
import {
  isValidImageType,
  isValidVideoType,
  isValid3DModelType,
} from "@/shared/lib/utils";

interface BatchUploadMediaInput {
  files: File[];
  folder?: string;
  tags?: string[];
}

interface BatchUploadMediaResult {
  success: MediaEntity[];
  failed: Array<{
    index: number;
    fileName: string;
    error: string;
  }>;
}

/**
 * Batch Upload Media Use Case
 * Handles the business logic for uploading multiple media files at once
 */
export class BatchUploadMediaUseCase {
  constructor(
    private readonly mediaRepository: MediaRepository,
    private readonly imageKitService: ImageKitService,
    private readonly cache: ICacheService
  ) {}

  async execute(input: BatchUploadMediaInput): Promise<BatchUploadMediaResult> {
    const { files, folder, tags } = input;

    logger.info("Batch uploading media files", { count: files.length });

    if (files.length === 0) {
      throw new ApiError(
        "At least one file is required",
        ErrorCode.VALIDATION_ERROR,
        400
      );
    }

    if (files.length > 20) {
      throw new ApiError(
        "Maximum 20 files per batch",
        ErrorCode.VALIDATION_ERROR,
        400
      );
    }

    const success: MediaEntity[] = [];
    const failed: Array<{
      index: number;
      fileName: string;
      error: string;
    }> = [];

    // Process each file individually for better error handling
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        // Validate file exists
        if (!file || file.size === 0) {
          throw new Error("File is empty or invalid");
        }

        // Validate file type and get media type
        const mediaType = this.getMediaType(file.type);
        if (!mediaType) {
          throw new Error(`Unsupported file type: ${file.type}`);
        }

        // Validate file size early
        validateFileSize(file.size, mediaType, file.name);

        logger.debug("Uploading file to ImageKit", {
          index: i,
          fileName: file.name,
          fileSize: formatFileSize(file.size),
          fileType: file.type,
          mediaType,
        });

        // Upload to ImageKit
        const uploadResult = await this.imageKitService.uploadFile({
          file,
          fileName: file.name,
          folder: folder || "media",
          tags,
        });

        logger.debug("File uploaded to ImageKit successfully", {
          index: i,
          fileId: uploadResult.fileId,
          url: uploadResult.url,
        });

        // Save to database
        const media = await this.mediaRepository.create({
          fileName: uploadResult.name,
          fileSize: uploadResult.size,
          mimeType: uploadResult.mimeType,
          mediaType: uploadResult.mediaType,
          url: uploadResult.url,
          thumbnailUrl: uploadResult.thumbnailUrl,
          width: uploadResult.width,
          height: uploadResult.height,
        });

        success.push(media);

        logger.debug("Media record saved to database in batch", {
          index: i,
          mediaId: media.id,
          fileName: media.fileName,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        failed.push({
          index: i,
          fileName: file.name,
          error: errorMessage,
        });

        logger.warn("Failed to upload media file in batch", {
          index: i,
          fileName: file.name,
          error: errorMessage,
        });
      }
    }

    logger.info("Batch media upload completed", {
      total: files.length,
      success: success.length,
      failed: failed.length,
    });

    // Invalidate list caches if any uploads succeeded
    if (success.length > 0) {
      this.cache.invalidateMedia().catch((error) => {
        logger.error("Cache invalidation failed (non-critical)", {
          error: String(error),
        });
      });
    }

    return {
      success,
      failed,
    };
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
