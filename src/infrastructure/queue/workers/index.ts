/**
 * Worker Registry
 *
 * Imports and initializes all BullMQ workers
 * Run this file to start processing background jobs
 */

import { logger } from "@/shared/lib/utils/logger";
import { metadataWorker } from "./metadata-ipfs-pin.worker";
import { mediaWorker } from "./media-ipfs-pin.worker";

// Export workers for graceful shutdown
export const workers = {
  metadataWorker,
  mediaWorker,
};

// Handle graceful shutdown
const shutdown = async () => {
  logger.info("Shutting down workers...");

  try {
    await Promise.all([
      metadataWorker.close(),
      mediaWorker.close(),
    ]);

    logger.info("All workers shut down successfully");
    process.exit(0);
  } catch (error) {
    logger.error("Error during worker shutdown", { error });
    process.exit(1);
  }
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

logger.info("Workers initialized and running", {
  workers: Object.keys(workers),
});

// Keep process alive
process.stdin.resume();
