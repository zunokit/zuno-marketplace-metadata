import { ApiWrapper } from "@/shared/lib/api/api-handler";
import {
  getMediaRepository,
  getImageKitService,
  getCacheService,
} from "@/infrastructure/di/container";
import { BatchUploadMediaSchema } from "@/shared/lib/validation/media.dto";
import { BatchUploadMediaUseCase } from "@/core/use-cases/media/batch-upload-media.use-case";
import { logger } from "@/shared/lib/utils/logger";
import { mediaQueue } from "@/infrastructure/queue/queue.config";
import { MediaDtoMapper } from "@/shared/dto/media.dto";
import type { z } from "zod";

type BatchUploadMediaInput = z.infer<typeof BatchUploadMediaSchema>;

/**
 * POST /api/media/batch - Upload multiple media files
 */
export const POST = ApiWrapper.create<BatchUploadMediaInput>(
  async (input, context) => {
    const { body } = input;

    logger.info("Starting batch media upload", {
      requestId: context.requestId,
      userId: context.apiKey?.userId,
    });

    // Extract files and optional parameters from form data
    const files = body.getAll("files") as File[];
    const folder = body.get("folder") as string | null;
    const tags = body.getAll("tags") as string[];

    // Execute batch upload use case
    const batchUploadUseCase = new BatchUploadMediaUseCase(
      getMediaRepository(),
      getImageKitService(),
      getCacheService()
    );
    const result = await batchUploadUseCase.execute({
      files,
      folder: folder || undefined,
      tags: tags.length > 0 ? tags : undefined,
    });

    logger.info("Batch media upload completed", {
      total: files.length,
      success: result.success.length,
      failed: result.failed.length,
    });

    // Queue IPFS pinning jobs for successful uploads (async background tasks)
    for (const media of result.success) {
      await mediaQueue.add(
        "pin-media",
        {
          mediaId: media.id,
          url: media.url,
          fileName: media.fileName,
          mediaType: media.mediaType,
        },
        {
          removeOnComplete: true,
          removeOnFail: false,
        }
      );
    }

    logger.info("Media IPFS pinning jobs queued", {
      count: result.success.length,
    });

    return {
      success: result.success.map((media) =>
        MediaDtoMapper.toCreatedResponseDto(media)
      ),
      failed: result.failed,
      summary: {
        total: files.length,
        succeeded: result.success.length,
        failed: result.failed.length,
      },
    };
  },
  {
    auth: {
      required: true,
      requiredScopes: ["media:write"],
    },
    validation: {
      body: BatchUploadMediaSchema.shape.body,
    },
  }
);
