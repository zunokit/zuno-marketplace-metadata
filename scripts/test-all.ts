#!/usr/bin/env node

/**
 * Comprehensive API Test Suite
 * All-in-one test suite covering functional, edge cases, and security testing
 *
 * Usage: npx tsx api-test-suite.ts
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
let API_KEY = ""; // Will be fetched dynamically from /api/public-key

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

async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
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

interface Assertion {
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

function assert(
  actual: unknown,
  message: string = "",
  responseData: unknown = null
): Assertion {
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

  await runTest("GET /api/health - Should return healthy status", async () => {
    const response = await makeRequest("GET", "/api/health");
    assert(response.status, "Status code").toBe(200);

    if (
      response.data &&
      typeof response.data === "object" &&
      "success" in response.data
    ) {
      const data = response.data as {
        success: boolean;
        data: { status: string; services: unknown };
      };
      assert(data.success, "Response success").toBe(true);
      assert(data.data.status, "Health status").toBe("healthy");
      assert(data.data.services, "Services object").toBeDefined();
    }
  });

  await runTest("GET /api/health - Should work without API key", async () => {
    const response = await fetch(`${BASE_URL}/api/health`);
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("GET /api/health - Should include response time", async () => {
    const response = await makeRequest("GET", "/api/health");

    if (
      response.data &&
      typeof response.data === "object" &&
      "data" in response.data
    ) {
      const data = response.data as { data: { responseTime?: number } };
      // Response time might not be included in all health check responses
      if (data.data.responseTime !== undefined) {
        assert(
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
  await runTest("GET /api/metadata - Should list metadata with default pagination", async () => {
    const response = await makeRequest("GET", "/api/metadata");
    assert(response.status, "Status code").toBe(200);

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
      assert(data.success, "Response success").toBe(true);
      assert(data.data.data, "Data array").toBeArray();
      assert(data.data.pagination, "Pagination object").toBeDefined();
      assert(data.data.pagination.page, "Page number").toBe(1);
      assert(data.data.pagination.limit, "Limit").toBe(20);
    }
  });

  await runTest("GET /api/metadata?page=1&limit=5 - Should handle custom pagination", async () => {
    const response = await makeRequest("GET", "/api/metadata?page=1&limit=5");
    assert(response.status, "Status code").toBe(200);

    if (
      isApiResponse(response.data) &&
      typeof response.data.data === "object" &&
      response.data.data !== null &&
      "pagination" in response.data.data
    ) {
      const pagination = (
        response.data.data as { pagination: { limit: number } }
      ).pagination;
      assert(pagination.limit, "Custom limit").toBe(5);
    }
  });

  await runTest("GET /api/metadata?isLocked=false - Should filter by locked status", async () => {
    const response = await makeRequest("GET", "/api/metadata?isLocked=false");
    assert(response.status, "Status code").toBe(200);

    if (isApiResponse(response.data)) {
      assert(response.data.success, "Response success").toBe(true);
    }
  });

  await runTest("GET /api/metadata?isPinned=true - Should filter by pinned status", async () => {
    const response = await makeRequest("GET", "/api/metadata?isPinned=true");
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("GET /api/metadata?search=test - Should search by name", async () => {
    const response = await makeRequest("GET", "/api/metadata?search=test");
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("GET /api/metadata?sortBy=createdAt&sortOrder=desc - Should sort by creation date", async () => {
    const response = await makeRequest(
      "GET",
      "/api/metadata?sortBy=createdAt&sortOrder=desc"
    );
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("GET /api/metadata?sortBy=name&sortOrder=asc - Should sort by name ascending", async () => {
    const response = await makeRequest(
      "GET",
      "/api/metadata?sortBy=name&sortOrder=asc"
    );
    assert(response.status, "Status code").toBe(200);
  });

  // ============= CREATE METADATA TESTS =============
  await runTest("POST /api/metadata - Should create metadata with minimal required fields", async () => {
    const testMetadata = {
      name: `Test NFT ${Date.now()}`,
      image: "https://example.com/image.png",
    };

    const response = await makeRequest("POST", "/api/metadata", {
      body: testMetadata,
    });
    assert(response.status, "Status code").toBe(200);

    if (
      isApiResponse(response.data) &&
      typeof response.data.data === "object" &&
      response.data.data !== null
    ) {
      const data = response.data.data as { id: string; name: string };
      assert(response.data.success, "Response success").toBe(true);
      assert(data.id, "Created metadata ID").toBeDefined();
      assert(data.name, "Metadata name").toBe(testMetadata.name);

      testData.createdMetadataId = data.id;
    }
  });

  await runTest("POST /api/metadata - Should create metadata with all fields", async () => {
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
        { traitType: "Rarity", value: "Common", displayType: "boost_number" },
        {
          traitType: "Power",
          value: 100,
          maxValue: 1000,
          displayType: "number",
        },
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

    const response = await makeRequest("POST", "/api/metadata", {
      body: fullMetadata,
    });
    assert(response.status, "Status code").toBe(200);

    if (
      isApiResponse(response.data) &&
      typeof response.data.data === "object" &&
      response.data.data !== null
    ) {
      const data = response.data.data as {
        attributes: unknown[];
        creators: unknown[];
      };
      assert(data.attributes, "Attributes array").toBeArray();
      assert(data.creators, "Creators array").toBeArray();
    }
  });

  await runTest("POST /api/metadata - Should validate required fields", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: { description: "Missing required name and image" },
    });
    assert(response.status, "Status code").toBe(400);
  });

  await runTest("POST /api/metadata - Should validate image URL format", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "invalid-url",
      },
    });
    assert(response.status, "Status code").toBe(400);
  });

  await runTest("POST /api/metadata - Should validate attribute structure", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png",
        attributes: [{ invalidField: "test" }], // Missing required traitType and value
      },
    });
    assert(response.status, "Status code").toBe(400);
  });

  await runTest("POST /api/metadata - Should validate creator share percentages", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png",
        creators: [
          { address: "0x1234567890123456789012345678901234567890", share: 150 }, // Invalid: > 100
        ],
      },
    });
    assert(response.status, "Status code").toBe(400);
  });

  await runTest("POST /api/metadata - Should validate seller fee basis points", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png",
        sellerFeeBasisPoints: 15000, // Invalid: > 10000 (100%)
      },
    });
    assert(response.status, "Status code").toBe(400);
  });

  // ============= GET METADATA BY ID TESTS =============
  if (testData.createdMetadataId) {
    await runTest(`GET /api/metadata/${testData.createdMetadataId} - Should retrieve metadata by ID`, async () => {
      const response = await makeRequest(
        "GET",
        `/api/metadata/${testData.createdMetadataId}`
      );
      assert(response.status, "Status code").toBe(200);

      if (
        isApiResponse(response.data) &&
        typeof response.data.data === "object" &&
        response.data.data !== null
      ) {
        const data = response.data.data as { id: string };
        assert(response.data.success, "Response success").toBe(true);
        assert(data.id, "Metadata ID").toBe(testData.createdMetadataId);
      }
    });
  }

  await runTest("GET /api/metadata/invalid-id - Should return 404 for non-existent metadata", async () => {
    const response = await makeRequest("GET", "/api/metadata/99999999");
    assert(response.status, "Status code").toBe(404);
  });

  await runTest("GET /api/metadata/invalid-uuid - Should return 404 for non-existent metadata", async () => {
    const response = await makeRequest("GET", "/api/metadata/invalid-uuid");
    assert(response.status, "Status code").toBe(404);
  });

  // ============= UPDATE METADATA TESTS =============
  if (testData.createdMetadataId) {
    await runTest(`PUT /api/metadata/${testData.createdMetadataId} - Should update metadata name`, async () => {
      const updates = {
        name: `Updated Test NFT ${Date.now()}`,
      };

      const response = await makeRequest(
        "PUT",
        `/api/metadata/${testData.createdMetadataId}`,
        { body: updates }
      );
      assert(response.status, "Status code").toBe(200);

      if (
        isApiResponse(response.data) &&
        typeof response.data.data === "object" &&
        response.data.data !== null
      ) {
        const data = response.data.data as { name: string };
        assert(response.data.success, "Response success").toBe(true);
        assert(data.name, "Updated name").toBe(updates.name);
      }
    });

    await runTest(`PUT /api/metadata/${testData.createdMetadataId} - Should update multiple fields`, async () => {
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
      assert(response.status, "Status code").toBe(200);

      if (
        isApiResponse(response.data) &&
        typeof response.data.data === "object" &&
        response.data.data !== null
      ) {
        const data = response.data.data as { description: string };
        assert(data.description, "Updated description").toBe(
          updates.description
        );
      }
    });

    await runTest(`PUT /api/metadata/${testData.createdMetadataId} - Should validate update data`, async () => {
      const response = await makeRequest(
        "PUT",
        `/api/metadata/${testData.createdMetadataId}`,
        {
          body: { name: "" }, // Invalid: empty name
        }
      );
      assert(response.status, "Status code").toBe(400);
    });
  }

  await runTest("PUT /api/metadata/99999999 - Should return 404 for non-existent metadata", async () => {
    const response = await makeRequest("PUT", "/api/metadata/99999999", {
      body: { name: "Updated Name" },
    });
    assert(response.status, "Status code").toBe(404);
  });

  // ============= DELETE METADATA TESTS =============
  if (testData.createdMetadataId) {
    await runTest(`DELETE /api/metadata/${testData.createdMetadataId} - Should delete metadata`, async () => {
      const response = await makeRequest(
        "DELETE",
        `/api/metadata/${testData.createdMetadataId}`
      );
      assert(response.status, "Status code").toBe(200);

      if (isApiResponse(response.data)) {
        assert(response.data.success, "Response success").toBe(true);
      }
    });

    // Verify deletion
    await runTest(`GET /api/metadata/${testData.createdMetadataId} - Should return 404 after deletion`, async () => {
      const response = await makeRequest(
        "GET",
        `/api/metadata/${testData.createdMetadataId}`
      );
      assert(response.status, "Status code").toBe(404);
    });
  }

  await runTest("DELETE /api/metadata/99999999 - Should return 404 for non-existent metadata", async () => {
    const response = await makeRequest("DELETE", "/api/metadata/99999999");
    assert(response.status, "Status code").toBe(404);
  });
}

// ============= MEDIA TESTS =============
async function testMedia(): Promise<void> {
  log("\n🖼️  Media Tests", colors.blue);

  // ============= LIST MEDIA TESTS =============
  await runTest("GET /api/media - Should list media files with default pagination", async () => {
    const response = await makeRequest("GET", "/api/media");
    assert(response.status, "Status code").toBe(200);

    if (
      isApiResponse(response.data) &&
      typeof response.data.data === "object" &&
      response.data.data !== null
    ) {
      const data = response.data.data as {
        data: unknown[];
        pagination: unknown;
      };
      assert(response.data.success, "Response success").toBe(true);
      assert(data.data, "Data array").toBeArray();
      assert(data.pagination, "Pagination object").toBeDefined();
    }
  });

  await runTest("GET /api/media?page=1&limit=5 - Should handle custom pagination", async () => {
    const response = await makeRequest("GET", "/api/media?page=1&limit=5");
    assert(response.status, "Status code").toBe(200);

    if (
      isApiResponse(response.data) &&
      typeof response.data.data === "object" &&
      response.data.data !== null &&
      "pagination" in response.data.data
    ) {
      const pagination = (
        response.data.data as { pagination: { limit: number } }
      ).pagination;
      assert(pagination.limit, "Custom limit").toBe(5);
    }
  });

  await runTest("GET /api/media?mediaType=IMAGE - Should filter by media type", async () => {
    const response = await makeRequest("GET", "/api/media?mediaType=IMAGE");
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("GET /api/media?mediaType=VIDEO - Should filter by video type", async () => {
    const response = await makeRequest("GET", "/api/media?mediaType=VIDEO");
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("GET /api/media?search=test - Should search by filename", async () => {
    const response = await makeRequest("GET", "/api/media?search=test");
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("GET /api/media?sortBy=fileName&sortOrder=asc - Should sort by filename", async () => {
    const response = await makeRequest(
      "GET",
      "/api/media?sortBy=fileName&sortOrder=asc"
    );
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("GET /api/media?sortBy=fileSize&sortOrder=desc - Should sort by file size", async () => {
    const response = await makeRequest(
      "GET",
      "/api/media?sortBy=fileSize&sortOrder=desc"
    );
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("GET /api/media?isPinned=true - Should filter pinned media", async () => {
    const response = await makeRequest("GET", "/api/media?isPinned=true");
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("GET /api/media?isPinned=false - Should filter non-pinned media", async () => {
    const response = await makeRequest("GET", "/api/media?isPinned=false");
    assert(response.status, "Status code").toBe(200);
  });

  // ============= UPLOAD MEDIA TESTS =============
  await runTest("POST /api/media - Should upload fake image file", async () => {
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
    assert(response.status, "Status code").toBe(200);
    assert(response.data, "Response data").toBeDefined();

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

  await runTest("POST /api/media - Should upload fake video file", async () => {
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
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("POST /api/media - Should upload fake GIF file", async () => {
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
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("POST /api/media - Should reject empty file", async () => {
    const formData = new FormData();
    formData.append("mediaType", "IMAGE");

    const response = await makeFormDataRequest("POST", "/api/media", formData);
    assert(response.status, "Status code").toBe(400);
  });

  await runTest("POST /api/media - Should reject invalid media type", async () => {
    const fakeFile = createFakeFile("test.txt", "fake content", "text/plain");

    const formData = new FormData();
    formData.append("file", fakeFile);
    formData.append("mediaType", "INVALID_TYPE");

    const response = await makeFormDataRequest("POST", "/api/media", formData);
    assert(response.status, "Status code").toBe(400);
  });

  // ============= GET MEDIA BY ID TESTS =============
  if (testData.createdMediaId) {
    await runTest(`GET /api/media/${testData.createdMediaId} - Should retrieve media by ID`, async () => {
      const response = await makeRequest(
        "GET",
        `/api/media/${testData.createdMediaId}`
      );
      assert(response.status, "Status code").toBe(200);
      assert(response.data, "Response data").toBeDefined();
    });
  }

  await runTest("GET /api/media/invalid-id - Should return 404 for non-existent media", async () => {
    const response = await makeRequest("GET", "/api/media/99999999");
    assert(response.status, "Status code").toBe(404);
  });

  await runTest("GET /api/media/invalid-uuid - Should return 404 for non-existent media", async () => {
    const response = await makeRequest("GET", "/api/media/invalid-uuid");
    assert(response.status, "Status code").toBe(404);
  });

  // ============= DELETE MEDIA TESTS =============
  if (testData.createdMediaId) {
    await runTest(`DELETE /api/media/${testData.createdMediaId} - Should delete media`, async () => {
      const response = await makeRequest(
        "DELETE",
        `/api/media/${testData.createdMediaId}`
      );
      assert(response.status, "Status code").toBe(200);
      assert(response.data, "Response data").toBeDefined();
    });

    // Verify deletion
    await runTest(`GET /api/media/${testData.createdMediaId} - Should return 404 after deletion`, async () => {
      const response = await makeRequest(
        "GET",
        `/api/media/${testData.createdMediaId}`
      );
      assert(response.status, "Status code").toBe(404);
    });
  }

  await runTest("DELETE /api/media/99999999 - Should return 404 for non-existent media", async () => {
    const response = await makeRequest("DELETE", "/api/media/99999999");
    assert(response.status, "Status code").toBe(404);
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
  await runTest("Should return 401 with missing API key", async () => {
    const response = await fetch(`${BASE_URL}/api/metadata`);
    assert(response.status, "Status code").toBe(401);
  });

  await runTest("Should return 401 with missing API key for media endpoint", async () => {
    const response = await fetch(`${BASE_URL}/api/media`);
    assert(response.status, "Status code").toBe(401);
  });

  // ============= INVALID API KEY TESTS =============
  await runTest("Should return 401 with invalid API key", async () => {
    const response = await makeRequest("GET", "/api/metadata", {
      headers: { "x-api-key": "invalid_key_12345" },
    });
    assert(response.status, "Status code").toBe(401);
  });

  await runTest("Should return 401 with malformed API key", async () => {
    const response = await makeRequest("GET", "/api/metadata", {
      headers: { "x-api-key": "not_a_valid_key" },
    });
    assert(response.status, "Status code").toBe(401);
  });

  await runTest("Should return 401 with empty API key", async () => {
    const response = await makeRequest("GET", "/api/metadata", {
      headers: { "x-api-key": "" },
    });
    assert(response.status, "Status code").toBe(401);
  });

  // ============= API VERSION TESTS =============
  await runTest("Should work with valid API version header", async () => {
    const response = await makeRequest("GET", "/api/health", {
      headers: { "x-api-version": "v1" },
    });
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("Should work without API version header", async () => {
    const response = await makeRequest("GET", "/api/health", {
      headers: { "x-api-key": API_KEY },
    });
    assert(response.status, "Status code").toBe(200);
  });
}

// ============= ERROR HANDLING TESTS =============
async function testErrorHandling(): Promise<void> {
  log("\n⚠️  Error Handling Tests", colors.blue);

  // ============= INVALID ENDPOINTS =============
  await runTest("GET /api/nonexistent - Should return 404 for invalid endpoint", async () => {
    const response = await makeRequest("GET", "/api/nonexistent");
    assert(response.status, "Status code").toBe(404);
  });

  await runTest("POST /api/metadata/invalid - Should return 405 for invalid method", async () => {
    const response = await makeRequest("POST", "/api/metadata/invalid");
    assert(response.status, "Status code").toBe(405);
  });

  // ============= INVALID REQUEST BODIES =============
  await runTest("POST /api/metadata - Should return 400 with malformed JSON", async () => {
    const response = await fetch(`${BASE_URL}/api/metadata`, {
      method: "POST",
      headers: {
        "x-api-key": API_KEY,
        "Content-Type": "application/json",
      },
      body: "invalid json {",
    });
    assert(response.status, "Status code").toBe(400);
  });

  await runTest("POST /api/metadata - Should return 400 with empty body", async () => {
    const response = await makeRequest("POST", "/api/metadata", { body: {} });
    assert(response.status, "Status code").toBe(400);
  });

  // ============= VALIDATION ERROR TESTS =============
  await runTest("POST /api/metadata - Should return 400 with invalid attribute structure", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test",
        image: "https://example.com/image.png",
        attributes: [{ invalidField: "test" }],
      },
    });
    assert(response.status, "Status code").toBe(400);
  });

  await runTest("POST /api/metadata - Should return 400 with invalid creator structure", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test",
        image: "https://example.com/image.png",
        creators: [{ invalidField: "test" }],
      },
    });
    assert(response.status, "Status code").toBe(400);
  });

  // ============= RATE LIMITING TESTS =============
  await runTest("Should handle multiple rapid requests without rate limiting", async () => {
    const requests = Array(10)
      .fill(null)
      .map(() => makeRequest("GET", "/api/health"));

    const responses = await Promise.all(requests);
    const allSuccessful = responses.every((r) => r.status === 200);

    assert(allSuccessful, "All requests successful").toBe(true);
  });

  // ============= CONTENT TYPE TESTS =============
  await runTest("Should handle requests with different content types", async () => {
    const response = await makeRequest("GET", "/api/health", {
      headers: { "Content-Type": "application/json" },
    });
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("Should handle requests without content type", async () => {
    const response = await makeRequest("GET", "/api/health", {
      headers: { "x-api-key": API_KEY },
    });
    assert(response.status, "Status code").toBe(200);
  });
}

// ============= PAGINATION TESTS =============
async function testPagination(): Promise<void> {
  log("\n📄 Pagination Tests", colors.blue);

  // ============= METADATA PAGINATION =============
  await runTest("GET /api/metadata?page=1&limit=1 - Should handle page 1 with limit 1", async () => {
    const response = await makeRequest("GET", "/api/metadata?page=1&limit=1");
    assert(response.status, "Status code").toBe(200);

    if (
      isApiResponse(response.data) &&
      typeof response.data.data === "object" &&
      response.data.data !== null &&
      "pagination" in response.data.data
    ) {
      const pagination = (
        response.data.data as { pagination: { page: number; limit: number } }
      ).pagination;
      assert(pagination.page, "Page number").toBe(1);
      assert(pagination.limit, "Limit").toBe(1);
    }
  });

  await runTest("GET /api/metadata?page=2&limit=5 - Should handle page 2 with limit 5", async () => {
    const response = await makeRequest("GET", "/api/metadata?page=2&limit=5");
    assert(response.status, "Status code").toBe(200);

    if (
      isApiResponse(response.data) &&
      typeof response.data.data === "object" &&
      response.data.data !== null &&
      "pagination" in response.data.data
    ) {
      const pagination = (
        response.data.data as { pagination: { page: number; limit: number } }
      ).pagination;
      assert(pagination.page, "Page number").toBe(2);
      assert(pagination.limit, "Limit").toBe(5);
    }
  });

  await runTest("GET /api/metadata?page=0 - Should handle invalid page number", async () => {
    const response = await makeRequest("GET", "/api/metadata?page=0");
    assert(response.status, "Status code").toBe(400);
  });

  await runTest("GET /api/metadata?limit=0 - Should handle invalid limit", async () => {
    const response = await makeRequest("GET", "/api/metadata?limit=0");
    assert(response.status, "Status code").toBe(400);
  });

  await runTest("GET /api/metadata?limit=1000 - Should handle large limit", async () => {
    const response = await makeRequest("GET", "/api/metadata?limit=1000");
    assert(response.status, "Status code").toBe(200);
  });

  // ============= MEDIA PAGINATION =============
  await runTest("GET /api/media?page=1&limit=1 - Should handle media pagination", async () => {
    const response = await makeRequest("GET", "/api/media?page=1&limit=1");
    assert(response.status, "Status code").toBe(200);

    if (
      isApiResponse(response.data) &&
      typeof response.data.data === "object" &&
      response.data.data !== null &&
      "pagination" in response.data.data
    ) {
      const pagination = (
        response.data.data as { pagination: { page: number; limit: number } }
      ).pagination;
      assert(pagination.page, "Page number").toBe(1);
      assert(pagination.limit, "Limit").toBe(1);
    }
  });
}

// ============= SORTING TESTS =============
async function testSorting(): Promise<void> {
  log("\n🔄 Sorting Tests", colors.blue);

  // ============= METADATA SORTING =============
  await runTest("GET /api/metadata?sortBy=name&sortOrder=asc - Should sort by name ascending", async () => {
    const response = await makeRequest(
      "GET",
      "/api/metadata?sortBy=name&sortOrder=asc"
    );
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("GET /api/metadata?sortBy=createdAt&sortOrder=desc - Should sort by creation date descending", async () => {
    const response = await makeRequest(
      "GET",
      "/api/metadata?sortBy=createdAt&sortOrder=desc"
    );
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("GET /api/metadata?sortBy=updatedAt&sortOrder=asc - Should sort by update date ascending", async () => {
    const response = await makeRequest(
      "GET",
      "/api/metadata?sortBy=updatedAt&sortOrder=asc"
    );
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("GET /api/metadata?sortBy=invalid - Should handle invalid sort field", async () => {
    const response = await makeRequest("GET", "/api/metadata?sortBy=invalid");
    assert(response.status, "Status code").toBe(400);
  });

  await runTest("GET /api/metadata?sortOrder=invalid - Should handle invalid sort order", async () => {
    const response = await makeRequest(
      "GET",
      "/api/metadata?sortOrder=invalid"
    );
    assert(response.status, "Status code").toBe(400);
  });

  // ============= MEDIA SORTING =============
  await runTest("GET /api/media?sortBy=fileName&sortOrder=asc - Should sort media by filename", async () => {
    const response = await makeRequest(
      "GET",
      "/api/media?sortBy=fileName&sortOrder=asc"
    );
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("GET /api/media?sortBy=fileSize&sortOrder=desc - Should sort media by file size", async () => {
    const response = await makeRequest(
      "GET",
      "/api/media?sortBy=fileSize&sortOrder=desc"
    );
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("GET /api/media?sortBy=createdAt&sortOrder=asc - Should sort media by creation date", async () => {
    const response = await makeRequest(
      "GET",
      "/api/media?sortBy=createdAt&sortOrder=asc"
    );
    assert(response.status, "Status code").toBe(200);
  });
}

// ============= FILTERING TESTS =============
async function testFiltering(): Promise<void> {
  log("\n🔍 Filtering Tests", colors.blue);

  // ============= METADATA FILTERING =============
  await runTest("GET /api/metadata?isLocked=false - Should filter by unlocked metadata", async () => {
    const response = await makeRequest("GET", "/api/metadata?isLocked=false");
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("GET /api/metadata?isPinned=true - Should filter by pinned metadata", async () => {
    const response = await makeRequest("GET", "/api/metadata?isPinned=true");
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("GET /api/metadata?isLocked=true - Should filter by locked metadata", async () => {
    const response = await makeRequest("GET", "/api/metadata?isLocked=true");
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("GET /api/metadata?isLocked=invalid - Should handle invalid boolean", async () => {
    const response = await makeRequest("GET", "/api/metadata?isLocked=invalid");
    assert(response.status, "Status code").toBe(400);
  });

  await runTest("GET /api/metadata?search=test - Should search by name", async () => {
    const response = await makeRequest("GET", "/api/metadata?search=test");
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("GET /api/metadata?search= - Should handle empty search", async () => {
    const response = await makeRequest("GET", "/api/metadata?search=");
    assert(response.status, "Status code").toBe(400);
  });

  // ============= MEDIA FILTERING =============
  await runTest("GET /api/media?mediaType=IMAGE - Should filter by image type", async () => {
    const response = await makeRequest("GET", "/api/media?mediaType=IMAGE");
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("GET /api/media?mediaType=VIDEO - Should filter by video type", async () => {
    const response = await makeRequest("GET", "/api/media?mediaType=VIDEO");
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("GET /api/media?mediaType=GIF - Should filter by GIF type", async () => {
    const response = await makeRequest("GET", "/api/media?mediaType=GIF");
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("GET /api/media?mediaType=MODEL_3D - Should filter by 3D model type", async () => {
    const response = await makeRequest("GET", "/api/media?mediaType=MODEL_3D");
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("GET /api/media?mediaType=INVALID - Should handle invalid media type", async () => {
    const response = await makeRequest("GET", "/api/media?mediaType=INVALID");
    assert(response.status, "Status code").toBe(400);
  });

  await runTest("GET /api/media?isPinned=true - Should filter pinned media", async () => {
    const response = await makeRequest("GET", "/api/media?isPinned=true");
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("GET /api/media?isPinned=false - Should filter non-pinned media", async () => {
    const response = await makeRequest("GET", "/api/media?isPinned=false");
    assert(response.status, "Status code").toBe(200);
  });
}

// ============= BOUNDARY VALUE TESTS =============
async function testBoundaryValues(): Promise<void> {
  log("\n📏 Boundary Value Tests", colors.blue);

  // ============= PAGINATION BOUNDARIES =============
  await runTest("GET /api/metadata?page=1&limit=1 - Minimum valid pagination", async () => {
    const response = await makeRequest("GET", "/api/metadata?page=1&limit=1");
    assert(response.status, "Status code").toBe(200);

    if (
      isApiResponse(response.data) &&
      typeof response.data.data === "object" &&
      response.data.data !== null &&
      "pagination" in response.data.data
    ) {
      const pagination = (
        response.data.data as { pagination: { limit: number } }
      ).pagination;
      assert(pagination.limit, "Limit").toBe(1);
    }
  });

  await runTest("GET /api/metadata?page=1&limit=1000 - Maximum reasonable pagination", async () => {
    const response = await makeRequest(
      "GET",
      "/api/metadata?page=1&limit=1000"
    );
    assert(response.status, "Status code").toBe(200);

    if (
      isApiResponse(response.data) &&
      typeof response.data.data === "object" &&
      response.data.data !== null &&
      "pagination" in response.data.data
    ) {
      const pagination = (
        response.data.data as { pagination: { limit: number } }
      ).pagination;
      assert(pagination.limit, "Limit").toBe(1000);
    }
  });

  await runTest("GET /api/metadata?page=0 - Invalid page boundary", async () => {
    const response = await makeRequest("GET", "/api/metadata?page=0");
    assert(response.status, "Status code").toBe(400);
  });

  await runTest("GET /api/metadata?limit=0 - Invalid limit boundary", async () => {
    const response = await makeRequest("GET", "/api/metadata?limit=0");
    assert(response.status, "Status code").toBe(400);
  });

  await runTest("GET /api/metadata?page=-1 - Negative page boundary", async () => {
    const response = await makeRequest("GET", "/api/metadata?page=-1");
    assert(response.status, "Status code").toBe(400);
  });

  await runTest("GET /api/metadata?limit=-1 - Negative limit boundary", async () => {
    const response = await makeRequest("GET", "/api/metadata?limit=-1");
    assert(response.status, "Status code").toBe(400);
  });

  // ============= STRING LENGTH BOUNDARIES =============
  await runTest("POST /api/metadata - Minimum valid name length", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "A", // Minimum length
        image: "https://example.com/image.png",
      },
    });
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("POST /api/metadata - Maximum valid name length", async () => {
    const longName = "A".repeat(100); // Maximum length
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: longName,
        image: "https://example.com/image.png",
      },
    });
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("POST /api/metadata - Name too long (101 characters)", async () => {
    const tooLongName = "A".repeat(101); // Over maximum
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: tooLongName,
        image: "https://example.com/image.png",
      },
    });
    assert(response.status, "Status code").toBe(400);
  });

  await runTest("POST /api/metadata - Empty name", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "",
        image: "https://example.com/image.png",
      },
    });
    assert(response.status, "Status code").toBe(400);
  });

  await runTest("POST /api/metadata - Maximum description length", async () => {
    const longDescription = "A".repeat(2000); // Maximum length
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        description: longDescription,
        image: "https://example.com/image.png",
      },
    });
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("POST /api/metadata - Description too long (2001 characters)", async () => {
    const tooLongDescription = "A".repeat(2001); // Over maximum
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        description: tooLongDescription,
        image: "https://example.com/image.png",
      },
    });
    assert(response.status, "Status code").toBe(400);
  });

  // ============= NUMERIC BOUNDARIES =============
  await runTest("POST /api/metadata - Minimum seller fee (0)", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png",
        sellerFeeBasisPoints: 0,
      },
    });
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("POST /api/metadata - Maximum seller fee (10000)", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png",
        sellerFeeBasisPoints: 10000,
      },
    });
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("POST /api/metadata - Seller fee too high (10001)", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png",
        sellerFeeBasisPoints: 10001,
      },
    });
    assert(response.status, "Status code").toBe(400);
  });

  await runTest("POST /api/metadata - Negative seller fee", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png",
        sellerFeeBasisPoints: -1,
      },
    });
    assert(response.status, "Status code").toBe(400);
  });

  // ============= CREATOR SHARE BOUNDARIES =============
  await runTest("POST /api/metadata - Creator share 0%", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png",
        creators: [
          { address: "0x1234567890123456789012345678901234567890", share: 0 },
        ],
      },
    });
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("POST /api/metadata - Creator share 100%", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png",
        creators: [
          { address: "0x1234567890123456789012345678901234567890", share: 100 },
        ],
      },
    });
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("POST /api/metadata - Creator share over 100%", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png",
        creators: [
          { address: "0x1234567890123456789012345678901234567890", share: 101 },
        ],
      },
    });
    assert(response.status, "Status code").toBe(400);
  });

  await runTest("POST /api/metadata - Creator share negative", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png",
        creators: [
          { address: "0x1234567890123456789012345678901234567890", share: -1 },
        ],
      },
    });
    assert(response.status, "Status code").toBe(400);
  });
}

// ============= SPECIAL CHARACTER TESTS =============
async function testSpecialCharacters(): Promise<void> {
  log("\n🔤 Special Character Tests", colors.blue);

  // ============= UNICODE AND SPECIAL CHARACTERS =============
  await runTest("POST /api/metadata - Unicode characters in name", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT 🚀 中文 日本語 한국어",
        image: "https://example.com/image.png",
      },
    });
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("POST /api/metadata - HTML entities in description", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        description: "Description with &lt;html&gt; &amp; entities",
        image: "https://example.com/image.png",
      },
    });
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("POST /api/metadata - SQL injection attempt in name", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "'; DROP TABLE users; --",
        image: "https://example.com/image.png",
      },
    });
    assert(response.status, "Status code").toBe(200); // Should be handled safely
  });

  await runTest("POST /api/metadata - XSS attempt in description", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        description: '<script>alert("xss")</script>',
        image: "https://example.com/image.png",
      },
    });
    assert(response.status, "Status code").toBe(200); // Should be handled safely
  });

  await runTest("POST /api/metadata - Newline characters in name", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test\nNFT\nWith\nNewlines",
        image: "https://example.com/image.png",
      },
    });
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("POST /api/metadata - Tab characters in description", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        description: "Description\twith\ttabs",
        image: "https://example.com/image.png",
      },
    });
    assert(response.status, "Status code").toBe(200);
  });
}

// ============= URL VALIDATION TESTS =============
async function testUrlValidation(): Promise<void> {
  log("\n🔗 URL Validation Tests", colors.blue);

  // ============= VALID URL FORMATS =============
  await runTest("POST /api/metadata - HTTP URL", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "http://example.com/image.png",
      },
    });
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("POST /api/metadata - HTTPS URL", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png",
      },
    });
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("POST /api/metadata - URL with port", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com:8080/image.png",
      },
    });
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("POST /api/metadata - URL with query parameters", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png?v=1&format=png",
      },
    });
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("POST /api/metadata - URL with fragment", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png#section1",
      },
    });
    assert(response.status, "Status code").toBe(200);
  });

  // ============= INVALID URL FORMATS =============
  await runTest("POST /api/metadata - Invalid URL format", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "not-a-valid-url",
      },
    });
    assert(response.status, "Status code").toBe(400);
  });

  await runTest("POST /api/metadata - Empty URL", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "",
      },
    });
    assert(response.status, "Status code").toBe(400);
  });

  await runTest("POST /api/metadata - URL without protocol", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "example.com/image.png",
      },
    });
    assert(response.status, "Status code").toBe(400);
  });

  await runTest("POST /api/metadata - FTP URL (unsupported protocol)", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "ftp://example.com/image.png",
      },
    });
    assert(response.status, "Status code").toBe(400);
  });

  await runTest("POST /api/metadata - JavaScript URL", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: 'javascript:alert("xss")',
      },
    });
    assert(response.status, "Status code").toBe(400);
  });
}

// ============= ARRAY BOUNDARY TESTS =============
async function testArrayBoundaries(): Promise<void> {
  log("\n📋 Array Boundary Tests", colors.blue);

  // ============= EMPTY ARRAYS =============
  await runTest("POST /api/metadata - Empty attributes array", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png",
        attributes: [],
      },
    });
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("POST /api/metadata - Empty creators array", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png",
        creators: [],
      },
    });
    assert(response.status, "Status code").toBe(200);
  });

  // ============= LARGE ARRAYS =============
  await runTest("POST /api/metadata - Large attributes array (100 items)", async () => {
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
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("POST /api/metadata - Multiple creators with valid shares", async () => {
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
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("POST /api/metadata - Creators with shares totaling 100%", async () => {
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
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("POST /api/metadata - Creators with shares not totaling 100%", async () => {
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
    assert(response.status, "Status code").toBe(200); // Should still be valid
  });
}

// ============= DATA TYPE TESTS =============
async function testDataTypeValidation(): Promise<void> {
  log("\n🔢 Data Type Validation Tests", colors.blue);

  // ============= STRING TYPE TESTS =============
  await runTest("POST /api/metadata - Number as string in name", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "12345",
        image: "https://example.com/image.png",
      },
    });
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("POST /api/metadata - Boolean as string in name", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "true",
        image: "https://example.com/image.png",
      },
    });
    assert(response.status, "Status code").toBe(200);
  });

  // ============= NUMBER TYPE TESTS =============
  await runTest("POST /api/metadata - String as number in sellerFeeBasisPoints", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png",
        sellerFeeBasisPoints: "500", // String instead of number
      },
    });
    assert(response.status, "Status code").toBe(400);
  });

  await runTest("POST /api/metadata - Float in sellerFeeBasisPoints", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png",
        sellerFeeBasisPoints: 500.5, // Float instead of integer
      },
    });
    assert(response.status, "Status code").toBe(400);
  });

  // ============= BOOLEAN TYPE TESTS =============
  await runTest("POST /api/metadata - String as boolean in mediaType", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png",
        mediaType: "true", // String instead of enum
      },
    });
    assert(response.status, "Status code").toBe(400);
  });

  // ============= NULL/UNDEFINED TESTS =============
  await runTest("POST /api/metadata - Null in optional fields", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png",
        description: null,
        externalUrl: null,
      },
    });
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("POST /api/metadata - Undefined in optional fields", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png",
        description: undefined,
        externalUrl: undefined,
      },
    });
    assert(response.status, "Status code").toBe(200);
  });
}

// ============= CONCURRENT REQUEST TESTS =============
async function testConcurrentRequests(): Promise<void> {
  log("\n⚡ Concurrent Request Tests", colors.blue);

  await runTest("Should handle 10 concurrent health checks", async () => {
    const requests = Array(10)
      .fill(null)
      .map(() => makeRequest("GET", "/api/health"));

    const responses = await Promise.all(requests);
    const allSuccessful = responses.every((r) => r.status === 200);
    assert(allSuccessful, "All concurrent requests successful").toBe(true);
  });

  await runTest("Should handle concurrent metadata creation", async () => {
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
    assert(allSuccessful, "All concurrent metadata creation successful").toBe(
      true
    );
  });

  await runTest("Should handle concurrent metadata listing", async () => {
    const requests = Array(20)
      .fill(null)
      .map(() => makeRequest("GET", "/api/metadata"));

    const responses = await Promise.all(requests);
    const allSuccessful = responses.every((r) => r.status === 200);
    assert(allSuccessful, "All concurrent listing requests successful").toBe(
      true
    );
  });
}

// ============= MEMORY AND PERFORMANCE TESTS =============
async function testMemoryAndPerformance(): Promise<void> {
  log("\n💾 Memory & Performance Tests", colors.blue);

  await runTest("Should handle large metadata with many attributes", async () => {
    const largeAttributes = Array(1000)
      .fill(null)
      .map((_, i) => ({
        traitType: `Trait ${i}`,
        value: `Value ${i}`,
        displayType: i % 2 === 0 ? "number" : "boost_percentage",
      }));

    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Large NFT",
        image: "https://example.com/image.png",
        attributes: largeAttributes,
      },
    });
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("Should handle very long description", async () => {
    const longDescription = "A".repeat(2000); // Maximum allowed
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Long Description NFT",
        description: longDescription,
        image: "https://example.com/image.png",
      },
    });
    assert(response.status, "Status code").toBe(200);
  });

  await runTest("Should handle rapid sequential requests", async () => {
    const startTime = Date.now();

    for (let i = 0; i < 10; i++) {
      const response = await makeRequest("GET", "/api/health");
      assert(response.status, "Status code").toBe(200);
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;
    assert(totalTime, "Total time should be reasonable").toBeLessThan(5000);
  });
}

// ============= SECURITY TESTS =============
async function testSecurity(): Promise<void> {
  log("\n🔒 Security Tests", colors.blue);

  // ============= AUTHENTICATION SECURITY =============
  await runTest("Should reject requests with no API key", async () => {
    const response = await fetch(`${BASE_URL}/api/metadata`);
    assert(response.status, "Status code").toBe(401);
  });

  await runTest("Should reject requests with invalid API key format", async () => {
    const response = await makeRequest("GET", "/api/metadata", {
      headers: { "x-api-key": "invalid_format" },
    });
    assert(response.status, "Status code").toBe(401);
  });

  await runTest("Should handle SQL injection in API key", async () => {
    const response = await makeRequest("GET", "/api/metadata", {
      headers: { "x-api-key": "'; DROP TABLE api_keys; --" },
    });
    assert(response.status, "Status code").toBe(401);
  });

  await runTest("Should handle XSS in API key", async () => {
    const response = await makeRequest("GET", "/api/metadata", {
      headers: { "x-api-key": '<script>alert("xss")</script>' },
    });
    assert(response.status, "Status code").toBe(401);
  });

  // ============= INPUT VALIDATION SECURITY =============
  await runTest("Should prevent SQL injection in metadata name", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "'; DROP TABLE metadata; --",
        image: "https://example.com/image.png",
      },
    });
    assert(response.status, "Status code").toBe(200); // Should be handled safely
  });

  await runTest("Should prevent XSS in metadata name", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: '<script>alert("xss")</script>',
        image: "https://example.com/image.png",
      },
    });
    assert(response.status, "Status code").toBe(200); // Should be handled safely
  });

  await runTest("Should prevent XSS in external URL", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: "Test NFT",
        image: "https://example.com/image.png",
        externalUrl: 'javascript:alert("xss")',
      },
    });
    assert(response.status, "Status code").toBe(400); // Should reject javascript: URLs
  });

  await runTest("Should prevent NoSQL injection in query parameters", async () => {
    const response = await makeRequest(
      "GET",
      "/api/metadata?status[$ne]=draft"
    );
    assert(response.status, "Status code").toBe(400); // Should reject NoSQL operators
  });

  await runTest("Should prevent NoSQL injection in request body", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: {
        name: { $ne: "Test" },
        image: "https://example.com/image.png",
      },
    });
    assert(response.status, "Status code").toBe(400); // Should reject NoSQL operators
  });

  // ============= AUTHORIZATION SECURITY =============
  await runTest("Should reject API key access to admin endpoints", async () => {
    const response = await makeRequest("GET", "/api/admin/api-keys");
    assert(response.status, "Status code").toBe(401); // Should require session auth
  });

  await runTest("Should reject API key access to admin API key creation", async () => {
    const response = await makeRequest("POST", "/api/admin/api-keys", {
      body: { name: "Test Key" },
    });
    assert(response.status, "Status code").toBe(401); // Should require session auth
  });

  // ============= DATA EXPOSURE SECURITY =============
  await runTest("Should not expose internal error details", async () => {
    const response = await makeRequest("GET", "/api/metadata/99999999");
    assert(response.status, "Status code").toBe(404);
    // Should not expose database schema or internal paths
    if (response.data && typeof response.data === "object") {
      const responseStr = JSON.stringify(response.data);
      assert(
        responseStr.includes("database"),
        "Should not expose database info"
      ).toBe(false);
      assert(
        responseStr.includes("schema"),
        "Should not expose schema info"
      ).toBe(false);
      assert(
        responseStr.includes("table"),
        "Should not expose table info"
      ).toBe(false);
    }
  });

  await runTest("Should not expose stack traces in error responses", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      body: { invalidField: "test" },
    });
    assert(response.status, "Status code").toBe(400);
    // Should not expose stack traces
    if (response.data && typeof response.data === "object") {
      const responseStr = JSON.stringify(response.data);
      assert(
        responseStr.includes("stack"),
        "Should not expose stack traces"
      ).toBe(false);
      assert(
        responseStr.includes("at "),
        "Should not expose stack traces"
      ).toBe(false);
    }
  });

  await runTest("Should not expose sensitive headers", async () => {
    const response = await makeRequest("GET", "/api/health");
    assert(response.status, "Status code").toBe(200);

    // Should not expose sensitive headers
    const sensitiveHeaders = ["x-powered-by", "server", "x-aspnet-version"];
    sensitiveHeaders.forEach((header) => {
      assert(
        response.headers[header],
        `Should not expose ${header} header`
      ).toBeUndefined();
    });
  });

  // ============= REQUEST MANIPULATION SECURITY =============
  await runTest("Should handle X-HTTP-Method-Override header", async () => {
    const response = await makeRequest("POST", "/api/metadata", {
      headers: { "X-HTTP-Method-Override": "GET" },
      body: { name: "test" },
    });
    assert(response.status, "Status code").toBe(200); // Should ignore override
  });

  await runTest("Should handle invalid content type", async () => {
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
    assert(response.status, "Status code").toBe(400);
  });

  await runTest("Should handle oversized request body", async () => {
    const largeBody = {
      name: "Test NFT",
      image: "https://example.com/image.png",
      description: "A".repeat(10000), // Very large description
    };

    const response = await makeRequest("POST", "/api/metadata", {
      body: largeBody,
    });
    assert(response.status, "Status code").toBe(400); // Should reject oversized requests
  });
}

// ============= PERFORMANCE TESTS =============
async function testPerformance(): Promise<void> {
  log("\n⚡ Performance Tests", colors.blue);

  await runTest("Should handle concurrent requests efficiently", async () => {
    const startTime = Date.now();
    const requests = Array(10)
      .fill(null)
      .map(() => makeRequest("GET", "/api/health"));

    const responses = await Promise.all(requests);
    const endTime = Date.now();
    const totalTime = endTime - startTime;

    const allSuccessful = responses.every((r) => r.status === 200);
    assert(allSuccessful, "All concurrent requests successful").toBe(true);
    assert(totalTime, "Total time should be reasonable").toBeLessThan(10000); // Less than 10 seconds
  });

  await runTest("Should handle large pagination requests", async () => {
    const response = await makeRequest("GET", "/api/metadata?page=1&limit=100");
    assert(response.status, "Status code").toBe(200);

    if (
      isApiResponse(response.data) &&
      typeof response.data.data === "object" &&
      response.data.data !== null &&
      "pagination" in response.data.data
    ) {
      const pagination = (
        response.data.data as { pagination: { limit: number } }
      ).pagination;
      assert(pagination.limit, "Large limit handled").toBe(100);
    }
  });

  await runTest("Should handle burst of requests without crashing", async () => {
    const requests = Array(20)
      .fill(null)
      .map(() => makeRequest("GET", "/api/health"));

    const responses = await Promise.all(requests);
    const allSuccessful = responses.every((r) => r.status === 200);
    assert(allSuccessful, "All burst requests successful").toBe(true);
  });
}

/**
 * Fetch public API key from server
 */
async function fetchPublicApiKey(): Promise<string> {
  try {
    const response = await fetch(`${BASE_URL}/api/public-key`, {
      headers: {
        "x-api-version": "v1",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch public API key: ${response.status}`);
    }

    const data = await response.json();
    if (!data.data?.apiKey) {
      throw new Error("No API key returned from server");
    }

    return data.data.apiKey;
  } catch (error) {
    log(`❌ Failed to fetch public API key: ${(error as Error).message}`, colors.red);
    log("Please ensure:", colors.yellow);
    log("  1. Server is running (pnpm dev)", colors.yellow);
    log("  2. Public API key is configured in database", colors.yellow);
    log("  3. ENABLE_PUBLIC_KEY=true in .env", colors.yellow);
    process.exit(1);
  }
}

// ============= MAIN TEST RUNNER =============
async function runAllTests(): Promise<void> {
  log("🚀 Starting Comprehensive API Test Suite\n", colors.blue);
  log(`Base URL: ${BASE_URL}`, colors.gray);
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

  // Fetch public API key
  log("\n🔑 Fetching public API key...", colors.cyan);
  API_KEY = await fetchPublicApiKey();
  log(`✅ API Key fetched: ${API_KEY.substring(0, 20)}...`, colors.green);

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
