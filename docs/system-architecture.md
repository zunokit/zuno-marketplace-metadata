# Zuno Marketplace Metadata - System Architecture

## Architecture Overview

Zuno Marketplace Metadata follows a **Clean Architecture** pattern with clear separation of concerns across 5 major layers. The system is designed for scalability, maintainability, and enterprise-grade reliability.

```
┌────────────────────────────────────────────────────┐
│         API Gateway / Next.js App Router           │
├────────────────────────────────────────────────────┤
│                                                    │
│    ┌─────────────────────────────────────────┐    │
│    │    Application Layer (API Routes)       │    │
│    │  - Route handlers                       │    │
│    │  - Request/response formatting          │    │
│    │  - Authentication & authorization       │    │
│    └─────────────────────────────────────────┘    │
│                      ↓                              │
│    ┌─────────────────────────────────────────┐    │
│    │    Use Cases (Business Logic)           │    │
│    │  - Operations (Create, Read, Update)    │    │
│    │  - Business rule validation             │    │
│    │  - Service composition                  │    │
│    └─────────────────────────────────────────┘    │
│                      ↓                              │
│    ┌─────────────────────────────────────────┐    │
│    │    Domain Layer (Entities)              │    │
│    │  - Domain models                        │    │
│    │  - Repository interfaces                │    │
│    │  - Business rules validation            │    │
│    └─────────────────────────────────────────┘    │
│                      ↓                              │
│    ┌─────────────────────────────────────────┐    │
│    │    Infrastructure Layer (Adapters)      │    │
│    │  - Repository implementations           │    │
│    │  - External service integration         │    │
│    │  - Database operations                  │    │
│    │  - Cache operations                     │    │
│    │  - Queue operations                     │    │
│    └─────────────────────────────────────────┘    │
│                      ↓                              │
│    ┌─────────────────────────────────────────┐    │
│    │    External Services & Data Stores      │    │
│    │  - PostgreSQL Database                  │    │
│    │  - Redis Cache                          │    │
│    │  - ImageKit CDN                         │    │
│    │  - Pinata IPFS                          │    │
│    │  - Better Auth                          │    │
│    │  - BullMQ Job Queue                     │    │
│    │  - Sentry (Error Monitoring)            │    │
│    └─────────────────────────────────────────┘    │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## Layer Breakdown

### 1. Application Layer (`src/app/`)

**Responsibility**: Handle HTTP requests and delegate to business logic.

#### API Route Handlers
All routes follow the `ApiWrapper` pattern:

```
Request
  ↓
[ApiWrapper] (src/shared/lib/api/api-handler.ts)
  ├─ Extract auth credentials
  ├─ Validate input against schema
  ├─ Check permissions/scopes
  ├─ Apply rate limiting
  └─ Prepare request context
  ↓
[Handler Function]
  ├─ Instantiate use case
  ├─ Call use case.execute()
  └─ Format response
  ↓
Response (JSON with status code)
```

#### Route Organization
- **Metadata**: `GET/POST /api/metadata`, `POST /api/metadata/batch`, `GET/PUT/DELETE /api/metadata/[id]`
- **Media**: `GET/POST /api/media`, `POST /api/media/batch`, `GET/DELETE /api/media/[id]`
- **Admin**: `GET/POST/DELETE /api/admin/api-keys/[id]`, `GET/POST/DELETE /api/admin/api-versions/[id]`
- **System**: `GET /api/health`, `GET /api/docs`, `POST /api/auth/[...all]`
- **Cron Jobs**: `POST /api/cron/process-media-ipfs`, `POST /api/cron/process-metadata-ipfs`
- **Sentry**:
  - `POST /api/sentry/webhook` - Receives Sentry alert webhooks
  - `GET /api/test/sentry-error` - Test endpoint for error capture (development only)

#### Admin Dashboard Pages
- **Login**: `/auth/signin`
- **Dashboard**: `/admin` (home)
- **API Keys**: `/admin/api-keys`
- **Metadata**: `/admin/metadata`
- **Media**: `/admin/media`
- **API Versions**: `/admin/api-versions`
- **Audit Logs**: `/admin/audit-logs`

### 2. Use Cases Layer (`src/core/use-cases/`)

**Responsibility**: Orchestrate business logic and coordinate domain entities.

#### Pattern
Each use case follows this structure:

```typescript
export class [Operation][Entity]UseCase {
  constructor(
    private repository: [Entity]Repository,
    private service?: [Service],
    private cache?: CacheService
  ) {}

