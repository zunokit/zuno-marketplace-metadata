/* eslint-disable @typescript-eslint/no-empty-object-type */
import type { PaginatedResponse } from "@/shared/types";

// ============= API KEY RESPONSE DTO =============
export interface ApiKeyResponseDto {
  id: string;
  name: string;
  start: string | null;
  permissions: Record<string, string[]>;
  enabled: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  rateLimitEnabled: boolean;
  rateLimitMax: number | null;
  rateLimitTimeWindow: number | null;
  remaining: number | null;
  metadata?: {
    type?: "personal" | "organization" | "public";
    scopes?: string[];
    ipWhitelist?: string[];
    allowedOrigins?: string[];
    notes?: string;
  };
}

// ============= API KEY LIST ITEM DTO =============
export interface ApiKeyListItemDto {
  id: string;
  name: string;
  start: string | null;
  permissions: Record<string, string[]>;
  enabled: boolean;
  expiresAt: string | null;
  createdAt: string;
  rateLimitMax: number | null;
  remaining: number | null;
}

// ============= PAGINATED API KEY RESPONSE DTO =============
export interface PaginatedApiKeyResponseDto extends PaginatedResponse<ApiKeyListItemDto> {}

// ============= CREATED API KEY RESPONSE DTO =============
export interface CreatedApiKeyResponseDto {
  id: string;
  key: string; // The actual API key (only shown once!)
  name: string;
  permissions: Record<string, string[]>;
  expiresAt: string | null;
  createdAt: string;
}

// ============= DELETED API KEY RESPONSE DTO =============
export interface DeletedApiKeyResponseDto {
  message: string;
  deletedApiKey: {
    id: string;
    name: string;
  };
}

// Better Auth API Key Type (from Better Auth response)
export interface BetterAuthApiKey {
  id: string;
  name: string | null;
  start?: string | null;
  key?: string; // Only present on creation
  permissions?: string | Record<string, string[]> | null;
  metadata?: Record<string, unknown> | null;
  enabled?: boolean | null;
  expiresAt?: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  rateLimitEnabled?: boolean | null;
  rateLimitMax?: number | null;
  rateLimitTimeWindow?: number | null;
  remaining?: number | null;
}

// ============= API KEY DTO MAPPER =============
export class ApiKeyDtoMapper {
  /**
   * Parse permissions from Better Auth response
   */
  private static parsePermissions(
    permissions: string | Record<string, string[]> | null | undefined
  ): Record<string, string[]> {
    if (!permissions) return {};
    if (typeof permissions === "string") {
      return JSON.parse(permissions) as Record<string, string[]>;
    }
    return permissions;
  }

  /**
   * Parse metadata from Better Auth response
   */
  private static parseMetadata(
    metadata: Record<string, unknown> | null | undefined
  ): ApiKeyResponseDto["metadata"] | undefined {
    if (!metadata) return undefined;
    return metadata as ApiKeyResponseDto["metadata"];
  }

  /**
   * Map Better Auth API key to full response DTO
   */
  static toResponseDto(apiKey: BetterAuthApiKey): ApiKeyResponseDto {
    const permissions = this.parsePermissions(apiKey.permissions);
    const metadata = this.parseMetadata(apiKey.metadata);

    return {
      id: apiKey.id,
      name: apiKey.name || "Unnamed Key",
      start: apiKey.start || null,
      permissions,
      enabled: apiKey.enabled ?? true,
      expiresAt: apiKey.expiresAt
        ? new Date(apiKey.expiresAt).toISOString()
        : null,
      createdAt: new Date(apiKey.createdAt).toISOString(),
      updatedAt: new Date(apiKey.updatedAt).toISOString(),
      rateLimitEnabled: apiKey.rateLimitEnabled ?? false,
      rateLimitMax: apiKey.rateLimitMax ?? null,
      rateLimitTimeWindow: apiKey.rateLimitTimeWindow ?? null,
      remaining: apiKey.remaining ?? null,
      metadata,
    };
  }

  /**
   * Map Better Auth API key to list item DTO (lighter version)
   */
  static toListItemDto(apiKey: BetterAuthApiKey): ApiKeyListItemDto {
    const permissions = this.parsePermissions(apiKey.permissions);

    return {
      id: apiKey.id,
      name: apiKey.name || "Unnamed Key",
      start: apiKey.start || null,
      permissions,
      enabled: apiKey.enabled ?? true,
      expiresAt: apiKey.expiresAt
        ? new Date(apiKey.expiresAt).toISOString()
        : null,
      createdAt: new Date(apiKey.createdAt).toISOString(),
      rateLimitMax: apiKey.rateLimitMax ?? null,
      remaining: apiKey.remaining ?? null,
    };
  }

  /**
   * Map Better Auth API keys array to paginated response DTO
   */
  static toPaginatedResponseDto(
    apiKeys: BetterAuthApiKey[],
    page: number = 1,
    limit: number = 20
  ): PaginatedApiKeyResponseDto {
    const total = apiKeys.length;
    const totalPages = Math.ceil(total / limit);

    return {
      data: apiKeys.map((apiKey) => this.toListItemDto(apiKey)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Map created Better Auth API key to response DTO
   */
  static toCreatedResponseDto(apiKey: BetterAuthApiKey): CreatedApiKeyResponseDto {
    const permissions = this.parsePermissions(apiKey.permissions);

    return {
      id: apiKey.id,
      key: apiKey.key || "", // Should always be present on creation
      name: apiKey.name || "Unnamed Key",
      permissions,
      expiresAt: apiKey.expiresAt
        ? new Date(apiKey.expiresAt).toISOString()
        : null,
      createdAt: new Date(apiKey.createdAt).toISOString(),
    };
  }

  /**
   * Map deleted API key to response DTO
   */
  static toDeletedResponseDto(apiKey: BetterAuthApiKey): DeletedApiKeyResponseDto {
    return {
      message: "API key deleted successfully",
      deletedApiKey: {
        id: apiKey.id,
        name: apiKey.name || "Unnamed Key",
      },
    };
  }
}
