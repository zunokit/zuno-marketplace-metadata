CREATE TABLE "public_key_settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"api_key" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE "public_key_settings" ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for /api/public-key endpoint)
CREATE POLICY "public_key_settings_select_policy"
ON "public_key_settings"
FOR SELECT
TO public
USING (enabled = true);

-- Only service role can insert/update/delete
CREATE POLICY "public_key_settings_insert_policy"
ON "public_key_settings"
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "public_key_settings_update_policy"
ON "public_key_settings"
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "public_key_settings_delete_policy"
ON "public_key_settings"
FOR DELETE
TO service_role
USING (true);
