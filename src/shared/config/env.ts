import dotenv from "dotenv";

dotenv.config();

/**
 * Environment variables type definitions
 *
 * No runtime validation - relies on Railway/platform to provide correct values
 * Type-safe access to process.env with sensible defaults
 */
export interface Env {
  // Database
  DATABASE_URL: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;

  // Redis
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;

  // ImageKit
  IMAGEKIT_PUBLIC_KEY: string;
  IMAGEKIT_PRIVATE_KEY: string;
  IMAGEKIT_URL_ENDPOINT: string;

  // Pinata
  PINATA_JWT: string;
  PINATA_GATEWAY_URL: string;

  // App Config
  NODE_ENV: "development" | "production" | "test";
  CORS_ORIGINS: string;
  LOG_LEVEL: "debug" | "info" | "warn" | "error";
}

/**
 * Environment variables accessor with defaults
 *
 * Approach: Direct access to process.env without validation
 * - Build time: Works with or without env vars
 * - Runtime: Platform ensures vars are available
 */
export const env: Env = {
  // Database
  DATABASE_URL: process.env.DATABASE_URL || "",
  SUPABASE_URL: process.env.SUPABASE_URL || "",
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || "",
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",

  // Redis
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || "",
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || "",

  // ImageKit
  IMAGEKIT_PUBLIC_KEY: process.env.IMAGEKIT_PUBLIC_KEY || "",
  IMAGEKIT_PRIVATE_KEY: process.env.IMAGEKIT_PRIVATE_KEY || "",
  IMAGEKIT_URL_ENDPOINT: process.env.IMAGEKIT_URL_ENDPOINT || "",

  // Pinata
  PINATA_JWT: process.env.PINATA_JWT || "",
  PINATA_GATEWAY_URL: process.env.PINATA_GATEWAY_URL || "https://gateway.pinata.cloud",

  // App Config
  NODE_ENV: (process.env.NODE_ENV as Env["NODE_ENV"]) || "development",
  CORS_ORIGINS: process.env.CORS_ORIGINS || "http://localhost:3000",
  LOG_LEVEL: (process.env.LOG_LEVEL as Env["LOG_LEVEL"]) || "info",
};

// Helper to get CORS origins as array
export const getCorsOrigins = (): string[] => {
  return env.CORS_ORIGINS.split(',').map(origin => origin.trim());
};

// Helper to check if we're in production
export const isProduction = () => env.NODE_ENV === "production";
export const isDevelopment = () => env.NODE_ENV === "development";
export const isTest = () => env.NODE_ENV === "test";