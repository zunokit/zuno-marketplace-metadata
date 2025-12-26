import "@testing-library/jest-dom";

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
  process.env.SENTRY_WEBHOOK_SECRET = "test-sentry-webhook-secret";
});

afterEach(() => {
  // Clean up after each test
  jest.clearAllMocks();
});

afterAll(() => {
  // Clean up after all tests
});
