import { NextResponse } from "next/server";
import { getCurrentUrl } from "@/shared/lib/utils/url";

/**
 * GET /api/docs - API Documentation
 * Public endpoint that provides comprehensive documentation for all API endpoints
 */
export async function GET() {
  const documentation = {
    title: "Zuno Marketplace Metadata API Documentation",
    version: "v1",
    description:
      "NFT metadata management API with OpenSea compatibility, IPFS storage, and media processing",
    baseUrl: getCurrentUrl(),

    authentication: {
      methods: {
        apiKey: {
          description: "API Key authentication for programmatic access",
          headers: {
            "x-api-key": "Your API key",
            alternative: "Authorization: Bearer <api-key>",
          },
          scopes: [
            "metadata:read - Read metadata",
            "metadata:write - Create and update metadata",
            "metadata:delete - Delete metadata",
            "media:read - Read media files",
            "media:write - Upload media files",
            "media:delete - Delete media files",
          ],
          notes:
            "API keys can be created from the admin dashboard (/admin/api-keys)",
        },
        session: {
          description: "Session-based authentication for admin dashboard",
          usage: "Automatically handled by Better Auth for admin endpoints",
          adminOnly:
            "Some endpoints require admin role (created via pnpm db:create-admin)",
        },
      },
      versioning: {
        required: true,
        headers: {
          "x-api-version": "v1 (default)",
          alternative: "accept-version: v1",
        },
        notes:
          "Most endpoints require API version header. Use 'v1' as the current version.",
      },
    },

    responseFormat: {
      success: {
        schema: {
          success: true,
          data: "Response data",
          requestId: "unique-request-id",
        },
      },
      error: {
        schema: {
          success: false,
          error: {
            code: "ERROR_CODE",
            message: "Error description",
            details: "Additional error details (optional)",
          },
          requestId: "unique-request-id",
        },
      },
      pagination: {
        schema: {
          success: true,
          data: "Array of items",
          pagination: {
            page: 1,
            limit: 20,
            total: 100,
            totalPages: 5,
          },
          requestId: "unique-request-id",
        },
      },
    },

    endpoints: {
      health: {
        path: "/api/health",
        method: "GET",
        description: "Health check endpoint - verifies all services are operational",
        authentication: {
          required: false,
        },
        response: {
          schema: {
            status: "healthy | degraded | unhealthy",
            timestamp: "ISO 8601 timestamp",
            services: {
              database: "healthy | unhealthy",
              cache: "healthy | unhealthy",
              imagekit: "healthy | unhealthy",
              pinata: "healthy | unhealthy",
              queue: "healthy | unhealthy",
            },
          },
          example: {
            success: true,
            data: {
              status: "healthy",
              timestamp: "2025-01-13T10:00:00.000Z",
              services: {
                database: "healthy",
                cache: "healthy",
                imagekit: "healthy",
                pinata: "healthy",
                queue: "healthy",
              },
            },
            requestId: "req_abc123",
          },
        },
      },

      metadata: {
        list: {
          path: "/api/metadata",
          method: "GET",
          description: "List all metadata with pagination and filtering",
          authentication: {
            required: true,
            scopes: ["metadata:read"],
          },
          headers: {
            "x-api-key": "required",
            "x-api-version": "v1 (required)",
          },
          queryParameters: {
            page: {
              type: "number",
              default: 1,
              description: "Page number for pagination",
            },
            limit: {
              type: "number",
              default: 20,
              min: 1,
              max: 100,
              description: "Number of items per page",
            },
            sortBy: {
              type: "string",
              enum: ["name", "createdAt", "updatedAt", "version"],
              default: "createdAt",
              description: "Field to sort by",
            },
            sortOrder: {
              type: "string",
              enum: ["asc", "desc"],
              default: "desc",
              description: "Sort order",
            },
            search: {
              type: "string",
              optional: true,
              description: "Search by name (case-insensitive)",
            },
            isPinned: {
              type: "boolean",
              optional: true,
              description: "Filter by IPFS pinning status (true/false)",
            },
            isLocked: {
              type: "boolean",
              optional: true,
              description: "Filter by locked status (true/false)",
            },
          },
          response: {
            example: {
              success: true,
              data: [
                {
                  id: "meta_abc123",
                  userId: "user_xyz789",
                  name: "Cool NFT #1",
                  description: "An awesome NFT",
                  image: "https://example.com/image.png",
                  attributes: [],
                  creators: [],
                  version: 1,
                  isLocked: false,
                  isPinned: true,
                  ipfsHash: "QmXxx...",
                  ipfsUrl: "https://gateway.pinata.cloud/ipfs/QmXxx...",
                  pinnedAt: "2025-01-13T10:30:00.000Z",
                  createdAt: "2025-01-13T10:00:00.000Z",
                  updatedAt: "2025-01-13T10:00:00.000Z",
                },
              ],
              pagination: {
                page: 1,
                limit: 20,
                total: 100,
                totalPages: 5,
              },
              requestId: "req_abc123",
            },
          },
        },

        create: {
          path: "/api/metadata",
          method: "POST",
          description:
            "Create new metadata (queues IPFS pinning job in background)",
          authentication: {
            required: true,
            scopes: ["metadata:write"],
          },
          headers: {
            "x-api-key": "required",
            "x-api-version": "v1 (required)",
            "content-type": "application/json",
          },
          body: {
            required: ["name", "image"],
            schema: {
              name: {
                type: "string",
                minLength: 1,
                maxLength: 100,
                description: "NFT name",
              },
              description: {
                type: "string",
                maxLength: 2000,
                optional: true,
                description: "NFT description",
              },
              symbol: {
                type: "string",
                maxLength: 10,
                optional: true,
                description: "NFT symbol/ticker",
              },
              image: {
                type: "string",
                format: "url",
                description: "Main image URL",
              },
              bannerImage: {
                type: "string",
                format: "url",
                optional: true,
                description: "Banner image URL",
              },
              featuredImage: {
                type: "string",
                format: "url",
                optional: true,
                description: "Featured image URL",
              },
              animationUrl: {
                type: "string",
                format: "url",
                optional: true,
                description: "Animation/video URL",
              },
              externalUrl: {
                type: "string",
                format: "url",
                optional: true,
                description: "External website URL",
              },
              backgroundColor: {
                type: "string",
                pattern: "^[0-9A-Fa-f]{6}$",
                optional: true,
                description: "6-character hex color code (without #)",
              },
              attributes: {
                type: "array",
                optional: true,
                description: "NFT attributes/traits (no duplicate trait types)",
                items: {
                  traitType: {
                    type: "string",
                    description: "Trait category name",
                  },
                  value: {
                    type: "string | number",
                    description: "Trait value",
                  },
                  displayType: {
                    type: "string",
                    enum: ["number", "date", "boost_number", "boost_percentage"],
                    optional: true,
                    description: "Display type for special formatting",
                  },
                  displayValue: {
                    type: "string",
                    optional: true,
                    description: "Custom display value",
                  },
                  maxValue: {
                    type: "number",
                    optional: true,
                    description: "Maximum value (for progress bars)",
                  },
                },
              },
              creators: {
                type: "array",
                optional: true,
                description: "Creator information (total shares must not exceed 100)",
                items: {
                  address: {
                    type: "string",
                    description: "Creator wallet address",
                  },
                  share: {
                    type: "number",
                    min: 0,
                    max: 100,
                    description: "Revenue share percentage",
                  },
                  verified: {
                    type: "boolean",
                    default: false,
                    description: "Verified creator status",
                  },
                },
              },
              sellerFeeBasisPoints: {
                type: "number",
                min: 0,
                max: 10000,
                optional: true,
                description: "Seller fee in basis points (100 = 1%)",
              },
              feeRecipient: {
                type: "string",
                optional: true,
                description: "Fee recipient address",
              },
            },
          },
          response: {
            example: {
              success: true,
              data: {
                id: "meta_abc123",
                userId: "user_xyz789",
                name: "Cool NFT #1",
                description: "An awesome NFT",
                image: "https://example.com/image.png",
                attributes: [],
                creators: [],
                version: 1,
                isLocked: false,
                isPinned: false,
                ipfsHash: null,
                ipfsUrl: null,
                pinnedAt: null,
                createdAt: "2025-01-13T10:00:00.000Z",
                updatedAt: "2025-01-13T10:00:00.000Z",
              },
              requestId: "req_abc123",
            },
          },
          notes: [
            "IPFS pinning happens asynchronously in background",
            "Attributes must have unique trait types",
            "Creator shares total cannot exceed 100%",
            "Follows OpenSea metadata standard",
          ],
        },

        get: {
          path: "/api/metadata/:id",
          method: "GET",
          description: "Get metadata by ID",
          authentication: {
            required: true,
            scopes: ["metadata:read"],
          },
          headers: {
            "x-api-key": "required",
            "x-api-version": "v1 (required)",
          },
          pathParameters: {
            id: {
              type: "string",
              description: "Metadata ID",
            },
          },
          response: {
            example: {
              success: true,
              data: {
                id: "meta_abc123",
                userId: "user_xyz789",
                name: "Cool NFT #1",
                description: "An awesome NFT",
                image: "https://example.com/image.png",
                attributes: [
                  { traitType: "Background", value: "Blue" },
                  { traitType: "Rarity", value: "Legendary" },
                ],
                creators: [],
                version: 1,
                isLocked: false,
                isPinned: true,
                ipfsHash: "QmXxx...",
                ipfsUrl: "https://gateway.pinata.cloud/ipfs/QmXxx...",
                pinnedAt: "2025-01-13T10:30:00.000Z",
                createdAt: "2025-01-13T10:00:00.000Z",
                updatedAt: "2025-01-13T10:00:00.000Z",
              },
              requestId: "req_abc123",
            },
          },
        },

        update: {
          path: "/api/metadata/:id",
          method: "PUT",
          description: "Update metadata by ID (cannot update if locked)",
          authentication: {
            required: true,
            scopes: ["metadata:write"],
          },
          headers: {
            "x-api-key": "required",
            "x-api-version": "v1 (required)",
            "content-type": "application/json",
          },
          pathParameters: {
            id: {
              type: "string",
              description: "Metadata ID",
            },
          },
          body: {
            description: "All fields are optional (partial update)",
            schema: {
              name: "string (optional)",
              description: "string (optional)",
              image: "string url (optional)",
              attributes: "array (optional)",
              isLocked: "boolean (optional)",
              version: "number (optional)",
              "...": "other metadata fields",
            },
          },
          response: {
            example: {
              success: true,
              data: {
                id: "meta_abc123",
                userId: "user_xyz789",
                name: "Updated NFT Name",
                image: "https://example.com/image.png",
                attributes: [],
                creators: [],
                version: 2,
                isLocked: false,
                isPinned: true,
                ipfsHash: "QmXxx...",
                ipfsUrl: "https://gateway.pinata.cloud/ipfs/QmXxx...",
                pinnedAt: "2025-01-13T10:30:00.000Z",
                createdAt: "2025-01-13T10:00:00.000Z",
                updatedAt: "2025-01-13T11:00:00.000Z",
              },
              requestId: "req_abc123",
            },
          },
          notes: [
            "Cannot update locked metadata",
            "Version increments automatically on update",
            "Cache invalidated automatically",
          ],
        },

        delete: {
          path: "/api/metadata/:id",
          method: "DELETE",
          description: "Delete metadata by ID",
          authentication: {
            required: true,
            scopes: ["metadata:delete"],
          },
          headers: {
            "x-api-key": "required",
            "x-api-version": "v1 (required)",
          },
          pathParameters: {
            id: {
              type: "string",
              description: "Metadata ID",
            },
          },
          response: {
            example: {
              success: true,
              data: {
                id: "meta_abc123",
                name: "Deleted NFT",
                deletedAt: "2025-01-13T10:00:00.000Z",
              },
              requestId: "req_abc123",
            },
          },
        },

        batchCreate: {
          path: "/api/metadata/batch",
          method: "POST",
          description: "Create multiple metadata items (max 50 per batch)",
          authentication: {
            required: true,
            scopes: ["metadata:write"],
          },
          headers: {
            "x-api-key": "required",
            "x-api-version": "v1 (required)",
            "content-type": "application/json",
          },
          body: {
            schema: {
              metadata: {
                type: "array",
                minItems: 1,
                maxItems: 50,
                description: "Array of metadata objects",
                items: "Same schema as POST /api/metadata",
              },
            },
          },
          response: {
            example: {
              success: true,
              data: {
                success: [
                  { id: "meta_1", name: "NFT #1" },
                  { id: "meta_2", name: "NFT #2" },
                ],
                failed: [],
                summary: {
                  total: 2,
                  succeeded: 2,
                  failed: 0,
                },
              },
              requestId: "req_abc123",
            },
          },
          notes: [
            "All items validated before processing",
            "Failed items include error details",
            "IPFS jobs queued for successful items",
          ],
        },
      },

      media: {
        list: {
          path: "/api/media",
          method: "GET",
          description: "List all media files with pagination and filtering",
          authentication: {
            required: true,
            scopes: ["media:read"],
          },
          headers: {
            "x-api-key": "required",
          },
          queryParameters: {
            page: {
              type: "number",
              default: 1,
              description: "Page number",
            },
            limit: {
              type: "number",
              default: 20,
              min: 1,
              max: 100,
              description: "Items per page",
            },
            mediaType: {
              type: "string",
              enum: ["IMAGE", "VIDEO", "GIF", "MODEL_3D"],
              optional: true,
              description: "Filter by media type",
            },
            search: {
              type: "string",
              optional: true,
              description: "Search by filename",
            },
            sortBy: {
              type: "string",
              enum: ["fileName", "createdAt", "fileSize"],
              default: "createdAt",
              description: "Field to sort by",
            },
            sortOrder: {
              type: "string",
              enum: ["asc", "desc"],
              default: "desc",
              description: "Sort order",
            },
            isPinned: {
              type: "boolean",
              optional: true,
              description: "Filter by IPFS pinning status (true/false)",
            },
          },
          response: {
            example: {
              success: true,
              data: [
                {
                  id: "media_abc123",
                  userId: "user_xyz789",
                  fileName: "cool-nft.png",
                  fileSize: 1024000,
                  mimeType: "image/png",
                  mediaType: "IMAGE",
                  url: "https://ik.imagekit.io/...",
                  thumbnailUrl: "https://ik.imagekit.io/.../tr:w-200",
                  optimizedUrl: "https://ik.imagekit.io/.../tr:q-80",
                  width: 1920,
                  height: 1080,
                  isPinned: true,
                  ipfsHash: "QmYxx...",
                  ipfsUrl: "https://gateway.pinata.cloud/ipfs/QmYxx...",
                  pinnedAt: "2025-01-13T10:30:00.000Z",
                  createdAt: "2025-01-13T10:00:00.000Z",
                },
              ],
              pagination: {
                page: 1,
                limit: 20,
                total: 50,
                totalPages: 3,
              },
              requestId: "req_abc123",
            },
          },
        },

        upload: {
          path: "/api/media",
          method: "POST",
          description:
            "Upload media file to ImageKit (queues IPFS pinning job in background)",
          authentication: {
            required: true,
            scopes: ["media:write"],
          },
          headers: {
            "x-api-key": "required",
            "content-type": "multipart/form-data",
          },
          body: {
            description: "FormData with file and optional parameters",
            formData: {
              file: {
                type: "File",
                required: true,
                description: "Media file to upload",
              },
              folder: {
                type: "string",
                optional: true,
                description: "ImageKit folder path",
              },
              tags: {
                type: "string[]",
                optional: true,
                description: "Array of tags for organization",
              },
            },
          },
          response: {
            example: {
              success: true,
              data: {
                id: "media_abc123",
                userId: "user_xyz789",
                fileName: "cool-nft.png",
                fileSize: 1024000,
                mimeType: "image/png",
                mediaType: "IMAGE",
                url: "https://ik.imagekit.io/...",
                thumbnailUrl: "https://ik.imagekit.io/.../tr:w-200",
                optimizedUrl: "https://ik.imagekit.io/.../tr:q-80",
                width: 1920,
                height: 1080,
                isPinned: false,
                ipfsHash: null,
                ipfsUrl: null,
                pinnedAt: null,
                createdAt: "2025-01-13T10:00:00.000Z",
              },
              requestId: "req_abc123",
            },
          },
          notes: [
            "Uploaded to ImageKit CDN",
            "IPFS pinning happens asynchronously",
            "Automatic media type detection",
          ],
        },

        get: {
          path: "/api/media/:id",
          method: "GET",
          description: "Get media file by ID",
          authentication: {
            required: true,
            scopes: ["media:read"],
          },
          headers: {
            "x-api-key": "required",
          },
          pathParameters: {
            id: {
              type: "string",
              description: "Media ID",
            },
          },
          response: {
            example: {
              success: true,
              data: {
                id: "media_abc123",
                userId: "user_xyz789",
                fileName: "cool-nft.png",
                fileSize: 1024000,
                mimeType: "image/png",
                mediaType: "IMAGE",
                url: "https://ik.imagekit.io/...",
                thumbnailUrl: "https://ik.imagekit.io/.../tr:w-200",
                optimizedUrl: "https://ik.imagekit.io/.../tr:q-80",
                width: 1920,
                height: 1080,
                isPinned: true,
                ipfsHash: "QmYxx...",
                ipfsUrl: "https://gateway.pinata.cloud/ipfs/QmYxx...",
                pinnedAt: "2025-01-13T10:30:00.000Z",
                createdAt: "2025-01-13T10:00:00.000Z",
              },
              requestId: "req_abc123",
            },
          },
        },

        delete: {
          path: "/api/media/:id",
          method: "DELETE",
          description: "Delete media file by ID (removes from ImageKit and database)",
          authentication: {
            required: true,
            scopes: ["media:delete"],
          },
          headers: {
            "x-api-key": "required",
          },
          pathParameters: {
            id: {
              type: "string",
              description: "Media ID",
            },
          },
          response: {
            example: {
              success: true,
              data: {
                id: "media_abc123",
                fileName: "cool-nft.png",
                deletedAt: "2025-01-13T10:00:00.000Z",
              },
              requestId: "req_abc123",
            },
          },
        },

        batchUpload: {
          path: "/api/media/batch",
          method: "POST",
          description: "Upload multiple media files (max 20 per batch)",
          authentication: {
            required: true,
            scopes: ["media:write"],
          },
          headers: {
            "x-api-key": "required",
            "content-type": "multipart/form-data",
          },
          body: {
            formData: {
              files: {
                type: "File[]",
                minItems: 1,
                maxItems: 20,
                description: "Array of media files",
              },
            },
          },
          response: {
            example: {
              success: true,
              data: {
                success: [
                  { id: "media_1", fileName: "nft1.png" },
                  { id: "media_2", fileName: "nft2.png" },
                ],
                failed: [],
                summary: {
                  total: 2,
                  succeeded: 2,
                  failed: 0,
                },
              },
              requestId: "req_abc123",
            },
          },
        },
      },

      admin: {
        apiKeys: {
          list: {
            path: "/api/admin/api-keys",
            method: "GET",
            description: "List all API keys for current admin user",
            authentication: {
              required: true,
              allowSession: true,
              adminOnly: true,
            },
            queryParameters: {
              page: {
                type: "number",
                default: 1,
              },
              limit: {
                type: "number",
                default: 20,
                min: 1,
                max: 100,
              },
            },
            response: {
              example: {
                success: true,
                data: [
                  {
                    id: "key_abc123",
                    name: "Production API Key",
                    key: "zuno_live_xxxxxxxxxxxxx",
                    permissions: ["metadata:read", "metadata:write", "media:read", "media:write"],
                    expiresAt: "2026-01-13T10:00:00.000Z",
                    createdAt: "2025-01-13T10:00:00.000Z",
                  },
                ],
                pagination: {
                  page: 1,
                  limit: 20,
                  total: 5,
                  totalPages: 1,
                },
                requestId: "req_abc123",
              },
            },
          },

          create: {
            path: "/api/admin/api-keys",
            method: "POST",
            description: "Create new API key (admin only)",
            authentication: {
              required: true,
              allowSession: true,
              adminOnly: true,
            },
            headers: {
              "content-type": "application/json",
            },
            body: {
              schema: {
                name: {
                  type: "string",
                  minLength: 1,
                  maxLength: 100,
                  description: "API key name/label",
                },
                permissions: {
                  type: "array",
                  description: "Array of permission scopes",
                  items: {
                    type: "string",
                    enum: [
                      "metadata:read",
                      "metadata:write",
                      "metadata:delete",
                      "media:read",
                      "media:write",
                      "media:delete",
                    ],
                  },
                },
                expiresIn: {
                  type: "number",
                  optional: true,
                  description: "Expiration time in milliseconds from now",
                },
                metadata: {
                  type: "object",
                  optional: true,
                  description: "Additional metadata key-value pairs",
                },
              },
            },
            response: {
              example: {
                success: true,
                data: {
                  id: "key_abc123",
                  name: "Production API Key",
                  key: "zuno_live_xxxxxxxxxxxxx",
                  permissions: ["metadata:read", "metadata:write"],
                  expiresAt: "2026-01-13T10:00:00.000Z",
                  createdAt: "2025-01-13T10:00:00.000Z",
                },
                requestId: "req_abc123",
              },
            },
            notes: [
              "API key is only shown once during creation",
              "Store the key securely",
              "Cannot recover lost keys",
            ],
          },

          delete: {
            path: "/api/admin/api-keys/:id",
            method: "DELETE",
            description: "Revoke/delete API key by ID",
            authentication: {
              required: true,
              allowSession: true,
              adminOnly: true,
            },
            pathParameters: {
              id: {
                type: "string",
                description: "API key ID",
              },
            },
            response: {
              example: {
                success: true,
                data: {
                  id: "key_abc123",
                  name: "Production API Key",
                  deletedAt: "2025-01-13T10:00:00.000Z",
                },
                requestId: "req_abc123",
              },
            },
          },
        },

        apiVersions: {
          list: {
            path: "/api/admin/api-versions",
            method: "GET",
            description: "List all API versions",
            authentication: {
              required: true,
              allowSession: true,
              adminOnly: true,
            },
            response: {
              example: {
                success: true,
                data: [
                  {
                    id: "ver_abc123",
                    version: "v1",
                    isActive: true,
                    isDeprecated: false,
                    createdAt: "2025-01-01T00:00:00.000Z",
                  },
                ],
                requestId: "req_abc123",
              },
            },
          },

          update: {
            path: "/api/admin/api-versions/:id",
            method: "PUT",
            description: "Update API version status",
            authentication: {
              required: true,
              allowSession: true,
              adminOnly: true,
            },
            pathParameters: {
              id: {
                type: "string",
                description: "API version ID",
              },
            },
            body: {
              schema: {
                isActive: {
                  type: "boolean",
                  optional: true,
                },
                isDeprecated: {
                  type: "boolean",
                  optional: true,
                },
              },
            },
            response: {
              example: {
                success: true,
                data: {
                  id: "ver_abc123",
                  version: "v1",
                  isActive: true,
                  isDeprecated: false,
                  updatedAt: "2025-01-13T10:00:00.000Z",
                },
                requestId: "req_abc123",
              },
            },
          },
        },
      },

      cron: {
        processMetadataIpfs: {
          path: "/api/cron/process-metadata-ipfs",
          method: "GET",
          description:
            "Process unpinned metadata to IPFS (cron job - processes max 10 items)",
          authentication: {
            required: true,
            method: "Bearer token via Authorization header",
            token: "CRON_SECRET environment variable",
          },
          headers: {
            authorization: "Bearer <CRON_SECRET>",
          },
          response: {
            example: {
              processed: 10,
              success: 9,
              failed: 1,
            },
          },
          notes: [
            "Intended for cron-job.org automation",
            "Processes up to 10 items per run",
            "Auto-updates database with IPFS info",
            "Invalidates cache automatically",
          ],
        },

        processMediaIpfs: {
          path: "/api/cron/process-media-ipfs",
          method: "GET",
          description:
            "Process unpinned media to IPFS (cron job - processes max 10 items)",
          authentication: {
            required: true,
            method: "Bearer token via Authorization header",
            token: "CRON_SECRET environment variable",
          },
          headers: {
            authorization: "Bearer <CRON_SECRET>",
          },
          response: {
            example: {
              processed: 10,
              success: 10,
              failed: 0,
            },
          },
          notes: [
            "Intended for cron-job.org automation",
            "Processes up to 10 items per run",
            "Auto-updates database with IPFS info",
          ],
        },
      },
    },

    errorCodes: {
      VALIDATION_ERROR: "Request validation failed",
      AUTHENTICATION_ERROR: "Authentication failed or missing",
      AUTHORIZATION_ERROR: "Insufficient permissions",
      NOT_FOUND: "Resource not found",
      CONFLICT: "Resource conflict (e.g., locked metadata)",
      RATE_LIMIT_EXCEEDED: "Too many requests",
      INTERNAL_ERROR: "Internal server error",
      SERVICE_UNAVAILABLE: "External service unavailable",
    },

    rateLimiting: {
      description: "Rate limiting is enforced per API key",
      headers: {
        "x-ratelimit-limit": "Maximum requests allowed",
        "x-ratelimit-remaining": "Remaining requests",
        "x-ratelimit-reset": "Unix timestamp when limit resets",
      },
      notes: [
        "Limits configured per API key",
        "429 status code when exceeded",
        "Check response headers for limit info",
      ],
    },

    examples: {
      curl: {
        listMetadata: `curl -X GET '${process.env.BETTER_AUTH_URL || "http://localhost:3000"}/api/metadata?page=1&limit=20' \\
  -H 'x-api-key: your-api-key' \\
  -H 'x-api-version: v1'`,

        createMetadata: `curl -X POST '${process.env.BETTER_AUTH_URL || "http://localhost:3000"}/api/metadata' \\
  -H 'x-api-key: your-api-key' \\
  -H 'x-api-version: v1' \\
  -H 'content-type: application/json' \\
  -d '{
    "name": "Cool NFT #1",
    "description": "An awesome NFT",
    "image": "https://example.com/image.png",
    "attributes": [
      {"traitType": "Background", "value": "Blue"},
      {"traitType": "Rarity", "value": "Legendary"}
    ]
  }'`,

        uploadMedia: `curl -X POST '${process.env.BETTER_AUTH_URL || "http://localhost:3000"}/api/media' \\
  -H 'x-api-key: your-api-key' \\
  -F 'file=@/path/to/image.png' \\
  -F 'folder=nft-assets' \\
  -F 'tags=nft' \\
  -F 'tags=collection-1'`,
      },

      javascript: {
        listMetadata: `const response = await fetch('${process.env.BETTER_AUTH_URL || "http://localhost:3000"}/api/metadata?page=1&limit=20', {
  headers: {
    'x-api-key': 'your-api-key',
    'x-api-version': 'v1'
  }
});
const data = await response.json();`,

        createMetadata: `const response = await fetch('${process.env.BETTER_AUTH_URL || "http://localhost:3000"}/api/metadata', {
  method: 'POST',
  headers: {
    'x-api-key': 'your-api-key',
    'x-api-version': 'v1',
    'content-type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Cool NFT #1',
    description: 'An awesome NFT',
    image: 'https://example.com/image.png',
    attributes: [
      { traitType: 'Background', value: 'Blue' },
      { traitType: 'Rarity', value: 'Legendary' }
    ]
  })
});
const data = await response.json();`,

        uploadMedia: `const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('folder', 'nft-assets');
formData.append('tags', 'nft');
formData.append('tags', 'collection-1');

const response = await fetch('${process.env.BETTER_AUTH_URL || "http://localhost:3000"}/api/media', {
  method: 'POST',
  headers: {
    'x-api-key': 'your-api-key'
  },
  body: formData
});
const data = await response.json();`,
      },
    },

    quickStart: {
      steps: [
        {
          step: 1,
          title: "Get API Key",
          description:
            "Create an admin user with 'pnpm db:create-admin', login to /admin, and create an API key",
        },
        {
          step: 2,
          title: "Upload Media",
          description: "Upload your NFT images/videos via POST /api/media",
        },
        {
          step: 3,
          title: "Create Metadata",
          description:
            "Create NFT metadata using the uploaded media URLs via POST /api/metadata",
        },
        {
          step: 4,
          title: "Wait for IPFS",
          description:
            "IPFS pinning happens in background. Check isPinned status via GET /api/metadata/:id",
        },
        {
          step: 5,
          title: "Use IPFS URLs",
          description:
            "Once pinned, use the ipfsUrl in your NFT smart contracts",
        },
      ],
    },

    resources: {
      adminDashboard: "/admin",
      healthCheck: "/api/health",
      documentation: "/api/docs",
      repository: "https://github.com/ZunoKit/zuno-marketplace-metadata",
    },
  };

  return NextResponse.json(documentation, {
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=3600", // Cache for 1 hour
    },
  });
}
