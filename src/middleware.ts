import { NextRequest, NextResponse } from "next/server";

/**
 * Global Middleware
 *
 * Handles:
 * - CORS headers
 * - Security headers
 * - Request ID generation
 *
 * Note: API versioning is handled in route handlers to avoid database calls in Edge Runtime
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

    // Create response - version validation will happen in route handlers
    const response = NextResponse.next();

    // Set internal header for use in route handlers
    response.headers.set("x-internal-api-version", clientVersion);

    // Set public headers for client
    response.headers.set("x-api-version", clientVersion);
    response.headers.set("x-api-deprecated", "false");

    // Add CORS headers
    const origin = request.headers.get("origin");
    const corsOrigins = process.env.CORS_ORIGINS || "http://localhost:3000";
    const allowedOrigins = corsOrigins.split(",").map(o => o.trim());

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
