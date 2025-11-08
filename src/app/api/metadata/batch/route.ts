import { ApiWrapper, ApiError } from "@/shared/lib/api/api-handler";
import { logger } from "@/shared/lib/utils/logger";
import {
  batchCreateMetadataSchema,
  validateAttributes,
  validateCreators,
} from "@/shared/lib/validation/metadata.schemas";
import { getMetadataRepository } from "@/infrastructure/di/container";
import { ErrorCode } from "@/shared/types";
import { BatchCreateMetadataUseCase } from "@/core/use-cases/metadata/batch-create-metadata.use-case";
import { metadataQueue } from "@/infrastructure/queue/queue.config";
import type { z } from "zod";

type BatchCreateMetadataInput = z.infer<typeof batchCreateMetadataSchema>;

/**
 * POST /api/metadata/batch - Create multiple metadata items
 */
export const POST = ApiWrapper.create<BatchCreateMetadataInput>(
  async (input, context) => {
    const { body } = input;
    const { metadata } = body;

    // Get userId from either API key or session
    const userId = context.user?.id || context.apiKey?.userId;
    if (!userId) {
      throw new ApiError(
        "User ID not found in authentication context",
        ErrorCode.UNAUTHORIZED,
        401
      );
    }

    logger.info("Batch creating metadata", {
      count: metadata.length,
      requestId: context.requestId,
      userId,
    });

    // Validate all items before processing
    for (let i = 0; i < metadata.length; i++) {
      const item = metadata[i];

      if (!validateAttributes(item.attributes)) {
        throw new ApiError(
          `Invalid attributes at index ${i}: duplicate trait types found`,
          ErrorCode.VALIDATION_ERROR,
          400
        );
      }

      if (!validateCreators(item.creators)) {
        throw new ApiError(
          `Invalid creators at index ${i}: total share exceeds 100%`,
          ErrorCode.VALIDATION_ERROR,
          400
        );
      }
    }

    // Add userId to each metadata item for ownership tracking
    const metadataWithUserId = metadata.map((item) => ({
      ...item,
      userId,
    }));

    // Execute batch create use case
    const batchCreateUseCase = new BatchCreateMetadataUseCase(
      getMetadataRepository()
    );
    const result = await batchCreateUseCase.execute({ metadata: metadataWithUserId });

    logger.info("Batch metadata creation completed", {
      total: metadata.length,
      success: result.success.length,
      failed: result.failed.length,
    });

    // Queue IPFS pinning jobs for successful creations (async background tasks)
    for (const metadataEntity of result.success) {
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
          removeOnFail: false,
        }
      );
    }

    logger.info("Metadata IPFS pinning jobs queued", {
      count: result.success.length,
    });

    return {
      success: result.success,
      failed: result.failed,
      summary: {
        total: metadata.length,
        succeeded: result.success.length,
        failed: result.failed.length,
      },
    };
  },
  {
    auth: {
      required: true,
      requiredScopes: ["metadata:write"],
    },
    validation: {
      body: batchCreateMetadataSchema.shape.body,
    },
    versioning: {
      required: true,
      allowDeprecated: false,
    },
  }
);
