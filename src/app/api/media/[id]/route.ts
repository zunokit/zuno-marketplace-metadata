import { z } from "zod";
import { ApiWrapper, commonSchemas } from "@/shared/lib/api/api-handler";
import { ImageKitService } from "@/infrastructure/services/imagekit.service";
import { db, schema } from "@/infrastructure/database/client";
import { logger } from "@/shared/lib/utils/logger";
import { eq } from "drizzle-orm";

// Validation schemas
const getMediaSchema = z.object({
  params: commonSchemas.id,
});

// Services
const imageKitService = new ImageKitService();

/**
 * GET /api/media/[id] - Get media by ID
 */
export const GET = ApiWrapper.create(
  async (input, context) => {
    const { params } = input as z.infer<typeof getMediaSchema>;
    const { id } = params;

    logger.info("Getting media by ID", {
      mediaId: id,
      requestId: context.requestId,
    });

    // Get media from database
    const [mediaRecord] = await db
      .select()
      .from(schema.media)
      .where(eq(schema.media.id, id))
      .limit(1);

    if (!mediaRecord) {
      logger.warn("Media not found", { mediaId: id });
      throw new Error(`Media with ID ${id} not found`);
    }

    return {
      id: mediaRecord.id,
      fileName: mediaRecord.fileName,
      fileSize: mediaRecord.fileSize,
      mimeType: mediaRecord.mimeType,
      mediaType: mediaRecord.mediaType,
      url: mediaRecord.url,
      thumbnailUrl: mediaRecord.thumbnailUrl,
      optimizedUrl: mediaRecord.optimizedUrl,
      width: mediaRecord.width,
      height: mediaRecord.height,
      duration: mediaRecord.duration,
      ipfsHash: mediaRecord.ipfsHash,
      ipfsUrl: mediaRecord.ipfsUrl,
      isPinned: mediaRecord.isPinned,
      pinnedAt: mediaRecord.pinnedAt,
      createdAt: mediaRecord.createdAt,
    };
  },
  {
    auth: {
      required: true,
      requiredScopes: ["media:read"],
    },
    validation: {
      params: getMediaSchema.shape.params,
    },
  }
);

/**
 * DELETE /api/media/[id] - Delete media by ID
 */
export const DELETE = ApiWrapper.create(
  async (input, context) => {
    const { params } = input as z.infer<typeof getMediaSchema>;
    const { id } = params;

    logger.info("Deleting media by ID", {
      mediaId: id,
      requestId: context.requestId,
      userId: context.apiKey?.userId,
    });

    // Get media from database first
    const [mediaRecord] = await db
      .select()
      .from(schema.media)
      .where(eq(schema.media.id, id))
      .limit(1);

    if (!mediaRecord) {
      logger.warn("Media not found for deletion", { mediaId: id });
      throw new Error(`Media with ID ${id} not found`);
    }

    // Extract ImageKit file ID from URL
    const fileId = extractImageKitFileId(mediaRecord.url);

    try {
      // Delete from ImageKit first
      if (fileId) {
        await imageKitService.deleteFile(fileId);
        logger.info("Media deleted from ImageKit", {
          mediaId: id,
          fileId,
        });
      }

      // Delete from database
      await db
        .delete(schema.media)
        .where(eq(schema.media.id, id));

      logger.info("Media deleted from database", {
        mediaId: id,
        fileName: mediaRecord.fileName,
      });

      return {
        message: "Media deleted successfully",
        deletedMedia: {
          id: mediaRecord.id,
          fileName: mediaRecord.fileName,
        },
      };
    } catch (error) {
      logger.error("Failed to delete media", {
        mediaId: id,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new Error(`Failed to delete media: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
  {
    auth: {
      required: true,
      requiredScopes: ["media:delete"],
    },
    validation: {
      params: getMediaSchema.shape.params,
    },
  }
);

/**
 * Extract ImageKit file ID from URL
 */
function extractImageKitFileId(url: string): string | null {
  try {
    const urlParts = url.split('/');
    const filename = urlParts[urlParts.length - 1].split('?')[0];
    return filename;
  } catch (error) {
    logger.warn("Failed to extract ImageKit file ID from URL", { url, error });
    return null;
  }
}