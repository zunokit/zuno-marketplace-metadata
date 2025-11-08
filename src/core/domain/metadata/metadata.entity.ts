import type { MediaType, MetadataAttribute, Creator } from "@/shared/types";

// ============= METADATA ENTITY =============
export interface MetadataEntity {
  id: string;
  userId: string; // Owner of the metadata
  name: string;
  description?: string;
  symbol?: string;
  image: string;
  bannerImage?: string;
  featuredImage?: string;
  animationUrl?: string;
  externalUrl?: string;
  backgroundColor?: string;
  attributes: MetadataAttribute[];
  ipfsHash?: string;
  ipfsUrl?: string;
  isPinned: boolean;
  pinnedAt?: Date;
  creators: Creator[];
  sellerFeeBasisPoints?: number;
  feeRecipient?: string;
  version: number;
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============= METADATA CREATION =============
export interface CreateMetadataParams {
  userId: string; // Owner of the metadata (required for access control)
  name: string;
  description?: string;
  symbol?: string;
  image: string;
  bannerImage?: string;
  featuredImage?: string;
  animationUrl?: string;
  externalUrl?: string;
  backgroundColor?: string;
  attributes: MetadataAttribute[];
  creators: Creator[];
  sellerFeeBasisPoints?: number;
  feeRecipient?: string;
}

// ============= METADATA UPDATE =============
export interface UpdateMetadataParams {
  name?: string;
  description?: string;
  symbol?: string;
  image?: string;
  bannerImage?: string;
  featuredImage?: string;
  animationUrl?: string;
  externalUrl?: string;
  backgroundColor?: string;
  attributes?: MetadataAttribute[];
  mediaType?: MediaType;
  creators?: Creator[];
  sellerFeeBasisPoints?: number;
  feeRecipient?: string;
  isLocked?: boolean;
}

// ============= METADATA LIST PARAMS =============
export interface MetadataListParams {
  page: number;
  limit: number;
  sortBy: "name" | "createdAt" | "updatedAt" | "version";
  sortOrder: "asc" | "desc";
  search?: string;
  isPinned?: boolean;
  isLocked?: boolean;
  userId?: string; // Filter by owner (for access control)
}

// ============= METADATA FILTERS =============
export interface MetadataListFilters {
  search?: string;
  isPinned?: boolean;
  isLocked?: boolean;
}
