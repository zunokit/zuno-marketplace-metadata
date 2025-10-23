import { NextRequest } from "next/server";

/**
 * Extract IP address from request
 */
export function getIpAddress(request: NextRequest): string {
  // Try various headers in order of preference
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }

  // Fallback
  return "unknown";
}

/**
 * Extract origin from request
 */
export function getOrigin(request: NextRequest): string | undefined {
  return request.headers.get("origin") || request.headers.get("referer") || undefined;
}

/**
 * Extract user agent from request
 */
export function getUserAgent(request: NextRequest): string | undefined {
  return request.headers.get("user-agent") || undefined;
}

/**
 * Generate request ID (if not provided)
 */
export function getRequestId(request: NextRequest): string {
  return request.headers.get("x-request-id") || crypto.randomUUID();
}

/**
 * Extract API version from request headers
 */
export function getApiVersion(request: NextRequest): string {
  return (
    request.headers.get("x-api-version") ||
    request.headers.get("accept-version") ||
    "v1"
  );
}

/**
 * Build complete request context
 */
export function buildRequestContext(request: NextRequest) {
  return {
    requestId: getRequestId(request),
    ip: getIpAddress(request),
    origin: getOrigin(request),
    userAgent: getUserAgent(request),
    apiVersion: getApiVersion(request),
    method: request.method,
    path: new URL(request.url).pathname,
  };
}
