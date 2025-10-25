/**
 * Try-Catch Wrapper Utility
 *
 * Provides a clean way to handle errors in services and use cases
 * with consistent error formatting and logging
 */

import { ApiError } from "@/shared/lib/api/api-handler";
import { ErrorCode } from "@/shared/types";
import { z } from "zod";

/**
 * Error type discrimination for better type safety
 */
type ErrorType = "ApiError" | "ZodError" | "GenericError" | "UnknownError";

/**
 * Type guard to determine error type
 */
function getErrorType(error: unknown): ErrorType {
  if (error instanceof ApiError) return "ApiError";
  if (error instanceof z.ZodError) return "ZodError";
  if (error instanceof Error) return "GenericError";
  return "UnknownError";
}

/**
 * Create ApiError from any error type with proper discrimination
 */
function createApiError(error: unknown, config: TryCatchConfig): ApiError {
  const errorType = getErrorType(error);

  switch (errorType) {
    case "ApiError":
      return error as ApiError;

    case "ZodError":
      return new ApiError(
        "Validation failed. Please check your input.",
        ErrorCode.VALIDATION_ERROR,
        400,
        { issues: (error as z.ZodError).issues }
      );

    case "GenericError":
      return new ApiError(
        config.errorMessage || "Operation failed",
        config.errorCode || ErrorCode.INTERNAL_ERROR,
        config.statusCode || 500,
        {
          originalError: (error as Error).message,
          stack: (error as Error).stack,
          context: config.context,
        }
      );

    case "UnknownError":
      return new ApiError(
        config.errorMessage || "Operation failed",
        config.errorCode || ErrorCode.INTERNAL_ERROR,
        config.statusCode || 500,
        {
          originalError: String(error),
          context: config.context,
        }
      );
  }
}

/**
 * Configuration for try-catch wrapper
 */
export interface TryCatchConfig {
  /** Custom error message to override the default */
  errorMessage?: string;
  /** Error code to use for the wrapped error */
  errorCode?: ErrorCode;
  /** HTTP status code for the error */
  statusCode?: number;
  /** Additional context for logging */
  context?: Record<string, unknown>;
  /** Whether to log the error (default: true) */
  shouldLog?: boolean;
  /** Custom error handler function */
  onError?: (error: unknown, context?: Record<string, unknown>) => void;
}

/**
 * Result type for try-catch wrapper
 */
export type TryCatchResult<T> =
  | {
      success: true;
      data: T;
      error: null;
    }
  | {
      success: false;
      data: null;
      error: ApiError;
    };

/**
 * Try-catch wrapper that provides consistent error handling
 *
 * @param operation - The async operation to execute
 * @param config - Configuration for error handling
 * @returns Promise with success/error result
 *
 * @example
 * ```typescript
 * // Basic usage
 * const result = await tryCatch(
 *   () => someAsyncOperation(),
 *   { errorMessage: "Failed to fetch data" }
 * );
 *
 * if (result.success) {
 *   console.log(result.data);
 * } else {
 *   console.error(result.error.message);
 * }
 *
 * // With custom error handling
 * const result = await tryCatch(
 *   () => databaseOperation(),
 *   {
 *     errorMessage: "Database operation failed",
 *     context: { table: "users", operation: "insert" },
 *     onError: (error, context) => {
 *       // Custom error handling
 *       console.error("Custom error:", error, context);
 *     }
 *   }
 * );
 * ```
 */
export async function tryCatch<T>(
  operation: () => Promise<T>,
  config: TryCatchConfig = {}
): Promise<TryCatchResult<T>> {
  const {
    errorMessage = "Operation failed",
    errorCode = ErrorCode.INTERNAL_ERROR,
    statusCode = 500,
    context = {},
    shouldLog = true,
    onError,
  } = config;

  try {
    const data = await operation();
    return {
      success: true,
      data,
      error: null,
    };
  } catch (error: unknown) {
    // Log error if enabled
    if (shouldLog) {
      console.error(errorMessage, {
        error,
        context,
        originalError: error instanceof Error ? error.message : String(error),
      });
    }

    // Call custom error handler if provided
    if (onError) {
      onError(error, context);
    }

    // Create ApiError using type-safe error handling
    const apiError = createApiError(error, {
      errorMessage,
      errorCode,
      statusCode,
      context,
    });

    return {
      success: false,
      data: null,
      error: apiError,
    };
  }
}

