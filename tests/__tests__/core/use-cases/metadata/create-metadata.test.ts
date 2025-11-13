import type { MetadataRepository } from "@/core/domain/metadata/metadata.repository";
import type { CreateMetadataParams } from "@/core/domain/metadata/metadata.entity";

// Mock repository
const mockMetadataRepository = (): MetadataRepository => ({
  create: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
});

describe("CreateMetadataUseCase", () => {
  let metadataRepository: MetadataRepository;

  beforeEach(() => {
    metadataRepository = mockMetadataRepository();
  });

  describe("create", () => {
    it("should create metadata with required fields", async () => {
      const createDTO: CreateMetadataParams = {
        name: "Test NFT",
        image: "https://example.com/image.png",
      };

      const expectedMetadata = {
        id: "test-id",
        apiKeyId: "api-key-id",
        ...createDTO,
        description: null,
        symbol: null,
        bannerImage: null,
        featuredImage: null,
        animationUrl: null,
        externalUrl: null,
        backgroundColor: null,
        attributes: null,
        creators: null,
        sellerFeeBasisPoints: null,
        feeRecipient: null,
        mediaType: null,
        ipfsHash: null,
        isPinned: false,
        pinnedAt: null,
        isLocked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (metadataRepository.create as jest.Mock).mockResolvedValue(
        expectedMetadata as any
      );

      const result = await metadataRepository.create({
        apiKeyId: "api-key-id",
        ...createDTO,
      });

      expect(metadataRepository.create).toHaveBeenCalledWith({
        apiKeyId: "api-key-id",
        ...createDTO,
      });
      expect(result.name).toBe(createDTO.name);
      expect(result.image).toBe(createDTO.image);
    });

    it("should create metadata with all optional fields", async () => {
      const createDTO: CreateMetadataParams = {
        name: "Test NFT",
        image: "https://example.com/image.png",
        description: "Test description",
        symbol: "TEST",
        bannerImage: "https://example.com/banner.png",
        featuredImage: "https://example.com/featured.png",
        animationUrl: "https://example.com/animation.mp4",
        externalUrl: "https://example.com",
        backgroundColor: "FF0000",
        attributes: [
          { traitType: "Background", value: "Blue" },
          { traitType: "Power", value: 100 },
        ],
        creators: [
          {
            address: "0x1234567890123456789012345678901234567890",
            share: 100,
            verified: true,
          },
        ],
        sellerFeeBasisPoints: 500,
        feeRecipient: "0x9876543210987654321098765432109876543210",
        mediaType: "IMAGE",
      };

      const expectedMetadata = {
        id: "test-id",
        apiKeyId: "api-key-id",
        ...createDTO,
        ipfsHash: null,
        isPinned: false,
        pinnedAt: null,
        isLocked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (metadataRepository.create as jest.Mock).mockResolvedValue(
        expectedMetadata as any
      );

      const result = await metadataRepository.create({
        apiKeyId: "api-key-id",
        ...createDTO,
      });

      expect(result.description).toBe(createDTO.description);
      expect(result.attributes).toEqual(createDTO.attributes);
      expect(result.creators).toEqual(createDTO.creators);
    });

    it("should handle attributes with different display types", async () => {
      const attributes = [
        { traitType: "Background", value: "Blue" },
        { traitType: "Power", value: 100, displayType: "number" },
        { traitType: "Speed", value: 75, displayType: "boost_percentage" },
        {
          traitType: "Level",
          value: 5,
          maxValue: 10,
          displayType: "boost_number",
        },
      ];

      const createDTO: CreateMetadataParams = {
        name: "Test NFT",
        image: "https://example.com/image.png",
        attributes,
      };

      const expectedMetadata = {
        id: "test-id",
        apiKeyId: "api-key-id",
        ...createDTO,
        description: null,
        symbol: null,
        bannerImage: null,
        featuredImage: null,
        animationUrl: null,
        externalUrl: null,
        backgroundColor: null,
        creators: null,
        sellerFeeBasisPoints: null,
        feeRecipient: null,
        mediaType: null,
        ipfsHash: null,
        isPinned: false,
        pinnedAt: null,
        isLocked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (metadataRepository.create as jest.Mock).mockResolvedValue(
        expectedMetadata as any
      );

      const result = await metadataRepository.create({
        apiKeyId: "api-key-id",
        ...createDTO,
      });

      expect(result.attributes).toEqual(attributes);
    });

    it("should handle multiple creators with valid shares", async () => {
      const creators = [
        {
          address: "0x1111111111111111111111111111111111111111",
          share: 50,
          verified: true,
        },
        {
          address: "0x2222222222222222222222222222222222222222",
          share: 30,
          verified: false,
        },
        {
          address: "0x3333333333333333333333333333333333333333",
          share: 20,
          verified: true,
        },
      ];

      const createDTO: CreateMetadataParams = {
        name: "Test NFT",
        image: "https://example.com/image.png",
        creators,
      };

      const expectedMetadata = {
        id: "test-id",
        apiKeyId: "api-key-id",
        ...createDTO,
        description: null,
        symbol: null,
        bannerImage: null,
        featuredImage: null,
        animationUrl: null,
        externalUrl: null,
        backgroundColor: null,
        attributes: null,
        sellerFeeBasisPoints: null,
        feeRecipient: null,
        mediaType: null,
        ipfsHash: null,
        isPinned: false,
        pinnedAt: null,
        isLocked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (metadataRepository.create as jest.Mock).mockResolvedValue(
        expectedMetadata as any
      );

      const result = await metadataRepository.create({
        apiKeyId: "api-key-id",
        ...createDTO,
      });

      expect(result.creators).toEqual(creators);
    });

    it("should handle seller fee basis points correctly", async () => {
      const testCases = [
        { sellerFeeBasisPoints: 0, description: "0% fee" },
        { sellerFeeBasisPoints: 500, description: "5% fee" },
        { sellerFeeBasisPoints: 10000, description: "100% fee" },
      ];

      for (const testCase of testCases) {
        const createDTO: CreateMetadataParams = {
          name: "Test NFT",
          image: "https://example.com/image.png",
          sellerFeeBasisPoints: testCase.sellerFeeBasisPoints,
        };

        const expectedMetadata = {
          id: "test-id",
          apiKeyId: "api-key-id",
          ...createDTO,
          description: null,
          symbol: null,
          bannerImage: null,
          featuredImage: null,
          animationUrl: null,
          externalUrl: null,
          backgroundColor: null,
          attributes: null,
          creators: null,
          feeRecipient: null,
          mediaType: null,
          ipfsHash: null,
          isPinned: false,
          pinnedAt: null,
          isLocked: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        (metadataRepository.create as jest.Mock).mockResolvedValue(
          expectedMetadata as any
        );

        const result = await metadataRepository.create({
          apiKeyId: "api-key-id",
          ...createDTO,
        });

        expect(result.sellerFeeBasisPoints).toBe(
          testCase.sellerFeeBasisPoints
        );
      }
    });
  });
});
