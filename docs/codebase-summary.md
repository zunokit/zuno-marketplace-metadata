# Zuno Marketplace Metadata - Codebase Summary

## Overview

The Zuno Marketplace Metadata codebase is a production-ready Next.js 16 application built with TypeScript and Clean Architecture principles. It contains 203 TypeScript/TSX files organized across 5 major layers: application, domain logic, infrastructure, components, and utilities.

**Repository**: `E:\zuno-marketplace-metadata`
**Total Files**: 238 | **TypeScript Files**: 204 | **Total Tokens**: 233,500 | **Size**: ~1.0MB

---

## Directory Structure

```
E:\zuno-marketplace-metadata/
├── .claude/                              # Claude Code configuration
│   ├── agents/                          # Agent configurations
│   ├── commands/                        # Custom slash commands
│   ├── hooks/                           # Git hooks
│   ├── skills/                          # Reusable skills
│   ├── workflows/                       # Development workflows
│   ├── metadata.json
│   └── settings.json
├── .opencode/                           # OpenCode configuration
├── docs/                                # Documentation
├── public/                              # Static assets (SVG icons)
├── scripts/                             # Utility scripts
│   ├── create-admin.ts                 # Create admin user
│   ├── init-api-versions.ts            # Initialize API versions
│   └── test-all.ts                     # Run E2E test suite
├── src/                                 # Main source code
│   ├── app/                            # Next.js App Router
│   ├── components/                     # React components
│   ├── core/                           # Business logic (Clean Arch)
│   ├── hooks/                          # React custom hooks
│   ├── infrastructure/                 # External services & DB
│   ├── lib/                            # Utility libraries
│   └── shared/                         # Shared code & types
├── tests/                               # Test suite
│   ├── setup/                          # Jest configuration
│   ├── unit/                           # Unit tests
│   └── e2e/                            # Integration tests
├── CLAUDE.md                            # Project guidelines
├── README.md                            # Project readme
├── package.json                         # Dependencies & scripts
├── pnpm-lock.yaml                      # Dependency lock file
├── tsconfig.json                       # TypeScript configuration
├── next.config.ts                      # Next.js configuration
├── tailwind.config.ts                  # Tailwind CSS config
└── drizzle.config.ts                   # Drizzle ORM config
```

---

## File Inventory by Layer

### 1. Application Layer (`src/app/`)

**Admin Dashboard Pages**
- `src/app/admin/layout.tsx` - Admin layout wrapper with sidebar
- `src/app/admin/page.tsx` - Admin home/dashboard
- `src/app/admin/api-keys/page.tsx` - API key management UI
- `src/app/admin/api-keys/actions.ts` - Server actions for API keys
- `src/app/admin/api-versions/page.tsx` - API version management
- `src/app/admin/metadata/page.tsx` - Metadata browser/editor
- `src/app/admin/media/page.tsx` - Media browser and management
- `src/app/admin/audit-logs/page.tsx` - Audit log viewer
- `src/app/admin/audit-logs/actions.ts` - Audit log server actions
- `src/app/auth/signin/page.tsx` - Sign-in page

**API Routes (21 endpoints)**

*Metadata Management*
- `src/app/api/metadata/route.ts` - GET/POST metadata with pagination
- `src/app/api/metadata/batch/route.ts` - Batch create metadata
- `src/app/api/metadata/[id]/route.ts` - GET/PUT/DELETE single metadata

*Media Management*
- `src/app/api/media/route.ts` - GET/POST media files
- `src/app/api/media/batch/route.ts` - Batch upload media
- `src/app/api/media/[id]/route.ts` - GET/DELETE media

*Admin Operations*
- `src/app/api/admin/api-keys/route.ts` - Manage API keys
- `src/app/api/admin/api-keys/[id]/route.ts` - Update/delete keys
- `src/app/api/admin/api-versions/route.ts` - Manage API versions
- `src/app/api/admin/api-versions/[id]/route.ts` - Update versions

*System Operations*
- `src/app/api/auth/[...all]/route.ts` - Better Auth endpoints
- `src/app/api/health/route.ts` - Health check endpoint
- `src/app/api/docs/route.ts` - API documentation endpoint
- `src/app/api/cron/process-media-ipfs/route.ts` - Cron: Pin media
- `src/app/api/cron/process-metadata-ipfs/route.ts` - Cron: Pin metadata

**Main Pages**
- `src/app/layout.tsx` - Root layout wrapper
- `src/app/page.tsx` - Landing page
- `src/app/globals.css` - Global styles

