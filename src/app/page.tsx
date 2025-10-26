"use client";

import { useState } from "react";
import * as React from "react";
import { apiClient } from "@/lib/api-client";
import { UploadedItemCard } from "@/components/UploadedItemCard";

const METADATA_SAMPLE = {
  name: "Cool NFT #1",
  description: "An awesome NFT for your collection",
  image: "ipfs://QmYourImageHashHere/image.png",
  symbol: "COOL",
  attributes: [
    { traitType: "Background", value: "Blue" },
    { traitType: "Rarity", value: "Legendary" },
  ],
  mediaType: "IMAGE" as const,
};

const BATCH_METADATA_SAMPLE = [
  {
    name: "Cool NFT #1",
    image: "ipfs://QmYourImageHash1/nft1.png",
    description: "First NFT in collection",
  },
  {
    name: "Cool NFT #2",
    image: "ipfs://QmYourImageHash2/nft2.png",
    description: "Second NFT in collection",
  },
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"metadata" | "media">("metadata");
  const [metadataInput, setMetadataInput] = useState(
    JSON.stringify(METADATA_SAMPLE, null, 2)
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [uploadedItems, setUploadedItems] = useState<any[]>([]);

  // Auto-refresh IPFS status every 10 seconds
  React.useEffect(() => {
    const metadataItems = uploadedItems.filter(item => item.id && item.name && !item.ipfsUrl);

    if (metadataItems.length === 0) return;

    const refreshInterval = setInterval(async () => {
      const updatedItems = await Promise.all(
        uploadedItems.map(async (item) => {
          if (item.id && item.name && !item.ipfsUrl) {
            try {
              const response = await fetch(`/api/metadata/${item.id}`, {
                headers: {
                  "x-api-key": process.env.NEXT_PUBLIC_API_KEY || "",
                  "x-api-version": "v1",
                },
              });
              if (response.ok) {
                const data = await response.json();
                return data.data;
              }
            } catch (error) {
              console.error("Auto-refresh failed:", error);
            }
          }
          return item;
        })
      );
      setUploadedItems(updatedItems);
    }, 10000); // 10 seconds

    return () => clearInterval(refreshInterval);
  }, [uploadedItems]);

  const handleCopySample = () => {
    navigator.clipboard.writeText(metadataInput);
    setResult("✓ Sample copied to clipboard!");
    setTimeout(() => setResult(""), 2000);
  };

  const handleUseBatchSample = () => {
    setMetadataInput(JSON.stringify(BATCH_METADATA_SAMPLE, null, 2));
    setResult("✓ Batch sample loaded!");
    setTimeout(() => setResult(""), 2000);
  };

  const handleMetadataSubmit = async () => {
    setLoading(true);
    setResult("");
    try {
      const data = JSON.parse(metadataInput);

      if (Array.isArray(data)) {
        // Batch upload
        const response = await apiClient.batchCreateMetadata(data);
        setResult(
          `✅ Success! Created ${response.data.summary.succeeded} metadata items`
        );
        setUploadedItems((prev) => [...response.data.success, ...prev]);
      } else {
        // Single upload
        const response = await apiClient.createMetadata(data);
        setResult(`✅ Success! Created metadata: ${response.data.name}`);
        setUploadedItems((prev) => [response.data, ...prev]);
      }
    } catch (error) {
      setResult(
        `❌ Error: ${error instanceof Error ? error.message : "Upload failed"}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleMediaSubmit = async () => {
    if (selectedFiles.length === 0) {
      setResult("❌ Please select at least one file");
      return;
    }

    setLoading(true);
    setResult("");
    try {
      if (selectedFiles.length > 1) {
        const response = await apiClient.batchUploadMedia(selectedFiles);
        setResult(
          `✅ Success! Uploaded ${response.data.summary.succeeded} files`
        );
        setUploadedItems((prev) => [...response.data.success, ...prev]);
      } else {
        const response = await apiClient.uploadMedia(selectedFiles[0]);
        setResult(`✅ Success! Uploaded: ${response.data.fileName}`);
        setUploadedItems((prev) => [response.data, ...prev]);
      }
      setSelectedFiles([]);
    } catch (error) {
      setResult(
        `❌ Error: ${error instanceof Error ? error.message : "Upload failed"}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <section className="relative py-5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 mb-6">
            Zuno Marketplace
            <span className="block text-blue-600">Metadata & Media</span>
          </h1>

          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Centralized API for managing NFT metadata and media files. Store,
            version, and serve metadata with automatic IPFS pinning. Simple,
            fast, and developer-friendly.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <span className="inline-flex items-center rounded-full bg-blue-100 px-4 py-1 text-sm font-medium text-blue-800">
              IPFS Storage
            </span>
            <span className="inline-flex items-center rounded-full bg-green-100 px-4 py-1 text-sm font-medium text-green-800">
              Batch Upload
            </span>
            <span className="inline-flex items-center rounded-full bg-purple-100 px-4 py-1 text-sm font-medium text-purple-800">
              Version Control
            </span>
            <span className="inline-flex items-center rounded-full bg-orange-100 px-4 py-1 text-sm font-medium text-orange-800">
              API Access
            </span>
            <span className="inline-flex items-center rounded-full bg-red-100 px-4 py-1 text-sm font-medium text-red-800">
              Admin Dashboard
            </span>
          </div>
        </div>
      </section>

      {/* Upload Section */}
      <section className="py-5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Try It Now
          </h2>

          {/* Tabs */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
              <button
                onClick={() => setActiveTab("metadata")}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "metadata"
                    ? "bg-blue-600 text-white"
                    : "text-gray-700 hover:text-gray-900"
                }`}
              >
                📝 Upload Metadata
              </button>
              <button
                onClick={() => setActiveTab("media")}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "media"
                    ? "bg-blue-600 text-white"
                    : "text-gray-700 hover:text-gray-900"
                }`}
              >
                🖼️ Upload Media
              </button>
            </div>
          </div>

          {/* Metadata Upload */}
          {activeTab === "metadata" && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  NFT Metadata (JSON)
                </label>
                <textarea
                  value={metadataInput}
                  onChange={(e) => setMetadataInput(e.target.value)}
                  rows={12}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Paste your metadata JSON here..."
                />
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={handleCopySample}
                  className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  📋 Copy Sample
                </button>
                <button
                  onClick={handleUseBatchSample}
                  className="px-4 py-2 text-sm font-medium text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                >
                  📦 Use Batch Sample
                </button>
                <button
                  onClick={() => {
                    setMetadataInput(JSON.stringify(METADATA_SAMPLE, null, 2));
                  }}
                  className="px-4 py-2 text-sm font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                >
                  🔄 Reset to Single Sample
                </button>
              </div>

              <button
                onClick={handleMetadataSubmit}
                disabled={loading}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Uploading..." : "Upload Metadata"}
              </button>

              {result && (
                <div
                  className={`mt-4 p-4 rounded-lg ${
                    result.startsWith("✅")
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {result}
                </div>
              )}
            </div>
          )}

          {/* Media Upload */}
          {activeTab === "media" && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Files (Images, Videos, GIFs)
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*,.gif"
                  onChange={(e) =>
                    setSelectedFiles(Array.from(e.target.files || []))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {selectedFiles.length > 0 && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Selected: {selectedFiles.length} file(s)
                  </p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {selectedFiles.slice(0, 5).map((file, i) => (
                      <li key={i}>
                        • {file.name} ({(file.size / 1024).toFixed(1)} KB)
                      </li>
                    ))}
                    {selectedFiles.length > 5 && (
                      <li>... and {selectedFiles.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}

              <button
                onClick={handleMediaSubmit}
                disabled={loading || selectedFiles.length === 0}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading
                  ? "Uploading..."
                  : `Upload ${selectedFiles.length || ""} File${
                      selectedFiles.length !== 1 ? "s" : ""
                    }`}
              </button>

              {result && (
                <div
                  className={`mt-4 p-4 rounded-lg ${
                    result.startsWith("✅")
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {result}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Uploaded Items Display */}
      {uploadedItems.length > 0 && (
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Recent Uploads ({uploadedItems.length})
              </h2>
              <button
                onClick={() => setUploadedItems([])}
                className="text-sm text-gray-600 hover:text-red-600 transition-colors"
              >
                Clear All
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {uploadedItems.map((item, index) => (
                <UploadedItemCard key={index} item={item} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
