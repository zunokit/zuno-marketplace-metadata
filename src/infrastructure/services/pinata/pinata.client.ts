import { env } from "@/shared/config/env";
import { logger } from "@/shared/lib/utils/logger";

/**
 * Pinata IPFS Client
 *
 * Low-level client for interacting with Pinata API using fetch
 */

export interface PinataUploadMetadata {
  name?: string;
  keyvalues?: Record<string, string>;
  groupName?: string;
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

export class PinataClient {
  private static instance: PinataClient;
  private baseUrl = "https://api.pinata.cloud";
  private gatewayUrl = env.PINATA_GATEWAY_URL || "https://gateway.pinata.cloud/ipfs";
  private jwt = env.PINATA_JWT;

  private constructor() {}

  public static getInstance(): PinataClient {
    if (!PinataClient.instance) {
      PinataClient.instance = new PinataClient();
    }
    return PinataClient.instance;
  }

  /**
   * Upload JSON to IPFS via Pinata
   */
  async uploadJSON(
    data: unknown,
    metadata?: PinataUploadMetadata
  ): Promise<PinataUploadResult> {
    try {
      logger.info("Uploading JSON to Pinata", { metadata });

      const response = await fetch(`${this.baseUrl}/pinning/pinJSONToIPFS`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.jwt}`,
        },
        body: JSON.stringify({
          pinataContent: data,
          pinataMetadata: {
            name: metadata?.name,
            keyvalues: metadata?.keyvalues,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Pinata API error: ${response.statusText}`);
      }

      const result = await response.json();

      logger.info("JSON uploaded to Pinata successfully", {
        hash: result.IpfsHash,
        size: result.PinSize,
      });

      return {
        hash: result.IpfsHash,
        url: `${this.gatewayUrl}/${result.IpfsHash}`,
        size: result.PinSize,
        timestamp: result.Timestamp,
      };
    } catch (error) {
      logger.error("Failed to upload JSON to Pinata", {
        error: error instanceof Error ? error.message : String(error),
        metadata,
      });
      throw new Error(`Pinata JSON upload failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Upload file to IPFS via Pinata
   */
  async uploadFile(
    file: File,
    metadata?: PinataUploadMetadata
  ): Promise<PinataUploadResult> {
    try {
      logger.info("Uploading file to Pinata", {
        fileName: file.name,
        fileSize: file.size,
        metadata,
      });

      const formData = new FormData();
      formData.append("file", file);

      if (metadata) {
        formData.append("pinataMetadata", JSON.stringify({
          name: metadata.name || file.name,
          keyvalues: metadata.keyvalues,
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

      const result = await response.json();

      logger.info("File uploaded to Pinata successfully", {
        hash: result.IpfsHash,
        size: result.PinSize,
        fileName: file.name,
      });

      return {
        hash: result.IpfsHash,
        url: `${this.gatewayUrl}/${result.IpfsHash}`,
        size: result.PinSize,
        timestamp: result.Timestamp,
      };
    } catch (error) {
      logger.error("Failed to upload file to Pinata", {
        error: error instanceof Error ? error.message : String(error),
        fileName: file.name,
      });
      throw new Error(`Pinata file upload failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Pin existing IPFS hash to Pinata
   */
  async pinByHash(
    hash: string,
    metadata?: PinataPinMetadata
  ): Promise<void> {
    try {
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
    } catch (error) {
      logger.error("Failed to pin hash to Pinata", {
        error: error instanceof Error ? error.message : String(error),
        hash,
      });
      throw new Error(`Pinata pin failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Unpin file from Pinata
   */
  async unpin(hash: string): Promise<boolean> {
    try {
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
    } catch (error) {
      logger.error("Failed to unpin from Pinata", {
        error: error instanceof Error ? error.message : String(error),
        hash,
      });
      return false;
    }
  }

  /**
   * Get file details from Pinata
   */
  async getFileDetails(hash: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/data/pinList?hashContains=${hash}`, {
        headers: {
          Authorization: `Bearer ${this.jwt}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Pinata API error: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.rows && result.rows.length > 0) {
        return result.rows[0];
      }

      return null;
    } catch (error) {
      logger.error("Failed to get file details from Pinata", {
        error: error instanceof Error ? error.message : String(error),
        hash,
      });
      return null;
    }
  }

  /**
   * List pinned files
   */
  async listFiles(filters?: {
    metadata?: Record<string, string>;
    limit?: number;
  }): Promise<any[]> {
    try {
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

      const result = await response.json();
      return result.rows || [];
    } catch (error) {
      logger.error("Failed to list files from Pinata", {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Retrieve file from IPFS
   */
  async retrieve<T = unknown>(hash: string): Promise<T | null> {
    try {
      const gatewayUrl = `${this.gatewayUrl}/${hash}`;
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
    } catch (error) {
      logger.error("Failed to retrieve file from IPFS", {
        error: error instanceof Error ? error.message : String(error),
        hash,
      });
      return null;
    }
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
    try {
      // Try to list files as a health check
      const response = await fetch(`${this.baseUrl}/data/pinList?pageLimit=1`, {
        headers: {
          Authorization: `Bearer ${this.jwt}`,
        },
      });

      return response.ok;
    } catch (error) {
      logger.error("Pinata health check failed", { error });
      return false;
    }
  }
}
