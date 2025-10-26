import { PinataSDK } from "pinata";
import type {
  GroupListResponse,
  GroupResponseItem,
  FileListItem,
  UploadResponse,
} from "pinata";
import { env } from "@/shared/config/env";
import { logger } from "@/shared/lib/utils/logger";
import { tryCatch, unwrapOrThrow } from "@/shared/lib/utils/server";

/**
 * Pinata IPFS Client
 *
 * Low-level client for interacting with Pinata API using Pinata SDK v2
 */

export interface PinataUploadMetadata {
  name?: string;
  keyvalues?: Record<string, string>;
  groupName?: string;
  version?: string; // API version (e.g., 'v1', '1.0.0')
}

export interface PinataUploadResult {
  hash: string;
  url: string;
  size: number;
  timestamp?: string;
}

export interface PinataPinMetadata {
  name?: string;
  keyvalues?: Record<string, string>;
}

export interface PinataFileDetails {
  id: string;
  ipfs_pin_hash: string;
  size: number;
  user_id: string;
  date_pinned: string;
  date_unpinned: string | null;
  metadata: PinataPinMetadata;
  regions: Array<{
    regionId: string;
    currentReplicationCount: number;
    desiredReplicationCount: number;
  }>;
}

export interface PinataListResponse {
  count: number;
  rows: PinataFileDetails[];
}


export class PinataClient {
  private static instance: PinataClient;
  private pinata: PinataSDK;
  private gatewayUrl = env.PINATA_GATEWAY_URL || "https://gateway.pinata.cloud";
  private groupCache: Map<string, string> = new Map(); // Cache group IDs by name

  private constructor() {
    this.pinata = new PinataSDK({
      pinataJwt: env.PINATA_JWT,
      pinataGateway: env.PINATA_GATEWAY_URL,
    });
  }

  public static getInstance(): PinataClient {
    if (!PinataClient.instance) {
      PinataClient.instance = new PinataClient();
    }
    return PinataClient.instance;
  }

