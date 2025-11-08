// ============= API KEY ENTITY =============
export interface ApiKeyEntity {
  id: string;
  name: string;
  start: string | null;
  userId: string;
  enabled: boolean;
  permissions: Record<string, string[]>;
  metadata?: {
    type?: "personal" | "organization" | "public";
    scopes?: string[];
    ipWhitelist?: string[];
    allowedOrigins?: string[];
    notes?: string;
  };
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  rateLimitEnabled: boolean;
  rateLimitMax?: number;
  rateLimitTimeWindow?: number;
  remaining?: number;
}

// ============= API KEY CREATION =============
export interface CreateApiKeyParams {
  userId: string;
  name: string;
  permissions: Record<string, string[]>;
  expiresIn?: number;
  metadata?: {
    scopes?: string[];
    notes?: string;
    type?: "personal" | "organization" | "public";
    ipWhitelist?: string[];
    allowedOrigins?: string[];
  };
}

// ============= API KEY UPDATE =============
export interface UpdateApiKeyParams {
  name?: string;
  permissions?: Record<string, string[]>;
  enabled?: boolean;
  metadata?: {
    scopes?: string[];
    notes?: string;
    type?: "personal" | "organization" | "public";
    ipWhitelist?: string[];
    allowedOrigins?: string[];
  };
}

// ============= API KEY LIST PARAMS =============
export interface ApiKeyListParams {
  userId: string;
  page?: number;
  limit?: number;
  enabled?: boolean;
}

// ============= CREATED API KEY WITH KEY =============
// This is returned only on creation and includes the actual key
export interface CreatedApiKeyEntity extends ApiKeyEntity {
  key: string; // The actual API key (only shown once!)
}
