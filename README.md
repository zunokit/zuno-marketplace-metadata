# Zuno Marketplace Metadata Management System

A comprehensive metadata management platform for NFT marketplaces, built with Next.js 16, TypeScript, and modern web technologies. This system provides APIs and admin interfaces for managing NFT metadata, media files, and IPFS storage.

## 🚀 Features

### Core Functionality

- **Metadata Management**: Create, read, update, and delete NFT metadata following OpenSea standards
- **Media Upload & Processing**: Support for images, videos, and animations with automatic optimization
- **IPFS Integration**: Automatic pinning to Pinata IPFS for decentralized storage
- **API Key Management**: Secure API access with scoped permissions
- **Admin Dashboard**: Comprehensive web interface for system management

### Technical Features

- **OpenSea Compatible**: Full support for OpenSea metadata standards
- **Multi-format Media**: Support for images, videos, animations, and audio files
- **IPFS Storage**: Decentralized storage with Pinata integration
- **Rate Limiting**: Built-in API rate limiting and throttling
- **Authentication**: Secure API key-based authentication
- **Background Jobs**: Asynchronous processing for media uploads and IPFS pinning

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

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Redis instance
- ImageKit account
- Pinata account

### Environment Setup

1. **Environment Configuration**
   Create a `.env.local` file with the following variables:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/zuno_metadata
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Redis
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# ImageKit
IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
IMAGEKIT_URL_ENDPOINT=your_imagekit_endpoint

# Pinata IPFS
PINATA_JWT=your_pinata_jwt
PINATA_GATEWAY_URL=https://gateway.pinata.cloud/ipfs

# App Configuration
NODE_ENV=development
CORS_ORIGINS=http://localhost:3000
LOG_LEVEL=info
```

2. **Database Setup**

```bash
# Generate database migrations
pnpm db:generate

# Run migrations
pnpm db:migrate

# Create admin user
pnpm db:create-admin
```


## 📚 API Documentation

### Authentication

All API endpoints (except health checks) require authentication via API key:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     https://your-domain.com/api/metadata
```

### Core Endpoints

#### Metadata Management

- `GET /api/metadata` - List metadata entries
- `POST /api/metadata` - Create new metadata
- `GET /api/metadata/[id]` - Get specific metadata
- `PUT /api/metadata/[id]` - Update metadata
- `DELETE /api/metadata/[id]` - Delete metadata

#### Media Management

- `GET /api/media` - List media files
- `POST /api/media` - Upload media file
- `GET /api/media/[id]` - Get media details
- `DELETE /api/media/[id]` - Delete media file

#### System

- `GET /api/health` - Health check endpoint

### Metadata Schema

The system supports OpenSea-compatible metadata:

```json
{
  "name": "NFT Name",
  "description": "NFT Description",
  "image": "https://example.com/image.png",
  "animation_url": "https://example.com/video.mp4",
  "external_url": "https://example.com",
  "attributes": [
    {
      "trait_type": "Color",
      "value": "Blue"
    }
  ],
  "creators": [
    {
      "address": "0x...",
      "share": 100
    }
  ]
}
```

## 🛠️ Development

### Available Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm typecheck    # Run TypeScript checks
```

### Database Scripts

```bash
pnpm db:generate     # Generate migrations
pnpm db:migrate      # Run migrations
pnpm db:studio       # Open Drizzle Studio
pnpm db:push         # Push schema changes
pnpm db:create-admin # Create admin user
```

### Code Quality

- **ESLint**: Code linting with TypeScript support
- **Prettier**: Code formatting
- **TypeScript**: Strict type checking
- **Clean Architecture**: Separation of concerns

## 🚀 Deployment

### Production Build

```bash
pnpm build
pnpm start
```

### Environment Variables

Ensure all required environment variables are set in production:

- Database connection strings
- Redis configuration
- ImageKit credentials
- Pinata IPFS credentials
- CORS origins for your domain

### Database Migration

```bash
pnpm db:migrate
```

## 📊 Monitoring

### Health Checks

The system provides comprehensive health monitoring:

- Database connectivity
- Redis cache status
- ImageKit service status
- Pinata IPFS connectivity
- Background job queue status

### Logging

Structured logging with different levels:

- `debug`: Detailed debugging information
- `info`: General application flow
- `warn`: Warning conditions
- `error`: Error conditions

## 🔒 Security

### API Security

- API key authentication
- Rate limiting and throttling
- CORS protection
- Input validation and sanitization

### Data Protection

- Secure database connections
- Encrypted API keys
- IPFS content addressing
- Audit logging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Commit Convention

We follow conventional commits:

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Check the documentation
- Review the API endpoints

---

Built with ❤️ for the Zuno Marketplace ecosystem.
