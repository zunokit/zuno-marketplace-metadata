/**
 * Audit Log Service
 * Business logic for audit log operations
 */

import type { AuditLogListParams } from "@/core/domain/audit-log/audit-log.entity";

export class AuditLogService {
  /**
   * Build list params from query input with defaults
   */
  static buildListParams(input: {
    page?: number;
    limit?: number;
    userId?: string;
    apiKeyId?: string;
    method?: string;
    action?: string;
    resourceType?: string;
    statusCode?: number;
    startDate?: string;
    endDate?: string;
    sortBy?: "createdAt" | "duration" | "statusCode";
    sortOrder?: "asc" | "desc";
  }): AuditLogListParams {
    return {
      page: input.page || 1,
      limit: input.limit || 20,
      filters: {
        ...(input.userId && { userId: input.userId }),
        ...(input.apiKeyId && { apiKeyId: input.apiKeyId }),
        ...(input.method && { method: input.method }),
        ...(input.action && { action: input.action }),
        ...(input.resourceType && { resourceType: input.resourceType }),
        ...(input.statusCode && { statusCode: input.statusCode }),
        ...(input.startDate && { startDate: new Date(input.startDate) }),
        ...(input.endDate && { endDate: new Date(input.endDate) }),
      },
      sortBy: input.sortBy || "createdAt",
      sortOrder: input.sortOrder || "desc",
    };
  }
}
