import { NextRequest, NextResponse } from "next/server";
import { ApiWrapper } from "@/shared/lib/api/api-handler";
import { checkDbConnection } from "@/infrastructure/database/client";
import { ImageKitService } from "@/infrastructure/services/imagekit.service";
import { logger } from "@/shared/lib/utils/logger";

interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  services: {
    database: {
      status: "up" | "down";
      responseTime?: number;
    };
    imagekit: {
      status: "up" | "down";
      responseTime?: number;
    };
  };
  uptime: number;
}

/**
 * GET /api/health - Health check endpoint
 */
export const GET = ApiWrapper.create(
  async (input, context) => {
    const startTime = Date.now();

    logger.info("Health check requested", {
      requestId: context.requestId,
    });

    const result: HealthCheckResult = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "v1.0.0",
      services: {
        database: { status: "down" },
        imagekit: { status: "down" },
      },
      uptime: process.uptime(),
    };

    // Check database connection
    try {
      const dbStart = Date.now();
      const dbHealthy = await checkDbConnection();
      const dbTime = Date.now() - dbStart;

      result.services.database = {
        status: dbHealthy ? "up" : "down",
        responseTime: dbTime,
      };

      if (!dbHealthy) {
        result.status = "degraded";
      }
    } catch (error) {
      logger.error("Database health check failed", { error });
      result.services.database.status = "down";
      result.status = "degraded";
    }

    // Check ImageKit service
    try {
      const imageKitService = new ImageKitService();
      const imageKitStart = Date.now();
      const imageKitHealthy = await imageKitService.healthCheck();
      const imageKitTime = Date.now() - imageKitStart;

      result.services.imagekit = {
        status: imageKitHealthy ? "up" : "down",
        responseTime: imageKitTime,
      };

      if (!imageKitHealthy) {
        result.status = "degraded";
      }
    } catch (error) {
      logger.error("ImageKit health check failed", { error });
      result.services.imagekit.status = "down";
      result.status = "degraded";
    }

    // Determine overall status
    const allServicesDown = Object.values(result.services).every(service => service.status === "down");
    if (allServicesDown) {
      result.status = "unhealthy";
    }

    const totalTime = Date.now() - startTime;

    logger.info("Health check completed", {
      status: result.status,
      totalTime,
      services: result.services,
    });

    // Return appropriate HTTP status code
    const httpStatus = result.status === "healthy" ? 200
                     : result.status === "degraded" ? 200
                     : 503;

    return result;
  },
  {
    auth: {
      required: false, // Health checks should be publicly accessible
    },
  }
);

// Simple GET handler for basic monitoring
export async function GET_SIMPLE(request: NextRequest) {
  try {
    const isDbHealthy = await checkDbConnection();

    if (isDbHealthy) {
      return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
    } else {
      return NextResponse.json(
        { status: "error", message: "Database connection failed" },
        { status: 503 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: "Health check failed" },
      { status: 503 }
    );
  }
}