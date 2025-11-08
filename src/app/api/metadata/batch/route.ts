import { ApiWrapper } from "@/shared/lib/api/api-handler";
import { logger } from "@/shared/lib/utils/logger";
import { batchCreateMetadataSchema } from "@/shared/lib/validation/metadata.schemas";
import { getMetadataRepository } from "@/infrastructure/di/container";
import { BatchCreateMetadataUseCase } from "@/core/use-cases/metadata/batch-create-metadata.use-case";
import { metadataQueue } from "@/infrastructure/queue/queue.config";
import type { BatchCreateMetadataInput } from "@/shared/lib/validation/metadata.schemas";

/**
 * POST /api/metadata/batch - Create multiple metadata items
 */
export const POST = ApiWrapper.create<BatchCreateMetadataInput>(
  async (input, context) => {
    const { body } = input;
    const { metadata } = body;

    logger.info("Batch creating metadata", {
      count: metadata.length,
      requestId: context.requestId,
      userId: context.apiKey?.userId,
    });


    // Execute batch create use case
    const batchCreateUseCase = new BatchCreateMetadataUseCase(
      getMetadataRepository()
    );
    const result = await batchCreateUseCase.execute({ metadata });

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
