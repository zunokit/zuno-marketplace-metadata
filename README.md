<div align="center">

# Zuno Marketplace Metadata

**Enterprise-grade NFT Metadata Management Platform**

[![Next.js](https://img.shields.io/badge/Next.js-16.0-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)

A production-ready metadata management platform for NFT marketplaces. Built with Next.js 16, TypeScript, and Clean Architecture, providing OpenSea-compatible APIs, IPFS storage, and enterprise-grade infrastructure.

[Features](#-features) • [Quick Start](#-quick-start) • [API Docs](#-api-documentation) • [Architecture](#-architecture) • [Deploy](#-deployment)

</div>

---

## ✨ Features

### 🎯 Core Capabilities

| Feature | Description |
|---------|-------------|
| **NFT Metadata API** | RESTful API for creating and managing NFT metadata with OpenSea standard compliance |
| **Media Processing** | Automatic image optimization, video transcoding, and CDN delivery via ImageKit |
| **IPFS Storage** | Decentralized storage with automatic pinning to Pinata IPFS |
| **API Key Management** | Scoped API keys with granular permissions (`metadata:read`, `metadata:write`, `media:read`, `media:write`) |
| **Admin Dashboard** | Modern web interface for managing metadata, media, API keys, and system monitoring |
| **Batch Operations** | Bulk create metadata and upload media files for efficient operations |

### 🔧 Technical Highlights

- ✅ **OpenSea & Magic Eden Compatible** - Industry-standard metadata format
- ⚡ **Background Job Processing** - Asynchronous IPFS pinning with BullMQ
- 🔐 **Multi-auth Support** - API keys for external integrations, sessions for admin dashboard
- 📊 **Comprehensive Monitoring** - Health checks, audit logs, and request tracking
- 🚀 **Production-Ready** - Rate limiting, CORS, error handling, and structured logging
- 🏗️ **Clean Architecture** - Testable, maintainable, and scalable codebase
- 💾 **Redis Caching** - Fast response times with intelligent cache invalidation
- 📝 **API Versioning** - Backward-compatible API evolution

## 🏗️ Architecture

### Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Backend**: Next.js API Routes with Clean Architecture
- **Database**: PostgreSQL with Drizzle ORM
- **Storage**: ImageKit for media processing, Pinata for IPFS
- **Cache**: Redis with Upstash
- **Queue**: BullMQ for background jobs
- **Auth**: Better Auth for authentication
- **UI**: Radix UI with Tailwind CSS

### Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── admin/             # Admin dashboard pages
│   └── api/               # API endpoints
├── components/            # React components
├── core/                  # Business logic (Clean Architecture)
│   ├── domain/            # Domain entities and repositories
│   ├── services/          # Business services
│   └── use-cases/        # Application use cases
├── infrastructure/        # External services and adapters
│   ├── auth/             # Authentication
│   ├── database/         # Database configuration
│   ├── services/         # External service integrations
│   └── repositories/     # Repository implementations
└── shared/               # Shared utilities and types
```

## 🚀 Quick Start

### Prerequisites

| Requirement | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 18+ | Runtime environment |
| **PostgreSQL** | 14+ | Primary database |
| **Redis** | 7+ | Caching & job queue |
| **pnpm** | 8+ | Package manager |

### Third-Party Services

- **[ImageKit](https://imagekit.io/)** - Media CDN and optimization
- **[Pinata](https://pinata.cloud/)** - IPFS pinning service
- **[Upstash](https://upstash.com/)** (optional) - Serverless Redis

### Installation

```bash
# Clone repository
git clone https://github.com/your-org/zuno-marketplace-metadata.git
cd zuno-marketplace-metadata

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env.local
```

### Local Docker Dev Stack

A `docker-compose.yml` is included that brings up:

| Service | Host port | Purpose |
|---|---|---|
| `metadata-postgres` | `5435` | Postgres 16 (db `zuno_metadata`, user/pass `zuno_user`/`zuno_pass`) |
| `metadata-redis` | `6381` | Plain Redis 7 backing the proxy below |
| `metadata-upstash-proxy` | `8080` | `hiett/serverless-redis-http` — drop-in Upstash REST replacement, so `@upstash/redis` works locally with no code changes |

```bash
docker compose up -d                   # postgres + redis + upstash proxy
docker compose --profile app up -d     # ALSO run the Next.js app in a container
docker compose down                    # stop
docker compose down -v                 # also wipe volumes
```

`.env.example` already points `DATABASE_URL`, `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` at the local stack. Use `pnpm dev:local` (no Infisical) once you have a `.env`/`.env.local` populated.

> **Note:** The BullMQ workers in `src/infrastructure/queue/workers/*` connect to Redis directly over TCP with TLS hardcoded against port `6379` (against Upstash). They will **not** work against the local plain Redis without code changes. The HTTP cache layer (via `@upstash/redis` → the proxy) works locally as-is.

### Environment Configuration

Edit `.env.local` with your credentials:

```env
# Database (PostgreSQL or Supabase)
DATABASE_URL=postgresql://user:password@localhost:5432/zuno_metadata
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Redis Cache (Upstash or self-hosted)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# Media Processing (ImageKit)
IMAGEKIT_PUBLIC_KEY=public_key
IMAGEKIT_PRIVATE_KEY=private_key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your-id

# IPFS Storage (Pinata)
PINATA_JWT=your-jwt-token
PINATA_GATEWAY_URL=https://gateway.pinata.cloud/ipfs

# Authentication
BETTER_AUTH_SECRET=your-secret-min-32-chars
BETTER_AUTH_URL=http://localhost:3000

# Application
NODE_ENV=development
CORS_ORIGINS=http://localhost:3000
LOG_LEVEL=debug
CRON_SECRET=your-cron-secret

# Admin Credentials
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=  # Leave empty for auto-generation
```

### Database Setup

```bash
# Run database migrations
pnpm db:migrate

# Create initial admin user
pnpm db:create-admin

# (Optional) Open Drizzle Studio to inspect database
pnpm db:studio
```

### Start Development Server

```bash
# Terminal 1: Start Next.js app
pnpm dev

# Terminal 2: Start background workers
pnpm workers
```

Visit **http://localhost:3000** to access the application.
Admin dashboard: **http://localhost:3000/admin**


## 📚 API Documentation

### Authentication

All API endpoints require authentication via **API key** (except health checks):

```bash
# Using Authorization header
curl -X GET https://your-domain.com/api/metadata \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "x-api-version: v1" \
  -H "Content-Type: application/json"

# Using X-API-Key header
curl -X GET https://your-domain.com/api/metadata \
  -H "x-api-key: YOUR_API_KEY" \
  -H "x-api-version: v1"
```

**API Version Header**: Include `x-api-version: v1` or `accept-version: v1` in all requests.

### Core API Endpoints

#### Metadata Management

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/metadata` | List metadata with pagination | Required |
| `POST` | `/api/metadata` | Create new metadata | Required |
| `POST` | `/api/metadata/batch` | Batch create multiple metadata | Required |
| `GET` | `/api/metadata/[id]` | Get metadata by ID | Required |
| `PUT` | `/api/metadata/[id]` | Update metadata | Required |
| `DELETE` | `/api/metadata/[id]` | Delete metadata | Required |

#### Media Management

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/media` | List media files | Required |
| `POST` | `/api/media` | Upload media file | Required |
| `POST` | `/api/media/batch` | Batch upload media files | Required |
| `GET` | `/api/media/[id]` | Get media details | Required |
| `DELETE` | `/api/media/[id]` | Delete media file | Required |

#### System Health

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/health` | Health check (DB, Redis, IPFS, Queue) | None |

### Request Examples

<details>
<summary><b>Create Metadata</b></summary>

```bash
curl -X POST https://your-domain.com/api/metadata \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "x-api-version: v1" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Awesome NFT #1",
    "description": "A unique digital collectible",
    "image": "https://your-cdn.com/image.png",
    "animation_url": "https://your-cdn.com/animation.mp4",
    "external_url": "https://your-website.com",
    "attributes": [
      { "trait_type": "Rarity", "value": "Legendary" },
      { "trait_type": "Power", "value": 95 }
    ],
    "creators": [
      { "address": "0x1234...", "share": 100 }
    ]
  }'
```

</details>

<details>
<summary><b>Upload Media</b></summary>

```bash
curl -X POST https://your-domain.com/api/media \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "x-api-version: v1" \
  -F "file=@./image.png" \
  -F "alt=NFT Image"
```

</details>

<details>
<summary><b>List Metadata</b></summary>

```bash
curl -X GET "https://your-domain.com/api/metadata?page=1&limit=20&search=Awesome" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "x-api-version: v1"
```

</details>

### OpenSea-Compatible Metadata Format

```json
{
  "name": "NFT Name",
  "description": "NFT Description",
  "image": "https://example.com/image.png",
  "animation_url": "https://example.com/video.mp4",
  "external_url": "https://example.com",
  "attributes": [
    { "trait_type": "Color", "value": "Blue" },
    { "trait_type": "Level", "value": 5 }
  ],
  "creators": [
    { "address": "0x...", "share": 100 }
  ]
}
```

**Required Fields**: `name`, `image`
**Creator Shares**: Must sum to exactly 100

## 📖 Documentation

Comprehensive documentation is available in the `docs/` folder:

- **[Project Overview & PDR](docs/project-overview-pdr.md)** - Vision, features, roadmap
- **[Codebase Summary](docs/codebase-summary.md)** - Architecture, directory structure, file inventory
- **[Code Standards](docs/code-standards.md)** - TypeScript, Clean Architecture, patterns
- **[System Architecture](docs/system-architecture.md)** - Detailed technical architecture
- **[CLAUDE.md](CLAUDE.md)** - Development workflows and guidelines

New developers should start with [Codebase Summary](docs/codebase-summary.md).

---

## 🛠️ Development

### Available Commands

#### Application

```bash
pnpm dev              # Start Next.js dev server
pnpm build            # Build for production
pnpm start            # Start production server
pnpm workers          # Start BullMQ background workers
```

#### Code Quality

```bash
pnpm typecheck        # Run TypeScript type checking
pnpm lint             # Run ESLint
pnpm test             # Run all tests
```

#### Database

```bash
pnpm db:generate      # Generate migrations from schema changes
pnpm db:migrate       # Apply pending migrations
pnpm db:push          # Push schema directly (dev only)
pnpm db:studio        # Open Drizzle Studio (GUI)
pnpm db:create-admin  # Create admin user from .env
```

#### Utilities

```bash
pnpm init-versions    # Initialize API version data
```

### Development Workflow

1. **Make schema changes** in `src/infrastructure/database/drizzle/schema/`
2. **Generate migration**: `pnpm db:generate`
3. **Apply migration**: `pnpm db:migrate`
4. **Update types**: TypeScript types auto-update from schema

### Code Quality Standards

- **TypeScript Strict Mode** - Full type safety across the codebase
- **ESLint** - Enforces code style and catches common errors
- **Zod Validation** - Runtime type validation for all API inputs
- **Clean Architecture** - Domain-driven design with clear layer separation
- **Error Handling** - Consistent error responses with proper logging

## 🚀 Deployment

### Platform Support

This application can be deployed to:

- **[Vercel](https://vercel.com)** - Recommended for Next.js (requires separate worker hosting)
- **[Railway](https://railway.app)** - Full-stack deployment with workers
- **[Docker](https://docker.com)** - Self-hosted containerized deployment
- **AWS / GCP / Azure** - Cloud infrastructure deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure all required environment variables
- [ ] Set up PostgreSQL database (Supabase, Railway, etc.)
- [ ] Set up Redis instance (Upstash, Railway, etc.)
- [ ] Run database migrations: `pnpm db:migrate`
- [ ] Create admin user: `pnpm db:create-admin`
- [ ] Configure CORS origins for your domain
- [ ] Set up SSL/TLS certificates
- [ ] Deploy background workers separately (required for IPFS pinning)
- [ ] Set up monitoring and logging
- [ ] Configure cron jobs for `/api/cron/*` endpoints

### Environment Variables (Production)

```env
# CRITICAL: Change these in production
BETTER_AUTH_SECRET=<strong-random-secret-min-32-chars>
CRON_SECRET=<strong-random-secret-for-cron-jobs>
ADMIN_PASSWORD=<secure-admin-password>

# Update these with production URLs
BETTER_AUTH_URL=https://your-domain.com
CORS_ORIGINS=https://your-domain.com,https://app.your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Production logging
NODE_ENV=production
LOG_LEVEL=info
```

### Docker Deployment

```bash
# Build production image
docker build -t zuno-metadata .

# Run with docker-compose
docker-compose up -d
```

### Worker Process

**Important**: Background workers must run separately from the web server.

```bash
# In production
NODE_ENV=production pnpm workers
```

For platforms like Vercel (serverless), deploy workers to:
- Railway
- AWS Lambda with SQS
- Google Cloud Run
- Separate compute instance

## 📊 Monitoring & Observability

### Health Check Endpoint

**Endpoint**: `GET /api/health`

Monitors:
- ✅ PostgreSQL database connectivity
- ✅ Redis cache availability
- ✅ ImageKit service status
- ✅ Pinata IPFS connectivity
- ✅ BullMQ job queue health

```bash
curl https://your-domain.com/api/health
```

**Response**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00Z",
    "services": {
      "database": "healthy",
      "redis": "healthy",
      "imagekit": "healthy",
      "pinata": "healthy",
      "queue": "healthy"
    }
  }
}
```

### Audit Logging

All API requests are logged to the database with:
- User/API key identification
- Request method and path
- Response status and duration
- IP address and user agent
- Request/response metadata

Access logs via admin dashboard or directly from `audit_logs` table.

### Structured Logging

Application uses structured logging with levels:

| Level | Use Case |
|-------|----------|
| `debug` | Detailed debugging (dev only) |
| `info` | Request/response tracking |
| `warn` | Non-critical issues |
| `error` | Critical errors requiring attention |

Configure via `LOG_LEVEL` environment variable.

## 🔒 Security

### Authentication & Authorization

- **API Key Authentication** - Scoped permissions for external integrations
- **Session-based Auth** - Secure admin dashboard access via Better Auth
- **Role-based Access Control** - Admin-only endpoints protected
- **Permission Scopes** - Granular control (`metadata:read`, `metadata:write`, `media:read`, `media:write`)

### API Protection

- ✅ **Rate Limiting** - Redis-backed rate limiting per API key
- ✅ **CORS Protection** - Configurable allowed origins
- ✅ **Input Validation** - Zod schema validation on all inputs
- ✅ **SQL Injection Protection** - Parameterized queries via Drizzle ORM
- ✅ **XSS Protection** - Sanitized inputs and outputs

### Data Security

- 🔐 **Encrypted Connections** - TLS/SSL for all external services
- 🔐 **Hashed API Keys** - Never stored in plaintext
- 🔐 **Environment Secrets** - Sensitive data in environment variables
- 📝 **Audit Trail** - Complete request logging for compliance
- 🛡️ **IPFS Content Addressing** - Tamper-proof content via CIDs

### Best Practices

1. **Rotate API keys regularly** via admin dashboard
2. **Use environment variables** for all secrets (never commit)
3. **Enable HTTPS** in production
4. **Monitor audit logs** for suspicious activity
5. **Keep dependencies updated** with `pnpm update`

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Development Process

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** with conventional commits: `git commit -m 'feat: add amazing feature'`
4. **Test** your changes: `pnpm typecheck && pnpm lint`
5. **Push** to your fork: `git push origin feature/amazing-feature`
6. **Open** a Pull Request with detailed description

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New features | `feat: add batch delete metadata` |
| `fix` | Bug fixes | `fix: correct IPFS hash validation` |
| `docs` | Documentation | `docs: update API examples` |
| `refactor` | Code refactoring | `refactor: simplify media service` |
| `test` | Tests | `test: add metadata validation tests` |
| `chore` | Maintenance | `chore: update dependencies` |
| `perf` | Performance | `perf: optimize database queries` |

### Code Standards

- ✅ Run `pnpm typecheck` before committing
- ✅ Follow existing code style (enforced by ESLint)
- ✅ Add JSDoc comments for public functions
- ✅ Update CLAUDE.md if changing architecture

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 📞 Support & Community

### Getting Help

- 📖 **Documentation** - Check [CLAUDE.md](CLAUDE.md) for architecture details
- 🐛 **Issues** - [Report bugs or request features](https://github.com/your-org/zuno-marketplace-metadata/issues)
- 💬 **Discussions** - [Community discussions](https://github.com/your-org/zuno-marketplace-metadata/discussions)

### Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Better Auth](https://www.better-auth.com/)
- [OpenSea Metadata Standards](https://docs.opensea.io/docs/metadata-standards)

---

<div align="center">

**Built with ❤️ for the Zuno Marketplace Ecosystem**

[⭐ Star us on GitHub](https://github.com/your-org/zuno-marketplace-metadata) • [🐦 Follow updates](https://twitter.com/your-handle) • [📧 Contact](mailto:support@zuno-marketplace.com)

</div>
