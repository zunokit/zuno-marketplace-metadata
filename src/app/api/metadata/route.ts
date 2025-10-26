import { ApiWrapper, ApiError } from "@/shared/lib/api/api-handler";
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
import { ErrorCode } from "@/shared/types";
import { metadataQueue } from "@/infrastructure/queue/queue.config";
import {
  getCacheService,
  CacheKeyBuilder,
  CacheTTL,
} from "@/infrastructure/cache/cache.service";

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
    const listParams = MetadataQueryService.buildListParams(query);

    // Build cache key from query params
    const cache = getCacheService();
    const cacheKey = CacheKeyBuilder.metadataList({
      page: listParams.page,
      limit: listParams.limit,
      search: listParams.search,
    });

    // Use cache-aside pattern for list queries
    const result = await cache.getOrSet(
      cacheKey,
      async () => {
        const metadataRepository = getMetadataRepository();
        return await metadataRepository.list(listParams);
      },
      CacheTTL.METADATA_LIST
    );

    logger.info("Metadata listed successfully", {
      total: result.pagination.total,
      returned: result.data.length,
      page: result.pagination.page,
      cached: true,
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
    versioning: {
      required: true,
      allowDeprecated: false,
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
      requestId: context.requestId,
      userId: context.apiKey?.userId,
    });

    // Additional validation
    if (!validateAttributes(body.attributes)) {
      throw new ApiError(
        "Invalid attributes: duplicate trait types found",
        ErrorCode.VALIDATION_ERROR,
        400
      );
    }

    if (!validateCreators(body.creators)) {
      throw new ApiError(
        "Invalid creators: total share exceeds 100%",
        ErrorCode.VALIDATION_ERROR,
        400
      );
    }

    // Create metadata using repository - body already matches CreateMetadataParams
    const metadataRepository = getMetadataRepository();
    const metadataEntity = await metadataRepository.create(body);

    logger.info("Metadata created successfully", {
      metadataId: metadataEntity.id,
      name: metadataEntity.name,
      version: metadataEntity.version,
    });

    // Queue IPFS pinning job (async background task)
    await metadataQueue.add(
      "pin-metadata",
      {
        metadataId: metadataEntity.id,
        metadata: {
          name: metadataEntity.name,
          description: metadataEntity.description,
          image: metadataEntity.image,
          ...(metadataEntity.animationUrl && {
            animation_url: metadataEntity.animationUrl,
          }),
          ...(metadataEntity.externalUrl && {
            external_url: metadataEntity.externalUrl,
          }),
          ...(metadataEntity.backgroundColor && {
            background_color: metadataEntity.backgroundColor,
          }),
          ...(metadataEntity.attributes && {
            attributes: metadataEntity.attributes.map((attr) => ({
              trait_type: attr.traitType,
              value: attr.value,
              ...(attr.displayType && { display_type: attr.displayType }),
              ...(attr.maxValue && { max_value: attr.maxValue }),
            })),
          }),
          ...(metadataEntity.creators && {
            properties: {
              creators: metadataEntity.creators,
            },
          }),
          ...(metadataEntity.sellerFeeBasisPoints !== undefined && {
            seller_fee_basis_points: metadataEntity.sellerFeeBasisPoints,
          }),
        },
        name: metadataEntity.name,
      },
      {
        removeOnComplete: true,
        removeOnFail: false, // Keep failed jobs for debugging
      }
    );

    logger.info("Metadata IPFS pinning job queued", {
      metadataId: metadataEntity.id,
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
    versioning: {
      required: true,
      allowDeprecated: false,
    },
  }
);
