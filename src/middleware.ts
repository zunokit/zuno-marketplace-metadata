import { NextRequest, NextResponse } from "next/server";
import { validateApiVersion, getSupportedApiVersions } from "@/shared/lib/utils/api-version";

/**
 * Global Middleware
 *
 * Handles:
 * - API versioning validation
 * - CORS headers
 * - Security headers
 * - Request ID generation
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle API routes
  if (pathname.startsWith("/api")) {
    // Get version from client headers
    const clientVersion =
      request.headers.get("x-api-version") ||
      request.headers.get("accept-version") ||
      "v1"; // Default to v1

    // Validate against database
    const isValid = await validateApiVersion(clientVersion);
    const validatedVersion = isValid ? clientVersion : "v1";

    // If invalid version provided, return error
    if (!isValid && (request.headers.get("x-api-version") || request.headers.get("accept-version"))) {
      const supportedVersions = await getSupportedApiVersions();
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_API_VERSION",
            message: `API version '${clientVersion}' is not supported. Supported versions: ${supportedVersions.join(", ")}`,
          },
          supportedVersions,
        },
        { status: 400 }
      );
    }

    // Create response with validated version
    const response = NextResponse.next();

    // Set internal header for use in route handlers
    response.headers.set("x-internal-api-version", validatedVersion);

    // Set public headers for client
    response.headers.set("x-api-version", validatedVersion);
    response.headers.set("x-api-deprecated", "false");

    // Add CORS headers
    const origin = request.headers.get("origin");
    const allowedOrigins = process.env.CORS_ORIGINS?.split(",") || ["*"];

    if (origin && (allowedOrigins.includes("*") || allowedOrigins.includes(origin))) {
      response.headers.set("access-control-allow-origin", origin);
      response.headers.set("access-control-allow-credentials", "true");
    }

    // Handle preflight requests
    if (request.method === "OPTIONS") {
      const preflightResponse = new NextResponse(null, { status: 204 });

      if (origin && (allowedOrigins.includes("*") || allowedOrigins.includes(origin))) {
        preflightResponse.headers.set("access-control-allow-origin", origin);
      }

      preflightResponse.headers.set("access-control-allow-methods", "GET, POST, PUT, DELETE, OPTIONS");
      preflightResponse.headers.set("access-control-allow-headers", "Content-Type, Authorization, X-API-Key, X-API-Version");
      preflightResponse.headers.set("access-control-max-age", "86400"); // 24 hours

      return preflightResponse;
    }

    // Add security headers
    response.headers.set("x-content-type-options", "nosniff");
    response.headers.set("x-frame-options", "DENY");
    response.headers.set("x-xss-protection", "1; mode=block");
    response.headers.set("referrer-policy", "strict-origin-when-cross-origin");

    // Add request ID if not present
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
