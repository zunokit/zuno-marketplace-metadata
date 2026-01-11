import { NextRequest, NextResponse } from "next/server";
import {
  validateApiVersion,
  getCurrentApiVersion,
} from "@/shared/lib/utils/api-version";
import { getCurrentUrl } from "@/shared/lib/utils/url";

/**
 * Global Middleware
 *
 * Handles:
 * - CORS headers
 * - Security headers
 * - Request ID generation
 * - API version validation (early validation for better performance)
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle API routes
  if (pathname.startsWith("/api")) {
    // Get version from client headers
    const clientVersion =
      request.headers.get("x-api-version") ||
      request.headers.get("accept-version") ||
      "v1"; // Default to v1

    // Early API version validation for better performance
    try {
      const isValidVersion = await validateApiVersion(clientVersion);

      if (!isValidVersion) {
        const currentVersion = await getCurrentApiVersion();
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "UNSUPPORTED_API_VERSION",
              message: `Unsupported API version '${clientVersion}'. Supported version: ${currentVersion}`,
              details: {
                supportedVersion: currentVersion,
                requestedVersion: clientVersion,
              },
            },
          },
          {
            status: 400,
            headers: {
              "X-API-Version": clientVersion,
              "X-API-Current-Version": currentVersion,
              "X-API-Deprecated": "false",
            },
          }
        );
      }
    } catch (error) {
      // If version validation fails, log error but continue
      console.warn("API version validation failed:", error);
    }

    // Create response
    const response = NextResponse.next();

    // Set internal header for use in route handlers
    response.headers.set("x-internal-api-version", clientVersion);

    // Set public headers for client
    response.headers.set("x-api-version", clientVersion);
    response.headers.set("x-api-deprecated", "false");

    // Add CORS headers
    const origin = request.headers.get("origin");
    const corsOrigins = process.env.CORS_ORIGINS || getCurrentUrl();
    const allowedOrigins = corsOrigins.split(",").map((o) => o.trim());

    if (
      origin &&
      (allowedOrigins.includes("*") || allowedOrigins.includes(origin))
    ) {
      response.headers.set("access-control-allow-origin", origin);
      response.headers.set("access-control-allow-credentials", "true");
    }

    // Handle preflight requests
    if (request.method === "OPTIONS") {
      const preflightResponse = new NextResponse(null, { status: 204 });

      if (
        origin &&
        (allowedOrigins.includes("*") || allowedOrigins.includes(origin))
      ) {
        preflightResponse.headers.set("access-control-allow-origin", origin);
      }

      preflightResponse.headers.set(
        "access-control-allow-methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      preflightResponse.headers.set(
        "access-control-allow-headers",
        "Content-Type, Authorization, X-API-Key, X-API-Version"
      );
      preflightResponse.headers.set("access-control-max-age", "86400"); // 24 hours

      return preflightResponse;
    }

    // Add security headers
    response.headers.set("x-content-type-options", "nosniff");
    response.headers.set("x-frame-options", "DENY");
    response.headers.set("x-xss-protection", "1; mode=block");
    response.headers.set("referrer-policy", "strict-origin-when-cross-origin");

    // Add request ID if not present using Web Crypto API
    if (!request.headers.get("x-request-id")) {
      response.headers.set("x-request-id", crypto.randomUUID());
    }

    return response;
  }

  // For non-API routes, just pass through
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all API routes
    "/api/:path*",
  ],
};