  /**
   * Get or create a Pinata group by name
   * Groups help organize files in Pinata dashboard
   */
  async getOrCreateGroup(groupName: string): Promise<string | null> {
    try {
      // Check cache first
      const cachedGroupId = this.groupCache.get(groupName);
      if (cachedGroupId) {
        return cachedGroupId;
      }

      // Try to list existing groups and find by name
      const groupsResponse: GroupListResponse = await this.pinata.groups.public.list();
      const existingGroup: GroupResponseItem | undefined = groupsResponse.groups?.find(
        (group: GroupResponseItem) => group.name === groupName
      );

      if (existingGroup) {
        this.groupCache.set(groupName, existingGroup.id);
        logger.info("Found existing Pinata group", {
          groupName,
          groupId: existingGroup.id
        });
        return existingGroup.id;
      }

      // Create new group
      const newGroup: GroupResponseItem = await this.pinata.groups.public.create({
        name: groupName,
      });

      this.groupCache.set(groupName, newGroup.id);
      logger.info("Created new Pinata group", {
        groupName,
        groupId: newGroup.id
      });
      return newGroup.id;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to get/create Pinata group: ${groupName}`, {
        error: errorMessage
      });
      return null; // Graceful fallback - continue without group
    }
  }

  /**
   * Generate unique filename: basename-version-random.ext
   */
  private generateUniqueFilename(name: string, version: string): string {
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const extension = name.includes('.') ? `.${name.split('.').pop()}` : '';
    const baseName = name.replace(/\.[^/.]+$/, '');
    return `${baseName}-${version}-${randomSuffix}${extension}`;
  }

  /**
   * Map FileListItem from Pinata SDK to PinataFileDetails
   * Centralized mapping to avoid code duplication
   */
  private mapFileListItemToDetails(file: FileListItem): PinataFileDetails {
    return {
      id: file.id,
      ipfs_pin_hash: file.cid,
      size: file.size,
      user_id: "", // Not available in SDK v2
      date_pinned: file.created_at,
      date_unpinned: null,
      metadata: {
        name: file.name ?? "",
        keyvalues: file.keyvalues ?? {},
      },
      regions: [],
    };
  }

  /**
   * Upload JSON to IPFS via Pinata
   */
  async uploadJSON(
    data: unknown,
    metadata?: PinataUploadMetadata
  ): Promise<PinataUploadResult> {
    const result = await tryCatch(
      async () => {
        const baseName = metadata?.name || "metadata.json";
        const version = metadata?.version || "v1";
        const uniqueName = this.generateUniqueFilename(baseName, version);

        logger.info("Uploading JSON to Pinata", { uniqueName, groupName: metadata?.groupName });

        // Convert JSON to File blob
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const file = new File([blob], uniqueName, { type: "application/json" });

        // Get or create group if specified
        let groupId: string | null = null;
        if (metadata?.groupName) {
          groupId = await this.getOrCreateGroup(metadata.groupName);
        }

        // Prepare upload metadata
        const uploadMetadata = {
          name: uniqueName,
          keyvalues: {
            type: "nft-metadata",
            version: version,
            ...(metadata?.groupName && { group: metadata.groupName }),
            ...metadata?.keyvalues,
          },
        };

        // Upload with optional group
        let uploadResult: UploadResponse;
        if (groupId) {
          uploadResult = await this.pinata.upload.public
            .file(file, { metadata: uploadMetadata })
            .group(groupId);
        } else {
          uploadResult = await this.pinata.upload.public
            .file(file, { metadata: uploadMetadata });
        }

        logger.info("JSON uploaded to Pinata successfully", {
          hash: uploadResult.cid,
          size: uploadResult.size,
          groupId,
        });

        return {
          hash: uploadResult.cid,
          url: `${this.gatewayUrl}/ipfs/${uploadResult.cid}`,
          size: uploadResult.size ?? 0,
        };
      },
      {
        errorMessage: "Failed to upload JSON to Pinata",
        context: { metadata },
      }
    );

    return unwrapOrThrow(result);
  }

  /**
   * Upload file to IPFS via Pinata
   */
  async uploadFile(
    file: File,
    metadata?: PinataUploadMetadata
  ): Promise<PinataUploadResult> {
    const result = await tryCatch(
      async () => {
        const baseName = metadata?.name || file.name;
        const version = metadata?.version || "v1";
        const uniqueName = this.generateUniqueFilename(baseName, version);

        logger.info("Uploading file to Pinata", {
          originalFileName: file.name,
          uniqueName,
          fileSize: file.size,
          groupName: metadata?.groupName,
        });

        // Get or create group if specified
        let groupId: string | null = null;
        if (metadata?.groupName) {
          groupId = await this.getOrCreateGroup(metadata.groupName);
        }

        // Prepare upload metadata
        const uploadMetadata = {
          name: uniqueName,
          keyvalues: {
            type: "nft-media",
            version: version,
            originalName: metadata?.name || file.name,
            ...(metadata?.groupName && { group: metadata.groupName }),
            ...metadata?.keyvalues,
          },
        };

        // Upload with optional group
        let uploadResult: UploadResponse;
        if (groupId) {
          uploadResult = await this.pinata.upload.public
            .file(file, { metadata: uploadMetadata })
            .group(groupId);
        } else {
          uploadResult = await this.pinata.upload.public
            .file(file, { metadata: uploadMetadata });
        }

        logger.info("File uploaded to Pinata successfully", {
          hash: uploadResult.cid,
          size: uploadResult.size,
          fileName: file.name,
          groupId,
        });

        return {
          hash: uploadResult.cid,
          url: `${this.gatewayUrl}/ipfs/${uploadResult.cid}`,
          size: uploadResult.size ?? file.size,
        };
      },
      {
        errorMessage: "Failed to upload file to Pinata",
        context: { fileName: file.name },
      }
    );

    return unwrapOrThrow(result);
  }

  /**
   * Pin existing IPFS hash to Pinata
   */
  async pinByHash(
    hash: string,
    metadata?: PinataPinMetadata
  ): Promise<void> {
    const result = await tryCatch(
      async () => {
        logger.info("Pinning hash to Pinata", { hash, metadata });

        await this.pinata.upload.public.cid(hash, {
          metadata: {
            name: metadata?.name || hash,
            keyvalues: metadata?.keyvalues,
          },
        });

        logger.info("Hash pinned to Pinata successfully", { hash });
      },
      {
        errorMessage: "Failed to pin hash to Pinata",
        context: { hash },
      }
    );

    unwrapOrThrow(result);
  }

  /**
   * Unpin file from Pinata
   */
  async unpin(hash: string): Promise<boolean> {
    const result = await tryCatch(
      async () => {
        logger.info("Unpinning from Pinata", { hash });

        // Find the file by CID first
        const files = await this.pinata.files.public.list().cid(hash).limit(1);

        if (files && files.files && files.files.length > 0) {
          await this.pinata.files.public.delete([files.files[0].id]);
          logger.info("Unpinned from Pinata successfully", { hash });
          return true;
        }

        logger.warn("File not found for unpinning", { hash });
        return false;
      },
      {
        errorMessage: "Failed to unpin from Pinata",
        context: { hash },
        shouldLog: true,
      }
    );

    return result.success ? result.data : false;
  }

  /**
   * Get file details from Pinata
   */
  async getFileDetails(hash: string): Promise<PinataFileDetails | null> {
    const result = await tryCatch(
      async () => {
        const files = await this.pinata.files.public.list().cid(hash).limit(1);

        if (files?.files?.length > 0) {
          return this.mapFileListItemToDetails(files.files[0]);
        }

        return null;
      },
      {
        errorMessage: "Failed to get file details from Pinata",
        context: { hash },
        shouldLog: true,
      }
    );

    return result.success ? result.data : null;
  }

  /**
   * List pinned files
   */
  async listFiles(filters?: {
    metadata?: Record<string, string>;
    limit?: number;
  }): Promise<PinataFileDetails[]> {
    const result = await tryCatch(
      async () => {
        let query = this.pinata.files.public.list();

        if (filters?.limit) {
          query = query.limit(filters.limit);
        }

        if (filters?.metadata) {
          query = query.keyvalues(filters.metadata);
        }

        const files = await query;

        return files.files.map((file: FileListItem) =>
          this.mapFileListItemToDetails(file)
        );
      },
      {
        errorMessage: "Failed to list files from Pinata",
        shouldLog: true,
      }
    );

    return result.success ? result.data : [];
  }

  /**
   * Retrieve file from IPFS
   */
  async retrieve<T = unknown>(hash: string): Promise<T | null> {
    const result = await tryCatch(
      async () => {
        const gatewayUrl = `${this.gatewayUrl}/ipfs/${hash}`;
        const response = await fetch(gatewayUrl);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const contentType = response.headers.get("content-type");

        if (contentType?.includes("application/json")) {
          return await response.json();
        }

        // For non-JSON, return as text
        return await response.text() as T;
      },
      {
        errorMessage: "Failed to retrieve file from IPFS",
        context: { hash },
        shouldLog: true,
      }
    );

    return result.success ? result.data : null;
  }

  /**
   * Check if hash is valid IPFS hash
   */
  static isValidHash(hash: string): boolean {
    // IPFS CIDv0 starts with "Qm" and is 46 characters
    // IPFS CIDv1 starts with "bafy" and varies in length
    return (
      (hash.startsWith("Qm") && hash.length === 46) ||
      hash.startsWith("bafy")
    );
  }

  /**
   * Health check for Pinata service
   */
  async health(): Promise<boolean> {
    const result = await tryCatch(
      async () => {
        // Try to list files as a health check
        const files = await this.pinata.files.public.list().limit(1);
        return !!files;
      },
      {
        errorMessage: "Pinata health check failed",
        shouldLog: true,
      }
    );

    return result.success ? result.data : false;
  }
}
