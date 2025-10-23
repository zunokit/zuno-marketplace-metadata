import { ErrorCode } from "@/shared/types";

/**
 * Centralized error messages for consistency
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // Authentication & Authorization
  [ErrorCode.UNAUTHORIZED]: "Authentication required. Please provide a valid API key.",
  [ErrorCode.FORBIDDEN]: "You don't have permission to access this resource.",
  [ErrorCode.INVALID_API_KEY]: "Invalid API key provided.",
  [ErrorCode.EXPIRED_API_KEY]: "API key has expired.",

  // Rate Limiting
  [ErrorCode.RATE_LIMITED]: "Too many requests. Please slow down.",
  [ErrorCode.RATE_LIMIT_EXCEEDED]: "Rate limit exceeded. Please try again later.",
  [ErrorCode.QUOTA_EXCEEDED]: "Quota exceeded for your tier.",

  // Validation
  [ErrorCode.VALIDATION_ERROR]: "Validation failed. Please check your input.",
  [ErrorCode.INVALID_INPUT]: "Invalid input provided.",
  [ErrorCode.MISSING_REQUIRED_FIELD]: "Required field is missing.",

  // Resources
  [ErrorCode.NOT_FOUND]: "The requested resource was not found.",
  [ErrorCode.ALREADY_EXISTS]: "Resource already exists.",
  [ErrorCode.CONFLICT]: "A conflict occurred. The resource may already exist.",

  // File & Media
  [ErrorCode.FILE_TOO_LARGE]: "File size exceeds maximum allowed.",
  [ErrorCode.INVALID_FILE_TYPE]: "File type is not supported.",
  [ErrorCode.UPLOAD_FAILED]: "File upload failed.",

  // External Services
  [ErrorCode.IMAGEKIT_ERROR]: "ImageKit service error.",
  [ErrorCode.PINATA_ERROR]: "Pinata service error.",
  [ErrorCode.IPFS_ERROR]: "IPFS service error.",

  // System
  [ErrorCode.INTERNAL_ERROR]: "An internal server error occurred. Please try again.",
  [ErrorCode.SERVICE_UNAVAILABLE]: "Service temporarily unavailable. Please try again later.",
  [ErrorCode.DATABASE_ERROR]: "Database error occurred.",
};

/**
 * Get user-friendly error message
 */
export function getErrorMessage(code: ErrorCode, customMessage?: string): string {
  return customMessage || ERROR_MESSAGES[code] || ERROR_MESSAGES[ErrorCode.INTERNAL_ERROR];
}
