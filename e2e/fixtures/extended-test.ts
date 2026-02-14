import { test as base, Page } from '@playwright/test';
import { LoginPage } from '../pages/web/auth/login.page';
import { RegisterPage } from '../pages/web/auth/register.page';
import { DiscoverPage } from '../pages/web/discover/discover.page';
import { ApiHelper } from '../utils/api-helper';

/**
 * 擴展的測試 Fixtures
 * 提供預先配置的 Page Objects 和工具
 */
type MyFixtures = {
  loginPage: LoginPage;
  registerPage: RegisterPage;
  discoverPage: DiscoverPage;
  apiHelper: ApiHelper;
  authenticatedPage: Page;
  creatorPage: Page;
  adminPage: Page;
};

export const test = base.extend<MyFixtures>({
  /**
   * 登入頁面 Fixture
   */
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  /**
   * 註冊頁面 Fixture
   */
  registerPage: async ({ page }, use) => {
    const registerPage = new RegisterPage(page);
    await use(registerPage);
  },

  /**
   * 探索頁面 Fixture
   */
  discoverPage: async ({ page }, use) => {
    const discoverPage = new DiscoverPage(page);
    await use(discoverPage);
  },

  /**
   * API Helper Fixture
   */
  apiHelper: async ({ request }, use) => {
    const apiHelper = new ApiHelper(request);
    await use(apiHelper);
  },

  /**
   * 已認證的訂閱者頁面
   * 使用 API 快速登入，避免每次都走 UI
   */
  authenticatedPage: async ({ page, apiHelper }, use) => {
    try {
      // 嘗試使用現有測試用戶登入
      const token = await apiHelper.loginAndGetToken(
        'subscriber@test.com',
        'Test1234!'
      );

      await page.goto('/');
      await page.evaluate((token) => {
        localStorage.setItem('accessToken', token);
        localStorage.setItem('token', token);
      }, token);

      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      await use(page);
    } catch (error) {
      console.warn('Failed to login with test user, using page as-is:', error);
      await use(page);
    }
  },

  /**
   * 已認證的創作者頁面
   */
  creatorPage: async ({ page, apiHelper }, use) => {
    try {
      const token = await apiHelper.loginAndGetToken(
        'creator@test.com',
        'Test1234!'
      );

      await page.goto('/');
      await page.evaluate((token) => {
        localStorage.setItem('accessToken', token);
        localStorage.setItem('token', token);
      }, token);

      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      await use(page);
    } catch (error) {
      console.warn('Failed to login with creator user, using page as-is:', error);
      await use(page);
    }
  },

  /**
   * 已認證的管理員頁面
   */
  adminPage: async ({ page, apiHelper }, use) => {
    try {
      const token = await apiHelper.loginAndGetToken(
        'admin@test.com',
        'Admin1234!'
      );

      await page.goto('/admin');
      await page.evaluate((token) => {
        localStorage.setItem('accessToken', token);
        localStorage.setItem('token', token);
      }, token);

      await page.goto('/admin/dashboard');
      await page.waitForLoadState('networkidle');

      await use(page);
    } catch (error) {
      console.warn('Failed to login with admin user, using page as-is:', error);
      await use(page);
    }
  },
});

export { expect } from '@playwright/test';
