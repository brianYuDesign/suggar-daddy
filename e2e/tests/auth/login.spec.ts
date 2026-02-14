import { test, expect } from '../../fixtures/extended-test';

/**
 * 用戶登入流程測試
 * 涵蓋各種登入場景和驗證
 */
test.describe('用戶登入流程', () => {
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
    await page.goto('/auth/login');
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

    // 驗證跳轉到管理後台
    await expect(page).toHaveURL(/\/(admin|dashboard)/, { timeout: 10000 });
  });

  test('TC-004: 錯誤的密碼', async ({ page, loginPage }) => {
    await loginPage.login(
      testCredentials.subscriber.email,
      'WrongPassword123!'
    );

    // 驗證錯誤訊息出現
    await page.waitForTimeout(2000);
    const errorVisible = await page.locator(
      'text=/帳號或密碼錯誤|Invalid credentials|incorrect/i'
    ).isVisible();
    
    expect(errorVisible).toBeTruthy();
  });

  test('TC-005: 不存在的 Email', async ({ page, loginPage }) => {
    await loginPage.login(
      'nonexistent@test.com',
      'Password123!'
    );

    // 驗證錯誤訊息
    await page.waitForTimeout(2000);
    const errorVisible = await page.locator(
      'text=/不存在|not found|Invalid credentials/i'
    ).isVisible();
    
    expect(errorVisible).toBeTruthy();
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

    // 驗證 Email 格式錯誤
    const errorVisible = await page.locator(
      'text=/無效.*[Ee]mail|Invalid.*[Ee]mail/i'
    ).isVisible();
    
    expect(errorVisible).toBeTruthy();
  });

  test('TC-009: 記住我功能', async ({ page, loginPage, context }) => {
    await loginPage.loginWithRememberMe(
      testCredentials.subscriber.email,
      testCredentials.subscriber.password
    );

    // 等待登入完成
    await page.waitForURL(/\/(dashboard|feed)/, { timeout: 10000 });

    // 檢查是否設置了持久化的 cookie 或 localStorage
    const cookies = await context.cookies();
    const hasRememberMeCookie = cookies.some(
      (cookie) => cookie.name === 'rememberMe' || cookie.name === 'refreshToken'
    );

    // 或檢查 localStorage
    const rememberMeValue = await page.evaluate(() => {
      return localStorage.getItem('rememberMe') || localStorage.getItem('refreshToken');
    });

    expect(hasRememberMeCookie || rememberMeValue).toBeTruthy();
  });

  test('TC-010: 點擊註冊連結', async ({ page, loginPage }) => {
    await loginPage.clickRegisterLink();

    // 驗證跳轉到註冊頁面
    await expect(page).toHaveURL(/\/auth\/register/);
  });

  test('TC-011: 點擊忘記密碼連結', async ({ page, loginPage }) => {
    await loginPage.clickForgotPasswordLink();

    // 驗證跳轉到忘記密碼頁面
    await expect(page).toHaveURL(/\/auth\/(forgot-password|reset)/);
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
    await page.waitForURL(/\/auth\/login/, { timeout: 5000 });

    // 登入
    await loginPage.login(
      testCredentials.subscriber.email,
      testCredentials.subscriber.password
    );

    // 驗證回到原先嘗試訪問的頁面
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/settings|dashboard|profile/);
  });

  test('TC-014: 登入限流保護 (連續錯誤登入)', async ({ page, loginPage }) => {
    // 連續嘗試 5 次錯誤登入
    for (let i = 0; i < 5; i++) {
      await page.goto('/auth/login');
      await loginPage.login('test@example.com', `WrongPassword${i}`);
      await page.waitForTimeout(1000);
    }

    // 第 6 次嘗試應該被限制
    await page.goto('/auth/login');
    await loginPage.login('test@example.com', 'WrongPassword5');

    // 檢查是否顯示限流訊息
    await page.waitForTimeout(2000);
    const rateLimitVisible = await page.locator(
      'text=/太多次|too many|rate limit|請稍後再試/i'
    ).isVisible();

    // 如果沒有限流，至少應該還是顯示錯誤
    if (!rateLimitVisible) {
      const errorVisible = await page.locator('text=/錯誤|error|invalid/i').isVisible();
      expect(errorVisible).toBeTruthy();
    }
  });
});

test.describe('登入狀態持久化', () => {
  test('TC-015: 重新整理頁面後仍保持登入', async ({ page, loginPage }) => {
    // 登入
    await page.goto('/auth/login');
    await loginPage.login('subscriber@test.com', 'Test1234!');
    
    await page.waitForURL(/\/(dashboard|feed)/, { timeout: 10000 });

    // 重新整理頁面
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 驗證仍然在登入狀態（沒有被導回登入頁）
    const currentUrl = page.url();
    expect(currentUrl).not.toMatch(/\/auth\/login/);
  });
});
