import { ApiWrapper } from "@/shared/lib/api/api-handler";
import { logger } from "@/shared/lib/utils/logger";
import {
  createMetadataSchema,
  listMetadataSchema,
  validateAttributes,
  validateCreators,
  type CreateMetadataInput,
  type ListMetadataInput,
} from "@/shared/lib/validation/metadata.schemas";
import { MetadataQueryService } from "@/core/services/metadata/metadata-query.service";
import { getMetadataRepository } from "@/infrastructure/di/container";

/**
 * GET /api/metadata - List all metadata
 */
export const GET = ApiWrapper.create<ListMetadataInput>(
  async (input, context) => {
    const { query } = input;

    logger.info("Listing metadata", {
      query,
      requestId: context.requestId,
    });

    // Build list params using service
    const listParams = MetadataQueryService.buildListParams(query, {
      user: context.user,
      apiKey: context.apiKey,
    });

    // Fetch data using repository
    const metadataRepository = getMetadataRepository();
    const result = await metadataRepository.list(listParams);

    logger.info("Metadata listed successfully", {
      total: result.pagination.total,
      returned: result.data.length,
      page: result.pagination.page,
    });

    return result;
  },
  {
    auth: {
      required: true,
      requiredScopes: ["metadata:read"],
    },
    validation: {
      query: listMetadataSchema.shape.query,
    },
  }
);

/**
 * POST /api/metadata - Create new metadata
 */
export const POST = ApiWrapper.create<CreateMetadataInput>(
  async (input, context) => {
    const { body } = input;

    logger.info("Creating new metadata", {
      name: body.name,
      mediaType: body.mediaType,
      requestId: context.requestId,
      userId: context.apiKey?.userId,
    });

    // Additional validation
    if (!validateAttributes(body.attributes)) {
      throw new Error("Invalid attributes: duplicate trait types found");
    }

    if (!validateCreators(body.creators)) {
      throw new Error("Invalid creators: total share exceeds 100%");
    }

    // Create metadata using repository - body already matches CreateMetadataParams
    const metadataRepository = getMetadataRepository();
    const metadataEntity = await metadataRepository.create(body);

    logger.info("Metadata created successfully", {
      metadataId: metadataEntity.id,
      name: metadataEntity.name,
      version: metadataEntity.version,
    });

    return metadataEntity;
  },
  {
    auth: {
      required: true,
      requiredScopes: ["metadata:write"],
    },
    validation: {
      body: createMetadataSchema.shape.body,
    },
  }
);