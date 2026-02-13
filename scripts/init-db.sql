-- ============================================================
-- PostgreSQL Initialization Script
-- ============================================================
-- This script runs automatically when the PostgreSQL container
-- starts for the first time.
-- ============================================================

-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for password hashing and encryption
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable pg_trgm for full-text search and similarity matching
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create application database if it doesn't exist
-- (Already created via POSTGRES_DB env var, but keeping for reference)
-- CREATE DATABASE suggar_daddy;

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'Database initialization completed successfully';
    RAISE NOTICE 'Extensions enabled: uuid-ossp, pgcrypto, pg_trgm';
END $$;
