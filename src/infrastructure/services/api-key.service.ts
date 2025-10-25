/**
 * API Key Service
 *
 * Service layer for API key management
 * Separates database operations from route handlers
 */

import { db } from "@/infrastructure/database/client";
import { apiKey } from "@/infrastructure/database/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/infrastructure/auth/better-auth.config";
import { ApiError } from "@/shared/lib/api/api-handler";
import { ErrorCode } from "@/shared/types";
import { tryCatch, type TryCatchResult } from "@/shared/lib/utils/server";

// ============ Types ============

export interface ApiKeyListFilters {
  userId?: string;
  enabled?: boolean;
}

export interface ApiKeyListParams {
  limit: number;
  offset: number;
  filters?: ApiKeyListFilters;
}

/**
 * API Key DTO for list responses
 */
export type ApiKeyDto = {
  id: string;
  name: string | null;
  userId: string;
  enabled: boolean | null;
  permissions: string | null;
  metadata: unknown;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export interface ApiKeyListResult {
  keys: ApiKeyDto[];
  total: number;
  limit: number;
  offset: number;
}

// ============ Query Builder Helper ============

class QueryBuilder<T> {
  constructor(private query: T) {}

  applyIf(condition: boolean, filterFn: (query: T) => T): QueryBuilder<T> {
    if (condition) {
      this.query = filterFn(this.query);
    }
    return this;
  }

  build(): T {
    return this.query;
  }
}

function buildQuery<T>(initialQuery: T): QueryBuilder<T> {
  return new QueryBuilder(initialQuery);
}

// ============ API Key Service ============

export class ApiKeyService {
  /**
   * List API keys with filtering
   */
  static async list(
    params: ApiKeyListParams
  ): Promise<TryCatchResult<ApiKeyListResult>> {
    return tryCatch(
      async () => {
        // Base query
        let query = db
          .select({
            id: apiKey.id,
            name: apiKey.name,
            userId: apiKey.userId,
            enabled: apiKey.enabled,
            permissions: apiKey.permissions,
            metadata: apiKey.metadata,
            expiresAt: apiKey.expiresAt,
            createdAt: apiKey.createdAt,
            updatedAt: apiKey.updatedAt,
          })
          .from(apiKey)
          .limit(params.limit)
          .offset(params.offset);

        // Apply filters using QueryBuilder pattern
        const conditions = [];

        if (params.filters?.userId) {
          conditions.push(eq(apiKey.userId, params.filters.userId));
        }

        if (params.filters?.enabled !== undefined) {
          conditions.push(eq(apiKey.enabled, params.filters.enabled));
        }

        if (conditions.length > 0) {
          query = query.where(and(...conditions)) as typeof query;
        }

        const keys = await query;

        return {
          keys,
          total: keys.length,
          limit: params.limit,
          offset: params.offset,
        };
      },
      {
        errorMessage: "Failed to list API keys",
      }
    );
  }

  /**
   * Get single API key by ID
   */
  static async getById(
    id: string
  ): Promise<TryCatchResult<typeof apiKey.$inferSelect | null>> {
    return tryCatch(
      async () => {
        const [result] = await db
          .select()
          .from(apiKey)
          .where(eq(apiKey.id, id))
          .limit(1);

        return result || null;
      },
      {
        errorMessage: "Failed to get API key by ID",
      }
    );
  }

  /**
   * Check if user has access to query specific userId's keys
   */
  static validateUserAccess(
    requestedUserId: string,
    context: {
      user?: { id: string; role: string };
      apiKey?: { userId: string };
    }
  ): void {
    const isAdmin = context.user?.role === "admin";
    const isOwnUser =
      context.user?.id === requestedUserId ||
      context.apiKey?.userId === requestedUserId;

    if (!isAdmin && !isOwnUser) {
      throw new ApiError(
        "You can only list your own API keys unless you're an admin",
        ErrorCode.FORBIDDEN,
        403
      );
    }
  }

  /**
   * Build list params from query input
   */
  static buildListParams(
    input: {
      limit?: number;
      offset?: number;
      page?: number;
      userId?: string;
      enabled?: boolean;
    },
    context: {
      user?: { id: string; role: string };
      apiKey?: { userId: string };
    }
  ): ApiKeyListParams {
    const filters: ApiKeyListFilters = {};

    // Validate and add userId filter
    if (input.userId) {
      this.validateUserAccess(input.userId, context);
      filters.userId = input.userId;
    }

    // Add enabled filter
    if (input.enabled !== undefined) {
      filters.enabled = input.enabled;
    }

    // Calculate offset from page if provided
    const limit = input.limit ?? 20;
    const page = input.page ?? 1;
    const offset = input.offset ?? (page - 1) * limit;

    return {
      limit,
      offset,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
    };
  }

  /**
   * Create a new API key
   */
  static async create(
    input: {
      name: string;
      userId: string;
      expiresIn?: number;
      permissions?: Record<string, string[]>;
      metadata?: Record<string, unknown>;
    },
    betterAuthApi: any
  ): Promise<
    TryCatchResult<{
      id: string;
      key: string;
      name: string;
      userId: string;
      expiresAt: Date | null;
      permissions: Record<string, string[]> | null;
      metadata: Record<string, unknown>;
      createdAt: Date;
      updatedAt: Date;
    }>
  > {
    return tryCatch(
      async () => {
        console.log("[ApiKeyService.create] Input:", JSON.stringify(input, null, 2));

        const result = await betterAuthApi.createApiKey({
          body: {
            userId: input.userId,
            name: input.name,
            expiresIn: input.expiresIn,
            permissions: input.permissions,
            metadata: input.metadata,
          },
        });

        console.log("[ApiKeyService.create] Better Auth result:", JSON.stringify(result, null, 2));

        if (!result || !result.id) {
          throw new ApiError(
            "Failed to create API key - invalid response from auth system",
            ErrorCode.INTERNAL_ERROR,
            500
          );
        }

        return {
          id: result.id,
          key: result.key,
          name: result.name,
          userId: result.userId,
          expiresAt: result.expiresAt,
          permissions: result.permissions,
          metadata: input.metadata || {},
          createdAt: result.createdAt,
          updatedAt: result.updatedAt || result.createdAt,
        };
      },
      {
        errorMessage: "Failed to create API key",
      }
    );
  }

  /**
   * Update an API key
   */
  static async update(
    id: string,
    updates: {
      name?: string;
      enabled?: boolean;
      permissions?: Record<string, string[]>;
      metadata?: Record<string, unknown>;
    },
    betterAuthApi: any,
    headers?: Headers
  ): Promise<TryCatchResult<any>> {
    return tryCatch(
      async () => {
        const result = await betterAuthApi.updateApiKey({
          body: {
            keyId: id,
            ...updates,
          },
          headers,
        });

        if (!result) {
          throw new ApiError(
            "Failed to update API key",
            ErrorCode.INTERNAL_ERROR,
            500
          );
        }

        return result;
      },
      {
        errorMessage: "Failed to update API key",
      }
    );
  }

  /**
   * Delete an API key
   */
  static async delete(
    id: string,
    betterAuthApi: any,
    headers?: Headers
  ): Promise<TryCatchResult<{ success: boolean }>> {
    return tryCatch(
      async () => {
        // Get key before deletion
        const [existing] = await db
          .select()
          .from(apiKey)
          .where(eq(apiKey.id, id))
          .limit(1);

        if (!existing) {
          throw new ApiError("API key not found", ErrorCode.NOT_FOUND, 404);
        }

        const result = await betterAuthApi.deleteApiKey({
          body: {
            keyId: id,
          },
          headers,
        });

        if (!result || !result.success) {
          throw new ApiError(
            "Failed to delete API key",
            ErrorCode.INTERNAL_ERROR,
            500
          );
        }

        return { success: true };
      },
      {
        errorMessage: "Failed to delete API key",
      }
    );
  }
}
