import type { MetadataRepository } from "@/core/domain/metadata/metadata.repository";
import type { MetadataEntity } from "@/core/domain/metadata/metadata.entity";
import { logger } from "@/shared/lib/utils/logger";
import { ApiError } from "@/shared/lib/api/api-handler";
import { ErrorCode } from "@/shared/types";

interface GetMetadataInput {
  metadataId: string;
  version?: number;
}

/**
 * Get Metadata Use Case
 * Handles the business logic for retrieving metadata
 */
export class GetMetadataUseCase {
  constructor(private readonly metadataRepository: MetadataRepository) {}

  async execute(input: GetMetadataInput): Promise<MetadataEntity> {
    const { metadataId, version } = input;

    logger.debug("Getting metadata by ID", { metadataId, version });

    const metadata = await this.metadataRepository.findById(metadataId);

    if (!metadata) {
      logger.warn("Metadata not found", { metadataId });
      throw new ApiError(`Metadata with ID ${metadataId} not found`, ErrorCode.NOT_FOUND, 404);
    }

    // If specific version requested, validate it
    if (version !== undefined && metadata.version !== version) {
      logger.warn("Metadata version mismatch", {
        metadataId,
        requestedVersion: version,
        currentVersion: metadata.version,
      });
      throw new ApiError(
        `Metadata version ${version} not found. Current version is ${metadata.version}`,
        ErrorCode.NOT_FOUND,
        404
      );
    }

    logger.debug("Metadata retrieved successfully", {
      metadataId,
      name: metadata.name,
      version: metadata.version,
    });

    return metadata;
  }
}
