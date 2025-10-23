import { checkDbConnection } from "@/infrastructure/database/client";
import { ImageKitService } from "@/infrastructure/services/imagekit.service";
import { logger } from "@/shared/lib/utils/logger";

export interface ServiceHealth {
  status: "up" | "down";
  responseTime?: number;
  error?: string;
}

export interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  services: {
    database: ServiceHealth;
    imagekit: ServiceHealth;
    redis: ServiceHealth;
    pinata: ServiceHealth;
  };
  uptime: number;
}

/**
 * Health Check Use Case
 * Handles the business logic for checking system health
 */
export class HealthCheckUseCase {
  async execute(): Promise<HealthCheckResult> {
    const result: HealthCheckResult = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "v1.0.0",
      services: {
        database: { status: "down" },
        imagekit: { status: "down" },
        redis: { status: "down" },
        pinata: { status: "down" },
      },
      uptime: process.uptime(),
    };

    // Check all services in parallel for better performance
    await Promise.allSettled([
      this.checkDatabase(result),
      this.checkImageKit(result),
      this.checkRedis(result),
      this.checkPinata(result),
    ]);

    // Determine overall status
    this.determineOverallStatus(result);

    return result;
  }

  private async checkDatabase(result: HealthCheckResult): Promise<void> {
    try {
      const startTime = Date.now();
      const isHealthy = await checkDbConnection();
      const responseTime = Date.now() - startTime;

      result.services.database = {
        status: isHealthy ? "up" : "down",
        responseTime,
      };

      if (!isHealthy) {
        result.status = "degraded";
      }
    } catch (error) {
      logger.error("Database health check failed", { error });
      result.services.database = {
        status: "down",
        error: error instanceof Error ? error.message : String(error),
      };
      result.status = "degraded";
    }
  }

  private async checkImageKit(result: HealthCheckResult): Promise<void> {
    try {
      const imageKitService = new ImageKitService();
      const startTime = Date.now();
      const isHealthy = await imageKitService.healthCheck();
      const responseTime = Date.now() - startTime;

      result.services.imagekit = {
        status: isHealthy ? "up" : "down",
        responseTime,
      };

      if (!isHealthy) {
        result.status = "degraded";
      }
    } catch (error) {
      logger.error("ImageKit health check failed", { error });
      result.services.imagekit = {
        status: "down",
        error: error instanceof Error ? error.message : String(error),
      };
      result.status = "degraded";
    }
  }

  private async checkRedis(result: HealthCheckResult): Promise<void> {
    try {
      const { RedisClient } = await import("@/infrastructure/cache/redis.client");
      const redis = RedisClient.getInstance();
      const startTime = Date.now();
      const isHealthy = await redis.ping();
      const responseTime = Date.now() - startTime;

      result.services.redis = {
        status: isHealthy ? "up" : "down",
        responseTime,
      };

      if (!isHealthy) {
        result.status = "degraded";
      }
    } catch (error) {
      logger.error("Redis health check failed", { error });
      result.services.redis = {
        status: "down",
        error: error instanceof Error ? error.message : String(error),
      };
      result.status = "degraded";
    }
  }

  private async checkPinata(result: HealthCheckResult): Promise<void> {
    try {
      const { PinataClient } = await import("@/infrastructure/services/pinata/pinata.client");
      const pinata = PinataClient.getInstance();
      const startTime = Date.now();
      const isHealthy = await pinata.health();
      const responseTime = Date.now() - startTime;

      result.services.pinata = {
        status: isHealthy ? "up" : "down",
        responseTime,
      };

      if (!isHealthy) {
        result.status = "degraded";
      }
    } catch (error) {
      logger.error("Pinata health check failed", { error });
      result.services.pinata = {
        status: "down",
        error: error instanceof Error ? error.message : String(error),
      };
      result.status = "degraded";
    }
  }

  private determineOverallStatus(result: HealthCheckResult): void {
    const allServicesDown = Object.values(result.services).every(
      (service) => service.status === "down"
    );

    if (allServicesDown) {
      result.status = "unhealthy";
    }
  }
}
