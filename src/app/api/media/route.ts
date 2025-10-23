import { z } from "zod";
import { ApiWrapper, commonSchemas } from "@/shared/lib/api/api-handler";
import { ImageKitService } from "@/infrastructure/services/imagekit.service";
import { db, schema } from "@/infrastructure/database/client";
import { logger } from "@/shared/lib/utils/logger";
import { eq, desc, sql, and } from "drizzle-orm";

// Validation schemas
const uploadMediaSchema = z.object({
  body: z.instanceof(FormData),
});

const listMediaSchema = z.object({
  query: commonSchemas.pagination.merge(
    z.object({
      mediaType: z.enum(["IMAGE", "VIDEO", "GIF", "MODEL_3D"]).optional(),
      search: z.string().optional(),
    })
  ),
});

// Services
const imageKitService = new ImageKitService();

/**
 * GET /api/media - List all media files
 */
export const GET = ApiWrapper.create(
  async (input, context) => {
    const { query } = input as z.infer<typeof listMediaSchema>;
    const { page = 1, limit = 20, mediaType, search } = query;

    logger.info("Listing media files", {
      page,
      limit,
      mediaType,
      search,
      requestId: context.requestId,
    });

    // Build query
    let dbQuery = db.select().from(schema.media);

    // Add filters
    const conditions = [];
    if (mediaType) {
      conditions.push(eq(schema.media.mediaType, mediaType));
    }
    if (search) {
      // Simple text search on filename
      conditions.push(
        sql`${schema.media.fileName} ILIKE ${`%${search}%`}`
      );
    }

    if (conditions.length > 0) {
      dbQuery = (dbQuery as any).where(conditions.length === 1 ? conditions[0] : and(...conditions));
    }

    // Add ordering and pagination
    const offset = (page - 1) * limit;
    const mediaFiles = await dbQuery
      .orderBy(desc(schema.media.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const [{ count }] = await db
      .select({ count: sql`count(*)` })
      .from(schema.media);

    const total = Number(count);
    const totalPages = Math.ceil(total / limit);

    return {
      data: mediaFiles,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  },
  {
    auth: {
      required: true,
      requiredScopes: ["media:read"],
    },
    validation: {
      query: listMediaSchema.shape.query,
    },
  }
);

/**
 * POST /api/media - Upload media file
 */
export const POST = ApiWrapper.create(
  async (input, context) => {
    const formData = input as FormData;

    logger.info("Starting media upload", {
      requestId: context.requestId,
      userId: context.apiKey?.userId,
    });

    // Extract file from form data
    const file = formData.get("file") as File;
    if (!file) {
      throw new Error("No file provided");
    }

    // Validate file
    if (file.size === 0) {
      throw new Error("File is empty");
    }

    // Optional folder parameter
    const folder = formData.get("folder") as string | null;
    const tags = formData.getAll("tags") as string[];

    logger.info("Uploading file to ImageKit", {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      folder,
      tags,
    });

    // Upload to ImageKit
    const uploadResult = await imageKitService.uploadFile({
      file,
      fileName: file.name,
      folder: folder || "media",
      tags,
    });

    logger.info("File uploaded to ImageKit successfully", {
      fileId: uploadResult.fileId,
      url: uploadResult.url,
      mediaType: uploadResult.mediaType,
    });

    // Save to database
    const [mediaRecord] = await db
      .insert(schema.media)
      .values({
        fileName: uploadResult.name,
        fileSize: uploadResult.size,
        mimeType: uploadResult.mimeType,
        mediaType: uploadResult.mediaType,
        url: uploadResult.url,
        thumbnailUrl: uploadResult.thumbnailUrl,
        width: uploadResult.width,
        height: uploadResult.height,
      })
      .returning();

    logger.info("Media record saved to database", {
      mediaId: mediaRecord.id,
      fileName: mediaRecord.fileName,
    });

    return {
      id: mediaRecord.id,
      fileName: mediaRecord.fileName,
      fileSize: mediaRecord.fileSize,
      mimeType: mediaRecord.mimeType,
      mediaType: mediaRecord.mediaType,
      url: mediaRecord.url,
      thumbnailUrl: mediaRecord.thumbnailUrl,
      width: mediaRecord.width,
      height: mediaRecord.height,
      createdAt: mediaRecord.createdAt,
    };
  },
  {
    auth: {
      required: true,
      requiredScopes: ["media:write"],
    },
  }
);