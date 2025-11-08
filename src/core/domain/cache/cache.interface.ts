/**
 * Cache Service Interface
 *
 * Domain-level abstraction for caching operations.
 * This allows use-cases to depend on an interface rather than
 * the concrete infrastructure implementation.
 */
export interface ICacheService {
  /**
   * Get cached value with automatic deserialization
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set cached value with automatic serialization and TTL
   */
  set<T>(key: string, value: T, ttl: number): Promise<boolean>;

  /**
   * Delete single cache key
   */
  delete(key: string): Promise<boolean>;

  /**
   * Invalidate all keys matching pattern
   */
  invalidatePattern(pattern: string): Promise<number>;

  /**
   * Invalidate all metadata caches (item + lists)
   */
  invalidateMetadata(id?: string): Promise<void>;

  /**
   * Invalidate all media caches (item + lists)
   */
  invalidateMedia(id?: string): Promise<void>;

  /**
   * Invalidate API key list cache for a user
   */
  invalidateApiKeys(userId: string): Promise<void>;

  /**
   * Get or set pattern (cache-aside pattern)
   *
   * This is a common caching pattern where:
   * 1. Try to get from cache
   * 2. If miss, fetch from source
   * 3. Store in cache
   * 4. Return value
   */
  getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number
  ): Promise<T>;
}
