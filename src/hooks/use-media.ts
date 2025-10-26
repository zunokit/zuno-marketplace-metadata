"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface MediaViewModel {
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

/**
 * Fetch all media
 */
export function useMedia(page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: ["media", page, limit],
    queryFn: async () => {
      const response = await fetch(
        `/api/media?page=${page}&limit=${limit}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to fetch media");
      }

      const result = await response.json();
      // API returns { success: true, data: { data: [...], pagination: {...} } }
      return result.data?.data || [];
    },
  });
}

/**
 * Fetch single media by ID
 */
export function useMediaById(id: string) {
  return useQuery({
    queryKey: ["media", id],
    queryFn: async () => {
      const response = await fetch(`/api/media/${id}`, {
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to fetch media");
      }

      const result = await response.json();
      return result.data as MediaViewModel;
    },
    enabled: !!id,
  });
}

/**
 * Delete media
 */
export function useDeleteMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/media/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to delete media");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media"] });
      toast.success("Media deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete media");
    },
  });
}
