# Zuno Marketplace Metadata - Code Standards

## Overview

This document defines the coding standards, architectural patterns, and best practices for the Zuno Marketplace Metadata project. All contributors must adhere to these standards to maintain code quality, consistency, and maintainability.

---

## TypeScript Coding Standards

### Type Safety
- **Strict Mode**: All TypeScript files use `strict: true` in `tsconfig.json`
- **Never use `any`**: Replace with `unknown` or specific types
- **Explicit Return Types**: All functions must have explicit return type annotations
- **No Implicit Types**: Avoid implicit `any` type inference

#### Example - Good
```typescript
interface UserProfile {
  id: string;
  name: string;
  email: string;
}

function getUserProfile(userId: string): Promise<UserProfile | null> {
  // implementation
}
```

#### Example - Bad
```typescript
function getUserProfile(userId) {  // ❌ No param type
  return new Promise(resolve => {  // ❌ No return type
    // implementation
  });
}
```

### Type Definitions
- Use `interface` for extensible object types
- Use `type` for unions, tuples, or primitives
- Avoid default exports for types (use named exports)
- Group related types in `src/shared/types/`

#### Example
```typescript
// Good
export interface Metadata {
  id: string;
  name: string;
  image: string;
}

export type MetadataInput = Omit<Metadata, 'id'>;

// Bad - default export
export default interface Metadata { }
```

### Naming Conventions

| Category | Convention | Example |
|----------|-----------|---------|
| **Files** | kebab-case | `metadata.service.ts`, `api-key.entity.ts` |
| **Directories** | kebab-case | `use-cases`, `audit-logs` |
| **Classes** | PascalCase | `MetadataService`, `ApiKeyRepository` |
| **Functions** | camelCase | `getMetadata()`, `createApiKey()` |
| **Constants** | UPPER_SNAKE_CASE | `MAX_FILE_SIZE`, `API_VERSION` |
| **Interfaces** | PascalCase (I prefix optional) | `Metadata`, `Repository` |
| **Types** | PascalCase | `MetadataInput`, `ErrorResponse` |
| **Variables** | camelCase | `metadataList`, `apiKeyHash` |
| **Private members** | Prefix with `#` (newer) or `private` | `#cache`, `private cache` |
| **Booleans** | Prefix with `is`, `has`, `can` | `isActive`, `hasPermission` |

#### Example
```typescript
// Correct naming
const MAX_FILE_SIZE = 100 * 1024 * 1024;  // Constant

class MetadataService {                    // Class: PascalCase
  private cache: Cache;                    // Private property

  async getMetadata(id: string): Promise<Metadata> {  // Method: camelCase
    const metadata = await this.cache.get(id);
    return metadata;
  }
}

type MetadataInput = Omit<Metadata, 'id'>;  // Type: PascalCase
```

### Comments & Documentation

- Use JSDoc for public functions and classes
- Keep comments concise and meaningful
- Avoid obvious comments ("increment counter")
- Comment WHY, not WHAT

#### Example
```typescript
/**
 * Retrieves metadata by ID with caching.
 * Falls back to database if cache miss.
 *
 * @param id - Metadata ID
 * @returns Promise resolving to metadata or null if not found
 * @throws {MetadataNotFoundError} If metadata doesn't exist
 */
async function getMetadata(id: string): Promise<Metadata | null> {
  // Try cache first for performance (avoids DB roundtrip)
  const cached = await cache.get(`metadata:${id}`);
  if (cached) return cached;

  const metadata = await repository.findById(id);
  if (metadata) {
    await cache.set(`metadata:${id}`, metadata, CACHE_TTL);
  }
  return metadata;
}
```

### Error Handling

- Create custom error classes extending `Error`
- Include error codes and context
- Avoid throwing plain objects
- Always include meaningful error messages

#### Example
```typescript
class MetadataNotFoundError extends Error {
  readonly code = 'METADATA_NOT_FOUND';

  constructor(id: string) {
    super(`Metadata with ID ${id} not found`);
    this.name = 'MetadataNotFoundError';
  }
}

// Usage
if (!metadata) {
  throw new MetadataNotFoundError(id);
}
```

---

## Clean Architecture Patterns

### Layer Separation

The project follows Clean Architecture with 5 layers:

