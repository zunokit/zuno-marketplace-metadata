import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCode,
} from "@/shared/types";
import { logger } from "@/shared/lib/utils/logger";
import { auditLogger } from "@/infrastructure/monitoring/audit-logger";
import { getIpAddress, getUserAgent } from "./request-context";
import { tryCatch } from "@/shared/lib/utils/server";
import {
  validateApiVersion,
  isVersionDeprecated,
  getCurrentApiVersion,
} from "@/shared/lib/utils/api-version";
import { getCorsOrigins } from "@/shared/config/env";

/**
 * Maximum allowed request body size (10MB)
 * Prevents DoS attacks via large payloads
 */
const MAX_REQUEST_BODY_SIZE = 10 * 1024 * 1024; // 10MB in bytes

export interface ApiContext {
  request: NextRequest;
  params?: Record<string, string>;
  requestId: string;
  user?: {
    id: string;
    email: string;
    role: string;
  };
  apiKey?: {
    id: string;
    userId: string;
    scopes?: string[];
  };
  rateLimit?: {
    limit: number;
    remaining: number;
    reset: number;
  };
}

export type ApiHandler<TInput = unknown, TOutput = unknown> = (
  input: TInput,
  context: ApiContext
) => Promise<TOutput>;

export interface ApiRouteConfig<
  TBody extends z.ZodSchema = z.ZodSchema,
  TQuery extends z.ZodSchema = z.ZodSchema,
  TParams extends z.ZodSchema = z.ZodSchema
> {
  auth?: {
    required?: boolean;
    allowApiKey?: boolean;
    allowSession?: boolean;
    requiredScopes?: string[];
    adminOnly?: boolean; // Require admin role
  };
  validation?: {
    body?: TBody;
    query?: TQuery;
    params?: TParams;
  };
  rateLimit?: {
    max: number;
    window: number;
  };
  versioning?: {
    required?: boolean; // Require API version validation
    allowDeprecated?: boolean; // Allow deprecated versions
  };
}

// Type helper to infer validated input type from config
export type InferApiInput<TConfig extends ApiRouteConfig> = {
  body: TConfig["validation"] extends { body: infer B }
    ? B extends z.ZodSchema
      ? z.infer<B>
      : never
    : undefined;
  query: TConfig["validation"] extends { query: infer Q }
    ? Q extends z.ZodSchema
      ? z.infer<Q>
      : never
    : undefined;
  params: TConfig["validation"] extends { params: infer P }
    ? P extends z.ZodSchema
      ? z.infer<P>
      : never
    : undefined;
};

/**
 * Set CORS headers on response
 *
 * Validates origin against allowed origins from environment config
 * and sets appropriate CORS headers for cross-origin requests.
 *
 * @param response - NextResponse to add headers to
 * @param request - Original NextRequest to get origin from
 * @returns Modified response with CORS headers
 */
function setCorsHeaders(
  response: NextResponse,
  request: NextRequest
): NextResponse {
  const origin = request.headers.get("origin");
  const allowedOrigins = getCorsOrigins();

  // Check if origin is allowed
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  } else if (allowedOrigins.includes("*")) {
    // Allow all origins if wildcard is configured
    response.headers.set("Access-Control-Allow-Origin", "*");
  }

  // Set other CORS headers
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-api-key, x-api-version, accept-version"
  );
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Max-Age", "86400"); // 24 hours

  return response;
}

