import type { ApiVersionRepository } from "@/core/domain/api-version/api-version.repository";
import { ApiError } from "@/shared/lib/api/api-handler";
import { ErrorCode } from "@/shared/types";

/**
 * Delete API Version Use Case
 */
export class DeleteApiVersionUseCase {
  constructor(private repository: ApiVersionRepository) {}

  async execute(id: string): Promise<void> {
    // Check if this is the current version
    const version = await this.repository.findById(id);

    if (!version) {
      throw new ApiError("API version not found", ErrorCode.NOT_FOUND, 404);
    }

    if (version.isCurrent) {
      throw new ApiError(
        "Cannot delete the current API version",
        ErrorCode.VALIDATION_ERROR,
        400
      );
    }

    await this.repository.delete(id);
  }
}
