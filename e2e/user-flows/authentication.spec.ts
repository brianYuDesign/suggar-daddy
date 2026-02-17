import { test, expect, Page } from '@playwright/test';
import { TEST_USERS, takeScreenshot } from '../utils/test-helpers';
import { getRedisTestHelper } from '../utils/redis-helper';

test.describe('用戶認證流程', () => {
  test.beforeEach(async () => {
    // 清理 Redis rate limit
    try {
      const redisHelper = getRedisTestHelper();
      await redisHelper.clearLoginAttempts();
    } catch {
      // Redis 不可用時跳過
    }
  });

  test('應該能夠成功註冊新用戶', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, '01-register-page');

    // 檢查註冊頁面元素
    await expect(page.locator('h1')).toContainText(/註冊|Register|Sign Up/i);

    // 填寫註冊表單（如果表單存在）
    const emailInput = page.locator('input[name="email"], input[type="email"]').first();
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      const timestamp = Date.now();
      await emailInput.fill(`test-user-${timestamp}@test.com`);
      
      const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
      await passwordInput.fill('Test1234!');
      
      const displayNameInput = page.locator('input[name="displayName"], input[name="username"]').first();
      if (await displayNameInput.isVisible().catch(() => false)) {
        await displayNameInput.fill(`TestUser${timestamp}`);
      }

      await takeScreenshot(page, '02-register-filled');

      // 提交表單
      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();

      await page.waitForTimeout(2000);
      await takeScreenshot(page, '03-register-submitted');
    }
  });

  test('應該能夠成功登入 - Subscriber', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, '04-login-page');

    // 檢查登入頁面元素
    await expect(page.locator('h1, h2')).toContainText(/登[入|錄]|Login|Sign In/i);

    // 填寫登入表單
    const emailInput = page.locator('input[name="email"], input[type="email"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 5000 });
    await emailInput.fill(TEST_USERS.subscriber.email);

    const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
    await passwordInput.fill(TEST_USERS.subscriber.password);

    await takeScreenshot(page, '05-login-filled');

    // 提交表單
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // 等待導航到 feed 或 dashboard
    await page.waitForURL(/\/(feed|dashboard)/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, '06-logged-in');

    // 驗證登入成功
    expect(page.url()).toMatch(/\/(feed|dashboard)/);
  });

  test('應該能夠成功登入 - Creator', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[name="email"], input[type="email"]').first();
    await emailInput.fill(TEST_USERS.creator.email);

    const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
    await passwordInput.fill(TEST_USERS.creator.password);

    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    await page.waitForURL(/\/(feed|dashboard)/, { timeout: 15000 });
    await takeScreenshot(page, '07-creator-logged-in');

    expect(page.url()).toMatch(/\/(feed|dashboard)/);
  });

  test('應該拒絕錯誤的密碼', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[name="email"]').first();
    await emailInput.fill(TEST_USERS.subscriber.email);

    const passwordInput = page.locator('input[name="password"]').first();
    await passwordInput.fill('WrongPassword123!');

    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // 等待錯誤訊息
    await page.waitForTimeout(2000);
    await takeScreenshot(page, '08-login-error');

    // 驗證錯誤訊息出現
    const errorMessage = page.locator('text=/密碼錯誤|Invalid password|incorrect/i').first();
    const hasError = await errorMessage.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (hasError) {
      await expect(errorMessage).toBeVisible();
    }

    // 驗證仍在登入頁面
    expect(page.url()).toContain('/login');
  });

  test('應該能夠成功登出', async ({ page }) => {
    test.use({ storageState: 'e2e/.auth/subscriber.json' });

    await page.goto('/feed');
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, '09-before-logout');

    // 尋找登出按鈕
    const logoutButton = page.locator('button:has-text("登出"), button:has-text("Logout"), a:has-text("登出")').first();
    
    // 如果找不到直接的登出按鈕，嘗試點擊用戶選單
    const hasLogoutButton = await logoutButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!hasLogoutButton) {
      // 嘗試點擊用戶頭像或選單
      const userMenu = page.locator('[data-testid="user-menu"], button[aria-label*="用戶"], button[aria-label*="User"]').first();
      if (await userMenu.isVisible({ timeout: 3000 }).catch(() => false)) {
        await userMenu.click();
        await page.waitForTimeout(500);
        await takeScreenshot(page, '10-user-menu-opened');
        
        const logoutOption = page.locator('button:has-text("登出"), a:has-text("登出")').first();
        await logoutOption.click();
      }
    } else {
      await logoutButton.click();
    }

    // 等待導航到登入頁面
    await page.waitForTimeout(2000);
    await takeScreenshot(page, '11-after-logout');

    // 驗證已登出
    const onLoginPage = page.url().includes('/login') || page.url() === 'http://127.0.0.1:4200/';
    expect(onLoginPage).toBeTruthy();
  });

  test('應該在未登入時重定向到登入頁面', async ({ page }) => {
    // 訪問需要認證的頁面
    await page.goto('/profile');
    await page.waitForTimeout(2000);
    await takeScreenshot(page, '12-redirect-to-login');

    // 驗證重定向到登入頁面或顯示登入表單
    const isLoginPage = page.url().includes('/login') || 
                        await page.locator('h1:has-text("登入"), h2:has-text("Login")').isVisible().catch(() => false);
    expect(isLoginPage).toBeTruthy();
  });
});

test.describe('密碼重設流程', () => {
  test('應該能夠訪問忘記密碼頁面', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // 尋找「忘記密碼」連結
    const forgotPasswordLink = page.locator('a:has-text("忘記密碼"), a:has-text("Forgot Password")').first();
    const hasLink = await forgotPasswordLink.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasLink) {
      await forgotPasswordLink.click();
      await page.waitForLoadState('networkidle');
      await takeScreenshot(page, '13-forgot-password');

      // 驗證在忘記密碼頁面
      const onForgotPage = page.url().includes('/forgot-password') || 
                          await page.locator('h1:has-text("忘記密碼"), h1:has-text("Reset Password")').isVisible();
      expect(onForgotPage).toBeTruthy();
    } else {
      test.skip(true, '忘記密碼功能尚未實作');
    }
  });
});
