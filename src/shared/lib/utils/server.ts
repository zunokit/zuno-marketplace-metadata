/**
 * Server-only utilities
 * These utilities should ONLY be imported in Server Components or API routes
 * DO NOT import this file in Client Components
 */

import { sleep } from "./client";

// Export robust try-catch wrapper utilities (server-only due to ApiError dependency)
export {
  tryCatch,
  tryCatchSync,
  withTryCatch,
  withTryCatchSync,
  unwrapOrThrow,
  getError,
  isSuccess,
  isError,
  type TryCatchConfig,
  type TryCatchResult,
} from "./try-catch-wrapper";

// Retry with exponential backoff (requires tryCatch, so server-only)
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    baseDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
  } = options;

  // Import tryCatch locally to avoid circular dependency
  const { tryCatch } = await import("./try-catch-wrapper");

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await tryCatch(() => fn(), {
      shouldLog: false, // Don't log retries
    });

    if (result.success) {
      return result.data;
    }

    lastError = result.error;

    if (attempt === maxAttempts) {
      throw lastError;
    }

    const delay = Math.min(
      baseDelay * Math.pow(backoffFactor, attempt - 1),
      maxDelay
    );

    await sleep(delay);
  }

  throw lastError!;
}
