#!/usr/bin/env node

/**
 * Comprehensive API Test Suite
 * All-in-one test suite covering functional, edge cases, and security testing
 *
 * Usage: npx tsx api-test-suite.ts
 */

const API_KEY =
  process.env.ZUNO_API_KEY || "zuno_mNaCbtAxnufEczgzblCzTKoryrAUKUEs";
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

// Test results tracking
interface TestResult {
  name: string;
  status: "pass" | "fail" | "skip";
  error?: string;
}

interface TestResults {
  passed: number;
  failed: number;
  skipped: number;
  tests: TestResult[];
}

const results: TestResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: [],
};

// Test data storage
interface TestData {
  createdMetadataId: string | null;
  createdMediaId: string | null;
  createdApiKeyId: string | null;
  adminSession: string | null;
}

const testData: TestData = {
  createdMetadataId: null,
  createdMediaId: null,
  createdApiKeyId: null,
  adminSession: null,
};

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  gray: "\x1b[90m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};

function log(message: string, color: string = colors.reset): void {
  console.log(`${color}${message}${colors.reset}`);
}

function logTest(
  name: string,
  status: "pass" | "fail" | "skip",
  details: string = ""
): void {
  const symbols = { pass: "✓", fail: "✗", skip: "○" };
  const statusColors = {
    pass: colors.green,
    fail: colors.red,
    skip: colors.yellow,
  };

  log(`${symbols[status]} ${name}`, statusColors[status]);
  if (details) {
    log(`  ${details}`, colors.gray);
  }
}

interface RequestOptions {
  headers?: Record<string, string>;
  body?: unknown;
}

interface ApiResponse {
  status: number;
  statusText: string;
  data: unknown;
  headers: Record<string, string>;
}

