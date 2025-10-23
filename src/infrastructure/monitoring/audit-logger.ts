import { db, schema } from "@/infrastructure/database/client";
import { logger } from "@/shared/lib/utils/logger";

/**
 * Audit Logger
 *
 * Logs all API requests and actions for compliance and security
 */

export interface AuditLogData {
  userId?: string;
  apiKeyId?: string;
  method: string;
  path: string;
  action: string;
  ipAddress?: string;
  userAgent?: string;
  resourceType?: string;
  resourceId?: string;
  statusCode: number;
  duration?: number;
  metadata?: {
    error?: string;
    requestBody?: Record<string, unknown>;
    responseSize?: number;
  };
}

export class AuditLogger {
  private static instance: AuditLogger;

  private constructor() {}

  public static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  /**
   * Log an API request
   */
  async log(data: AuditLogData): Promise<void> {
    try {
      await db.insert(schema.auditLogs).values({
        userId: data.userId || null,
        apiKeyId: data.apiKeyId || null,
        method: data.method,
        path: data.path,
        action: data.action,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        resourceType: data.resourceType || null,
        resourceId: data.resourceId || null,
        statusCode: data.statusCode,
        duration: data.duration || null,
        metadata: data.metadata || null,
      });

      logger.debug("Audit log created", { action: data.action, path: data.path });
    } catch (error) {
      // Don't throw errors from audit logging
      logger.error("Failed to create audit log", {
        error: error instanceof Error ? error.message : String(error),
        data,
      });
    }
  }

  /**
   * Log successful request
   */
  async logSuccess(
    action: string,
    resourceType: string,
    resourceId: string,
    context?: {
      userId?: string;
      apiKeyId?: string;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<void> {
    await this.log({
      method: "POST",
      path: `/api/${resourceType}/${resourceId}`,
      action,
      resourceType,
      resourceId,
      statusCode: 200,
      userId: context?.userId,
      apiKeyId: context?.apiKeyId,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });
  }

  /**
   * Log failed request
   */
  async logFailure(
    action: string,
    resourceType: string,
    error: string,
    statusCode: number,
    context?: {
      userId?: string;
      apiKeyId?: string;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<void> {
    await this.log({
      method: "POST",
      path: `/api/${resourceType}`,
      action,
      resourceType,
      statusCode,
      userId: context?.userId,
      apiKeyId: context?.apiKeyId,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      metadata: { error },
    });
  }
}

export const auditLogger = AuditLogger.getInstance();
