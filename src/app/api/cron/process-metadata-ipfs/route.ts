import { db, schema } from "@/infrastructure/database/client";
import { eq, and, isNull } from "drizzle-orm";
import { PinataClient } from "@/infrastructure/services/pinata/pinata.client";
import { PINATA_GROUPS } from "@/infrastructure/services/pinata/pinata.constants";
import { logger } from "@/shared/lib/utils/logger";
import { getCurrentApiVersion } from "@/shared/lib/utils/api-version";
import { getCacheService } from "@/infrastructure/di/container";
import { ApiWrapper, ApiError } from "@/shared/lib/api/api-handler";
import { ErrorCode } from "@/shared/types";

/**
 * Cron endpoint to process unpinned metadata
 *
 * Called by cron-job.org to pin metadata to IPFS
 * Processes up to 10 metadata items per run
 *
 * Authentication: Requires CRON_SECRET via Authorization Bearer token
 */

const BATCH_SIZE = 10;
const pinataClient = PinataClient.getInstance();

export const GET = ApiWrapper.create(
  async (input, context) => {
    // Security: Verify cron secret
    const authHeader = context.request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      throw new ApiError(
        "Unauthorized - Invalid or missing CRON_SECRET",
        ErrorCode.UNAUTHORIZED,
        401
      );
    }

    logger.info("Starting metadata IPFS pinning cron job");

    // Get unpinned metadata (limit batch size)
    const unpinnedMetadata = await db
      .select()
      .from(schema.metadata)
      .where(
        and(
          eq(schema.metadata.isPinned, false),
          isNull(schema.metadata.ipfsHash)
        )
      )
      .limit(BATCH_SIZE);

    if (unpinnedMetadata.length === 0) {
      logger.info("No unpinned metadata found");
      return { processed: 0, success: 0, failed: 0 };
    }

    logger.info(`Found ${unpinnedMetadata.length} unpinned metadata items`);

    const results = await Promise.allSettled(
      unpinnedMetadata.map(async (item) => {
        try {
          // Get current API version
          const apiVersion = await getCurrentApiVersion();

          // Build OpenSea-compatible metadata JSON
          const metadataJson: Record<string, unknown> = {
            name: item.name,
            description: item.description,
            image: item.image,
          };

          // Add optional fields
          if (item.symbol) metadataJson.symbol = item.symbol;
          if (item.bannerImage) metadataJson.banner_image = item.bannerImage;
          if (item.featuredImage)
            metadataJson.featured_image = item.featuredImage;
          if (item.animationUrl) metadataJson.animation_url = item.animationUrl;
          if (item.externalUrl) metadataJson.external_url = item.externalUrl;
          if (item.backgroundColor)
            metadataJson.background_color = item.backgroundColor;
          if (item.attributes) metadataJson.attributes = item.attributes;

          // Upload JSON to Pinata
          const pinResult = await pinataClient.uploadJSON(metadataJson, {
            name: `${item.name}-Metadata`,
            version: apiVersion,
            groupName: PINATA_GROUPS.METADATA,
            keyvalues: {
              metadataId: item.id,
              type: "nft-metadata",
              name: item.name,
              apiVersion,
              pinnedAt: new Date().toISOString(),
            },
          });

          // Update database with IPFS info
          await db
            .update(schema.metadata)
            .set({
              ipfsHash: pinResult.hash,
              ipfsUrl: pinResult.url,
              isPinned: true,
              pinnedAt: new Date(),
            })
            .where(eq(schema.metadata.id, item.id));

          // Invalidate cache for this metadata item
          const cache = getCacheService();
          await cache.invalidateMetadata(item.id);

          logger.info("Metadata pinned to IPFS", {
            metadataId: item.id,
            ipfsHash: pinResult.hash,
          });

          return { id: item.id, success: true };
        } catch (error) {
          logger.error("Failed to pin metadata", {
            metadataId: item.id,
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

    logger.info("Metadata IPFS pinning cron job completed", {
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
    auth: {
      required: false, // Custom auth via CRON_SECRET
      allowApiKey: false,
      allowSession: false,
    },
    versioning: {
      required: false, // Cron jobs don't need API versioning
    },
  }
);
