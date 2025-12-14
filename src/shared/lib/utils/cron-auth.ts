import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "./logger";

/**
 * Secure Cron Authentication Utility
 *
 * Protects cron endpoints from timing attacks and unauthorized access
 *
 * Security features:
 * - Constant-time comparison using crypto.timingSafeEqual
 * - No endpoint existence revelation (returns 404 instead of 401)
 * - Secure logging without exposing secrets
 */

/**
 * Verify cron secret using constant-time comparison
 *
 * @param request - Next.js request object
 * @param secret - Expected secret value from environment
 * @returns true if authentication succeeds, false otherwise
 */
export function verifyCronAuth(
  request: NextRequest,
  secret: string | undefined
): boolean {
  // Early return if secret not configured (dev environment)
  if (!secret) {
    logger.warn("CRON_SECRET not configured - authentication skipped");
    return false;
  }

  const authHeader = request.headers.get("authorization");

  // No auth header provided
  if (!authHeader) {
    return false;
  }

  const expectedAuth = `Bearer ${secret}`;

  // Length mismatch - avoid timing attack
  if (authHeader.length !== expectedAuth.length) {
    return false;
  }

  try {
    // Constant-time comparison to prevent timing attacks
    const authBuffer = Buffer.from(authHeader, "utf8");
    const expectedBuffer = Buffer.from(expectedAuth, "utf8");

    return timingSafeEqual(authBuffer, expectedBuffer);
  } catch (error) {
    // timingSafeEqual throws if buffers have different lengths
    // This should not happen due to length check above, but handle gracefully
    logger.error("Cron auth verification error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Create unauthorized response for cron endpoints
 *
 * Returns 404 instead of 401 to avoid revealing endpoint existence
 * This is a security best practice for internal/cron endpoints
 *
 * @returns NextResponse with 404 status
 */
export function createUnauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: "Not Found" }, { status: 404 });
}

/**
 * Middleware-style auth handler for cron endpoints
 *
 * Usage example:
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const authResult = handleCronAuth(request, process.env.CRON_SECRET);
 *   if (!authResult.authorized) {
 *     return authResult.response;
 *   }
 *   // Continue with cron logic...
 * }
 * ```
 *
 * @param request - Next.js request object
 * @param secret - Expected secret value
 * @returns Object with authorization status and response
 */
export function handleCronAuth(
  request: NextRequest,
  secret: string | undefined
): { authorized: boolean; response?: NextResponse } {
  const authorized = verifyCronAuth(request, secret);

  if (!authorized) {
    logger.warn("Unauthorized cron request attempt", {
      ip: request.headers.get("x-forwarded-for") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
      url: request.url,
    });

    return {
      authorized: false,
      response: createUnauthorizedResponse(),
    };
  }

  return { authorized: true };
}
