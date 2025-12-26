# Zuno Marketplace Metadata - Project Overview & PDR

## Executive Summary

**Zuno Marketplace Metadata** is an enterprise-grade NFT metadata management platform designed to simplify the creation, storage, and retrieval of NFT metadata across decentralized and traditional marketplaces. Built with Next.js 16, TypeScript, and Clean Architecture principles, it provides a production-ready solution for NFT marketplace operators and developers who need OpenSea/Magic Eden-compatible metadata APIs with decentralized storage.

**Status**: Production-Ready | **Current Version**: 0.1.0 | **Tech Stack**: Next.js 16, TypeScript, PostgreSQL, Redis, IPFS

---

## Product Vision & Goals

### Vision
Enable NFT marketplace operators and developers to programmatically manage NFT metadata with enterprise-grade reliability, security, and performance while maintaining compatibility with industry standards.

### Primary Goals
1. **Standardization** - Provide OpenSea/Magic Eden-compatible metadata format
2. **Reliability** - 99.9% uptime SLA with comprehensive health monitoring
3. **Scalability** - Support high-volume metadata operations (100K+ items)
4. **Decentralization** - IPFS integration for tamper-proof content addressing
5. **Developer Experience** - RESTful APIs with clear documentation and SDKs
6. **Security** - Enterprise-grade auth, encryption, and audit logging

---

## Core Features & Capabilities

### 1. NFT Metadata Management API
- **CRUD Operations** - Create, read, update, delete metadata
- **Batch Operations** - Bulk create/update up to 1000 items per request
- **Pagination & Filtering** - List with sorting, searching, pagination
- **Versioning** - API versioning support (v1+)
- **OpenSea Standard** - Industry-standard metadata format

**Key Endpoints**:
- `GET /api/metadata` - List with pagination
- `POST /api/metadata` - Create single
- `POST /api/metadata/batch` - Bulk create
- `GET /api/metadata/{id}` - Get by ID
- `PUT /api/metadata/{id}` - Update
- `DELETE /api/metadata/{id}` - Delete

### 2. Media Processing & CDN
- **ImageKit Integration** - Auto image optimization, transcoding, CDN delivery
- **Upload Management** - Direct file upload with validation
- **Batch Upload** - Process multiple files efficiently
- **Format Support** - Images (JPG, PNG, WebP, GIF), Videos (MP4, WebM)

**Key Endpoints**:
- `GET /api/media` - List media files
- `POST /api/media` - Upload single file
- `POST /api/media/batch` - Batch upload
- `GET /api/media/{id}` - Get media details
- `DELETE /api/media/{id}` - Delete file

### 3. Decentralized Storage
- **IPFS via Pinata** - Immutable, content-addressed storage
- **Automatic Pinning** - Background workers pin metadata & media
- **Pinning Strategy** - Both metadata JSON and media files supported
- **CID Management** - Track content identifiers for tamper-proof verification

### 4. API Key Management
- **Scoped Permissions** - Fine-grained access control
- **Permission Types** - `metadata:read`, `metadata:write`, `media:read`, `media:write`
- **Key Rotation** - Easy key management and rotation
- **Usage Tracking** - Monitor API key usage via audit logs

**Permissions**:
```
metadata:read   - Read metadata and list operations
metadata:write  - Create, update, delete metadata
media:read      - Read media files and list
media:write     - Upload and delete media
```

### 5. Admin Dashboard
- **Web UI** - Modern React-based interface with Radix UI
- **API Key Management** - Create, view, rotate, delete keys
- **Metadata Editor** - Browse and edit metadata
- **Media Browser** - View and manage media files
- **Audit Log Viewer** - Track all API requests and changes
- **API Version Management** - Configure API versions

### 6. Authentication & Authorization
- **Multi-Auth Support** - API keys for external apps, sessions for admin
- **Better Auth Integration** - Modern auth framework with email/password
- **Session Management** - Secure cookie-based sessions for dashboard
- **Role-Based Access** - Admin-only dashboard endpoints

### 7. Monitoring & Observability
- **Health Check Endpoint** - Monitor all service dependencies
- **Comprehensive Logging** - Structured logs (debug, info, warn, error)
- **Audit Trail** - Complete request logging with user identification
- **Performance Metrics** - Request duration, error rates, etc.

**Health Check Services**:
- PostgreSQL database
- Redis cache
- ImageKit integration
- Pinata IPFS
- BullMQ job queue

### 8. Background Job Processing
- **BullMQ Queue** - Reliable asynchronous job processing
- **IPFS Pinning Workers** - Background metadata & media pinning
- **Job Retries** - Automatic retry with exponential backoff
- **Monitoring** - Queue health visible in health checks

