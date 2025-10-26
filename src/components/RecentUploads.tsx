"use client";

import { useEffect, useState } from "react";
import { apiClient, type MetadataItem, type MediaItem } from "@/lib/api-client";

interface RecentUploadsProps {
  refreshTrigger?: number;
}

export function RecentUploads({ refreshTrigger = 0 }: RecentUploadsProps) {
  const [metadata, setMetadata] = useState<MetadataItem[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [activeTab, setActiveTab] = useState<"metadata" | "media">("metadata");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [metadataRes, mediaRes] = await Promise.all([
        apiClient.listMetadata({ page: 1, limit: 10 }),
        apiClient.listMedia({ page: 1, limit: 10 }),
      ]);
      setMetadata(metadataRes.data.data);
      setMedia(mediaRes.data.data);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-900">
      <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">Recent Uploads</h2>

      {/* Tabs */}
      <div className="mb-4 border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("metadata")}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === "metadata"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            Metadata ({metadata.length})
          </button>
          <button
            onClick={() => setActiveTab("media")}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === "media"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            Media ({media.length})
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          </div>
        ) : activeTab === "metadata" ? (
          <div className="space-y-3">
            {metadata.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                No metadata items yet
              </p>
            ) : (
              metadata.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start space-x-3 rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-16 w-16 rounded object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23ddd' width='100' height='100'/%3E%3Ctext fill='%23999' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3ENo Image%3C/text%3E%3C/svg%3E";
                      }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {item.name}
                    </p>
                    {item.description && (
                      <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
                        {item.description}
                      </p>
                    )}
                    <div className="mt-2 flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                      {item.symbol && (
                        <span className="rounded bg-gray-100 px-2 py-1 dark:bg-gray-800">
                          {item.symbol}
                        </span>
                      )}
                      {item.mediaType && (
                        <span className="rounded bg-blue-100 px-2 py-1 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          {item.mediaType}
                        </span>
                      )}
                      {item.attributes && item.attributes.length > 0 && (
                        <span className="text-gray-600 dark:text-gray-400">
                          {item.attributes.length} attributes
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {media.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                No media files yet
              </p>
            ) : (
              media.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start space-x-3 rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  {item.thumbnailUrl || item.url ? (
                    <img
                      src={item.thumbnailUrl || item.url}
                      alt={item.fileName}
                      className="h-16 w-16 rounded object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23ddd' width='100' height='100'/%3E%3Ctext fill='%23999' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EFile%3C/text%3E%3C/svg%3E";
                      }}
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded bg-gray-200 dark:bg-gray-700">
                      <svg className="h-8 w-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {item.fileName}
                    </p>
                    <div className="mt-2 flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                      <span className="rounded bg-gray-100 px-2 py-1 dark:bg-gray-800">
                        {item.mediaType}
                      </span>
                      <span>
                        {(item.fileSize / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  </div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Refresh Button */}
      <button
        onClick={loadData}
        disabled={loading}
        className="mt-4 w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
      >
        {loading ? "Loading..." : "Refresh"}
      </button>
    </div>
  );
}
