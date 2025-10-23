import ImageKit from "imagekit";
import { env } from "@/shared/config/env";
import { logger } from "@/shared/lib/utils/logger";
import type { MediaType } from "@/shared/types";
import {
  isValidImageType,
  isValidVideoType,
  isValid3DModelType,
  sanitizeFilename,
  formatBytes
} from "@/shared/lib/utils";

interface UploadOptions {
  file: File | Buffer;
  fileName: string;
  folder?: string;
  tags?: string[];
  useUniqueFileName?: boolean;
  transformation?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: string;
  };
}

interface UploadResult {
  fileId: string;
  name: string;
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  size: number;
  mimeType: string;
  mediaType: MediaType;
}

export class ImageKitService {
  private client: ImageKit;

  constructor() {
    this.client = new ImageKit({
      publicKey: env.IMAGEKIT_PUBLIC_KEY,
      privateKey: env.IMAGEKIT_PRIVATE_KEY,
      urlEndpoint: env.IMAGEKIT_URL_ENDPOINT,
    });
  }

  /**
   * Upload a file to ImageKit
   */
  async uploadFile(options: UploadOptions): Promise<UploadResult> {
    try {
      const { file, fileName, folder = "uploads", tags = [], useUniqueFileName = true } = options;

      // Sanitize filename
      const sanitizedFileName = sanitizeFilename(fileName);

      // Determine file buffer and mime type
      let fileBuffer: Buffer;
      let mimeType: string;

      if (file instanceof File) {
        fileBuffer = Buffer.from(await file.arrayBuffer());
        mimeType = file.type;
      } else {
        fileBuffer = file;
        // Try to detect mime type from filename extension
        mimeType = this.getMimeTypeFromFilename(sanitizedFileName);
      }

      // Validate file type and get media type
      const mediaType = this.getMediaType(mimeType);
      if (!mediaType) {
        throw new Error(`Unsupported file type: ${mimeType}`);
      }

      // Validate file size (100MB limit)
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (fileBuffer.length > maxSize) {
        throw new Error(`File too large. Maximum size is ${formatBytes(maxSize)}`);
      }

      logger.info("Uploading file to ImageKit", {
        fileName: sanitizedFileName,
        size: formatBytes(fileBuffer.length),
        mimeType,
        mediaType,
      });

      // Upload to ImageKit
      const uploadResponse = await this.client.upload({
        file: fileBuffer,
        fileName: sanitizedFileName,
        folder,
        tags: [...tags, mediaType.toLowerCase()],
        useUniqueFileName,
      });

      logger.info("File uploaded successfully to ImageKit", {
        fileId: uploadResponse.fileId,
        url: uploadResponse.url,
        size: uploadResponse.size,
      });

      // Generate thumbnail for images and videos
      let thumbnailUrl: string | undefined;
      if (mediaType === "IMAGE") {
        thumbnailUrl = this.generateThumbnailUrl(uploadResponse.url, {
          width: 300,
          height: 300,
          quality: 80,
        });
      } else if (mediaType === "VIDEO") {
        // For videos, ImageKit can generate thumbnails from the first frame
        thumbnailUrl = this.generateVideoThumbnailUrl(uploadResponse.url);
      }

      return {
        fileId: uploadResponse.fileId,
        name: uploadResponse.name,
        url: uploadResponse.url,
        thumbnailUrl,
        width: uploadResponse.width,
        height: uploadResponse.height,
        size: uploadResponse.size,
        mimeType,
        mediaType,
      };
    } catch (error) {
      logger.error("Failed to upload file to ImageKit", {
        error: error instanceof Error ? error.message : String(error),
        fileName: options.fileName,
      });
      throw new Error(`ImageKit upload failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete a file from ImageKit
   */
  async deleteFile(fileId: string): Promise<void> {
    try {
      await this.client.deleteFile(fileId);
      logger.info("File deleted from ImageKit", { fileId });
    } catch (error) {
      logger.error("Failed to delete file from ImageKit", {
        error: error instanceof Error ? error.message : String(error),
        fileId,
      });
      throw new Error(`ImageKit deletion failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get file details from ImageKit
   */
  async getFileDetails(fileId: string) {
    try {
      const details = await this.client.getFileDetails(fileId);
      return details;
    } catch (error) {
      logger.error("Failed to get file details from ImageKit", {
        error: error instanceof Error ? error.message : String(error),
        fileId,
      });
      throw new Error(`ImageKit get details failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate optimized URL with transformations
   */
  generateOptimizedUrl(
    originalUrl: string,
    transformations: {
      width?: number;
      height?: number;
      quality?: number;
      format?: string;
      crop?: "maintain_ratio" | "force" | "at_least" | "at_max";
    } = {}
  ): string {
    const { width, height, quality = 80, format, crop = "maintain_ratio" } = transformations;

    const transformationParams: string[] = [];

    if (width) transformationParams.push(`w-${width}`);
    if (height) transformationParams.push(`h-${height}`);
    if (quality) transformationParams.push(`q-${quality}`);
    if (format) transformationParams.push(`f-${format}`);
    if (crop) transformationParams.push(`c-${crop}`);

    if (transformationParams.length === 0) {
      return originalUrl;
    }

    // Insert transformations into URL
    const transformation = `tr:${transformationParams.join(',')}`;
    const urlParts = originalUrl.split('/');
    const endpointIndex = urlParts.findIndex(part => part.includes('ik.imagekit.io'));

    if (endpointIndex !== -1) {
      urlParts.splice(endpointIndex + 1, 0, transformation);
      return urlParts.join('/');
    }

    return originalUrl;
  }

  /**
   * Generate thumbnail URL for images
   */
  private generateThumbnailUrl(originalUrl: string, options: {
    width?: number;
    height?: number;
    quality?: number;
  } = {}): string {
    return this.generateOptimizedUrl(originalUrl, {
      width: options.width || 300,
      height: options.height || 300,
      quality: options.quality || 80,
      crop: "maintain_ratio",
    });
  }

  /**
   * Generate thumbnail URL for videos (first frame)
   */
  private generateVideoThumbnailUrl(originalUrl: string): string {
    // ImageKit can extract thumbnails from videos
    return this.generateOptimizedUrl(originalUrl, {
      width: 300,
      height: 300,
      quality: 80,
      format: "jpg",
    });
  }

  /**
   * Determine media type from MIME type
   */
  private getMediaType(mimeType: string): MediaType | null {
    if (isValidImageType(mimeType)) {
      return mimeType === "image/gif" ? "GIF" : "IMAGE";
    }
    if (isValidVideoType(mimeType)) {
      return "VIDEO";
    }
    if (isValid3DModelType(mimeType)) {
      return "MODEL_3D";
    }
    return null;
  }

  /**
   * Get MIME type from filename extension
   */
  private getMimeTypeFromFilename(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();

    const mimeTypes: Record<string, string> = {
      // Images
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",

      // Videos
      mp4: "video/mp4",
      webm: "video/webm",
      ogg: "video/ogg",
      mov: "video/quicktime",
      avi: "video/x-msvideo",

      // 3D Models
      gltf: "model/gltf+json",
      glb: "model/gltf-binary",
    };

    return mimeTypes[ext || ""] || "application/octet-stream";
  }

  /**
   * Bulk upload files
   */
  async uploadMultipleFiles(files: { file: File; fileName: string }[]): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    const errors: string[] = [];

    for (const { file, fileName } of files) {
      try {
        const result = await this.uploadFile({ file, fileName });
        results.push(result);
      } catch (error) {
        const errorMessage = `Failed to upload ${fileName}: ${error instanceof Error ? error.message : String(error)}`;
        errors.push(errorMessage);
        logger.error("Bulk upload error", { fileName, error: errorMessage });
      }
    }

    if (errors.length > 0) {
      logger.warn("Some files failed to upload", {
        successCount: results.length,
        errorCount: errors.length,
        errors: errors.slice(0, 5), // Log first 5 errors
      });
    }

    return results;
  }

  /**
   * Check if ImageKit service is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to list files to check if service is accessible
      await this.client.listFiles({
        limit: 1,
      });
      return true;
    } catch (error) {
      logger.error("ImageKit health check failed", { error });
      return false;
    }
  }
}