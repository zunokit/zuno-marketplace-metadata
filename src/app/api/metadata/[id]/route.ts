import { z } from "zod";
import { ApiWrapper } from "@/shared/lib/api/api-handler";
import { db, schema } from "@/infrastructure/database/client";
import { logger } from "@/shared/lib/utils/logger";
import { eq } from "drizzle-orm";
import {
  getMetadataSchema,
  updateMetadataSchema,
  deleteMetadataSchema,
  validateAttributes,
  validateCreators,
} from "@/shared/lib/validation/metadata.schemas";

/**
 * GET /api/metadata/[id] - Get metadata by ID
 */
export const GET = ApiWrapper.create(
  async (input, context) => {
    const { params, query } = input as z.infer<typeof getMetadataSchema>;
    const { id } = params;
    const { version } = query || {};

    logger.info("Getting metadata by ID", {
      metadataId: id,
      version,
      requestId: context.requestId,
    });

    // Get metadata from database
    const [metadataRecord] = await db
      .select()
      .from(schema.metadata)
      .where(eq(schema.metadata.id, id))
      .limit(1);

    if (!metadataRecord) {
      logger.warn("Metadata not found", { metadataId: id });
      throw new Error(`Metadata with ID ${id} not found`);
    }

    // If specific version requested, validate it
    if (version !== undefined && metadataRecord.version !== version) {
      logger.warn("Metadata version mismatch", {
        metadataId: id,
        requestedVersion: version,
        currentVersion: metadataRecord.version,
      });
      throw new Error(`Metadata version ${version} not found. Current version is ${metadataRecord.version}`);
    }

    logger.info("Metadata retrieved successfully", {
      metadataId: id,
      name: metadataRecord.name,
      version: metadataRecord.version,
    });

    return {
      id: metadataRecord.id,
      name: metadataRecord.name,
      description: metadataRecord.description,
      symbol: metadataRecord.symbol,
      image: metadataRecord.image,
      bannerImage: metadataRecord.bannerImage,
      featuredImage: metadataRecord.featuredImage,
      animationUrl: metadataRecord.animationUrl,
      externalUrl: metadataRecord.externalUrl,
      backgroundColor: metadataRecord.backgroundColor,
      attributes: metadataRecord.attributes,
      mediaType: metadataRecord.mediaType,
      creators: metadataRecord.creators,
      sellerFeeBasisPoints: metadataRecord.sellerFeeBasisPoints,
      feeRecipient: metadataRecord.feeRecipient,
      version: metadataRecord.version,
      isLocked: metadataRecord.isLocked,
      isPinned: metadataRecord.isPinned,
      ipfsHash: metadataRecord.ipfsHash,
      ipfsUrl: metadataRecord.ipfsUrl,
      pinnedAt: metadataRecord.pinnedAt,
      createdAt: metadataRecord.createdAt,
      updatedAt: metadataRecord.updatedAt,
    };
  },
  {
    auth: {
      required: true,
      requiredScopes: ["metadata:read"],
    },
    validation: {
      params: getMetadataSchema.shape.params,
      query: getMetadataSchema.shape.query,
    },
  }
);

/**
 * PUT /api/metadata/[id] - Update metadata by ID
 */
