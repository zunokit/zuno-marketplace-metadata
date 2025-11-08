import type { MediaType } from "@/shared/types";

// ============= MEDIA ENTITY =============
export interface MediaEntity {
  id: string;
  userId: string; // Owner of the media
  fileName: string;
  fileSize: number;
  mimeType: string;
  mediaType: MediaType;
  url: string;
  ipfsHash?: string;
  ipfsUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
  thumbnailUrl?: string;
  optimizedUrl?: string;
  isPinned: boolean;
  pinnedAt?: Date;
  createdAt: Date;
}

// ============= MEDIA CREATION =============
export interface CreateMediaParams {
  userId: string; // Owner of the media (required for access control)
  fileName: string;
  fileSize: number;
  mimeType: string;
  mediaType: MediaType;
  url: string;
  thumbnailUrl?: string;
  optimizedUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
}

// ============= MEDIA UPDATE =============
export interface UpdateMediaParams {
  ipfsHash?: string;
  ipfsUrl?: string;
  thumbnailUrl?: string;
  optimizedUrl?: string;
  isPinned?: boolean;
}

// ============= MEDIA LIST PARAMS =============
export interface MediaListParams {
  page: number;
  limit: number;
  sortBy: "fileName" | "createdAt" | "fileSize";
  sortOrder: "asc" | "desc";
  search?: string;
  mediaType?: MediaType;
  isPinned?: boolean;
  userId?: string; // Filter by owner (for access control)
}

// ============= MEDIA FILTERS =============
export interface MediaListFilters {
  search?: string;
  mediaType?: MediaType;
  isPinned?: boolean;
}