import { Worker } from "bullmq";
import { PinataClient } from "@/infrastructure/services/pinata/pinata.client";
import { PINATA_GROUPS } from "@/infrastructure/services/pinata/pinata.constants";
import { db, schema } from "@/infrastructure/database/client";
import { eq } from "drizzle-orm";
import { logger } from "@/shared/lib/utils/logger";
import { MetadataPinJobData, QueueName } from "../queue.config";
import { env } from "@/shared/config/env";
import { tryCatch } from "@/shared/lib/utils/server";
import { getCurrentApiVersion } from "@/shared/lib/utils/api-version";

/**
 * Metadata IPFS Pinning Worker
 *
 * Background worker that pins metadata JSON to IPFS via Pinata
 */

const pinataClient = PinataClient.getInstance();

export const metadataWorker = new Worker<MetadataPinJobData>(
  QueueName.METADATA_IPFS_PIN,
  async (job) => {
    const { metadataId, metadata, name } = job.data;

    logger.info("Processing metadata IPFS pin job", { metadataId, name });

    const result = await tryCatch(
      async () => {
        // Get current API version
        const apiVersion = await getCurrentApiVersion();

        // Upload JSON to Pinata with unique filename: name-version-random.json
        const pinResult = await pinataClient.uploadJSON(metadata, {
          name: `${name}-Metadata`,
          version: apiVersion,
          groupName: PINATA_GROUPS.METADATA,
          keyvalues: {
            metadataId,
            type: "nft-metadata",
            name,
            apiVersion,
            pinnedAt: new Date().toISOString(),
          },
        });

        // Update database with IPFS info
        await db
          .update(schema.metadata)
          .set({
            ipfsHash: pinResult.hash,
            ipfsUrl: pinResult.url,
            isPinned: true,
            pinnedAt: new Date(),
          })
          .where(eq(schema.metadata.id, metadataId));

        logger.info("Metadata pinned to IPFS successfully", {
          metadataId,
          ipfsHash: pinResult.hash,
        });

        return {
          success: true,
          metadataId,
          ipfsHash: pinResult.hash,
          ipfsUrl: pinResult.url,
        };
      },
      {
        errorMessage: "Failed to pin metadata to IPFS",
        context: { metadataId },
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
      port: 6379, // Upstash Redis port
      password: env.UPSTASH_REDIS_REST_TOKEN,
      tls: {
        rejectUnauthorized: false,
      },
      enableOfflineQueue: false,
      maxRetriesPerRequest: null,
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
