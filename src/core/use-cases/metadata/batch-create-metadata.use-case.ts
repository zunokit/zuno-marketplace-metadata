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

    // Try atomic batch creation first (using transaction)
    try {
      logger.debug("Attempting atomic batch creation with transaction");

      const created = await this.metadataRepository.createMany(metadata);

      logger.info("Batch metadata creation completed atomically", {
        total: metadata.length,
        success: created.length,
        failed: 0,
      });

      return {
        success: created,
        failed: [],
      };
    } catch (error) {
      // If atomic operation fails, fall back to individual processing
      // to identify which specific items failed
      logger.warn("Atomic batch creation failed, falling back to individual processing", {
        error: error instanceof Error ? error.message : String(error),
      });

      const success: MetadataEntity[] = [];
      const failed: Array<{
        index: number;
        error: string;
        data: CreateMetadataParams;
      }> = [];

      // Process each metadata item individually for detailed error reporting
      for (let i = 0; i < metadata.length; i++) {
        try {
          const item = metadata[i];
          const created = await this.metadataRepository.create(item);
          success.push(created);

          logger.debug("Metadata item created in batch", {
            index: i,
            metadataId: created.id,
            name: created.name,
          });
        } catch (itemError) {
          const errorMessage =
            itemError instanceof Error ? itemError.message : "Unknown error";
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

      logger.info("Batch metadata creation completed with fallback", {
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
}
