import { Worker } from "bullmq";
import { PinataClient } from "@/infrastructure/services/pinata/pinata.client";
import { db, schema } from "@/infrastructure/database/client";
import { eq } from "drizzle-orm";
import { logger } from "@/shared/lib/utils/logger";
import type { MediaPinJobData } from "../queue.config";
import { env } from "@/shared/config/env";
import { tryCatch } from "@/shared/lib/utils";

/**
 * Media IPFS Pinning Worker
 *
 * Background worker that pins media files to IPFS via Pinata
 */

const pinataClient = PinataClient.getInstance();

export const mediaWorker = new Worker<MediaPinJobData>(
  "media-ipfs-pin",
  async (job) => {
    const { mediaId, url, fileName, mediaType } = job.data;

    logger.info("Processing media IPFS pin job", { mediaId, fileName });

    const result = await tryCatch(
      async () => {
        // Fetch the file from ImageKit URL
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch media: ${response.statusText}`);
        }

        const blob = await response.blob();
        const file = new File([blob], fileName, { type: blob.type });

        // Upload to Pinata
        const pinResult = await pinataClient.uploadFile(file, {
          name: fileName,
          keyvalues: {
            mediaId,
            mediaType,
            originalUrl: url,
            pinnedAt: new Date().toISOString(),
          },
        });

        // Update database with IPFS info
        await db
          .update(schema.media)
          .set({
            ipfsHash: pinResult.hash,
            ipfsUrl: pinResult.url,
          })
          .where(eq(schema.media.id, mediaId));

        logger.info("Media pinned to IPFS successfully", {
          mediaId,
          ipfsHash: pinResult.hash,
        });

        return {
          success: true,
          mediaId,
          ipfsHash: pinResult.hash,
          ipfsUrl: pinResult.url,
        };
      },
      {
        errorMessage: "Failed to pin media to IPFS",
        context: { mediaId },
      }
    );

    if (!result.success) {
      throw result.error; // BullMQ will retry
    }

    return result.data;
  },
  {
    connection: {
      host: new URL(env.UPSTASH_REDIS_REST_URL).hostname,
      port: 443,
      tls: {},
    },
    concurrency: 5, // Process 5 jobs concurrently
  }
);

mediaWorker.on("completed", (job) => {
  logger.info("Media IPFS pin job completed", {
    jobId: job.id,
    mediaId: job.data.mediaId,
  });
});

mediaWorker.on("failed", (job, error) => {
  logger.error("Media IPFS pin job failed", {
    jobId: job?.id,
    mediaId: job?.data.mediaId,
    error: error.message,
  });
});
