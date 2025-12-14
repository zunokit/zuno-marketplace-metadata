-- Migration: Convert api_key permissions and metadata from JSONB to TEXT
-- This fixes the double-encoding issue with Better Auth

DO $$
BEGIN
  -- Check if api_key table exists before attempting alterations
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'api_key') THEN

    -- Step 1: Convert permissions from jsonb to text (with proper JSON serialization)
    -- Only if the column is currently jsonb type
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'api_key'
      AND column_name = 'permissions'
      AND data_type = 'jsonb'
    ) THEN
      ALTER TABLE api_key
        ALTER COLUMN permissions TYPE text USING permissions::text;
    END IF;

    -- Step 2: Convert metadata from jsonb to text (with proper JSON serialization)
    -- Only if the column is currently jsonb type
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'api_key'
      AND column_name = 'metadata'
      AND data_type = 'jsonb'
    ) THEN
      ALTER TABLE api_key
        ALTER COLUMN metadata TYPE text USING metadata::text;
    END IF;

  END IF;
END $$;

-- Note: Better Auth expects TEXT columns and handles JSON serialization internally
-- The existing data will be preserved as JSON strings
