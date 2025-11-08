import {
  eq,
  desc,
  asc,
  and,
  or,
  gte,
  lte,
  ilike,
  inArray,
  count,
} from "drizzle-orm";
import type { Database } from "@/infrastructure/database/client";
import { metadata } from "@/infrastructure/database/drizzle/schema";
import type { Metadata } from "@/infrastructure/database/drizzle/schema/metadata.schema";
import type { MetadataRepository } from "@/core/domain/metadata/metadata.repository";
import type {
  MetadataEntity,
  CreateMetadataParams,
  UpdateMetadataParams,
  MetadataListParams,
} from "@/core/domain/metadata/metadata.entity";
import type { PaginatedResponse } from "@/shared/types";
import { logger } from "@/shared/lib/utils/logger";
import {
  hasRows,
  extractRowCount,
  buildQuery,
  countSql,
} from "@/shared/lib/utils/drizzle-helpers";

export class MetadataRepositoryImpl implements MetadataRepository {
  constructor(private db: Database) {}

  async create(params: CreateMetadataParams): Promise<MetadataEntity> {
    logger.debug("Creating metadata", { name: params.name });

    const [result] = await this.db
      .insert(metadata)
      .values({
        ...params,
        version: 1,
        isLocked: false,
        isPinned: false,
      })
      .returning();

    return this.mapToEntity(result);
  }

  async findById(id: string): Promise<MetadataEntity | null> {
    logger.debug("Finding metadata by ID", { id });

    const result = await this.db
      .select()
      .from(metadata)
      .where(eq(metadata.id, id))
      .limit(1);

    return result[0] ? this.mapToEntity(result[0]) : null;
  }

  async findByIdAndVersion(
    id: string,
    version?: number
  ): Promise<MetadataEntity | null> {
    logger.debug("Finding metadata by ID and version", { id, version });

    const conditions = [eq(metadata.id, id)];

    if (version !== undefined) {
      conditions.push(eq(metadata.version, version));
    }

    const result = await this.db
      .select()
      .from(metadata)
      .where(and(...conditions))
      .limit(1);

    return result[0] ? this.mapToEntity(result[0]) : null;
  }

  async update(
    id: string,
    params: UpdateMetadataParams
  ): Promise<MetadataEntity | null> {
    logger.debug("Updating metadata", { id, params });

    // Get current metadata to check version and lock status
    const current = await this.findById(id);
    if (!current) {
      return null;
    }

    if (current.isLocked) {
      throw new Error("Cannot update locked metadata");
    }

    // Determine if this is a content change (should increment version)
    const contentFields = [
      "name",
      "description",
      "symbol",
      "image",
      "bannerImage",
      "featuredImage",
      "animationUrl",
      "externalUrl",
      "backgroundColor",
      "attributes",
      "creators",
      "sellerFeeBasisPoints",
      "feeRecipient",
    ];

    const hasContentChanges = contentFields.some(
      (field) => params[field as keyof UpdateMetadataParams] !== undefined
    );

    const updateData = {
      ...params,
      version: hasContentChanges ? current.version + 1 : current.version,
    };

    const [result] = await this.db
      .update(metadata)
      .set(updateData)
      .where(eq(metadata.id, id))
      .returning();

    return result ? this.mapToEntity(result) : null;
  }

  async delete(id: string): Promise<boolean> {
    logger.debug("Deleting metadata", { id });

    // Check if metadata exists and is not locked
    const existing = await this.findById(id);
    if (!existing) {
      return false;
    }

    if (existing.isLocked) {
      throw new Error("Cannot delete locked metadata");
    }

    const result = await this.db.delete(metadata).where(eq(metadata.id, id));

    return hasRows(result);
  }

