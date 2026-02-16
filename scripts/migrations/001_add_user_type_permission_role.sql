-- Migration: 001 - Add userType and permissionRole to users table
-- Date: 2026-02-16
-- Description: Split 'role' field into 'userType' (business) and 'permissionRole' (system)
--
-- IMPORTANT: This migration must be run BEFORE deploying the new code
-- Rollback script: 002_rollback_user_type_permission_role.sql

BEGIN;

-- 1. Add new columns
ALTER TABLE users 
  ADD COLUMN user_type VARCHAR(50),
  ADD COLUMN permission_role VARCHAR(50) DEFAULT 'subscriber';

-- 2. Migrate existing data
-- Assume all existing users are subscribers (adjust based on your data)
UPDATE users
SET 
  user_type = CASE 
    WHEN role IN ('sugar_daddy', 'sugar_baby') THEN role
    ELSE 'subscriber'  -- default for any other roles
  END,
  permission_role = CASE 
    WHEN role = 'admin' THEN 'admin'
    WHEN role = 'creator' THEN 'creator'
    ELSE 'subscriber'
  END;

-- 3. Set NOT NULL constraint (after data migration)
ALTER TABLE users 
  ALTER COLUMN user_type SET NOT NULL;

-- 4. Create indexes for performance
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_users_permission_role ON users(permission_role);

-- 5. Drop old index (if exists)
DROP INDEX IF EXISTS idx_users_role;

-- 6. Keep 'role' column for backward compatibility (will be removed in future version)
-- ALTER TABLE users DROP COLUMN role;  -- Don't drop yet

COMMIT;

-- Verification queries
-- SELECT user_type, permission_role, COUNT(*) FROM users GROUP BY user_type, permission_role;
-- SELECT * FROM users WHERE user_type IS NULL OR permission_role IS NULL;