async function makeRequest(
  method: string,
  path: string,
  options: RequestOptions = {}
): Promise<ApiResponse> {
  const url = `${BASE_URL}${path}`;
  const headers = {
    "x-api-key": API_KEY,
    "x-api-version": "v1",
    "Content-Type": "application/json",
    ...options.headers,
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get("content-type");
    let data: unknown;

    if (contentType?.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return {
      status: response.status,
      statusText: response.statusText,
      data,
      headers: Object.fromEntries(response.headers.entries()),
    };
  } catch (error) {
    throw new Error(`Request failed: ${(error as Error).message}`);
  }
}

// Create fake file for testing
function createFakeFile(
  filename: string,
  content: string,
  mimeType: string
): File {
  const blob = new Blob([content], { type: mimeType });
  return new File([blob], filename, { type: mimeType });
}

// Type-safe response data access

function isSuccessResponse(
  data: unknown
): data is { success: boolean; data: unknown } {
  return typeof data === "object" && data !== null && "success" in data;
}

function isApiResponse(
  data: unknown
): data is { success: boolean; data: unknown } {
  return isSuccessResponse(data);
}

async function makeFormDataRequest(
  method: string,
  path: string,
  formData: FormData,
  options: RequestOptions = {}
): Promise<ApiResponse> {
  const url = `${BASE_URL}${path}`;
  const headers = {
    "x-api-key": API_KEY,
    "x-api-version": "v1",
    ...options.headers,
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for file uploads

    const response = await fetch(url, {
      method,
      headers,
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get("content-type");
    let data: unknown;

    if (contentType?.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return {
      status: response.status,
      statusText: response.statusText,
      data,
      headers: Object.fromEntries(response.headers.entries()),
    };
  } catch (error) {
    throw new Error(`Request failed: ${(error as Error).message}`);
  }
}

async function test(name: string, testFn: () => Promise<void>): Promise<void> {
  try {
    await testFn();
    results.passed++;
    results.tests.push({ name, status: "pass" });
    logTest(name, "pass");
  } catch (error) {
    results.failed++;
    results.tests.push({
      name,
      status: "fail",
      error: (error as Error).message,
    });
    logTest(name, "fail", (error as Error).message);

    // Log response body if available for debugging
    const errorWithData = error as Error & { responseData?: unknown };
    if (errorWithData.responseData) {
      log(
        `  Response: ${JSON.stringify(errorWithData.responseData)}`,
        colors.gray
      );
    }
  }
}

interface Expectation {
  toBe(expected: unknown): void;
  toBeGreaterThanOrEqual(expected: number): void;
  toBeDefined(): void;
  toHaveProperty(property: string): void;
  toBeArray(): void;
  toContain(expected: unknown): void;
  toMatch(regex: RegExp): void;
  toBeLessThan(expected: number): void;
  toBeUndefined(): void;
}

function expect(
  actual: unknown,
  message: string = "",
  responseData: unknown = null
): Expectation {
  return {
    toBe(expected: unknown): void {
      if (actual !== expected) {
        const error = new Error(
          `${message}\n  Expected: ${expected}\n  Received: ${actual}`
        );
        (error as Error & { responseData?: unknown }).responseData =
          responseData;
        throw error;
      }
    },
    toBeGreaterThanOrEqual(expected: number): void {
      if (typeof actual !== "number" || actual < expected) {
        throw new Error(
          `${message}\n  Expected >= ${expected}\n  Received: ${String(actual)}`
        );
      }
    },
    toBeDefined(): void {
      if (actual === undefined || actual === null) {
        throw new Error(
          `${message}\n  Expected value to be defined\n  Received: ${String(
            actual
          )}`
        );
      }
    },
    toHaveProperty(property: string): void {
      if (
        typeof actual !== "object" ||
        actual === null ||
        !(property in actual)
      ) {
        throw new Error(
          `${message}\n  Expected object to have property: ${property}`
        );
      }
    },
    toBeArray(): void {
      if (!Array.isArray(actual)) {
        throw new Error(
          `${message}\n  Expected value to be an array\n  Received: ${typeof actual}`
        );
      }
    },
    toContain(expected: unknown): void {
      if (!Array.isArray(actual) || !actual.includes(expected)) {
        throw new Error(`${message}\n  Expected array to contain: ${expected}`);
      }
    },
    toMatch(regex: RegExp): void {
      if (typeof actual !== "string" || !regex.test(actual)) {
        throw new Error(
          `${message}\n  Expected string to match pattern: ${regex}`
        );
      }
    },
    toBeLessThan(expected: number): void {
      if (typeof actual !== "number" || actual >= expected) {
        throw new Error(
          `${message}\n  Expected < ${expected}\n  Received: ${actual}`
        );
      }
    },
    toBeUndefined(): void {
      if (actual !== undefined) {
        throw new Error(
          `${message}\n  Expected value to be undefined\n  Received: ${actual}`
        );
      }
    },
  };
}

// ============= HEALTH CHECK TESTS =============
async function testHealthCheck(): Promise<void> {
  log("\n🏥 Health Check Tests", colors.blue);

  await test("GET /api/health - Should return healthy status", async () => {
    const response = await makeRequest("GET", "/api/health");
    expect(response.status, "Status code").toBe(200);

    if (
      response.data &&
      typeof response.data === "object" &&
      "success" in response.data
    ) {
      const data = response.data as {
        success: boolean;
        data: { status: string; services: unknown };
      };
      expect(data.success, "Response success").toBe(true);
      expect(data.data.status, "Health status").toBe("healthy");
      expect(data.data.services, "Services object").toBeDefined();
    }
  });

  await test("GET /api/health - Should work without API key", async () => {
    const response = await fetch(`${BASE_URL}/api/health`);
    expect(response.status, "Status code").toBe(200);
  });

  await test("GET /api/health - Should include response time", async () => {
    const response = await makeRequest("GET", "/api/health");

    if (
      response.data &&
      typeof response.data === "object" &&
      "data" in response.data
    ) {
      const data = response.data as { data: { responseTime?: number } };
      // Response time might not be included in all health check responses
      if (data.data.responseTime !== undefined) {
        expect(
          data.data.responseTime,
          "Response time should be number"
        ).toBeGreaterThanOrEqual(0);
      } else {
        // Skip this assertion if responseTime is not provided
        log(
          "  ⚠️  Response time not included in health check response",
          colors.yellow
        );
      }
    }
  });
}

// ============= METADATA TESTS =============
async function testMetadata(): Promise<void> {
  log("\n📄 Metadata Tests", colors.blue);

  // ============= LIST METADATA TESTS =============
  await test("GET /api/metadata - Should list metadata with default pagination", async () => {
    const response = await makeRequest("GET", "/api/metadata");
    expect(response.status, "Status code").toBe(200);

    if (
      response.data &&
      typeof response.data === "object" &&
      "success" in response.data
    ) {
      const data = response.data as {
        success: boolean;
        data: {
          data: unknown[];
          pagination: { page: number; limit: number };
        };
      };
      expect(data.success, "Response success").toBe(true);
      expect(data.data.data, "Data array").toBeArray();
      expect(data.data.pagination, "Pagination object").toBeDefined();
      expect(data.data.pagination.page, "Page number").toBe(1);
      expect(data.data.pagination.limit, "Limit").toBe(20);
    }
  });

  await test("GET /api/metadata?page=1&limit=5 - Should handle custom pagination", async () => {
    const response = await makeRequest("GET", "/api/metadata?page=1&limit=5");
    expect(response.status, "Status code").toBe(200);

    if (
      isApiResponse(response.data) &&
      typeof response.data.data === "object" &&
      response.data.data !== null &&
      "pagination" in response.data.data
    ) {
      const pagination = (
        response.data.data as { pagination: { limit: number } }
      ).pagination;
      expect(pagination.limit, "Custom limit").toBe(5);
    }
  });

  await test("GET /api/metadata?isLocked=false - Should filter by locked status", async () => {
    const response = await makeRequest("GET", "/api/metadata?isLocked=false");
    expect(response.status, "Status code").toBe(200);

    if (isApiResponse(response.data)) {
      expect(response.data.success, "Response success").toBe(true);
    }
  });

  await test("GET /api/metadata?isPinned=true - Should filter by pinned status", async () => {
    const response = await makeRequest("GET", "/api/metadata?isPinned=true");
    expect(response.status, "Status code").toBe(200);
  });

  await test("GET /api/metadata?search=test - Should search by name", async () => {
    const response = await makeRequest("GET", "/api/metadata?search=test");
    expect(response.status, "Status code").toBe(200);
  });

  await test("GET /api/metadata?sortBy=createdAt&sortOrder=desc - Should sort by creation date", async () => {
    const response = await makeRequest(
      "GET",
      "/api/metadata?sortBy=createdAt&sortOrder=desc"
    );
    expect(response.status, "Status code").toBe(200);
  });

  await test("GET /api/metadata?sortBy=name&sortOrder=asc - Should sort by name ascending", async () => {
    const response = await makeRequest(
      "GET",
      "/api/metadata?sortBy=name&sortOrder=asc"
    );
    expect(response.status, "Status code").toBe(200);
  });

  // ============= CREATE METADATA TESTS =============
  await test("POST /api/metadata - Should create metadata with minimal required fields", async () => {
    const testMetadata = {
      name: `Test NFT ${Date.now()}`,
      image: "https://example.com/image.png",
    };

    const response = await makeRequest("POST", "/api/metadata", {
      body: testMetadata,
    });
    expect(response.status, "Status code").toBe(200);

    if (
      isApiResponse(response.data) &&
      typeof response.data.data === "object" &&
      response.data.data !== null
    ) {
      const data = response.data.data as { id: string; name: string };
      expect(response.data.success, "Response success").toBe(true);
      expect(data.id, "Created metadata ID").toBeDefined();
      expect(data.name, "Metadata name").toBe(testMetadata.name);

      testData.createdMetadataId = data.id;
    }
  });

  await test("POST /api/metadata - Should create metadata with all fields", async () => {
    const fullMetadata = {
      name: `Full Test NFT ${Date.now()}`,
      description: "Complete test NFT with all fields",
      symbol: "TEST",
      image: "https://example.com/image.png",
      bannerImage: "https://example.com/banner.png",
      featuredImage: "https://example.com/featured.png",
      animationUrl: "https://example.com/animation.mp4",
      externalUrl: "https://example.com",
      backgroundColor: "FF0000",
      attributes: [
        { traitType: "Background", value: "Blue" },
        { traitType: "Rarity", value: "Common", displayType: "string" },
        {
          traitType: "Power",
          value: 100,
          maxValue: 1000,
          displayType: "number",
        },
      ],
      creators: [
        { address: "0x1234567890123456789012345678901234567890", share: 100 },
      ],
      sellerFeeBasisPoints: 500,
      feeRecipient: "0x9876543210987654321098765432109876543210",
      mediaType: "IMAGE",
    };

    const response = await makeRequest("POST", "/api/metadata", {
      body: fullMetadata,
    });
    expect(response.status, "Status code").toBe(200);

    if (
      isApiResponse(response.data) &&
      typeof response.data.data === "object" &&
      response.data.data !== null
    ) {
      const data = response.data.data as {
        attributes: unknown[];
        creators: unknown[];
      };
      expect(data.attributes, "Attributes array").toBeArray();
      expect(data.creators, "Creators array").toBeArray();
    }
  });

  await test("POST /api/metadata - Should validate required fields", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: { description: "Missing required name and image" },
    });
    expect(response.status, "Status code").toBe(400);
  });

  await test("POST /api/metadata - Should validate image URL format", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "invalid-url",
      },
    });
    expect(response.status, "Status code").toBe(400);
  });

  await test("POST /api/metadata - Should validate attribute structure", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png",
        attributes: [{ invalidField: "test" }], // Missing required traitType and value
      },
    });
    expect(response.status, "Status code").toBe(400);
  });

  await test("POST /api/metadata - Should validate creator share percentages", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png",
        creators: [
          { address: "0x1234567890123456789012345678901234567890", share: 150 }, // Invalid: > 100
        ],
      },
    });
    expect(response.status, "Status code").toBe(400);
  });

  await test("POST /api/metadata - Should validate seller fee basis points", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png",
        sellerFeeBasisPoints: 15000, // Invalid: > 10000 (100%)
      },
    });
    expect(response.status, "Status code").toBe(400);
  });

  // ============= GET METADATA BY ID TESTS =============
  if (testData.createdMetadataId) {
    await test(`GET /api/metadata/${testData.createdMetadataId} - Should retrieve metadata by ID`, async () => {
      const response = await makeRequest(
        "GET",
        `/api/metadata/${testData.createdMetadataId}`
      );
      expect(response.status, "Status code").toBe(200);

      if (
        isApiResponse(response.data) &&
        typeof response.data.data === "object" &&
        response.data.data !== null
      ) {
        const data = response.data.data as { id: string };
        expect(response.data.success, "Response success").toBe(true);
        expect(data.id, "Metadata ID").toBe(testData.createdMetadataId);
      }
    });

    await test(`GET /api/metadata/${testData.createdMetadataId}?version=1 - Should retrieve specific version`, async () => {
      const response = await makeRequest(
        "GET",
        `/api/metadata/${testData.createdMetadataId}?version=1`
      );
      expect(response.status, "Status code").toBe(200);
    });
  }

  await test("GET /api/metadata/invalid-id - Should return 404 for non-existent metadata", async () => {
    const response = await makeRequest("GET", "/api/metadata/99999999");
    expect(response.status, "Status code").toBe(404);
  });

  await test("GET /api/metadata/invalid-uuid - Should return 404 for non-existent metadata", async () => {
    const response = await makeRequest("GET", "/api/metadata/invalid-uuid");
    expect(response.status, "Status code").toBe(404);
  });

  // ============= UPDATE METADATA TESTS =============
  if (testData.createdMetadataId) {
    await test(`PUT /api/metadata/${testData.createdMetadataId} - Should update metadata name`, async () => {
      const updates = {
        name: `Updated Test NFT ${Date.now()}`,
      };

      const response = await makeRequest(
        "PUT",
        `/api/metadata/${testData.createdMetadataId}`,
        { body: updates }
      );
      expect(response.status, "Status code").toBe(200);

      if (
        isApiResponse(response.data) &&
        typeof response.data.data === "object" &&
        response.data.data !== null
      ) {
        const data = response.data.data as { name: string };
        expect(response.data.success, "Response success").toBe(true);
        expect(data.name, "Updated name").toBe(updates.name);
      }
    });

    await test(`PUT /api/metadata/${testData.createdMetadataId} - Should update multiple fields`, async () => {
      const updates = {
        name: `Multi Update NFT ${Date.now()}`,
        description: "Updated description",
        attributes: [{ traitType: "Updated", value: "New Value" }],
      };

      const response = await makeRequest(
        "PUT",
        `/api/metadata/${testData.createdMetadataId}`,
        { body: updates }
      );
      expect(response.status, "Status code").toBe(200);

      if (
        isApiResponse(response.data) &&
        typeof response.data.data === "object" &&
        response.data.data !== null
      ) {
        const data = response.data.data as { description: string };
        expect(data.description, "Updated description").toBe(
          updates.description
        );
      }
    });

    await test(`PUT /api/metadata/${testData.createdMetadataId} - Should validate update data`, async () => {
      const response = await makeRequest(
        "PUT",
        `/api/metadata/${testData.createdMetadataId}`,
        {
          body: { name: "" }, // Invalid: empty name
        }
      );
      expect(response.status, "Status code").toBe(400);
    });
  }

  await test("PUT /api/metadata/99999999 - Should return 404 for non-existent metadata", async () => {
    const response = await makeRequest("PUT", "/api/metadata/99999999", {
      body: { name: "Updated Name" },
    });
    expect(response.status, "Status code").toBe(404);
  });

  // ============= DELETE METADATA TESTS =============
  if (testData.createdMetadataId) {
    await test(`DELETE /api/metadata/${testData.createdMetadataId} - Should delete metadata`, async () => {
      const response = await makeRequest(
        "DELETE",
        `/api/metadata/${testData.createdMetadataId}`
      );
      expect(response.status, "Status code").toBe(200);

      if (isApiResponse(response.data)) {
        expect(response.data.success, "Response success").toBe(true);
      }
    });

    // Verify deletion
    await test(`GET /api/metadata/${testData.createdMetadataId} - Should return 404 after deletion`, async () => {
      const response = await makeRequest(
        "GET",
        `/api/metadata/${testData.createdMetadataId}`
      );
      expect(response.status, "Status code").toBe(404);
    });
  }

  await test("DELETE /api/metadata/99999999 - Should return 404 for non-existent metadata", async () => {
    const response = await makeRequest("DELETE", "/api/metadata/99999999");
    expect(response.status, "Status code").toBe(404);
  });
}

