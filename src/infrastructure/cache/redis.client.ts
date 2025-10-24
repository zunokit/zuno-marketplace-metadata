import { Redis } from "@upstash/redis";
import { env } from "@/shared/config/env";
import { tryCatch } from "@/shared/lib/utils/server";

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
   * Get keys matching pattern
   */
  async keys(pattern: string): Promise<string[]> {
    const result = await tryCatch(() => this.client.keys(pattern), {
      errorMessage: `Redis KEYS error for pattern ${pattern}`,
      context: { pattern },
      shouldLog: true,
    });
    return result.success ? result.data : [];
  }

  /**
   * Delete keys matching pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    const result = await tryCatch(
      async () => {
        const keys = await this.keys(pattern);
        if (keys.length === 0) return 0;

        await this.client.del(...keys);
        return keys.length;
      },
      {
        errorMessage: `Redis DELETE PATTERN error for pattern ${pattern}`,
        context: { pattern },
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
