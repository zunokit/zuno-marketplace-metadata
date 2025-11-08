# Test Suite Documentation

This directory contains comprehensive tests for the Zuno Marketplace Metadata Management System using **Jest**.

## Test Structure

```
tests/
├── __tests__/
│   ├── api/                    # API route integration tests
│   │   └── health.test.ts
│   ├── core/
│   │   ├── use-cases/          # Business logic tests
│   │   │   ├── metadata/
│   │   │   │   ├── create-metadata.test.ts
│   │   │   │   └── list-metadata.test.ts
│   │   │   └── media/
│   │   │       └── upload-media.test.ts
│   │   └── services/           # Domain service tests
│   ├── infrastructure/         # Infrastructure layer tests
│   │   ├── repositories/       # Repository implementation tests
│   │   └── services/           # External service integration tests
│   └── shared/
│       ├── lib/
│       │   └── utils.test.ts   # Utility function tests
│       └── validation/         # Validation schema tests
│           ├── metadata-validation.test.ts
│           └── media-validation.test.ts
├── setup/
│   ├── jest.config.ts          # Jest configuration
│   └── jest.setup.ts           # Jest global test setup
└── README.md                   # This file
```

**Note:** All Jest configuration is centralized in the `tests/setup/` directory for a clean project structure.

## Test Types

### 1. Unit Tests

Unit tests validate individual components in isolation:

- **Use Case Tests**: Test business logic without external dependencies
- **Service Tests**: Test domain services and business rules
- **Validation Tests**: Test Zod schemas and input validation
- **Utility Tests**: Test helper functions and utilities

### 2. Integration Tests (E2E)

Located in `scripts/test-all.ts`, integration tests validate the entire system:

- Health check endpoints
- Metadata CRUD operations
- Media upload and management
- Authentication and authorization
- Error handling
- Pagination, sorting, and filtering
- Boundary value testing
- Security testing
- Performance testing

## Running Tests

### Unit Tests (Jest)

```bash
# Run all unit tests once
pnpm test

# Run tests in watch mode (for development)
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage
```

### Integration Tests (E2E)

```bash
# Run E2E integration tests
pnpm test:e2e
```

**Prerequisites for E2E tests:**
- Development server must be running (`pnpm dev`)
- Database must be accessible
- Redis must be accessible
- Valid API key in `.env` file

### Run All Tests

```bash
# Run both unit and E2E tests
pnpm test:all
```

## Test Coverage

The test suite covers:

### Metadata API
- ✅ Create metadata with required fields
- ✅ Create metadata with all optional fields
- ✅ Update metadata
- ✅ Delete metadata
- ✅ List metadata with pagination
- ✅ Filter by locked/pinned status
- ✅ Search by name
- ✅ Sort by various fields
- ✅ Validate attributes and creators
- ✅ Validate seller fee basis points

### Media API
- ✅ Upload different media types (IMAGE, VIDEO, GIF, MODEL_3D)
- ✅ List media with pagination
- ✅ Filter by media type and pinned status
- ✅ Search by filename
- ✅ Sort by filename, file size, date
- ✅ Delete media

### Validation
- ✅ Required field validation
- ✅ URL format validation
- ✅ String length limits
- ✅ Numeric range validation
- ✅ Enum value validation
- ✅ Array validation
- ✅ Nested object validation

### Authentication & Authorization
- ✅ API key authentication
- ✅ Invalid/missing API key handling
- ✅ API versioning
- ✅ Admin-only endpoint protection

### Error Handling
- ✅ Invalid endpoints (404)
- ✅ Malformed JSON (400)
- ✅ Validation errors (400)
- ✅ Not found errors (404)
- ✅ Method not allowed (405)

### Security
- ✅ SQL injection prevention
- ✅ XSS prevention
- ✅ NoSQL injection prevention
- ✅ Sensitive header exposure
- ✅ Stack trace hiding
- ✅ Request size limits

### Performance
- ✅ Concurrent request handling
- ✅ Large payload handling
- ✅ Pagination performance
- ✅ Response time validation

## Writing New Tests

### Unit Test Example

```typescript
import type { IMetadataRepository } from "@/core/domain/metadata/repository";

const mockMetadataRepository = (): IMetadataRepository => ({
  create: jest.fn(),
  findById: jest.fn(),
  // ... other methods
});

describe("YourFeature", () => {
  let repository: IMetadataRepository;

  beforeEach(() => {
    repository = mockMetadataRepository();
  });

  describe("yourMethod", () => {
    it("should do something", async () => {
      // Arrange
      const input = { /* test data */ };
      (repository.create as jest.Mock).mockResolvedValue(/* mock result */);

      // Act
      const result = await repository.create(input);

      // Assert
      expect(result).toBeDefined();
      expect(repository.create).toHaveBeenCalledWith(input);
    });
  });
});
```

### Integration Test Example

```typescript
await test("GET /api/endpoint - Should return expected data", async () => {
  const response = await makeRequest("GET", "/api/endpoint");

  expect(response.status, "Status code").toBe(200);
  expect(response.data, "Response data").toBeDefined();
});
```

## Best Practices

### 1. Test Naming
- Use descriptive test names: `should create metadata with required fields`
- Group related tests with `describe` blocks
- Start test names with "should" for clarity

### 2. Test Structure
- **Arrange**: Set up test data and mocks
- **Act**: Execute the code being tested
- **Assert**: Verify the expected outcomes

### 3. Mocking
- Mock external dependencies (database, APIs, services)
- Use `vi.fn()` for function mocks
- Reset mocks in `beforeEach` hooks

### 4. Assertions
- Be specific with assertion messages
- Test both success and failure cases
- Validate error messages and codes

### 5. Coverage Goals
- Aim for >80% code coverage
- Focus on critical business logic
- Test edge cases and boundary values

## Continuous Integration

Tests are run automatically on:
- Pull requests
- Commits to main branches
- Pre-deployment pipelines

## Troubleshooting

### Tests Failing Locally

1. **Check environment variables**: Ensure `.env` file is properly configured
2. **Clear cache**: Run `rm -rf node_modules/.cache`
3. **Reinstall dependencies**: Run `pnpm install`
4. **Check for database connection**: Ensure PostgreSQL is running
5. **Check for Redis connection**: Ensure Redis/Upstash is accessible

### E2E Tests Failing

1. **Start dev server**: Run `pnpm dev` in a separate terminal
2. **Check API key**: Verify `NEXT_PUBLIC_API_KEY` in `.env`
3. **Database migrations**: Run `pnpm db:migrate`
4. **Create admin user**: Run `pnpm db:create-admin`

## Contributing

When adding new features:
1. Write tests first (TDD approach recommended)
2. Ensure all tests pass before submitting PR
3. Aim for comprehensive coverage of new code
4. Update this README if adding new test types

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)
- [MSW (Mock Service Worker)](https://mswjs.io/)
- [ts-jest](https://kulshekhar.github.io/ts-jest/)