### 9. Error Monitoring (Sentry Integration)
- **Sentry SDK** - @sentry/nextjs for error tracking
- **Webhook Handler** - POST /api/sentry/webhook for alert processing
- **Signature Verification** - HMAC-SHA256 with timing-safe comparison
- **Async Processing** - Non-blocking webhook response
- **GitHub Integration** - Automatic issue creation via Octokit
- **Deduplication** - Redis-based fingerprint tracking (30-day TTL)
- **Production Filtering** - Only create issues for production errors
- **Markdown Formatting** - Structured GitHub issue bodies with error details

---

## Technical Requirements

### Infrastructure Requirements

#### Core Services
| Service | Minimum | Recommended | Purpose |
|---------|---------|------------|---------|
| **Node.js** | 18 | 20+ | Runtime |
| **PostgreSQL** | 14 | 15+ | Primary database |
| **Redis** | 7 | 7+ | Cache & queue |
| **pnpm** | 8 | 9+ | Package manager |

#### External Services
| Service | Purpose | Pricing Model |
|---------|---------|---------------|
| **ImageKit** | Media CDN & processing | Pay-as-you-go |
| **Pinata** | IPFS pinning service | Usage-based |
| **Upstash** (optional) | Serverless Redis | Pay-per-request |
| **Sentry** | Error monitoring & tracking | Free tier available |
| **GitHub** | Issue automation | Free tier available |

### Technology Stack

```
Frontend:
  - Next.js 16 (App Router)
  - React 19
  - TypeScript 5
  - Radix UI components
  - Tailwind CSS
  - TanStack Query v5
  - TanStack Table v8

Backend:
  - Next.js API Routes
  - TypeScript
  - Clean Architecture
  - Zod validation

Database:
  - PostgreSQL
  - Drizzle ORM
  - 10+ tables (users, metadata, media, keys, logs)

Infrastructure:
  - Redis (Upstash)
  - BullMQ (job queue)
  - ImageKit (media CDN)
  - Pinata (IPFS)
  - Better Auth
  - Sentry (error monitoring)
  - Octokit (GitHub API client)

DevOps:
  - Docker (containerization)
  - Vercel/Railway (deployment)
  - GitHub Actions (CI/CD)
```

### API Requirements
- **REST API** - Stateless, JSON-based
- **Versioning** - Accept via `x-api-version` or `accept-version` header
- **Authentication** - Bearer token (API key) or session
- **CORS** - Configurable origins
- **Rate Limiting** - Redis-backed per API key
- **Error Handling** - Consistent error responses

### Performance Requirements
- **API Latency** - <200ms for metadata operations (p95)
- **Throughput** - 1000+ requests/sec per instance
- **Cache TTL** - Configurable per entity (default 5min)
- **Batch Limit** - 1000 items per batch operation
- **File Size Limit** - 100MB max per media file

### Security Requirements
- **Encryption** - TLS 1.3 for all communications
- **API Keys** - Hashed with bcrypt
- **Input Validation** - Zod schemas on all inputs
- **SQL Injection Protection** - Parameterized queries via ORM
- **XSS Protection** - Output sanitization
- **CORS Protection** - Configurable allowed origins
- **Rate Limiting** - Token bucket algorithm
- **Audit Logging** - All API requests logged to database

---

## Target Users & Use Cases

### Primary Users
1. **NFT Marketplace Operators** - Create/manage metadata for collections
2. **Blockchain Developers** - Integrate metadata into smart contracts
3. **Enterprise Clients** - Bulk metadata management with audit trail
4. **Content Creators** - Upload and manage NFT media assets

### Use Cases

#### Use Case 1: Single Collection Launch
Marketplace operator needs to upload 10,000 NFT metadata files for a new collection.
- Batch create metadata via API
- Upload media files to ImageKit
- Pin to IPFS for immutability
- Monitor progress via health checks
- Expected: 5-10 minutes completion

#### Use Case 2: Multi-Marketplace Distribution
Creator distributes same NFT to OpenSea, Magic Eden, and custom platform.
- Create metadata once
- OpenSea-compatible format automatically
- Use API keys for access control
- Track usage via audit logs

#### Use Case 3: Metadata Updates
Update royalty information across entire collection.
- Batch update via API
- Audit trail of all changes
- Automatic IPFS pinning of new versions
- Version tracking for compliance

#### Use Case 4: Programmatic Integration
DeFi protocol integrates metadata into smart contract calls.
- Dedicated API key with limited permissions
- Rate limiting and monitoring
- Automated backups via IPFS

---

## Success Metrics

### Adoption Metrics
- **API Keys Created** - Track active integrations
- **Monthly API Calls** - Volume indicator
- **Batch Operations** - Large-scale user adoption
- **Active Collections** - Number of managed collections
- **Marketplace Compatibility** - Verified OpenSea/Magic Eden support

