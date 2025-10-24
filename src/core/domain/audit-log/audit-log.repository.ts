/**
 * Audit Log Repository Interface
 * Defines contract for audit log data access
 */

import type { PaginatedResponse } from "@/shared/types";
import type {
  AuditLogEntity,
  AuditLogListParams,
  AuditLogStats,
  AuditLogFilters,
} from "./audit-log.entity";

export interface AuditLogRepository {
  /**
   * List audit logs with pagination and filters
   */
  list(params: AuditLogListParams): Promise<PaginatedResponse<AuditLogEntity>>;

  /**
   * Find audit log by ID
   */
  findById(id: string): Promise<AuditLogEntity | null>;

  /**
   * Get audit log statistics
   */
  getStats(filters?: AuditLogFilters): Promise<AuditLogStats>;

  /**
   * Delete audit logs older than specified date
   */
  deleteOlderThan(date: Date): Promise<number>;
}
