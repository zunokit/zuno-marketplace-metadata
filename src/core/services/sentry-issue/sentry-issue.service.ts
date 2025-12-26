import { logger } from "@/shared/lib/utils/logger";
import { tryCatch } from "@/shared/lib/utils/server";
import type { SentryIssue, CreatedIssue } from "./sentry-issue.entity";
import {
  getFingerprint,
  getErrorTitle,
  getStackTrace,
  getRequestContext,
  type SentryWebhookPayload,
} from "@/shared/lib/utils/sentry-helpers";

/**
 * Sentry Issue Service
 *
 * Business logic for creating GitHub issues from Sentry errors
 */

export class SentryIssueService {
  /**
   * Process Sentry webhook and create GitHub issue
   *
   * This method is called asynchronously from the webhook handler
   */
  static async processWebhook(
    payload: SentryWebhookPayload,
    requestId: string
  ): Promise<CreatedIssue | null> {
    const result = await tryCatch(
      async () => {
        // 1. Extract error data
        const issue: SentryIssue = {
          fingerprint: getFingerprint(payload),
          eventId: payload.event_id,
          title: getErrorTitle(payload),
          message: payload.message || "No message",
          stackTrace: getStackTrace(payload),
          requestContext: getRequestContext(payload),
          tags: payload.tags || {},
          environment: payload.environment,
          sentryUrl: payload.url || "",
        };

        // 2. Check for existing issue (deduplication)
        const existingIssue = await this.checkExistingIssue(issue.fingerprint);
        if (existingIssue) {
          logger.info("Issue already exists, skipping creation", {
            requestId,
            fingerprint: issue.fingerprint,
            issueNumber: existingIssue.issueNumber,
          });
          return existingIssue;
        }

        // 3. Create GitHub issue
        const createdIssue = await this.createGitHubIssue(issue);

        // 4. Store fingerprint for deduplication
        await this.storeFingerprint(issue.fingerprint, createdIssue);

        logger.info("Created GitHub issue from Sentry error", {
          requestId,
          issueNumber: createdIssue.issueNumber,
          fingerprint: issue.fingerprint,
        });

        return createdIssue;
      },
      {
        errorMessage: "Failed to process Sentry webhook",
        context: { requestId, eventId: payload.event_id },
        shouldLog: true,
      }
    );

    return result.success ? result.data : null;
  }

  /**
   * Check if issue already exists for this fingerprint
   */
  private static async checkExistingIssue(
    fingerprint: string
  ): Promise<CreatedIssue | null> {
    // TODO: Implement in Phase 03 (GitHub Integration)
    return null;
  }

  /**
   * Create GitHub issue
   */
  private static async createGitHubIssue(
    issue: SentryIssue
  ): Promise<CreatedIssue> {
    // TODO: Implement in Phase 03 (GitHub Integration)
    throw new Error("Not implemented");
  }

  /**
   * Store fingerprint for deduplication
   */
  private static async storeFingerprint(
    fingerprint: string,
    createdIssue: CreatedIssue
  ): Promise<void> {
    // TODO: Implement in Phase 03 (GitHub Integration)
  }
}
