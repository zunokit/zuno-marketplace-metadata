CREATE TYPE "public"."media_type" AS ENUM('IMAGE', 'VIDEO', 'GIF', 'MODEL_3D');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('USER', 'ADMIN', 'DEVELOP');--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"avatar" text,
	"role" "user_role" DEFAULT 'USER' NOT NULL,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"start" text,
	"prefix" text,
	"key" text NOT NULL,
	"user_id" text NOT NULL,
	"rate_limit_enabled" boolean DEFAULT false,
	"rate_limit_time_window" integer,
	"rate_limit_max" integer,
	"request_count" integer DEFAULT 0,
	"remaining" integer,
	"refill_amount" integer,
	"refill_interval" integer,
	"last_refill_at" timestamp,
	"last_request" timestamp,
	"enabled" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp,
	"permissions" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" text PRIMARY KEY NOT NULL,
	"file_name" text NOT NULL,
	"file_size" bigint NOT NULL,
	"mime_type" text NOT NULL,
	"media_type" "media_type" NOT NULL,
	"url" text NOT NULL,
	"ipfs_hash" text,
	"ipfs_url" text,
	"width" integer,
	"height" integer,
	"duration" real,
	"thumbnail_url" text,
	"optimized_url" text,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"pinned_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "media_ipfs_hash_unique" UNIQUE("ipfs_hash")
);
--> statement-breakpoint
CREATE TABLE "metadata" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"symbol" text,
	"image" text NOT NULL,
	"banner_image" text,
	"featured_image" text,
	"animation_url" text,
	"external_url" text,
	"background_color" text,
	"attributes" jsonb,
	"media_type" "media_type" DEFAULT 'IMAGE' NOT NULL,
	"ipfs_hash" text,
	"ipfs_url" text,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"pinned_at" timestamp,
	"creators" jsonb,
	"seller_fee_basis_points" integer,
	"fee_recipient" text,
	"version" integer DEFAULT 1 NOT NULL,
	"is_locked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "metadata_ipfs_hash_unique" UNIQUE("ipfs_hash")
);
--> statement-breakpoint
CREATE TABLE "api_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"label" varchar(32) NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"deprecated" boolean DEFAULT false NOT NULL,
	"released_at" timestamp NOT NULL,
	"sunset_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"api_key_id" text,
	"method" varchar(10) NOT NULL,
	"path" varchar(500) NOT NULL,
	"action" varchar(100) NOT NULL,
	"ip_address" varchar(45),
	"user_agent" varchar(500),
	"resource_type" varchar(50),
	"resource_id" uuid,
	"status_code" integer NOT NULL,
	"duration" integer,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE set null ON UPDATE no action;