import { Worker } from "bullmq";
import { PinataClient } from "@/infrastructure/services/pinata/pinata.client";
import { db, schema } from "@/infrastructure/database/client";
import { eq } from "drizzle-orm";
import { logger } from "@/shared/lib/utils/logger";
import type { MetadataPinJobData } from "../queue.config";
import { env } from "@/shared/config/env";

/**
 * Metadata IPFS Pinning Worker
 *
 * Background worker that pins metadata JSON to IPFS via Pinata
 */

const pinataClient = PinataClient.getInstance();

export const metadataWorker = new Worker<MetadataPinJobData>(
  "metadata-ipfs-pin",
  async (job) => {
    const { metadataId, metadata, name } = job.data;

    logger.info("Processing metadata IPFS pin job", { metadataId, name });

    try {
      // Upload JSON to Pinata
      const result = await pinataClient.uploadJSON(metadata, {
        name: `${name} - Metadata`,
        keyvalues: {
          metadataId,
          type: "nft-metadata",
          name,
          pinnedAt: new Date().toISOString(),
        },
      });

      // Update database with IPFS info
      await db
        .update(schema.metadata)
        .set({
          ipfsHash: result.hash,
          ipfsUrl: result.url,
          isPinned: true,
          pinnedAt: new Date(),
        })
        .where(eq(schema.metadata.id, metadataId));

      logger.info("Metadata pinned to IPFS successfully", {
        metadataId,
        ipfsHash: result.hash,
      });

      return {
        success: true,
        metadataId,
        ipfsHash: result.hash,
        ipfsUrl: result.url,
      };
    } catch (error) {
      logger.error("Failed to pin metadata to IPFS", {
        error: error instanceof Error ? error.message : String(error),
        metadataId,
      });

      throw error; // BullMQ will retry
    }
  },
  {
    connection: {
      host: new URL(env.UPSTASH_REDIS_REST_URL).hostname,
      port: 443,
      tls: {},
    },
    concurrency: 10, // Process 10 jobs concurrently (JSON is lightweight)
  }
);

metadataWorker.on("completed", (job) => {
  logger.info("Metadata IPFS pin job completed", {
    jobId: job.id,
    metadataId: job.data.metadataId,
  });
});

metadataWorker.on("failed", (job, error) => {
  logger.error("Metadata IPFS pin job failed", {
    jobId: job?.id,
    metadataId: job?.data.metadataId,
    error: error.message,
  });
});