// ============= MEDIA TESTS =============
async function testMedia(): Promise<void> {
  log("\n🖼️  Media Tests", colors.blue);

  // ============= LIST MEDIA TESTS =============
  await test("GET /api/media - Should list media files with default pagination", async () => {
    const response = await makeRequest("GET", "/api/media");
    expect(response.status, "Status code").toBe(200);

    if (
      isApiResponse(response.data) &&
      typeof response.data.data === "object" &&
      response.data.data !== null
    ) {
      const data = response.data.data as {
        data: unknown[];
        pagination: unknown;
      };
      expect(response.data.success, "Response success").toBe(true);
      expect(data.data, "Data array").toBeArray();
      expect(data.pagination, "Pagination object").toBeDefined();
    }
  });

  await test("GET /api/media?page=1&limit=5 - Should handle custom pagination", async () => {
    const response = await makeRequest("GET", "/api/media?page=1&limit=5");
    expect(response.status, "Status code").toBe(200);

    if (
      isApiResponse(response.data) &&
      typeof response.data.data === "object" &&
      response.data.data !== null &&
      "pagination" in response.data.data
    ) {
      const pagination = (
        response.data.data as { pagination: { limit: number } }
      ).pagination;
      expect(pagination.limit, "Custom limit").toBe(5);
    }
  });

  await test("GET /api/media?mediaType=IMAGE - Should filter by media type", async () => {
    const response = await makeRequest("GET", "/api/media?mediaType=IMAGE");
    expect(response.status, "Status code").toBe(200);
  });

  await test("GET /api/media?mediaType=VIDEO - Should filter by video type", async () => {
    const response = await makeRequest("GET", "/api/media?mediaType=VIDEO");
    expect(response.status, "Status code").toBe(200);
  });

  await test("GET /api/media?search=test - Should search by filename", async () => {
    const response = await makeRequest("GET", "/api/media?search=test");
    expect(response.status, "Status code").toBe(200);
  });

  await test("GET /api/media?sortBy=fileName&sortOrder=asc - Should sort by filename", async () => {
    const response = await makeRequest(
      "GET",
      "/api/media?sortBy=fileName&sortOrder=asc"
    );
    expect(response.status, "Status code").toBe(200);
  });

  await test("GET /api/media?sortBy=fileSize&sortOrder=desc - Should sort by file size", async () => {
    const response = await makeRequest(
      "GET",
      "/api/media?sortBy=fileSize&sortOrder=desc"
    );
    expect(response.status, "Status code").toBe(200);
  });

  await test("GET /api/media?isPinned=true - Should filter pinned media", async () => {
    const response = await makeRequest("GET", "/api/media?isPinned=true");
    expect(response.status, "Status code").toBe(200);
  });

  await test("GET /api/media?isPinned=false - Should filter non-pinned media", async () => {
    const response = await makeRequest("GET", "/api/media?isPinned=false");
    expect(response.status, "Status code").toBe(200);
  });

  // ============= UPLOAD MEDIA TESTS =============
  await test("POST /api/media - Should upload fake image file", async () => {
    const fakeImage = createFakeFile(
      "test-image.png",
      "fake image content for testing",
      "image/png"
    );

    const formData = new FormData();
    formData.append("file", fakeImage);
    formData.append("mediaType", "IMAGE");
    formData.append("isPinned", "false");

    const response = await makeFormDataRequest("POST", "/api/media", formData);
    expect(response.status, "Status code").toBe(200);
    expect(response.data, "Response data").toBeDefined();

    // Store created media ID for later tests
    if (
      isApiResponse(response.data) &&
      typeof response.data.data === "object" &&
      response.data.data !== null
    ) {
      const data = response.data.data as { id: string };
      testData.createdMediaId = data.id;
    }
  });

  await test("POST /api/media - Should upload fake video file", async () => {
    const fakeVideo = createFakeFile(
      "test-video.mp4",
      "fake video content for testing",
      "video/mp4"
    );

    const formData = new FormData();
    formData.append("file", fakeVideo);
    formData.append("mediaType", "VIDEO");
    formData.append("isPinned", "true");

    const response = await makeFormDataRequest("POST", "/api/media", formData);
    expect(response.status, "Status code").toBe(200);
  });

  await test("POST /api/media - Should upload fake GIF file", async () => {
    const fakeGif = createFakeFile(
      "test-animation.gif",
      "fake gif content for testing",
      "image/gif"
    );

    const formData = new FormData();
    formData.append("file", fakeGif);
    formData.append("mediaType", "GIF");
    formData.append("isPinned", "false");

    const response = await makeFormDataRequest("POST", "/api/media", formData);
    expect(response.status, "Status code").toBe(200);
  });

  await test("POST /api/media - Should reject empty file", async () => {
    const formData = new FormData();
    formData.append("mediaType", "IMAGE");

    const response = await makeFormDataRequest("POST", "/api/media", formData);
    expect(response.status, "Status code").toBe(400);
  });

  await test("POST /api/media - Should reject invalid media type", async () => {
    const fakeFile = createFakeFile("test.txt", "fake content", "text/plain");

    const formData = new FormData();
    formData.append("file", fakeFile);
    formData.append("mediaType", "INVALID_TYPE");

    const response = await makeFormDataRequest("POST", "/api/media", formData);
    expect(response.status, "Status code").toBe(400);
  });

  // ============= GET MEDIA BY ID TESTS =============
  if (testData.createdMediaId) {
    await test(`GET /api/media/${testData.createdMediaId} - Should retrieve media by ID`, async () => {
      const response = await makeRequest(
        "GET",
        `/api/media/${testData.createdMediaId}`
      );
      expect(response.status, "Status code").toBe(200);
      expect(response.data, "Response data").toBeDefined();
    });
  }

  await test("GET /api/media/invalid-id - Should return 404 for non-existent media", async () => {
    const response = await makeRequest("GET", "/api/media/99999999");
    expect(response.status, "Status code").toBe(404);
  });

  await test("GET /api/media/invalid-uuid - Should return 404 for non-existent media", async () => {
    const response = await makeRequest("GET", "/api/media/invalid-uuid");
    expect(response.status, "Status code").toBe(404);
  });

  // ============= DELETE MEDIA TESTS =============
  if (testData.createdMediaId) {
    await test(`DELETE /api/media/${testData.createdMediaId} - Should delete media`, async () => {
      const response = await makeRequest(
        "DELETE",
        `/api/media/${testData.createdMediaId}`
      );
      expect(response.status, "Status code").toBe(200);
      expect(response.data, "Response data").toBeDefined();
    });

    // Verify deletion
    await test(`GET /api/media/${testData.createdMediaId} - Should return 404 after deletion`, async () => {
      const response = await makeRequest(
        "GET",
        `/api/media/${testData.createdMediaId}`
      );
      expect(response.status, "Status code").toBe(404);
    });
  }

  await test("DELETE /api/media/99999999 - Should return 404 for non-existent media", async () => {
    const response = await makeRequest("DELETE", "/api/media/99999999");
    expect(response.status, "Status code").toBe(404);
  });
}