export class ApiWrapper {
  static create<TInput = unknown, TOutput = unknown>(
    handler: ApiHandler<TInput, TOutput>,
    config: ApiRouteConfig = {}
  ) {
    return async (
      request: NextRequest,
      context?: { params?: Promise<Record<string, string>> }
    ) => {
      const startTime = Date.now();
      let statusCode = 200;

      // Handle CORS preflight requests
      if (request.method === "OPTIONS") {
        const response = new NextResponse(null, { status: 204 });
        setCorsHeaders(response, request);
        return response;
      }

      const handlerResult = await tryCatch(
        async () => {
          // 1. Extract request metadata
          const requestId = this.extractRequestId(request);

          // 2. Parse and validate request data
          const params = context?.params ? await context.params : {};
          const parsedData = await this.parseRequest(
            request,
            config.validation,
            params
          );

          // 3. Create API context
          const apiContext: ApiContext = {
            request,
            params,
            requestId,
          };

          // 4. Handle API version validation if required
          if (config.versioning?.required !== false) {
            await this.handleVersioning(apiContext, config.versioning);
          }

          // 5. Handle authentication if required
          if (config.auth?.required !== false) {
            await this.handleAuth(apiContext, config.auth);
          }

          // 6. Execute the handler
          // Type assertion is safe here because parseRequest validates the data against TInput schema
          const result = await handler(parsedData as TInput, apiContext);

          // 7. Return success response
          const response = NextResponse.json(createSuccessResponse(result), {
            status: 200,
          });

          // Add request tracking headers
          response.headers.set("X-Request-ID", requestId);

          // Add API version headers
          const clientVersion =
            request.headers.get("x-api-version") ||
            request.headers.get("accept-version") ||
            "v1";
          response.headers.set("X-API-Version", clientVersion);

          // Add version status headers
          const currentVersion = await getCurrentApiVersion();
          const isDeprecated = await isVersionDeprecated(clientVersion);
          response.headers.set("X-API-Current-Version", currentVersion);
          response.headers.set("X-API-Deprecated", isDeprecated.toString());

          // Add rate limit headers if available
          if (apiContext.rateLimit) {
            response.headers.set(
              "X-RateLimit-Limit",
              apiContext.rateLimit.limit.toString()
            );
            response.headers.set(
              "X-RateLimit-Remaining",
              apiContext.rateLimit.remaining.toString()
            );
            response.headers.set(
              "X-RateLimit-Reset",
              apiContext.rateLimit.reset.toString()
            );
          }

          // 7. Log successful request
          const duration = Date.now() - startTime;
          const pathname = new URL(request.url).pathname;

          // Console logging
          logger.logRequest(request.method, pathname, statusCode, duration, {
            requestId,
            userId: apiContext.user?.id || apiContext.apiKey?.userId,
          });

          // Audit logging to database
          await auditLogger.log({
            userId: apiContext.user?.id,
            apiKeyId: apiContext.apiKey?.id,
            method: request.method,
            path: pathname,
            action: `${request.method} ${pathname}`,
            ipAddress: getIpAddress(request),
            userAgent: getUserAgent(request),
            resourceType: this.extractResourceType(pathname),
            resourceId: params?.id,
            statusCode,
            duration,
            metadata: {
              responseSize: JSON.stringify(result).length,
            },
          });

          // Add CORS headers
          setCorsHeaders(response, request);

          return response;
        },
        {
          errorMessage: "Request handler failed",
          shouldLog: false, // Custom logging below
        }
      );

      if (!handlerResult.success) {
        const error = handlerResult.error;
        statusCode = this.getStatusCodeFromError(error);
        const duration = Date.now() - startTime;
        const pathname = new URL(request.url).pathname;

        // Log failed request
        const requestId = this.extractRequestId(request);
        const params = context?.params ? await context.params : {};

        // Console logging
        logger.logRequest(request.method, pathname, statusCode, duration, {
          requestId,
          error: error instanceof Error ? error.message : String(error),
        });

        // Audit logging to database
        await auditLogger.log({
          userId: undefined, // May not have context in error case
          apiKeyId: undefined,
          method: request.method,
          path: pathname,
          action: `${request.method} ${pathname}`,
          ipAddress: getIpAddress(request),
          userAgent: getUserAgent(request),
          resourceType: this.extractResourceType(pathname),
          resourceId: params?.id,
          statusCode,
          duration,
          metadata: {
            error: error instanceof Error ? error.message : String(error),
          },
        });

        return this.handleError(error, request);
      }

      return handlerResult.data;
    };
  }

  private static extractRequestId(request: NextRequest): string {
    return request.headers.get("x-request-id") || crypto.randomUUID();
  }

  /**
   * Extract resource type from pathname
   * Examples:
   * - /api/metadata -> "metadata"
   * - /api/media/123 -> "media"
   * - /api/admin/api-keys -> "api-keys"
   */
  private static extractResourceType(pathname: string): string | undefined {
    const parts = pathname.split("/").filter(Boolean);
    // Skip "api" prefix and return the next segment
    const apiIndex = parts.indexOf("api");
    if (apiIndex !== -1 && parts.length > apiIndex + 1) {
      // For admin routes, combine admin + resource
      if (parts[apiIndex + 1] === "admin" && parts.length > apiIndex + 2) {
        return parts[apiIndex + 2];
      }
      return parts[apiIndex + 1];
    }
    return undefined;
  }

