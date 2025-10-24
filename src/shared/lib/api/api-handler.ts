import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCode,
  type ApiResponse,
} from "@/shared/types";
import { logger } from "@/shared/lib/utils/logger";
import { auditLogger } from "@/infrastructure/monitoring/audit-logger";
import { getIpAddress, getUserAgent } from "./request-context";
import { tryCatch } from "@/shared/lib/utils";

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
}

// Type helper to infer validated input type from config
export type InferApiInput<TConfig extends ApiRouteConfig> = {
  body: TConfig['validation'] extends { body: infer B }
    ? B extends z.ZodSchema
      ? z.infer<B>
      : never
    : undefined;
  query: TConfig['validation'] extends { query: infer Q }
    ? Q extends z.ZodSchema
      ? z.infer<Q>
      : never
    : undefined;
  params: TConfig['validation'] extends { params: infer P }
    ? P extends z.ZodSchema
      ? z.infer<P>
      : never
    : undefined;
};

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

          // 4. Handle authentication if required
          if (config.auth?.required !== false) {
            await this.handleAuth(apiContext, config.auth);
          }

          // 5. Execute the handler
          // Type assertion is safe here because parseRequest validates the data against TInput schema
          const result = await handler(parsedData as TInput, apiContext);

          // 6. Return success response
          const response = NextResponse.json(createSuccessResponse(result), {
            status: 200,
          });

          // Add request tracking headers
          response.headers.set("X-Request-ID", requestId);
          response.headers.set("X-API-Version", "v1.0.0");

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
            const text = await request.text();
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
        const formResult = await tryCatch(
          () => request.formData(),
          {
            errorMessage: "Failed to parse request body as FormData",
            shouldLog: false,
            onError: (error) => {
              logger.debug("Failed to parse request body as FormData", { error });
            },
          }
        );
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

    if (validation?.body && body !== undefined) {
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

    // Try API key authentication first
    if (authConfig?.allowApiKey !== false) {
      const apiKeyValue =
        request.headers.get("x-api-key") ||
        request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

      if (apiKeyValue) {
        // Import API key service dynamically to avoid circular dependency
        const { ApiKeyService } = await import("@/infrastructure/services/api-key.service");
        const { RateLimitService, RateLimitError } = await import("@/infrastructure/services/rate-limit.service");
        const { getIpAddress, getOrigin } = await import("./request-context");

        // Verify API key
        const apiKey = await ApiKeyService.verify(apiKeyValue);

        if (apiKey) {
          // Extract scopes from metadata
          const metadata = apiKey.metadata as { scopes?: string[] } | null;
          const scopes = metadata?.scopes || [];

          context.apiKey = {
            id: apiKey.id,
            userId: apiKey.userId,
            scopes,
          };
          authenticated = true;

          // Check rate limit
          const rateLimitCheck = await tryCatch(
            () => RateLimitService.checkLimit(apiKey, {
              ip: getIpAddress(request),
              origin: getOrigin(request),
            }),
            {
              errorMessage: "Rate limit check failed",
              shouldLog: false,
            }
          );

          if (!rateLimitCheck.success) {
            const error = rateLimitCheck.error;
            if (error instanceof RateLimitError) {
              throw new ApiError(
                error.message,
                ErrorCode.RATE_LIMIT_EXCEEDED,
                429,
                {
                  limit: error.result.limit,
                  remaining: error.result.remaining,
                  reset: error.result.reset,
                  retryAfter: error.result.retryAfter,
                }
              );
            }
            // Log but don't fail on rate limit errors
            logger.error("Rate limit check failed", { error });
          } else {
            const rateLimitResult = rateLimitCheck.data;
            context.rateLimit = {
              limit: rateLimitResult.limit,
              remaining: rateLimitResult.remaining,
              reset: rateLimitResult.reset,
            };

            logger.debug("API key authenticated", {
              keyId: context.apiKey.id,
              userId: context.apiKey.userId,
              tier: rateLimitResult.tier,
              remaining: rateLimitResult.remaining,
            });
          }
        }
      }
    }

    // Check if authentication is required
    if (authConfig?.required && !authenticated) {
      throw new ApiError(
        "Authentication required. Provide a valid API key.",
        ErrorCode.UNAUTHORIZED,
        401
      );
    }

    // Check scopes if authenticated
    if (
      authenticated &&
      authConfig?.requiredScopes &&
      authConfig.requiredScopes.length > 0
    ) {
      const userScopes = context.apiKey?.scopes || [];
      const hasRequiredScopes = authConfig.requiredScopes.some(scope =>
        userScopes.includes(scope)
      );

      if (!hasRequiredScopes) {
        logger.warn("Insufficient scopes", {
          userId: context.apiKey?.userId,
          required: authConfig.requiredScopes,
          userScopes,
        });

        throw new ApiError(
          `Insufficient permissions. Required scopes: ${authConfig.requiredScopes.join(", ")}`,
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
      if (typeof details.retryAfter === 'number') {
        response.headers.set("Retry-After", String(details.retryAfter));
      }
    }

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
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
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
export const withPagination = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) =>
  schema.merge(commonSchemas.pagination);

export const withSort = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) =>
  schema.merge(commonSchemas.sort);

export const withSearch = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) =>
  schema.merge(commonSchemas.search);

export const withId = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) =>
  schema.merge(commonSchemas.id);