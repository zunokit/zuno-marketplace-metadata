import type {
  MetadataListParams,
  MetadataListFilters,
} from "@/core/domain/metadata/metadata.entity";
import { ApiError } from "@/shared/lib/api/api-handler";
import { ErrorCode } from "@/shared/types";

// ============ Types ============
export interface AuthContext {
  user?: {
    id: string;
    role: string;
  };
  apiKey?: {
    userId: string;
  };
}

export interface ListQueryInput {
  page?: number;
  limit?: number;
  sortBy?: "name" | "createdAt" | "updatedAt" | "version";
  sortOrder?: "asc" | "desc";
  search?: string;
  mediaType?: "IMAGE" | "VIDEO" | "GIF" | "MODEL_3D";
  isPinned?: boolean;
  isLocked?: boolean;
  minVersion?: number;
  maxVersion?: number;
}

// ============ Metadata Query Service ============
export class MetadataQueryService {
  /**
   * Build list params từ query input và auth context
   */
  static buildListParams(
    input: ListQueryInput,
    context: AuthContext
  ): MetadataListParams {
    const {
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
      search,
      mediaType,
      isPinned,
      isLocked,
      minVersion,
      maxVersion,
    } = input;

    // Validate pagination
    if (page < 1) {
      throw new ApiError("Page must be greater than 0", ErrorCode.VALIDATION_ERROR, 400);
    }

    if (limit < 1 || limit > 100) {
      throw new ApiError("Limit must be between 1 and 100", ErrorCode.VALIDATION_ERROR, 400);
    }

    // Validate sorting
    const validSortFields = ["name", "createdAt", "updatedAt", "version"];
    if (!validSortFields.includes(sortBy)) {
      throw new ApiError(`Invalid sortBy field: ${sortBy}`, ErrorCode.VALIDATION_ERROR, 400);
    }

    return {
      page,
      limit,
      sortBy,
      sortOrder,
      search,
      mediaType,
      isPinned,
      isLocked,
      minVersion,
      maxVersion,
    };
  }

  /**
   * Build filters từ query params
   */
  static buildFilters(input: ListQueryInput): MetadataListFilters {
    return {
      search: input.search,
      mediaType: input.mediaType,
      isPinned: input.isPinned,
      isLocked: input.isLocked,
      minVersion: input.minVersion,
      maxVersion: input.maxVersion,
    };
  }

  /**
   * Validate metadata access permissions
   */
  static validateAccess(metadataId: string, context: AuthContext): boolean {
    // For now, allow access to all authenticated users
    // Later có thể add logic kiểm tra ownership, permissions, etc.
    return Boolean(context.user || context.apiKey);
  }

  /**
   * Check if user can modify metadata
   */
  static canModify(metadataId: string, context: AuthContext): boolean {
    // Admin có thể modify tất cả
    if (context.user?.role === "ADMIN") {
      return true;
    }

    // API key owners có thể modify metadata của họ
    return Boolean(context.apiKey);
  }

  /**
   * Validate search query
   */
  static validateSearchQuery(query?: string): string | undefined {
    if (!query) return undefined;

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      throw new ApiError("Search query must be at least 2 characters", ErrorCode.VALIDATION_ERROR, 400);
    }

    if (trimmed.length > 100) {
      throw new ApiError("Search query is too long", ErrorCode.VALIDATION_ERROR, 400);
    }

    return trimmed;
  }
}