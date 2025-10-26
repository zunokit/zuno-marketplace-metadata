import type { MetadataEntity } from "@/core/domain/metadata/metadata.entity";
import type { PaginatedResponse, MetadataAttribute, Creator } from "@/shared/types";

// ============= METADATA RESPONSE DTO =============
export interface MetadataResponseDto {
  id: string;
  name: string;
  description: string | null;
  symbol: string | null;
  image: string;
  bannerImage: string | null;
  featuredImage: string | null;
  animationUrl: string | null;
  externalUrl: string | null;
  backgroundColor: string | null;
  attributes: MetadataAttribute[];
  creators: Creator[];
  sellerFeeBasisPoints: number | null;
  feeRecipient: string | null;
  version: number;
  isLocked: boolean;
  isPinned: boolean;
  ipfsHash: string | null;
  ipfsUrl: string | null;
  pinnedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============= METADATA LIST ITEM DTO =============
export interface MetadataListItemDto {
  id: string;
  name: string;
  description: string | null;
  symbol: string | null;
  image: string;
  version: number;
  isLocked: boolean;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============= PAGINATED METADATA RESPONSE DTO =============
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface PaginatedMetadataResponseDto extends PaginatedResponse<MetadataListItemDto> {}

// ============= CREATED METADATA RESPONSE DTO =============
export interface CreatedMetadataResponseDto {
  id: string;
  name: string;
  image: string;
  version: number;
  createdAt: string;
}

// ============= DELETED METADATA RESPONSE DTO =============
export interface DeletedMetadataResponseDto {
  message: string;
  deletedMetadata: {
    id: string;
    name: string;
    version: number;
  };
}

// ============= METADATA DTO MAPPER =============
export class MetadataDtoMapper {
  /**
   * Map MetadataEntity to full response DTO
   */
  static toResponseDto(entity: MetadataEntity): MetadataResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description ?? null,
      symbol: entity.symbol ?? null,
      image: entity.image,
      bannerImage: entity.bannerImage ?? null,
      featuredImage: entity.featuredImage ?? null,
      animationUrl: entity.animationUrl ?? null,
      externalUrl: entity.externalUrl ?? null,
      backgroundColor: entity.backgroundColor ?? null,
      attributes: entity.attributes,
      creators: entity.creators,
      sellerFeeBasisPoints: entity.sellerFeeBasisPoints ?? null,
      feeRecipient: entity.feeRecipient ?? null,
      version: entity.version,
      isLocked: entity.isLocked,
      isPinned: entity.isPinned,
      ipfsHash: entity.ipfsHash ?? null,
      ipfsUrl: entity.ipfsUrl ?? null,
      pinnedAt: entity.pinnedAt ? entity.pinnedAt.toISOString() : null,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }

  /**
   * Map MetadataEntity to list item DTO (lighter version)
   */
  static toListItemDto(entity: MetadataEntity): MetadataListItemDto {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description ?? null,
      symbol: entity.symbol ?? null,
      image: entity.image,
      version: entity.version,
      isLocked: entity.isLocked,
      isPinned: entity.isPinned,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }

  /**
   * Map paginated result to paginated response DTO
   */
  static toPaginatedResponseDto(
    result: PaginatedResponse<MetadataEntity>
  ): PaginatedMetadataResponseDto {
    return {
      data: result.data.map((entity) => this.toListItemDto(entity)),
      pagination: result.pagination,
    };
  }

  /**
   * Map MetadataEntity to created response DTO
   */
  static toCreatedResponseDto(entity: MetadataEntity): CreatedMetadataResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      image: entity.image,
      version: entity.version,
      createdAt: entity.createdAt.toISOString(),
    };
  }

  /**
   * Map deleted metadata to response DTO
   */
  static toDeletedResponseDto(entity: MetadataEntity): DeletedMetadataResponseDto {
    return {
      message: "Metadata deleted successfully",
      deletedMetadata: {
        id: entity.id,
        name: entity.name,
        version: entity.version,
      },
    };
  }
}