  private static async parseRequest(
    request: NextRequest,
    validation?: ApiRouteConfig["validation"],
    routeParams: Record<string, string> = {}
  ) {
    const url = new URL(request.url);
    const method = request.method;

    let body: unknown = undefined;
    let query: Record<string, string> = {};
    let params: Record<string, string> = routeParams;

    // Parse query parameters
    url.searchParams.forEach((value, key) => {
      query[key] = value;
    });

    // Parse body for POST/PUT/PATCH requests
    if (["POST", "PUT", "PATCH"].includes(method)) {
      const contentType = request.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const jsonResult = await tryCatch(
          async () => {
            // Security: Check request body size before parsing
            const text = await request.text();
            const bodySize = new TextEncoder().encode(text).length;

            if (bodySize > MAX_REQUEST_BODY_SIZE) {
              throw new ApiError(
                `Request body too large. Maximum allowed size is ${MAX_REQUEST_BODY_SIZE / 1024 / 1024}MB`,
                ErrorCode.VALIDATION_ERROR,
                413
              );
            }

            if (text.trim()) {
              return JSON.parse(text);
            }
            return undefined;
          },
          {
            errorMessage: "Failed to parse request body as JSON",
            shouldLog: false,
            onError: (error) => {
              logger.debug("Failed to parse request body as JSON", { error });
            },
          }
        );
        if (jsonResult.success && jsonResult.data !== undefined) {
          body = jsonResult.data;
        }
      } else if (contentType?.includes("multipart/form-data")) {
        const formResult = await tryCatch(() => request.formData(), {
          errorMessage: "Failed to parse request body as FormData",
          shouldLog: false,
          onError: (error) => {
            logger.debug("Failed to parse request body as FormData", { error });
          },
        });
        if (formResult.success) {
          body = formResult.data;
        }
      }
    }

    // Validate using Zod schemas if provided
    if (validation?.query) {
      // Type assertion is safe: Zod parse validates and returns the correct type
      query = validation.query.parse(query) as Record<string, string>;
    }

    if (validation?.body) {
      body = validation.body.parse(body);
    }

    if (validation?.params && params) {
      // Type assertion is safe: Zod parse validates and returns the correct type
      params = validation.params.parse(params) as Record<string, string>;
    }

