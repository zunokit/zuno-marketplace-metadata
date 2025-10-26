/**
 * Audit Log Repository Implementation
 * Concrete implementation using Drizzle ORM
 */

import { db } from "@/infrastructure/database/client";
import { auditLogs } from "@/infrastructure/database/drizzle/schema";
import { and, eq, gte, lte, desc, asc, sql, count } from "drizzle-orm";
import type { PaginatedResponse } from "@/shared/types";
import type { AuditLogRepository } from "@/core/domain/audit-log/audit-log.repository";
import type {
  AuditLogEntity,
  AuditLogListParams,
  AuditLogStats,
  AuditLogFilters,
} from "@/core/domain/audit-log/audit-log.entity";

export class AuditLogRepositoryImpl implements AuditLogRepository {
  async list(
    params: AuditLogListParams
  ): Promise<PaginatedResponse<AuditLogEntity>> {
    const { page, limit, filters, sortBy = "createdAt", sortOrder = "desc" } = params;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];

    if (filters?.userId) {
      conditions.push(eq(auditLogs.userId, filters.userId));
    }

    if (filters?.apiKeyId) {
      conditions.push(eq(auditLogs.apiKeyId, filters.apiKeyId));
    }

    if (filters?.method) {
      conditions.push(eq(auditLogs.method, filters.method));
    }

    if (filters?.action) {
      conditions.push(eq(auditLogs.action, filters.action));
    }

    if (filters?.resourceType) {
      conditions.push(eq(auditLogs.resourceType, filters.resourceType));
    }

    if (filters?.statusCode) {
      conditions.push(eq(auditLogs.statusCode, filters.statusCode));
    }

    if (filters?.startDate) {
      conditions.push(gte(auditLogs.createdAt, filters.startDate));
    }

    if (filters?.endDate) {
      conditions.push(lte(auditLogs.createdAt, filters.endDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Build order by
    const orderByColumn = auditLogs[sortBy];
    const orderByFn = sortOrder === "asc" ? asc : desc;

    // Fetch data
    const data = await db
      .select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(orderByFn(orderByColumn))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(auditLogs)
      .where(whereClause);

    const totalPages = Math.ceil(Number(total) / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total: Number(total),
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async findById(id: string): Promise<AuditLogEntity | null> {
    const [result] = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.id, id))
      .limit(1);

    return result || null;
  }

  async getStats(filters?: AuditLogFilters): Promise<AuditLogStats> {
    // Build where conditions
    const conditions = [];

    if (filters?.userId) {
      conditions.push(eq(auditLogs.userId, filters.userId));
    }

    if (filters?.apiKeyId) {
      conditions.push(eq(auditLogs.apiKeyId, filters.apiKeyId));
    }

    if (filters?.method) {
      conditions.push(eq(auditLogs.method, filters.method));
    }

    if (filters?.action) {
      conditions.push(eq(auditLogs.action, filters.action));
    }

    if (filters?.resourceType) {
      conditions.push(eq(auditLogs.resourceType, filters.resourceType));
    }

    if (filters?.statusCode) {
      conditions.push(eq(auditLogs.statusCode, filters.statusCode));
    }

    if (filters?.startDate) {
      conditions.push(gte(auditLogs.createdAt, filters.startDate));
    }

    if (filters?.endDate) {
      conditions.push(lte(auditLogs.createdAt, filters.endDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get aggregate stats
    const [stats] = await db
      .select({
        totalRequests: count(),
        totalErrors: count(sql`CASE WHEN ${auditLogs.statusCode} >= 400 THEN 1 END`),
        avgDuration: sql<number>`COALESCE(AVG(${auditLogs.duration}), 0)`,
      })
      .from(auditLogs)
      .where(whereClause);

    // Get requests by method
    const methodStats = await db
      .select({
        method: auditLogs.method,
        count: count(),
      })
      .from(auditLogs)
      .where(whereClause)
      .groupBy(auditLogs.method);

    const requestsByMethod: Record<string, number> = {};
    methodStats.forEach((stat) => {
      requestsByMethod[stat.method] = Number(stat.count);
    });

    // Get requests by action
    const actionStats = await db
      .select({
        action: auditLogs.action,
        count: count(),
      })
      .from(auditLogs)
      .where(whereClause)
      .groupBy(auditLogs.action);

    const requestsByAction: Record<string, number> = {};
    actionStats.forEach((stat) => {
      requestsByAction[stat.action] = Number(stat.count);
    });

    return {
      totalRequests: Number(stats.totalRequests),
      totalErrors: Number(stats.totalErrors),
      avgDuration: Number(stats.avgDuration),
      requestsByMethod,
      requestsByAction,
    };
  }

  async deleteOlderThan(date: Date): Promise<number> {
    const result = await db
      .delete(auditLogs)
      .where(lte(auditLogs.createdAt, date))
      .returning();

    return result.length;
  }
}
