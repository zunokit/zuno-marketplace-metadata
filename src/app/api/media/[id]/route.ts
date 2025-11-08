import { ApiWrapper } from "@/shared/lib/api/api-handler";
import { getMediaRepository, getImageKitService, getCacheService } from "@/infrastructure/di/container";
import { MediaDtoMapper } from "@/shared/dto/media.dto";
import {
  GetMediaByIdSchema,
  type GetMediaByIdInput,
} from "@/shared/lib/validation/media.schemas";
import { GetMediaUseCase } from "@/core/use-cases/media/get-media.use-case";
import { DeleteMediaUseCase } from "@/core/use-cases/media/delete-media.use-case";
import { logger } from "@/shared/lib/utils/logger";

/**
 * GET /api/media/[id] - Get media by ID
 */
export const GET = ApiWrapper.create<GetMediaByIdInput>(
  async (input, context) => {
    const { params } = input;
    const { id } = params;

    logger.info("Getting media by ID", {
      mediaId: id,
      requestId: context.requestId,
    });

    // Execute use case
    const getMediaUseCase = new GetMediaUseCase(getMediaRepository(), getCacheService());
    const media = await getMediaUseCase.execute(id);

    return MediaDtoMapper.toResponseDto(media);
  },
  {
    auth: {
      required: true,
      requiredScopes: ["media:read"],
    },
    validation: {
      params: GetMediaByIdSchema.shape.params,
    },
  }
);

/**
 * DELETE /api/media/[id] - Delete media by ID
 */
export const DELETE = ApiWrapper.create<GetMediaByIdInput>(
  async (input, context) => {
    const { params } = input;
    const { id } = params;

    logger.info("Deleting media by ID", {
      mediaId: id,
      requestId: context.requestId,
      userId: context.apiKey?.userId,
    });

    // Execute use case
    const deleteMediaUseCase = new DeleteMediaUseCase(
      getMediaRepository(),
      getImageKitService(),
      getCacheService()
    );
    const media = await deleteMediaUseCase.execute(id);

    return MediaDtoMapper.toDeletedResponseDto(media);
  },
  {
    auth: {
      required: true,
      requiredScopes: ["media:delete"],
    },
    validation: {
      params: GetMediaByIdSchema.shape.params,
    },
  }
);
