import type {
  MediaListParams,
  MediaListFilters,
} from "@/core/domain/media/media.entity";
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
  sortBy?: "fileName" | "createdAt" | "fileSize";
  sortOrder?: "asc" | "desc";
  search?: string;
  mediaType?: "IMAGE" | "VIDEO" | "GIF" | "MODEL_3D";
  isPinned?: boolean;
}

// ============ Media Query Service ============
export class MediaQueryService {
  /**
   * Build list params từ query input và auth context
   */
  static buildListParams(
    input: ListQueryInput
  ): MediaListParams {
    const {
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
      search,
      mediaType,
      isPinned,
    } = input;

    // Validate pagination
    if (page < 1) {
      throw new ApiError("Page must be greater than 0", ErrorCode.VALIDATION_ERROR, 400);
    }

    if (limit < 1 || limit > 100) {
      throw new ApiError("Limit must be between 1 and 100", ErrorCode.VALIDATION_ERROR, 400);
    }

    // Validate sorting
    const validSortFields = ["fileName", "createdAt", "fileSize"];
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
    };
  }

  /**
   * Build filters từ query params
   */
  static buildFilters(input: ListQueryInput): MediaListFilters {
    return {
      search: input.search,
      mediaType: input.mediaType,
      isPinned: input.isPinned,
    };
  }

  /**
   * Validate media access permissions
   */
  static validateAccess(mediaId: string, context: AuthContext): boolean {
    return Boolean(context.user || context.apiKey);
  }

  /**
   * Check if user can modify media
   */
  static canModify(mediaId: string, context: AuthContext): boolean {
    if (context.user?.role === "ADMIN") {
      return true;
    }

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