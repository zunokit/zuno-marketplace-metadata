import type {
  MediaEntity,
  CreateMediaParams,
  UpdateMediaParams,
  MediaListParams,
} from "./media.entity";
import type { PaginatedResponse } from "@/shared/types";

export interface MediaRepository {
  // Basic CRUD operations
  create(params: CreateMediaParams): Promise<MediaEntity>;
  findById(id: string): Promise<MediaEntity | null>;
  update(id: string, params: UpdateMediaParams): Promise<MediaEntity | null>;
  delete(id: string): Promise<boolean>;

  // List and search operations
  list(params: MediaListParams): Promise<PaginatedResponse<MediaEntity>>;
  search(query: string, params?: MediaListParams): Promise<PaginatedResponse<MediaEntity>>;

  // Utility methods
  exists(id: string): Promise<boolean>;

  // Bulk operations
  createMany(params: CreateMediaParams[]): Promise<MediaEntity[]>;
  deleteMany(ids: string[]): Promise<number>;

  // IPFS operations
  updateIpfsInfo(id: string, ipfsHash: string, ipfsUrl: string): Promise<MediaEntity | null>;
  markAsPinned(id: string): Promise<MediaEntity | null>;
}

export type MediaRepositoryImpl = MediaRepository;