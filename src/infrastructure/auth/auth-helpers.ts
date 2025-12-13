import { auth } from "./better-auth.config";
import { db } from "@/infrastructure/database/client";
import { apiKey as apiKeyTable } from "@/infrastructure/database/drizzle/schema/api-key.schema";
import { eq } from "drizzle-orm";
import { logger } from "@/shared/lib/utils/logger";
import { User } from "@/infrastructure/database/drizzle/schema/user.schema";
import { env } from "@/shared/config/env";
import { constantTimeCompare } from "@/shared/lib/utils/constant-time-compare";
import { hashApiKey } from "@/shared/lib/utils/api-key-hash";

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  banned?: boolean;
  banReason?: string | null;
  banExpires?: Date | null;
}

export interface AuthApiKey {
  id: string;
  userId: string;
  name: string;
  permissions: Record<string, string[]>;
  scopes: string[];
  enabled: boolean;
  expiresAt?: Date | null;
  rateLimitEnabled?: boolean;
  rateLimitMax?: number | null;
  rateLimitTimeWindow?: number | null;
  remaining?: number | null;
  metadata?: {
    type?: "personal" | "organization" | "public";
    scopes?: string[];
    ipWhitelist?: string[];
    allowedOrigins?: string[];
    notes?: string;
  };
}

export interface AuthContext {
  user?: AuthUser;
  apiKey?: AuthApiKey;
  session?: {
    id: string;
    token: string;
    expiresAt: Date;
    impersonatedBy?: string;
  };
}

/**
 * Verify API key from request header
 * First checks hardcoded admin keys from environment, then uses Better Auth API for regular keys
 */
export async function verifyApiKey(
  apiKeyValue: string
): Promise<AuthApiKey | null> {
  try {
    // First check if this is a hardcoded admin key
    if (env.API_KEYS) {
      const adminKeys = env.API_KEYS.split(",").map((k) => k.trim());
      for (const adminKey of adminKeys) {
        if (constantTimeCompare(apiKeyValue, adminKey)) {
          // This is a hardcoded admin key - look it up in database directly
          const hashedKey = hashApiKey(apiKeyValue);
          const [keyRecord] = await db
            .select()
            .from(apiKeyTable)
            .where(eq(apiKeyTable.key, hashedKey))
            .limit(1);

          if (keyRecord && keyRecord.enabled) {
            logger.debug("Hardcoded admin API key verified", {
              keyId: keyRecord.id,
            });

            // Parse permissions
            let permissions: Record<string, string[]> = {};
            if (keyRecord.permissions) {
              try {
                permissions =
                  typeof keyRecord.permissions === "string"
                    ? JSON.parse(keyRecord.permissions)
                    : keyRecord.permissions;
              } catch (error) {
                logger.error("Failed to parse API key permissions", { error });
              }
            }

            // Extract scopes from metadata
            let metadata: AuthApiKey["metadata"] = {};
            if (keyRecord.metadata) {
              try {
                if (typeof keyRecord.metadata === "string") {
                  metadata = JSON.parse(keyRecord.metadata);
                } else {
                  metadata = keyRecord.metadata;
                }
              } catch (error) {
                logger.error("Failed to parse API key metadata", { error });
              }
            }
            const scopes = metadata?.scopes || [];

            // Update last request timestamp
            await db
              .update(apiKeyTable)
              .set({ lastRequest: new Date() })
              .where(eq(apiKeyTable.id, keyRecord.id));

            return {
              id: keyRecord.id,
              userId: keyRecord.userId,
              name: keyRecord.name,
              permissions,
              scopes,
              enabled: keyRecord.enabled,
              expiresAt: keyRecord.expiresAt,
              rateLimitEnabled: keyRecord.rateLimitEnabled || false,
              rateLimitMax: keyRecord.rateLimitMax,
              rateLimitTimeWindow: keyRecord.rateLimitTimeWindow,
              remaining: keyRecord.remaining,
              metadata,
            };
          }
        }
      }
    }

    // Not a hardcoded admin key, use Better Auth API to verify the key
    const result = await auth.api.verifyApiKey({
      body: {
        key: apiKeyValue,
      },
    });

    if (!result || !result.valid || !result.key) {
      logger.debug("API key verification failed");
      return null;
    }

    // Get the full key record from database for additional checks
    const [keyRecord] = await db
      .select()
      .from(apiKeyTable)
      .where(eq(apiKeyTable.id, result.key.id))
      .limit(1);

    if (!keyRecord) {
      logger.warn("API key verified but not found in database", {
        keyId: result.key.id,
      });
      return null;
    }

    // Check if key is enabled
    if (!keyRecord.enabled) {
      logger.warn("API key is disabled", { keyId: keyRecord.id });
      return null;
    }

    // Check expiration
    if (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date()) {
      logger.warn("API key has expired", {
        keyId: keyRecord.id,
        expiresAt: keyRecord.expiresAt,
      });
      return null;
    }

    // Parse permissions from Better Auth format
    let permissions: Record<string, string[]> = {};
    if (keyRecord.permissions) {
      try {
        permissions =
          typeof keyRecord.permissions === "string"
            ? JSON.parse(keyRecord.permissions)
            : keyRecord.permissions;
      } catch (error) {
        logger.error("Failed to parse API key permissions", { error });
      }
    }

    // Extract scopes from metadata
    let metadata: AuthApiKey["metadata"] = {};
    if (keyRecord.metadata) {
      try {
        if (typeof keyRecord.metadata === "string") {
          metadata = JSON.parse(keyRecord.metadata);
        } else {
          metadata = keyRecord.metadata;
        }
      } catch (error) {
        logger.error("Failed to parse API key metadata", { error });
      }
    }
    const scopes = metadata?.scopes || [];

    // Update last request timestamp
    await db
      .update(apiKeyTable)
      .set({ lastRequest: new Date() })
      .where(eq(apiKeyTable.id, keyRecord.id));

    return {
      id: keyRecord.id,
      userId: keyRecord.userId,
      name: keyRecord.name,
      permissions,
      scopes,
      enabled: keyRecord.enabled,
      expiresAt: keyRecord.expiresAt,
      rateLimitEnabled: keyRecord.rateLimitEnabled || false,
      rateLimitMax: keyRecord.rateLimitMax,
      rateLimitTimeWindow: keyRecord.rateLimitTimeWindow,
      remaining: keyRecord.remaining,
      metadata,
    };
  } catch (error) {
    logger.error("Failed to verify API key", { error });
    return null;
  }
}

