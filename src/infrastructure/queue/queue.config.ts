import { Queue, QueueOptions } from "bullmq";
import { env } from "@/shared/config/env";

/**
 * BullMQ Queue Configuration
 *
 * Manages background job queues for async operations
 *
 * Note: Upstash Redis requires special configuration for BullMQ
 * We extract the connection details from the REST URL
 */

// Parse Upstash Redis connection from REST URL
// Format: https://your-redis.upstash.io -> your-redis.upstash.io:6379
const redisUrl = new URL(env.UPSTASH_REDIS_REST_URL);
/**
 * Queue names enum for type safety
 */
export enum QueueName {
  MEDIA_IPFS_PIN = "media-ipfs-pin",
  METADATA_IPFS_PIN = "metadata-ipfs-pin",
}


const defaultQueueOptions: QueueOptions = {
  connection: {
    host: redisUrl.hostname,
    port: 6379, // Upstash Redis port
    password: env.UPSTASH_REDIS_REST_TOKEN,
    tls: {
      rejectUnauthorized: false, // Upstash uses TLS
    },
    enableOfflineQueue: false,
    maxRetriesPerRequest: null, // Required for BullMQ
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: {
      age: 86400, // Keep completed jobs for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 604800, // Keep failed jobs for 7 days
    },
  },
};

/**
 * IPFS Media Pinning Queue
 */
export const mediaQueue = new Queue(QueueName.MEDIA_IPFS_PIN, defaultQueueOptions);

/**
 * IPFS Metadata Pinning Queue
 */
export const metadataQueue = new Queue(QueueName.METADATA_IPFS_PIN, defaultQueueOptions);


/**
 * Job data interfaces
 */
export interface MediaPinJobData {
  mediaId: string;
  url: string;
  fileName: string;
  mediaType: string;
}

export interface MetadataPinJobData {
  metadataId: string;
  metadata: Record<string, unknown>;
  name: string;
}
