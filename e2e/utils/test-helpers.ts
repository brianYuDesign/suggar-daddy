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
 * 登入輔助函數 — 透過 API 取得 token 寫入 localStorage，避免 UI 登入的速率限制
 */
export async function login(
  page: Page,
  credentials: { email: string; password: string },
  baseURL = 'http://localhost:4200'
) {
  // 先導航到任意頁面以建立 origin context
  await page.goto(`${baseURL}/login`);

  // 透過 API 直接登入取得 token（含 rate limit 重試）
  const apiBase = 'http://localhost:3000';
  let res = await page.request.post(`${apiBase}/api/auth/login`, {
    data: { email: credentials.email, password: credentials.password },
  });

  // If rate limited, clear Redis rate limit keys and retry
  if (res.status() === 429) {
    try {
      const { getRedisTestHelper } = await import('./redis-helper');
      const redisHelper = getRedisTestHelper();
      await redisHelper.clearLoginAttempts(credentials.email);
      await redisHelper.clearLoginAttempts(); // Clear all
    } catch { /* Redis may not be available */ }
    // Wait a moment for rate limit to clear
    await page.waitForTimeout(1000);
    res = await page.request.post(`${apiBase}/api/auth/login`, {
      data: { email: credentials.email, password: credentials.password },
    });
  }

  if (!res.ok()) {
    throw new Error(`Login API failed: ${res.status()} ${await res.text()}`);
  }

  const tokens = await res.json();

  // 將 token 寫入 localStorage
  await page.evaluate((t) => {
    localStorage.setItem('sd_access_token', t.accessToken);
    localStorage.setItem('sd_refresh_token', t.refreshToken);
  }, tokens);

  // 導航到 feed 讓 auth-provider 從 localStorage 讀取 token
  await page.goto(`${baseURL}/feed`);
  await page.waitForURL(/\/(feed|dashboard)/, { timeout: 10000 });
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