### 2. Business Logic Layer (`src/core/`)

**Domain Entities**
```
src/core/domain/
├── api-key/                    # API key entity & repository
│   ├── api-key.entity.ts
│   └── api-key.repository.ts
├── api-version/                # API version entity & repository
├── audit-log/                  # Audit log entity & repository
├── cache/                      # Cache interface
├── media/                      # Media entity & repository
│   ├── media.entity.ts
│   └── media.repository.ts
└── metadata/                   # Metadata entity & repository
    ├── metadata.entity.ts
    └── metadata.repository.ts
```

**Services** (Query builders & business logic)
```
src/core/services/
├── audit-log/audit-log.service.ts         # Audit log operations
├── media/media-query.service.ts            # Media query building
└── metadata/metadata-query.service.ts      # Metadata query building
```

**Use Cases** (Application layer logic)
```
src/core/use-cases/
├── api-key/
│   ├── create-api-key.use-case.ts
│   ├── delete-api-key.use-case.ts
│   ├── list-api-keys.use-case.ts
│   └── update-api-key.use-case.ts
├── api-version/
│   ├── create-api-version.use-case.ts
│   ├── delete-api-version.use-case.ts
│   ├── list-api-versions.use-case.ts
│   └── update-api-version.use-case.ts
├── health/
│   └── health-check.use-case.ts
├── media/
│   ├── batch-upload-media.use-case.ts
│   ├── delete-media.use-case.ts
│   ├── get-media.use-case.ts
│   ├── list-media.use-case.ts
│   └── upload-media.use-case.ts
└── metadata/
    ├── batch-create-metadata.use-case.ts
    ├── delete-metadata.use-case.ts
    ├── get-metadata.use-case.ts
    ├── list-metadata.use-case.ts
    └── update-metadata.use-case.ts
```

### 3. Infrastructure Layer (`src/infrastructure/`)

**Authentication**
- `src/infrastructure/auth/better-auth.config.ts` - Better Auth setup
- `src/infrastructure/auth/auth.client.ts` - Auth client
- `src/infrastructure/auth/auth-helpers.ts` - Helper functions


**Database (PostgreSQL + Drizzle)**
```
src/infrastructure/database/
├── client.ts                    # Database client singleton
└── drizzle/
    ├── migrations/              # SQL migration files (4 migrations)
    │   ├── 0000_third_christian_walker.sql
    │   ├── 0001_convert_api_key_jsonb_to_text.sql
    │   ├── 0002_add_performance_indexes.sql
    │   └── 0003_add_user_ownership.sql
    └── schema/
        ├── user.schema.ts       # Better Auth user table
        ├── session.schema.ts    # Session table
        ├── account.schema.ts    # OAuth account linking
        ├── verification.schema.ts # Email verification
        ├── api-key.schema.ts    # API keys with permissions
        ├── metadata.schema.ts   # NFT metadata
        ├── media.schema.ts      # Media files
        ├── audit-logs.schema.ts # Audit trail
        ├── api-versions.schema.ts # API versioning
        ├── rate-limit.schema.ts # Rate limiting
        └── index.ts             # Schema exports
```

**Cache (Redis)**
- `src/infrastructure/cache/redis.client.ts` - Redis client (Upstash)
- `src/infrastructure/cache/cache.service.ts` - Cache operations

**External Services**
```
src/infrastructure/services/
├── api-key.service.ts          # API key hashing & validation
├── imagekit.service.ts         # ImageKit image processing
├── rate-limit.service.ts       # Redis-backed rate limiting
└── pinata/                     # IPFS pinning service
    ├── pinata.client.ts        # Pinata API client
    ├── pinata.config.ts        # Configuration
    ├── pinata.constants.ts     # Constants
    └── pinata.service.ts       # Business logic
```

**Job Queue (BullMQ)**
```
src/infrastructure/queue/
├── queue.config.ts             # Queue configuration
└── workers/
    ├── index.ts                # Worker initialization
    ├── media-ipfs-pin.worker.ts # Pin media files to IPFS
    └── metadata-ipfs-pin.worker.ts # Pin metadata JSON to IPFS
```

**Repositories** (Data access layer)
```
src/infrastructure/repositories/
├── api-key.repository.impl.ts
├── api-version.repository.impl.ts
├── audit-log.repository.impl.ts
├── media.repository.impl.ts
└── metadata.repository.impl.ts
```

**Dependency Injection**
- `src/infrastructure/di/container.ts` - DI container with factories

**Monitoring**
- `src/infrastructure/monitoring/audit-logger.ts` - Request audit logging

