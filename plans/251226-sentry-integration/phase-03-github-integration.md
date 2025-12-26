# Phase 03: GitHub Integration

**Status**: Code Review Complete | **Effort**: 1h | **Priority**: P1

**Review Report**: `plans/reports/code-reviewer-251226-2335-sentry-phase03-github-integration.md`
**Review Grade**: B+ (with Critical Build Issue from Phase 02)

## Overview

Implement GitHub API integration for issue creation and Redis-based deduplication.

## Related Files

- Phase 02: `phase-02-webhook-handler.md`
- GitHub REST API: https://docs.github.com/en/rest/issues/issues

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| `octokit` library | Official GitHub SDK, type-safe |
| Redis for deduplication | Existing infrastructure, fast lookups |
| 30-day fingerprint TTL | Prevents stale issues from blocking |

## Requirements

### Functional
- Create GitHub issues via API
- Add labels and metadata
- Check for existing issues by fingerprint
- Store fingerprints in Redis

### Non-Functional
- Rate limit handling (GitHub 5000/hour)
- Retry logic for failed API calls
- Idempotent operations

## Architecture

```
SentryIssueService
  ↓
Check Redis (fingerprint exists?)
  ↓ No
Create GitHub Issue (octokit)
  ↓
Store fingerprint in Redis
  ↓
Return issue details
```

## File Changes

### New Files

| File | Purpose |
|------|---------|
| `src/infrastructure/github/github-client.ts` | GitHub API client |

### Modified Files

| File | Changes |
|------|---------|
| `src/core/services/sentry-issue/sentry-issue.service.ts` | Implement stub methods |
| `src/shared/config/env.ts` | Add GitHub config |

## Implementation Steps

### 1. Install Dependencies

```bash
pnpm add octokit
```

### 2. Create GitHub Client

**File: `src/infrastructure/github/github-client.ts`**
```typescript
import { Octokit } from "octokit";
import { env } from "@/shared/config/env";
import { logger } from "@/shared/lib/utils/logger";
import { tryCatch } from "@/shared/lib/utils/server";

/**
 * GitHub Client
 *
 * Wrapper around Octokit for creating issues
 */

export class GitHubClient {
  private static octokit: Octokit | null = null;

  private static getClient(): Octokit {
    if (!this.octokit) {
      if (!env.GITHUB_TOKEN) {
        throw new Error("GITHUB_TOKEN not configured");
      }
      this.octokit = new Octokit({
        auth: env.GITHUB_TOKEN,
      });
    }
    return this.octokit;
  }

  /**
   * Create an issue in the configured repository
   */
  static async createIssue(params: {
    title: string;
    body: string;
    labels: string[];
  }): Promise<{ number: number; html_url: string }> {
    return tryCatch(
      async () => {
        const [owner, repo] = this.parseRepo(env.GITHUB_REPO);
        const client = this.getClient();

        const response = await client.rest.issues.create({
          owner,
          repo,
          title: params.title,
          body: params.body,
          labels: params.labels,
        });

        logger.info("GitHub issue created", {
          issueNumber: response.data.number,
          url: response.data.html_url,
        });

        return {
          number: response.data.number,
          html_url: response.data.html_url,
        };
      },
      {
        errorMessage: "Failed to create GitHub issue",
        shouldLog: true,
      }
    );
  }

  /**
   * Search for existing issues by title
   */
  static async searchIssues(query: string): Promise<number | null> {
    return tryCatch(
      async () => {
        const [owner, repo] = this.parseRepo(env.GITHUB_REPO);
        const client = this.getClient();

        const response = await client.rest.search.issuesAndPullRequests({
          q: `${query} repo:${owner}/${repo} is:issue is:open`,
          per_page: 1,
        });

        if (response.data.items.length > 0) {
          return response.data.items[0].number;
        }

        return null;
      },
      {
        errorMessage: "Failed to search GitHub issues",
        shouldLog: false, // Don't log on 404
        onError: () => null, // Return null on error
      }
    );
  }

  /**
   * Parse GITHUB_REPO into owner and repo
   */
  private static parseRepo(repo: string): [string, string] {
    const parts = repo.split("/");
    if (parts.length !== 2) {
      throw new Error(`Invalid GITHUB_REPO format: ${repo}`);
    }
    return [parts[0], parts[1]];
  }
}
```

### 3. Create Redis Deduplication Service

