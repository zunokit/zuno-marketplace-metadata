import type { ApiVersionEntity } from "@/core/domain/api-version/api-version.entity";
import type { ApiVersionRepository } from "@/core/domain/api-version/api-version.repository";
import { ApiError } from "@/shared/lib/api/api-handler";
import { ErrorCode } from "@/shared/types";

export interface CreateApiVersionInput {
  id: string;
  label: string;
  isCurrent?: boolean;
  releasedAt: Date;
  sunsetAt?: Date;
}

/**
 * Create API Version Use Case
 */
export class CreateApiVersionUseCase {
  constructor(private repository: ApiVersionRepository) {}

  async execute(input: CreateApiVersionInput): Promise<ApiVersionEntity> {
    // If setting as current, unset other current versions
    if (input.isCurrent) {
      const currentVersion = await this.repository.getCurrent();
      if (currentVersion) {
        await this.repository.update(currentVersion.id, { isCurrent: false });
      }
    }

    const version = await this.repository.create({
      id: input.id,
      label: input.label,
      isCurrent: input.isCurrent || false,
      deprecated: false,
      releasedAt: input.releasedAt,
      sunsetAt: input.sunsetAt,
    });

    return version;
  }
}
