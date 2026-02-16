-- Rollback Migration: 002 - Rollback userType and permissionRole changes
-- Date: 2026-02-16
-- Description: Restore original 'role' field

BEGIN;

-- 1. Restore 'role' field from new columns (in case data changed)
UPDATE users
SET role = COALESCE(
  CASE 
    WHEN permission_role = 'admin' THEN 'admin'
    WHEN permission_role = 'creator' THEN 'creator'
    ELSE user_type  -- use business role as fallback
  END,
  'subscriber'
);

-- 2. Drop indexes
DROP INDEX IF EXISTS idx_users_user_type;
DROP INDEX IF EXISTS idx_users_permission_role;

-- 3. Recreate old index
CREATE INDEX idx_users_role ON users(role);

-- 4. Drop new columns
ALTER TABLE users 
  DROP COLUMN user_type,
  DROP COLUMN permission_role;

COMMIT;

-- Verification
-- SELECT role, COUNT(*) FROM users GROUP BY role;
