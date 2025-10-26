import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface ApiVersionViewModel {
  id: string;
  label: string;
  isCurrent: boolean;
  deprecated: boolean;
  releasedAt: string;
  sunsetAt: string | null;
}

// Fetch all API versions
export function useApiVersions() {
  return useQuery({
    queryKey: ["api-versions"],
    queryFn: async () => {
      const res = await fetch("/api/admin/api-versions");
      if (!res.ok) throw new Error("Failed to fetch API versions");
      const data = await res.json();
      return data.data as ApiVersionViewModel[];
    },
  });
}

// Create API version
export function useCreateApiVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      label: string;
      isCurrent?: boolean;
      releasedAt: Date;
      sunsetAt?: Date;
    }) => {
      const res = await fetch("/api/admin/api-versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error?.message || "Failed to create API version");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-versions"] });
      toast.success("API version created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Update API version
export function useUpdateApiVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      label?: string;
      isCurrent?: boolean;
      deprecated?: boolean;
      sunsetAt?: Date | null;
    }) => {
      const { id, ...body } = data;
      const res = await fetch(`/api/admin/api-versions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error?.message || "Failed to update API version");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-versions"] });
      toast.success("API version updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Delete API version
export function useDeleteApiVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/api-versions/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error?.message || "Failed to delete API version");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-versions"] });
      toast.success("API version deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
