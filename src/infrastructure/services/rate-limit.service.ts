import { RedisClient } from "@/infrastructure/cache/redis.client";
import { logger } from "@/shared/lib/utils/logger";
import { tryCatch } from "@/shared/lib/utils/server";
import type { ApiKey } from "@/infrastructure/database/drizzle/schema";

/**
 * Rate Limiting Service with Upstash Redis
 *
 * Implements tier-based rate limiting with hourly and daily limits
 * Uses Redis for fast, distributed rate limiting
 */

export enum RateLimitTier {
  PUBLIC = "public",
  FREE = "free",
  PRO = "pro",
  ENTERPRISE = "enterprise",
}

export interface RateLimitConfig {
  tier: RateLimitTier;
  limits: {
    requestsPerHour: number;
    requestsPerDay: number;
    burst?: number;
  };
  restrictions?: {
    ipWhitelist?: string[];
    allowedOrigins?: string[];
  };
}

export interface RateLimitResult {
  allowed: boolean;
  tier: RateLimitTier;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
  retryAfter?: number; // Seconds to wait
}

export class RateLimitError extends Error {
  constructor(message: string, public readonly result: RateLimitResult) {
    super(message);
    this.name = "RateLimitError";
  }
}

export class RateLimitService {
  private static redis = RedisClient.getInstance();

  /**
   * Get tier configuration
   */
  private static getTierConfig(tier: RateLimitTier): RateLimitConfig {
    const configs: Record<RateLimitTier, RateLimitConfig> = {
      [RateLimitTier.PUBLIC]: {
        tier: RateLimitTier.PUBLIC,
        limits: {
          requestsPerHour: 100,
          requestsPerDay: 1000,
        },
      },
      [RateLimitTier.FREE]: {
        tier: RateLimitTier.FREE,
        limits: {
          requestsPerHour: 500,
          requestsPerDay: 5000,
        },
      },
      [RateLimitTier.PRO]: {
        tier: RateLimitTier.PRO,
        limits: {
          requestsPerHour: 5000,
          requestsPerDay: 100000,
          burst: 100,
        },
      },
      [RateLimitTier.ENTERPRISE]: {
        tier: RateLimitTier.ENTERPRISE,
        limits: {
          requestsPerHour: Infinity,
          requestsPerDay: Infinity,
        },
      },
    };

    return configs[tier];
  }

  /**
   * Extract tier from API key metadata
   */
  private static getKeyTier(apiKey: Pick<ApiKey, "metadata">): RateLimitTier {
    const metadata = apiKey.metadata as { tier?: string; type?: string } | null;
    const tierOrType = metadata?.tier || metadata?.type;

    switch (tierOrType?.toLowerCase()) {
      case "public":
        return RateLimitTier.PUBLIC;
      case "free":
      case "personal":
        return RateLimitTier.FREE;
      case "pro":
      case "organization":
        return RateLimitTier.PRO;
      case "enterprise":
        return RateLimitTier.ENTERPRISE;
      default:
        return RateLimitTier.FREE;
    }
  }

  /**
   * Check if IP is in whitelist
   */
  private static isIpAllowed(ip: string, whitelist: string[]): boolean {
    if (whitelist.length === 0) return true;

    return whitelist.some((allowedIp) => {
      // Support CIDR notation (simplified)
      if (allowedIp.includes("/")) {
        const [network] = allowedIp.split("/");
        const networkPrefix = network.substring(0, network.lastIndexOf("."));
        return ip.startsWith(networkPrefix);
      }
      return ip === allowedIp;
    });
  }

  /**
   * Check if origin is allowed
   */
  private static isOriginAllowed(
    origin: string | undefined,
    allowedOrigins: string[]
  ): boolean {
    if (allowedOrigins.length === 0) return true;
    if (!origin) return false;

    return allowedOrigins.includes(origin);
  }

  /**
   * Generate Redis keys
   */
  private static getHourlyKey(apiKeyId: string): string {
    const now = new Date();
    const hour = now.toISOString().slice(0, 13); // YYYY-MM-DDTHH
    return `ratelimit:hourly:${apiKeyId}:${hour}`;
  }

  private static getDailyKey(apiKeyId: string): string {
    const now = new Date();
    const day = now.toISOString().slice(0, 10); // YYYY-MM-DD
    return `ratelimit:daily:${apiKeyId}:${day}`;
  }

