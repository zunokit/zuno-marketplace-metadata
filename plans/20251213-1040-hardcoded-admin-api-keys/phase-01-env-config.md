# Phase 1: Environment Configuration

**Target File:** `src/shared/config/env.ts`

---

## Current State

```typescript
const envSchema = z.object({
  // ... existing fields

  // Public API Key (for home page guest access)
  ENABLE_PUBLIC_KEY: z
    .enum(["true", "false"])
    .optional()
    .transform((val) => val !== "false")
    .default(() => true),

  // Logging
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});
```

---

## Required Changes

Add `API_KEYS` field after `ENABLE_PUBLIC_KEY`:

```typescript
// Public API Key (for home page guest access)
ENABLE_PUBLIC_KEY: z
  .enum(["true", "false"])
  .optional()
  .transform((val) => val !== "false")
  .default(() => true),

// Hardcoded Admin API Keys (comma-separated, no rate limiting)
// Format: API_KEYS=zuno_xxx_admin_01,zuno_xxx_admin_02
// These keys bypass rate limiting and have full admin permissions
API_KEYS: z.string().optional(),

// Logging
LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
```

---

## Validation Notes

- Use `z.string().optional()` - validation of individual key length happens in seeder
- No default value - if not set, feature is simply disabled
- Environment validation won't fail if `API_KEYS` is not set

---

## Usage

```typescript
import { env } from "@/shared/config/env";

// Check if API_KEYS is configured
if (env.API_KEYS) {
  const keys = env.API_KEYS.split(",").map(k => k.trim());
  // Process keys...
}
```
