import { z } from "zod";
import { ApiWrapper } from "@/shared/lib/api/api-handler";
import { logger } from "@/shared/lib/utils/logger";
import {
  createMetadataSchema,
  listMetadataSchema,
  validateAttributes,
  validateCreators,
} from "@/shared/lib/validation/metadata.schemas";
import { MetadataQueryService } from "@/core/services/metadata/metadata-query.service";
import { getMetadataRepository } from "@/infrastructure/di/container";
import type { CreateMetadataParams } from "@/core/domain/metadata/metadata.entity";

/**
 * GET /api/metadata - List all metadata
 */
export const GET = ApiWrapper.create(
  async (input, context) => {
    // Extract query from nested input structure (similar to reference project)
    const queryParams = (input as any).query || input;

    logger.info("Listing metadata", {
      queryParams,
      requestId: context.requestId,
    });

    // Build list params using service
    const listParams = MetadataQueryService.buildListParams(queryParams, {
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
export const POST = ApiWrapper.create(
  async (input, context) => {
    const { body } = input as z.infer<typeof createMetadataSchema>;

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

    // Prepare creation params
    const createParams: CreateMetadataParams = {
      name: body.name,
      description: body.description,
      symbol: body.symbol,
      image: body.image,
      bannerImage: body.bannerImage,
      featuredImage: body.featuredImage,
      animationUrl: body.animationUrl,
      externalUrl: body.externalUrl,
      backgroundColor: body.backgroundColor,
      attributes: body.attributes,
      mediaType: body.mediaType,
      creators: body.creators,
      sellerFeeBasisPoints: body.sellerFeeBasisPoints,
      feeRecipient: body.feeRecipient,
    };

    // Create metadata using repository
    const metadataRepository = getMetadataRepository();
    const metadataEntity = await metadataRepository.create(createParams);

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