import { checkDbConnection } from "@/infrastructure/database/client";
import { ImageKitService } from "@/infrastructure/services/imagekit.service";
import { tryCatch } from "@/shared/lib/utils/server";

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
    const startTime = Date.now();
    const checkResult = await tryCatch(
      () => checkDbConnection(),
      {
        errorMessage: "Database health check failed",
        shouldLog: true,
      }
    );

    const responseTime = Date.now() - startTime;

    if (checkResult.success) {
      result.services.database = {
        status: checkResult.data ? "up" : "down",
        responseTime,
      };

      if (!checkResult.data) {
        result.status = "degraded";
      }
    } else {
      result.services.database = {
        status: "down",
        responseTime,
        error: checkResult.error.message,
      };
      result.status = "degraded";
    }
  }

  private async checkImageKit(result: HealthCheckResult): Promise<void> {
    const imageKitService = new ImageKitService();
    const startTime = Date.now();
    const checkResult = await tryCatch(
      () => imageKitService.healthCheck(),
      {
        errorMessage: "ImageKit health check failed",
        shouldLog: true,
      }
    );

    const responseTime = Date.now() - startTime;

    if (checkResult.success) {
      result.services.imagekit = {
        status: checkResult.data ? "up" : "down",
        responseTime,
      };

      if (!checkResult.data) {
        result.status = "degraded";
      }
    } else {
      result.services.imagekit = {
        status: "down",
        responseTime,
        error: checkResult.error.message,
      };
      result.status = "degraded";
    }
  }

  private async checkRedis(result: HealthCheckResult): Promise<void> {
    const startTime = Date.now();
    const checkResult = await tryCatch(
      async () => {
        const { RedisClient } = await import("@/infrastructure/cache/redis.client");
        const redis = RedisClient.getInstance();
        return await redis.ping();
      },
      {
        errorMessage: "Redis health check failed",
        shouldLog: true,
      }
    );

    const responseTime = Date.now() - startTime;

    if (checkResult.success) {
      result.services.redis = {
        status: checkResult.data ? "up" : "down",
        responseTime,
      };

      if (!checkResult.data) {
        result.status = "degraded";
      }
    } else {
      result.services.redis = {
        status: "down",
        responseTime,
        error: checkResult.error.message,
      };
      result.status = "degraded";
    }
  }

  private async checkPinata(result: HealthCheckResult): Promise<void> {
    const startTime = Date.now();
    const checkResult = await tryCatch(
      async () => {
        const { PinataClient } = await import("@/infrastructure/services/pinata/pinata.client");
        const pinata = PinataClient.getInstance();
        return await pinata.health();
      },
      {
        errorMessage: "Pinata health check failed",
        shouldLog: true,
      }
    );

    const responseTime = Date.now() - startTime;

    if (checkResult.success) {
      result.services.pinata = {
        status: checkResult.data ? "up" : "down",
        responseTime,
      };

      if (!checkResult.data) {
        result.status = "degraded";
      }
    } else {
      result.services.pinata = {
        status: "down",
        responseTime,
        error: checkResult.error.message,
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