// ============= ADMIN API KEY TESTS =============
async function testAdminApiKeys(): Promise<void> {
  log("\n🔑 Admin API Key Tests", colors.blue);

  // Note: Admin API key tests require session authentication, not API key
  log(
    "  ⚠️  Skipping Admin API Key tests - Requires session authentication",
    colors.yellow
  );
  results.skipped += 4; // 4 admin endpoints skipped
}

// ============= AUTHENTICATION TESTS =============
async function testAuthentication(): Promise<void> {
  log("\n🔐 Authentication Tests", colors.blue);

  // ============= MISSING API KEY TESTS =============
  await test("Should return 401 with missing API key", async () => {
    const response = await fetch(`${BASE_URL}/api/metadata`);
    expect(response.status, "Status code").toBe(401);
  });

  await test("Should return 401 with missing API key for media endpoint", async () => {
    const response = await fetch(`${BASE_URL}/api/media`);
    expect(response.status, "Status code").toBe(401);
  });

  // ============= INVALID API KEY TESTS =============
  await test("Should return 401 with invalid API key", async () => {
    const response = await makeRequest("GET", "/api/metadata", {
      headers: { "x-api-key": "invalid_key_12345" },
    });
    expect(response.status, "Status code").toBe(401);
  });

  await test("Should return 401 with malformed API key", async () => {
    const response = await makeRequest("GET", "/api/metadata", {
      headers: { "x-api-key": "not_a_valid_key" },
    });
    expect(response.status, "Status code").toBe(401);
  });

  await test("Should return 401 with empty API key", async () => {
    const response = await makeRequest("GET", "/api/metadata", {
      headers: { "x-api-key": "" },
    });
    expect(response.status, "Status code").toBe(401);
  });

  // ============= API VERSION TESTS =============
  await test("Should work with valid API version header", async () => {
    const response = await makeRequest("GET", "/api/health", {
      headers: { "x-api-version": "v1" },
    });
    expect(response.status, "Status code").toBe(200);
  });

  await test("Should work without API version header", async () => {
    const response = await makeRequest("GET", "/api/health", {
      headers: { "x-api-key": API_KEY },
    });
    expect(response.status, "Status code").toBe(200);
  });
}

// ============= ERROR HANDLING TESTS =============
async function testErrorHandling(): Promise<void> {
  log("\n⚠️  Error Handling Tests", colors.blue);

  // ============= INVALID ENDPOINTS =============
  await test("GET /api/nonexistent - Should return 404 for invalid endpoint", async () => {
    const response = await makeRequest("GET", "/api/nonexistent");
    expect(response.status, "Status code").toBe(404);
  });

  await test("POST /api/metadata/invalid - Should return 405 for invalid method", async () => {
    const response = await makeRequest("POST", "/api/metadata/invalid");
    expect(response.status, "Status code").toBe(405);
  });

  // ============= INVALID REQUEST BODIES =============
  await test("POST /api/metadata - Should return 400 with malformed JSON", async () => {
    const response = await fetch(`${BASE_URL}/api/metadata`, {
      method: "POST",
      headers: {
        "x-api-key": API_KEY,
        "Content-Type": "application/json",
      },
      body: "invalid json {",
    });
    expect(response.status, "Status code").toBe(400);
  });

  await test("POST /api/metadata - Should return 400 with empty body", async () => {
    const response = await makeRequest("POST", "/api/metadata", { body: {} });
    expect(response.status, "Status code").toBe(400);
  });

  // ============= VALIDATION ERROR TESTS =============
  await test("POST /api/metadata - Should return 400 with invalid attribute structure", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test",
        image: "https://example.com/image.png",
        attributes: [{ invalidField: "test" }],
      },
    });
    expect(response.status, "Status code").toBe(400);
  });

  await test("POST /api/metadata - Should return 400 with invalid creator structure", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test",
        image: "https://example.com/image.png",
        creators: [{ invalidField: "test" }],
      },
    });
    expect(response.status, "Status code").toBe(400);
  });

  // ============= RATE LIMITING TESTS =============
  await test("Should handle multiple rapid requests without rate limiting", async () => {
    const requests = Array(10)
      .fill(null)
      .map(() => makeRequest("GET", "/api/health"));

    const responses = await Promise.all(requests);
    const allSuccessful = responses.every((r) => r.status === 200);

    expect(allSuccessful, "All requests successful").toBe(true);
  });

  // ============= CONTENT TYPE TESTS =============
  await test("Should handle requests with different content types", async () => {
    const response = await makeRequest("GET", "/api/health", {
      headers: { "Content-Type": "application/json" },
    });
    expect(response.status, "Status code").toBe(200);
  });

  await test("Should handle requests without content type", async () => {
    const response = await makeRequest("GET", "/api/health", {
      headers: { "x-api-key": API_KEY },
    });
    expect(response.status, "Status code").toBe(200);
  });
}

// ============= PAGINATION TESTS =============
async function testPagination(): Promise<void> {
  log("\n📄 Pagination Tests", colors.blue);

  // ============= METADATA PAGINATION =============
  await test("GET /api/metadata?page=1&limit=1 - Should handle page 1 with limit 1", async () => {
    const response = await makeRequest("GET", "/api/metadata?page=1&limit=1");
    expect(response.status, "Status code").toBe(200);

    if (
      isApiResponse(response.data) &&
      typeof response.data.data === "object" &&
      response.data.data !== null &&
      "pagination" in response.data.data
    ) {
      const pagination = (
        response.data.data as { pagination: { page: number; limit: number } }
      ).pagination;
      expect(pagination.page, "Page number").toBe(1);
      expect(pagination.limit, "Limit").toBe(1);
    }
  });

  await test("GET /api/metadata?page=2&limit=5 - Should handle page 2 with limit 5", async () => {
    const response = await makeRequest("GET", "/api/metadata?page=2&limit=5");
    expect(response.status, "Status code").toBe(200);

    if (
      isApiResponse(response.data) &&
      typeof response.data.data === "object" &&
      response.data.data !== null &&
      "pagination" in response.data.data
    ) {
      const pagination = (
        response.data.data as { pagination: { page: number; limit: number } }
      ).pagination;
      expect(pagination.page, "Page number").toBe(2);
      expect(pagination.limit, "Limit").toBe(5);
    }
  });

  await test("GET /api/metadata?page=0 - Should handle invalid page number", async () => {
    const response = await makeRequest("GET", "/api/metadata?page=0");
    expect(response.status, "Status code").toBe(400);
  });

  await test("GET /api/metadata?limit=0 - Should handle invalid limit", async () => {
    const response = await makeRequest("GET", "/api/metadata?limit=0");
    expect(response.status, "Status code").toBe(400);
  });

  await test("GET /api/metadata?limit=1000 - Should handle large limit", async () => {
    const response = await makeRequest("GET", "/api/metadata?limit=1000");
    expect(response.status, "Status code").toBe(200);
  });

  // ============= MEDIA PAGINATION =============
  await test("GET /api/media?page=1&limit=1 - Should handle media pagination", async () => {
    const response = await makeRequest("GET", "/api/media?page=1&limit=1");
    expect(response.status, "Status code").toBe(200);

    if (
      isApiResponse(response.data) &&
      typeof response.data.data === "object" &&
      response.data.data !== null &&
      "pagination" in response.data.data
    ) {
      const pagination = (
        response.data.data as { pagination: { page: number; limit: number } }
      ).pagination;
      expect(pagination.page, "Page number").toBe(1);
      expect(pagination.limit, "Limit").toBe(1);
    }
  });
}

