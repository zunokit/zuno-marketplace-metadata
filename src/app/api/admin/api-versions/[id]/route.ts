import { ApiWrapper } from "@/shared/lib/api/api-handler";
import { logger } from "@/shared/lib/utils/logger";
import {
  updateApiVersionSchema,
  deleteApiVersionSchema,
  type UpdateApiVersionInput,
  type DeleteApiVersionInput,
} from "@/shared/lib/validation/api-version.schemas";
import { UpdateApiVersionUseCase } from "@/core/use-cases/api-version/update-api-version.use-case";
import { DeleteApiVersionUseCase } from "@/core/use-cases/api-version/delete-api-version.use-case";

/**
 * PATCH /api/admin/api-versions/:id - Update API version
 */
export const PATCH = ApiWrapper.create<UpdateApiVersionInput>(
  async (input, context) => {
    const { params, body } = input;

    logger.info("Updating API version", {
      id: params.id,
      requestId: context.requestId,
    });

    const updateUseCase = new UpdateApiVersionUseCase();
    const version = await updateUseCase.execute({
      id: params.id,
      ...body,
    });

    logger.info("API version updated successfully", {
      id: version.id,
    });

    return version;
  },
  {
    auth: {
      required: true,
      requiredScopes: ["admin"],
    },
    validation: {
      params: updateApiVersionSchema.shape.params,
      body: updateApiVersionSchema.shape.body,
    },
  }
);

/**
 * DELETE /api/admin/api-versions/:id - Delete API version
 */
export const DELETE = ApiWrapper.create<DeleteApiVersionInput>(
  async (input, context) => {
    const { params } = input;

    logger.info("Deleting API version", {
      id: params.id,
      requestId: context.requestId,
    });

    const deleteUseCase = new DeleteApiVersionUseCase();
    await deleteUseCase.execute(params.id);

    logger.info("API version deleted successfully", {
      id: params.id,
    });

    return { success: true };
  },
  {
    auth: {
      required: true,
      requiredScopes: ["admin"],
    },
    validation: {
      params: deleteApiVersionSchema.shape.params,
    },
  }
);
