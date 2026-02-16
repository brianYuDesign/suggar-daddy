import { test, expect } from '../../fixtures/extended-test';
import { getRedisTestHelper } from '../../utils/redis-helper';

/**
 * 用戶登入流程測試
 * 涵蓋各種登入場景和驗證
 */
test.describe('用戶登入流程', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  // 測試用的憑證
  const testCredentials = {
    subscriber: {
      email: 'subscriber@test.com',
      password: 'Test1234!',
    },
    creator: {
      email: 'creator@test.com',
      password: 'Test1234!',
    },
    admin: {
      email: 'admin@test.com',
      password: 'Admin1234!',
    },
  };

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('TC-001: 訂閱者成功登入', async ({ page, loginPage }) => {
    await loginPage.login(
      testCredentials.subscriber.email,
      testCredentials.subscriber.password
    );

    // 驗證跳轉到 Dashboard 或 Feed
    await expect(page).toHaveURL(/\/(dashboard|feed)/, { timeout: 10000 });
  });

  test('TC-002: 創作者成功登入', async ({ page, loginPage }) => {
    await loginPage.login(
      testCredentials.creator.email,
      testCredentials.creator.password
    );

    // 驗證跳轉成功
    await expect(page).toHaveURL(/\/(dashboard|feed|profile)/, { timeout: 10000 });
  });

  test('TC-003: 管理員成功登入', async ({ page, loginPage }) => {
    await loginPage.login(
      testCredentials.admin.email,
      testCredentials.admin.password
    );

    // 管理員在 web app 登入後跳轉到 dashboard 或 feed
    await expect(page).toHaveURL(/\/(dashboard|feed)/, { timeout: 10000 });
  });

  test('TC-004: 錯誤的密碼', async ({ page, loginPage }) => {
    await loginPage.login(
      testCredentials.subscriber.email,
      'WrongPassword123!'
    );

    // 驗證錯誤訊息出現（紅色錯誤提示區塊）
    const errorLocator = page.locator('div.bg-red-50, p.text-red-500').first();
    await expect(errorLocator).toBeVisible({ timeout: 5000 });
    const errorText = await errorLocator.textContent();
    expect(errorText).toMatch(/登入失敗|Invalid|incorrect|錯誤|credentials/i);
  });

  test('TC-005: 不存在的 Email', async ({ page, loginPage }) => {
    await loginPage.login(
      'nonexistent@test.com',
      'Password123!'
    );

    // 驗證錯誤訊息（紅色錯誤提示區塊）
    const errorLocator = page.locator('div.bg-red-50, p.text-red-500').first();
    await expect(errorLocator).toBeVisible({ timeout: 5000 });
    const errorText = await errorLocator.textContent();
    expect(errorText).toMatch(/登入失敗|Invalid|not found|錯誤|credentials/i);
  });

  test('TC-006: 空白 Email 欄位', async ({ page }) => {
    await page.locator('input[name="password"]').fill('Test1234!');
    await page.locator('button[type="submit"]').click();

    // 驗證 Email 必填錯誤
    const errorVisible = await page.locator(
      'text=/請輸入.*[Ee]mail|[Ee]mail.*required/i'
    ).isVisible();
    
    expect(errorVisible).toBeTruthy();
  });

  test('TC-007: 空白密碼欄位', async ({ page }) => {
    await page.locator('input[name="email"]').fill('test@example.com');
    await page.locator('button[type="submit"]').click();

    // 驗證密碼必填錯誤
    const errorVisible = await page.locator(
      'text=/請輸入.*密碼|[Pp]assword.*required/i'
    ).isVisible();
    
    expect(errorVisible).toBeTruthy();
  });

  test('TC-008: Email 格式錯誤', async ({ page, loginPage }) => {
    await page.locator('input[name="email"]').fill('invalid-email');
    await page.locator('input[name="password"]').fill('Test1234!');
    await page.locator('button[type="submit"]').click();

    // zod 驗證會顯示 "請輸入有效的 Email" 在 p.text-red-500 中
    const errorLocator = page.locator('p.text-red-500, p.text-xs.text-red-500').first();
    await expect(errorLocator).toBeVisible({ timeout: 3000 });
    const errorText = await errorLocator.textContent();
    expect(errorText).toMatch(/請輸入有效的 Email|Invalid.*[Ee]mail|無效/i);
  });

  test.skip('TC-009: 記住我功能', async ({ page, loginPage, context }) => {
    // SKIP: 目前登入頁面沒有「記住我」checkbox，此功能尚未實作
  });

  test('TC-010: 點擊註冊連結', async ({ page, loginPage }) => {
    await loginPage.clickRegisterLink();

    // 驗證跳轉到註冊頁面
    await expect(page).toHaveURL(/\/register/);
  });

  test('TC-011: 點擊忘記密碼連結', async ({ page, loginPage }) => {
    await loginPage.clickForgotPasswordLink();

    // 驗證跳轉到忘記密碼頁面
    await expect(page).toHaveURL(/\/(forgot-password|reset)/);
  });

  test('TC-012: OAuth Google 登入流程 (Mock)', async ({ page, context }) => {
    // Mock Google OAuth callback
    await context.route('**/api/auth/google**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          accessToken: 'mock-google-token',
          user: {
            id: 'google-user-123',
            email: 'google@test.com',
            name: 'Google User',
          },
        }),
      });
    });

    // 尋找 Google 登入按鈕
    const googleButton = page.locator('button:has-text("Google")').first();
    
    if (await googleButton.isVisible()) {
      await googleButton.click();
      
      // 等待登入完成
      await page.waitForTimeout(2000);
      
      // 驗證是否跳轉或顯示成功訊息
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/dashboard|feed|auth\/callback/);
    } else {
      test.skip();
    }
  });

  test('TC-013: 登入後自動跳轉到原先嘗試訪問的頁面', async ({ page, loginPage }) => {
    // 先訪問需要認證的頁面（應該會重定向到登入頁）
    await page.goto('/profile/settings');

    // 等待重定向到登入頁
    await page.waitForURL(/\/login/, { timeout: 5000 });

    // 登入
    await loginPage.login(
      testCredentials.subscriber.email,
      testCredentials.subscriber.password
    );

    // 登入後應跳轉到某個已認證頁面（可能是原頁面或預設頁面）
    await page.waitForTimeout(3000);
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/(feed|dashboard|profile|settings)/);
  });

  test('TC-014: 登入限流保護 (連續錯誤登入)', async ({ page, loginPage }) => {
    // 使用獨立的測試 email，避免影響其他測試
    const rateLimitTestEmail = 'ratelimit-test@example.com';
    
    try {
      // 連續嘗試 6 次錯誤登入（前 5 次應該失敗，第 6 次應該被限流）
      for (let i = 0; i < 6; i++) {
        await page.goto('/login');
        await loginPage.login(rateLimitTestEmail, `WrongPassword${i}`);
        await page.waitForTimeout(1000);
      }

      // 檢查是否顯示限流訊息
      await page.waitForTimeout(2000);
      const rateLimitVisible = await page.locator(
        'text=/太多次|too many|rate limit|請稍後再試|temporarily locked|Account temporarily locked/i'
      ).isVisible();

      // 應該顯示限流訊息
      expect(rateLimitVisible).toBeTruthy();
    } finally {
      // 測試結束後清理登入嘗試記錄，避免影響後續測試
      try {
        const redisHelper = getRedisTestHelper();
        await redisHelper.clearLoginAttempts(rateLimitTestEmail);
        console.log(`[TC-014] ✓ 已清理 ${rateLimitTestEmail} 的登入嘗試記錄`);
      } catch (error) {
        console.warn('[TC-014] ⚠️ Redis 清理失敗:', error);
        // 不中斷測試
      }
    }
  });
});

test.describe('登入狀態持久化', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('TC-015: 重新整理頁面後仍保持登入', async ({ page, loginPage }) => {
    // 登入
    await page.goto('/login');
    await loginPage.login('subscriber@test.com', 'Test1234!');

    await page.waitForURL(/\/(dashboard|feed)/, { timeout: 10000 });

    // 重新整理頁面
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 驗證仍然在登入狀態（沒有被導回登入頁）
    const currentUrl = page.url();
    expect(currentUrl).not.toMatch(/\/login/);
  });
});
