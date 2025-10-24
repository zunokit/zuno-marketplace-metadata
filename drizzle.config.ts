import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/infrastructure/database/drizzle/schema/index.ts",
  out: "./src/infrastructure/database/drizzle/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
  migrations: {
    prefix: "timestamp",
    table: "drizzle_migrations",
    schema: "public",
  },
});