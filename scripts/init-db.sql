-- ==========================================
-- Sugar Daddy Database Initialization
-- ==========================================

-- Create recommendation_db database (if needed)
-- (PostgreSQL will create from POSTGRES_DB env var)

-- ==========================================
-- Recommendation Service Schema
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

CREATE INDEX idx_recommendations_user_id ON recommendations(user_id);
CREATE INDEX idx_recommendations_content_id ON recommendations(content_id);
CREATE INDEX idx_recommendations_score ON recommendations(score DESC);

-- ==========================================
-- Content-Streaming Service Schema
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

CREATE INDEX idx_contents_status ON contents(status);
CREATE INDEX idx_contents_type ON contents(type);
CREATE INDEX idx_contents_subscription_level ON contents(subscription_level);

-- ==========================================
-- Audit Logs
-- ==========================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    actor_id VARCHAR(255),
    changes JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_service_name ON audit_logs(service_name);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ==========================================
-- Health Check View
-- ==========================================

CREATE VIEW IF NOT EXISTS health_check AS
SELECT 
    'database' AS status,
    'healthy' AS value,
    CURRENT_TIMESTAMP AS checked_at;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO postgres;