```
┌─────────────────────────────────────┐
│   Application Layer (API Routes)    │  ← Entry points
├─────────────────────────────────────┤
│   Use Cases (Business Logic)        │  ← Business rules
├─────────────────────────────────────┤
│   Domain Layer (Entities)           │  ← Domain model
├─────────────────────────────────────┤
│   Infrastructure (Adapters)         │  ← External services
├─────────────────────────────────────┤
│   Shared (Utilities & Types)        │  ← Reusable code
└─────────────────────────────────────┘
```

### Layer Responsibilities

#### 1. Application Layer (`src/app/api/`)
- Route handlers (API endpoints)
- Request validation
- Response formatting
- Delegation to use cases

#### 2. Use Cases (`src/core/use-cases/`)
- Business logic orchestration
- Input/output validation
- Service composition
- Error mapping

#### 3. Domain Layer (`src/core/domain/`)
- Entity definitions
- Repository interfaces
- Domain rules
- Business logic validation

#### 4. Infrastructure (`src/infrastructure/`)
- Repository implementations
- External service integration
- Database operations
- Authentication/authorization

#### 5. Shared (`src/shared/`)
- Utility functions
- Type definitions
- Constants
- Validators (Zod schemas)

### Dependency Direction

```
Application
    ↓
Use Cases
    ↓
Domain (interfaces only)
    ↓
Infrastructure (implementations)
    ↓
Shared
```

**Rule**: Never import from outer layers into inner layers.

#### Example - Good
```typescript
// Good: use-case imports from domain (interface)
import type { MetadataRepository } from '@/core/domain/metadata/metadata.repository';

export class GetMetadataUseCase {
  constructor(private repository: MetadataRepository) {}
}

// Good: infrastructure imports from domain
import { MetadataRepository } from '@/core/domain/metadata/metadata.repository';

export class MetadataRepositoryImpl implements MetadataRepository {
  // implementation
}
```

#### Example - Bad
```typescript
// Bad: domain imports from use-case (circular dependency risk)
import { GetMetadataUseCase } from '@/core/use-cases/metadata/get-metadata.use-case';

export interface MetadataRepository {}

// Bad: use-case imports from infrastructure (bypasses domain)
import { MetadataRepositoryImpl } from '@/infrastructure/repositories/metadata.repository.impl';
```

---

## API Route Patterns

### ApiWrapper Pattern

All API routes must use the `ApiWrapper` pattern for consistency:

**File**: `src/shared/lib/api/api-handler.ts`

#### Standard Route Structure
```typescript
// File: src/app/api/metadata/route.ts
import { apiHandler } from '@/shared/lib/api/api-handler';
import { CreateMetadataSchema } from '@/shared/lib/validation/metadata.schemas';

export const POST = apiHandler({
  requireAuth: true,
  requiredScopes: ['metadata:write'],
  schema: CreateMetadataSchema,
  handler: async (req, ctx) => {
    const { payload, user, apiKey } = ctx;

    const useCase = new CreateMetadataUseCase(
      container.resolve('MetadataRepository')
    );

    const metadata = await useCase.execute(payload);

    return {
      success: true,
      data: metadata,
      message: 'Metadata created successfully'
    };
  }
});
```

#### ApiWrapper Features
- ✅ Authentication validation
- ✅ Permission/scope checking
- ✅ Input validation (Zod)
- ✅ Error handling
- ✅ Audit logging
- ✅ Rate limiting
- ✅ Request context management

#### Handler Signature
```typescript
interface ApiHandlerConfig {
  requireAuth?: boolean;           // Require API key or session
  requiredScopes?: string[];       // Required permission scopes
  schema?: ZodSchema;              // Input validation schema
  handler: (req: Request, ctx: RequestContext) => Promise<any>;
}
```

### Response Format

All API responses must follow this format:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  message?: string;
  meta?: {
    timestamp: string;
    version: string;
  };
}
```

#### Example Responses

**Success**
```json
{
  "success": true,
  "data": { "id": "123", "name": "NFT" },
  "message": "Metadata created successfully",
  "meta": { "timestamp": "2025-12-10T10:00:00Z", "version": "v1" }
}
```

**Error**
```json
{
  "success": false,
  "error": {
    "code": "METADATA_NOT_FOUND",
    "message": "Metadata with ID 123 not found",
    "details": { "id": "123" }
  }
}
```

### HTTP Status Codes

| Code | Use Case | Example |
|------|----------|---------|
| 200 | Success | GET, PUT, DELETE |
| 201 | Created | POST (resource created) |
| 400 | Bad Request | Invalid input, validation errors |
| 401 | Unauthorized | Missing/invalid auth |
| 403 | Forbidden | Valid auth but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource, constraint violation |
| 422 | Unprocessable | Invalid data, can't process |
| 429 | Rate Limited | Too many requests |
| 500 | Server Error | Unhandled exceptions |

---

## Repository Pattern Implementation

### Repository Interface Definition

**Location**: `src/core/domain/[entity]/[entity].repository.ts`

```typescript
import type { Metadata } from './metadata.entity';

