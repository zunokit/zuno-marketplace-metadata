import type {
  MetadataEntity,
  CreateMetadataParams,
  UpdateMetadataParams,
  MetadataListParams,
} from "./metadata.entity";
import type { PaginatedResponse } from "@/shared/types";

export interface MetadataRepository {
  // Basic CRUD operations
  create(params: CreateMetadataParams): Promise<MetadataEntity>;
  findById(id: string): Promise<MetadataEntity | null>;
  findByIdAndVersion(id: string, version?: number): Promise<MetadataEntity | null>;
  update(id: string, params: UpdateMetadataParams): Promise<MetadataEntity | null>;
  delete(id: string): Promise<boolean>;

  // List and search operations
  list(params: MetadataListParams): Promise<PaginatedResponse<MetadataEntity>>;
  search(query: string, params?: MetadataListParams): Promise<PaginatedResponse<MetadataEntity>>;

  // Utility methods
  exists(id: string): Promise<boolean>;
  isLocked(id: string): Promise<boolean>;
  getLatestVersion(id: string): Promise<number>;

  // Bulk operations
  createMany(params: CreateMetadataParams[]): Promise<MetadataEntity[]>;
  updateMany(ids: string[], params: Partial<UpdateMetadataParams>): Promise<number>;
  deleteMany(ids: string[]): Promise<number>;

  // IPFS operations
  updateIpfsInfo(id: string, ipfsHash: string, ipfsUrl: string): Promise<MetadataEntity | null>;
  markAsPinned(id: string): Promise<MetadataEntity | null>;
}

export type MetadataRepositoryImpl = MetadataRepository;