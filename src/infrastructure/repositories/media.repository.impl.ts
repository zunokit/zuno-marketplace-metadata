import { eq, desc, asc, and, or, ilike, sql, count } from "drizzle-orm";
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
import { hasRows, extractRowCount, countSql } from "@/shared/lib/utils/drizzle-helpers";

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

  async update(id: string, params: UpdateMediaParams): Promise<MediaEntity | null> {
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

    const result = await this.db
      .delete(media)
      .where(eq(media.id, id));

    return hasRows(result);
  }

  async list(params: MediaListParams): Promise<PaginatedResponse<MediaEntity>> {
    logger.debug("Listing media", { params });

    const {
      page,
      limit,
      sortBy,
      sortOrder,
      search,
      mediaType,
      isPinned,
    } = params;

    // Build conditions
    const conditions = [];

    if (search) {
      conditions.push(ilike(media.fileName, `%${search}%`));
    }

    if (mediaType) {
      conditions.push(eq(media.mediaType, mediaType));
    }

    if (typeof isPinned === 'boolean') {
      conditions.push(eq(media.isPinned, isPinned));
    }

    // Build base query
    let query: any = this.db.select().from(media);
    let countQuery: any = this.db.select({ count: countSql }).from(media);

    // Apply conditions
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    if (whereClause) {
      query = query.where(whereClause);
      countQuery = countQuery.where(whereClause);
    }

    // Apply sorting
    const sortColumn = sortBy === "fileName" ? media.fileName
      : sortBy === "fileSize" ? media.fileSize
      : media.createdAt;

    const orderFn = sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);
    query = query.orderBy(orderFn);

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.limit(limit).offset(offset);

    // Execute queries
    const [results, [{ count: totalCount }]] = await Promise.all([
      query,
      countQuery,
    ]);

    const total = Number(totalCount);
    const totalPages = Math.ceil(total / limit);

    return {
      data: results.map((item: any) => this.mapToEntity(item)),
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

  async search(query: string, params?: MediaListParams): Promise<PaginatedResponse<MediaEntity>> {
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

    const values = params.map(param => ({
      ...param,
      isPinned: false,
    }));

    const results = await this.db
      .insert(media)
      .values(values)
      .returning();

    return results.map(result => this.mapToEntity(result));
  }

  async deleteMany(ids: string[]): Promise<number> {
    logger.debug("Deleting multiple media", { ids });

    const result = await this.db
      .delete(media)
      .where(sql`${media.id} = ANY(${ids})`);

    return extractRowCount(result);
  }

  async updateIpfsInfo(id: string, ipfsHash: string, ipfsUrl: string): Promise<MediaEntity | null> {
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

  private mapToEntity(row: any): MediaEntity {
    return {
      id: row.id,
      fileName: row.fileName,
      fileSize: row.fileSize,
      mimeType: row.mimeType,
      mediaType: row.mediaType,
      url: row.url,
      ipfsHash: row.ipfsHash,
      ipfsUrl: row.ipfsUrl,
      width: row.width,
      height: row.height,
      duration: row.duration,
      thumbnailUrl: row.thumbnailUrl,
      optimizedUrl: row.optimizedUrl,
      isPinned: row.isPinned,
      pinnedAt: row.pinnedAt,
      createdAt: row.createdAt,
    };
  }
}