  /**
   * Check rate limit for an API key
   */
  static async checkLimit(
    apiKey: Pick<ApiKey, "id" | "metadata" | "rateLimitEnabled">,
    request: {
      ip: string;
      origin?: string;
    }
  ): Promise<RateLimitResult> {
    const result = await tryCatch(
      async () => {
        // Get tier and config
        const tier = this.getKeyTier(apiKey);
        const config = this.getTierConfig(tier);

        // Check if rate limiting is explicitly disabled
        if (apiKey.rateLimitEnabled === false) {
          return {
            allowed: true,
            tier,
            limit: Infinity,
            remaining: Infinity,
            reset: 0,
          };
        }

        // Enterprise tier - unlimited
        if (tier === RateLimitTier.ENTERPRISE) {
          return {
            allowed: true,
            tier,
            limit: Infinity,
            remaining: Infinity,
            reset: 0,
          };
        }

        // Check IP whitelist
        const metadata = apiKey.metadata as { ipWhitelist?: string[]; allowedOrigins?: string[] } | null;
        if (metadata?.ipWhitelist) {
          if (!this.isIpAllowed(request.ip, metadata.ipWhitelist)) {
            const res: RateLimitResult = {
              allowed: false,
              tier,
              limit: 0,
              remaining: 0,
              reset: 0,
            };
            throw new RateLimitError("IP address not in whitelist", res);
          }
        }

        // Check origin restriction
        if (metadata?.allowedOrigins) {
          if (!this.isOriginAllowed(request.origin, metadata.allowedOrigins)) {
            const res: RateLimitResult = {
              allowed: false,
              tier,
              limit: 0,
              remaining: 0,
              reset: 0,
            };
            throw new RateLimitError("Origin not allowed", res);
          }
        }

        const now = Date.now();

        // Check hourly limit
        const hourlyKey = this.getHourlyKey(apiKey.id);
        const hourlyCount = await this.redis.incr(hourlyKey);

        // Set TTL on first request of the hour (1 hour)
        if (hourlyCount === 1) {
          await this.redis.expire(hourlyKey, 3600);
        }

        if (hourlyCount > config.limits.requestsPerHour) {
          const hourlyReset = Math.ceil(now / 1000 / 3600) * 3600;
          const res: RateLimitResult = {
            allowed: false,
            tier,
            limit: config.limits.requestsPerHour,
            remaining: 0,
            reset: hourlyReset,
            retryAfter: hourlyReset - Math.floor(now / 1000),
          };
          throw new RateLimitError("Hourly rate limit exceeded", res);
        }

        // Check daily limit
        const dailyKey = this.getDailyKey(apiKey.id);
        const dailyCount = await this.redis.incr(dailyKey);

        // Set TTL on first request of the day (24 hours)
        if (dailyCount === 1) {
          await this.redis.expire(dailyKey, 86400);
        }

        if (dailyCount > config.limits.requestsPerDay) {
          const dailyReset = Math.ceil(now / 1000 / 86400) * 86400;
          const res: RateLimitResult = {
            allowed: false,
            tier,
            limit: config.limits.requestsPerDay,
            remaining: 0,
            reset: dailyReset,
            retryAfter: dailyReset - Math.floor(now / 1000),
          };
          throw new RateLimitError("Daily rate limit exceeded", res);
        }

        // Success - return remaining counts
        const hourlyReset = Math.ceil(now / 1000 / 3600) * 3600;
        return {
          allowed: true,
          tier,
          limit: config.limits.requestsPerHour,
          remaining: config.limits.requestsPerHour - hourlyCount,
          reset: hourlyReset,
        };
      },
      {
        errorMessage: "Rate limit check failed, allowing request",
        context: { apiKeyId: apiKey.id },
        shouldLog: false,
      }
    );

    // If RateLimitError, rethrow it
    if (!result.success && result.error instanceof RateLimitError) {
      throw result.error;
    }

    // Success case
    if (result.success) {
      return result.data;
    }

    // Other errors - fail open (allow request)
    logger.error("Rate limit check failed, allowing request", {
      error: result.error.message,
      apiKeyId: apiKey.id,
    });

    return {
      allowed: true,
      tier: RateLimitTier.FREE,
      limit: 500,
      remaining: 500,
      reset: Math.ceil(Date.now() / 1000 / 3600) * 3600,
    };
  }

  /**
   * Get current usage stats for an API key
   */
  static async getUsageStats(apiKeyId: string): Promise<{
    hourly: { count: number; limit: number; reset: number };
    daily: { count: number; limit: number; reset: number };
  }> {
    const now = Date.now();

    const hourlyKey = this.getHourlyKey(apiKeyId);
    const dailyKey = this.getDailyKey(apiKeyId);

    const redis = this.redis.getClient();
    const [hourlyCount, dailyCount] = await Promise.all([
      redis.get<number>(hourlyKey),
      redis.get<number>(dailyKey),
    ]);

    const hourlyReset = Math.ceil(now / 1000 / 3600) * 3600;
    const dailyReset = Math.ceil(now / 1000 / 86400) * 86400;

    return {
      hourly: {
        count: hourlyCount || 0,
        limit: 500, // Default, should get from tier
        reset: hourlyReset,
      },
      daily: {
        count: dailyCount || 0,
        limit: 5000, // Default, should get from tier
        reset: dailyReset,
      },
    };
  }

  /**
   * Reset rate limits for an API key (admin function)
   */
  static async resetLimits(apiKeyId: string): Promise<void> {
    const hourlyKey = this.getHourlyKey(apiKeyId);
    const dailyKey = this.getDailyKey(apiKeyId);

    await Promise.all([
      this.redis.del(hourlyKey),
      this.redis.del(dailyKey),
    ]);

    logger.info(`Rate limits reset for API key: ${apiKeyId}`);
  }
}
