import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/infrastructure/database/client";
import { eq, and, isNull } from "drizzle-orm";
import { PinataClient } from "@/infrastructure/services/pinata/pinata.client";
import { PINATA_GROUPS } from "@/infrastructure/services/pinata/pinata.constants";
import { logger } from "@/shared/lib/utils/logger";
import { tryCatch } from "@/shared/lib/utils/server";
import { getCurrentApiVersion } from "@/shared/lib/utils/api-version";
import { getCacheService } from "@/infrastructure/cache/cache.service";
import { handleCronAuth } from "@/shared/lib/utils/cron-auth";

/**
 * Cron endpoint to process unpinned media
 *
 * Called by cron-job.org to pin media files to IPFS
 * Processes up to 5 media items per run (files are larger)
 */

const BATCH_SIZE = 5;
const pinataClient = PinataClient.getInstance();

export async function GET(request: NextRequest) {
  // Security: Verify cron secret with timing-attack protection
  const authResult = handleCronAuth(request, process.env.CRON_SECRET);
  if (!authResult.authorized) {
    return authResult.response!;
  }

  logger.info("Starting media IPFS pinning cron job");

  const result = await tryCatch(
    async () => {
      // Get unpinned media (limit batch size)
      const unpinnedMedia = await db
        .select()
        .from(schema.media)
        .where(
          and(
            eq(schema.media.isPinned, false),
            isNull(schema.media.ipfsHash)
          )
        )
        .limit(BATCH_SIZE);

      if (unpinnedMedia.length === 0) {
        logger.info("No unpinned media found");
        return { processed: 0, success: 0, failed: 0 };
      }

      logger.info(`Found ${unpinnedMedia.length} unpinned media items`);

      const results = await Promise.allSettled(
        unpinnedMedia.map(async (item) => {
          try {
            // Get current API version
            const apiVersion = await getCurrentApiVersion();

            // Fetch the file from ImageKit URL
            const response = await fetch(item.url);
            if (!response.ok) {
              throw new Error(`Failed to fetch media: ${response.statusText}`);
            }

            const blob = await response.blob();
            const file = new File([blob], item.fileName, { type: blob.type });

            // Upload to Pinata
            const pinResult = await pinataClient.uploadFile(file, {
              name: item.fileName,
              version: apiVersion,
              groupName: PINATA_GROUPS.MEDIA,
              keyvalues: {
                mediaId: item.id,
                mediaType: item.mediaType,
                apiVersion,
                originalUrl: item.url,
                pinnedAt: new Date().toISOString(),
              },
            });

            // Update database with IPFS info
            await db
              .update(schema.media)
              .set({
                ipfsHash: pinResult.hash,
                ipfsUrl: pinResult.url,
                isPinned: true,
                pinnedAt: new Date(),
              })
              .where(eq(schema.media.id, item.id));

            // Invalidate cache for this media item
            const cache = getCacheService();
            await cache.invalidateMedia(item.id);

            logger.info("Media pinned to IPFS", {
              mediaId: item.id,
              ipfsHash: pinResult.hash,
            });

            return { id: item.id, success: true };
          } catch (error) {
            logger.error("Failed to pin media", {
              mediaId: item.id,
              error: error instanceof Error ? error.message : String(error),
            });
            return { id: item.id, success: false };
          }
        })
      );

      const successCount = results.filter(
        (r) => r.status === "fulfilled" && r.value.success
      ).length;
      const failedCount = results.length - successCount;

      logger.info("Media IPFS pinning cron job completed", {
        processed: results.length,
        success: successCount,
        failed: failedCount,
      });

      return {
        processed: results.length,
        success: successCount,
        failed: failedCount,
      };
    },
    {
      errorMessage: "Media IPFS pinning cron job failed",
      shouldLog: true,
    }
  );

  if (!result.success) {
    return NextResponse.json(
      { error: "Internal server error", message: result.error?.message },
      { status: 500 }
    );
  }

  return NextResponse.json(result.data);
}
