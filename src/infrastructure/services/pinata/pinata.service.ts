import { PinataClient } from "./pinata.client";
import { logger } from "@/shared/lib/utils/logger";
import type { MediaType } from "@/shared/types";

/**
 * Pinata Service
 *
 * High-level service for NFT metadata and media operations
 */

export interface StoreMetadataParams {
  name: string;
  description?: string;
  image: string;
  animationUrl?: string;
  externalUrl?: string;
  attributes?: Array<{
    traitType: string;
    value: string | number;
    displayType?: string;
  }>;
  metadata?: Record<string, unknown>;
}

export interface StoreMediaParams {
  file: File;
  mediaType: MediaType;
  metadata?: {
    name?: string;
    description?: string;
    tags?: string[];
  };
}

export class PinataService {
  private client = PinataClient.getInstance();

  /**
   * Store NFT metadata as JSON on IPFS
   */
  async storeMetadata(params: StoreMetadataParams): Promise<{
    hash: string;
    url: string;
  }> {
    try {
      logger.info("Storing metadata to IPFS", { name: params.name });

      // Build OpenSea-compatible metadata
      const metadata: Record<string, unknown> = {
        name: params.name,
        description: params.description,
        image: params.image,
      };

      if (params.animationUrl) {
        metadata.animation_url = params.animationUrl;
      }

      if (params.externalUrl) {
        metadata.external_url = params.externalUrl;
      }

      if (params.attributes && params.attributes.length > 0) {
        metadata.attributes = params.attributes.map((attr) => ({
          trait_type: attr.traitType,
          value: attr.value,
          ...(attr.displayType && { display_type: attr.displayType }),
        }));
      }

      // Add any custom metadata
      if (params.metadata) {
        Object.assign(metadata, params.metadata);
      }

      // Upload to IPFS
      const result = await this.client.uploadJSON(metadata, {
        name: `${params.name} - Metadata`,
        keyvalues: {
          type: "nft-metadata",
          name: params.name,
          uploadedAt: new Date().toISOString(),
        },
      });

      logger.info("Metadata stored to IPFS successfully", {
        name: params.name,
        hash: result.hash,
      });

      return {
        hash: result.hash,
        url: result.url,
      };
    } catch (error) {
      logger.error("Failed to store metadata to IPFS", {
        error: error instanceof Error ? error.message : String(error),
        name: params.name,
      });
      throw new Error(`Failed to store metadata: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Store media file on IPFS
   */
  async storeMedia(params: StoreMediaParams): Promise<{
    hash: string;
    url: string;
    size: number;
  }> {
    try {
      logger.info("Storing media to IPFS", {
        fileName: params.file.name,
        mediaType: params.mediaType,
      });

      const result = await this.client.uploadFile(params.file, {
        name: params.metadata?.name || params.file.name,
        keyvalues: {
          type: "nft-media",
          mediaType: params.mediaType,
          originalName: params.file.name,
          uploadedAt: new Date().toISOString(),
          ...(params.metadata?.description && {
            description: params.metadata.description,
          }),
        },
      });

      logger.info("Media stored to IPFS successfully", {
        fileName: params.file.name,
        hash: result.hash,
        size: result.size,
      });

      return {
        hash: result.hash,
        url: result.url,
        size: result.size,
      };
    } catch (error) {
      logger.error("Failed to store media to IPFS", {
        error: error instanceof Error ? error.message : String(error),
        fileName: params.file.name,
      });
      throw new Error(`Failed to store media: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Retrieve metadata from IPFS
   */
  async getMetadata(hash: string): Promise<any> {
    try {
      return await this.client.retrieve(hash);
    } catch (error) {
      logger.error("Failed to retrieve metadata from IPFS", {
        error: error instanceof Error ? error.message : String(error),
        hash,
      });
      return null;
    }
  }

  /**
   * Unpin file from IPFS
   */
  async unpinFile(hash: string): Promise<boolean> {
    return await this.client.unpin(hash);
  }

  /**
   * Batch upload multiple metadata files
   */
  async batchStoreMetadata(
    metadataList: StoreMetadataParams[]
  ): Promise<Array<{ hash: string; url: string } | null>> {
    const results = await Promise.allSettled(
      metadataList.map((metadata) => this.storeMetadata(metadata))
    );

    return results.map((result) =>
      result.status === "fulfilled" ? result.value : null
    );
  }

  /**
   * Batch upload multiple media files
   */
  async batchStoreMedia(
    mediaList: StoreMediaParams[]
  ): Promise<Array<{ hash: string; url: string; size: number } | null>> {
    const results = await Promise.allSettled(
      mediaList.map((media) => this.storeMedia(media))
    );

    return results.map((result) =>
      result.status === "fulfilled" ? result.value : null
    );
  }

  /**
   * Get storage statistics
   */
  async getUsage(): Promise<{
    totalFiles: number;
  } | null> {
    try {
      const files = await this.client.listFiles({ limit: 1000 });

      return {
        totalFiles: files.length,
      };
    } catch (error) {
      logger.error("Failed to get Pinata usage stats", { error });
      return null;
    }
  }

  /**
   * Health check
   */
  async health(): Promise<boolean> {
    return await this.client.health();
  }
}
