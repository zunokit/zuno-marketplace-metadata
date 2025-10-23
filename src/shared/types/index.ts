// Common API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiErrorResponse;
  meta?: {
    requestId: string;
    timestamp: string;
    version: string;
  };
}

export interface ApiErrorResponse {
  code: ErrorCode;
  message: string;
  details?: unknown;
  requestId: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Error Codes
export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  INVALID_API_KEY = "INVALID_API_KEY",
  EXPIRED_API_KEY = "EXPIRED_API_KEY",

  // Rate Limiting
  RATE_LIMITED = "RATE_LIMITED",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  QUOTA_EXCEEDED = "QUOTA_EXCEEDED",

  // Validation
  VALIDATION_ERROR = "VALIDATION_ERROR",
  INVALID_INPUT = "INVALID_INPUT",
  MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD",

  // Resources
  NOT_FOUND = "NOT_FOUND",
  ALREADY_EXISTS = "ALREADY_EXISTS",
  CONFLICT = "CONFLICT",

  // File & Media
  FILE_TOO_LARGE = "FILE_TOO_LARGE",
  INVALID_FILE_TYPE = "INVALID_FILE_TYPE",
  UPLOAD_FAILED = "UPLOAD_FAILED",

  // External Services
  IMAGEKIT_ERROR = "IMAGEKIT_ERROR",
  PINATA_ERROR = "PINATA_ERROR",
  IPFS_ERROR = "IPFS_ERROR",

  // System
  INTERNAL_ERROR = "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  DATABASE_ERROR = "DATABASE_ERROR",
}

// Media Types
export type MediaType = "IMAGE" | "VIDEO" | "GIF" | "MODEL_3D";

// NFT Metadata Attribute
export interface MetadataAttribute {
  displayType?: "number" | "date" | "boost_number" | "boost_percentage";
  displayValue?: string;
  traitType: string;
  value: string | number;
  maxValue?: number;
}

// Creator Info
export interface Creator {
  address: string;
  verified: boolean;
  share: number; // Percentage share (0-100)
}

// API Key Scopes and Permissions
export type ApiKeyScope =
  | "metadata:read"
  | "metadata:write"
  | "metadata:delete"
  | "media:read"
  | "media:write"
  | "media:delete"
  | "admin:read"
  | "admin:write";

export interface ApiKeyMetadata {
  scopes?: ApiKeyScope[];
  ipWhitelist?: string[];
  allowedOrigins?: string[];
  allowedMethods?: string[];
  notes?: string;
}

// Helper functions
export function createSuccessResponse<T>(
  data: T,
  meta?: Partial<ApiResponse<T>["meta"]>
): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      requestId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      version: "v1.0.0",
      ...meta,
    },
  };
}

export function createErrorResponse(
  code: ErrorCode,
  message: string,
  details?: unknown,
  requestId?: string
): ApiResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      requestId: requestId || crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    },
  };
}

export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): ApiResponse<PaginatedResponse<T>> {
  const totalPages = Math.ceil(total / limit);

  return createSuccessResponse({
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  });
}