import { defineConfig } from "drizzle-kit";
import { loadEnvConfig } from "@next/env";

// Load environment variables
const projectDir = process.cwd();
loadEnvConfig(projectDir);

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Validate that DATABASE_URL doesn't contain placeholder
if (process.env.DATABASE_URL.includes("[YOUR-PASSWORD]")) {
  throw new Error("Please replace [YOUR-PASSWORD] in DATABASE_URL with your actual Supabase database password");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/infrastructure/database/drizzle/schema/index.ts",
  out: "./src/infrastructure/database/drizzle/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
  migrations: {
    prefix: "timestamp",
    table: "drizzle_migrations",
    schema: "public",
  },
});