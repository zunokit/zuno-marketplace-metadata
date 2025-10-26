import type { MetadataRepository } from "@/core/domain/metadata/metadata.repository";
import type { MetadataEntity } from "@/core/domain/metadata/metadata.entity";
import { logger } from "@/shared/lib/utils/logger";
import { ApiError } from "@/shared/lib/api/api-handler";
import { ErrorCode } from "@/shared/types";
import { getCacheService } from "@/infrastructure/cache/cache.service";

/**
 * Delete Metadata Use Case
 * Handles the business logic for deleting metadata with cache invalidation
 */
export class DeleteMetadataUseCase {
  private readonly cache = getCacheService();

  constructor(private readonly metadataRepository: MetadataRepository) {}

  async execute(metadataId: string): Promise<MetadataEntity> {
    logger.info("Deleting metadata", { metadataId });

    // 1. Get metadata first to check if it exists
    const metadata = await this.metadataRepository.findById(metadataId);

    if (!metadata) {
      logger.warn("Metadata not found for deletion", { metadataId });
      throw new ApiError(`Metadata with ID ${metadataId} not found`, ErrorCode.NOT_FOUND, 404);
    }

    // 2. Check if locked
    if (metadata.isLocked) {
      logger.warn("Attempted to delete locked metadata", {
        metadataId,
        name: metadata.name,
        version: metadata.version,
      });
      throw new ApiError("Cannot delete locked metadata", ErrorCode.FORBIDDEN, 403);
    }

    // 3. Delete metadata from repository
    const deleted = await this.metadataRepository.delete(metadataId);

    if (!deleted) {
      throw new ApiError("Failed to delete metadata", ErrorCode.INTERNAL_ERROR, 500);
    }

    // 4. Invalidate cache (fire and forget - don't await)
    void this.cache.invalidateMetadata(metadataId);

    logger.info("Metadata deleted successfully", {
      metadataId,
      name: metadata.name,
      version: metadata.version,
    });

    return metadata;
  }
}
