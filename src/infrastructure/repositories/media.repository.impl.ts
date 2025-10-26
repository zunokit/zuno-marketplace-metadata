import { eq, desc, asc, and, ilike, sql } from "drizzle-orm";
import type { Database } from "@/infrastructure/database/client";
import { media } from "@/infrastructure/database/drizzle/schema";
import type { MediaRepository } from "@/core/domain/media/media.repository";
import type {
  MediaEntity,
  CreateMediaParams,
  UpdateMediaParams,
  MediaListParams,
} from "@/core/domain/media/media.entity";
import type { PaginatedResponse } from "@/shared/types";
import { logger } from "@/shared/lib/utils/logger";
import {
  hasRows,
  extractRowCount,
  countSql,
} from "@/shared/lib/utils/drizzle-helpers";
import type { InferSelectModel } from "drizzle-orm";

// Type-safe database row type
type MediaRow = InferSelectModel<typeof media>;

export class MediaRepositoryImpl implements MediaRepository {
  constructor(private db: Database) {}

  async create(params: CreateMediaParams): Promise<MediaEntity> {
    logger.debug("Creating media", { fileName: params.fileName });

    const [result] = await this.db
      .insert(media)
      .values({
        ...params,
        isPinned: false,
      })
      .returning();

    return this.mapToEntity(result);
  }

  async findById(id: string): Promise<MediaEntity | null> {
    logger.debug("Finding media by ID", { id });

    const result = await this.db
      .select()
      .from(media)
      .where(eq(media.id, id))
      .limit(1);

    return result[0] ? this.mapToEntity(result[0]) : null;
  }

  async update(
    id: string,
    params: UpdateMediaParams
  ): Promise<MediaEntity | null> {
    logger.debug("Updating media", { id, params });

    const [result] = await this.db
      .update(media)
      .set({
        ...params,
        ...(params.isPinned && { pinnedAt: new Date() }),
      })
      .where(eq(media.id, id))
      .returning();

    return result ? this.mapToEntity(result) : null;
  }

  async delete(id: string): Promise<boolean> {
    logger.debug("Deleting media", { id });

    const result = await this.db.delete(media).where(eq(media.id, id));

    return hasRows(result);
  }

  async list(params: MediaListParams): Promise<PaginatedResponse<MediaEntity>> {
    logger.debug("Listing media", { params });

    const { page, limit, sortBy, sortOrder, search, mediaType, isPinned } =
      params;

    // Build conditions
    const conditions = [];

    if (search) {
      conditions.push(ilike(media.fileName, `%${search}%`));
    }

    if (mediaType) {
      conditions.push(eq(media.mediaType, mediaType));
    }

    if (typeof isPinned === "boolean") {
      conditions.push(eq(media.isPinned, isPinned));
    }

    // Build base query with type safety
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Build queries
    const baseQuery = this.db.select().from(media);
    const queryWithConditions = whereClause
      ? baseQuery.where(whereClause)
      : baseQuery;

    // Apply sorting
    const sortColumn =
      sortBy === "fileName"
        ? media.fileName
        : sortBy === "fileSize"
        ? media.fileSize
        : media.createdAt;

    const orderFn = sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);
    const queryWithSort = queryWithConditions.orderBy(orderFn);

    // Apply pagination
    const offset = (page - 1) * limit;
    const finalQuery = queryWithSort.limit(limit).offset(offset);

    // Count query
    const countQueryBase = this.db.select({ count: countSql }).from(media);
    const countQuery = whereClause
      ? countQueryBase.where(whereClause)
      : countQueryBase;

    // Execute queries
    const [results, [{ count: totalCount }]] = await Promise.all([
      finalQuery,
      countQuery,
    ]);

    const total = Number(totalCount);
    const totalPages = Math.ceil(total / limit);

    return {
      data: results.map((item) => this.mapToEntity(item)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async search(
    query: string,
    params?: MediaListParams
  ): Promise<PaginatedResponse<MediaEntity>> {
    const searchParams = {
      ...params,
      search: query,
    } as MediaListParams;

    return this.list(searchParams);
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.db
      .select({ id: media.id })
      .from(media)
      .where(eq(media.id, id))
      .limit(1);

    return result.length > 0;
  }

  async createMany(params: CreateMediaParams[]): Promise<MediaEntity[]> {
    logger.debug("Creating multiple media", { count: params.length });

    const values = params.map((param) => ({
      ...param,
      isPinned: false,
    }));

    const results = await this.db.insert(media).values(values).returning();

    return results.map((result) => this.mapToEntity(result));
  }

  async deleteMany(ids: string[]): Promise<number> {
    logger.debug("Deleting multiple media", { ids });

    const result = await this.db
      .delete(media)
      .where(sql`${media.id} = ANY(${ids})`);

    return extractRowCount(result);
  }

  async updateIpfsInfo(
    id: string,
    ipfsHash: string,
    ipfsUrl: string
  ): Promise<MediaEntity | null> {
    logger.debug("Updating IPFS info", { id, ipfsHash });

    const [result] = await this.db
      .update(media)
      .set({
        ipfsHash,
        ipfsUrl,
        isPinned: true,
        pinnedAt: new Date(),
      })
      .where(eq(media.id, id))
      .returning();

    return result ? this.mapToEntity(result) : null;
  }

  async markAsPinned(id: string): Promise<MediaEntity | null> {
    logger.debug("Marking media as pinned", { id });

    const [result] = await this.db
      .update(media)
      .set({
        isPinned: true,
        pinnedAt: new Date(),
      })
      .where(eq(media.id, id))
      .returning();

    return result ? this.mapToEntity(result) : null;
  }

  private mapToEntity(row: MediaRow): MediaEntity {
    return {
      id: row.id,
      fileName: row.fileName,
      fileSize: row.fileSize,
      mimeType: row.mimeType,
      mediaType: row.mediaType,
      url: row.url,
      ipfsHash: row.ipfsHash ?? undefined,
      ipfsUrl: row.ipfsUrl ?? undefined,
      width: row.width ?? undefined,
      height: row.height ?? undefined,
      duration: row.duration ?? undefined,
      thumbnailUrl: row.thumbnailUrl ?? undefined,
      optimizedUrl: row.optimizedUrl ?? undefined,
      isPinned: row.isPinned,
      pinnedAt: row.pinnedAt ?? undefined,
      createdAt: row.createdAt,
    };
  }
}
