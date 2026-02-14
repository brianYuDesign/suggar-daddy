import { test, expect } from '../../fixtures/extended-test';

/**
 * 用戶註冊流程測試
 * 涵蓋各種註冊場景和驗證
 */
test.describe('用戶註冊流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/register');
  });

  test('TC-001: 成功註冊訂閱者帳號', async ({ page, registerPage }) => {
    const timestamp = Date.now();
    const email = `subscriber-${timestamp}@test.com`;

    await registerPage.register({
      email,
      password: 'Test1234!',
      confirmPassword: 'Test1234!',
      name: `Test Subscriber ${timestamp}`,
      role: 'SUBSCRIBER',
    });

    // 驗證跳轉到 Dashboard
    await expect(page).toHaveURL(/\/(dashboard|feed)/);
    
    // 驗證歡迎訊息或用戶名出現
    await expect(
      page.locator('text=/歡迎|Welcome|Dashboard/')
    ).toBeVisible({ timeout: 10000 });
  });

  test('TC-002: 成功註冊創作者帳號', async ({ page, registerPage }) => {
    const timestamp = Date.now();
    const email = `creator-${timestamp}@test.com`;

    await registerPage.register({
      email,
      password: 'Test1234!',
      confirmPassword: 'Test1234!',
      name: `Test Creator ${timestamp}`,
      role: 'CREATOR',
    });

    // 驗證跳轉成功
    await expect(page).toHaveURL(/\/(dashboard|feed|profile)/);
  });

  test('TC-003: 驗證必填欄位 - Email', async ({ registerPage }) => {
    await registerPage.register({
      email: '',
      password: 'Test1234!',
      confirmPassword: 'Test1234!',
      name: 'Test User',
      role: 'SUBSCRIBER',
    });

    // 驗證錯誤訊息
    const hasError = await registerPage.hasFieldError('email');
    expect(hasError).toBeTruthy();
  });

  test('TC-004: 驗證必填欄位 - Password', async ({ registerPage }) => {
    await registerPage.register({
      email: 'test@example.com',
      password: '',
      confirmPassword: '',
      name: 'Test User',
      role: 'SUBSCRIBER',
    });

    const hasError = await registerPage.hasFieldError('password');
    expect(hasError).toBeTruthy();
  });

  test('TC-005: 驗證必填欄位 - Name', async ({ registerPage }) => {
    await registerPage.register({
      email: 'test@example.com',
      password: 'Test1234!',
      confirmPassword: 'Test1234!',
      name: '',
      role: 'SUBSCRIBER',
    });

    const hasError = await registerPage.hasFieldError('name');
    expect(hasError).toBeTruthy();
  });

  test('TC-006: 驗證密碼不一致', async ({ page, registerPage }) => {
    await registerPage.register({
      email: 'test@example.com',
      password: 'Test1234!',
      confirmPassword: 'Different1234!',
      name: 'Test User',
      role: 'SUBSCRIBER',
    });

    // 驗證密碼不一致錯誤
    const errorVisible = await page.locator('text=/密碼不一致|Passwords do not match/i').isVisible();
    expect(errorVisible).toBeTruthy();
  });

  test('TC-007: 驗證 Email 格式錯誤', async ({ page, registerPage }) => {
    await registerPage.register({
      email: 'invalid-email',
      password: 'Test1234!',
      confirmPassword: 'Test1234!',
      name: 'Test User',
      role: 'SUBSCRIBER',
    });

    // 驗證 Email 格式錯誤訊息
    const errorVisible = await page.locator('text=/無效的郵箱|Invalid email|email.*invalid/i').isVisible();
    expect(errorVisible).toBeTruthy();
  });

  test('TC-008: 驗證密碼強度 - 過短', async ({ page, registerPage }) => {
    await registerPage.register({
      email: 'test@example.com',
      password: '123',
      confirmPassword: '123',
      name: 'Test User',
      role: 'SUBSCRIBER',
    });

    // 驗證密碼過短錯誤
    const errorVisible = await page.locator('text=/密碼.*至少|Password.*least|too short/i').isVisible();
    expect(errorVisible).toBeTruthy();
  });

  test('TC-009: 驗證重複 Email', async ({ page, registerPage, apiHelper }) => {
    // 先創建一個用戶
    const existingEmail = `existing-${Date.now()}@test.com`;
    
    try {
      await apiHelper.createUser({
        email: existingEmail,
        password: 'Test1234!',
        name: 'Existing User',
        role: 'SUBSCRIBER',
      });
    } catch (error) {
      console.warn('Failed to create existing user, test may not work correctly:', error);
    }

    // 嘗試用相同 Email 註冊
    await page.goto('/auth/register');
    await registerPage.register({
      email: existingEmail,
      password: 'Test1234!',
      confirmPassword: 'Test1234!',
      name: 'New User',
      role: 'SUBSCRIBER',
    });

    // 驗證重複 Email 錯誤
    await page.waitForTimeout(2000);
    const errorVisible = await page.locator('text=/已被使用|already.*use|exists/i').isVisible();
    expect(errorVisible).toBeTruthy();
  });

  test('TC-010: 未勾選服務條款無法註冊', async ({ registerPage }) => {
    await registerPage.register({
      email: 'test@example.com',
      password: 'Test1234!',
      confirmPassword: 'Test1234!',
      name: 'Test User',
      role: 'SUBSCRIBER',
      acceptTerms: false,
    });

    // 驗證按鈕被禁用或顯示錯誤
    const isDisabled = await registerPage.isRegisterButtonDisabled();
    expect(isDisabled).toBeTruthy();
  });

  test('TC-011: 點擊登入連結跳轉到登入頁面', async ({ page, registerPage }) => {
    await registerPage.clickLoginLink();
    
    // 驗證跳轉到登入頁面
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('TC-012: 檢查密碼可見性切換', async ({ page }) => {
    const passwordInput = page.locator('input[name="password"]');
    const toggleButton = page.locator('button[aria-label*="密碼"], button[aria-label*="password"]').first();

    // 輸入密碼
    await passwordInput.fill('Test1234!');

    // 檢查初始是 password 類型
    const initialType = await passwordInput.getAttribute('type');
    expect(initialType).toBe('password');

    // 點擊切換按鈕（如果存在）
    if (await toggleButton.isVisible()) {
      await toggleButton.click();
      const newType = await passwordInput.getAttribute('type');
      expect(newType).toBe('text');
    }
  });
});
