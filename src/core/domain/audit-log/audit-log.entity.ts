/**
 * Audit Log Entity
 * Domain model for audit trail entries
 */

export interface AuditLogEntity {
  id: string;
  userId: string | null;
  apiKeyId: string | null;
  method: string;
  path: string;
  action: string;
  ipAddress: string | null;
  userAgent: string | null;
  resourceType: string | null;
  resourceId: string | null;
  statusCode: number;
  duration: number | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface AuditLogFilters {
  userId?: string;
  apiKeyId?: string;
  method?: string;
  action?: string;
  resourceType?: string;
  statusCode?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface AuditLogListParams {
  page: number;
  limit: number;
  filters?: AuditLogFilters;
  sortBy?: "createdAt" | "duration" | "statusCode";
  sortOrder?: "asc" | "desc";
}

export interface AuditLogStats {
  totalRequests: number;
  totalErrors: number;
  avgDuration: number;
  requestsByMethod: Record<string, number>;
  requestsByAction: Record<string, number>;
}
