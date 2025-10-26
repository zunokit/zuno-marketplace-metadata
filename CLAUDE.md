# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Zuno Marketplace Metadata Management System is an NFT metadata API platform built with Next.js 16, TypeScript, and Clean Architecture. It provides OpenSea-compatible metadata management with IPFS storage, media processing, and background job processing.

## Core Development Commands

### Development Server
```bash
pnpm dev                 # Start Next.js development server
pnpm start               # Start production server
pnpm build               # Build for production
pnpm workers             # Start BullMQ background workers
```

### Database Operations
```bash
pnpm db:generate         # Generate Drizzle migrations from schema
pnpm db:migrate          # Run pending migrations
pnpm db:push             # Push schema changes directly (dev only)
pnpm db:studio           # Open Drizzle Studio UI
pnpm db:create-admin     # Create admin user from .env credentials
```

### Code Quality
```bash
pnpm typecheck          # Run TypeScript compiler checks
pnpm lint               # Run ESLint
pnpm test               # Run all tests
```

### Utility Scripts
```bash
pnpm init-versions      # Initialize API version data
```

## Architecture

This project follows **Clean Architecture** principles with clear separation between domain, application, and infrastructure layers.

### Layer Structure

```
src/
├── core/                         # Business logic layer (domain-driven)
│   ├── domain/                   # Domain entities and repository interfaces
│   │   ├── metadata/             # Metadata entity, types, repository interface
│   │   ├── media/                # Media entity, types, repository interface
│   │   └── audit-log/            # Audit log entity, repository interface
│   ├── services/                 # Domain services
│   │   ├── metadata/             # Metadata query service (list params builder)
│   │   ├── media/                # Media query service
│   │   └── audit-log/            # Audit logging service
│   └── use-cases/                # Application use cases (business operations)
│       ├── metadata/             # CRUD operations for metadata
│       ├── media/                # Upload, list, delete media
│       ├── api-key/              # API key management
│       ├── api-version/          # API versioning
│       └── health/               # Health check use case
│
├── infrastructure/               # External integrations and adapters
│   ├── auth/                     # Better Auth configuration and helpers
│   ├── database/                 # Drizzle ORM setup and schemas
│   │   └── drizzle/schema/       # All database table schemas
│   ├── repositories/             # Repository implementations (implements core/domain interfaces)
│   ├── services/                 # External service integrations
│   │   ├── imagekit.service.ts   # ImageKit media processing
│   │   ├── pinata/               # Pinata IPFS client and service
│   │   ├── rate-limit.service.ts # Rate limiting with Redis
│   │   └── api-key.service.ts    # API key validation
│   ├── cache/                    # Redis cache with Upstash
│   ├── queue/                    # BullMQ job queue configuration
│   │   └── workers/              # Background workers (IPFS pinning)
│   ├── monitoring/               # Audit logging to database
│   └── di/                       # Dependency injection container
│
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── metadata/             # Metadata CRUD endpoints
│   │   ├── media/                # Media upload/management endpoints
│   │   ├── health/               # Health check endpoint
│   │   ├── admin/                # Admin-only endpoints (API keys, versions)
│   │   ├── auth/                 # Better Auth routes
│   │   └── cron/                 # Cron job endpoints (IPFS processing)
│   └── admin/                    # Admin dashboard pages
│
├── components/                   # React components (Radix UI + Tailwind)
│
└── shared/                       # Shared utilities and types
    ├── types/                    # TypeScript type definitions
    ├── dto/                      # Data transfer objects
    ├── lib/
    │   ├── api/                  # API handler wrapper, error handling
    │   ├── validation/           # Zod schemas for validation
    │   └── utils/                # Utility functions
    └── config/                   # Environment configuration
```

### Key Architectural Patterns

#### Dependency Injection
- **Container**: `src/infrastructure/di/container.ts` exports singleton factory functions
- Repositories, services, and use cases are instantiated through the DI container
- Ensures testability and loose coupling

#### API Route Handler Pattern
All API routes use `ApiWrapper.create()` from `src/shared/lib/api/api-handler.ts`:

```typescript
export const GET = ApiWrapper.create<InputType>(
  async (input, context) => {
    // Handler logic
  },
  {
    auth: {
      required: true,              // Require authentication
      allowApiKey: true,            // Allow API key auth
      allowSession: true,           // Allow session auth (admin)
      adminOnly: false,             // Require admin role
    },
    validation: {
      query: zodSchema,             // Validate query params
      body: zodSchema,              // Validate request body
      params: zodSchema,            // Validate route params
    },
    versioning: {
      required: true,               # Require API version header
      allowDeprecated: false,       # Reject deprecated versions
    },
  }
);
```

The wrapper automatically handles:
- Authentication (API key or session)
- Request validation (Zod schemas)
- API versioning validation
- Rate limiting headers
- Error formatting
- Audit logging
- Request/response tracking

