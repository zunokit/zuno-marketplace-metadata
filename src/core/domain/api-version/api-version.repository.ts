import type {
  ApiVersionEntity,
  CreateApiVersionParams,
  UpdateApiVersionParams,
} from "./api-version.entity";

export interface ApiVersionRepository {
  // Basic CRUD operations
  create(params: CreateApiVersionParams): Promise<ApiVersionEntity>;
  findById(id: string): Promise<ApiVersionEntity | null>;
  update(
    id: string,
    params: UpdateApiVersionParams
  ): Promise<ApiVersionEntity | null>;
  delete(id: string): Promise<boolean>;

  // List operations
  list(): Promise<ApiVersionEntity[]>;

  // Utility methods
  exists(id: string): Promise<boolean>;
  getCurrent(): Promise<ApiVersionEntity | null>;
  getByLabel(label: string): Promise<ApiVersionEntity | null>;
}

export type ApiVersionRepositoryImpl = ApiVersionRepository;
