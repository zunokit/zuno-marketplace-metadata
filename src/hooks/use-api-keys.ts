"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/infrastructure/auth/auth.client";
import { toast } from "sonner";

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
export function useApiKeys() {
  return useQuery({
    queryKey: ["api-keys"],
    queryFn: async () => {
      // Use Better Auth client to list API keys
      const result = await authClient.apiKey.list();

      if (!result.data) {
        throw new Error("Failed to fetch API keys");
      }

      return result.data.map((key: any) => ({
        id: key.id,
        name: key.name,
        start: key.start || null,
        permissions: typeof key.permissions === "string"
          ? JSON.parse(key.permissions)
          : (key.permissions || {}),
        scopes: key.metadata?.scopes || [],
        enabled: key.enabled ?? true,
        expiresAt: key.expiresAt ? new Date(key.expiresAt) : null,
        createdAt: new Date(key.createdAt),
        updatedAt: new Date(key.updatedAt),
        rateLimitEnabled: key.rateLimitEnabled ?? false,
        rateLimitMax: key.rateLimitMax ?? null,
        rateLimitTimeWindow: key.rateLimitTimeWindow ?? null,
        remaining: key.remaining ?? null,
        metadata: key.metadata,
      })) as ApiKeyViewModel[];
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
      const result = await authClient.apiKey.create({
        name: input.name,
        permissions: input.permissions,
        expiresIn: input.expiresIn ?? undefined,
        metadata: input.metadata,
        rateLimitEnabled: input.rateLimitEnabled,
        rateLimitMax: input.rateLimitMax,
        rateLimitTimeWindow: input.rateLimitTimeWindow,
      });

      if (result.error) {
        throw new Error(result.error.message || "Failed to create API key");
      }

      return {
        id: result.data?.id,
        key: result.data?.key, // The actual key value (only shown once!)
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
      const result = await authClient.apiKey.update({
        keyId: id,
        ...updates,
      });

      if (result.error) {
        throw new Error(result.error.message || "Failed to update API key");
      }

      return result.data;
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
      const result = await authClient.apiKey.delete({ keyId: id });

      if (result.error) {
        throw new Error(result.error.message || "Failed to delete API key");
      }

      return result.data;
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
