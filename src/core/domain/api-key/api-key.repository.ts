import type {
  ApiKeyEntity,
  CreateApiKeyParams,
  UpdateApiKeyParams,
  ApiKeyListParams,
  CreatedApiKeyEntity,
} from "./api-key.entity";

export interface ApiKeyRepository {
  // Basic CRUD operations
  create(params: CreateApiKeyParams): Promise<CreatedApiKeyEntity>;
  findById(id: string): Promise<ApiKeyEntity | null>;
  update(id: string, params: UpdateApiKeyParams): Promise<ApiKeyEntity | null>;
  delete(id: string): Promise<boolean>;

  // List operations
  list(params: ApiKeyListParams): Promise<ApiKeyEntity[]>;

  // Utility methods
  exists(id: string): Promise<boolean>;
  findByUserId(userId: string): Promise<ApiKeyEntity[]>;
  findEnabledByUserId(userId: string): Promise<ApiKeyEntity[]>;
}

export type ApiKeyRepositoryImpl = ApiKeyRepository;
