-- Drop and recreate rate_limit table with the correct schema
-- This is safe since rate limit data is ephemeral and can be regenerated
DROP TABLE IF EXISTS "rate_limit";--> statement-breakpoint
CREATE TABLE "rate_limit" (
  "id" text PRIMARY KEY NOT NULL,
  "key" text NOT NULL,
  "count" integer DEFAULT 0 NOT NULL,
  "last_request" bigint NOT NULL
);--> statement-breakpoint
ALTER TABLE "rate_limit" ENABLE ROW LEVEL SECURITY;