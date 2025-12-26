import { logger } from "@/shared/lib/utils/logger";
import { env } from "@/shared/config/env";
import { tryCatch } from "@/shared/lib/utils/server";
import { GitHubClient } from "@/infrastructure/github/github-client";
import { SentryDedupService } from "@/infrastructure/cache/sentry-dedup.service";
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
        // Only process production errors
        if (payload.environment !== "production") {
          logger.debug("Skipping non-production event", {
            requestId,
            environment: payload.environment,
          });
          return null;
        }

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
    const issueRef = await SentryDedupService.getIssue(fingerprint);
    if (!issueRef) return null;

    return {
      issueNumber: issueRef.issueNumber,
      issueUrl: issueRef.issueUrl,
      fingerprint,
    };
  }

  /**
   * Create GitHub issue
   */
  private static async createGitHubIssue(
    issue: SentryIssue
  ): Promise<CreatedIssue> {
    const labels = env.GITHUB_ISSUE_LABEL?.split(",") || ["sentry", "error"];
    const result = await GitHubClient.createIssue({
      title: this.formatTitle(issue),
      body: this.formatBody(issue),
      labels,
    });

    return {
      issueNumber: result.number,
      issueUrl: result.html_url,
      fingerprint: issue.fingerprint,
    };
  }

  /**
   * Store fingerprint for deduplication
   */
  private static async storeFingerprint(
    fingerprint: string,
    createdIssue: CreatedIssue
  ): Promise<void> {
    await SentryDedupService.storeFingerprint(fingerprint, {
      issueNumber: createdIssue.issueNumber,
      issueUrl: createdIssue.issueUrl,
      createdAt: new Date().toISOString(),
    });
  }

  /**
   * Format issue title
   */
  private static formatTitle(issue: SentryIssue): string {
    const maxLength = 60;
    let title = `🚨 ${issue.title}`;

    if (title.length > maxLength) {
      title = title.substring(0, maxLength - 3) + "...";
    }

    return title;
  }

  /**
   * Format issue body with markdown
   */
  private static formatBody(issue: SentryIssue): string {
    return `
## 🚨 Production Error from Sentry

**Fingerprint**: \`${issue.fingerprint}\`
**Environment**: ${issue.environment}
**Event ID**: ${issue.eventId}

### Error
\`\`\`
${this.escapeMarkdown(issue.message)}
\`\`\`

### Stack Trace
\`\`\`
${this.escapeMarkdown(issue.stackTrace)}
\`\`\`

### Request Context
- **URL**: ${issue.requestContext.url}
- **Method**: ${issue.requestContext.method}
- **User Agent**: ${issue.requestContext.userAgent}
${issue.requestContext.apiKeyId ? `- **API Key ID**: ${issue.requestContext.apiKeyId}` : ""}

### Tags
${Object.entries(issue.tags)
  .map(([key, value]) => `- **${key}**: ${value}`)
  .join("\n")}

### Sentry Link
${issue.sentryUrl}

---
*Auto-generated by Sentry integration*
`.trim();
  }

  /**
   * Escape markdown special characters
   */
  private static escapeMarkdown(text: string): string {
    return text.replace(/[\\`*_{}[\]()#+\-.!|]/g, "\\$&");
  }
}
