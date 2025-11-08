import { Redis } from "@upstash/redis";
import { env } from "@/shared/config/env";
import { tryCatch } from "@/shared/lib/utils/server";
import { logger } from "@/shared/lib/utils/logger";

export const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

/**
 * Redis Client with error handling and utilities
 * Singleton pattern for connection reuse
 */
export class RedisClient {
  private static instance: RedisClient;
  private client: Redis;

  private constructor() {
    this.client = redis;
  }

  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  /**
   * Set value with optional TTL
   */
  async set(key: string, value: unknown, ttl?: number): Promise<boolean> {
    const result = await tryCatch(
      async () => {
        if (ttl) {
          await this.client.setex(key, ttl, JSON.stringify(value));
        } else {
          await this.client.set(key, JSON.stringify(value));
        }
        return true;
      },
      {
        errorMessage: `Redis SET error for key ${key}`,
        context: { key, ttl },
        shouldLog: true,
      }
    );

    return result.success ? result.data : false;
  }

  /**
   * Get value with JSON parsing
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    const result = await tryCatch(
      async () => {
        const value = await this.client.get(key);
        if (!value) return null;

        // Upstash Redis may return parsed JSON or string
        if (typeof value === "object") {
          return value as T;
        }

        if (typeof value === "string") {
          return JSON.parse(value) as T;
        }

        console.warn(`Unexpected Redis value type for key ${key}:`, typeof value);
        return null;
      },
      {
        errorMessage: `Redis GET error for key ${key}`,
        context: { key },
        shouldLog: true,
      }
    );

    return result.success ? result.data : null;
  }

  /**
   * Delete key
   */
  async del(key: string): Promise<boolean> {
    const result = await tryCatch(() => this.client.del(key), {
      errorMessage: `Redis DEL error for key ${key}`,
      context: { key },
      shouldLog: true,
    });
    return result.success;
  }

  /**
   * Increment counter (atomic)
   */
  async incr(key: string): Promise<number> {
    const result = await tryCatch(() => this.client.incr(key), {
      errorMessage: `Redis INCR error for key ${key}`,
      context: { key },
      shouldLog: true,
    });
    return result.success ? result.data : 0;
  }

  /**
   * Set expiration time
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    const result = await tryCatch(() => this.client.expire(key, seconds), {
      errorMessage: `Redis EXPIRE error for key ${key}`,
      context: { key, seconds },
      shouldLog: true,
    });
    return result.success;
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const result = await tryCatch(
      async () => {
        const res = await this.client.exists(key);
        return res === 1;
      },
      {
        errorMessage: `Redis EXISTS error for key ${key}`,
        context: { key },
        shouldLog: true,
      }
    );
    return result.success ? result.data : false;
  }

  /**
   * Get TTL for key
   */
  async ttl(key: string): Promise<number> {
    const result = await tryCatch(() => this.client.ttl(key), {
      errorMessage: `Redis TTL error for key ${key}`,
      context: { key },
      shouldLog: true,
    });
    return result.success ? result.data : -1;
  }

  /**
   * Get keys matching pattern using SCAN (non-blocking)
   *
   * SCAN is production-safe and doesn't block Redis.
   * Use this instead of KEYS for pattern matching in production.
   *
   * @param pattern - Redis pattern (e.g., "cache:*")
   * @param count - Number of keys to scan per iteration (default: 100)
   * @returns Array of matching keys
   */
  async scan(pattern: string, count = 100): Promise<string[]> {
    const result = await tryCatch(
      async () => {
        const keys: string[] = [];
        let cursor: string | number = 0;

        do {
          // Upstash scan returns [cursor, keys]
          const scanResult: [string | number, string[]] = await this.client.scan(cursor, {
            match: pattern,
            count,
          });

          cursor = scanResult[0];
          const batch = scanResult[1];

          if (batch && batch.length > 0) {
            keys.push(...batch);
          }

          // Continue until cursor is "0" (scan complete)
        } while (cursor !== 0 && cursor !== "0");

        return keys;
      },
      {
        errorMessage: `Redis SCAN error for pattern ${pattern}`,
        context: { pattern, count },
        shouldLog: true,
      }
    );

    return result.success ? result.data : [];
  }

  /**
   * Get keys matching pattern (DEPRECATED - blocking)
   *
   * @deprecated Use scan() instead. KEYS blocks Redis in production.
   * @param pattern - Redis pattern
   * @returns Array of matching keys
   */
  async keys(pattern: string): Promise<string[]> {
    logger.warn("KEYS command is deprecated and blocks Redis. Use scan() instead.", {
      pattern,
    });

    const result = await tryCatch(() => this.client.keys(pattern), {
      errorMessage: `Redis KEYS error for pattern ${pattern}`,
      context: { pattern },
      shouldLog: true,
    });
    return result.success ? result.data : [];
  }

  /**
   * Delete keys matching pattern using SCAN (non-blocking)
   *
   * Uses SCAN instead of KEYS to avoid blocking Redis.
   * Deletes keys in batches for better performance.
   *
   * @param pattern - Redis pattern (e.g., "cache:*")
   * @param batchSize - Number of keys to delete per batch (default: 100)
   * @returns Number of keys deleted
   */
  async deletePattern(pattern: string, batchSize = 100): Promise<number> {
    const result = await tryCatch(
      async () => {
        let totalDeleted = 0;
        let cursor: string | number = 0;

        do {
          // Scan for matching keys
          const scanResult: [string | number, string[]] = await this.client.scan(cursor, {
            match: pattern,
            count: batchSize,
          });

          cursor = scanResult[0];
          const keys = scanResult[1];

          // Delete batch if keys found
          if (keys && keys.length > 0) {
            await this.client.del(...keys);
            totalDeleted += keys.length;
          }

          // Continue until cursor is "0"
        } while (cursor !== 0 && cursor !== "0");

        return totalDeleted;
      },
      {
        errorMessage: `Redis DELETE PATTERN error for pattern ${pattern}`,
        context: { pattern, batchSize },
        shouldLog: true,
      }
    );

    return result.success ? result.data : 0;
  }

  /**
   * Flush all keys (use with caution)
   */
  async flushAll(): Promise<boolean> {
    const result = await tryCatch(() => this.client.flushall(), {
      errorMessage: "Redis FLUSHALL error",
      shouldLog: true,
    });
    return result.success;
  }

  /**
   * Health check
   */
  async ping(): Promise<boolean> {
    const result = await tryCatch(
      async () => {
        const res = await this.client.ping();
        return res === "PONG";
      },
      {
        errorMessage: "Redis PING error",
        shouldLog: true,
      }
    );
    return result.success ? result.data : false;
  }

  /**
   * Get raw Redis client for advanced operations
   */
  getClient(): Redis {
    return this.client;
  }
}
