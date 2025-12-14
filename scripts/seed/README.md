# Seed System

Professional seed system with clean architecture, dependency resolution, and structured logging.

## Structure

```
scripts/seed/
├── index.ts              # Entry point
├── types.ts              # Type definitions
├── config.ts             # Environment configurations
├── logger.ts             # Structured logging
├── orchestrator.ts       # Dependency resolution & execution
├── seeders/
│   ├── user.seeder.ts           # Admin + public users
│   ├── api-key.seeder.ts        # Admin + public API keys
│   └── api-version.seeder.ts    # API versions
├── factories/            # Entity creation factories (future)
└── data-providers/       # Data providers (future)
```

## Features

- **Dependency Resolution**: Automatic topological sort ensures seeders run in correct order
- **Shared Context**: Seeders can share data (e.g., user IDs) via `context.shared`
- **Structured Logging**: Unified logger with levels (silent, minimal, verbose)
- **Environment Configs**: Different settings for dev/staging/prod
- **Error Handling**: Comprehensive error handling with detailed reporting
- **Idempotent**: Safe to run multiple times, skips existing records

## Usage

### Quick Start

```bash
# Seed database
pnpm db:seed

# Truncate all tables
pnpm db:truncate

# Truncate + seed (complete reset)
pnpm db:reset

# Seed for production
pnpm db:seed:prod
```

### Environment Variables

Required for seeding:
- `API_KEYS`: Comma-separated admin API keys to seed
- `ADMIN_EMAIL`: Admin user email (optional, defaults to admin@zuno-marketplace.local)
- `ADMIN_PASSWORD`: Admin password (optional, auto-generated if not set)
- `PUBLIC_API_USER_ID`: Public user ID (optional, defaults to usr_v1_public_system)

Optional seed configuration:
- `SEED_CLEAR_EXISTING=true`: Clear existing data before seeding
- `SEED_BATCH_SIZE=100`: Batch size for bulk operations
- `SEED_USE_TRANSACTIONS=true`: Use transactions (default: true)
- `SEED_LOG_LEVEL=verbose`: Log level (silent, minimal, verbose)
- `SEED_SKIP=test-data,development-only`: Skip specific seeders

### Command Line Options

```bash
# Seed with custom environment
pnpm db:seed -- --environment staging

# Skip specific seeders
pnpm db:seed -- --skipSeeders test-data,development-only

# Clear existing data before seeding
pnpm db:seed -- --clearExisting true

# Set log level
pnpm db:seed -- --logLevel minimal
```

## Seeder Execution Order

The orchestrator automatically resolves dependencies:

1. **users** (no dependencies)
   - Creates admin user (with auto-generated password if not set)
   - Creates public API user (banned from login, API keys only)

2. **api-versions** (no dependencies)
   - Creates v1 and v1.0.0 API versions

3. **api-keys** (depends on: users)
   - Seeds hardcoded admin API keys from `API_KEYS` env
   - Creates public API key for guest access

## Creating New Seeders

Implement the `Seeder` interface:

```typescript
import { Seeder, SeedContext, SeedResult } from "../types";

export class MySeeder implements Seeder {
  name = "my-seeder";
  dependencies = ["users"]; // Seeders that must run before this one
  parallel = false; // Can run in parallel with others?

  async execute(context: SeedContext): Promise<SeedResult> {
    const startTime = Date.now();
    let created = 0;
    let skipped = 0;

    try {
      // Your seeding logic here
      // Access database: context.db
      // Access logger: context.logger
      // Share data: context.shared.myData = ...

      return {
        seeder: this.name,
        created,
        skipped,
        updated: 0,
        duration: Date.now() - startTime,
        success: true,
      };
    } catch (error: any) {
      return {
        seeder: this.name,
        created,
        skipped,
        updated: 0,
        duration: Date.now() - startTime,
        success: false,
        error: error.message,
      };
    }
  }
}
```

Then register it in `scripts/seed/index.ts`:

```typescript
orchestrator.register(new MySeeder());
```

## Migration from Old Scripts

Old scripts are preserved for backward compatibility:
- `scripts/create-admin.ts` → `pnpm db:create-admin`
- `scripts/create-public-key.ts` → `pnpm db:create-public-key`
- `scripts/seed-admin-api-keys.ts` → `pnpm db:seed-api-keys`
- `scripts/clean-and-seed.ts` → `pnpm db:clean-and-seed`

**Recommended**: Use the new seed system (`pnpm db:seed`) for better maintainability.

## Admin Key Logic

Admin API keys from `API_KEYS` environment variable have:
- **Enterprise tier**: No rate limiting
- **Full permissions**: metadata, media, admin wildcards
- **Scopes**: `["*"]` (wildcard for all permissions)
- **Hash storage**: SHA-256 + base64url (Better Auth compatible)
- **Constant-time verification**: Prevents timing attacks

## Troubleshooting

### "Admin user ID not found"
Ensure the `users` seeder runs before `api-keys`. The orchestrator handles this automatically.

### "API_KEYS env variable not set"
Admin keys won't be seeded. Set `API_KEYS=your_key_here` in `.env` or skip with warning.

### "Database connection failed"
Check `DATABASE_URL` in `.env` file.

### Seeder order issues
Check dependencies in each seeder. The orchestrator will detect circular dependencies.

## Advanced Usage

### Programmatic Usage

```typescript
import { seed } from "./scripts/seed";

await seed({
  environment: "production",
  clearExisting: false,
  skipSeeders: ["test-data"],
  logLevel: "minimal",
});
```

### Custom Orchestrator

```typescript
import { SeedOrchestrator } from "./scripts/seed/orchestrator";
import { UserSeeder } from "./scripts/seed/seeders/user.seeder";

const orchestrator = new SeedOrchestrator({ logLevel: "verbose" });
orchestrator.register(new UserSeeder());
const results = await orchestrator.execute(db);
```
