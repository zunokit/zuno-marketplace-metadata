import { z } from "zod";
import dotenv from "dotenv";
import { getCurrentUrl } from "@/shared/lib/utils/url";

dotenv.config();

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url("Invalid DATABASE_URL"),
  SUPABASE_URL: z.string().url("Invalid SUPABASE_URL"),
  SUPABASE_ANON_KEY: z.string().min(1, "SUPABASE_ANON_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),

  // Redis
  UPSTASH_REDIS_REST_URL: z.string().url("Invalid UPSTASH_REDIS_REST_URL"),
  UPSTASH_REDIS_REST_TOKEN: z
    .string()
    .min(1, "UPSTASH_REDIS_REST_TOKEN is required"),

  // ImageKit
  IMAGEKIT_PUBLIC_KEY: z.string().min(1, "IMAGEKIT_PUBLIC_KEY is required"),
  IMAGEKIT_PRIVATE_KEY: z.string().min(1, "IMAGEKIT_PRIVATE_KEY is required"),
  IMAGEKIT_URL_ENDPOINT: z.string().url("Invalid IMAGEKIT_URL_ENDPOINT"),

  // Pinata
  PINATA_JWT: z.string().min(1, "PINATA_JWT is required"),
  PINATA_GATEWAY_URL: z
    .string()
    .url("Invalid PINATA_GATEWAY_URL")
    .default("https://gateway.pinata.cloud"),

  // App Config
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  CORS_ORIGINS: z.string().default(getCurrentUrl()),

  //
  CRON_SECRET: z.string().min(1, "CRON_SECRET is required"),

  // Public API Key (for home page guest access)
  ENABLE_PUBLIC_KEY: z
    .enum(["true", "false"])
    .optional()
    .transform((val) => val !== "false")
    .default(() => true),

  // Logging
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type Env = z.infer<typeof envSchema>;

// Validate and export environment variables
// Note: Using direct try-catch here to avoid circular dependency with tryCatchSync
let env: Env;
try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    const missingVars = error.issues
      .map((err) => `${err.path.join(".")}: ${err.message}`)
      .join("\n");
    console.error(`Environment validation failed:\n${missingVars}`);
  }
  throw error;
}

export { env };

// Helper to get CORS origins as array
export const getCorsOrigins = (): string[] => {
  return env.CORS_ORIGINS.split(",").map((origin) => origin.trim());
};

// Helper to check if we're in production
export const isProduction = () => env.NODE_ENV === "production";
export const isDevelopment = () => env.NODE_ENV === "development";
export const isTest = () => env.NODE_ENV === "test";
