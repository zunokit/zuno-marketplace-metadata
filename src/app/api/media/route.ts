import { ApiWrapper, ApiError } from "@/shared/lib/api/api-handler";
import { ErrorCode } from "@/shared/types";
import {
  getMediaRepository,
  getImageKitService,
} from "@/infrastructure/di/container";
import { MediaDtoMapper } from "@/shared/dto/media.dto";
import {
  ListMediaSchema,
  UploadMediaSchema,
  type ListMediaInput,
  type UploadMediaInput,
} from "@/shared/lib/validation/media.dto";
import { ListMediaUseCase } from "@/core/use-cases/media/list-media.use-case";
import { UploadMediaUseCase } from "@/core/use-cases/media/upload-media.use-case";
import { logger } from "@/shared/lib/utils/logger";
import { mediaQueue } from "@/infrastructure/queue/queue.config";

/**
 * GET /api/media - List all media files
 */
export const GET = ApiWrapper.create<ListMediaInput>(
  async (input, context) => {
    const { query } = input;

    logger.info("Listing media files", {
      ...query,
      requestId: context.requestId,
    });

    // Execute use case
    const listMediaUseCase = new ListMediaUseCase(getMediaRepository());
    const result = await listMediaUseCase.execute(query);

    return MediaDtoMapper.toPaginatedResponseDto(result);
  },
  {
    auth: {
      required: true,
      requiredScopes: ["media:read"],
    },
    validation: {
      query: ListMediaSchema.shape.query,
    },
  }
);

/**
 * POST /api/media - Upload media file
 */
export const POST = ApiWrapper.create<UploadMediaInput>(
  async (input, context) => {
    const { body } = input;

    // Get userId from either API key or session
    const userId = context.user?.id || context.apiKey?.userId;
    if (!userId) {
      throw new ApiError(
        "User ID not found in authentication context",
        ErrorCode.UNAUTHORIZED,
        401
      );
    }

    logger.info("Starting media upload", {
      requestId: context.requestId,
      userId,
    });

    // Extract file and optional parameters from form data
    const file = body.get("file") as File;
    const folder = body.get("folder") as string | null;
    const tags = body.getAll("tags") as string[];

    // Execute use case with userId for ownership tracking
    const uploadMediaUseCase = new UploadMediaUseCase(
      getMediaRepository(),
      getImageKitService()
    );
    const media = await uploadMediaUseCase.execute({
      file,
      folder: folder || undefined,
      tags: tags.length > 0 ? tags : undefined,
      userId,
    });

    // Queue IPFS pinning job (async background task)
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
        removeOnFail: false, // Keep failed jobs for debugging
      }
    );

    logger.info("Media IPFS pinning job queued", {
      mediaId: media.id,
    });

    return MediaDtoMapper.toCreatedResponseDto(media);
  },
  {
    auth: {
      required: true,
      requiredScopes: ["media:write"],
    },
    validation: {
      body: UploadMediaSchema.shape.body,
    },
  }
);
