"use client";

import { useState } from "react";
import { apiClient, type MetadataItem } from "@/lib/api-client";

interface MetadataUploadProps {
  onSuccess?: (metadata: MetadataItem) => void;
  onError?: (error: string) => void;
}

export function MetadataUpload({ onSuccess, onError }: MetadataUploadProps) {
  const [formData, setFormData] = useState<MetadataItem>({
    name: "",
    description: "",
    image: "",
    symbol: "",
    externalUrl: "",
    mediaType: "IMAGE",
    attributes: [],
    creators: [],
  });
  const [loading, setLoading] = useState(false);
  const [attribute, setAttribute] = useState({ traitType: "", value: "" });
  const [creator, setCreator] = useState({ address: "", share: 0 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await apiClient.createMetadata(formData);
      onSuccess?.(response.data);

      // Reset form
      setFormData({
        name: "",
        description: "",
        image: "",
        symbol: "",
        externalUrl: "",
        mediaType: "IMAGE",
        attributes: [],
        creators: [],
      });
    } catch (error) {
      onError?.(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const addAttribute = () => {
    if (attribute.traitType && attribute.value) {
      setFormData({
        ...formData,
        attributes: [...(formData.attributes || []), attribute],
      });
      setAttribute({ traitType: "", value: "" });
    }
  };

  const addCreator = () => {
    if (creator.address && creator.share > 0) {
      setFormData({
        ...formData,
        creators: [...(formData.creators || []), creator],
      });
      setCreator({ address: "", share: 0 });
    }
  };

  const removeAttribute = (index: number) => {
    setFormData({
      ...formData,
      attributes: formData.attributes?.filter((_, i) => i !== index),
    });
  };

  const removeCreator = (index: number) => {
    setFormData({
      ...formData,
      creators: formData.creators?.filter((_, i) => i !== index),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            maxLength={100}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            placeholder="My NFT Name"
          />
        </div>

        {/* Symbol */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Symbol
          </label>
          <input
            type="text"
            maxLength={10}
            value={formData.symbol}
            onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            placeholder="NFT"
          />
        </div>

        {/* Image URL */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Image URL <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            required
            value={formData.image}
            onChange={(e) => setFormData({ ...formData, image: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            placeholder="https://example.com/image.png"
          />
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Description
          </label>
          <textarea
            maxLength={2000}
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            placeholder="Describe your NFT..."
          />
        </div>

        {/* External URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            External URL
          </label>
          <input
            type="url"
            value={formData.externalUrl}
            onChange={(e) => setFormData({ ...formData, externalUrl: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            placeholder="https://example.com"
          />
        </div>

        {/* Media Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Media Type
          </label>
          <select
            value={formData.mediaType}
            onChange={(e) => setFormData({ ...formData, mediaType: e.target.value as MetadataItem["mediaType"] })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="IMAGE">Image</option>
            <option value="VIDEO">Video</option>
            <option value="GIF">GIF</option>
            <option value="MODEL_3D">3D Model</option>
          </select>
        </div>
      </div>

      {/* Attributes Section */}
      <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Attributes</h3>
        <div className="mb-3 flex gap-2">
          <input
            type="text"
            placeholder="Trait Type"
            value={attribute.traitType}
            onChange={(e) => setAttribute({ ...attribute, traitType: e.target.value })}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
          <input
            type="text"
            placeholder="Value"
            value={attribute.value}
            onChange={(e) => setAttribute({ ...attribute, value: e.target.value })}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
          <button
            type="button"
            onClick={addAttribute}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add
          </button>
        </div>
        <div className="space-y-2">
          {formData.attributes?.map((attr, index) => (
            <div key={index} className="flex items-center justify-between rounded bg-gray-50 px-3 py-2 dark:bg-gray-800">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                <strong>{attr.traitType}:</strong> {attr.value}
              </span>
              <button
                type="button"
                onClick={() => removeAttribute(index)}
                className="text-sm text-red-600 hover:text-red-800 dark:text-red-400"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Creators Section */}
      <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Creators</h3>
        <div className="mb-3 flex gap-2">
          <input
            type="text"
            placeholder="Address (0x...)"
            value={creator.address}
            onChange={(e) => setCreator({ ...creator, address: e.target.value })}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
          <input
            type="number"
            placeholder="Share %"
            min="0"
            max="100"
            value={creator.share || ""}
            onChange={(e) => setCreator({ ...creator, share: parseInt(e.target.value) || 0 })}
            className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
          <button
            type="button"
            onClick={addCreator}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add
          </button>
        </div>
        <div className="space-y-2">
          {formData.creators?.map((c, index) => (
            <div key={index} className="flex items-center justify-between rounded bg-gray-50 px-3 py-2 dark:bg-gray-800">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {c.address.slice(0, 10)}... ({c.share}%)
              </span>
              <button
                type="button"
                onClick={() => removeCreator(index)}
                className="text-sm text-red-600 hover:text-red-800 dark:text-red-400"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {loading ? "Creating..." : "Create Metadata"}
      </button>
    </form>
  );
}
