import { eq, and } from "drizzle-orm";
import type { Database } from "@/infrastructure/database/client";
import { apiKey } from "@/infrastructure/database/drizzle/schema";
import type { ApiKey } from "@/infrastructure/database/drizzle/schema/api-key.schema";
import type { ApiKeyRepository } from "@/core/domain/api-key/api-key.repository";
import type {
  ApiKeyEntity,
  CreateApiKeyParams,
  UpdateApiKeyParams,
  ApiKeyListParams,
  CreatedApiKeyEntity,
} from "@/core/domain/api-key/api-key.entity";
import { logger } from "@/shared/lib/utils/logger";
import { auth } from "@/infrastructure/auth/better-auth.config";
import { ApiError } from "@/shared/lib/api/api-handler";
import { ErrorCode } from "@/shared/types";

export class ApiKeyRepositoryImpl implements ApiKeyRepository {
  constructor(private db: Database) {}

  async create(params: CreateApiKeyParams): Promise<CreatedApiKeyEntity> {
    logger.debug("Creating API key", {
      userId: params.userId,
      name: params.name,
    });

    // Use Better Auth API to create API key
    const result = await auth.api.createApiKey({
      body: {
        userId: params.userId,
        name: params.name,
        permissions: params.permissions,
        expiresIn: params.expiresIn,
        metadata: params.metadata,
      },
    });

    if (!result || !result.id) {
      throw new ApiError(
        "Failed to create API key - invalid response from auth system",
        ErrorCode.INTERNAL_ERROR,
        500
      );
    }

    logger.info("API key created successfully", {
      keyId: result.id,
      name: params.name,
      userId: params.userId,
    });

    return this.mapToCreatedEntity(result);
  }

  async findById(id: string): Promise<ApiKeyEntity | null> {
    logger.debug("Finding API key by ID", { id });

    const [result] = await this.db
      .select()
      .from(apiKey)
      .where(eq(apiKey.id, id))
      .limit(1);

    return result ? this.mapToEntity(result) : null;
  }

  async update(
    id: string,
    params: UpdateApiKeyParams
  ): Promise<ApiKeyEntity | null> {
    logger.debug("Updating API key", { id });

    // Use Better Auth API to update API key
    const result = await auth.api.updateApiKey({
      body: {
        keyId: id,
        ...params,
      },
    });

    if (!result) {
      throw new ApiError("API key not found", ErrorCode.NOT_FOUND, 404);
    }

    logger.info("API key updated successfully", { keyId: id });

    return this.mapToEntity(result as ApiKey);
  }

  async delete(id: string): Promise<boolean> {
    logger.debug("Deleting API key", { id });

    // Check if key exists
    const exists = await this.exists(id);
    if (!exists) {
      throw new ApiError("API key not found", ErrorCode.NOT_FOUND, 404);
    }

    // Use Better Auth API to delete API key
    await auth.api.deleteApiKey({
      body: {
        keyId: id,
      },
    });

    logger.info("API key deleted successfully", { keyId: id });

    return true;
  }

  async list(params: ApiKeyListParams): Promise<ApiKeyEntity[]> {
    logger.debug("Listing API keys", { userId: params.userId });

    const conditions = [eq(apiKey.userId, params.userId)];

    if (params.enabled !== undefined) {
      conditions.push(eq(apiKey.enabled, params.enabled));
    }

    const results = await this.db
      .select()
      .from(apiKey)
      .where(and(...conditions));

    logger.debug("API keys retrieved", {
      userId: params.userId,
      count: results.length,
    });

    return results.map((result) => this.mapToEntity(result));
  }

  async exists(id: string): Promise<boolean> {
    logger.debug("Checking if API key exists", { id });

    const [result] = await this.db
      .select({ id: apiKey.id })
      .from(apiKey)
      .where(eq(apiKey.id, id))
      .limit(1);

    return !!result;
  }

  async findByUserId(userId: string): Promise<ApiKeyEntity[]> {
    logger.debug("Finding API keys by user ID", { userId });

    const results = await this.db
      .select()
      .from(apiKey)
      .where(eq(apiKey.userId, userId));

    return results.map((result) => this.mapToEntity(result));
  }

  async findEnabledByUserId(userId: string): Promise<ApiKeyEntity[]> {
    logger.debug("Finding enabled API keys by user ID", { userId });

    const results = await this.db
      .select()
      .from(apiKey)
      .where(and(eq(apiKey.userId, userId), eq(apiKey.enabled, true)));

    return results.map((result) => this.mapToEntity(result));
  }

  /**
   * Map database row to domain entity
   */
  private mapToEntity(row: ApiKey): ApiKeyEntity {
    // Parse permissions if it's a string
    let permissions: Record<string, string[]> = {};
    if (typeof row.permissions === "string") {
      try {
        permissions = JSON.parse(row.permissions);
      } catch {
        permissions = {};
      }
    } else if (row.permissions) {
      permissions = row.permissions as Record<string, string[]>;
    }

    // Parse metadata if it's a string
    let metadata: ApiKeyEntity["metadata"] = undefined;
    if (typeof row.metadata === "string") {
      try {
        metadata = JSON.parse(row.metadata);
      } catch {
        metadata = undefined;
      }
    } else if (row.metadata) {
      metadata = row.metadata as ApiKeyEntity["metadata"];
    }

    return {
      id: row.id,
      name: row.name || "",
      start: row.start ?? null,
      userId: row.userId,
      enabled: row.enabled ?? true,
      permissions,
      metadata,
      expiresAt: row.expiresAt ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      rateLimitEnabled: row.rateLimitEnabled ?? false,
      rateLimitMax: row.rateLimitMax ?? undefined,
      rateLimitTimeWindow: row.rateLimitTimeWindow ?? undefined,
      remaining: row.remaining ?? undefined,
    };
  }

  /**
   * Map Better Auth creation response to domain entity with key
   */
  private mapToCreatedEntity(result: unknown): CreatedApiKeyEntity {
    // Type assertion for Better Auth response
    const data = result as Record<string, unknown>;

    // Parse permissions
    let permissions: Record<string, string[]> = {};
    if (typeof data.permissions === "string") {
      try {
        permissions = JSON.parse(data.permissions);
      } catch {
        permissions = {};
      }
    } else if (data.permissions) {
      permissions = data.permissions as Record<string, string[]>;
    }

    // Parse metadata
    let metadata: ApiKeyEntity["metadata"] = undefined;
    if (typeof data.metadata === "string") {
      try {
        metadata = JSON.parse(data.metadata);
      } catch {
        metadata = undefined;
      }
    } else if (data.metadata) {
      metadata = data.metadata as ApiKeyEntity["metadata"];
    }

    return {
      id: data.id as string,
      key: data.key as string, // Only available on creation!
      name: (data.name as string) || "",
      start: (data.start as string | null) ?? null,
      userId: data.userId as string,
      enabled: (data.enabled as boolean) ?? true,
      permissions,
      metadata,
      expiresAt: data.expiresAt
        ? new Date(data.expiresAt as string | Date)
        : undefined,
      createdAt: new Date(data.createdAt as string | Date),
      updatedAt: new Date(data.updatedAt as string | Date),
      rateLimitEnabled: (data.rateLimitEnabled as boolean) ?? false,
      rateLimitMax: (data.rateLimitMax as number) ?? undefined,
      rateLimitTimeWindow: (data.rateLimitTimeWindow as number) ?? undefined,
      remaining: (data.remaining as number) ?? undefined,
    };
  }
}
