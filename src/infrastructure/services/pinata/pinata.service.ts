import { PinataClient } from "./pinata.client";
import { logger } from "@/shared/lib/utils/logger";
import type { MediaType } from "@/shared/types";
import { tryCatch, unwrapOrThrow } from "@/shared/lib/utils";

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
    const result = await tryCatch(
      async () => {
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
        const res = await this.client.uploadJSON(metadata, {
          name: `${params.name} - Metadata`,
          keyvalues: {
            type: "nft-metadata",
            name: params.name,
            uploadedAt: new Date().toISOString(),
          },
        });

        logger.info("Metadata stored to IPFS successfully", {
          name: params.name,
          hash: res.hash,
        });

        return {
          hash: res.hash,
          url: res.url,
        };
      },
      {
        errorMessage: "Failed to store metadata to IPFS",
        context: { name: params.name },
      }
    );

    return unwrapOrThrow(result);
  }

  /**
   * Store media file on IPFS
   */
  async storeMedia(params: StoreMediaParams): Promise<{
    hash: string;
    url: string;
    size: number;
  }> {
    const result = await tryCatch(
      async () => {
        logger.info("Storing media to IPFS", {
          fileName: params.file.name,
          mediaType: params.mediaType,
        });

        const res = await this.client.uploadFile(params.file, {
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
          hash: res.hash,
          size: res.size,
        });

        return {
          hash: res.hash,
          url: res.url,
          size: res.size,
        };
      },
      {
        errorMessage: "Failed to store media to IPFS",
        context: { fileName: params.file.name },
      }
    );

    return unwrapOrThrow(result);
  }

  /**
   * Retrieve metadata from IPFS
   */
  async getMetadata(hash: string): Promise<any> {
    const result = await tryCatch(
      () => this.client.retrieve(hash),
      {
        errorMessage: "Failed to retrieve metadata from IPFS",
        context: { hash },
        shouldLog: true,
      }
    );

    return result.success ? result.data : null;
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
    const result = await tryCatch(
      async () => {
        const files = await this.client.listFiles({ limit: 1000 });

        return {
          totalFiles: files.length,
        };
      },
      {
        errorMessage: "Failed to get Pinata usage stats",
        shouldLog: true,
      }
    );

    return result.success ? result.data : null;
  }

  /**
   * Health check
   */
  async health(): Promise<boolean> {
    return await this.client.health();
  }
}
