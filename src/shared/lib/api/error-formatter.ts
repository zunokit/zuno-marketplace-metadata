import { ZodError } from "zod";
import { ErrorCode } from "@/shared/types";
import { getErrorMessage } from "./error-messages";

/**
 * Format Zod validation errors into user-friendly format
 */
export function formatZodError(error: ZodError): {
  code: ErrorCode;
  message: string;
  details: any;
} {
  const issues = error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
    code: issue.code,
  }));

  return {
    code: ErrorCode.VALIDATION_ERROR,
    message: getErrorMessage(ErrorCode.VALIDATION_ERROR),
    details: {
      issues,
      count: issues.length,
    },
  };
}

/**
 * Format database errors
 */
export function formatDatabaseError(error: any): {
  code: ErrorCode;
  message: string;
  details?: any;
} {
  // Unique constraint violation
  if (error.code === "23505") {
    return {
      code: ErrorCode.CONFLICT,
      message: "A record with this value already exists.",
      details: {
        constraint: error.constraint,
      },
    };
  }

  // Foreign key violation
  if (error.code === "23503") {
    return {
      code: ErrorCode.VALIDATION_ERROR,
      message: "Referenced resource does not exist.",
      details: {
        constraint: error.constraint,
      },
    };
  }

  // Not null violation
  if (error.code === "23502") {
    return {
      code: ErrorCode.VALIDATION_ERROR,
      message: "Required field is missing.",
      details: {
        column: error.column,
      },
    };
  }

  return {
    code: ErrorCode.INTERNAL_ERROR,
    message: getErrorMessage(ErrorCode.INTERNAL_ERROR),
  };
}

/**
 * Format generic errors
 */
export function formatError(error: unknown): {
  code: ErrorCode;
  message: string;
  details?: any;
} {
  if (error instanceof ZodError) {
    return formatZodError(error);
  }

  if (error instanceof Error) {
    // Check if it's a database error
    if ((error as any).code) {
      return formatDatabaseError(error);
    }

    return {
      code: ErrorCode.INTERNAL_ERROR,
      message: error.message || getErrorMessage(ErrorCode.INTERNAL_ERROR),
    };
  }

  return {
    code: ErrorCode.INTERNAL_ERROR,
    message: getErrorMessage(ErrorCode.INTERNAL_ERROR),
  };
}