**File: `src/infrastructure/cache/sentry-dedup.service.ts`**
```typescript
import { redis } from "./redis.client";
import { env } from "@/shared/config/env";
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
  /**
   * Check if issue exists for fingerprint
   */
  static async getIssue(fingerprint: string): Promise<IssueReference | null> {
    return tryCatch(
      async () => {
        const key = `${FINGERPRINT_PREFIX}${fingerprint}`;
        const data = await redis.get(key);

        if (!data) return null;

        return JSON.parse(data) as IssueReference;
      },
      {
        errorMessage: "Failed to check fingerprint",
        shouldLog: false,
        onError: () => null,
      }
    );
  }

  /**
   * Store fingerprint with issue reference
   */
  static async storeFingerprint(
    fingerprint: string,
    issueRef: IssueReference
  ): Promise<void> {
    return tryCatch(
      async () => {
        const key = `${FINGERPRINT_PREFIX}${fingerprint}`;
        const data = JSON.stringify(issueRef);

        await redis.set(key, data, {
          ex: FINGERPRINT_TTL,
        });

        logger.debug("Stored fingerprint for deduplication", {
          fingerprint,
          issueNumber: issueRef.issueNumber,
        });
      },
      {
        errorMessage: "Failed to store fingerprint",
        shouldLog: true,
      }
    );
  }

  /**
   * Delete fingerprint (for cleanup/testing)
   */
  static async deleteFingerprint(fingerprint: string): Promise<void> {
    return tryCatch(
      async () => {
        const key = `${FINGERPRINT_PREFIX}${fingerprint}`;
        await redis.del(key);
      },
      {
        errorMessage: "Failed to delete fingerprint",
        shouldLog: true,
      }
    );
  }
}
```

### 4. Complete Issue Service

**File: `src/core/services/sentry-issue/sentry-issue.service.ts`**
```typescript
import { logger } from "@/shared/lib/utils/logger";
import { env } from "@/shared/config/env";
import { GitHubClient } from "@/infrastructure/github/github-client";
import { SentryDedupService } from "@/infrastructure/cache/sentry-dedup.service";
import type { SentryIssue, CreatedIssue } from "./sentry-issue.entity";
import {
  getFingerprint,
  getErrorTitle,
  getStackTrace,
  getRequestContext,
} from "@/shared/lib/utils/sentry-helpers";

/**
 * Sentry Issue Service
 *
 * Business logic for creating GitHub issues from Sentry errors
 */

export class SentryIssueService {
  /**
   * Process Sentry webhook and create GitHub issue
   */
  static async processWebhook(
    payload: SentryWebhookPayload,
    requestId: string
  ): Promise<CreatedIssue | null> {
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
  }

  /**
   * Check if issue already exists for this fingerprint
   */
  private static async checkExistingIssue(
    fingerprint: string
  ): Promise<CreatedIssue | null> {
    return await SentryDedupService.getIssue(fingerprint);
  }

  /**
   * Create GitHub issue with formatted body
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

// Type re-export
type SentryWebhookPayload = import("@/shared/lib/utils/sentry-helpers").SentryEvent & {
  environment: string;
  url?: string;
};
```

### 5. Update Environment Config

**File: `src/shared/config/env.ts`**
```typescript
// Add to existing env schema:
GITHUB_TOKEN: z.string().optional(),
GITHUB_REPO: z.string().default("zunokit/zuno-marketplace-metadata"),
GITHUB_ISSUE_LABEL: z.string().default("sentry,error,production"),
```

## Todo List

- [ ] Install `octokit` package
- [ ] Create `src/infrastructure/github/github-client.ts`
- [ ] Create `src/infrastructure/cache/sentry-dedup.service.ts`
- [ ] Complete `src/core/services/sentry-issue/sentry-issue.service.ts`
- [ ] Update `src/shared/config/env.ts`
- [ ] Test GitHub issue creation

## Success Criteria

- ✅ GitHub issues created successfully
- ✅ Issues have correct labels and formatting
- ✅ Deduplication prevents duplicate issues
- ✅ Redis TTL works (30 days)

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| GitHub rate limit | 5000 req/hour is plenty for low traffic |
| API token rotation | Update env var, restart app |
| Redis connection fail | Log error, still create issue (may duplicate) |

## Security Considerations

- **GitHub PAT**: Store in environment, never commit
- **Repo scope**: Only need `repo:issues` permission
- **Input sanitization**: Escape markdown in issue body

## Next Steps

→ Phase 04: Configure Sentry alerts to trigger webhook

---

## Code Review Summary (2025-12-26)

**Report**: `code-reviewer-251226-2335-sentry-phase03-github-integration.md`

### Critical Issues Found

1. **Build Error (from Phase 02)**: Webhook route type incompatibility with `tryCatch` wrapper
   - `tryCatch` returns `TryCatchResult<NextResponse>` but Next.js expects `Response`
   - **Action Required**: Fix before Phase 04

### High Priority Findings

1. **YAGNI Violation**: `searchIssues` method defined but unused (26 lines)
2. **Redis Import**: Uses raw `redis` instead of `RedisClient` wrapper
3. **Missing Rate Limiting**: No handling for GitHub 429 responses

### Medium Priority Issues

1. **Missing Tests**: No unit tests for `GitHubClient` or `SentryDedupService`
2. **Markdown Escaping**: Incomplete regex (missing `&`, `<`, `>`)
3. **Plan Deviation**: Missing production environment filter in `processWebhook`

### Action Items Before Phase 04

- [ ] Fix webhook route type error (remove `tryCatch` wrapper)
- [ ] Add production environment check to `processWebhook`
- [ ] Remove unused `searchIssues` method OR add tests for it
- [ ] Use `RedisClient` wrapper instead of raw `redis` import

### Positive Observations

- Clean Architecture compliance
- Consistent error handling with `tryCatch`
- Proper security (GitHub token in env, markdown escaping)
- Good dedup design (Redis with 30-day TTL)