### 4. Components Layer (`src/components/`)

**Feature Components** (Business-specific)
```
src/components/feature/
├── api-key/
│   ├── api-key-form-dialog.tsx
│   ├── api-key-delete-dialog.tsx
│   ├── api-key-view-dialog.tsx
│   └── api-key-table-columns.tsx
├── api-version/
│   ├── api-version-form-dialog.tsx
│   ├── api-version-delete-dialog.tsx
│   └── api-version-table-columns.tsx
├── audit-log/
│   └── audit-log-table-columns.tsx
├── media/
│   └── media-table-columns.tsx
└── metadata/
    └── metadata-table-columns.tsx
```

**UI Components** (50+ Shadcn/Radix)
- Buttons, inputs, dialogs, forms, tables, cards, etc.
- Located in `src/components/ui/`

**Layout Components**
- `src/components/admin-sidebar.tsx` - Admin navigation sidebar
- `src/components/query-provider.tsx` - TanStack Query provider

**Data Components**
- `src/components/data-table.tsx` - Reusable data table with TanStack Table

**Home Page Components**
- `src/components/home/HeroSection.tsx`
- `src/components/home/UploadSection.tsx`
- `src/components/home/UploadedItemsSection.tsx`
- `src/components/home/UploadedItemCard.tsx`

### 5. Shared/Utilities Layer (`src/shared/`)

**Validation Schemas** (Zod)
```
src/shared/lib/validation/
├── api-key.schemas.ts
├── api-version.schemas.ts
├── auth.schemas.ts
├── media.schemas.ts
└── metadata.schemas.ts
```

**DTOs** (Data Transfer Objects)
```
src/shared/dto/
├── api-key.dto.ts
├── media.dto.ts
└── metadata.dto.ts
```

**API Utilities**
```
src/shared/lib/api/
├── api-handler.ts              # Unified API handler wrapper
├── error-formatter.ts          # Error response formatting
├── error-messages.ts           # Standardized error messages
└── request-context.ts          # Request context management
```

**Utility Functions**
```
src/shared/lib/utils/
├── logger.ts                   # Structured logging
├── api-version.ts              # API versioning helpers
├── id-generator.ts             # Unique ID generation
├── cron-auth.ts                # Cron job authentication
├── drizzle-helpers.ts          # ORM query helpers
├── date.ts                     # Date utilities
├── url.ts                      # URL utilities
├── server.ts                   # Server-side utilities
├── try-catch-wrapper.ts        # Error handling wrapper
├── client.ts                   # Client-side utilities
└── sentry-helpers.ts           # Sentry webhook utilities
```

**Configuration**
```
src/shared/config/
├── env.ts                      # Environment validation
└── file-size.config.ts         # File size limits
```

**Constants & Types**
- `src/shared/constants/sample.ts` - Sample data
- `src/shared/types/index.ts` - Global type definitions

### 6. Hooks (`src/hooks/`)

React custom hooks for API operations:
- `use-metadata.ts` - Metadata CRUD hooks
- `use-media.ts` - Media upload/delete hooks
- `use-api-keys.ts` - API key management hooks
- `use-audit-logs.ts` - Audit log querying
- `use-api-versions.ts` - API version management
- `use-mobile.ts` - Mobile detection hook

### 7. Test Suite (`tests/`)

**Jest Configuration**
- `tests/setup/jest.config.js` - Jest configuration
- `tests/setup/jest.setup.js` - Test environment setup

**Unit Tests**
- Test files for use cases, utilities, validation

**E2E Tests** (200+ integration tests)
- 18 test suites covering API endpoints
- Auth, validation, error handling, performance tests

---

## Technology Stack Breakdown

### Frontend Framework
| Package | Version | Purpose |
|---------|---------|---------|
| next | 16.0.7 | React framework with SSR |
| react | 19.2.0 | UI library |
| react-dom | 19.2.0 | DOM rendering |
| typescript | 5 | Type safety |

### State Management & Data
| Package | Version | Purpose |
|---------|---------|---------|
| @tanstack/react-query | 5.90.5 | Server state management |
| @tanstack/react-table | 8.21.3 | Headless data tables |
| react-hook-form | 7.65.0 | Form state |

### Styling
| Package | Version | Purpose |
|---------|---------|---------|
| tailwindcss | 4 | Utility-first CSS |
| tailwind-merge | 3.3.1 | Merge class names |
| class-variance-authority | 0.7.1 | Component variants |