export const PUT = ApiWrapper.create(
  async (input, context) => {
    const { params, body } = input as z.infer<typeof updateMetadataSchema>;
    const { id } = params;

    logger.info("Updating metadata by ID", {
      metadataId: id,
      requestId: context.requestId,
      userId: context.apiKey?.userId,
    });

    // Get current metadata
    const [currentMetadata] = await db
      .select()
      .from(schema.metadata)
      .where(eq(schema.metadata.id, id))
      .limit(1);

    if (!currentMetadata) {
      logger.warn("Metadata not found for update", { metadataId: id });
      throw new Error(`Metadata with ID ${id} not found`);
    }

    // Check if locked
    if (currentMetadata.isLocked) {
      logger.warn("Attempted to update locked metadata", {
        metadataId: id,
        version: currentMetadata.version,
      });
      throw new Error("Cannot update locked metadata");
    }

    // Validate version if provided
    if (body.version !== undefined && body.version !== currentMetadata.version) {
      logger.warn("Metadata version conflict", {
        metadataId: id,
        providedVersion: body.version,
        currentVersion: currentMetadata.version,
      });
      throw new Error(`Version conflict. Current version is ${currentMetadata.version}, provided ${body.version}`);
    }

    // Additional validation for attributes and creators
    if (body.attributes && !validateAttributes(body.attributes)) {
      throw new Error("Invalid attributes: duplicate trait types found");
    }

    if (body.creators && !validateCreators(body.creators)) {
      throw new Error("Invalid creators: total share exceeds 100%");
    }

    // Prepare update data
    const updateData: any = {};

    // Only include fields that are being updated
    Object.keys(body).forEach((key) => {
      if (body[key as keyof typeof body] !== undefined && key !== 'version') {
        updateData[key] = body[key as keyof typeof body];
      }
    });

    // Increment version for any content change
    const contentFields = ['name', 'description', 'symbol', 'image', 'bannerImage', 'featuredImage',
                          'animationUrl', 'externalUrl', 'backgroundColor', 'attributes', 'mediaType',
                          'creators', 'sellerFeeBasisPoints', 'feeRecipient'];

    const hasContentChanges = contentFields.some(field => updateData[field as keyof typeof updateData] !== undefined);

    if (hasContentChanges) {
      updateData.version = currentMetadata.version + 1;
    }

    // Update metadata
    const [updatedMetadata] = await db
      .update(schema.metadata)
      .set(updateData)
      .where(eq(schema.metadata.id, id))
      .returning();

    logger.info("Metadata updated successfully", {
      metadataId: id,
      oldVersion: currentMetadata.version,
      newVersion: updatedMetadata.version,
      hasContentChanges,
    });

    return {
      id: updatedMetadata.id,
      name: updatedMetadata.name,
      description: updatedMetadata.description,
      symbol: updatedMetadata.symbol,
      image: updatedMetadata.image,
      bannerImage: updatedMetadata.bannerImage,
      featuredImage: updatedMetadata.featuredImage,
      animationUrl: updatedMetadata.animationUrl,
      externalUrl: updatedMetadata.externalUrl,
      backgroundColor: updatedMetadata.backgroundColor,
      attributes: updatedMetadata.attributes,
      mediaType: updatedMetadata.mediaType,
      creators: updatedMetadata.creators,
      sellerFeeBasisPoints: updatedMetadata.sellerFeeBasisPoints,
      feeRecipient: updatedMetadata.feeRecipient,
      version: updatedMetadata.version,
      isLocked: updatedMetadata.isLocked,
      isPinned: updatedMetadata.isPinned,
      ipfsHash: updatedMetadata.ipfsHash,
      ipfsUrl: updatedMetadata.ipfsUrl,
      pinnedAt: updatedMetadata.pinnedAt,
      createdAt: updatedMetadata.createdAt,
      updatedAt: updatedMetadata.updatedAt,
    };
  },
  {
    auth: {
      required: true,
      requiredScopes: ["metadata:write"],
    },
    validation: {
      params: updateMetadataSchema.shape.params,
      body: updateMetadataSchema.shape.body,
    },
  }
);

/**
 * DELETE /api/metadata/[id] - Delete metadata by ID
 */
export const DELETE = ApiWrapper.create(
  async (input, context) => {
    const { params } = input as z.infer<typeof deleteMetadataSchema>;
    const { id } = params;

    logger.info("Deleting metadata by ID", {
      metadataId: id,
      requestId: context.requestId,
      userId: context.apiKey?.userId,
    });

    // Get metadata first to check if it exists and get details
    const [metadataRecord] = await db
      .select()
      .from(schema.metadata)
      .where(eq(schema.metadata.id, id))
      .limit(1);

    if (!metadataRecord) {
      logger.warn("Metadata not found for deletion", { metadataId: id });
      throw new Error(`Metadata with ID ${id} not found`);
    }

    // Check if locked
    if (metadataRecord.isLocked) {
      logger.warn("Attempted to delete locked metadata", {
        metadataId: id,
        name: metadataRecord.name,
        version: metadataRecord.version,
      });
      throw new Error("Cannot delete locked metadata");
    }

    // Delete metadata
    await db
      .delete(schema.metadata)
      .where(eq(schema.metadata.id, id));

    logger.info("Metadata deleted successfully", {
      metadataId: id,
      name: metadataRecord.name,
      version: metadataRecord.version,
    });

    return {
      message: "Metadata deleted successfully",
      deletedMetadata: {
        id: metadataRecord.id,
        name: metadataRecord.name,
        version: metadataRecord.version,
      },
    };
  },
  {
    auth: {
      required: true,
      requiredScopes: ["metadata:delete"],
    },
    validation: {
      params: deleteMetadataSchema.shape.params,
    },
  }
);