export interface MetadataRepository {
  findById(id: string): Promise<Metadata | null>;
  findMany(filters: MetadataFilter): Promise<Metadata[]>;
  create(data: MetadataInput): Promise<Metadata>;
  update(id: string, data: Partial<Metadata>): Promise<Metadata>;
  delete(id: string): Promise<void>;
  count(filters?: MetadataFilter): Promise<number>;
}
```

### Repository Implementation

**Location**: `src/infrastructure/repositories/[entity].repository.impl.ts`

```typescript
export class MetadataRepositoryImpl implements MetadataRepository {
  constructor(
    private db: DatabaseClient,
    private cache: CacheService
  ) {}

  async findById(id: string): Promise<Metadata | null> {
    // Check cache first
    const cached = await this.cache.get(`metadata:${id}`);
    if (cached) return cached;

    // Query database
    const result = await this.db
      .select()
      .from(metadataTable)
      .where(eq(metadataTable.id, id))
      .limit(1);

    const metadata = result[0] || null;

    // Cache for future requests
    if (metadata) {
      await this.cache.set(`metadata:${id}`, metadata, 300); // 5min TTL
    }

    return metadata;
  }

  async create(data: MetadataInput): Promise<Metadata> {
    const result = await this.db
      .insert(metadataTable)
      .values({
        id: generateId(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Invalidate list cache
    await this.cache.delete('metadata:list');

    return result[0];
  }

  // ... other methods
}
```

### Query Building Service

Complex queries should use a dedicated service:

**Location**: `src/core/services/metadata/metadata-query.service.ts`

```typescript
export class MetadataQueryService {
  constructor(private repository: MetadataRepository) {}

  buildFilters(input: ListMetadataInput): MetadataFilter {
    return {
      search: input.search,
      attributes: input.attributes,
      creators: input.creators,
      sortBy: input.sortBy || 'createdAt',
      order: input.order || 'desc'
    };
  }

  async listWithPagination(
    input: ListMetadataInput
  ): Promise<{ items: Metadata[]; total: number }> {
    const filters = this.buildFilters(input);
    const [items, total] = await Promise.all([
      this.repository.findMany(filters),
      this.repository.count(filters)
    ]);
    return { items, total };
  }
}
```

---

## Use Case Pattern

### Use Case Structure

**Location**: `src/core/use-cases/[domain]/[operation].use-case.ts`

```typescript
import type { MetadataRepository } from '@/core/domain/metadata/metadata.repository';
import { MetadataNotFoundError } from '@/shared/lib/errors';

interface GetMetadataInput {
  id: string;
}

interface GetMetadataOutput {
  id: string;
  name: string;
  image: string;
  // ... other fields
}

export class GetMetadataUseCase {
  constructor(private repository: MetadataRepository) {}

  async execute(input: GetMetadataInput): Promise<GetMetadataOutput> {
    // Validate input
    if (!input.id || input.id.trim() === '') {
      throw new ValidationError('Metadata ID is required');
    }

    // Execute business logic
    const metadata = await this.repository.findById(input.id);

    if (!metadata) {
      throw new MetadataNotFoundError(input.id);
    }

    // Transform to output
    return {
      id: metadata.id,
      name: metadata.name,
      image: metadata.image,
      // ... map other fields
    };
  }
}
```

### Use Case Principles
1. **Single Responsibility** - One use case = one business operation
2. **Stateless** - No stored state between calls
3. **Dependency Injection** - All dependencies via constructor
4. **Input/Output DTOs** - Explicit input and output types
5. **Error Throwing** - Throw meaningful errors for failures
6. **Validation** - Validate inputs before processing

---

## Error Handling Conventions

### Custom Error Classes

```typescript
// Base error class
export class ApplicationError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: Record<string, any>;

  constructor(
    code: string,
    message: string,
    statusCode = 500,
    details?: Record<string, any>
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.name = this.constructor.name;
  }
}

// Domain-specific errors
export class ValidationError extends ApplicationError {
  constructor(message: string, details?: Record<string, any>) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

export class NotFoundError extends ApplicationError {
  constructor(resource: string, id: string) {
    super(
      'NOT_FOUND',
      `${resource} with ID ${id} not found`,
      404,
      { resource, id }
    );
  }
}

export class UnauthorizedError extends ApplicationError {
  constructor(message = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class PermissionDeniedError extends ApplicationError {
  constructor(message = 'Permission denied') {
    super('PERMISSION_DENIED', message, 403);
  }
}
```

### Error Handling in Route Handlers

```typescript
export const GET = apiHandler({
  handler: async (req, ctx) => {
    try {
      const useCase = new GetMetadataUseCase(repo);
      const result = await useCase.execute(ctx.payload);
      return { success: true, data: result };
    } catch (error) {
      if (error instanceof NotFoundError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            details: error.details
          }
        };
      }

      // Re-throw unhandled errors (will be caught by apiHandler)
      throw error;
    }
  }
});
```

---

## Validation Standards

### Zod Schema Locations

All validation schemas in: `src/shared/lib/validation/[domain].schemas.ts`

### Schema Naming Convention

| Operation | Pattern | Example |
|-----------|---------|---------|
| Create | `Create[Entity]Schema` | `CreateMetadataSchema` |
| Update | `Update[Entity]Schema` | `UpdateMetadataSchema` |
| List | `List[Entity]FilterSchema` | `ListMetadataFilterSchema` |
| Delete | `Delete[Entity]Schema` | `DeleteMetadataSchema` |

#### Example Schema
```typescript
import { z } from 'zod';

export const CreateMetadataSchema = z.object({
  name: z.string().min(1).max(256),
  description: z.string().max(1000).optional(),
  image: z.string().url(),
  animation_url: z.string().url().optional(),
  attributes: z.array(
    z.object({
      trait_type: z.string(),
      value: z.union([z.string(), z.number()])
    })
  ).optional(),
  creators: z.array(
    z.object({
      address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
      share: z.number().min(0).max(100)
    })
  ).optional()
});

export type CreateMetadataInput = z.infer<typeof CreateMetadataSchema>;
```

### Validation Best Practices
- ✅ Validate at API boundary (before use case)
- ✅ Use Zod for runtime validation
- ✅ Include meaningful error messages
- ✅ Validate range, format, and constraints
- ✅ Use `.optional()` for nullable fields
- ✅ Export inferred types from schemas

---

## External Service Integration Standards

### GitHub API Integration Pattern

**Location**: `src/infrastructure/github/github-client.ts`

**Purpose**: Wrapper around Octokit for GitHub API operations

#### Client Structure

```typescript
import { Octokit } from "octokit";
import { env } from "@/shared/config/env";
import { logger } from "@/shared/lib/utils/logger";
import { tryCatch } from "@/shared/lib/utils/server";

export class GitHubClient {
  private static octokit: Octokit | null = null;

  private static getClient(): Octokit {
    if (!this.octokit) {
      if (!env.GITHUB_TOKEN) {
        throw new Error("GITHUB_TOKEN not configured");
      }
      this.octokit = new Octokit({ auth: env.GITHUB_TOKEN });
    }
    return this.octokit;
  }

  static async createIssue(params: {
    title: string;
    body: string;
    labels: string[];
  }): Promise<{ number: number; html_url: string }> {
    // Implementation
  }

  static async searchIssues(query: string): Promise<number | null> {
    // Implementation
  }

  private static parseRepo(repo: string): [string, string] {
    // Implementation
  }
}
```

#### Integration Principles

1. **Singleton Client**: Reuse Octokit instance across requests
2. **Static Methods**: All operations are static for simplicity
3. **Error Handling**: Wrap all API calls with `tryCatch` utility
4. **Structured Logging**: Log all operations with context
5. **Type Safety**: Explicit return types for all methods
6. **Environment Validation**: Check required env vars before operations

#### Deduplication Pattern

**Location**: `src/infrastructure/cache/sentry-dedup.service.ts`

```typescript
import { RedisClient } from "./redis.client";
import { logger } from "@/shared/lib/utils/logger";
import { tryCatch } from "@/shared/lib/utils/server";

const FINGERPRINT_PREFIX = "sentry:fingerprint:";
const FINGERPRINT_TTL = 30 * 24 * 60 * 60; // 30 days

export interface IssueReference {
  issueNumber: number;
  issueUrl: string;
  createdAt: string;
}

export class SentryDedupService {
  private static get redis(): RedisClient {
    return RedisClient.getInstance();
  }

  static async getIssue(
    fingerprint: string
  ): Promise<IssueReference | null> {
    return await this.redis.get<IssueReference>(
      `${FINGERPRINT_PREFIX}${fingerprint}`
    );
  }

  static async storeFingerprint(
    fingerprint: string,
    issueRef: IssueReference
  ): Promise<void> {
    const success = await this.redis.set(
      `${FINGERPRINT_PREFIX}${fingerprint}`,
      issueRef,
      FINGERPRINT_TTL
    );

    if (!success) {
      throw new Error("Failed to store fingerprint in Redis");
    }

    logger.debug("Stored fingerprint for deduplication", {
      fingerprint,
      issueNumber: issueRef.issueNumber,
    });
  }
}
```

#### Best Practices

1. **Key Prefixing**: Use consistent prefixes for Redis keys (`sentry:fingerprint:`)
2. **TTL Configuration**: Define TTL as constants at module level
3. **Type Safety**: Define interfaces for stored data structures
4. **Error Handling**: Throw on Redis failures (dedup is critical)
5. **Logging**: Debug-level logs for dedup operations
6. **Singleton Access**: Access Redis client via static getter

#### Service Layer Integration

**Location**: `src/core/services/sentry-issue/sentry-issue.service.ts`

```typescript
import { GitHubClient } from "@/infrastructure/github/github-client";
import { SentryDedupService } from "@/infrastructure/cache/sentry-dedup.service";
import { logger } from "@/shared/lib/utils/logger";
import { tryCatch } from "@/shared/lib/utils/server";

export class SentryIssueService {
  static async processWebhook(
    payload: SentryWebhookPayload,
    requestId: string
  ): Promise<CreatedIssue | null> {
    const result = await tryCatch(
      async () => {
        // 1. Environment check
        if (payload.environment !== "production") {
          return null;
        }

        // 2. Extract error data
        const issue: SentryIssue = { /* ... */ };

        // 3. Check deduplication
        const existingIssue = await this.checkExistingIssue(issue.fingerprint);
        if (existingIssue) {
          return existingIssue;
        }

        // 4. Create GitHub issue
        const createdIssue = await this.createGitHubIssue(issue);

        // 5. Store fingerprint
        await this.storeFingerprint(issue.fingerprint, createdIssue);

        return createdIssue;
      },
      { errorMessage: "Failed to process Sentry webhook", shouldLog: true }
    );

    return result.success ? result.data : null;
  }

  private static async checkExistingIssue(
    fingerprint: string
  ): Promise<CreatedIssue | null> {
    const issueRef = await SentryDedupService.getIssue(fingerprint);
    if (!issueRef) return null;

    return {
      issueNumber: issueRef.issueNumber,
      issueUrl: issueRef.issueUrl,
      fingerprint,
    };
  }

  private static async createGitHubIssue(
    issue: SentryIssue
  ): Promise<CreatedIssue> {
    const labels = env.GITHUB_ISSUE_LABEL?.split(",") || ["sentry", "error"];
    const result = await GitHubClient.createIssue({
      title: this.formatTitle(issue),
      body: this.formatBody(issue),
      labels,
    });

    return {
      issueNumber: result.number,
      issueUrl: result.html_url,
      fingerprint: issue.fingerprint,
    };
  }

  private static formatTitle(issue: SentryIssue): string {
    const maxLength = 60;
    let title = `🚨 ${issue.title}`;
    if (title.length > maxLength) {
      title = title.substring(0, maxLength - 3) + "...";
    }
    return title;
  }

  private static formatBody(issue: SentryIssue): string {
    return `
## 🚨 Production Error from Sentry

**Fingerprint**: \`${issue.fingerprint}\`
**Environment**: ${issue.environment}
**Event ID**: ${issue.eventId}

### Error
\`\`\`
${this.escapeMarkdown(issue.message)}
\`\`\`

### Stack Trace
\`\`\`
${this.escapeMarkdown(issue.stackTrace)}
\`\`\`

### Request Context
- **URL**: ${issue.requestContext.url}
- **Method**: ${issue.requestContext.method}
- **User Agent**: ${issue.requestContext.userAgent}

### Sentry Link
${issue.sentryUrl}

---
*Auto-generated by Sentry integration*
`.trim();
  }

  private static escapeMarkdown(text: string): string {
    return text.replace(/[\\`*_{}[\]()#+\-.!|]/g, "\\$&");
  }
}
```

#### Service Layer Principles

1. **Production-Only Filtering**: Only create issues for production errors
2. **Deduplication First**: Always check before creating
3. **Markdown Formatting**: Escape special characters
4. **Structured Logging**: Log successful operations with context
5. **Error Recovery**: Return null on soft failures, throw on critical
6. **Title Truncation**: Limit GitHub issue titles to 60 characters

#### Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `GITHUB_TOKEN` | Yes | - | GitHub personal access token |
| `GITHUB_REPO` | No | zunokit/zuno-marketplace-metadata | Target repository |
| `GITHUB_ISSUE_LABEL` | No | sentry,error,production | Comma-separated labels |
| `SENTRY_WEBHOOK_SECRET` | Yes | - | Webhook signature verification |

#### Testing Guidelines

For external service integrations:
- Mock external API clients in Jest setup
- Use consistent mock responses
- Test error handling paths
- Test rate limiting behavior
- Test deduplication logic
- Test markdown escaping

Example Jest mock:
```typescript
// tests/setup/jest.setup.ts
jest.mock("octokit", () => ({
  Octokit: class {
    constructor() {
      this.rest = {
        issues: {
          create: jest.fn().mockResolvedValue({
            data: { number: 1, html_url: "https://github.com/test/repo/issues/1" }
          }),
        },
        search: {
          issuesAndPullRequests: jest.fn().mockResolvedValue({
            data: { items: [] }
          }),
        },
      };
    }
  },
}));
```

---

## Testing Standards

### Test File Location
- **Unit Tests**: `tests/unit/[layer]/[name].test.ts`
- **E2E Tests**: `tests/e2e/[feature]/[name].e2e.ts`

### Test Structure

```typescript
describe('MetadataService', () => {
  let service: MetadataService;
  let mockRepository: jest.Mocked<MetadataRepository>;

  beforeEach(() => {
    mockRepository = createMockRepository();
    service = new MetadataService(mockRepository);
  });

  describe('getMetadata', () => {
    it('should return metadata when found', async () => {
      const metadata = { id: '1', name: 'Test' };
      mockRepository.findById.mockResolvedValue(metadata);

      const result = await service.getMetadata('1');

      expect(result).toEqual(metadata);
      expect(mockRepository.findById).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundError when metadata not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.getMetadata('invalid'))
        .rejects
        .toThrow(NotFoundError);
    });
  });
});
```

### Test Requirements
- ✅ 80%+ code coverage for critical paths
- ✅ Unit test all use cases
- ✅ E2E test all API endpoints
- ✅ Mock external services
- ✅ Test error cases
- ✅ Use descriptive test names

---

## Code Review Checklist

### Architecture
- [ ] Follows Clean Architecture layers
- [ ] Correct dependency direction (no circular)
- [ ] Proper separation of concerns
- [ ] No business logic in API routes

### TypeScript
- [ ] Strict type safety (no `any`)
- [ ] Explicit return types
- [ ] Proper interface/type usage
- [ ] No unused variables/imports

### Naming
- [ ] Files in kebab-case
- [ ] Classes/types in PascalCase
- [ ] Functions/variables in camelCase
- [ ] Constants in UPPER_SNAKE_CASE
- [ ] Meaningful, descriptive names

### API Routes
- [ ] Uses ApiWrapper pattern
- [ ] Input validation with Zod
- [ ] Proper authentication/authorization
- [ ] Correct HTTP status codes
- [ ] Consistent response format

### Error Handling
- [ ] Custom error classes for domains
- [ ] Meaningful error messages
- [ ] Proper error codes
- [ ] No generic error swallowing

### Database
- [ ] Uses repositories (no direct DB calls)
- [ ] Implements query services for complex queries
- [ ] Proper indexing for queries
- [ ] Transaction handling where needed

### Testing
- [ ] Unit tests for use cases
- [ ] E2E tests for API endpoints
- [ ] Error cases covered
- [ ] Proper mocking of dependencies

### Documentation
- [ ] JSDoc for public APIs
- [ ] Updated CLAUDE.md if architecture changes
- [ ] Clear comment for complex logic
- [ ] No obvious comments

### Performance
- [ ] No N+1 queries
- [ ] Proper caching strategy
- [ ] Batch operations for bulk data
- [ ] Async operations where appropriate

### Security
- [ ] Input validation
- [ ] SQL injection prevention (via ORM)
- [ ] XSS prevention (output sanitization)
- [ ] Rate limiting applied
- [ ] Sensitive data not logged

---

## Git Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat: add batch metadata creation` |
| `fix` | Bug fix | `fix: correct IPFS pin validation` |
| `docs` | Documentation | `docs: update API endpoint docs` |
| `refactor` | Code refactoring | `refactor: simplify metadata service` |
| `test` | Add/update tests | `test: add metadata validation tests` |
| `perf` | Performance improvement | `perf: optimize database queries` |
| `chore` | Maintenance | `chore: update dependencies` |
| `ci` | CI/CD changes | `ci: add github actions workflow` |

### Commit Message Format
```
<type>(<scope>): <subject>
<blank line>
<body>
<blank line>
<footer>
```

#### Example
```
feat(metadata): add batch create operation

Implement batch creation endpoint for creating up to 1000 metadata
items in a single request. Uses BullMQ for async IPFS pinning.

Closes #42
BREAKING CHANGE: API version must now be specified in headers
```

---

## File Organization Best Practices

### Module Structure
```
src/
├── core/
│   └── domain/[entity]/
│       ├── [entity].entity.ts       # Domain model (DTO-like)
│       ├── [entity].repository.ts   # Repository interface
│       └── index.ts                 # Exports
├── infrastructure/
│   └── repositories/
│       ├── [entity].repository.impl.ts
│       └── index.ts
└── core/
    └── use-cases/[entity]/
        ├── [operation].use-case.ts
        └── index.ts
```

### Import Organization
```typescript
// 1. External imports
import { z } from 'zod';
import type { NextRequest } from 'next';

// 2. Internal absolute imports (@/ prefix)
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { Metadata } from '@/core/domain/metadata/metadata.entity';

// 3. Relative imports (if necessary)
import { someHelper } from './helpers';
```

---

## Performance Guidelines

### Do's
- ✅ Use pagination for list operations
- ✅ Cache frequently accessed data
- ✅ Use database indexes for queries
- ✅ Batch database operations
- ✅ Use connection pooling
- ✅ Load data asynchronously
- ✅ Compress responses where applicable

### Don'ts
- ❌ N+1 queries (load related data in loop)
- ❌ Load all data without pagination
- ❌ Unnecessary database transactions
- ❌ Synchronous file operations
- ❌ Blocking operations in main thread
- ❌ Storing large objects in cache
- ❌ Inefficient sorting/filtering

---

## Configuration Management

### Environment Variables
- **Location**: `.env.local` (never commit)
- **Template**: `.env.example` (commit to repo)
- **Validation**: `src/shared/config/env.ts`
- **Access**: `process.env.VARIABLE_NAME`

### Secrets Management
- Never commit secrets to repository
- Use environment variables for all secrets
- Rotate secrets regularly
- Document all required secrets in `.env.example`

---

## Documentation Standards

### README Requirements
- Purpose and overview
- Installation instructions
- Configuration guide
- Quick start example
- API endpoints (summary)
- Contributing guidelines

### Code Documentation
- JSDoc for all public functions
- Inline comments for complex logic
- Type annotations for clarity
- Example usage where helpful

### Architecture Documentation
- Update `CLAUDE.md` for major changes
- Document integration points
- Keep `docs/` folder updated
- Include diagrams where helpful

---

## Dependency Management

### Adding Dependencies
1. **Review**: Check if dependency is necessary
2. **Compare**: Look for existing alternatives
3. **Test**: Verify compatibility with project
4. **Document**: Update CLAUDE.md if significant
5. **Install**: `pnpm add [package]`

### Removing Dependencies
1. **Search**: Ensure not used elsewhere
2. **Test**: Run full test suite
3. **Clean**: Remove `pnpm-lock.yaml` and reinstall
4. **Commit**: Clean commit documenting removal

### Dependency Version Management
- Use `^` for minor version flexibility
- Use `~` for patch version flexibility
- Pin dev dependencies for reproducibility
- Keep dependencies updated monthly

---

**Document Version**: 1.0 | **Last Updated**: 2025-12-10 | **Applicable Since**: v0.1.0
