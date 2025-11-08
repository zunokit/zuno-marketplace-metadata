import type { ApiVersionEntity } from "@/core/domain/api-version/api-version.entity";
import type { ApiVersionRepository } from "@/core/domain/api-version/api-version.repository";

/**
 * List API Versions Use Case
 */
export class ListApiVersionsUseCase {
  constructor(private repository: ApiVersionRepository) {}

  async execute(): Promise<ApiVersionEntity[]> {
    return await this.repository.list();
  }
}
