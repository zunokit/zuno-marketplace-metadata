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
    const result = await tryCatch(
      async () => {
        const [owner, repo] = this.parseRepo(env.GITHUB_REPO ?? "zunokit/zuno-marketplace-metadata");
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

    if (!result.success) {
      throw result.error;
    }

    return result.data;
  }

  /**
   * Search for existing issues by title
   */
  static async searchIssues(query: string): Promise<number | null> {
    const result = await tryCatch(
      async () => {
        const [owner, repo] = this.parseRepo(env.GITHUB_REPO ?? "zunokit/zuno-marketplace-metadata");
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

    return result.success ? result.data : null;
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
