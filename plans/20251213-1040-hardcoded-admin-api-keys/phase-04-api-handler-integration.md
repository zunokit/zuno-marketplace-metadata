# Phase 4: API Handler Integration

**Target File:** `src/shared/lib/api/api-handler.ts`

---

## Overview

Modify the API handler to:
1. Check if incoming API key is a hardcoded admin key
2. Bypass rate limiting for hardcoded admin keys
3. Use constant-time comparison for security

---

## Changes Required

### 1. Add Imports (top of file)

Add these imports after existing imports:

```typescript
import { constantTimeCompare } from "@/shared/lib/utils/constant-time-compare";
import { env } from "@/shared/config/env";
```

---

### 2. Add Helper Function (after imports)

Add this function after the imports section:

```typescript
/**
 * Check if API key is a hardcoded admin key from environment
 *
 * Hardcoded admin keys bypass rate limiting and have enterprise permissions.
 * Uses constant-time comparison to prevent timing attacks.
 *
 * @param apiKeyValue - The plaintext API key from request header
 * @returns true if key matches one of the hardcoded admin keys
 */
function isHardcodedAdminApiKey(apiKeyValue: string): boolean {
  // Return false if no admin keys configured
  if (!env.API_KEYS) return false;

  // Parse comma-separated admin keys
  const adminKeys = env.API_KEYS.split(",").map((k) => k.trim());

  // Check each admin key using constant-time comparison
  for (const adminKey of adminKeys) {
    if (constantTimeCompare(apiKeyValue, adminKey)) {
      return true;
    }
  }

  return false;
}
```

---

### 3. Modify handleAuth Method

Locate the `handleAuth` method in `ApiWrapper` class. Find the section where API key authentication succeeds and rate limiting is checked.

**Current code structure (approximately line 460-545):**

```typescript
// Try API key authentication if session not found
if (!authenticated && authConfig?.allowApiKey !== false) {
  const apiKeyValue =
    request.headers.get("x-api-key") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (apiKeyValue) {
    // Verify API key using Better Auth
    const { verifyApiKey } = await import("@/infrastructure/auth/auth-helpers");
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

      // Check rate limits for API key requests  <-- MODIFY THIS SECTION
      try {
        const rateLimitResult = await RateLimitService.checkLimit(
          { id: apiKey.id, metadata: apiKey.metadata || null },
          {
            ip: getIpAddress(request),
            origin: request.headers.get("origin") || undefined,
          }
        );
        // ... rest of rate limit handling
      } catch (error) {
        // ... error handling
      }
    }
  }
}
```

**Modified code (replace rate limit section):**

```typescript
// Try API key authentication if session not found
if (!authenticated && authConfig?.allowApiKey !== false) {
  const apiKeyValue =
    request.headers.get("x-api-key") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (apiKeyValue) {
    // Verify API key using Better Auth
    const { verifyApiKey } = await import("@/infrastructure/auth/auth-helpers");
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

      // Check if this is a hardcoded admin key - bypass rate limiting
      const isHardcodedAdmin = isHardcodedAdminApiKey(apiKeyValue);

      if (isHardcodedAdmin) {
        // Hardcoded admin keys have unlimited access
        logger.debug("Hardcoded admin API key - bypassing rate limit", {
          keyId: apiKey.id,
        });
        context.rateLimit = {
          limit: Infinity,
          remaining: Infinity,
          reset: 0,
        };
      } else {
        // Standard rate limit check for regular API keys
        try {
          const rateLimitResult = await RateLimitService.checkLimit(
            { id: apiKey.id, metadata: apiKey.metadata || null },
            {
              ip: getIpAddress(request),
              origin: request.headers.get("origin") || undefined,
            }
          );

          // Store rate limit info in context for response headers
          context.rateLimit = {
            limit: rateLimitResult.limit,
            remaining: rateLimitResult.remaining,
            reset: rateLimitResult.reset,
          };

          logger.debug("Rate limit check passed", {
            keyId: apiKey.id,
            tier: rateLimitResult.tier,
            remaining: rateLimitResult.remaining,
          });
        } catch (error) {
          if (error instanceof RateLimitError) {
            // Store rate limit info even for exceeded limits
            context.rateLimit = {
              limit: error.result.limit,
              remaining: error.result.remaining,
              reset: error.result.reset,
            };

            logger.warn("Rate limit exceeded", {
              keyId: apiKey.id,
              tier: error.result.tier,
              retryAfter: error.result.retryAfter,
            });

            throw new ApiError(
              error.message,
              ErrorCode.RATE_LIMIT_EXCEEDED,
              429,
              {
                retryAfter: error.result.retryAfter,
                limit: error.result.limit,
                reset: error.result.reset,
              }
            );
          }
          // Other errors are logged and ignored (fail open)
          logger.error("Rate limit check failed", {
            keyId: apiKey.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
  }
}
```

---

## Key Differences from Reference (zuno-marketplace-abis)

The zuno-marketplace-abis implementation also checks `isApiKeyOwnerAdmin()` to bypass rate limits for API keys belonging to admin users. For simplicity, this implementation only checks hardcoded admin keys.

If you want to also bypass rate limits for all admin-owned keys, add:

```typescript
// Optional: Also bypass for API keys owned by admin users
const isOwnerAdmin = !isHardcodedAdmin && (await isApiKeyOwnerAdmin(apiKey));

if (isHardcodedAdmin || isOwnerAdmin) {
  logger.debug("Admin API key - bypassing rate limit", {
    keyId: apiKey.id,
    isHardcodedAdmin,
    isOwnerAdmin,
  });
  context.rateLimit = {
    limit: Infinity,
    remaining: Infinity,
    reset: 0,
  };
} else {
  // Standard rate limit check...
}
```

This requires implementing `isApiKeyOwnerAdmin()` in auth-helpers.ts.

---

## Testing the Integration

```typescript
// Test with hardcoded admin key
const response = await fetch("/api/metadata", {
  headers: {
    "Authorization": "Bearer zuno_admin_key_123456789012345678",
    "x-api-version": "v1",
  },
});

// Check headers - should show Infinity limits
console.log(response.headers.get("X-RateLimit-Remaining")); // "Infinity"
```
