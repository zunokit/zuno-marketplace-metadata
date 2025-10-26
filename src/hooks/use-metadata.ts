"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface MetadataViewModel {
  id: string;
  name: string;
  description?: string;
  image?: string;
  animation_url?: string;
  external_url?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
    display_type?: string;
  }>;
  properties?: Record<string, unknown>;
  collection?: {
    name?: string;
    family?: string;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch all metadata
 */
export function useMetadata(page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: ["metadata", page, limit],
    queryFn: async () => {
      const response = await fetch(
        `/api/metadata?page=${page}&limit=${limit}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to fetch metadata");
      }

      const result = await response.json();
      // API returns { success: true, data: { data: [...], pagination: {...} } }
      return result.data?.data || [];
    },
  });
}

/**
 * Fetch single metadata by ID
 */
export function useMetadataById(id: string) {
  return useQuery({
    queryKey: ["metadata", id],
    queryFn: async () => {
      const response = await fetch(`/api/metadata/${id}`, {
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to fetch metadata");
      }

      const result = await response.json();
      return result.data as MetadataViewModel;
    },
    enabled: !!id,
  });
}

/**
 * Delete metadata
 */
export function useDeleteMetadata() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/metadata/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to delete metadata");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metadata"] });
      toast.success("Metadata deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete metadata");
    },
  });
}
