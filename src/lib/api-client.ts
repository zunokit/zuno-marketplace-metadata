"use client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY as string;
const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || "v1";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
}

export interface MetadataItem {
  id?: string;
  name: string;
  description?: string;
  image: string;
  symbol?: string;
  bannerImage?: string;
  featuredImage?: string;
  animationUrl?: string;
  externalUrl?: string;
  backgroundColor?: string;
  attributes?: Array<{
    traitType: string;
    value: string | number;
    displayType?: string;
    maxValue?: number;
  }>;
  creators?: Array<{
    address: string;
    share: number;
    verified?: boolean;
  }>;
  sellerFeeBasisPoints?: number;
  feeRecipient?: string;
}

export interface MediaItem {
  id?: string;
  fileName: string;
  url: string;
  thumbnailUrl?: string;
  fileSize: number;
  mimeType: string;
  mediaType: string;
}

export interface BatchResult<T> {
  success: T[];
  failed: Array<{
    index: number;
    error: string;
    data?: unknown;
  }>;
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
}

class ApiClient {
  private headers: HeadersInit = {
    "x-api-key": API_KEY,
    "x-api-version": API_VERSION,
  };

  async createMetadata(metadata: MetadataItem): Promise<ApiResponse<MetadataItem>> {
    const response = await fetch(`${API_BASE_URL}/metadata`, {
      method: "POST",
      headers: {
        ...this.headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metadata),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create metadata");
    }

    return response.json();
  }

  async batchCreateMetadata(
    metadata: MetadataItem[]
  ): Promise<ApiResponse<BatchResult<MetadataItem>>> {
    const response = await fetch(`${API_BASE_URL}/metadata/batch`, {
      method: "POST",
      headers: {
        ...this.headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ metadata }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to batch create metadata");
    }

    return response.json();
  }

  async uploadMedia(file: File, folder?: string, tags?: string[]): Promise<ApiResponse<MediaItem>> {
    const formData = new FormData();
    formData.append("file", file);
    if (folder) formData.append("folder", folder);
    if (tags) tags.forEach((tag) => formData.append("tags", tag));

    const response = await fetch(`${API_BASE_URL}/media`, {
      method: "POST",
      headers: this.headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to upload media");
    }

    return response.json();
  }

  async batchUploadMedia(
    files: File[],
    folder?: string,
    tags?: string[]
  ): Promise<ApiResponse<BatchResult<MediaItem>>> {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    if (folder) formData.append("folder", folder);
    if (tags) tags.forEach((tag) => formData.append("tags", tag));

    const response = await fetch(`${API_BASE_URL}/media/batch`, {
      method: "POST",
      headers: this.headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to batch upload media");
    }

    return response.json();
  }

  async listMetadata(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<ApiResponse<{ data: MetadataItem[]; pagination: unknown }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.search) queryParams.append("search", params.search);

    const response = await fetch(`${API_BASE_URL}/metadata?${queryParams}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error("Failed to list metadata");
    }

    return response.json();
  }

  async listMedia(params?: {
    page?: number;
    limit?: number;
    mediaType?: string;
  }): Promise<ApiResponse<{ data: MediaItem[]; pagination: unknown }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.mediaType) queryParams.append("mediaType", params.mediaType);

    const response = await fetch(`${API_BASE_URL}/media?${queryParams}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error("Failed to list media");
    }

    return response.json();
  }
}

export const apiClient = new ApiClient();
