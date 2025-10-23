import { ApiWrapper } from "@/shared/lib/api/api-handler";
import { getMediaRepository, getImageKitService } from "@/infrastructure/di/container";
import { MediaDtoMapper } from "@/shared/dto/media.dto";
import { ListMediaSchema, type ListMediaInput } from "@/shared/lib/validation/media.dto";
import { ListMediaUseCase } from "@/core/use-cases/media/list-media.use-case";
import { UploadMediaUseCase } from "@/core/use-cases/media/upload-media.use-case";
import { logger } from "@/shared/lib/utils/logger";

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
export const POST = ApiWrapper.create(
  async (input, context) => {
    const formData = input as FormData;

    logger.info("Starting media upload", {
      requestId: context.requestId,
      userId: context.apiKey?.userId,
    });

    // Extract file and optional parameters from form data
    const file = formData.get("file") as File;
    const folder = formData.get("folder") as string | null;
    const tags = formData.getAll("tags") as string[];

    // Execute use case
    const uploadMediaUseCase = new UploadMediaUseCase(
      getMediaRepository(),
      getImageKitService()
    );
    const media = await uploadMediaUseCase.execute({
      file,
      folder: folder || undefined,
      tags: tags.length > 0 ? tags : undefined,
    });

    return MediaDtoMapper.toCreatedResponseDto(media);
  },
  {
    auth: {
      required: true,
      requiredScopes: ["media:write"],
    },
  }
);