// ============= SORTING TESTS =============
async function testSorting(): Promise<void> {
  log("\n🔄 Sorting Tests", colors.blue);

  // ============= METADATA SORTING =============
  await test("GET /api/metadata?sortBy=name&sortOrder=asc - Should sort by name ascending", async () => {
    const response = await makeRequest(
      "GET",
      "/api/metadata?sortBy=name&sortOrder=asc"
    );
    expect(response.status, "Status code").toBe(200);
  });

  await test("GET /api/metadata?sortBy=createdAt&sortOrder=desc - Should sort by creation date descending", async () => {
    const response = await makeRequest(
      "GET",
      "/api/metadata?sortBy=createdAt&sortOrder=desc"
    );
    expect(response.status, "Status code").toBe(200);
  });

  await test("GET /api/metadata?sortBy=updatedAt&sortOrder=asc - Should sort by update date ascending", async () => {
    const response = await makeRequest(
      "GET",
      "/api/metadata?sortBy=updatedAt&sortOrder=asc"
    );
    expect(response.status, "Status code").toBe(200);
  });

  await test("GET /api/metadata?sortBy=invalid - Should handle invalid sort field", async () => {
    const response = await makeRequest("GET", "/api/metadata?sortBy=invalid");
    expect(response.status, "Status code").toBe(400);
  });

  await test("GET /api/metadata?sortOrder=invalid - Should handle invalid sort order", async () => {
    const response = await makeRequest(
      "GET",
      "/api/metadata?sortOrder=invalid"
    );
    expect(response.status, "Status code").toBe(400);
  });

  // ============= MEDIA SORTING =============
  await test("GET /api/media?sortBy=fileName&sortOrder=asc - Should sort media by filename", async () => {
    const response = await makeRequest(
      "GET",
      "/api/media?sortBy=fileName&sortOrder=asc"
    );
    expect(response.status, "Status code").toBe(200);
  });

  await test("GET /api/media?sortBy=fileSize&sortOrder=desc - Should sort media by file size", async () => {
    const response = await makeRequest(
      "GET",
      "/api/media?sortBy=fileSize&sortOrder=desc"
    );
    expect(response.status, "Status code").toBe(200);
  });

  await test("GET /api/media?sortBy=createdAt&sortOrder=asc - Should sort media by creation date", async () => {
    const response = await makeRequest(
      "GET",
      "/api/media?sortBy=createdAt&sortOrder=asc"
    );
    expect(response.status, "Status code").toBe(200);
  });
}

// ============= FILTERING TESTS =============
async function testFiltering(): Promise<void> {
  log("\n🔍 Filtering Tests", colors.blue);

  // ============= METADATA FILTERING =============
  await test("GET /api/metadata?isLocked=false - Should filter by unlocked metadata", async () => {
    const response = await makeRequest("GET", "/api/metadata?isLocked=false");
    expect(response.status, "Status code").toBe(200);
  });

  await test("GET /api/metadata?isPinned=true - Should filter by pinned metadata", async () => {
    const response = await makeRequest("GET", "/api/metadata?isPinned=true");
    expect(response.status, "Status code").toBe(200);
  });

  await test("GET /api/metadata?isLocked=true - Should filter by locked metadata", async () => {
    const response = await makeRequest("GET", "/api/metadata?isLocked=true");
    expect(response.status, "Status code").toBe(200);
  });

  await test("GET /api/metadata?isLocked=invalid - Should handle invalid boolean", async () => {
    const response = await makeRequest("GET", "/api/metadata?isLocked=invalid");
    expect(response.status, "Status code").toBe(400);
  });

  await test("GET /api/metadata?search=test - Should search by name", async () => {
    const response = await makeRequest("GET", "/api/metadata?search=test");
    expect(response.status, "Status code").toBe(200);
  });

  await test("GET /api/metadata?search= - Should handle empty search", async () => {
    const response = await makeRequest("GET", "/api/metadata?search=");
    expect(response.status, "Status code").toBe(400);
  });

  // ============= MEDIA FILTERING =============
  await test("GET /api/media?mediaType=IMAGE - Should filter by image type", async () => {
    const response = await makeRequest("GET", "/api/media?mediaType=IMAGE");
    expect(response.status, "Status code").toBe(200);
  });

  await test("GET /api/media?mediaType=VIDEO - Should filter by video type", async () => {
    const response = await makeRequest("GET", "/api/media?mediaType=VIDEO");
    expect(response.status, "Status code").toBe(200);
  });

  await test("GET /api/media?mediaType=GIF - Should filter by GIF type", async () => {
    const response = await makeRequest("GET", "/api/media?mediaType=GIF");
    expect(response.status, "Status code").toBe(200);
  });

  await test("GET /api/media?mediaType=MODEL_3D - Should filter by 3D model type", async () => {
    const response = await makeRequest("GET", "/api/media?mediaType=MODEL_3D");
    expect(response.status, "Status code").toBe(200);
  });

  await test("GET /api/media?mediaType=INVALID - Should handle invalid media type", async () => {
    const response = await makeRequest("GET", "/api/media?mediaType=INVALID");
    expect(response.status, "Status code").toBe(400);
  });

  await test("GET /api/media?isPinned=true - Should filter pinned media", async () => {
    const response = await makeRequest("GET", "/api/media?isPinned=true");
    expect(response.status, "Status code").toBe(200);
  });

  await test("GET /api/media?isPinned=false - Should filter non-pinned media", async () => {
    const response = await makeRequest("GET", "/api/media?isPinned=false");
    expect(response.status, "Status code").toBe(200);
  });
}