    return {
      body,
      query,
      params,
      method,
      headers: Object.fromEntries(request.headers.entries()),
    };
  }

  private static async handleAuth(
    context: ApiContext,
    authConfig?: ApiRouteConfig["auth"]
  ) {
    const { request } = context;
    let authenticated = false;

    // Try session authentication first (for admin UI)
    if (authConfig?.allowSession !== false) {
      const { verifySessionFromHeaders } = await import(
        "@/infrastructure/auth/auth-helpers"
      );
      const sessionResult = await verifySessionFromHeaders(request.headers);

      if (sessionResult) {
        context.user = sessionResult.user;
        authenticated = true;

        logger.debug("Session authenticated", {
          userId: context.user.id,
          role: context.user.role,
        });
      }
    }

    // Try API key authentication if session not found
    if (!authenticated && authConfig?.allowApiKey !== false) {
      const apiKeyValue =
        request.headers.get("x-api-key") ||
        request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

      if (apiKeyValue) {
        // Import Better Auth helpers
        const { verifyApiKey } = await import(
          "@/infrastructure/auth/auth-helpers"
        );

        // Verify API key using Better Auth
        const apiKey = await verifyApiKey(apiKeyValue);

        if (apiKey) {
          context.apiKey = {
            id: apiKey.id,
            userId: apiKey.userId,
            scopes: apiKey.scopes,
          };
          authenticated = true;

          logger.debug("API key authenticated", {
            keyId: context.apiKey.id,
            userId: context.apiKey.userId,
            scopes: context.apiKey.scopes,
          });
        }
      }
    }

    // Check if authentication is required
    if (authConfig?.required && !authenticated) {
      throw new ApiError(
        "Authentication required. Provide a valid API key or session.",
        ErrorCode.UNAUTHORIZED,
        401
      );
    }

    // Check admin role if required
    if (authenticated && authConfig?.adminOnly) {
      if (context.user?.role !== "admin") {
        logger.warn("Admin access required", {
          userId: context.user?.id || context.apiKey?.userId,
          role: context.user?.role,
        });

        throw new ApiError("Admin access required", ErrorCode.FORBIDDEN, 403);
      }
    }

    // Check permissions if authenticated and required
    if (
      authenticated &&
      authConfig?.requiredScopes &&
      authConfig.requiredScopes.length > 0
    ) {
      const { hasPermission } = await import(
        "@/infrastructure/auth/auth-helpers"
      );

      const authContext = {
        user: context.user,
        apiKey: context.apiKey
          ? {
              id: context.apiKey.id,
              userId: context.apiKey.userId,
              name: "",
              permissions: {},
              scopes: context.apiKey.scopes || [],
              enabled: true,
            }
          : undefined,
      };

      const hasRequiredPermissions = hasPermission(
        authContext,
        authConfig.requiredScopes
      );

      if (!hasRequiredPermissions) {
        logger.warn("Insufficient permissions", {
          userId: context.user?.id || context.apiKey?.userId,
          required: authConfig.requiredScopes,
          userScopes: context.apiKey?.scopes || [],
        });

        throw new ApiError(
          `Insufficient permissions. Required permissions: ${authConfig.requiredScopes.join(
            ", "
          )}`,
          ErrorCode.FORBIDDEN,
          403
        );
      }
    }
  }

  private static handleError(
    error: unknown,
    request: NextRequest
  ): NextResponse {
    let apiError: ApiError;

    if (error instanceof ApiError) {
      apiError = error;
    } else if (error instanceof z.ZodError) {
      apiError = new ApiError(
        "Validation failed. Please check your input.",
        ErrorCode.VALIDATION_ERROR,
        400,
        { issues: error.issues }
      );
    } else if (error instanceof Error) {
      apiError = new ApiError(
        error.message || "Internal server error",
        ErrorCode.INTERNAL_ERROR,
        500
      );
    } else {
      apiError = new ApiError(
        "An unexpected error occurred",
        ErrorCode.INTERNAL_ERROR,
        500
      );
    }

    const requestId = this.extractRequestId(request);
    const errorResponse = createErrorResponse(
      apiError.code,
      apiError.message,
      apiError.details,
      requestId
    );

    const response = NextResponse.json(errorResponse, {
      status: apiError.statusCode,
    });

    response.headers.set("X-Request-ID", requestId);
    response.headers.set("X-API-Version", "v1.0.0");

    if (apiError.statusCode === 429 && apiError.details) {
      // Type-safe check for retryAfter in details
      const details = apiError.details as Record<string, unknown>;
      if (typeof details.retryAfter === "number") {
        response.headers.set("Retry-After", String(details.retryAfter));
      }
    }

    // Add CORS headers
    setCorsHeaders(response, request);

    return response;
  }

  private static getStatusCodeFromError(error: unknown): number {
    if (error instanceof ApiError) {
      return error.statusCode;
    }
    if (error instanceof z.ZodError) {
      return 400;
    }
    return 500;
  }

  /**
   * Handle API version validation
   */
  private static async handleVersioning(
    context: ApiContext,
    versioningConfig?: ApiRouteConfig["versioning"]
  ) {
    const { request } = context;

    // Extract version from headers
    const clientVersion =
      request.headers.get("x-api-version") ||
      request.headers.get("accept-version") ||
      "v1";

    // Validate version if required
    if (versioningConfig?.required !== false) {
      const isValidVersion = await validateApiVersion(clientVersion);

      if (!isValidVersion) {
        const currentVersion = await getCurrentApiVersion();
        throw new ApiError(
          `Unsupported API version '${clientVersion}'. Supported versions: ${currentVersion}`,
          ErrorCode.VALIDATION_ERROR,
          400,
          {
            supportedVersion: currentVersion,
            requestedVersion: clientVersion,
          }
        );
      }

      // Check if version is deprecated
      const isDeprecated = await isVersionDeprecated(clientVersion);
      if (isDeprecated && !versioningConfig?.allowDeprecated) {
        const currentVersion = await getCurrentApiVersion();
        throw new ApiError(
          `API version '${clientVersion}' is deprecated. Please upgrade to version '${currentVersion}'`,
          ErrorCode.VALIDATION_ERROR,
          400,
          {
            deprecatedVersion: clientVersion,
            currentVersion,
          }
        );
      }

      // Log version usage
      logger.debug("API version validated", {
        version: clientVersion,
        deprecated: isDeprecated,
        requestId: context.requestId,
      });
    }
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Common validation schemas
export const commonSchemas = {
  id: z.object({
    id: z.string().min(1, "ID is required"),
  }),

  pagination: z.object({
    page: z.coerce.number().int().min(1, "Page must be at least 1").default(1),
    limit: z.coerce
      .number()
      .int()
      .min(1, "Limit must be at least 1")
      .lte(1000, "Limit cannot exceed 1000")
      .default(20),
  }),

  sort: z.object({
    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  }),

  search: z.object({
    query: z.string().optional(),
  }),
};

// Helper functions for common operations
export const withPagination = <T extends z.ZodRawShape>(
  schema: z.ZodObject<T>
) => schema.merge(commonSchemas.pagination);

export const withSort = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) =>
  schema.merge(commonSchemas.sort);

export const withSearch = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) =>
  schema.merge(commonSchemas.search);

export const withId = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) =>
  schema.merge(commonSchemas.id);
