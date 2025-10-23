import { Queue, QueueOptions } from "bullmq";
import { RedisClient } from "@/infrastructure/cache/redis.client";
import { env } from "@/shared/config/env";

/**
 * BullMQ Queue Configuration
 *
 * Manages background job queues for async operations
 */

// Redis connection for BullMQ
const connection = {
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
};

const defaultQueueOptions: QueueOptions = {
  connection: {
    host: new URL(env.UPSTASH_REDIS_REST_URL).hostname,
    port: 443,
    tls: {},
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
export const mediaQueue = new Queue("media-ipfs-pin", defaultQueueOptions);

/**
 * IPFS Metadata Pinning Queue
 */
export const metadataQueue = new Queue("metadata-ipfs-pin", defaultQueueOptions);

/**
 * Queue names enum for type safety
 */
export enum QueueName {
  MEDIA_IPFS_PIN = "media-ipfs-pin",
  METADATA_IPFS_PIN = "metadata-ipfs-pin",
}

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
