/**
 * Sentry Issue Entity
 *
 * Represents a GitHub issue created from a Sentry error
 */

export interface SentryIssue {
  fingerprint: string;
  eventId: string;
  title: string;
  message: string;
  stackTrace: string;
  requestContext: {
    url: string;
    method: string;
    userAgent: string;
    apiKeyId?: string;
  };
  tags: Record<string, unknown>;
  environment: string;
  sentryUrl: string;
}

export interface CreatedIssue {
  issueNumber: number;
  issueUrl: string;
  fingerprint: string;
}
