import { ApiWrapper } from "@/shared/lib/api/api-handler";
import { HealthCheckUseCase } from "@/core/use-cases/health/health-check.use-case";
import { logger } from "@/shared/lib/utils/logger";

/**
 * GET /api/health - Health check endpoint
 */
export const GET = ApiWrapper.create(
  async (input, context) => {
    const startTime = Date.now();

    logger.info("Health check requested", {
      requestId: context.requestId,
    });

    // Execute use case
    const healthCheckUseCase = new HealthCheckUseCase();
    const result = await healthCheckUseCase.execute();

    const totalTime = Date.now() - startTime;

    logger.info("Health check completed", {
      status: result.status,
      totalTime,
      services: result.services,
    });

    return result;
  },
  {
    auth: {
      required: false, // Health checks should be publicly accessible
    },
  }
);