/**
 * Try-catch wrapper for synchronous operations
 *
 * @param operation - The synchronous operation to execute
 * @param config - Configuration for error handling
 * @returns Result with success/error
 */
export function tryCatchSync<T>(
  operation: () => T,
  config: TryCatchConfig = {}
): TryCatchResult<T> {
  const {
    errorMessage = "Operation failed",
    errorCode = ErrorCode.INTERNAL_ERROR,
    statusCode = 500,
    context = {},
    shouldLog = true,
    onError,
  } = config;

  try {
    const data = operation();
    return {
      success: true,
      data,
      error: null,
    };
  } catch (error: unknown) {
    // Log error if enabled
    if (shouldLog) {
      console.error(errorMessage, {
        error,
        context,
        originalError: error instanceof Error ? error.message : String(error),
      });
    }

    // Call custom error handler if provided
    if (onError) {
      onError(error, context);
    }

    // Create ApiError using type-safe error handling
    const apiError = createApiError(error, {
      errorMessage,
      errorCode,
      statusCode,
      context,
    });

    return {
      success: false,
      data: null,
      error: apiError,
    };
  }
}

/**
 * Higher-order function that wraps a function with try-catch
 * Useful for creating error-safe versions of existing functions
 *
 * @param fn - Function to wrap
 * @param config - Error handling configuration
 * @returns Wrapped function that returns TryCatchResult
 *
 * @example
 * ```typescript
 * const safeApiKeyService = withTryCatch(
 *   ApiKeyService.create,
 *   { errorMessage: "Failed to create API key" }
 * );
 *
 * const result = await safeApiKeyService(params);
 * if (result.success) {
 *   // Handle success
 * } else {
 *   // Handle error
 * }
 * ```
 */
export function withTryCatch<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  config: TryCatchConfig = {}
) {
  return async (...args: TArgs): Promise<TryCatchResult<TReturn>> => {
    return tryCatch(() => fn(...args), config);
  };
}

/**
 * Higher-order function for synchronous functions
 */
export function withTryCatchSync<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  config: TryCatchConfig = {}
) {
  return (...args: TArgs): TryCatchResult<TReturn> => {
    return tryCatchSync(() => fn(...args), config);
  };
}

/**
 * Utility to extract data from TryCatchResult or throw error
 * Useful when you want to use the traditional try-catch pattern
 *
 * @param result - TryCatchResult to unwrap
 * @throws ApiError if result is unsuccessful
 * @returns The data if successful
 *
 * @example
 * ```typescript
 * const result = await tryCatch(() => someOperation());
 * const data = unwrapOrThrow(result); // Throws if error
 * ```
 */
export function unwrapOrThrow<T>(result: TryCatchResult<T>): T {
  if (result.success) {
    return result.data;
  }
  throw result.error;
}

/**
 * Utility to get error from TryCatchResult or return null
 *
 * @param result - TryCatchResult to check
 * @returns ApiError if unsuccessful, null if successful
 */
export function getError<T>(result: TryCatchResult<T>): ApiError | null {
  return result.success ? null : result.error;
}

/**
 * Utility to check if result is successful
 *
 * @param result - TryCatchResult to check
 * @returns true if successful, false if error
 */
export function isSuccess<T>(
  result: TryCatchResult<T>
): result is { success: true; data: T; error: null } {
  return result.success;
}

/**
 * Utility to check if result is an error
 *
 * @param result - TryCatchResult to check
 * @returns true if error, false if successful
 */
export function isError<T>(
  result: TryCatchResult<T>
): result is { success: false; data: null; error: ApiError } {
  return !result.success;
}
