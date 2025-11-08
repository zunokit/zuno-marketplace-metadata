import { ApiWrapper } from "@/shared/lib/api/api-handler";
import { logger } from "@/shared/lib/utils/logger";
import {
  createApiVersionSchema,
  type CreateApiVersionInput,
} from "@/shared/lib/validation/api-version.schemas";
import { ListApiVersionsUseCase } from "@/core/use-cases/api-version/list-api-versions.use-case";
import { CreateApiVersionUseCase } from "@/core/use-cases/api-version/create-api-version.use-case";
import { getApiVersionRepository } from "@/infrastructure/di/container";

/**
 * GET /api/admin/api-versions - List all API versions
 */
export const GET = ApiWrapper.create(
  async (input, context) => {
    logger.info("Listing API versions", {
      requestId: context.requestId,
    });

    const repository = getApiVersionRepository();
    const listUseCase = new ListApiVersionsUseCase(repository);
    const versions = await listUseCase.execute();

    logger.info("API versions listed successfully", {
      count: versions.length,
    });

    return versions;
  },
  {
    auth: {
      required: true,
      requiredScopes: ["admin"],
    },
  }
);

/**
 * POST /api/admin/api-versions - Create new API version
 */
export const POST = ApiWrapper.create<CreateApiVersionInput>(
  async (input, context) => {
    const { body } = input;

    logger.info("Creating new API version", {
      id: body.id,
      label: body.label,
      requestId: context.requestId,
    });

    const repository = getApiVersionRepository();
    const createUseCase = new CreateApiVersionUseCase(repository);
    const version = await createUseCase.execute(body);

    logger.info("API version created successfully", {
      id: version.id,
      label: version.label,
    });

    return version;
  },
  {
    auth: {
      required: true,
      requiredScopes: ["admin"],
    },
    validation: {
      body: createApiVersionSchema.shape.body,
    },
  }
);
