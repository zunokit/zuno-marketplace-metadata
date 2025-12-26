import { RedisClient } from "./redis.client";
import { logger } from "@/shared/lib/utils/logger";
import { tryCatch } from "@/shared/lib/utils/server";

/**
 * Sentry Issue Deduplication Service
 *
 * Stores Sentry fingerprints in Redis to prevent duplicate GitHub issues
 */

const FINGERPRINT_PREFIX = "sentry:fingerprint:";
const FINGERPRINT_TTL = 30 * 24 * 60 * 60; // 30 days in seconds

export interface IssueReference {
  issueNumber: number;
  issueUrl: string;
  createdAt: string;
}

export class SentryDedupService {
  private static get redis(): RedisClient {
    return RedisClient.getInstance();
  }

  /**
   * Check if issue exists for fingerprint
   */
  static async getIssue(fingerprint: string): Promise<IssueReference | null> {
    return await this.redis.get<IssueReference>(`${FINGERPRINT_PREFIX}${fingerprint}`);
  }

  /**
   * Store fingerprint with issue reference
   */
  static async storeFingerprint(
    fingerprint: string,
    issueRef: IssueReference
  ): Promise<void> {
    const success = await this.redis.set(
      `${FINGERPRINT_PREFIX}${fingerprint}`,
      issueRef,
      FINGERPRINT_TTL
    );

    if (!success) {
      throw new Error("Failed to store fingerprint in Redis");
    }

    logger.debug("Stored fingerprint for deduplication", {
      fingerprint,
      issueNumber: issueRef.issueNumber,
    });
  }

  /**
   * Delete fingerprint (for cleanup/testing)
   */
  static async deleteFingerprint(fingerprint: string): Promise<void> {
    const success = await this.redis.del(`${FINGERPRINT_PREFIX}${fingerprint}`);

    if (!success) {
      throw new Error("Failed to delete fingerprint from Redis");
    }
  }
}