### Performance Metrics
- **API Latency** (p95) - <200ms
- **Uptime** - 99.9% SLA
- **Cache Hit Rate** - >80%
- **Error Rate** - <0.1%
- **IPFS Pin Success Rate** - >99%

### Business Metrics
- **User Adoption** - Track new API keys per week
- **Retention** - Active API key retention rate
- **Support Tickets** - Track support burden reduction
- **Data Integrity** - Audit log completeness

### Quality Metrics
- **Test Coverage** - >80% code coverage
- **Security** - Zero critical vulnerabilities
- **Documentation** - 100% API endpoint coverage
- **Performance** - 99th percentile latency <500ms

---

## Roadmap & Future Enhancements

### Phase 1: MVP (Current - v0.1.0)
- Core metadata CRUD APIs
- Media upload with ImageKit
- API key authentication
- Admin dashboard basics
- Health checks
- Audit logging
- IPFS integration

### Phase 2: Scaling (v0.2.0)
- Metadata templates for faster creation
- Advanced filtering and search
- Webhook support for async operations
- Batch update operations
- Advanced caching strategies
- Performance optimizations

### Phase 3: Enterprise (v0.3.0)
- Multi-tenant support
- Advanced RBAC (role-based access control)
- SSO integration (SAML, OAuth)
- White-label options
- Advanced analytics dashboard
- SLA tracking and reporting

### Phase 4: Integration (v0.4.0)
- Marketplace sync (OpenSea, Magic Eden, etc.)
- Smart contract integration
- GraphQL API support
- SDK libraries (JS, Python, Go, Rust)
- Webhook retry mechanisms
- Advanced royalty management

### Phase 5: AI/ML Features (Future)
- Metadata auto-generation from images
- AI-powered content recommendations
- Automatic duplicate detection
- Metadata quality scoring
- Natural language search

---

## Deployment Targets

### Supported Platforms
1. **Vercel** - Recommended for Next.js (requires separate worker hosting)
2. **Railway** - Full-stack hosting with workers
3. **Docker** - Self-hosted containerized deployment
4. **Cloud Platforms** - AWS/GCP/Azure via Docker

### Infrastructure Considerations
- **Scalability** - Stateless API servers, separate worker tier
- **Database** - PostgreSQL with replication for HA
- **Cache** - Redis cluster for distributed caching
- **Storage** - S3-compatible storage for media staging
- **CDN** - ImageKit handles media CDN

---

## Constraints & Limitations

### Current Limitations
- **Batch Size** - Limited to 1000 items per batch operation
- **File Size** - Max 100MB per media file
- **Rate Limiting** - Per API key basis (not per IP)
- **Geolocation** - Single-region deployment initially
- **Webhooks** - Not yet implemented

### Future Considerations
- Multi-region failover
- Real-time metadata sync via WebSockets
- GraphQL API in addition to REST
- Direct blockchain integration
- More IPFS providers (Estuary, Web3.Storage, etc.)

---

## Success Definition

A successful Zuno Marketplace Metadata platform will:

1. **Support Thousands of Concurrent Users** - Handle 1000+ API keys with reliable service
2. **Maintain Industry Standards** - 100% OpenSea/Magic Eden format compatibility
3. **Achieve Enterprise Reliability** - 99.9% uptime SLA
4. **Enable Fast Integrations** - Developers can integrate in <1 hour
5. **Provide Complete Visibility** - Full audit trail and monitoring
6. **Scale Efficiently** - Support millions of metadata items
7. **Ensure Data Security** - Zero security breaches or data loss
8. **Earn Developer Trust** - High satisfaction scores and community adoption

---

## Key Stakeholders

| Role | Responsibility | Contact |
|------|----------------|---------|
| **Product Manager** | Roadmap, requirements | - |
| **Engineering Lead** | Technical decisions, architecture | - |
| **DevOps Engineer** | Deployment, infrastructure | - |
| **QA Lead** | Testing, quality assurance | - |
| **Developer Relations** | SDK, documentation, support | - |

---

## Glossary & Key Terms

| Term | Definition |
|------|-----------|
| **Metadata** | JSON object containing NFT information (name, image, attributes, etc.) |
| **CID** | Content Identifier - IPFS hash for content-addressed files |
| **IPFS** | InterPlanetary File System - decentralized storage protocol |
| **OpenSea Standard** | Metadata format specification by OpenSea |
| **API Key** | Authentication credential with scoped permissions |
| **Audit Log** | Complete record of all API requests and changes |
| **Rate Limiting** | Restricting number of API requests per time period |
| **Clean Architecture** | Design pattern separating concerns into layers |

---

**Document Version**: 1.1 | **Last Updated**: 2025-12-26 | **Next Review**: 2026-03-10