#### Repository Pattern
- Domain layer defines repository interfaces (`core/domain/*/repository.ts`)
- Infrastructure layer implements repositories (`infrastructure/repositories/*.repository.impl.ts`)
- Repositories are injected via DI container

#### Background Jobs
- Uses BullMQ with Redis for job queuing
- Workers defined in `infrastructure/queue/workers/`
- Two main workers:
  - `metadata-ipfs-pin.worker.ts`: Pins metadata to IPFS
  - `media-ipfs-pin.worker.ts`: Pins media files to IPFS
- Jobs are added from use cases using `metadataQueue` and `mediaQueue`
- Workers run as separate process: `pnpm workers`

#### Caching Strategy
- Redis cache with Upstash client
- Cache service: `infrastructure/cache/cache.service.ts`
- Cache key builder for consistent key generation
- Cache-aside pattern for list queries
- Explicit cache invalidation on mutations

## Important Conventions

### Authentication & Authorization
- **API Key Authentication**: Header `x-api-key` or `Authorization: Bearer <key>`
- **Session Authentication**: Used for admin dashboard (Better Auth)
- **API Versioning**: Header `x-api-version` or `accept-version` (defaults to `v1`)
- **Scopes**: API keys have scopes (`metadata:read`, `metadata:write`, `media:read`, `media:write`)
- Admin endpoints require `adminOnly: true` in auth config

### Environment Variables
All required environment variables are validated at startup using Zod schema in `src/shared/config/env.ts`. Key variables:
- `DATABASE_URL`: PostgreSQL connection string
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`: Redis cache
- `IMAGEKIT_*`: Media processing service
- `PINATA_JWT` + `PINATA_GATEWAY_URL`: IPFS storage
- `BETTER_AUTH_SECRET` + `BETTER_AUTH_URL`: Authentication
- `CRON_SECRET`: Protects cron endpoints
- `CORS_ORIGINS`: Comma-separated allowed origins

### Database Migrations
1. Modify schemas in `src/infrastructure/database/drizzle/schema/`
2. Run `pnpm db:generate` to create migration files
3. Run `pnpm db:migrate` to apply migrations
4. Never use `pnpm db:push` in production

### Error Handling
- Use `tryCatch` wrapper from `@/shared/lib/utils/server` for async operations
- Throw `ApiError` for controlled errors with proper status codes
- All errors automatically logged and formatted by `ApiWrapper`

### Logging
- Structured logger in `src/shared/lib/utils/logger.ts`
- Levels: `debug`, `info`, `warn`, `error`
- Two types of logging:
  - Console logs (development debugging)
  - Audit logs to database (production tracking via `auditLogger`)

### Import Aliases
- `@/` maps to `src/`
- Always use TypeScript path aliases, never relative imports

### Metadata Standards
- Follows OpenSea metadata standard
- Required fields: `name`, `image`
- Optional: `description`, `animation_url`, `external_url`, `attributes`, `creators`
- Attributes: `{ trait_type: string, value: string | number }`
- Creators: `{ address: string, share: number }` (shares must sum to 100)

### API Response Format
All API responses use standardized format:
```typescript
// Success
{
  success: true,
  data: T,
  requestId: string
}

// Error
{
  success: false,
  error: {
    code: ErrorCode,
    message: string,
    details?: unknown
  },
  requestId: string
}
```

### IPFS Background Processing
- Metadata and media are pinned to IPFS asynchronously
- When creating metadata/media, jobs are queued (non-blocking)
- Workers process jobs and update `ipfsHash`, `isPinned`, `pinnedAt`
- Cron jobs can be triggered via `/api/cron/process-metadata-ipfs` and `/api/cron/process-media-ipfs` (requires `CRON_SECRET` header)

## Testing and Debugging

### Type Checking
Always run `pnpm typecheck` before committing. The project uses strict TypeScript settings.

### Development Workflow
1. Start database and Redis (local or cloud)
2. Run `pnpm db:migrate` to ensure schema is up to date
3. Start dev server: `pnpm dev`
4. Start workers (optional): `pnpm workers`
5. Access admin dashboard at `http://localhost:3000/admin`

### Health Checks
- Endpoint: `GET /api/health`
- Checks: Database, Redis, ImageKit, Pinata, BullMQ queues
- No authentication required

### Admin User
- Create with `pnpm db:create-admin`
- Uses `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.env`
- If `ADMIN_PASSWORD` is empty, password is auto-generated and logged

## Common Pitfalls

1. **Running workers separately**: Background IPFS jobs require `pnpm workers` to be running
2. **Missing API version header**: Most endpoints require `x-api-version` header (defaults to `v1`)
3. **Cache invalidation**: When updating entities, invalidate cache using `cache.invalidate(pattern)`
4. **Creator shares validation**: Creator shares must sum to exactly 100
5. **Authentication vs Authorization**: API key provides authentication; scopes provide authorization
6. **FormData vs JSON**: Media upload uses `multipart/form-data`, metadata uses `application/json`
7. **Database schema changes**: Always generate migrations, never use `db:push` in production
