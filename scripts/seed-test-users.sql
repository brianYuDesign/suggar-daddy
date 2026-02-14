-- Seed test users for E2E testing
-- Password hash for "Test1234!": $2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhCm
-- Password hash for "Admin1234!": $2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi

-- Creator account
INSERT INTO "user" (email, password, display_name, role, verified, is_admin, created_at, updated_at)
VALUES (
  'creator@test.com',
  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhCm',
  'Test Creator',
  'sugar_baby',
  true,
  false,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password = EXCLUDED.password,
  display_name = EXCLUDED.display_name,
  verified = true,
  updated_at = NOW();

-- Subscriber account
INSERT INTO "user" (email, password, display_name, role, verified, is_admin, created_at, updated_at)
VALUES (
  'subscriber@test.com',
  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhCm',
  'Test Subscriber',
  'sugar_daddy',
  true,
  false,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password = EXCLUDED.password,
  display_name = EXCLUDED.display_name,
  verified = true,
  updated_at = NOW();

-- Admin account
INSERT INTO "user" (email, password, display_name, role, verified, is_admin, created_at, updated_at)
VALUES (
  'admin@test.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'Test Admin',
  'sugar_daddy',
  true,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password = EXCLUDED.password,
  display_name = EXCLUDED.display_name,
  is_admin = true,
  verified = true,
  updated_at = NOW();

SELECT email, display_name, role, is_admin FROM "user" WHERE email IN ('creator@test.com', 'subscriber@test.com', 'admin@test.com');