### UI Components
| Package | Version | Purpose |
|---------|---------|---------|
| @radix-ui/* | Latest | Headless UI components |
| lucide-react | 0.546.0 | Icon library |
| sonner | 2.0.7 | Toast notifications |
| date-fns | 4.1.0 | Date utilities |

### Forms & Validation
| Package | Version | Purpose |
|---------|---------|---------|
| zod | 4.1.12 | Schema validation |
| @hookform/resolvers | 5.2.2 | Form validation integration |

### Database & ORM
| Package | Version | Purpose |
|---------|---------|---------|
| drizzle-orm | 0.44.6 | Type-safe ORM |
| postgres | 3.4.7 | PostgreSQL client |

### External Services
| Package | Version | Purpose |
|---------|---------|---------|
| better-auth | 1.3.29 | Authentication framework |
| bullmq | 5.61.0 | Job queue |
| @upstash/redis | 1.35.6 | Serverless Redis |
| imagekit | 6.0.0 | Media processing |
| @imagekit/next | 2.1.3 | ImageKit Next.js integration |
| pinata | 2.5.1 | IPFS pinning |
| @sentry/nextjs | 9.0.0 | Error monitoring and tracking |

### Development Tools
| Package | Version | Purpose |
|---------|---------|---------|
| eslint | 9 | Code linting |
| jest | 30.2.0 | Test framework |
| ts-jest | 29.4.5 | TypeScript jest support |
| drizzle-kit | 0.31.5 | ORM migrations |

---

## Data Flow

### Request Flow (API)
```
Request
  ↓
[API Route Handler] → src/app/api/[endpoint]/route.ts
  ↓
[ApiWrapper] → src/shared/lib/api/api-handler.ts
  ├─ Auth validation (API key or session)
  ├─ Rate limiting check
  ├─ Input validation (Zod schema)
  └─ Audit logging
  ↓
[Use Case] → src/core/use-cases/[domain]/[operation].ts
  ├─ Business logic
  └─ Domain validation
  ↓
[Repository] → src/infrastructure/repositories/[domain].impl.ts
  ├─ Database query via Drizzle ORM
  └─ Cache operations
  ↓
[External Services]
  ├─ ImageKit (media CDN)
  ├─ Pinata IPFS (decentralized storage)
  └─ Redis (cache, rate limit)
  ↓
Response (formatted as JSON)
```

### Background Job Flow
```
API Request creates job
  ↓
[BullMQ] → Enqueue job
  ↓
[Worker] → src/infrastructure/queue/workers/*.ts
  ├─ media-ipfs-pin.worker.ts
  └─ metadata-ipfs-pin.worker.ts
  ↓
[Pinata Service] → Pin to IPFS
  ↓
[Database] → Update CID and status
```

### Authentication Flow
```
Request with API Key
  ↓
[Api Handler] → Extract from header
  ↓
[API Key Service] → Hash and validate
  ├─ Check key exists in database
  ├─ Verify permissions (scopes)
  └─ Apply rate limiting
  ↓
[Request Context] → Attach user/key info
  ↓
[Audit Logger] → Log request
```

### Caching Strategy
```
Metadata/Media Request
  ↓
[Cache Service] → Check Redis
  ├─ If found → Return cached
  └─ If miss → Query database
  ↓
[Set Cache] → Store with TTL (default 5min)
  ↓
[Update/Delete] → Invalidate cache key
```

---

## Database Schema Overview

### Tables (10)
| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `users` | User accounts | id, name, email |
| `sessions` | Auth sessions | id, userId, expiresAt |
| `accounts` | OAuth accounts | id, userId, provider |
| `verifications` | Email verification | id, identifier, token |
| `api_keys` | API authentication | id, keyHash, permissions |
| `metadata` | NFT metadata | id, name, image, attributes |
| `media` | Uploaded files | id, fileName, mimeType, url |
| `audit_logs` | Request audit trail | id, userId, method, path |
| `api_versions` | Version tracking | id, version, releaseDate |
| `rate_limits` | Rate limit tracking | id, keyId, count, resetAt |

### Relationships
```
users ──→ sessions, accounts, api_keys, metadata, media, audit_logs
api_keys ──→ rate_limits
metadata ──→ audit_logs (via user)
media ──→ audit_logs (via user)
```

---

## Key Integration Points

### 1. ImageKit (Media CDN)
- **File**: `src/infrastructure/services/imagekit.service.ts`
- **Purpose**: Upload, optimize, and serve media files
- **Operations**: Upload, transform, delete

### 2. Pinata IPFS
- **Files**: `src/infrastructure/services/pinata/*`
- **Purpose**: Decentralized, immutable storage
- **Operations**: Pin files, check status, list pins

### 3. Redis (Cache & Queue)
- **Files**:
  - `src/infrastructure/cache/redis.client.ts`
  - `src/infrastructure/queue/queue.config.ts`
- **Purpose**: In-memory caching and job queue
- **Operations**: Get, set, delete (cache); enqueue, process (jobs)

### 4. PostgreSQL (Database)
- **Files**: `src/infrastructure/database/*`
- **Purpose**: Primary data store
- **ORM**: Drizzle for type-safe queries

### 5. Better Auth (Authentication)
- **Files**: `src/infrastructure/auth/*`
- **Purpose**: Session-based auth for admin dashboard
- **Features**: Email/password, OAuth, API key plugin

### 6. Sentry (Error Monitoring)
- **Integration**: Native Sentry GitHub integration
- **Documentation**: https://docs.sentry.io/organization/integrations/source-code-mgmt/github/
- **Purpose**: Error tracking with automatic GitHub issue creation
- **Features**:
  - `@sentry/nextjs` SDK for Next.js applications
  - Native GitHub integration via Sentry dashboard
  - Automatic error capture and tracking
  - Release tracking and deployment monitoring
  - Performance monitoring with transaction traces

---

## Code Statistics

### File Counts
- **Total Files**: 237
- **TypeScript/TSX**: 203
- **API Routes**: 20
- **Components**: 80+ (50+ UI, 20+ feature)
- **Use Cases**: 15+
- **Repositories**: 5
- **Test Files**: 7+

### Code Metrics
- **Total Tokens**: 233,000
- **Largest File**: `scripts/test-all.ts` (19,069 tokens)
- **Largest Module**: `src/app/api/docs/route.ts` (8,025 tokens)

### Test Coverage
- **Unit Tests**: 9+ files (including Sentry tests)
- **E2E Tests**: 18 suites with 200+ tests
- **Coverage Target**: >80%

---

## Build Configuration

### Next.js (`next.config.ts`)
- Image optimization for external domains
- API routes with clean architecture
- Middleware support for auth

### TypeScript (`tsconfig.json`)
- Strict mode enabled
- ES2017 target
- Module resolution: bundler
- Path aliases: `@/*` → `src/*`

### Tailwind (`tailwind.config.ts`)
- Version 4 (latest)
- PostCSS integration

### Drizzle (`drizzle.config.ts`)
- PostgreSQL driver
- Migration folder configuration
- Schema management

---

## Entry Points

### Application Entry
- **Development**: `pnpm dev` → Next.js dev server
- **Production**: `pnpm build && pnpm start`
- **Workers**: `pnpm workers` → BullMQ workers

### API Documentation
- **Endpoint**: `GET /api/docs`
- **File**: `src/app/api/docs/route.ts`
- **Content**: OpenAPI-compatible API spec

### Admin Dashboard
- **URL**: `http://localhost:3000/admin`
- **Layout**: `src/app/admin/layout.tsx`
- **Auth**: Session-based via Better Auth

---

## Development Utilities

### Scripts
| Script | Purpose |
|--------|---------|
| `pnpm dev` | Start dev server |
| `pnpm build` | Production build |
| `pnpm typecheck` | Type check |
| `pnpm lint` | ESLint check |
| `pnpm test` | Run unit tests |
| `pnpm test:e2e` | Run integration tests |
| `pnpm workers` | Start background workers |
| `pnpm db:generate` | Generate migrations |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:studio` | Open Drizzle Studio (GUI) |
| `pnpm db:create-admin` | Create admin user |

### Debugging
- **Logger**: Structured logging in `src/shared/lib/utils/logger.ts`
- **Error Handling**: Error formatter in `src/shared/lib/api/error-formatter.ts`
- **Audit Logs**: Complete request audit trail in database

---

## Performance Characteristics

### Metrics
- **API Latency (p95)**: <200ms for metadata ops
- **Cache Hit Rate**: >80% with 5min TTL
- **Throughput**: 1000+ req/sec per instance
- **Batch Operations**: Up to 1000 items/request

### Optimization Points
- Redis caching for frequently accessed metadata
- Database indexes on common queries
- Connection pooling via Drizzle
- ImageKit CDN for media delivery
- IPFS pinning via background workers

---

## Known Issues & TODOs

None documented at time of repository scan. Check issues in `.claude/status.txt` or GitHub issues.

---

**Document Version**: 1.2 | **Last Updated**: 2025-12-27 | **Codebase Version**: 0.1.0
