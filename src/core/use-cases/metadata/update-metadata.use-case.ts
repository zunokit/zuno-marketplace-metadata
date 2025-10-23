import type { MetadataRepository } from "@/core/domain/metadata/metadata.repository";
import type { MetadataEntity, UpdateMetadataParams } from "@/core/domain/metadata/metadata.entity";
import { logger } from "@/shared/lib/utils/logger";
import { ApiError } from "@/shared/lib/api/api-handler";
import { ErrorCode } from "@/shared/types";
import { validateAttributes, validateCreators } from "@/shared/lib/validation/metadata.schemas";

interface UpdateMetadataInput {
  metadataId: string;
  updates: UpdateMetadataParams & { version?: number };
}

/**
 * Update Metadata Use Case
 * Handles the business logic for updating metadata
 */
export class UpdateMetadataUseCase {
  constructor(private readonly metadataRepository: MetadataRepository) {}

  async execute(input: UpdateMetadataInput): Promise<MetadataEntity> {
    const { metadataId, updates } = input;

    logger.info("Updating metadata", { metadataId });

    // 1. Get current metadata
    const currentMetadata = await this.metadataRepository.findById(metadataId);

    if (!currentMetadata) {
      logger.warn("Metadata not found for update", { metadataId });
      throw new ApiError(`Metadata with ID ${metadataId} not found`, ErrorCode.NOT_FOUND, 404);
    }

    // 2. Check if locked
    if (currentMetadata.isLocked) {
      logger.warn("Attempted to update locked metadata", {
        metadataId,
        version: currentMetadata.version,
      });
      throw new ApiError("Cannot update locked metadata", ErrorCode.FORBIDDEN, 403);
    }

    // 3. Validate version if provided
    if (updates.version !== undefined && updates.version !== currentMetadata.version) {
      logger.warn("Metadata version conflict", {
        metadataId,
        providedVersion: updates.version,
        currentVersion: currentMetadata.version,
      });
      throw new ApiError(
        `Version conflict. Current version is ${currentMetadata.version}, provided ${updates.version}`,
        ErrorCode.CONFLICT,
        409
      );
    }

    // 4. Additional validation for attributes and creators
    if (updates.attributes && !validateAttributes(updates.attributes)) {
      throw new ApiError(
        "Invalid attributes: duplicate trait types found",
        ErrorCode.VALIDATION_ERROR,
        400
      );
    }

    if (updates.creators && !validateCreators(updates.creators)) {
      throw new ApiError(
        "Invalid creators: total share exceeds 100%",
        ErrorCode.VALIDATION_ERROR,
        400
      );
    }

    // 5. Prepare update data
    const updateData: Partial<UpdateMetadataParams> & { version?: number } = {};

    // Only include fields that are being updated
    (Object.keys(updates) as Array<keyof typeof updates>).forEach((key) => {
      if (updates[key] !== undefined && key !== "version") {
        // TypeScript-safe assignment using index signature
        (updateData as Record<string, unknown>)[key] = updates[key];
      }
    });

    // 6. Increment version for any content change
    const contentFields = [
      "name",
      "description",
      "symbol",
      "image",
      "bannerImage",
      "featuredImage",
      "animationUrl",
      "externalUrl",
      "backgroundColor",
      "attributes",
      "mediaType",
      "creators",
      "sellerFeeBasisPoints",
      "feeRecipient",
    ];

    const hasContentChanges = contentFields.some(
      (field) => updateData[field as keyof typeof updateData] !== undefined
    );

    if (hasContentChanges) {
      updateData.version = currentMetadata.version + 1;
    }

    // 7. Update metadata via repository
    const updatedMetadata = await this.metadataRepository.update(metadataId, updateData);

    if (!updatedMetadata) {
      throw new ApiError("Failed to update metadata", ErrorCode.INTERNAL_ERROR, 500);
    }

    logger.info("Metadata updated successfully", {
      metadataId,
      oldVersion: currentMetadata.version,
      newVersion: updatedMetadata.version,
      hasContentChanges,
    });

    return updatedMetadata;
  }
}
