import type { MediaType, MetadataAttribute, Creator } from "@/shared/types";

// ============= METADATA ENTITY =============
export interface MetadataEntity {
  id: string;
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
  mediaType: MediaType;
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
  mediaType: MediaType;
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
  mediaType?: MediaType;
  isPinned?: boolean;
  isLocked?: boolean;
  minVersion?: number;
  maxVersion?: number;
}

// ============= METADATA FILTERS =============
export interface MetadataListFilters {
  search?: string;
  mediaType?: MediaType;
  isPinned?: boolean;
  isLocked?: boolean;
  minVersion?: number;
  maxVersion?: number;
}