/**
 * Verify session using incoming request headers (supports Bearer plugin)
 */
export async function verifySessionFromHeaders(headers: Headers): Promise<{
  user: AuthUser;
  session: AuthContext["session"];
} | null> {
  try {
    const session = await auth.api.getSession({ headers });

    if (!session || !session.user || !session.session) {
      return null;
    }

    return {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: (session.user as User).role || "user",
        banned: (session.user as User).banned || undefined,
        banReason: (session.user as User).banReason || undefined,
        banExpires: (session.user as User).banExpires
          ? new Date((session.user as User).banExpires || new Date())
          : undefined,
      },
      session: {
        id: session.session.id,
        token: session.session.token,
        expiresAt: new Date(session.session.expiresAt),
      },
    };
  } catch (error) {
    logger.error("Failed to verify session from headers", { error });
    return null;
  }
}

/**
 * Check if user/API key has required permissions
 * Supports both Better Auth format (resource: ['action']) and scope format (resource:action)
 */
export function hasPermission(
  context: AuthContext,
  requiredPermissions: string[]
): boolean {
  // Admin role has all permissions
  if (context.user?.role === "admin") {
    return true;
  }

  // Check API key permissions
  if (context.apiKey) {
    // Check each required permission - ALL must be satisfied
    const hasAllPermissions = requiredPermissions.every((perm) => {
      // Check scopes first (format: "metadata:read", "media:write")
      if (context.apiKey!.scopes.includes(perm)) {
        return true;
      }

      // Check Better Auth permissions format (resource: ['action'])
      // Split by ':' - supports both "resource:action" and "action:resource"
      const parts = perm.split(":");
      if (parts.length === 2) {
        const [part1, part2] = parts;

        // Try "resource:action" format (e.g., "metadata:read")
        const resourcePermissions1 = context.apiKey!.permissions[part1];
        if (resourcePermissions1?.includes(part2)) {
          return true;
        }

        // Try "action:resource" format (e.g., "read:metadata")
        const resourcePermissions2 = context.apiKey!.permissions[part2];
        if (resourcePermissions2?.includes(part1)) {
          return true;
        }
      }

      return false;
    });

    return hasAllPermissions;
  }

  // For session-based auth, default users have read-only access
  if (context.user) {
    // Check if all required permissions are read-only
    const allReadOnly = requiredPermissions.every((perm) => {
      const lower = perm.toLowerCase();
      return (
        lower.includes("read") ||
        lower.includes("list") ||
        lower.includes("get")
      );
    });
    return allReadOnly;
  }

  return false;
}

/**
 * Check if user is admin
 */
export function isAdmin(context: AuthContext): boolean {
  return context.user?.role === "admin";
}

/**
 * Check if user owns a resource
 */
export function isOwner(context: AuthContext, resourceUserId: string): boolean {
  if (context.apiKey) {
    return context.apiKey.userId === resourceUserId;
  }
  if (context.user) {
    return context.user.id === resourceUserId;
  }
  return false;
}

/**
 * Check if user can access resource (owner or admin)
 */
export function canAccessResource(
  context: AuthContext,
  resourceUserId: string
): boolean {
  return isAdmin(context) || isOwner(context, resourceUserId);
}
