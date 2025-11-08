"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createApiKey,
  updateApiKey,
  deleteApiKey,
  getApiKeyById,
  listApiKeys,
} from "@/app/admin/api-keys/actions";

export interface ApiKeyViewModel {
  id: string;
  name: string;
  start: string | null; // First few chars for display
  permissions: Record<string, string[]>;
  scopes: string[];
  enabled: boolean;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  rateLimitEnabled?: boolean;
  rateLimitMax?: number | null;
  rateLimitTimeWindow?: number | null;
  remaining?: number | null;
  metadata?: {
    type?: "personal" | "organization" | "public";
    scopes?: string[];
    ipWhitelist?: string[];
    allowedOrigins?: string[];
    notes?: string;
  };
}

export interface CreateApiKeyInput {
  name: string;
  permissions: Record<string, string[]>;
  metadata?: {
    scopes?: string[];
    notes?: string;
  };
  expiresIn?: number; // Days until expiration
  rateLimitEnabled?: boolean;
  rateLimitMax?: number;
  rateLimitTimeWindow?: number; // in seconds
}

/**
 * List all API keys for current user
 */
// Better Auth API Key Response Type
interface BetterAuthApiKey {
  id: string;
  name: string | null;
  start?: string | null;
  permissions?: string | Record<string, string[]> | null;
  metadata?: Record<string, unknown> | null;
  enabled?: boolean | null;
  expiresAt?: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  rateLimitEnabled?: boolean | null;
  rateLimitMax?: number | null;
  rateLimitTimeWindow?: number | null;
  remaining?: number | null;
}

export function useApiKeys() {
  return useQuery({
    queryKey: ["api-keys"],
    queryFn: async () => {
      // Use Server Actions instead of API routes
      const result = await listApiKeys();

      console.log(
        "[useApiKeys] API keys:",
        JSON.stringify(result.data, null, 2)
      );
      return result.data.map((key: BetterAuthApiKey): ApiKeyViewModel => {
        const permissions =
          typeof key.permissions === "string"
            ? (JSON.parse(key.permissions) as Record<string, string[]>)
            : key.permissions || {};

        const metadata = key.metadata as
          | ApiKeyViewModel["metadata"]
          | undefined;

        // Derive scopes from metadata first, fallback to generating from permissions
        let scopes: string[] = [];
        if (
          metadata?.scopes &&
          Array.isArray(metadata.scopes) &&
          metadata.scopes.length > 0
        ) {
          scopes = metadata.scopes as string[];
        } else {
          // Generate scopes from permissions if not in metadata
          scopes = Object.entries(permissions).flatMap(([resource, actions]) =>
            actions.map((action) => `${resource}:${action}`)
          );
        }

        return {
          id: key.id,
          name: key.name || "Unnamed Key",
          start: key.start ?? null,
          permissions,
          scopes,
          enabled: key.enabled ?? true,
          expiresAt: key.expiresAt ? new Date(key.expiresAt) : null,
          createdAt: new Date(key.createdAt),
          updatedAt: new Date(key.updatedAt),
          rateLimitEnabled: key.rateLimitEnabled ?? false,
          rateLimitMax: key.rateLimitMax ?? null,
          rateLimitTimeWindow: key.rateLimitTimeWindow ?? null,
          remaining: key.remaining ?? null,
          metadata,
        };
      });
    },
  });
}

/**
 * Create new API key
 */
export function useCreateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateApiKeyInput) => {
      // Use Server Actions instead of API routes
      const result = await createApiKey(input);

      return {
        id: result.id,
        key: result.key, // The actual key value (only shown once!)
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API key created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create API key");
    },
  });
}

/**
 * Update API key (enable/disable, update permissions)
 */
export function useUpdateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      name?: string;
      enabled?: boolean;
      permissions?: Record<string, string[]>;
      metadata?: ApiKeyViewModel["metadata"];
    }) => {
      // Use Server Actions instead of API routes
      return await updateApiKey(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API key updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update API key");
    },
  });
}

/**
 * Delete API key
 */
export function useDeleteApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Use Server Actions instead of API routes
      return await deleteApiKey(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API key deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete API key");
    },
  });
}
