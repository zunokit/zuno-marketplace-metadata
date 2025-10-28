import type { MediaEntity } from "@/core/domain/media/media.entity";
import type { PaginatedResponse } from "@/shared/types";
import { toISOString, toISOStringOrNow } from "@/shared/lib/utils";

function mapMediaTypeToUi(value: string): string {
  const v = String(value).toUpperCase();
  if (v === "IMAGE" || v === "GIF") return "image";
  if (v === "VIDEO") return "video";
  if (v === "MODEL_3D" || v === "3D_MODEL") return "3d_model";
  return value.toString().toLowerCase();
}

// ============= MEDIA RESPONSE DTO =============
export interface MediaResponseDto {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  mediaType: string;
  url: string;
  ipfsHash: string | null;
  ipfsUrl: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  thumbnailUrl: string | null;
  optimizedUrl: string | null;
  isPinned: boolean;
  pinnedAt: string | null;
  createdAt: string;
}

// ============= MEDIA LIST ITEM DTO =============
export interface MediaListItemDto {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  mediaType: string;
  url: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  isPinned: boolean;
  createdAt: string;
}

// ============= PAGINATED MEDIA RESPONSE DTO =============
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface PaginatedMediaResponseDto
  extends PaginatedResponse<MediaListItemDto> {}

// ============= CREATED MEDIA RESPONSE DTO =============
export interface CreatedMediaResponseDto {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  mediaType: string;
  url: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  createdAt: string;
}

// ============= DELETED MEDIA RESPONSE DTO =============
export interface DeletedMediaResponseDto {
  message: string;
  deletedMedia: {
    id: string;
    fileName: string;
  };
}

// ============= MEDIA DTO MAPPER =============
export class MediaDtoMapper {
  /**
   * Map MediaEntity to full response DTO
   */
  static toResponseDto(entity: MediaEntity): MediaResponseDto {
    return {
      id: entity.id,
      fileName: entity.fileName,
      fileSize: entity.fileSize,
      mimeType: entity.mimeType,
      mediaType: mapMediaTypeToUi(entity.mediaType as unknown as string),
      url: entity.url,
      ipfsHash: entity.ipfsHash ?? null,
      ipfsUrl: entity.ipfsUrl ?? null,
      width: entity.width ?? null,
      height: entity.height ?? null,
      duration: entity.duration ?? null,
      thumbnailUrl: entity.thumbnailUrl ?? null,
      optimizedUrl: entity.optimizedUrl ?? null,
      isPinned: entity.isPinned,
      pinnedAt: toISOString(entity.pinnedAt),
      createdAt: toISOStringOrNow(entity.createdAt),
    };
  }

  /**
   * Map MediaEntity to list item DTO (lighter version)
   */
  static toListItemDto(entity: MediaEntity): MediaListItemDto {
    return {
      id: entity.id,
      fileName: entity.fileName,
      fileSize: entity.fileSize,
      mimeType: entity.mimeType,
      mediaType: mapMediaTypeToUi(entity.mediaType as unknown as string),
      url: entity.url,
      thumbnailUrl: entity.thumbnailUrl ?? null,
      width: entity.width ?? null,
      height: entity.height ?? null,
      isPinned: entity.isPinned,
      createdAt: toISOStringOrNow(entity.createdAt),
    };
  }

  /**
   * Map paginated result to paginated response DTO
   */
  static toPaginatedResponseDto(
    result: PaginatedResponse<MediaEntity>
  ): PaginatedMediaResponseDto {
    return {
      data: result.data.map((entity) => this.toListItemDto(entity)),
      pagination: result.pagination,
    };
  }

  /**
   * Map MediaEntity to created response DTO
   */
  static toCreatedResponseDto(entity: MediaEntity): CreatedMediaResponseDto {
    return {
      id: entity.id,
      fileName: entity.fileName,
      fileSize: entity.fileSize,
      mimeType: entity.mimeType,
      mediaType: entity.mediaType,
      url: entity.url,
      thumbnailUrl: entity.thumbnailUrl ?? null,
      width: entity.width ?? null,
      height: entity.height ?? null,
      createdAt: toISOStringOrNow(entity.createdAt),
    };
  }

  /**
   * Map deleted media to response DTO
   */
  static toDeletedResponseDto(entity: MediaEntity): DeletedMediaResponseDto {
    return {
      message: "Media deleted successfully",
      deletedMedia: {
        id: entity.id,
        fileName: entity.fileName,
      },
    };
  }
}
