import type { MediaType } from "@/shared/types";

// ============= MEDIA ENTITY =============
export interface MediaEntity {
  id: string;
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
}

// ============= MEDIA FILTERS =============
export interface MediaListFilters {
  search?: string;
  mediaType?: MediaType;
  isPinned?: boolean;
}