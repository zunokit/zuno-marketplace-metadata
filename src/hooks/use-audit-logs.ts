/**
 * Audit Logs Data Hooks
 * React Query hooks for audit log management
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAuditLogs,
  getAuditLogById,
  getAuditLogStats,
} from "@/app/admin/audit-logs/actions";
import type { AuditLogEntity } from "@/core/domain/audit-log/audit-log.entity";

export interface AuditLogFilters {
  method?: string;
  statusCode?: number;
  startDate?: string;
  endDate?: string;
  userId?: string;
  apiKeyId?: string;
  action?: string;
  resourceType?: string;
}

export interface AuditLogStats {
  totalRequests: number;
  totalErrors: number;
  avgDuration: number;
  requestsByMethod: Record<string, number>;
  requestsByAction: Record<string, number>;
}

export interface PaginatedAuditLogs {
  data: AuditLogEntity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Fetch paginated audit logs
 */
export function useAuditLogs(
  page: number = 1,
  limit: number = 20,
  filters?: AuditLogFilters,
  options?: {
    sortBy?: "createdAt" | "duration" | "statusCode";
    sortOrder?: "asc" | "desc";
  }
) {
  return useQuery({
    queryKey: ["audit-logs", "list", page, limit, filters, options],
    queryFn: async () => {
      return getAuditLogs({
        page,
        limit,
        ...filters,
        sortBy: options?.sortBy || "createdAt",
        sortOrder: options?.sortOrder || "desc",
      });
    },
    staleTime: 30_000, // 30 seconds
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Fetch audit log statistics
 */
export function useAuditLogStats(filters?: AuditLogFilters) {
  return useQuery({
    queryKey: ["audit-logs", "stats", filters],
    queryFn: async () => {
      return getAuditLogStats(filters);
    },
    staleTime: 30_000, // 30 seconds
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Fetch single audit log by ID
 */
export function useAuditLog(id: string) {
  return useQuery({
    queryKey: ["audit-logs", "detail", id],
    queryFn: async () => {
      return getAuditLogById({ id });
    },
    enabled: !!id,
    staleTime: 60_000, // 1 minute
  });
}

/**
 * Invalidate audit logs cache
 */
export function useInvalidateAuditLogs() {
  const queryClient = useQueryClient();

  return {
    invalidateList: () => {
      queryClient.invalidateQueries({
        queryKey: ["audit-logs", "list"],
      });
    },
    invalidateStats: () => {
      queryClient.invalidateQueries({
        queryKey: ["audit-logs", "stats"],
      });
    },
    invalidateAll: () => {
      queryClient.invalidateQueries({
        queryKey: ["audit-logs"],
      });
    },
  };
}
