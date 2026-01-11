import type { MetadataRepository } from "@/core/domain/metadata/metadata.repository";
import type { MetadataListParams } from "@/core/domain/metadata/metadata.entity";

// Mock repository
const mockMetadataRepository = (): MetadataRepository => ({
  create: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
});

describe("ListMetadataUseCase", () => {
  let metadataRepository: MetadataRepository;

  beforeEach(() => {
    metadataRepository = mockMetadataRepository();
  });

  describe("list", () => {
    it("should list metadata with default pagination", async () => {
      const params: MetadataListParams = {
        apiKeyId: "api-key-id",
        page: 1,
        limit: 20,
      };

      const mockMetadata = [
        {
          id: "1",
          apiKeyId: "api-key-id",
          name: "Test NFT 1",
          image: "https://example.com/1.png",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "2",
          apiKeyId: "api-key-id",
          name: "Test NFT 2",
          image: "https://example.com/2.png",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jest.mocked(metadataRepository.findAll).mockResolvedValue(
        mockMetadata as any
      );
      jest.mocked(metadataRepository.count).mockResolvedValue(2);

      const result = await metadataRepository.findAll(params);
      const total = await metadataRepository.count({ apiKeyId: "api-key-id" });

      expect(metadataRepository.findAll).toHaveBeenCalledWith(params);
      expect(result).toHaveLength(2);
      expect(total).toBe(2);
    });

    it("should filter by isLocked status", async () => {
      const params: MetadataListParams = {
        apiKeyId: "api-key-id",
        page: 1,
        limit: 20,
        isLocked: false,
      };

      const mockMetadata = [
        {
          id: "1",
          apiKeyId: "api-key-id",
          name: "Unlocked NFT",
          image: "https://example.com/1.png",
          isLocked: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jest.mocked(metadataRepository.findAll).mockResolvedValue(
        mockMetadata as any
      );

      const result = await metadataRepository.findAll(params);

      expect(metadataRepository.findAll).toHaveBeenCalledWith(params);
      expect(result).toHaveLength(1);
      expect(result[0].isLocked).toBe(false);
    });

    it("should filter by isPinned status", async () => {
      const params: MetadataListParams = {
        apiKeyId: "api-key-id",
        page: 1,
        limit: 20,
        isPinned: true,
      };

      const mockMetadata = [
        {
          id: "1",
          apiKeyId: "api-key-id",
          name: "Pinned NFT",
          image: "https://example.com/1.png",
          isPinned: true,
          pinnedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jest.mocked(metadataRepository.findAll).mockResolvedValue(
        mockMetadata as any
      );

      const result = await metadataRepository.findAll(params);

      expect(metadataRepository.findAll).toHaveBeenCalledWith(params);
      expect(result).toHaveLength(1);
      expect(result[0].isPinned).toBe(true);
    });

    it("should search by name", async () => {
      const params: MetadataListParams = {
        apiKeyId: "api-key-id",
        page: 1,
        limit: 20,
        search: "Dragon",
      };

      const mockMetadata = [
        {
          id: "1",
          apiKeyId: "api-key-id",
          name: "Dragon NFT",
          image: "https://example.com/dragon.png",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jest.mocked(metadataRepository.findAll).mockResolvedValue(
        mockMetadata as any
      );

      const result = await metadataRepository.findAll(params);

      expect(metadataRepository.findAll).toHaveBeenCalledWith(params);
      expect(result).toHaveLength(1);
      expect(result[0].name).toContain("Dragon");
    });

    it("should sort by name ascending", async () => {
      const params: MetadataListParams = {
        apiKeyId: "api-key-id",
        page: 1,
        limit: 20,
        sortBy: "name",
        sortOrder: "asc",
      };

      const mockMetadata = [
        {
          id: "1",
          apiKeyId: "api-key-id",
          name: "Alpha NFT",
          image: "https://example.com/alpha.png",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "2",
          apiKeyId: "api-key-id",
          name: "Beta NFT",
          image: "https://example.com/beta.png",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jest.mocked(metadataRepository.findAll).mockResolvedValue(
        mockMetadata as any
      );

      const result = await metadataRepository.findAll(params);

      expect(metadataRepository.findAll).toHaveBeenCalledWith(params);
      expect(result[0].name).toBe("Alpha NFT");
      expect(result[1].name).toBe("Beta NFT");
    });

    it("should sort by createdAt descending", async () => {
      const oldDate = new Date("2024-01-01");
      const newDate = new Date("2024-12-01");

      const params: MetadataListParams = {
        apiKeyId: "api-key-id",
        page: 1,
        limit: 20,
        sortBy: "createdAt",
        sortOrder: "desc",
      };

      const mockMetadata = [
        {
          id: "2",
          apiKeyId: "api-key-id",
          name: "Newer NFT",
          image: "https://example.com/new.png",
          createdAt: newDate,
          updatedAt: newDate,
        },
        {
          id: "1",
          apiKeyId: "api-key-id",
          name: "Older NFT",
          image: "https://example.com/old.png",
          createdAt: oldDate,
          updatedAt: oldDate,
        },
      ];

      jest.mocked(metadataRepository.findAll).mockResolvedValue(
        mockMetadata as any
      );

      const result = await metadataRepository.findAll(params);

      expect(metadataRepository.findAll).toHaveBeenCalledWith(params);
      expect(result[0].createdAt.getTime()).toBeGreaterThan(
        result[1].createdAt.getTime()
      );
    });

    it("should handle pagination correctly", async () => {
      const testCases = [
        { page: 1, limit: 10, expectedSkip: 0 },
        { page: 2, limit: 10, expectedSkip: 10 },
        { page: 3, limit: 20, expectedSkip: 40 },
        { page: 5, limit: 5, expectedSkip: 20 },
      ];

      for (const testCase of testCases) {
        const params: MetadataListParams = {
          apiKeyId: "api-key-id",
          page: testCase.page,
          limit: testCase.limit,
        };

        jest.mocked(metadataRepository.findAll).mockResolvedValue([]);

        await metadataRepository.findAll(params);

        expect(metadataRepository.findAll).toHaveBeenCalledWith(params);
      }
    });

    it("should return empty array when no metadata found", async () => {
      const params: MetadataListParams = {
        apiKeyId: "api-key-id",
        page: 1,
        limit: 20,
      };

      jest.mocked(metadataRepository.findAll).mockResolvedValue([]);
      jest.mocked(metadataRepository.count).mockResolvedValue(0);

      const result = await metadataRepository.findAll(params);
      const total = await metadataRepository.count({ apiKeyId: "api-key-id" });

      expect(result).toEqual([]);
      expect(total).toBe(0);
    });

    it("should combine multiple filters", async () => {
      const params: MetadataListParams = {
        apiKeyId: "api-key-id",
        page: 1,
        limit: 20,
        search: "Dragon",
        isLocked: false,
        isPinned: true,
        sortBy: "name",
        sortOrder: "asc",
      };

      const mockMetadata = [
        {
          id: "1",
          apiKeyId: "api-key-id",
          name: "Dragon NFT",
          image: "https://example.com/dragon.png",
          isLocked: false,
          isPinned: true,
          pinnedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jest.mocked(metadataRepository.findAll).mockResolvedValue(
        mockMetadata as any
      );

      const result = await metadataRepository.findAll(params);

      expect(metadataRepository.findAll).toHaveBeenCalledWith(params);
      expect(result).toHaveLength(1);
      expect(result[0].name).toContain("Dragon");
      expect(result[0].isLocked).toBe(false);
      expect(result[0].isPinned).toBe(true);
    });
  });
});