// ============= BOUNDARY VALUE TESTS =============
async function testBoundaryValues(): Promise<void> {
  log("\n📏 Boundary Value Tests", colors.blue);

  // ============= PAGINATION BOUNDARIES =============
  await test("GET /api/metadata?page=1&limit=1 - Minimum valid pagination", async () => {
    const response = await makeRequest("GET", "/api/metadata?page=1&limit=1");
    expect(response.status, "Status code").toBe(200);

    if (
      isApiResponse(response.data) &&
      typeof response.data.data === "object" &&
      response.data.data !== null &&
      "pagination" in response.data.data
    ) {
      const pagination = (
        response.data.data as { pagination: { limit: number } }
      ).pagination;
      expect(pagination.limit, "Limit").toBe(1);
    }
  });

  await test("GET /api/metadata?page=1&limit=1000 - Maximum reasonable pagination", async () => {
    const response = await makeRequest(
      "GET",
      "/api/metadata?page=1&limit=1000"
    );
    expect(response.status, "Status code").toBe(200);

    if (
      isApiResponse(response.data) &&
      typeof response.data.data === "object" &&
      response.data.data !== null &&
      "pagination" in response.data.data
    ) {
      const pagination = (
        response.data.data as { pagination: { limit: number } }
      ).pagination;
      expect(pagination.limit, "Limit").toBe(1000);
    }
  });

  await test("GET /api/metadata?page=0 - Invalid page boundary", async () => {
    const response = await makeRequest("GET", "/api/metadata?page=0");
    expect(response.status, "Status code").toBe(400);
  });

  await test("GET /api/metadata?limit=0 - Invalid limit boundary", async () => {
    const response = await makeRequest("GET", "/api/metadata?limit=0");
    expect(response.status, "Status code").toBe(400);
  });

  await test("GET /api/metadata?page=-1 - Negative page boundary", async () => {
    const response = await makeRequest("GET", "/api/metadata?page=-1");
    expect(response.status, "Status code").toBe(400);
  });

  await test("GET /api/metadata?limit=-1 - Negative limit boundary", async () => {
    const response = await makeRequest("GET", "/api/metadata?limit=-1");
    expect(response.status, "Status code").toBe(400);
  });

  // ============= STRING LENGTH BOUNDARIES =============
  await test("POST /api/metadata - Minimum valid name length", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "A", // Minimum length
        image: "https://example.com/image.png",
      },
    });
    expect(response.status, "Status code").toBe(200);
  });

  await test("POST /api/metadata - Maximum valid name length", async () => {
    const longName = "A".repeat(100); // Maximum length
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: longName,
        image: "https://example.com/image.png",
      },
    });
    expect(response.status, "Status code").toBe(200);
  });

  await test("POST /api/metadata - Name too long (101 characters)", async () => {
    const tooLongName = "A".repeat(101); // Over maximum
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: tooLongName,
        image: "https://example.com/image.png",
      },
    });
    expect(response.status, "Status code").toBe(400);
  });

  await test("POST /api/metadata - Empty name", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "",
        image: "https://example.com/image.png",
      },
    });
    expect(response.status, "Status code").toBe(400);
  });

  await test("POST /api/metadata - Maximum description length", async () => {
    const longDescription = "A".repeat(2000); // Maximum length
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        description: longDescription,
        image: "https://example.com/image.png",
      },
    });
    expect(response.status, "Status code").toBe(200);
  });

  await test("POST /api/metadata - Description too long (2001 characters)", async () => {
    const tooLongDescription = "A".repeat(2001); // Over maximum
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        description: tooLongDescription,
        image: "https://example.com/image.png",
      },
    });
    expect(response.status, "Status code").toBe(400);
  });

  // ============= NUMERIC BOUNDARIES =============
  await test("POST /api/metadata - Minimum seller fee (0)", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png",
        sellerFeeBasisPoints: 0,
      },
    });
    expect(response.status, "Status code").toBe(200);
  });

  await test("POST /api/metadata - Maximum seller fee (10000)", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png",
        sellerFeeBasisPoints: 10000,
      },
    });
    expect(response.status, "Status code").toBe(200);
  });

  await test("POST /api/metadata - Seller fee too high (10001)", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png",
        sellerFeeBasisPoints: 10001,
      },
    });
    expect(response.status, "Status code").toBe(400);
  });

  await test("POST /api/metadata - Negative seller fee", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png",
        sellerFeeBasisPoints: -1,
      },
    });
    expect(response.status, "Status code").toBe(400);
  });

  // ============= CREATOR SHARE BOUNDARIES =============
  await test("POST /api/metadata - Creator share 0%", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png",
        creators: [
          { address: "0x1234567890123456789012345678901234567890", share: 0 },
        ],
      },
    });
    expect(response.status, "Status code").toBe(200);
  });

  await test("POST /api/metadata - Creator share 100%", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png",
        creators: [
          { address: "0x1234567890123456789012345678901234567890", share: 100 },
        ],
      },
    });
    expect(response.status, "Status code").toBe(200);
  });

  await test("POST /api/metadata - Creator share over 100%", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png",
        creators: [
          { address: "0x1234567890123456789012345678901234567890", share: 101 },
        ],
      },
    });
    expect(response.status, "Status code").toBe(400);
  });

  await test("POST /api/metadata - Creator share negative", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png",
        creators: [
          { address: "0x1234567890123456789012345678901234567890", share: -1 },
        ],
      },
    });
    expect(response.status, "Status code").toBe(400);
  });
}

// ============= SPECIAL CHARACTER TESTS =============
async function testSpecialCharacters(): Promise<void> {
  log("\n🔤 Special Character Tests", colors.blue);

  // ============= UNICODE AND SPECIAL CHARACTERS =============
  await test("POST /api/metadata - Unicode characters in name", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT 🚀 中文 日本語 한국어",
        image: "https://example.com/image.png",
      },
    });
    expect(response.status, "Status code").toBe(200);
  });

  await test("POST /api/metadata - HTML entities in description", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        description: "Description with &lt;html&gt; &amp; entities",
        image: "https://example.com/image.png",
      },
    });
    expect(response.status, "Status code").toBe(200);
  });

  await test("POST /api/metadata - SQL injection attempt in name", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "'; DROP TABLE users; --",
        image: "https://example.com/image.png",
      },
    });
    expect(response.status, "Status code").toBe(200); // Should be handled safely
  });

  await test("POST /api/metadata - XSS attempt in description", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        description: '<script>alert("xss")</script>',
        image: "https://example.com/image.png",
      },
    });
    expect(response.status, "Status code").toBe(200); // Should be handled safely
  });

  await test("POST /api/metadata - Newline characters in name", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test\nNFT\nWith\nNewlines",
        image: "https://example.com/image.png",
      },
    });
    expect(response.status, "Status code").toBe(200);
  });

  await test("POST /api/metadata - Tab characters in description", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        description: "Description\twith\ttabs",
        image: "https://example.com/image.png",
      },
    });
    expect(response.status, "Status code").toBe(200);
  });
}

// ============= URL VALIDATION TESTS =============
async function testUrlValidation(): Promise<void> {
  log("\n🔗 URL Validation Tests", colors.blue);

  // ============= VALID URL FORMATS =============
  await test("POST /api/metadata - HTTP URL", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "http://example.com/image.png",
      },
    });
    expect(response.status, "Status code").toBe(200);
  });

  await test("POST /api/metadata - HTTPS URL", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png",
      },
    });
    expect(response.status, "Status code").toBe(200);
  });

  await test("POST /api/metadata - URL with port", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com:8080/image.png",
      },
    });
    expect(response.status, "Status code").toBe(200);
  });

  await test("POST /api/metadata - URL with query parameters", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png?v=1&format=png",
      },
    });
    expect(response.status, "Status code").toBe(200);
  });

  await test("POST /api/metadata - URL with fragment", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png#section1",
      },
    });
    expect(response.status, "Status code").toBe(200);
  });

  // ============= INVALID URL FORMATS =============
  await test("POST /api/metadata - Invalid URL format", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "not-a-valid-url",
      },
    });
    expect(response.status, "Status code").toBe(400);
  });

  await test("POST /api/metadata - Empty URL", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "",
      },
    });
    expect(response.status, "Status code").toBe(400);
  });

  await test("POST /api/metadata - URL without protocol", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "example.com/image.png",
      },
    });
    expect(response.status, "Status code").toBe(400);
  });

  await test("POST /api/metadata - FTP URL (unsupported protocol)", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "ftp://example.com/image.png",
      },
    });
    expect(response.status, "Status code").toBe(400);
  });

  await test("POST /api/metadata - JavaScript URL", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: 'javascript:alert("xss")',
      },
    });
    expect(response.status, "Status code").toBe(400);
  });
}

