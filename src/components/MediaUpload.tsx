"use client";

import { useState, useCallback } from "react";
import { apiClient, type MediaItem } from "@/lib/api-client";
import Image from "next/image";

interface MediaUploadProps {
  onSuccess?: (media: MediaItem | MediaItem[]) => void;
  onError?: (error: string) => void;
  onProgress?: (progress: number) => void;
  multiple?: boolean;
}

export function MediaUpload({ onSuccess, onError, onProgress, multiple = false }: MediaUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [folder, setFolder] = useState("");
  const [tags, setTags] = useState("");

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length > 0) {
        if (multiple) {
          setFiles((prev) => [...prev, ...droppedFiles]);
        } else {
          setFiles([droppedFiles[0]]);
        }
      }
    },
    [multiple]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      if (multiple) {
        setFiles((prev) => [...prev, ...selectedFiles]);
      } else {
        setFiles([selectedFiles[0]]);
      }
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      onError?.("Please select at least one file");
      return;
    }

    setLoading(true);
    onProgress?.(0);

    try {
      const tagArray = tags
        ? tags
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t)
        : undefined;

      if (multiple && files.length > 1) {
        // Batch upload
        const response = await apiClient.batchUploadMedia(
          files,
          folder || undefined,
          tagArray
        );
        onProgress?.(100);
        onSuccess?.(response.data.success);
      } else {
        // Single upload
        const response = await apiClient.uploadMedia(files[0], folder || undefined, tagArray);
        onProgress?.(100);
        onSuccess?.(response.data);
      }

      // Reset
      setFiles([]);
      setFolder("");
      setTags("");
    } catch (error) {
      onError?.(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Drag and Drop Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          dragActive
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : "border-gray-300 dark:border-gray-600"
        }`}
      >
        <input
          type="file"
          multiple={multiple}
          onChange={handleFileChange}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          accept="image/*,video/*,.gif,.glb,.gltf"
        />
        <div className="flex flex-col items-center">
          <svg
            className="mb-3 h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="font-semibold">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {multiple ? "Multiple files supported" : "Single file only"} - Images, Videos, GIFs, 3D Models
          </p>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Selected Files ({files.length})
          </h4>
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-800"
              >
                <div className="flex items-center space-x-3">
                  {file.type.startsWith("image/") && (
                    <Image
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="h-10 w-10 rounded object-cover"
                    />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="text-red-600 hover:text-red-800 dark:text-red-400"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Additional Options */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Folder (optional)
          </label>
          <input
            type="text"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            placeholder="uploads"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="nft, art, digital"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
      </div>

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={loading || files.length === 0}
        className="w-full rounded-md bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
      >
        {loading ? "Uploading..." : `Upload ${files.length} File${files.length !== 1 ? "s" : ""}`}
      </button>
    </div>
  );
}
