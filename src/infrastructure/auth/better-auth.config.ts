import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, apiKey, bearer, openAPI } from "better-auth/plugins";
import { db } from "@/infrastructure/database/client";
import * as schema from "@/infrastructure/database/drizzle/schema";
import { IdGenerator, EntityPrefix } from "@/shared/lib/utils/id-generator";
import { getCurrentUrl } from "@/shared/lib/utils/url";

// Get environment variables
const BETTER_AUTH_SECRET =
  process.env.BETTER_AUTH_SECRET || "default-secret-change-in-production";
const BETTER_AUTH_URL = getCurrentUrl();

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    // Pass schema with Better Auth expected alias keys
    schema: {
      ...schema,
      apikey: schema.apiKey, // Better Auth expects 'apikey' not 'apiKey'
      rateLimit: schema.rateLimit,
    },
  }),

  secret: BETTER_AUTH_SECRET,
  baseURL: BETTER_AUTH_URL,

  // Email/Password authentication
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: false,
    disableSignUp: true, // Only admins can create accounts
  },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },

  // User configuration
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "user",
        input: false, // Don't allow user to set this
      },
    },
  },

  // Global rate limiting (per IP/session)
  rateLimit: {
    enabled: true,
    window: 60, // 60 seconds
    max: 100, // 100 requests per minute
    storage: "database",
    modelName: "rateLimit",
  },

  // Plugins
  plugins: [
    // Admin plugin for user management
    admin(),

    // Bearer token plugin (enables Authorization: Bearer <session-token>)
    bearer(),

    // API Key plugin for programmatic access
    apiKey({
      // Rate limiting - ENABLED (database-based)
      // Better Auth tracks request count per API key in database
      // For distributed rate limiting with Redis, implement custom RateLimitService
      rateLimit: {
        enabled: true,
        timeWindow: 60 * 60, // 1 hour window (in seconds)
        maxRequests: 1000, // 1000 requests per hour (default limit)
        // Custom limits can be set per API key via rateLimitMax and rateLimitTimeWindow
      },

      // Permissions system - Better Auth format (resource: ['action'])
      permissions: {
        defaultPermissions: {
          metadata: ["read", "list"],
          media: ["read", "list"],
        },
      },

      // Enable metadata for custom business logic
      enableMetadata: true,

      // Default key configuration
      defaultPrefix: "zuno_",
      defaultKeyLength: 32,
    }),

    // OpenAPI documentation
    openAPI(),
  ],

  // Advanced options
  advanced: {
    crossSubDomainCookies: {
      enabled: false,
    },
    // Custom ID generation
    database: {
      generateId: (opts) => {
        const model = opts?.model;
        const apiVersion = "v1"; // Default for auth entities

        switch (model) {
          case "user":
            return IdGenerator.generate({
              prefix: EntityPrefix.USER,
              apiVersion,
            });
          case "session":
            return IdGenerator.generate({
              prefix: EntityPrefix.SESSION,
              apiVersion,
            });
          case "verification":
            return IdGenerator.generate({
              prefix: EntityPrefix.VERIFICATION,
              apiVersion,
            });
          case "account":
            return IdGenerator.generate({
              prefix: EntityPrefix.ACCOUNT,
              apiVersion,
            });
          case "apiKey":
            return IdGenerator.generate({
              prefix: EntityPrefix.API_KEY,
              apiVersion,
            });
          default:
            return IdGenerator.generate({
              prefix: EntityPrefix.USER,
              apiVersion,
            });
        }
      },
    },
  },

  // CORS configuration
  cors: {
    origin: [BETTER_AUTH_URL],
    credentials: true,
  },
});
