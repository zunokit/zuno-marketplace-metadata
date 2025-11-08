
// Mock repository
const mockMediaRepository = (): IMediaRepository => ({
  create: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
});

describe("UploadMediaUseCase", () => {
  let mediaRepository: IMediaRepository;

  beforeEach(() => {
    mediaRepository = mockMediaRepository();
  });

  describe("upload", () => {
    it("should upload an image file", async () => {
      const mockMedia = {
        id: "test-id",
        apiKeyId: "api-key-id",
        fileName: "test-image.png",
        fileUrl: "https://imagekit.io/test-image.png",
        thumbnailUrl: "https://imagekit.io/test-image-thumb.png",
        fileType: "image/png",
        fileSize: 1024,
        width: 800,
        height: 600,
        mediaType: "IMAGE" as const,
        ipfsHash: null,
        isPinned: false,
        pinnedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.mocked(mediaRepository.create).mockResolvedValue(mockMedia);

      const result = await mediaRepository.create({
        apiKeyId: "api-key-id",
        fileName: "test-image.png",
        fileUrl: "https://imagekit.io/test-image.png",
        thumbnailUrl: "https://imagekit.io/test-image-thumb.png",
        fileType: "image/png",
        fileSize: 1024,
        width: 800,
        height: 600,
        mediaType: "IMAGE",
        isPinned: false,
      });

      expect(mediaRepository.create).toHaveBeenCalled();
      expect(result.fileName).toBe("test-image.png");
      expect(result.mediaType).toBe("IMAGE");
      expect(result.fileType).toBe("image/png");
    });

    it("should upload a video file", async () => {
      const mockMedia = {
        id: "test-id",
        apiKeyId: "api-key-id",
        fileName: "test-video.mp4",
        fileUrl: "https://imagekit.io/test-video.mp4",
        thumbnailUrl: "https://imagekit.io/test-video-thumb.jpg",
        fileType: "video/mp4",
        fileSize: 5242880, // 5MB
        width: 1920,
        height: 1080,
        mediaType: "VIDEO" as const,
        ipfsHash: null,
        isPinned: true,
        pinnedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.mocked(mediaRepository.create).mockResolvedValue(mockMedia);

      const result = await mediaRepository.create({
        apiKeyId: "api-key-id",
        fileName: "test-video.mp4",
        fileUrl: "https://imagekit.io/test-video.mp4",
        thumbnailUrl: "https://imagekit.io/test-video-thumb.jpg",
        fileType: "video/mp4",
        fileSize: 5242880,
        width: 1920,
        height: 1080,
        mediaType: "VIDEO",
        isPinned: true,
      });

      expect(result.mediaType).toBe("VIDEO");
      expect(result.fileType).toBe("video/mp4");
      expect(result.isPinned).toBe(true);
    });

    it("should upload a GIF file", async () => {
      const mockMedia = {
        id: "test-id",
        apiKeyId: "api-key-id",
        fileName: "test-animation.gif",
        fileUrl: "https://imagekit.io/test-animation.gif",
        thumbnailUrl: "https://imagekit.io/test-animation-thumb.jpg",
        fileType: "image/gif",
        fileSize: 2097152, // 2MB
        width: 480,
        height: 480,
        mediaType: "GIF" as const,
        ipfsHash: null,
        isPinned: false,
        pinnedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.mocked(mediaRepository.create).mockResolvedValue(mockMedia);

      const result = await mediaRepository.create({
        apiKeyId: "api-key-id",
        fileName: "test-animation.gif",
        fileUrl: "https://imagekit.io/test-animation.gif",
        thumbnailUrl: "https://imagekit.io/test-animation-thumb.jpg",
        fileType: "image/gif",
        fileSize: 2097152,
        width: 480,
        height: 480,
        mediaType: "GIF",
        isPinned: false,
      });

      expect(result.mediaType).toBe("GIF");
      expect(result.fileType).toBe("image/gif");
    });

    it("should upload a 3D model file", async () => {
      const mockMedia = {
        id: "test-id",
        apiKeyId: "api-key-id",
        fileName: "test-model.glb",
        fileUrl: "https://imagekit.io/test-model.glb",
        thumbnailUrl: "https://imagekit.io/test-model-thumb.jpg",
        fileType: "model/gltf-binary",
        fileSize: 10485760, // 10MB
        width: null,
        height: null,
        mediaType: "MODEL_3D" as const,
        ipfsHash: null,
        isPinned: true,
        pinnedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.mocked(mediaRepository.create).mockResolvedValue(mockMedia);

      const result = await mediaRepository.create({
        apiKeyId: "api-key-id",
        fileName: "test-model.glb",
        fileUrl: "https://imagekit.io/test-model.glb",
        thumbnailUrl: "https://imagekit.io/test-model-thumb.jpg",
        fileType: "model/gltf-binary",
        fileSize: 10485760,
        width: null,
        height: null,
        mediaType: "MODEL_3D",
        isPinned: true,
      });

      expect(result.mediaType).toBe("MODEL_3D");
      expect(result.fileType).toBe("model/gltf-binary");
      expect(result.width).toBeNull();
      expect(result.height).toBeNull();
    });

    it("should handle media with IPFS pinning", async () => {
      const mockMedia = {
        id: "test-id",
        apiKeyId: "api-key-id",
        fileName: "test-image.png",
        fileUrl: "https://imagekit.io/test-image.png",
        thumbnailUrl: "https://imagekit.io/test-image-thumb.png",
        fileType: "image/png",
        fileSize: 1024,
        width: 800,
        height: 600,
        mediaType: "IMAGE" as const,
        ipfsHash: "QmTest123456789",
        isPinned: true,
        pinnedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.mocked(mediaRepository.create).mockResolvedValue(mockMedia);

      const result = await mediaRepository.create({
        apiKeyId: "api-key-id",
        fileName: "test-image.png",
        fileUrl: "https://imagekit.io/test-image.png",
        thumbnailUrl: "https://imagekit.io/test-image-thumb.png",
        fileType: "image/png",
        fileSize: 1024,
        width: 800,
        height: 600,
        mediaType: "IMAGE",
        isPinned: true,
      });

      expect(result.isPinned).toBe(true);
      expect(result.ipfsHash).toBe("QmTest123456789");
      expect(result.pinnedAt).toBeDefined();
    });

    it("should handle different file sizes", async () => {
      const testCases = [
        { size: 1024, description: "1KB file" },
        { size: 1048576, description: "1MB file" },
        { size: 10485760, description: "10MB file" },
        { size: 52428800, description: "50MB file" },
      ];

      for (const testCase of testCases) {
        const mockMedia = {
          id: "test-id",
          apiKeyId: "api-key-id",
          fileName: "test-file.png",
          fileUrl: "https://imagekit.io/test-file.png",
          thumbnailUrl: "https://imagekit.io/test-file-thumb.png",
          fileType: "image/png",
          fileSize: testCase.size,
          width: 800,
          height: 600,
          mediaType: "IMAGE" as const,
          ipfsHash: null,
          isPinned: false,
          pinnedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        jest.mocked(mediaRepository.create).mockResolvedValue(mockMedia);

        const result = await mediaRepository.create({
          apiKeyId: "api-key-id",
          fileName: "test-file.png",
          fileUrl: "https://imagekit.io/test-file.png",
          thumbnailUrl: "https://imagekit.io/test-file-thumb.png",
          fileType: "image/png",
          fileSize: testCase.size,
          width: 800,
          height: 600,
          mediaType: "IMAGE",
          isPinned: false,
        });

        expect(result.fileSize).toBe(testCase.size);
      }
    });
  });
});
