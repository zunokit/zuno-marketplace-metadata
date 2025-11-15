# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Zuno Marketplace Metadata Management System is an NFT metadata API platform built with Next.js 16, TypeScript, and Clean Architecture. It provides OpenSea-compatible metadata management with IPFS storage, media processing, and background job processing.

**Key Capabilities:**
- RESTful API for NFT metadata and media management
- Automatic IPFS pinning with Pinata integration
- Real-time IPFS status polling (5-second intervals on homepage)
- ImageKit CDN for media processing and optimization
- Redis-backed caching with intelligent invalidation
- BullMQ job queues for async operations
- Scope-based API key authentication
- Session-based admin dashboard with Better Auth
- Comprehensive audit logging and monitoring
- Cron-job.org integration for scheduled IPFS processing

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
- Cache-aside pattern (`getOrSet`) for list queries
- Explicit cache invalidation on mutations

**Cache TTL Configuration** (in seconds):
- `METADATA_ITEM`: 300s (5 minutes) - frequently accessed
- `METADATA_LIST`: 120s (2 minutes) - changes more often
- `MEDIA_ITEM`: 600s (10 minutes) - rarely changes
- `MEDIA_LIST`: 120s (2 minutes)
- `API_KEY_LIST`: 300s (5 minutes)
- `API_VERSION`: 900s (15 minutes)

**Cache Invalidation Patterns**:
- **On mutation** (create/update/delete): Invalidates specific item + all list caches
  - Example: Creating metadata invalidates `metadata:item:{id}` and `metadata:list:*`
- **On IPFS pinning** (cron jobs): Invalidates specific item cache
  - Ensures fresh IPFS URLs are immediately available
  - Prevents stale `ipfsHash` and `ipfsUrl` values
- **Namespace isolation**: Uses prefixes (`metadata:`, `media:`, `apikey:`) to prevent collisions

**Implementation**:
```typescript
// Invalidate specific item + all lists
await cache.invalidateMetadata(itemId);

// Pattern-based invalidation
await cache.invalidatePattern("metadata:list:*");
```

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

The system uses a **hybrid approach** combining BullMQ workers and cron-triggered batch processing:

#### Cron Job Endpoints (Recommended)
- **Metadata Pinning**: `GET /api/cron/process-metadata-ipfs`
  - Processes up to 10 unpinned metadata items per run
  - Uploads JSON to Pinata IPFS
  - Updates database with `ipfsHash`, `ipfsUrl`, `isPinned`, `pinnedAt`
  - **Invalidates cache** after successful pinning (prevents stale data)

- **Media Pinning**: `GET /api/cron/process-media-ipfs`
  - Processes up to 5 unpinned media files per run (larger file sizes)
  - Fetches files from ImageKit and uploads to Pinata
  - Updates database with IPFS information
  - **Invalidates cache** after successful pinning

**Security**: Both endpoints require `Authorization: Bearer ${CRON_SECRET}` header