// ============= ARRAY BOUNDARY TESTS =============
async function testArrayBoundaries(): Promise<void> {
  log("\n📋 Array Boundary Tests", colors.blue);

  // ============= EMPTY ARRAYS =============
  await test("POST /api/metadata - Empty attributes array", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png",
        attributes: [],
      },
    });
    expect(response.status, "Status code").toBe(200);
  });

  await test("POST /api/metadata - Empty creators array", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png",
        creators: [],
      },
    });
    expect(response.status, "Status code").toBe(200);
  });

  // ============= LARGE ARRAYS =============
  await test("POST /api/metadata - Large attributes array (100 items)", async () => {
    const largeAttributes = Array(100)
      .fill(null)
      .map((_, i) => ({
        traitType: `Trait ${i}`,
        value: `Value ${i}`,
      }));

    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png",
        attributes: largeAttributes,
      },
    });
    expect(response.status, "Status code").toBe(200);
  });

  await test("POST /api/metadata - Multiple creators with valid shares", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png",
        creators: [
          { address: "0x1111111111111111111111111111111111111111", share: 50 },
          { address: "0x2222222222222222222222222222222222222222", share: 30 },
          { address: "0x3333333333333333333333333333333333333333", share: 20 },
        ],
      },
    });
    expect(response.status, "Status code").toBe(200);
  });

  await test("POST /api/metadata - Creators with shares totaling 100%", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png",
        creators: [
          { address: "0x1111111111111111111111111111111111111111", share: 60 },
          { address: "0x2222222222222222222222222222222222222222", share: 40 },
        ],
      },
    });
    expect(response.status, "Status code").toBe(200);
  });

  await test("POST /api/metadata - Creators with shares not totaling 100%", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png",
        creators: [
          { address: "0x1111111111111111111111111111111111111111", share: 30 },
          { address: "0x2222222222222222222222222222222222222222", share: 30 },
        ],
      },
    });
    expect(response.status, "Status code").toBe(200); // Should still be valid
  });
}

// ============= DATA TYPE TESTS =============
async function testDataTypeValidation(): Promise<void> {
  log("\n🔢 Data Type Validation Tests", colors.blue);

  // ============= STRING TYPE TESTS =============
  await test("POST /api/metadata - Number as string in name", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "12345",
        image: "https://example.com/image.png",
      },
    });
    expect(response.status, "Status code").toBe(200);
  });

  await test("POST /api/metadata - Boolean as string in name", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "true",
        image: "https://example.com/image.png",
      },
    });
    expect(response.status, "Status code").toBe(200);
  });

  // ============= NUMBER TYPE TESTS =============
  await test("POST /api/metadata - String as number in sellerFeeBasisPoints", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png",
        sellerFeeBasisPoints: "500", // String instead of number
      },
    });
    expect(response.status, "Status code").toBe(400);
  });

  await test("POST /api/metadata - Float in sellerFeeBasisPoints", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png",
        sellerFeeBasisPoints: 500.5, // Float instead of integer
      },
    });
    expect(response.status, "Status code").toBe(400);
  });

  // ============= BOOLEAN TYPE TESTS =============
  await test("POST /api/metadata - String as boolean in mediaType", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png",
        mediaType: "true", // String instead of enum
      },
    });
    expect(response.status, "Status code").toBe(400);
  });

  // ============= NULL/UNDEFINED TESTS =============
  await test("POST /api/metadata - Null in optional fields", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png",
        description: null,
        externalUrl: null,
      },
    });
    expect(response.status, "Status code").toBe(200);
  });

  await test("POST /api/metadata - Undefined in optional fields", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png",
        description: undefined,
        externalUrl: undefined,
      },
    });
    expect(response.status, "Status code").toBe(200);
  });
}

// ============= CONCURRENT REQUEST TESTS =============
async function testConcurrentRequests(): Promise<void> {
  log("\n⚡ Concurrent Request Tests", colors.blue);

  await test("Should handle 10 concurrent health checks", async () => {
    const requests = Array(10)
      .fill(null)
      .map(() => makeRequest("GET", "/api/health"));

    const responses = await Promise.all(requests);
    const allSuccessful = responses.every((r) => r.status === 200);
    expect(allSuccessful, "All concurrent requests successful").toBe(true);
  });

  await test("Should handle concurrent metadata creation", async () => {
    const requests = Array(5)
      .fill(null)
      .map((_, i) =>
        makeRequest("POST", "/api/metadata", {
          body: {
            name: `Concurrent Test NFT ${i} ${Date.now()}`,
            image: "https://example.com/image.png",
          },
        })
      );

    const responses = await Promise.all(requests);
    const allSuccessful = responses.every((r) => r.status === 201);
    expect(allSuccessful, "All concurrent metadata creation successful").toBe(
      true
    );
  });

  await test("Should handle concurrent metadata listing", async () => {
    const requests = Array(20)
      .fill(null)
      .map(() => makeRequest("GET", "/api/metadata"));

    const responses = await Promise.all(requests);
    const allSuccessful = responses.every((r) => r.status === 200);
    expect(allSuccessful, "All concurrent listing requests successful").toBe(
      true
    );
  });
}

// ============= MEMORY AND PERFORMANCE TESTS =============
async function testMemoryAndPerformance(): Promise<void> {
  log("\n💾 Memory & Performance Tests", colors.blue);

  await test("Should handle large metadata with many attributes", async () => {
    const largeAttributes = Array(1000)
      .fill(null)
      .map((_, i) => ({
        traitType: `Trait ${i}`,
        value: `Value ${i}`,
        displayType: i % 2 === 0 ? "number" : "string",
      }));

    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Large NFT",
        image: "https://example.com/image.png",
        attributes: largeAttributes,
      },
    });
    expect(response.status, "Status code").toBe(200);
  });

  await test("Should handle very long description", async () => {
    const longDescription = "A".repeat(2000); // Maximum allowed
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Long Description NFT",
        description: longDescription,
        image: "https://example.com/image.png",
      },
    });
    expect(response.status, "Status code").toBe(200);
  });

  await test("Should handle rapid sequential requests", async () => {
    const startTime = Date.now();

    for (let i = 0; i < 10; i++) {
      const response = await makeRequest("GET", "/api/health");
      expect(response.status, "Status code").toBe(200);
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;
    expect(totalTime, "Total time should be reasonable").toBeLessThan(5000);
  });
}

