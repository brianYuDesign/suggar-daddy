import { Page, expect } from '@playwright/test';

/**
 * 測試用的用戶憑證
 */
export const TEST_USERS = {
  creator: {
    email: 'creator@test.com',
    password: 'Test1234!',
  },
  subscriber: {
    email: 'subscriber@test.com',
    password: 'Test1234!',
  },
  admin: {
    email: 'admin@test.com',
    password: 'Admin1234!',
  },
};

/**
 * 登入輔助函數
 */
export async function login(
  page: Page,
  credentials: { email: string; password: string },
  baseURL = 'http://localhost:4200'
) {
  await page.goto(`${baseURL}/auth/login`);
  await page.fill('input[name="email"]', credentials.email);
  await page.fill('input[name="password"]', credentials.password);
  await page.click('button[type="submit"]');
  
  // 等待導向到主頁或 dashboard
  await page.waitForURL(/\/(feed|dashboard)/, { timeout: 5000 });
}

/**
 * 截圖輔助函數
 */
export async function takeScreenshot(
  page: Page,
  name: string,
  options?: {
    fullPage?: boolean;
    clip?: { x: number; y: number; width: number; height: number };
  }
) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({
    path: `screenshots/${name}-${timestamp}.png`,
    fullPage: options?.fullPage ?? false,
    clip: options?.clip,
  });
}

/**
 * 等待 API 請求完成
 */
export async function waitForAPIRequest(
  page: Page,
  urlPattern: string | RegExp
) {
  return page.waitForResponse(
    (response) =>
      (typeof urlPattern === 'string'
        ? response.url().includes(urlPattern)
        : urlPattern.test(response.url())) && response.status() === 200
  );
}

/**
 * 模擬滾動載入更多內容
 */
export async function scrollToLoadMore(page: Page, times = 3) {
  for (let i = 0; i < times; i++) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
  }
}

/**
 * 檢查元素是否可見
 */
export async function expectVisible(page: Page, selector: string) {
  await expect(page.locator(selector)).toBeVisible();
}

/**
 * 檢查元素是否包含文字
 */
export async function expectText(
  page: Page,
  selector: string,
  text: string | RegExp
) {
  await expect(page.locator(selector)).toContainText(text);
}
