-- Migration: Convert api_key permissions and metadata from JSONB to TEXT
-- This fixes the double-encoding issue with Better Auth

-- Step 1: Convert permissions from jsonb to text (with proper JSON serialization)
ALTER TABLE api_key
  ALTER COLUMN permissions TYPE text USING permissions::text;

-- Step 2: Convert metadata from jsonb to text (with proper JSON serialization)
ALTER TABLE api_key
  ALTER COLUMN metadata TYPE text USING metadata::text;

-- Note: Better Auth expects TEXT columns and handles JSON serialization internally
-- The existing data will be preserved as JSON strings
