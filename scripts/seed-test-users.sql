-- Seed test users for E2E testing
-- Password hash for "Test1234!": $2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhCm
-- Password hash for "Admin1234!": $2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi

-- Creator account
INSERT INTO "users" (email, username, "passwordHash", "displayName", "userType", "permissionRole", "createdAt", "updatedAt")
VALUES (
  'creator@test.com',
  'creator_test',
  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhCm',
  'Test Creator',
  'SUGAR_BABY',
  'CREATOR',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  "passwordHash" = EXCLUDED."passwordHash",
  "displayName" = EXCLUDED."displayName",
  username = EXCLUDED.username,
  "updatedAt" = NOW();

-- Subscriber account
INSERT INTO "users" (email, username, "passwordHash", "displayName", "userType", "permissionRole", "createdAt", "updatedAt")
VALUES (
  'subscriber@test.com',
  'daddy_test',
  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhCm',
  'Test Subscriber',
  'SUGAR_DADDY',
  'SUBSCRIBER',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  "passwordHash" = EXCLUDED."passwordHash",
  "displayName" = EXCLUDED."displayName",
  username = EXCLUDED.username,
  "updatedAt" = NOW();

-- Admin account
INSERT INTO "users" (email, username, "passwordHash", "displayName", "userType", "permissionRole", "createdAt", "updatedAt")
VALUES (
  'admin@test.com',
  'admin_test',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'Test Admin',
  'SUGAR_DADDY',
  'ADMIN',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  "passwordHash" = EXCLUDED."passwordHash",
  "displayName" = EXCLUDED."displayName",
  username = EXCLUDED.username,
  "permissionRole" = 'ADMIN',
  "updatedAt" = NOW();

SELECT email, username, "displayName", "userType", "permissionRole" FROM "users" WHERE email IN ('creator@test.com', 'subscriber@test.com', 'admin@test.com');
