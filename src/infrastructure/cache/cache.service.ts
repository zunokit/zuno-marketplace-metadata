import { RedisClient } from "./redis.client";
import { logger } from "@/shared/lib/utils/logger";
import type { ICacheService } from "@/core/domain/cache/cache.interface";

/**
 * Cache Service
 *
 * Senior-level caching implementation with:
 * - Type-safe cache key management
 * - Automatic serialization/deserialization
 * - TTL management
 * - Cache invalidation patterns
 * - Namespace isolation
 */

// Cache TTL constants (in seconds)
export const CacheTTL = {
  METADATA_ITEM: 60 * 5, // 5 minutes - frequently accessed
  METADATA_LIST: 60 * 2, // 2 minutes - changes more often
  MEDIA_ITEM: 60 * 10, // 10 minutes - rarely changes
  MEDIA_LIST: 60 * 2, // 2 minutes
  API_KEY_LIST: 60 * 5, // 5 minutes
  API_VERSION: 60 * 15, // 15 minutes - rarely changes
} as const;

// Cache key prefixes for namespace isolation
export const CachePrefix = {
  METADATA: "metadata",
  MEDIA: "media",
  API_KEY: "apikey",
  API_VERSION: "apiversion",
} as const;

type CachePrefixType = typeof CachePrefix[keyof typeof CachePrefix];

/**
 * Type-safe cache key builder
 */
export class CacheKeyBuilder {
  /**
   * Build cache key for single metadata item
   */
  static metadata(id: string): string {
    return `${CachePrefix.METADATA}:item:${id}`;
  }

  /**
   * Build cache key for metadata list with query params
   */
  static metadataList(params: {
    page?: number;
    limit?: number;
    search?: string;
  }): string {
    const queryString = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null)
      .sort(([a], [b]) => a.localeCompare(b)) // Consistent ordering
      .map(([key, value]) => `${key}:${value}`)
      .join("_");

    return `${CachePrefix.METADATA}:list:${queryString || "default"}`;
  }

  /**
   * Build cache key for single media item
   */
  static media(id: string): string {
    return `${CachePrefix.MEDIA}:item:${id}`;
  }

  /**
   * Build cache key for media list with query params
   */
  static mediaList(params: {
    page?: number;
    limit?: number;
    search?: string;
    mediaType?: string;
  }): string {
    const queryString = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`)
      .join("_");

    return `${CachePrefix.MEDIA}:list:${queryString || "default"}`;
  }

  /**
   * Build cache key for API key list
   */
  static apiKeyList(userId: string): string {
    return `${CachePrefix.API_KEY}:list:${userId}`;
  }

  /**
   * Build pattern for invalidating all items of a type
   */
  static pattern(prefix: CachePrefixType): string {
    return `${prefix}:*`;
  }

  /**
   * Build pattern for invalidating all lists of a type
   */
  static listPattern(prefix: CachePrefixType): string {
    return `${prefix}:list:*`;
  }
}

/**
 * High-level cache service with business logic
 * Implements ICacheService interface for dependency inversion
 */
export class CacheService implements ICacheService {
  private readonly redis: RedisClient;

  constructor() {
    this.redis = RedisClient.getInstance();
  }

  /**
   * Get cached value with automatic deserialization
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get<T>(key);

      if (value !== null) {
        logger.debug("Cache HIT", { key });
      } else {
        logger.debug("Cache MISS", { key });
      }

      return value;
    } catch (error) {
      logger.error("Cache GET error", { key, error: String(error) });
      return null; // Graceful degradation
    }
  }

  /**
   * Set cached value with automatic serialization and TTL
   */
  async set<T>(key: string, value: T, ttl: number): Promise<boolean> {
    try {
      const success = await this.redis.set(key, value, ttl);

      if (success) {
        logger.debug("Cache SET", { key, ttl });
      } else {
        logger.warn("Cache SET failed", { key });
      }

      return success;
    } catch (error) {
      logger.error("Cache SET error", { key, error: String(error) });
      return false; // Graceful degradation
    }
  }

  /**
   * Delete single cache key
   */
  async delete(key: string): Promise<boolean> {
    try {
      const success = await this.redis.del(key);
      logger.debug("Cache DELETE", { key, success });
      return success;
    } catch (error) {
      logger.error("Cache DELETE error", { key, error: String(error) });
      return false;
    }
  }

  /**
   * Invalidate all keys matching pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    try {
      const count = await this.redis.deletePattern(pattern);
      logger.info("Cache INVALIDATE pattern", { pattern, count });
      return count;
    } catch (error) {
      logger.error("Cache INVALIDATE error", { pattern, error: String(error) });
      return 0;
    }
  }

  /**
   * Invalidate all metadata caches (item + lists)
   */
  async invalidateMetadata(id?: string): Promise<void> {
    if (id) {
      // Invalidate specific item
      await this.delete(CacheKeyBuilder.metadata(id));
    }

    // Always invalidate all list caches when metadata changes
    await this.invalidatePattern(CacheKeyBuilder.listPattern(CachePrefix.METADATA));

    logger.info("Invalidated metadata cache", { id });
  }

  /**
   * Invalidate all media caches (item + lists)
   */
  async invalidateMedia(id?: string): Promise<void> {
    if (id) {
      // Invalidate specific item
      await this.delete(CacheKeyBuilder.media(id));
    }

    // Always invalidate all list caches when media changes
    await this.invalidatePattern(CacheKeyBuilder.listPattern(CachePrefix.MEDIA));

    logger.info("Invalidated media cache", { id });
  }

  /**
   * Invalidate API key list cache for a user
   */
  async invalidateApiKeys(userId: string): Promise<void> {
    await this.delete(CacheKeyBuilder.apiKeyList(userId));
    logger.info("Invalidated API key cache", { userId });
  }

  /**
   * Get or set pattern (cache-aside pattern)
   *
   * This is a common caching pattern where:
   * 1. Try to get from cache
   * 2. If miss, fetch from source
   * 3. Store in cache
   * 4. Return value
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number
  ): Promise<T> {
    // Try cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - fetch from source
    const value = await fetcher();

    // Store in cache (fire and forget - don't await)
    void this.set(key, value, ttl);

    return value;
  }

  /**
   * Health check for cache
   */
  async health(): Promise<boolean> {
    try {
      return await this.redis.ping();
    } catch (error) {
      logger.error("Cache health check failed", { error: String(error) });
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(prefix: CachePrefixType): Promise<{
    totalKeys: number;
    keys: string[];
  }> {
    try {
      const pattern = CacheKeyBuilder.pattern(prefix);
      const keys = await this.redis.keys(pattern);

      return {
        totalKeys: keys.length,
        keys: keys.slice(0, 100), // Limit to first 100 for performance
      };
    } catch (error) {
      logger.error("Cache stats error", { prefix, error: String(error) });
      return { totalKeys: 0, keys: [] };
    }
  }
}
