/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

interface UploadedItemCardProps {
  item: any;
}

export function UploadedItemCard({ item }: UploadedItemCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
      {/* Metadata Item */}
      {item.name && (
        <div>
          <div className="flex items-start gap-3 mb-3">
            <div className="w-12 h-12 rounded bg-gradient-to-br from-green-100 to-blue-100 flex-shrink-0 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">
                {item.name}
              </h3>
              {item.description && (
                <p className="text-sm text-gray-600 truncate mt-1">
                  {item.description}
                </p>
              )}
              <div className="flex gap-2 mt-2">
                {item.symbol && (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    {item.symbol}
                  </span>
                )}
                {item.mediaType && (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                    {item.mediaType}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* IPFS Status */}
          <div className="space-y-2">
            {item.ipfsUrl ? (
              <a
                href={item.ipfsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-2 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                  <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                </svg>
                <span className="font-mono truncate">
                  IPFS: {item.ipfsHash || "View on IPFS"}
                </span>
              </a>
            ) : (
              <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 px-3 py-2 rounded-lg">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>Pinning to IPFS...</span>
              </div>
            )}
            {item.id && (
              <p className="text-xs text-gray-500 px-3 font-mono">ID: {item.id}</p>
            )}
          </div>
        </div>
      )}

      {/* Media Item */}
      {item.fileName && item.url && (
        <div className="flex gap-3">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="relative w-20 h-20 rounded overflow-hidden bg-gray-100 flex-shrink-0 group"
          >
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform group-hover:scale-110"
              style={{ backgroundImage: `url(${item.url})` }}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
              </svg>
            </div>
          </a>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{item.fileName}</h3>
            <div className="flex gap-2 mt-2">
              {item.mediaType && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                  {item.mediaType}
                </span>
              )}
              {item.fileSize && (
                <span className="text-xs text-gray-500">
                  {(item.fileSize / 1024).toFixed(1)} KB
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
