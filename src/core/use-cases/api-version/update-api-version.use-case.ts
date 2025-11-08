import type { ApiVersionEntity } from "@/core/domain/api-version/api-version.entity";
import type { ApiVersionRepository } from "@/core/domain/api-version/api-version.repository";
import { ApiError } from "@/shared/lib/api/api-handler";
import { ErrorCode } from "@/shared/types";

export interface UpdateApiVersionInput {
  id: string;
  label?: string;
  isCurrent?: boolean;
  deprecated?: boolean;
  sunsetAt?: Date | null;
}

/**
 * Update API Version Use Case
 */
export class UpdateApiVersionUseCase {
  constructor(private repository: ApiVersionRepository) {}

  async execute(input: UpdateApiVersionInput): Promise<ApiVersionEntity> {
    // If setting as current, unset other current versions
    if (input.isCurrent) {
      const currentVersion = await this.repository.getCurrent();
      if (currentVersion && currentVersion.id !== input.id) {
        await this.repository.update(currentVersion.id, { isCurrent: false });
      }
    }

    const version = await this.repository.update(input.id, {
      ...(input.label !== undefined && { label: input.label }),
      ...(input.isCurrent !== undefined && { isCurrent: input.isCurrent }),
      ...(input.deprecated !== undefined && { deprecated: input.deprecated }),
      ...(input.sunsetAt !== undefined && { sunsetAt: input.sunsetAt }),
    });

    if (!version) {
      throw new ApiError("API version not found", ErrorCode.NOT_FOUND, 404);
    }

    return version;
  }
}
