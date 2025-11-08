import type { MetadataRepository } from "@/core/domain/metadata/metadata.repository";
import type { MetadataEntity } from "@/core/domain/metadata/metadata.entity";
import { logger } from "@/shared/lib/utils/logger";
import { ApiError } from "@/shared/lib/api/api-handler";
import { ErrorCode } from "@/shared/types";
import { getCacheService } from "@/infrastructure/cache/cache.service";

interface DeleteMetadataInput {
  metadataId: string;
  userId?: string; // For ownership validation
  isAdmin?: boolean; // Admins can delete all metadata
}

/**
 * Delete Metadata Use Case
 * Handles the business logic for deleting metadata with cache invalidation and ownership validation
 */
export class DeleteMetadataUseCase {
  private readonly cache = getCacheService();

  constructor(private readonly metadataRepository: MetadataRepository) {}

  async execute(input: string | DeleteMetadataInput): Promise<MetadataEntity> {
    // Support both old signature (string) and new signature (object)
    const { metadataId, userId, isAdmin } =
      typeof input === 'string'
        ? { metadataId: input, userId: undefined, isAdmin: undefined }
        : input;

    logger.info("Deleting metadata", { metadataId, userId, isAdmin });

    // 1. Get metadata first to check if it exists
    const metadata = await this.metadataRepository.findById(metadataId);

    if (!metadata) {
      logger.warn("Metadata not found for deletion", { metadataId });
      throw new ApiError(`Metadata with ID ${metadataId} not found`, ErrorCode.NOT_FOUND, 404);
    }

    // 2. Ownership validation (IDOR protection)
    if (!isAdmin && userId && metadata.userId !== userId) {
      logger.warn("Unauthorized delete attempt to metadata", {
        metadataId,
        requestUserId: userId,
        ownerUserId: metadata.userId,
      });
      throw new ApiError(
        "You do not have permission to delete this metadata",
        ErrorCode.FORBIDDEN,
        403
      );
    }

    // 3. Check if locked
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

    logger.info("Metadata deleted successfully", {
      metadataId,
      name: metadata.name,
      version: metadata.version,
    });

    // 4. Invalidate cache (fire and forget - don't await, catch errors)
    this.cache.invalidateMetadata(metadataId).catch((error) => {
      logger.error("Cache invalidation failed (non-critical)", {
        metadataId,
        error: String(error),
      });
    });

    return metadata;
  }
}
