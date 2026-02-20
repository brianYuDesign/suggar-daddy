-- ============================================================
-- PostgreSQL Initialization Script
-- ============================================================
-- This script runs automatically when the PostgreSQL container
-- starts for the first time.
-- ============================================================

-- ==========================================
-- 1. Extensions
-- ==========================================

-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for password hashing and encryption
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable pg_trgm for full-text search and similarity matching
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ==========================================
-- 2. Recommendation Service Schema
-- ==========================================

CREATE TABLE IF NOT EXISTS recommendations (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    content_id VARCHAR(255) NOT NULL,
    score DECIMAL(5, 3) NOT NULL DEFAULT 0,
    algorithm VARCHAR(50) NOT NULL DEFAULT 'popularity',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, content_id)
);

CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_content_id ON recommendations(content_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_score ON recommendations(score DESC);

-- ==========================================
-- 3. Content-Streaming Service Schema
-- ==========================================

CREATE TABLE IF NOT EXISTS contents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL,  -- 'video', 'image', 'livestream'
    status VARCHAR(50) NOT NULL DEFAULT 'draft',  -- 'draft', 'published', 'archived'
    subscription_level INTEGER DEFAULT 0,  -- 0=free, 1=premium_99, 2=premium_199
    storage_location VARCHAR(255) NOT NULL,  -- S3 path
    cdn_url VARCHAR(255),
    duration_seconds INTEGER,  -- for videos
    file_size_bytes BIGINT,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contents_status ON contents(status);
CREATE INDEX IF NOT EXISTS idx_contents_type ON contents(type);
CREATE INDEX IF NOT EXISTS idx_contents_subscription_level ON contents(subscription_level);

-- ==========================================
-- 4. Completion Log
-- ==========================================

DO $$
BEGIN
    RAISE NOTICE 'Database initialization completed successfully';
    RAISE NOTICE 'Extensions enabled: uuid-ossp, pgcrypto, pg_trgm';
    RAISE NOTICE 'Tables created: recommendations, contents';
END $$;