  async execute(input: [Operation]Input): Promise<[Operation]Output> {
    // 1. Validate input
    // 2. Call repository/service methods
    // 3. Compose result
    // 4. Invalidate cache
    // 5. Return output
  }
}
```

#### Use Cases by Domain

**Metadata Use Cases**
- `GetMetadataUseCase` - Fetch single metadata by ID
- `ListMetadataUseCase` - List with filtering/pagination
- `CreateMetadataUseCase` - Create single metadata
- `BatchCreateMetadataUseCase` - Create up to 1000 items
- `UpdateMetadataUseCase` - Update metadata fields
- `DeleteMetadataUseCase` - Delete metadata and associated data

**Media Use Cases**
- `UploadMediaUseCase` - Upload single file to ImageKit
- `BatchUploadMediaUseCase` - Batch upload files
- `GetMediaUseCase` - Fetch media details
- `ListMediaUseCase` - List media with pagination
- `DeleteMediaUseCase` - Delete media and clean up

**API Key Use Cases**
- `CreateApiKeyUseCase` - Generate new API key
- `ListApiKeysUseCase` - List keys for current user
- `UpdateApiKeyUseCase` - Update key permissions/status
- `DeleteApiKeyUseCase` - Revoke API key

**API Version Use Cases**
- `CreateApiVersionUseCase` - Define new API version
- `ListApiVersionsUseCase` - List all versions
- `UpdateApiVersionUseCase` - Update version properties
- `DeleteApiVersionUseCase` - Deprecate version

**System Use Cases**
- `HealthCheckUseCase` - Check all service dependencies

### 3. Domain Layer (`src/core/domain/`)

**Responsibility**: Define domain models and repository interfaces.

#### Domain Entities

**Metadata Entity**
```typescript
interface Metadata {
  id: string;                    // Unique identifier
  name: string;                  // NFT name
  description?: string;          // NFT description
  image: string;                 // Primary image URL
  animation_url?: string;        // Animation/video URL
  external_url?: string;         // External marketplace link
  attributes?: MetadataAttribute[];
  creators?: Creator[];
  ipfs_hash?: string;            // IPFS CID
  imagekit_id?: string;          // ImageKit file ID
  userId: string;                // Owner user ID
  createdAt: Date;
  updatedAt: Date;
}
```

**Media Entity**
```typescript
interface Media {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;                   // CDN URL (ImageKit)
  imagekit_id: string;           // ImageKit file ID
  ipfs_hash?: string;            // IPFS CID
  alt?: string;
  userId: string;                // Uploader user ID
  createdAt: Date;
  updatedAt: Date;
}
```

**API Key Entity**
```typescript
interface ApiKey {
  id: string;
  keyHash: string;               // Hashed key (bcrypt)
  displayKey?: string;           // First 8 chars + ***
  name: string;
  scopes: Permission[];          // ['metadata:read', 'metadata:write']
  userId: string;                // Key owner
  isActive: boolean;
  lastUsedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

**Audit Log Entity**
```typescript
interface AuditLog {
  id: string;
  userId?: string;               // User or API key owner
  apiKeyId?: string;
  method: string;                // GET, POST, etc.
  path: string;                  // /api/metadata
  statusCode: number;            // HTTP status
  duration: number;              // ms
  ipAddress: string;
  userAgent: string;
  requestBody?: Record<string, any>;
  responseBody?: Record<string, any>;
  errorMessage?: string;
  createdAt: Date;
}
```

#### Repository Interfaces

Each entity has a repository interface defining the contract:

```typescript
export interface MetadataRepository {
  findById(id: string): Promise<Metadata | null>;
  findMany(filters: MetadataFilter): Promise<Metadata[]>;
  create(data: MetadataInput): Promise<Metadata>;
  update(id: string, data: Partial<Metadata>): Promise<Metadata>;
  delete(id: string): Promise<void>;
  count(filters?: MetadataFilter): Promise<number>;
}
```

### 4. Infrastructure Layer (`src/infrastructure/`)

**Responsibility**: Implement domain interfaces and integrate external services.

#### 4.1 Database (`src/infrastructure/database/`)

**Technology**: PostgreSQL + Drizzle ORM

**Tables**
| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `users` | User accounts (Better Auth) | id, email, name, emailVerified |
| `sessions` | Active sessions | id, userId, expiresAt |
| `accounts` | OAuth account links | id, userId, provider |
| `verifications` | Email verification tokens | id, identifier, token |
| `api_keys` | API authentication | id, keyHash, scopes, userId |
| `metadata` | NFT metadata | id, name, image, userId, ipfs_hash |
| `media` | Uploaded files | id, fileName, url, userId, ipfs_hash |
| `audit_logs` | Request audit trail | id, userId, method, path, statusCode |
| `api_versions` | API versions | id, version, releaseDate, status |
| `rate_limits` | Rate limit tracking | id, keyId, count, resetAt |

**Connection Pool**
- Managed by Drizzle ORM
- Maximum connections configured per environment
- Connection pooling for performance

**Migrations**
- Located in `src/infrastructure/database/drizzle/migrations/`
- 4 migrations applied in sequence:
  1. Initial schema creation
  2. API key JSONB to text conversion
  3. Performance indexes
  4. User ownership fields

#### 4.2 Cache (`src/infrastructure/cache/`)

**Technology**: Redis (Upstash for serverless)

**Usage Pattern**
```
Request for metadata
  ↓
[Cache Service]
  ├─ Get cache key: `metadata:{id}`
  ├─ If exists → Return cached value
  └─ If miss → Query database
  ↓
[Cache Set]
  ├─ Store result with TTL
  └─ Default TTL: 5 minutes
```

**Cache Keys**
```
metadata:{id}                    # Single metadata (5min TTL)
metadata:list                    # Metadata list queries (2min TTL)
media:{id}                       # Single media file (5min TTL)
media:list                       # Media list (2min TTL)
api-key:{keyHash}               # API key lookup (1hour TTL)
rate-limit:{keyId}:{window}     # Rate limit counter (per window)
```

**Invalidation Strategy**
- Create/Update/Delete operations invalidate related cache keys
- Time-based expiration for all entries
- Manual invalidation for list queries

#### 4.3 Authentication (`src/infrastructure/auth/`)

**Framework**: Better Auth v1

**Features**
- Email/password authentication
- OAuth providers (Google, GitHub, etc.)
- API key authentication
- Session management (httpOnly cookies)
- Email verification

**Flow**
```
Admin User
  ↓
[Sign-in Page] (POST /api/auth/sign-in)
  ├─ Validate email/password
  ├─ Generate session token
  └─ Set httpOnly cookie
  ↓
[Session Check] (on every admin request)
  ├─ Verify cookie validity
  ├─ Check session expiry
  └─ Attach user to request context
```

**API Key Flow**
```
External API Request
  ↓
[Authorization Header] (Bearer: {raw_key})
  ├─ Extract key from header
  ├─ Hash key (bcrypt)
  └─ Look up in database
  ↓
[Key Validation]
  ├─ Verify key exists
  ├─ Check scopes/permissions
  ├─ Verify not expired
  └─ Not rate limited
  ↓
[Request Context] ← Attach key info
```

#### 4.4 Media Processing (`src/infrastructure/services/imagekit.service.ts`)

**Service**: ImageKit (image CDN and processing)

**Operations**
```
File Upload
  ↓
[ImageKit Upload]
  ├─ Validate file type/size
  ├─ Upload to ImageKit
  ├─ Receive file ID + CDN URL
  └─ Return to client
  ↓
[Database] ← Store metadata
  ├─ file_id: ImageKit ID
  ├─ url: CDN URL
  └─ mime_type
```

**Supported Formats**
- Images: JPG, PNG, WebP, GIF, SVG
- Videos: MP4, WebM, MOV, AVI
- Max size: 100MB per file

**CDN Benefits**
- Global content delivery
- Automatic image optimization
- Format conversion (WebP, etc.)
- Quality adjustment
- Responsive image generation

#### 4.5 Decentralized Storage (`src/infrastructure/services/pinata/`)

**Service**: Pinata (IPFS pinning)

**Process**
```
Metadata/Media Created
  ↓
[Enqueue Job] → BullMQ
  ├─ Job type: 'pin-metadata' or 'pin-media'
  └─ Payload: {id, content}
  ↓
[Background Worker]
  ├─ Fetch content from database
  ├─ Call Pinata API
  ├─ Receive IPFS CID
  └─ Update database
  ↓
[CID Stored]
  ├─ ipfs_hash field
  ├─ Immutable reference
  └─ Tamper-proof verification
```

**Benefits**
- Content-addressed storage (CID = hash of content)
- Immutable - can't be altered
- Decentralized - redundant across network
- Verifiable - can validate content against CID

#### 4.6 Sentry Integration (Error Monitoring)

**Service**: Sentry Webhook Alerts + GitHub Issue Automation

**Webhook Handler Flow**
```
Sentry Alert Triggered
  ↓
[Sentry] → POST /api/sentry/webhook
  ├─ Headers: sentry-hook-signature
  └─ Body: {event_id, fingerprint, exception, ...}
  ↓
[Signature Verification]
  ├─ Extract signature from header
  ├─ Compute HMAC-SHA256 of payload
  ├─ timingSafeEqual comparison
  └─ 401 if invalid
  ↓
[Parse Payload]
  ├─ Extract error details
  ├─ Get fingerprint (deduplication key)
  ├─ Get stack trace
  └─ Get request context
  ↓
[Async Processing] (non-blocking)
  ├─ Return 200 OK immediately
  └─ Process in background
  ↓
[SentryIssueService.processWebhook()]
  ├─ [Environment Check]
  │  └─ Skip non-production errors
  ├─ [Deduplication Check]
  │  └─ SentryDedupService.getIssue(fingerprint)
  │     ├─ If exists → Return existing issue
  │     └─ If not found → Continue
  ├─ [Create GitHub Issue]
  │  └─ GitHubClient.createIssue({
  │       title, body (markdown), labels
  │     })
  ├─ [Store Fingerprint]
  │  └─ SentryDedupService.storeFingerprint(
  │       fingerprint, issueRef, TTL=30days
  │     )
  └─ [Log Success]
```

**Security**
- HMAC-SHA256 signature verification
- Timing-safe comparison prevents timing attacks
- Webhook secret: `SENTRY_WEBHOOK_SECRET` env var
- Returns 401 for invalid signatures
- Returns 500 if secret not configured
- Production-only error filtering

**GitHub Integration**
- **Octokit Client**: Wrapper for GitHub REST API
- **Issue Creation**: Automatic GitHub issue creation for production errors
- **Deduplication**: Redis-based with 30-day TTL to prevent duplicate issues
- **Labels**: Configurable via `GITHUB_ISSUE_LABEL` (default: "sentry,error,production")
- **Rate Limits**: GitHub API: 5000 requests/hour
- **Markdown Formatting**: Structured issue bodies with error details, stack traces, and context

**Deduplication Service**
```
Redis Key Pattern: sentry:fingerprint:{fingerprint}
TTL: 30 days
Value: {
  issueNumber: number,
  issueUrl: string,
  createdAt: ISO datetime
}
```

**Data Extraction**
- `getFingerprint()` - Deduplication key
- `getErrorTitle()` - Type:Value format
- `getStackTrace()` - Module:Function:Line format
- `getRequestContext()` - URL, method, user-agent, API key ID

**Environment Variables**
| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `SENTRY_WEBHOOK_SECRET` | Yes | - | Webhook signature verification |
| `GITHUB_TOKEN` | Yes | - | GitHub personal access token |
| `GITHUB_REPO` | No | zunokit/zuno-marketplace-metadata | Target repository |
| `GITHUB_ISSUE_LABEL` | No | sentry,error,production | Issue labels |

**Test Endpoint** (`GET /api/test/sentry-error`)
- **Purpose**: Test endpoint for validating Sentry alert flow
- **Environment**: Development only (returns 403 in production)
- **Response**: JSON with test confirmation and instructions
- **Usage**: Trigger a test error to verify:
  1. Sentry receives the error
  2. Alert fires
  3. Webhook is called
  4. GitHub issue is created
- **Important**: Remove this endpoint after testing is complete

```
GET /api/test/sentry-error (development only)
  ↓
[Sentry.captureException()]
  ├─ Creates test error with tags
  └─ Sends to Sentry
  ↓
[Response]
  └─ 200 + confirmation message
```

#### 4.7 Job Queue (`src/infrastructure/queue/`)

**Technology**: BullMQ (Redis-backed)

**Workers**
1. **media-ipfs-pin.worker.ts** - Pin media files to IPFS
2. **metadata-ipfs-pin.worker.ts** - Pin metadata JSON to IPFS

**Worker Flow**
```
Worker Process
  ↓
[Queue Consumer]
  ├─ Listen for jobs
  └─ Process with concurrency limit
  ↓
[Job Handler]
  ├─ Execute worker logic
  ├─ Update database on success
  └─ Retry on failure (exponential backoff)
  ↓
[Job Completion]
  ├─ Move to completed queue
  └─ Log in audit trail
```

**Deployment**
- Runs in separate process: `pnpm workers`
- Must be deployed independently of API server
- Recommended: Docker container or separate cloud instance

#### 4.8 Rate Limiting (`src/infrastructure/services/rate-limit.service.ts`)

**Algorithm**: Token bucket (Redis-backed)

**Configuration**
```
Per API Key:
  - 1000 requests per hour
  - 100 requests per minute
  - 10 requests per second
```

**Flow**
```
API Request with Key
  ↓
[Rate Limit Check]
  ├─ Get bucket counter from Redis
  ├─ Check against limits
  ├─ Update counter
  └─ Set TTL
  ↓
If exceeded → 429 Too Many Requests
If under limit → Allow request
```

**Headers**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1702184400
```

#### 4.9 Repositories (`src/infrastructure/repositories/`)

**Implements**: Domain repository interfaces

**Example - MetadataRepositoryImpl**
```
Domain Interface (Metadata)
  ↓
Implementation (MetadataRepositoryImpl)
  ├─ Query builder (Drizzle)
  ├─ Cache operations
  ├─ Index management
  └─ Transaction handling
  ↓
Database operations
```

**Pattern**
- One implementation per domain entity
- All queries go through repository
- No direct database access elsewhere
- Cache-aware operations

#### 4.10 Monitoring (`src/infrastructure/monitoring/`)

**Audit Logger**
- Logs all API requests to database
- Records: method, path, user, status, duration, IP, user agent
- Enables compliance and debugging

---

## Authentication & Authorization

### Multi-Auth Strategy

#### Admin Dashboard (Session-Based)
```
User Login
  ↓
[Better Auth]
  ├─ Email/password validation
  ├─ Generate session
  └─ Set httpOnly cookie
  ↓
[Subsequent Requests]
  ├─ Cookie automatically sent
  ├─ Session verified
  └─ User attached to context
  ↓
[Protected Routes]
  └─ Only /admin/* require session
```

#### External API (API Key-Based)
```
API Request
  ↓
[Header Extraction]
  ├─ Authorization: Bearer {key}
  ├─ Or: X-API-Key: {key}
  └─ Or: Session cookie (hybrid)
  ↓
[Key Validation]
  ├─ Hash and lookup in database
  ├─ Check scopes/permissions
  ├─ Check rate limits
  └─ Verify not expired
  ↓
[Request Context]
  └─ Attach API key ID and scopes
```

### Permission Scopes

**Metadata Operations**
- `metadata:read` - List, get metadata
- `metadata:write` - Create, update, delete metadata

**Media Operations**
- `media:read` - List, get media files
- `media:write` - Upload, delete media

**Admin Operations**
- `admin:keys` - Manage API keys (admin only)
- `admin:versions` - Manage API versions (admin only)
- `admin:logs` - Access audit logs (admin only)

### Permission Enforcement

```
API Request with key
  ↓
[ApiWrapper]
  ├─ Extract required scopes
  ├─ Check key has scopes
  ├─ 403 Forbidden if missing
  └─ Otherwise continue
  ↓
[Use Case Executes]
```

---

## Caching Strategy

### Cache Tiers

**Tier 1: Application Memory** (Next.js)
- In-process cache for short-lived data
- Per-instance (not shared)
- Used for request deduplication

**Tier 2: Redis Cache**
- Shared across instances
- TTL-based expiration
- LRU eviction when full

### Cache Hierarchy
```
Request for metadata
  ↓
[Memory Cache] → Check local cache
  ├─ Found → Return (zero latency)
  └─ Miss → Redis cache
  ↓
[Redis Cache] → Check distributed cache
  ├─ Found → Return + update local
  └─ Miss → Database query
  ↓
[Database Query] → Expensive operation
  ├─ Execute query
  ├─ Update Redis
  └─ Update local cache
```

### TTL Configuration

| Entity | TTL | Reason |
|--------|-----|--------|
| Metadata item | 5 min | Frequently accessed |
| Media file | 5 min | CDN also caches |
| List queries | 2 min | Changes more frequent |
| API keys | 1 hour | Less frequent validation |
| User sessions | 24 hour | Long-lived |

### Cache Invalidation

**Automatic (Time-based)**
- Every item expires after TTL
- Database is source of truth

**Manual (Event-based)**
```
When metadata created
  ├─ Invalidate metadata:list
  └─ Cache new item for 5min

When metadata updated
  ├─ Invalidate metadata:{id}
  └─ Invalidate metadata:list

When metadata deleted
  ├─ Delete metadata:{id}
  └─ Invalidate metadata:list
```

---

## Background Job Processing

### BullMQ Architecture

```
API Route
  ↓
[Enqueue Job]
  ├─ Create job object
  ├─ Add to Redis queue
  └─ Return immediately to client
  ↓
[Job Processing]
  ├─ Worker listens to queue
  ├─ Dequeue job
  ├─ Execute handler
  ├─ Update database
  └─ Mark complete
```

### Job Types

**1. Pin Metadata to IPFS**
```
Trigger: Metadata create/update
Payload: { metadataId: string }
Handler:
  ├─ Fetch metadata from DB
  ├─ Call Pinata API
  ├─ Update ipfs_hash
  └─ Log in audit trail
```

**2. Pin Media to IPFS**
```
Trigger: Media upload
Payload: { mediaId: string }
Handler:
  ├─ Fetch media from DB
  ├─ Call Pinata API
  ├─ Update ipfs_hash
  └─ Send webhook notification
```

### Job Reliability

**Retry Strategy**
```
Job fails
  ↓
[Exponential Backoff]
  ├─ Attempt 1: Retry after 5s
  ├─ Attempt 2: Retry after 25s
  ├─ Attempt 3: Retry after 125s
  └─ Attempt 4: Retry after 625s
  ↓
After 4 failed attempts
  ├─ Move to failed queue
  ├─ Alert admin
  └─ Manual retry needed
```

**Monitoring**
```
Health Check Endpoint
  ├─ Check queue size
  ├─ Count failed jobs
  ├─ Check worker health
  └─ Return status
```

---

## Data Flow Diagrams

### Create Metadata Flow
```
POST /api/metadata
  │
  ├─ [ApiWrapper]
  │  ├─ Verify API key
  │  ├─ Validate schema
  │  └─ Check rate limits
  │
  ├─ [CreateMetadataUseCase]
  │  ├─ Validate business rules
  │  └─ Call repository
  │
  ├─ [MetadataRepositoryImpl]
  │  ├─ Generate ID
  │  ├─ Insert to PostgreSQL
  │  └─ Invalidate cache
  │
  ├─ [Enqueue IPFS Job]
  │  └─ Add to BullMQ
  │
  └─ [Response]
     └─ 201 + metadata
```

### Upload Media Flow
```
POST /api/media
  │
  ├─ [ApiWrapper]
  │  ├─ Verify auth
  │  ├─ Validate file
  │  └─ Check rate limits
  │
  ├─ [UploadMediaUseCase]
  │  ├─ Validate size/type
  │  ├─ Call ImageKit service
  │  └─ Store metadata
  │
  ├─ [ImageKit Service]
  │  ├─ Upload file
  │  ├─ Receive CDN URL
  │  └─ Return file ID
  │
  ├─ [MediaRepositoryImpl]
  │  ├─ Insert to PostgreSQL
  │  └─ Cache result
  │
  ├─ [Enqueue IPFS Job]
  │  └─ Pin media file
  │
  └─ [Response]
     └─ 201 + media data
```

### List Metadata Flow
```
GET /api/metadata?page=1&limit=20
  │
  ├─ [ApiWrapper]
  │  ├─ Verify auth
  │  ├─ Parse query params
  │  └─ Check rate limits
  │
  ├─ [ListMetadataUseCase]
  │  ├─ Build query filters
  │  ├─ Check cache first
  │  └─ Call repository if miss
  │
  ├─ [MetadataQueryService]
  │  ├─ Build WHERE clause
  │  ├─ Add ORDER BY
  │  └─ Add LIMIT/OFFSET
  │
  ├─ [MetadataRepositoryImpl]
  │  ├─ Execute Drizzle query
  │  ├─ Cache result
  │  └─ Return list
  │
  └─ [Response]
     ├─ 200 + items
     ├─ meta.total (count)
     └─ meta.page (current page)
```

### Health Check Flow
```
GET /api/health
  │
  ├─ [HealthCheckUseCase]
  │  ├─ Check PostgreSQL
  │  ├─ Check Redis
  │  ├─ Check ImageKit
  │  ├─ Check Pinata
  │  ├─ Check BullMQ queue
  │  └─ Aggregate results
  │
  └─ [Response]
     ├─ 200 if all healthy
     ├─ 503 if critical service down
     └─ services: { database, redis, imagekit, pinata, queue }
```

### Sentry Webhook Flow
```
POST /api/sentry/webhook
  │
  ├─ [Extract Signature]
  │  └─ sentry-hook-signature header
  │
  ├─ [Read Raw Payload]
  │  └─ await request.text()
  │
  ├─ [Verify Signature]
  │  ├─ Compute HMAC-SHA256(payload, SENTRY_WEBHOOK_SECRET)
  │  ├─ timingSafeEqual(signature, computed)
  │  └─ 401 if invalid
  │
  ├─ [Parse Payload]
  │  ├─ Extract: event_id, fingerprint, exception, request
  │  └─ SentryWebhookPayload type
  │
  ├─ [Async Processing]
  │  ├─ Return 200 OK immediately
  │  └─ SentryIssueService.processWebhook(payload, requestId)
  │     │
  │     ├─ [Environment Check]
  │     │  └─ Skip if environment !== "production"
  │     │
  │     ├─ [Extract Data]
  │     │  ├─ getFingerprint(event)
  │     │  ├─ getErrorTitle(event)
  │     │  ├─ getStackTrace(event)
  │     │  └─ getRequestContext(event)
  │     │
  │     ├─ [Deduplication Check]
  │     │  └─ SentryDedupService.getIssue(fingerprint)
  │     │     ├─ If exists → Log and return existing issue
  │     │     └─ If not found → Continue
  │     │
  │     ├─ [Create GitHub Issue]
  │     │  └─ GitHubClient.createIssue({
  │     │       title: "🚨 Error:Type",
  │     │       body: markdown (error, stack, context),
  │     │       labels: ["sentry", "error", "production"]
  │     │     })
  │     │
  │     ├─ [Store Fingerprint]
  │     │  └─ SentryDedupService.storeFingerprint(
  │     │       fingerprint, issueRef, TTL=30days
  │     │     )
  │     │
  │     └─ [Log Success]
  │        └─ logger.info("Created GitHub issue")
  │
  └─ [Response]
     └─ 200 OK (immediate, async processing)
```

---

## API Versioning Strategy

### Version Header Support

**Headers**
```
x-api-version: v1
or
accept-version: v1
```

### Version Tracking

**Database Table**
```
api_versions {
  id: string
  version: string           // "v1", "v2", etc.
  releaseDate: Date
  status: "active" | "deprecated" | "sunset"
  deprecatedAt?: Date
  sunsettedAt?: Date
  changelog?: string
}
```

### Backward Compatibility

- Major changes → New version
- Additive changes → Same version
- Breaking changes → Document migration path
- Deprecation notice → 90-day minimum

---

## Database Relationships

```
users
  ├─ 1 → ∞ sessions
  ├─ 1 → ∞ accounts
  ├─ 1 → ∞ api_keys
  ├─ 1 → ∞ metadata
  ├─ 1 → ∞ media
  └─ 1 → ∞ audit_logs

api_keys
  └─ 1 → ∞ rate_limits

metadata
  ├─ ∞ ← 1 users
  └─ ∞ → ∞ audit_logs (via user_id)

media
  ├─ ∞ ← 1 users
  └─ ∞ → ∞ audit_logs (via user_id)
```

---

## Scalability Considerations

### Horizontal Scaling

**Stateless API Tier**
- Multiple Next.js instances
- Load balanced (Vercel, Railway, etc.)
- Shared PostgreSQL
- Shared Redis

**Separate Worker Tier**
- Multiple BullMQ worker instances
- Shared Redis queue
- Shared PostgreSQL
- Independent scaling

### Database Optimization

**Indexes**
- Primary keys (automatic)
- Foreign keys (automatic)
- Query filters (userId, createdAt, status)
- Full-text search (future)

**Connection Pooling**
- Drizzle manages pool
- Configurable pool size
- Auto-reconnect on failure

### Caching Strategy

**Cache Layers**
1. Local memory (per instance)
2. Redis (distributed)
3. ImageKit CDN (media files)
4. Browser cache (if applicable)

### Rate Limiting

**Per API Key**
- Redis-backed counters
- Time-window based
- Automatic reset
- Real-time enforcement

---

## Deployment Architecture

### Development Environment
```
Localhost
  ├─ Next.js dev server (3000)
  ├─ PostgreSQL (local or Docker)
  ├─ Redis (local or Docker)
  └─ Workers (separate terminal)
```

### Production Environment
```
Production
  ├─ API Tier
  │  ├─ Multiple Next.js instances
  │  ├─ Load balancer (Vercel, Railway)
  │  └─ Auto-scaling
  ├─ Database Tier
  │  ├─ PostgreSQL (managed)
  │  ├─ Backups
  │  └─ Replication (optional)
  ├─ Cache Tier
  │  ├─ Redis (Upstash)
  │  ├─ HA cluster (optional)
  │  └─ Auto-failover
  ├─ Worker Tier
  │  ├─ Multiple BullMQ workers
  │  └─ Auto-scaling
  ├─ External Services
  │  ├─ ImageKit CDN
  │  ├─ Pinata IPFS
  │  ├─ Better Auth
  │  └─ Monitoring
  └─ DNS/CDN
     ├─ DNS routing
     └─ DDoS protection (optional)
```

---

## Error Handling Architecture

```
Error Thrown
  │
  ├─ Custom error class?
  │  ├─ Yes → Extract code + status
  │  └─ No → Generic 500 error
  │
  ├─ Log error
  │  ├─ Level: error/warn/info
  │  ├─ Context: request ID, user
  │  └─ Stack trace (in dev)
  │
  ├─ Format response
  │  ├─ Code: error identifier
  │  ├─ Message: user-friendly
  │  └─ Details: context (optional)
  │
  └─ Send response
     └─ Appropriate HTTP status
```

---

## Monitoring & Observability

### Health Checks

**Endpoint**: `GET /api/health`

**Checks**
1. PostgreSQL connectivity (SELECT 1)
2. Redis connectivity (PING)
3. ImageKit API availability
4. Pinata IPFS availability
5. BullMQ queue health

**Response**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2025-12-10T10:00:00Z",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "imagekit": "healthy",
    "pinata": "healthy",
    "queue": "healthy"
  }
}
```

### Audit Logging

**All Requests Logged**
```
POST /api/metadata
  ├─ User/API Key ID
  ├─ Method + path
  ├─ Request body (sanitized)
  ├─ Response status
  ├─ Duration
  ├─ IP address
  ├─ User agent
  └─ Stored in audit_logs table
```

### Structured Logging

**Levels**
- `debug` - Development only
- `info` - Request/response tracking
- `warn` - Non-critical issues
- `error` - Critical errors

---

## Security Architecture

### Authentication
- Multi-auth: Sessions + API keys
- Better Auth framework
- Hashed API keys (bcrypt)
- Secure cookie handling

### Authorization
- Permission scopes per API key
- Role-based access (admin)
- Endpoint protection

### Input Validation
- Zod schemas on all inputs
- File type/size validation
- SQL injection prevention (ORM)
- XSS prevention (output sanitization)

### Rate Limiting
- Token bucket algorithm
- Per API key basis
- Redis-backed counters
- Real-time enforcement

### Data Protection
- TLS for all connections
- Hashed sensitive data
- Environment variable secrets
- No plaintext passwords/keys

### Audit Trail
- Complete request logging
- IP tracking
- User identification
- Compliance-ready

---

**Document Version**: 1.2 | **Last Updated**: 2025-12-27 | **Architecture Version**: Clean Architecture v1
