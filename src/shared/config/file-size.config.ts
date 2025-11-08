import type { MediaType } from "@/shared/types";

/**
 * File Size Configuration
 *
 * Defines maximum file sizes for different media types to prevent
 * upload failures and ensure compatibility with IPFS/Pinata limits.
 *
 * Pinata limits:
 * - Free tier: 100MB per file
 * - Paid tiers: Higher limits (configurable)
 */

// File size constants (in bytes)
export const FILE_SIZE = {
  // Individual file limits by media type
  MAX_IMAGE_SIZE: 50 * 1024 * 1024, // 50MB for images
  MAX_VIDEO_SIZE: 100 * 1024 * 1024, // 100MB for videos
  MAX_GIF_SIZE: 25 * 1024 * 1024, // 25MB for GIFs
  MAX_MODEL_3D_SIZE: 100 * 1024 * 1024, // 100MB for 3D models

  // Default max size for any file
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB (Pinata free tier limit)

  // Minimum file size (prevent empty files)
  MIN_FILE_SIZE: 1, // 1 byte
} as const;

/**
 * Get maximum file size for a specific media type
 */
export function getMaxFileSize(mediaType: MediaType): number {
  const limits: Record<MediaType, number> = {
    IMAGE: FILE_SIZE.MAX_IMAGE_SIZE,
    VIDEO: FILE_SIZE.MAX_VIDEO_SIZE,
    GIF: FILE_SIZE.MAX_GIF_SIZE,
    MODEL_3D: FILE_SIZE.MAX_MODEL_3D_SIZE,
  };

  return limits[mediaType] || FILE_SIZE.MAX_FILE_SIZE;
}

/**
 * Validate file size for a specific media type
 *
 * @throws Error if file size is invalid
 */
export function validateFileSize(
  fileSize: number,
  mediaType: MediaType,
  fileName?: string
): void {
  // Check minimum size
  if (fileSize < FILE_SIZE.MIN_FILE_SIZE) {
    throw new Error(
      fileName
        ? `File "${fileName}" is empty or invalid`
        : "File is empty or invalid"
    );
  }

  // Check maximum size
  const maxSize = getMaxFileSize(mediaType);
  if (fileSize > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
    const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);

    throw new Error(
      fileName
        ? `File "${fileName}" exceeds maximum size for ${mediaType}. Size: ${fileSizeMB}MB, Max: ${maxSizeMB}MB`
        : `File exceeds maximum size for ${mediaType}. Size: ${fileSizeMB}MB, Max: ${maxSizeMB}MB`
    );
  }
}

/**
 * Format file size to human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Check if file size is within limits for a media type
 *
 * @returns true if valid, false otherwise
 */
export function isValidFileSize(fileSize: number, mediaType: MediaType): boolean {
  try {
    validateFileSize(fileSize, mediaType);
    return true;
  } catch {
    return false;
  }
}
