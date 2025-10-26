import { env } from "@/shared/config/env";
import { logger } from "@/shared/lib/utils/logger";
import { tryCatch, unwrapOrThrow } from "@/shared/lib/utils/server";

/**
 * Pinata IPFS Client
 *
 * Low-level client for interacting with Pinata API using fetch
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
  timestamp: string;
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

// Type guards for runtime validation
function isPinataListResponse(data: unknown): data is PinataListResponse {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as { rows?: unknown };
  return 'rows' in data && Array.isArray(obj.rows);
}

export class PinataClient {
  private static instance: PinataClient;
  private baseUrl = "https://api.pinata.cloud";
  private gatewayUrl = env.PINATA_GATEWAY_URL || "https://gateway.pinata.cloud";
  private jwt = env.PINATA_JWT;

  private constructor() {}

  public static getInstance(): PinataClient {
    if (!PinataClient.instance) {
      PinataClient.instance = new PinataClient();
    }
    return PinataClient.instance;
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

        logger.info("Uploading JSON to Pinata", { uniqueName });

        const response = await fetch(`${this.baseUrl}/pinning/pinJSONToIPFS`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.jwt}`,
          },
          body: JSON.stringify({
            pinataContent: data,
            pinataMetadata: {
              name: uniqueName,
              keyvalues: metadata?.keyvalues,
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`Pinata API error: ${response.statusText}`);
        }

        const res = await response.json();

        logger.info("JSON uploaded to Pinata successfully", {
          hash: res.IpfsHash,
          size: res.PinSize,
        });

        return {
          hash: res.IpfsHash,
          url: `${this.gatewayUrl}/ipfs/${res.IpfsHash}`,
          size: res.PinSize,
          timestamp: res.Timestamp,
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
        });

        const formData = new FormData();
        formData.append("file", file);

        if (metadata) {
          formData.append("pinataMetadata", JSON.stringify({
            name: uniqueName,
            keyvalues: {
              ...metadata.keyvalues,
              originalName: metadata.name || file.name,
            },
          }));
        }

        const response = await fetch(`${this.baseUrl}/pinning/pinFileToIPFS`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.jwt}`,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Pinata API error: ${response.statusText}`);
        }

        const res = await response.json();

        logger.info("File uploaded to Pinata successfully", {
          hash: res.IpfsHash,
          size: res.PinSize,
          fileName: file.name,
        });

        return {
          hash: res.IpfsHash,
          url: `${this.gatewayUrl}/ipfs/${res.IpfsHash}`,
          size: res.PinSize,
          timestamp: res.Timestamp,
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

        const response = await fetch(`${this.baseUrl}/pinning/pinByHash`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.jwt}`,
          },
          body: JSON.stringify({
            hashToPin: hash,
            pinataMetadata: metadata,
          }),
        });

        if (!response.ok) {
          throw new Error(`Pinata API error: ${response.statusText}`);
        }

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

        const response = await fetch(`${this.baseUrl}/pinning/unpin/${hash}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${this.jwt}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Pinata API error: ${response.statusText}`);
        }

        logger.info("Unpinned from Pinata successfully", { hash });
        return true;
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
        const response = await fetch(`${this.baseUrl}/data/pinList?hashContains=${hash}`, {
          headers: {
            Authorization: `Bearer ${this.jwt}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Pinata API error: ${response.statusText}`);
        }

        const data: unknown = await response.json();

        if (!isPinataListResponse(data)) {
          logger.error("Invalid response from Pinata API", { hash });
          return null;
        }

        return data.rows.length > 0 ? data.rows[0] : null;
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
        const params = new URLSearchParams();
        if (filters?.limit) {
          params.append("pageLimit", filters.limit.toString());
        }

        const response = await fetch(`${this.baseUrl}/data/pinList?${params}`, {
          headers: {
            Authorization: `Bearer ${this.jwt}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Pinata API error: ${response.statusText}`);
        }

        const data: unknown = await response.json();

        if (!isPinataListResponse(data)) {
          logger.error("Invalid response from Pinata API");
          return [];
        }

        return data.rows;
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
        const response = await fetch(`${this.baseUrl}/data/pinList?pageLimit=1`, {
          headers: {
            Authorization: `Bearer ${this.jwt}`,
          },
        });

        return response.ok;
      },
      {
        errorMessage: "Pinata health check failed",
        shouldLog: true,
      }
    );

    return result.success ? result.data : false;
  }
}
