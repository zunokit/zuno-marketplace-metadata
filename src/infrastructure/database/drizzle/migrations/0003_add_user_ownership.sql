-- Migration: Add user ownership to metadata and media tables
-- This migration safely adds user_id columns with foreign key constraints
-- and handles existing data by assigning them to a system user

-- Step 1: Add user_id columns as nullable first
ALTER TABLE "metadata" ADD COLUMN "user_id" text;
ALTER TABLE "media" ADD COLUMN "user_id" text;

-- Step 2: Create a system user for existing data (idempotent)
-- This user will own all existing metadata/media created before ownership tracking
DO $$
DECLARE
  system_user_id text;
BEGIN
  -- Check if system user exists
  SELECT id INTO system_user_id FROM "user" WHERE email = 'system@zuno.internal' LIMIT 1;

  -- Create system user if it doesn't exist
  IF system_user_id IS NULL THEN
    INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
    VALUES (
      'system-user-' || gen_random_uuid()::text,
      'System User',
      'system@zuno.internal',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO system_user_id;

    RAISE NOTICE 'Created system user with ID: %', system_user_id;
  ELSE
    RAISE NOTICE 'System user already exists with ID: %', system_user_id;
  END IF;

  -- Update existing metadata to be owned by system user
  UPDATE "metadata" SET user_id = system_user_id WHERE user_id IS NULL;

  -- Update existing media to be owned by system user
  UPDATE "media" SET user_id = system_user_id WHERE user_id IS NULL;

  RAISE NOTICE 'Assigned existing data to system user';
END $$;

-- Step 3: Make user_id NOT NULL now that all rows have values
ALTER TABLE "metadata" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "media" ALTER COLUMN "user_id" SET NOT NULL;

-- Step 4: Add foreign key constraints
ALTER TABLE "metadata" ADD CONSTRAINT "metadata_user_id_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "media" ADD CONSTRAINT "media_user_id_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;

-- Step 5: Add indexes for performance (ownership queries will be common)
CREATE INDEX IF NOT EXISTS "idx_metadata_user_id" ON "metadata"("user_id");
CREATE INDEX IF NOT EXISTS "idx_media_user_id" ON "media"("user_id");
