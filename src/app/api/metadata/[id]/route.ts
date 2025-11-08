import { ApiWrapper } from "@/shared/lib/api/api-handler";
import { getMetadataRepository, getCacheService } from "@/infrastructure/di/container";
import { MetadataDtoMapper } from "@/shared/dto/metadata.dto";
import { GetMetadataUseCase } from "@/core/use-cases/metadata/get-metadata.use-case";
import { UpdateMetadataUseCase } from "@/core/use-cases/metadata/update-metadata.use-case";
import { DeleteMetadataUseCase } from "@/core/use-cases/metadata/delete-metadata.use-case";
import { logger } from "@/shared/lib/utils/logger";
import {
  getMetadataSchema,
  updateMetadataSchema,
  deleteMetadataSchema,
  type GetMetadataInput,
  type UpdateMetadataInput,
  type DeleteMetadataInput,
} from "@/shared/lib/validation/metadata.schemas";

/**
 * GET /api/metadata/[id] - Get metadata by ID
 */
export const GET = ApiWrapper.create<GetMetadataInput>(
  async (input, context) => {
    const { params } = input;
    const { id } = params;

    // Get userId and admin status for ownership validation
    const userId = context.user?.id || context.apiKey?.userId;
    const isAdmin = context.user?.role === "admin";

    logger.info("Getting metadata by ID", {
      metadataId: id,
      requestId: context.requestId,
      userId,
      isAdmin,
    });

    // Execute use case with ownership validation
    const getMetadataUseCase = new GetMetadataUseCase(getMetadataRepository(), getCacheService());
    const metadata = await getMetadataUseCase.execute({
      metadataId: id,
      userId,
      isAdmin,
    });

    return MetadataDtoMapper.toResponseDto(metadata);
  },
  {
    auth: {
      required: true,
      requiredScopes: ["metadata:read"],
    },
    validation: {
      params: getMetadataSchema.shape.params,
    },
    versioning: {
      required: true,
      allowDeprecated: false,
    },
  }
);

/**
 * PUT /api/metadata/[id] - Update metadata by ID
 */
export const PUT = ApiWrapper.create<UpdateMetadataInput>(
  async (input, context) => {
    const { params, body } = input;
    const { id } = params;

    // Get userId and admin status for ownership validation
    const userId = context.user?.id || context.apiKey?.userId;
    const isAdmin = context.user?.role === "admin";

    logger.info("Updating metadata by ID", {
      metadataId: id,
      requestId: context.requestId,
      userId,
      isAdmin,
    });

    // Execute use case with ownership validation
    const updateMetadataUseCase = new UpdateMetadataUseCase(
      getMetadataRepository(),
      getCacheService()
    );
    const updatedMetadata = await updateMetadataUseCase.execute({
      metadataId: id,
      updates: body,
      userId,
      isAdmin,
    });

    return MetadataDtoMapper.toResponseDto(updatedMetadata);
  },
  {
    auth: {
      required: true,
      requiredScopes: ["metadata:write"],
    },
    validation: {
      params: updateMetadataSchema.shape.params,
      body: updateMetadataSchema.shape.body,
    },
    versioning: {
      required: true,
      allowDeprecated: false,
    },
  }
);

/**
 * DELETE /api/metadata/[id] - Delete metadata by ID
 */
export const DELETE = ApiWrapper.create<DeleteMetadataInput>(
  async (input, context) => {
    const { params } = input;
    const { id } = params;

    // Get userId and admin status for ownership validation
    const userId = context.user?.id || context.apiKey?.userId;
    const isAdmin = context.user?.role === "admin";

    logger.info("Deleting metadata by ID", {
      metadataId: id,
      requestId: context.requestId,
      userId,
      isAdmin,
    });

    // Execute use case with ownership validation
    const deleteMetadataUseCase = new DeleteMetadataUseCase(
      getMetadataRepository(),
      getCacheService()
    );
    const metadata = await deleteMetadataUseCase.execute({
      metadataId: id,
      userId,
      isAdmin,
    });

    return MetadataDtoMapper.toDeletedResponseDto(metadata);
  },
  {
    auth: {
      required: true,
      requiredScopes: ["metadata:delete"],
    },
    validation: {
      params: deleteMetadataSchema.shape.params,
    },
    versioning: {
      required: true,
      allowDeprecated: false,
    },
  }
);