**Trigger Schedule**: Configure at [cron-job.org](https://cron-job.org)
- Recommended: Every 5-15 minutes for metadata
- Recommended: Every 10-30 minutes for media (larger files)

#### BullMQ Workers (Alternative)
- Workers can be run with `pnpm workers`
- Two worker types: `metadata-ipfs-pin.worker.ts` and `media-ipfs-pin.worker.ts`
- Jobs are queued when creating metadata/media
- Useful for development or self-hosted deployments

#### Real-time IPFS Status Updates
- **Homepage Auto-refresh**: Frontend polls unpinned items every 5 seconds (src/app/page.tsx:43-99)
- Provides real-time feedback as cron jobs process items
- Uses `cache: "no-store"` to bypass Next.js cache
- Automatically stops polling when all items are pinned

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

### Admin Dashboard
The admin dashboard (`http://localhost:3000/admin`) provides a web interface for managing the system:

**Dashboard Pages**:
- **Home** (`/admin`): Overview with system statistics and quick links
  - Total API keys, metadata items, media files
  - System health status (all services)
  - Environment information

- **API Keys** (`/admin/api-keys`): Manage API access
  - Create new API keys with custom scopes
  - View, edit, and revoke existing keys
  - Track last used timestamp and request count

- **Metadata** (`/admin/metadata`): Browse and manage metadata
  - List all metadata entries with pagination
  - View IPFS status (pinned/unpinned)
  - Edit and delete metadata items

- **Media** (`/admin/media`): Manage media files
  - Browse uploaded media files
  - View ImageKit and IPFS URLs
  - Track media types and file sizes

- **API Versions** (`/admin/api-versions`): Manage API versioning
  - View all API versions
  - Mark versions as current or deprecated
  - Configure version compatibility

- **Audit Logs** (`/admin/audit-logs`): Security and compliance
  - View all API requests with timestamps
  - Filter by user, method, path, status
  - Track request/response metadata

**Authentication**: Admin dashboard uses session-based auth via Better Auth
- Login at `/admin` (redirects to auth flow)
- Protected routes require admin role
- API endpoints accessed via session (no API key needed)

## Common Pitfalls

1. **IPFS processing options**: Choose either cron jobs (recommended for production) OR BullMQ workers (development/self-hosted)
   - **Cron jobs**: Easier deployment, no separate worker process needed
   - **BullMQ workers**: Requires `pnpm workers` to be running separately
   - Don't forget to set `CRON_SECRET` and configure cron-job.org triggers

2. **Missing API version header**: Most endpoints require `x-api-version` header (defaults to `v1`)

3. **Cache invalidation after IPFS pinning**:
   - Cron endpoints automatically invalidate cache after successful pinning
   - If manually updating IPFS fields, always call `cache.invalidateMetadata(id)` or `cache.invalidateMedia(id)`
   - List caches are invalidated with pattern: `metadata:list:*` or `media:list:*`

4. **Creator shares validation**: Creator shares must sum to exactly 100

5. **Authentication vs Authorization**:
   - API key provides authentication; scopes provide authorization
   - Admin dashboard uses session auth (Better Auth)
   - Cron endpoints require `CRON_SECRET` bearer token

6. **FormData vs JSON**: Media upload uses `multipart/form-data`, metadata uses `application/json`

7. **Database schema changes**: Always generate migrations, never use `db:push` in production
   - Modify schemas in `src/infrastructure/database/drizzle/schema/`
   - Run `pnpm db:generate` to create migration
   - Run `pnpm db:migrate` to apply migration

8. **Batch size limits**:
   - Metadata IPFS cron: 10 items per run
   - Media IPFS cron: 5 items per run (larger files)
   - Adjust `BATCH_SIZE` constants if needed

9. **Homepage polling**:
   - Frontend auto-refreshes unpinned items every 5 seconds
   - Uses `cache: "no-store"` to bypass Next.js cache
   - Polling stops automatically when all items are pinned

## Technology Stack

### Frontend
- **Next.js 16.0.0**: App Router, Server Components, API Routes
- **React 19.2.0**: Latest React with concurrent features
- **TypeScript 5**: Strict mode enabled for type safety
- **Tailwind CSS 4**: Utility-first styling with custom configuration
- **Radix UI**: Accessible, unstyled component primitives (40+ components)
- **Tanstack Query 5**: Data fetching, caching, and synchronization
- **Tanstack Table 8**: Powerful table/data grid functionality
- **React Hook Form 7**: Performant form management with validation
- **Zod 4**: TypeScript-first schema validation
- **Lucide React**: Icon library with 1000+ icons

### Backend & Infrastructure
- **Drizzle ORM 0.44.6**: Type-safe ORM with PostgreSQL
- **PostgreSQL**: Primary database (via Supabase or self-hosted)
- **Upstash Redis**: Serverless Redis for caching and rate limiting
- **BullMQ 5**: Redis-based job queue for background processing
- **Better Auth 1.3.29**: Modern authentication framework
- **ImageKit 6**: Media CDN with optimization and transformations
- **Pinata 2.5.1**: IPFS pinning service with gateway access

### DevOps & Tooling
- **pnpm**: Fast, disk-efficient package manager
- **tsx**: TypeScript execution for scripts and workers
- **ESLint 9**: Linting with Next.js configuration
- **Drizzle Kit 0.31.5**: Database migration toolkit

### External Services
- **[Cron-job.org](https://cron-job.org)**: Scheduled IPFS processing triggers
- **[ImageKit.io](https://imagekit.io)**: Media processing and CDN
- **[Pinata.cloud](https://pinata.cloud)**: IPFS pinning and gateway
- **[Upstash](https://upstash.com)**: Serverless Redis (optional)
- **[Supabase](https://supabase.com)**: PostgreSQL hosting (optional)

## Recent Enhancements

### October 2024: IPFS Auto-Refresh and Cache Invalidation
**Commit**: `8956630 - Enhance IPFS auto-refresh and cache invalidation`

**Changes**:
1. **Homepage Real-time Polling** (src/app/page.tsx)
   - Polls unpinned metadata every 5 seconds for status updates
   - Provides immediate feedback as cron jobs process IPFS pinning
   - Automatically stops when all items are pinned
   - Uses `cache: "no-store"` to bypass Next.js cache

2. **Cache Invalidation in Cron Endpoints**
   - `/api/cron/process-metadata-ipfs`: Calls `cache.invalidateMetadata(id)` after pinning
   - `/api/cron/process-media-ipfs`: Calls `cache.invalidateMedia(id)` after pinning
   - Prevents stale IPFS URLs in cached responses
   - Ensures immediate availability of fresh data

3. **Improved User Experience**
   - Users see IPFS URLs appear in real-time without page refresh
   - Admin dashboard reflects latest IPFS status immediately
   - No manual cache clearing needed

**Impact**: Significantly improved responsiveness and eliminated stale data issues

### Admin Dashboard Enhancements
- Added Cron-job.org label to homepage features (commit `0a090c2`)
- Improved visual indicators for IPFS pinning status
- Enhanced audit log filtering and display

## File Locations Reference

### Core Business Logic
- **Domain Entities**: `src/core/domain/{metadata,media,audit-log}/`
- **Use Cases**: `src/core/use-cases/{metadata,media,api-key,api-version,health}/`
- **Domain Services**: `src/core/services/{metadata,media,audit-log}/`

### Infrastructure
- **Database Schemas**: `src/infrastructure/database/drizzle/schema/`
- **Repositories**: `src/infrastructure/repositories/*.repository.impl.ts`
- **Cache Service**: `src/infrastructure/cache/cache.service.ts` + `redis.client.ts`
- **Queue Workers**: `src/infrastructure/queue/workers/{metadata,media}-ipfs-pin.worker.ts`
- **External Services**:
  - ImageKit: `src/infrastructure/services/imagekit.service.ts`
  - Pinata: `src/infrastructure/services/pinata/`
  - Rate Limiting: `src/infrastructure/services/rate-limit.service.ts`
  - API Key Validation: `src/infrastructure/services/api-key.service.ts`

### API Routes
- **Metadata**: `src/app/api/metadata/` (CRUD + batch operations)
- **Media**: `src/app/api/media/` (upload + batch)
- **Admin**: `src/app/api/admin/` (api-keys, versions)
- **Cron**: `src/app/api/cron/` (IPFS processing)
- **Health**: `src/app/api/health/route.ts`
- **Auth**: `src/app/api/auth/` (Better Auth integration)

### Shared Utilities
- **API Handler Wrapper**: `src/shared/lib/api/api-handler.ts`
- **Validation Schemas**: `src/shared/lib/validation/`
- **Error Handling**: `src/shared/lib/api/error.ts`
- **Logging**: `src/shared/lib/utils/logger.ts`
- **Environment Config**: `src/shared/config/env.ts`

### Admin Dashboard
- **Layout**: `src/app/admin/layout.tsx`
- **Pages**: `src/app/admin/{page,api-keys,metadata,media,api-versions,audit-logs}/page.tsx`
- **Components**: `src/components/` (UI components, forms, tables)

### Scripts
- **Create Admin**: `scripts/create-admin.ts`
- **Init API Versions**: `scripts/init-api-versions.ts`
- **Test Runner**: `scripts/test-all.ts`
