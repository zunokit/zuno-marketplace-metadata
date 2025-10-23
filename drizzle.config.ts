import { defineConfig } from "drizzle-kit";
import { env } from "@/shared/config/env";


export default defineConfig({
  dialect: "postgresql",
  schema: "./src/infrastructure/database/drizzle/schema/index.ts",
  out: "./src/infrastructure/database/drizzle/migrations",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
  migrations: {
    prefix: "timestamp",
    table: "drizzle_migrations",
    schema: "public",
  },
});