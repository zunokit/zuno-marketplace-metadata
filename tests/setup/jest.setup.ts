import "@testing-library/jest-dom";

// Mock @upstash/redis package (ESM module not compatible with Jest)
const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  exists: jest.fn(),
  ttl: jest.fn(),
  scan: jest.fn(),
  keys: jest.fn(),
  flushall: jest.fn(),
  ping: jest.fn().mockResolvedValue("PONG"),
};

jest.mock("@upstash/redis", () => ({
  Redis: jest.fn(() => mockRedis),
}));

export { mockRedis };

// Global test setup
beforeAll(() => {
  // Set up test environment variables
  // NOTE: NODE_ENV is set automatically by Jest to "test"
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
  process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  process.env.IMAGEKIT_PUBLIC_KEY = "test-public-key";
  process.env.IMAGEKIT_PRIVATE_KEY = "test-private-key";
  process.env.IMAGEKIT_URL_ENDPOINT = "https://test.imagekit.io";
  process.env.PINATA_JWT = "test-jwt";
  process.env.PINATA_GATEWAY_URL = "https://test.pinata.cloud";
  process.env.BETTER_AUTH_SECRET = "test-secret";
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  process.env.CRON_SECRET = "test-cron-secret";
});

afterEach(() => {
  // Clean up after each test
  jest.clearAllMocks();
});

afterAll(() => {
  // Clean up after all tests
});