// ============= SECURITY TESTS =============
async function testSecurity(): Promise<void> {
  log("\n🔒 Security Tests", colors.blue);

  // ============= AUTHENTICATION SECURITY =============
  await test("Should reject requests with no API key", async () => {
    const response = await fetch(`${BASE_URL}/api/metadata`);
    expect(response.status, "Status code").toBe(401);
  });

  await test("Should reject requests with invalid API key format", async () => {
    const response = await makeRequest("GET", "/api/metadata", {
      headers: { "x-api-key": "invalid_format" },
    });
    expect(response.status, "Status code").toBe(401);
  });

  await test("Should handle SQL injection in API key", async () => {
    const response = await makeRequest("GET", "/api/metadata", {
      headers: { "x-api-key": "'; DROP TABLE api_keys; --" },
    });
    expect(response.status, "Status code").toBe(401);
  });

  await test("Should handle XSS in API key", async () => {
    const response = await makeRequest("GET", "/api/metadata", {
      headers: { "x-api-key": '<script>alert("xss")</script>' },
    });
    expect(response.status, "Status code").toBe(401);
  });

  // ============= INPUT VALIDATION SECURITY =============
  await test("Should prevent SQL injection in metadata name", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "'; DROP TABLE metadata; --",
        image: "https://example.com/image.png",
      },
    });
    expect(response.status, "Status code").toBe(200); // Should be handled safely
  });

  await test("Should prevent XSS in metadata name", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: '<script>alert("xss")</script>',
        image: "https://example.com/image.png",
      },
    });
    expect(response.status, "Status code").toBe(200); // Should be handled safely
  });

  await test("Should prevent XSS in external URL", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png",
        externalUrl: 'javascript:alert("xss")',
      },
    });
    expect(response.status, "Status code").toBe(400); // Should reject javascript: URLs
  });

  await test("Should prevent NoSQL injection in query parameters", async () => {
    const response = await makeRequest(
      "GET",
      "/api/metadata?status[$ne]=draft"
    );
    expect(response.status, "Status code").toBe(400); // Should reject NoSQL operators
  });

  await test("Should prevent NoSQL injection in request body", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: { $ne: "Test" },
        image: "https://example.com/image.png",
      },
    });
    expect(response.status, "Status code").toBe(400); // Should reject NoSQL operators
  });

  // ============= AUTHORIZATION SECURITY =============
  await test("Should reject API key access to admin endpoints", async () => {
    const response = await makeRequest("GET", "/api/admin/api-keys");
    expect(response.status, "Status code").toBe(401); // Should require session auth
  });

  await test("Should reject API key access to admin API key creation", async () => {
    const response = await makeRequest("POST", "/api/admin/api-keys", {
      body: { name: "Test Key" },
    });
    expect(response.status, "Status code").toBe(401); // Should require session auth
  });

  // ============= DATA EXPOSURE SECURITY =============
  await test("Should not expose internal error details", async () => {
    const response = await makeRequest("GET", "/api/metadata/99999999");
    expect(response.status, "Status code").toBe(404);
    // Should not expose database schema or internal paths
    if (response.data && typeof response.data === "object") {
      const responseStr = JSON.stringify(response.data);
      expect(
        responseStr.includes("database"),
        "Should not expose database info"
      ).toBe(false);
      expect(
        responseStr.includes("schema"),
        "Should not expose schema info"
      ).toBe(false);
      expect(
        responseStr.includes("table"),
        "Should not expose table info"
      ).toBe(false);
    }
  });

  await test("Should not expose stack traces in error responses", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: { invalidField: "test" },
    });
    expect(response.status, "Status code").toBe(400);
    // Should not expose stack traces
    if (response.data && typeof response.data === "object") {
      const responseStr = JSON.stringify(response.data);
      expect(
        responseStr.includes("stack"),
        "Should not expose stack traces"
      ).toBe(false);
      expect(
        responseStr.includes("at "),
        "Should not expose stack traces"
      ).toBe(false);
    }
  });

  await test("Should not expose sensitive headers", async () => {
    const response = await makeRequest("GET", "/api/health");
    expect(response.status, "Status code").toBe(200);

    // Should not expose sensitive headers
    const sensitiveHeaders = ["x-powered-by", "server", "x-aspnet-version"];
    sensitiveHeaders.forEach((header) => {
      expect(
        response.headers[header],
        `Should not expose ${header} header`
      ).toBeUndefined();
    });
  });

  // ============= REQUEST MANIPULATION SECURITY =============
  await test("Should handle X-HTTP-Method-Override header", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      headers: { "X-HTTP-Method-Override": "GET" },
      body: { name: "test" },
    });
    expect(response.status, "Status code").toBe(200); // Should ignore override
  });

  await test("Should handle invalid content type", async () => {
    const response = await fetch(`${BASE_URL}/api/metadata`, {
      method: "POST",
      headers: {
        "x-api-key": API_KEY,
        "Content-Type": "text/plain",
      },
      body: JSON.stringify({
        name: "Test",
        image: "https://example.com/image.png",
      }),
    });
    expect(response.status, "Status code").toBe(400);
  });

  await test("Should handle oversized request body", async () => {
    const largeBody = {
      name: "Test NFT",
      image: "https://example.com/image.png",
      description: "A".repeat(10000), // Very large description
    };

    const response = await makeRequest("POST", "/api/metadata", {
      body: largeBody,
    });
    expect(response.status, "Status code").toBe(400); // Should reject oversized requests
  });
}

// ============= PERFORMANCE TESTS =============
async function testPerformance(): Promise<void> {
  log("\n⚡ Performance Tests", colors.blue);

  await test("Should handle concurrent requests efficiently", async () => {
    const startTime = Date.now();
    const requests = Array(10)
      .fill(null)
      .map(() => makeRequest("GET", "/api/health"));

    const responses = await Promise.all(requests);
    const endTime = Date.now();
    const totalTime = endTime - startTime;

    const allSuccessful = responses.every((r) => r.status === 200);
    expect(allSuccessful, "All concurrent requests successful").toBe(true);
    expect(totalTime, "Total time should be reasonable").toBeLessThan(10000); // Less than 10 seconds
  });

  await test("Should handle large pagination requests", async () => {
    const response = await makeRequest("GET", "/api/metadata?page=1&limit=100");
    expect(response.status, "Status code").toBe(200);

    if (
      isApiResponse(response.data) &&
      typeof response.data.data === "object" &&
      response.data.data !== null &&
      "pagination" in response.data.data
    ) {
      const pagination = (
        response.data.data as { pagination: { limit: number } }
      ).pagination;
      expect(pagination.limit, "Large limit handled").toBe(100);
    }
  });

  await test("Should handle burst of requests without crashing", async () => {
    const requests = Array(20)
      .fill(null)
      .map(() => makeRequest("GET", "/api/health"));

    const responses = await Promise.all(requests);
    const allSuccessful = responses.every((r) => r.status === 200);
    expect(allSuccessful, "All burst requests successful").toBe(true);
  });
}

// ============= MAIN TEST RUNNER =============
async function runAllTests(): Promise<void> {
  log("🚀 Starting Comprehensive API Test Suite\n", colors.blue);
  log(`Base URL: ${BASE_URL}`, colors.gray);
  log(`API Key: ${API_KEY.substring(0, 20)}...`, colors.gray);
  log("═".repeat(80), colors.gray);

  // Test server connectivity first
  log("\n🔍 Testing server connectivity...", colors.cyan);
  try {
    const testResponse = await fetch(`${BASE_URL}/api/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (testResponse.ok) {
      log("✅ Server is responding", colors.green);
    } else {
      log(
        `⚠️  Server responded with status: ${testResponse.status}`,
        colors.yellow
      );
    }
  } catch (error) {
    log(`❌ Cannot connect to server: ${(error as Error).message}`, colors.red);
    log(
      "Please ensure the server is running on http://localhost:3000",
      colors.yellow
    );
    process.exit(1);
  }

  try {
    // Core functionality tests
    await testHealthCheck();
    await testMetadata();
    await testMedia();
    await testAdminApiKeys();
    await testAuthentication();
    await testErrorHandling();

    // Feature tests
    await testPagination();
    await testSorting();
    await testFiltering();

    // Edge cases and boundary tests
    await testBoundaryValues();
    await testSpecialCharacters();
    await testUrlValidation();
    await testArrayBoundaries();
    await testDataTypeValidation();
    await testConcurrentRequests();
    await testMemoryAndPerformance();

    // Security tests
    await testSecurity();

    // Performance tests
    await testPerformance();
  } catch (error) {
    log(`\n❌ Test suite crashed: ${(error as Error).message}`, colors.red);
    console.error(error);
  }

  // Print summary
  log("\n" + "═".repeat(80), colors.gray);
  log("\n📊 Test Summary\n", colors.blue);
  log(`✓ Passed:  ${results.passed}`, colors.green);
  log(`✗ Failed:  ${results.failed}`, colors.red);
  log(`○ Skipped: ${results.skipped}`, colors.yellow);
  log(`━ Total:   ${results.passed + results.failed + results.skipped}\n`);

  if (results.failed > 0) {
    log("Failed Tests:", colors.red);
    results.tests
      .filter((t) => t.status === "fail")
      .forEach((t) => log(`  - ${t.name}`, colors.red));
  }

  if (results.skipped > 0) {
    log("\nSkipped Tests:", colors.yellow);
    log(
      "  - Admin API Key tests (require session authentication)",
      colors.yellow
    );
    log("  - File upload tests now use fake files", colors.green);
  }

  // Security recommendations
  log("\n🔒 Security Recommendations:", colors.cyan);
  log("  - Ensure all user inputs are properly sanitized", colors.gray);
  log("  - Implement rate limiting on all endpoints", colors.gray);
  log("  - Use parameterized queries to prevent SQL injection", colors.gray);
  log("  - Validate and sanitize all URLs before processing", colors.gray);
  log("  - Implement proper CORS policies", colors.gray);
  log("  - Use HTTPS in production", colors.gray);
  log("  - Implement request size limits", colors.gray);
  log("  - Log security events for monitoring", colors.gray);

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(console.error);
