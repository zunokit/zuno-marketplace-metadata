-- Migration: Add performance indexes for frequently queried columns
-- Created: 2025-11-08
-- Description: Adds indexes to improve query performance for metadata, media, and API key tables

-- ============================================
-- METADATA TABLE INDEXES
-- ============================================

-- Index for isPinned column (used in WHERE clauses for filtering unpinned items)
-- Query: SELECT * FROM metadata WHERE is_pinned = false
CREATE INDEX IF NOT EXISTS idx_metadata_is_pinned ON metadata(is_pinned);

-- Index for name column with trigram for ILIKE searches
-- Query: SELECT * FROM metadata WHERE name ILIKE '%search%'
-- Note: Requires pg_trgm extension for text search optimization
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_metadata_name_trgm ON metadata USING gin(name gin_trgm_ops);

-- Composite index for isPinned + createdAt (common list query pattern)
-- Query: SELECT * FROM metadata WHERE is_pinned = false ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_metadata_pinned_created ON metadata(is_pinned, created_at DESC);

-- Index for version column (used in optimistic locking)
-- Query: UPDATE metadata SET ... WHERE id = ? AND version = ?
CREATE INDEX IF NOT EXISTS idx_metadata_version ON metadata(version);

-- ============================================
-- MEDIA TABLE INDEXES
-- ============================================

-- Index for mediaType column (used for filtering by media type)
-- Query: SELECT * FROM media WHERE media_type = 'IMAGE'
CREATE INDEX IF NOT EXISTS idx_media_type ON media(media_type);

-- Index for isPinned column (similar to metadata)
-- Query: SELECT * FROM media WHERE is_pinned = false
CREATE INDEX IF NOT EXISTS idx_media_is_pinned ON media(is_pinned);

-- Composite index for media type + created date
-- Query: SELECT * FROM media WHERE media_type = 'VIDEO' ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_media_type_created ON media(media_type, created_at DESC);

-- ============================================
-- API KEY TABLE INDEXES
-- ============================================

-- Index for userId foreign key (improves JOIN performance)
-- Query: SELECT * FROM api_key WHERE user_id = ?
CREATE INDEX IF NOT EXISTS idx_api_key_user_id ON api_key(user_id);

-- Index for expiresAt column (for cleanup queries)
-- Query: DELETE FROM api_key WHERE expires_at < NOW()
CREATE INDEX IF NOT EXISTS idx_api_key_expires_at ON api_key(expires_at) WHERE expires_at IS NOT NULL;

-- Index for key hash (used in authentication lookups)
-- Query: SELECT * FROM api_key WHERE key_hash = ?
CREATE INDEX IF NOT EXISTS idx_api_key_hash ON api_key(key_hash);

-- ============================================
-- AUDIT LOG TABLE INDEXES (if exists)
-- ============================================

-- Index for createdAt for time-range queries
-- Query: SELECT * FROM audit_log WHERE created_at BETWEEN ? AND ?
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

-- Composite index for user + timestamp
-- Query: SELECT * FROM audit_log WHERE user_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_audit_log_user_created ON audit_log(user_id, created_at DESC);
