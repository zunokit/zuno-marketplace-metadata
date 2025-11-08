import { eq, desc } from "drizzle-orm";
import type { Database } from "@/infrastructure/database/client";
import { apiVersions } from "@/infrastructure/database/drizzle/schema";
import type { ApiVersion } from "@/infrastructure/database/drizzle/schema/api-versions.schema";
import type { ApiVersionRepository } from "@/core/domain/api-version/api-version.repository";
import type {
  ApiVersionEntity,
  CreateApiVersionParams,
  UpdateApiVersionParams,
} from "@/core/domain/api-version/api-version.entity";
import { logger } from "@/shared/lib/utils/logger";

export class ApiVersionRepositoryImpl implements ApiVersionRepository {
  constructor(private db: Database) {}

  async create(params: CreateApiVersionParams): Promise<ApiVersionEntity> {
    logger.debug("Creating API version", { id: params.id });

    const [result] = await this.db
      .insert(apiVersions)
      .values({
        id: params.id,
        label: params.label,
        isCurrent: params.isCurrent ?? false,
        deprecated: params.deprecated ?? false,
        releasedAt: params.releasedAt,
        sunsetAt: params.sunsetAt,
      })
      .returning();

    return this.mapToEntity(result);
  }

  async findById(id: string): Promise<ApiVersionEntity | null> {
    logger.debug("Finding API version by ID", { id });

    const [result] = await this.db
      .select()
      .from(apiVersions)
      .where(eq(apiVersions.id, id))
      .limit(1);

    return result ? this.mapToEntity(result) : null;
  }

  async update(
    id: string,
    params: UpdateApiVersionParams
  ): Promise<ApiVersionEntity | null> {
    logger.debug("Updating API version", { id });

    const [result] = await this.db
      .update(apiVersions)
      .set({
        ...params,
      })
      .where(eq(apiVersions.id, id))
      .returning();

    return result ? this.mapToEntity(result) : null;
  }

  async delete(id: string): Promise<boolean> {
    logger.debug("Deleting API version", { id });

    const result = await this.db
      .delete(apiVersions)
      .where(eq(apiVersions.id, id))
      .returning();

    return result.length > 0;
  }

  async list(): Promise<ApiVersionEntity[]> {
    logger.debug("Listing all API versions");

    const results = await this.db
      .select()
      .from(apiVersions)
      .orderBy(desc(apiVersions.releasedAt));

    return results.map((result) => this.mapToEntity(result));
  }

  async exists(id: string): Promise<boolean> {
    logger.debug("Checking if API version exists", { id });

    const [result] = await this.db
      .select({ id: apiVersions.id })
      .from(apiVersions)
      .where(eq(apiVersions.id, id))
      .limit(1);

    return !!result;
  }

  async getCurrent(): Promise<ApiVersionEntity | null> {
    logger.debug("Getting current API version");

    const [result] = await this.db
      .select()
      .from(apiVersions)
      .where(eq(apiVersions.isCurrent, true))
      .limit(1);

    return result ? this.mapToEntity(result) : null;
  }

  async getByLabel(label: string): Promise<ApiVersionEntity | null> {
    logger.debug("Finding API version by label", { label });

    const [result] = await this.db
      .select()
      .from(apiVersions)
      .where(eq(apiVersions.label, label))
      .limit(1);

    return result ? this.mapToEntity(result) : null;
  }

  /**
   * Map database row to domain entity
   */
  private mapToEntity(row: ApiVersion): ApiVersionEntity {
    return {
      id: row.id,
      label: row.label,
      isCurrent: row.isCurrent,
      deprecated: row.deprecated,
      releasedAt: row.releasedAt,
      sunsetAt: row.sunsetAt ?? undefined,
    };
  }
}