  async list(
    params: MetadataListParams
  ): Promise<PaginatedResponse<MetadataEntity>> {
    logger.debug("Listing metadata", { params });

    const {
      page,
      limit,
      sortBy,
      sortOrder,
      search,
      isPinned,
      isLocked,
    } = params;

    // Build conditions
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(metadata.name, `%${search}%`),
          ilike(metadata.description, `%${search}%`),
          ilike(metadata.symbol, `%${search}%`)
        )
      );
    }

    if (typeof isPinned === "boolean") {
      conditions.push(eq(metadata.isPinned, isPinned));
    }

    if (typeof isLocked === "boolean") {
      conditions.push(eq(metadata.isLocked, isLocked));
    }

    // Apply conditions
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Apply sorting
    const sortColumn =
      sortBy === "name"
        ? metadata.name
        : sortBy === "updatedAt"
        ? metadata.updatedAt
        : sortBy === "version"
        ? metadata.version
        : metadata.createdAt;

    const orderFn = sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);

    // Apply pagination
    const offset = (page - 1) * limit;

    // Build and execute queries
    const queryBuilder = this.db.select().from(metadata);
    const countQueryBuilder = this.db
      .select({ count: countSql })
      .from(metadata);

    const query = whereClause ? queryBuilder.where(whereClause) : queryBuilder;
    const countQuery = whereClause
      ? countQueryBuilder.where(whereClause)
      : countQueryBuilder;

    // Execute queries
    const [results, [{ count: totalCount }]] = await Promise.all([
      query.orderBy(orderFn).limit(limit).offset(offset),
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
    params?: MetadataListParams
  ): Promise<PaginatedResponse<MetadataEntity>> {
    const searchParams = {
      ...params,
      search: query,
    } as MetadataListParams;

    return this.list(searchParams);
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.db
      .select({ id: metadata.id })
      .from(metadata)
      .where(eq(metadata.id, id))
      .limit(1);

    return result.length > 0;
  }

  async isLocked(id: string): Promise<boolean> {
    const result = await this.db
      .select({ isLocked: metadata.isLocked })
      .from(metadata)
      .where(eq(metadata.id, id))
      .limit(1);

    return result[0]?.isLocked ?? false;
  }

  async getLatestVersion(id: string): Promise<number> {
    const result = await this.db
      .select({ version: metadata.version })
      .from(metadata)
      .where(eq(metadata.id, id))
      .limit(1);

    return result[0]?.version ?? 1;
  }

  async createMany(params: CreateMetadataParams[]): Promise<MetadataEntity[]> {
    logger.debug("Creating multiple metadata", { count: params.length });

    const values = params.map((param) => ({
      ...param,
      version: 1,
      isLocked: false,
      isPinned: false,
    }));

    const results = await this.db.insert(metadata).values(values).returning();

    return results.map((result) => this.mapToEntity(result));
  }

  async updateMany(
    ids: string[],
    params: Partial<UpdateMetadataParams>
  ): Promise<number> {
    logger.debug("Updating multiple metadata", { ids, params });

    if (ids.length === 0) {
      return 0;
    }

    const result = await this.db
      .update(metadata)
      .set(params)
      .where(inArray(metadata.id, ids));

    return extractRowCount(result);
  }

  async deleteMany(ids: string[]): Promise<number> {
    logger.debug("Deleting multiple metadata", { ids });

    if (ids.length === 0) {
      return 0;
    }

    const result = await this.db
      .delete(metadata)
      .where(inArray(metadata.id, ids));

    return extractRowCount(result);
  }

  async updateIpfsInfo(
    id: string,
    ipfsHash: string,
    ipfsUrl: string
  ): Promise<MetadataEntity | null> {
    logger.debug("Updating IPFS info", { id, ipfsHash });

    const [result] = await this.db
      .update(metadata)
      .set({
        ipfsHash,
        ipfsUrl,
        isPinned: true,
        pinnedAt: new Date(),
      })
      .where(eq(metadata.id, id))
      .returning();

    return result ? this.mapToEntity(result) : null;
  }

  async markAsPinned(id: string): Promise<MetadataEntity | null> {
    logger.debug("Marking metadata as pinned", { id });

    const [result] = await this.db
      .update(metadata)
      .set({
        isPinned: true,
        pinnedAt: new Date(),
      })
      .where(eq(metadata.id, id))
      .returning();

    return result ? this.mapToEntity(result) : null;
  }

  private mapToEntity(row: Metadata): MetadataEntity {
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      symbol: row.symbol ?? undefined,
      image: row.image,
      bannerImage: row.bannerImage ?? undefined,
      featuredImage: row.featuredImage ?? undefined,
      animationUrl: row.animationUrl ?? undefined,
      externalUrl: row.externalUrl ?? undefined,
      backgroundColor: row.backgroundColor ?? undefined,
      attributes: row.attributes ?? [],
      ipfsHash: row.ipfsHash ?? undefined,
      ipfsUrl: row.ipfsUrl ?? undefined,
      isPinned: row.isPinned,
      pinnedAt: row.pinnedAt ?? undefined,
      creators: row.creators ?? [],
      sellerFeeBasisPoints: row.sellerFeeBasisPoints ?? undefined,
      feeRecipient: row.feeRecipient ?? undefined,
      version: row.version,
      isLocked: row.isLocked,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
