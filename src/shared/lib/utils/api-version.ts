import { db, schema } from "@/infrastructure/database/client";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

/**
 * API Version Management Utilities
 *
 * Handles API versioning with database-backed version control
 */

// Cache for supported versions (in-memory cache to reduce DB queries)
let versionCache: {
  versions: string[];
  current: string;
  lastUpdated: number;
} | null = null;

const CACHE_TTL = 60 * 1000; // 1 minute

/**
 * Get all supported API versions from database
 */
export async function getSupportedApiVersions(): Promise<string[]> {
  try {
    // Check cache first
    if (versionCache && Date.now() - versionCache.lastUpdated < CACHE_TTL) {
      return versionCache.versions;
    }

    const versions = await db
      .select({ id: schema.apiVersions.id })
      .from(schema.apiVersions)
      .where(eq(schema.apiVersions.deprecated, false));

    const versionIds = versions.map((v) => v.id);

    // Update cache
    const current = await getCurrentApiVersion();
    versionCache = {
      versions: versionIds,
      current,
      lastUpdated: Date.now(),
    };

    return versionIds;
  } catch (error) {
    logger.error("Failed to get supported API versions", {
      error: error instanceof Error ? error.message : String(error),
    });
    // Return default if database query fails
    return ["v1", "v1.0.0"];
  }
}

/**
 * Get current API version
 */
export async function getCurrentApiVersion(): Promise<string> {
  try {
    // Check cache first
    if (versionCache && Date.now() - versionCache.lastUpdated < CACHE_TTL) {
      return versionCache.current;
    }

    const [currentVersion] = await db
      .select({ id: schema.apiVersions.id })
      .from(schema.apiVersions)
      .where(eq(schema.apiVersions.isCurrent, true))
      .limit(1);

    return currentVersion?.id || "v1";
  } catch (error) {
    logger.error("Failed to get current API version", {
      error: error instanceof Error ? error.message : String(error),
    });
    return "v1";
  }
}

/**
 * Validate if a version is supported
 */
export async function validateApiVersion(version: string): Promise<boolean> {
  try {
    const supportedVersions = await getSupportedApiVersions();
    return supportedVersions.includes(version);
  } catch (error) {
    logger.error("Failed to validate API version", {
      error: error instanceof Error ? error.message : String(error),
      version,
    });
    // Fail open - allow request with default version
    return true;
  }
}

/**
 * Check if a version is deprecated
 */
export async function isVersionDeprecated(version: string): Promise<boolean> {
  try {
    const [apiVersion] = await db
      .select({ deprecated: schema.apiVersions.deprecated })
      .from(schema.apiVersions)
      .where(eq(schema.apiVersions.id, version))
      .limit(1);

    return apiVersion?.deprecated || false;
  } catch (error) {
    logger.error("Failed to check if version is deprecated", {
      error: error instanceof Error ? error.message : String(error),
      version,
    });
    return false;
  }
}

/**
 * Get version sunset date (when it will be removed)
 */
export async function getVersionSunsetDate(version: string): Promise<Date | null> {
  try {
    const [apiVersion] = await db
      .select({ sunsetAt: schema.apiVersions.sunsetAt })
      .from(schema.apiVersions)
      .where(eq(schema.apiVersions.id, version))
      .limit(1);

    return apiVersion?.sunsetAt || null;
  } catch (error) {
    logger.error("Failed to get version sunset date", {
      error: error instanceof Error ? error.message : String(error),
      version,
    });
    return null;
  }
}

/**
 * Normalize version string
 * Converts various formats to standard format
 */
export function normalizeVersion(version: string): string {
  // Remove whitespace
  version = version.trim().toLowerCase();

  // Handle different formats
  if (version === "1" || version === "1.0" || version === "1.0.0") {
    return "v1";
  }

  // Ensure 'v' prefix
  if (!version.startsWith("v")) {
    version = `v${version}`;
  }

  return version;
}

/**
 * Clear version cache (useful after updating versions in database)
 */
export function clearVersionCache(): void {
  versionCache = null;
  logger.info("API version cache cleared");
}

/**
 * Initialize default API versions in database
 * Call this during app startup or migrations
 */
export async function initializeApiVersions(): Promise<void> {
  try {
    const existingVersions = await db
      .select()
      .from(schema.apiVersions);

    if (existingVersions.length === 0) {
      logger.info("Initializing default API versions");

      await db.insert(schema.apiVersions).values([
        {
          id: "v1",
          label: "Version 1.0",
          isCurrent: true,
          deprecated: false,
          releasedAt: new Date(),
          sunsetAt: null,
        },
        {
          id: "v1.0.0",
          label: "Version 1.0.0",
          isCurrent: false,
          deprecated: false,
          releasedAt: new Date(),
          sunsetAt: null,
        },
      ]);

      logger.info("Default API versions initialized");
      clearVersionCache();
    }
  } catch (error) {
    logger.error("Failed to initialize API versions", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
