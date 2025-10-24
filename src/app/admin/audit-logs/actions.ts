/**
 * Server Actions for Audit Logs Management
 *
 * Admin-only operations for viewing and analyzing audit trail data.
 * Supports advanced filtering, sorting, and statistics.
 */

"use server";

import { headers } from "next/headers";
import { auth } from "@/infrastructure/auth/better-auth.config";
import { getAuditLogRepository } from "@/infrastructure/di/container";
import { AuditLogService } from "@/core/services/audit-log/audit-log.service";

// ============ Actions ============

/**
 * Get audit logs with pagination and filters (admin only)
 */
export async function getAuditLogs(options?: {
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
}) {
  // Check admin auth
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }

  // Build params using service
  const params = AuditLogService.buildListParams(options || {});

  // Fetch data
  const repository = getAuditLogRepository();
  const result = await repository.list(params);

  return {
    data: result.data,
    pagination: result.pagination,
  };
}

/**
 * Get audit log by ID (admin only)
 */
export async function getAuditLogById({ id }: { id: string }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }

  const repository = getAuditLogRepository();
  const auditLog = await repository.findById(id);

  if (!auditLog) {
    throw new Error("Audit log not found");
  }

  return auditLog;
}

/**
 * Get audit log statistics (admin only)
 */
export async function getAuditLogStats(options?: {
  userId?: string;
  apiKeyId?: string;
  method?: string;
  action?: string;
  resourceType?: string;
  statusCode?: number;
  startDate?: string;
  endDate?: string;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }

  const repository = getAuditLogRepository();

  // Build filters
  const filters: {
    userId?: string;
    apiKeyId?: string;
    method?: string;
    action?: string;
    resourceType?: string;
    statusCode?: number;
    startDate?: Date;
    endDate?: Date;
  } = {};

  if (options?.userId) filters.userId = options.userId;
  if (options?.apiKeyId) filters.apiKeyId = options.apiKeyId;
  if (options?.method) filters.method = options.method;
  if (options?.action) filters.action = options.action;
  if (options?.resourceType) filters.resourceType = options.resourceType;
  if (options?.statusCode) filters.statusCode = options.statusCode;
  if (options?.startDate) filters.startDate = new Date(options.startDate);
  if (options?.endDate) filters.endDate = new Date(options.endDate);

  const stats = await repository.getStats(filters);

  return stats;
}

/**
 * Delete old audit logs (cleanup job - admin only)
 */
export async function deleteOldAuditLogs({ daysOld }: { daysOld: number }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }

  if (daysOld < 30) {
    throw new Error("Cannot delete logs less than 30 days old");
  }

  const repository = getAuditLogRepository();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const deletedCount = await repository.deleteOlderThan(cutoffDate);

  return { deletedCount, cutoffDate };
}
