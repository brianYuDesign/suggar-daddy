import { test as setup } from '@playwright/test';
import { TEST_USERS } from './utils/test-helpers';
import { getRedisTestHelper, closeRedisTestHelper } from './utils/redis-helper';

const API_BASE = 'http://localhost:3000';

async function authenticateAs(
  page: Parameters<Parameters<typeof setup>[1]>[0]['page'],
  credentials: { email: string; password: string },
  storageStatePath: string,
) {
  // Navigate to establish origin context
  await page.goto('http://localhost:4200/login');

  // Login via API
  const res = await page.request.post(`${API_BASE}/api/auth/login`, {
    data: { email: credentials.email, password: credentials.password },
  });

  if (!res.ok()) {
    throw new Error(`Login API failed for ${credentials.email}: ${res.status()} ${await res.text()}`);
  }

  const tokens = await res.json();

  // Set tokens in localStorage
  await page.evaluate((t) => {
    localStorage.setItem('sd_access_token', t.accessToken);
    localStorage.setItem('sd_refresh_token', t.refreshToken);
  }, tokens);

  // Save storage state
  await page.context().storageState({ path: storageStatePath });
}

setup('確認測試用戶存在並清理 Redis 測試資料', async () => {
  const redisHelper = getRedisTestHelper();

  try {
    const isConnected = await redisHelper.ping();
    if (!isConnected) {
      console.warn('[Setup] ⚠️ Redis 連線失敗，跳過清理步驟');
      return;
    }

    // 1. Clear login attempt records FIRST (before creating users)
    //    Note: clearAllTestData deletes user:email:*test* keys too,
    //    so we must run it BEFORE seeding users.
    console.log('[Setup] 清理登入嘗試記錄...');
    const testEmails = [
      TEST_USERS.subscriber.email,
      TEST_USERS.creator.email,
      TEST_USERS.admin?.email,
      'test@example.com',
      'ratelimit-test@example.com',
    ].filter(Boolean) as string[];

    for (const email of testEmails) {
      await redisHelper.clearLoginAttempts(email);
    }

    // Clear login-attempts AND general rate limit keys
    const client = redisHelper.getClient();
    const attemptKeys = await redisHelper.scan('auth:login-attempts:*');
    const rateLimitKeys = await redisHelper.scan('ratelimit:*');
    const allKeys = [...attemptKeys, ...rateLimitKeys];
    if (allKeys.length > 0) {
      const pipe = client.pipeline();
      allKeys.forEach((key) => pipe.del(key));
      await pipe.exec();
    }
    console.log('[Setup] ✓ 登入嘗試記錄與 rate limit 已清理');

    // 2. Ensure test users exist in Redis (auth service reads from Redis)
    console.log('[Setup] 確認測試用戶存在...');
    const bcrypt = await import('bcrypt');
    const SALT_ROUNDS = 10;
    const testAccounts = [
      { email: 'subscriber@test.com', password: 'Test1234!', userType: 'sugar_daddy', displayName: 'Test Subscriber' },
      { email: 'creator@test.com', password: 'Test1234!', userType: 'sugar_baby', displayName: 'Test Creator' },
      { email: 'admin@test.com', password: 'Admin1234!', userType: 'sugar_daddy', displayName: 'Test Admin', isAdmin: true },
    ];

    for (const account of testAccounts) {
      const emailKey = `user:email:${account.email}`;
      const existingUserId = await client.get(emailKey);
      if (existingUserId) {
        const userData = await client.get(`user:${existingUserId}`);
        if (userData) {
          console.log(`[Setup] ✓ ${account.email} already exists`);
          continue;
        }
      }

      // User missing — create it
      const userId = `test-${account.userType}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const passwordHash = await bcrypt.hash(account.password, SALT_ROUNDS);
      const storedUser = {
        userId,
        email: account.email,
        passwordHash,
        userType: account.userType,
        displayName: account.displayName,
        bio: `E2E test account (${account.userType})`,
        accountStatus: 'active',
        emailVerified: true,
        createdAt: new Date().toISOString(),
        ...(account.isAdmin ? { permissionRole: 'ADMIN' } : {}),
      };

      await client.set(`user:${userId}`, JSON.stringify(storedUser));
      await client.set(emailKey, userId);
      console.log(`[Setup] ✓ Created ${account.email} → ${userId}`);
    }

    console.log('[Setup] ✓ 測試用戶就緒');
  } catch (error) {
    console.error('[Setup] ✗ Redis setup 失敗:', error);
  }
});

setup('authenticate as subscriber', async ({ page }) => {
  await authenticateAs(page, TEST_USERS.subscriber, 'e2e/.auth/subscriber.json');
});

setup('authenticate as creator', async ({ page }) => {
  await authenticateAs(page, TEST_USERS.creator, 'e2e/.auth/creator.json');
});

setup('authenticate as admin', async ({ page }) => {
  const ADMIN_URL = 'http://localhost:4300';
  const API_BASE = 'http://localhost:3000';

  // 先嘗試連接 admin app；如果不可用則使用 web app 建立 fallback
  let adminAvailable = false;
  try {
    const check = await page.request.get(`${ADMIN_URL}/login`, { timeout: 3000 });
    adminAvailable = check.ok();
  } catch {
    adminAvailable = false;
  }

  if (!adminAvailable) {
    console.warn(`[Setup] Admin app (${ADMIN_URL}) 不可用，寫入空 admin storageState`);
    // 寫入空的 storageState 避免使用過期檔案
    await page.context().storageState({ path: 'e2e/.auth/admin.json' });
    return;
  }

  // 導航到 admin app 建立 origin context
  await page.goto(`${ADMIN_URL}/login`);

  // 透過 API 登入取得 token
  const res = await page.request.post(`${API_BASE}/api/auth/login`, {
    data: { email: TEST_USERS.admin.email, password: TEST_USERS.admin.password },
  });

  if (!res.ok()) {
    console.warn(`[Setup] Admin login API failed: ${res.status()}`);
    // 仍然保存空的 storageState（正確 origin），避免使用過期檔案
    await page.context().storageState({ path: 'e2e/.auth/admin.json' });
    return;
  }

  const tokens = await res.json();

  // Admin app 使用不同的 localStorage keys
  await page.evaluate((t) => {
    localStorage.setItem('admin_token', t.accessToken);
    localStorage.setItem('admin_refresh_token', t.refreshToken);
    try {
      const payload = JSON.parse(atob(t.accessToken.split('.')[1]));
      if (payload.exp) {
        localStorage.setItem('admin_token_expiry', String(payload.exp * 1000));
      }
    } catch {
      localStorage.setItem('admin_token_expiry', String(Date.now() + 24 * 60 * 60 * 1000));
    }
  }, tokens);

  // 保存 admin storageState
  await page.context().storageState({ path: 'e2e/.auth/admin.json' });
});

// 測試結束後關閉 Redis 連線
setup.afterAll(async () => {
  console.log('[Setup] 關閉 Redis 連線...');
  await closeRedisTestHelper();
});
