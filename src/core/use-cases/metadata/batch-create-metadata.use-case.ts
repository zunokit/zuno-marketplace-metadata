import type { MetadataRepository } from "@/core/domain/metadata/metadata.repository";
import type {
  MetadataEntity,
  CreateMetadataParams,
} from "@/core/domain/metadata/metadata.entity";
import { logger } from "@/shared/lib/utils/logger";
import { ApiError } from "@/shared/lib/api/api-handler";
import { ErrorCode } from "@/shared/types";
import { validateAttributes } from "@/shared/lib/validation/metadata.schemas";

interface BatchCreateMetadataInput {
  metadata: CreateMetadataParams[];
}

interface BatchCreateMetadataResult {
  success: MetadataEntity[];
  failed: Array<{
    index: number;
    error: string;
    data: CreateMetadataParams;
  }>;
}

/**
 * Batch Create Metadata Use Case
 * Handles the business logic for creating multiple metadata items at once
 */
export class BatchCreateMetadataUseCase {
  constructor(private readonly metadataRepository: MetadataRepository) {}

  async execute(
    input: BatchCreateMetadataInput
  ): Promise<BatchCreateMetadataResult> {
    const { metadata } = input;

    logger.info("Batch creating metadata", { count: metadata.length });

    if (metadata.length === 0) {
      throw new ApiError(
        "At least one metadata item is required",
        ErrorCode.VALIDATION_ERROR,
        400
      );
    }

    if (metadata.length > 50) {
      throw new ApiError(
        "Maximum 50 metadata items per batch",
        ErrorCode.VALIDATION_ERROR,
        400
      );
    }

    const success: MetadataEntity[] = [];
    const failed: Array<{
      index: number;
      error: string;
      data: CreateMetadataParams;
    }> = [];

    // Process each metadata item individually for better error handling
    for (let i = 0; i < metadata.length; i++) {
      try {
        const item = metadata[i];

        // Defense-in-depth validation
        if (!validateAttributes(item.attributes ?? [])) {
          throw new ApiError(
            `Invalid attributes at index ${i}: duplicate trait types found`,
            ErrorCode.VALIDATION_ERROR,
            400
          );
        }

        if (Array.isArray(item.creators) && item.creators.length > 0) {
          const sum = item.creators.reduce((acc, c) => acc + (c.share ?? 0), 0);
          if (sum !== 100) {
            throw new ApiError(
              `Invalid creators at index ${i}: shares must sum to exactly 100`,
              ErrorCode.VALIDATION_ERROR,
              400
            );
          }
        }
        const created = await this.metadataRepository.create(item);
        success.push(created);

        logger.debug("Metadata item created in batch", {
          index: i,
          metadataId: created.id,
          name: created.name,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        failed.push({
          index: i,
          error: errorMessage,
          data: metadata[i],
        });

        logger.warn("Failed to create metadata item in batch", {
          index: i,
          error: errorMessage,
        });
      }
    }

    logger.info("Batch metadata creation completed", {
      total: metadata.length,
      success: success.length,
      failed: failed.length,
    });

    return {
      success,
      failed,
    };
  }
}
