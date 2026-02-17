import { test as base, expect as baseExpect } from '@playwright/test';
import type { Page, APIRequestContext } from '@playwright/test';

/**
 * E2E Test Fixtures
 * 
 * 擴展 Playwright 的 test，提供共用的測試工具和資源
 */

// API 響應類型
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}

// 測試用戶類型
interface TestUser {
  email: string;
  password: string;
  displayName: string;
  role: 'sugar_baby' | 'sugar_daddy';
}

// 定義自定義 fixtures 類型
type CustomFixtures = {
  // 已登入的測試用戶頁面
  authenticatedPage: Page;
  
  // 測試數據
  testUser: TestUser;
  
  // API 客戶端
  apiClient: {
    get: (url: string) => Promise<ApiResponse>;
    post: (url: string, data: unknown) => Promise<ApiResponse>;
    request: APIRequestContext;
  };
  
  // 測試錄影路徑
  recordingPath: string;
};

// 擴展 expect
export const expect = baseExpect;

// 擴展測試
export const test = base.extend<CustomFixtures>({
  // 錄影路徑
  recordingPath: [async ({}, use, testInfo) => {
    const path = testInfo.outputPath('recording.webm');
    await use(path);
  }, { scope: 'test' }],
  
  // 測試用戶
  testUser: async ({}, use) => {
    const timestamp = Date.now();
    const user: TestUser = {
      email: `e2e-test-${timestamp}@example.com`,
      password: 'TestPassword123!',
      displayName: `E2E Test User ${timestamp}`,
      role: 'sugar_baby',
    };
    
    await use(user);
    
    // 測試完成後清理（如果 API 可用）
    // TODO: 調用清理 API
  },
  
  // API 客戶端
  apiClient: async ({ request }, use) => {
    const client = {
      async get(url: string): Promise<ApiResponse> {
        const response = await request.get(url);
        const data = await response.json().catch(() => ({}));
        return {
          success: response.ok(),
          data,
          message: data.message || response.statusText(),
        };
      },
      
      async post(url: string, data: unknown): Promise<ApiResponse> {
        const response = await request.post(url, { data });
        const responseData = await response.json().catch(() => ({}));
        return {
          success: response.ok(),
          data: responseData,
          message: responseData.message || response.statusText(),
        };
      },
      
      request,
    };
    
    await use(client);
  },
  
  // 已認證的頁面
  authenticatedPage: async ({ page, testUser }, use) => {
    // 登入流程
    await page.goto('/login');
    
    // 填寫登入表單
    await page.locator('input#email').fill(testUser.email);
    await page.locator('input#password').fill(testUser.password);
    await page.locator('button[type="submit"]').click();
    
    // 等待登入完成（導航到 feed 或顯示錯誤）
    await page.waitForURL(/\/feed|\/login/, { timeout: 10000 });
    
    // 如果使用測試用戶不存在，先註冊
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      // 登入失敗，嘗試註冊
      await page.goto('/register');
      await page.locator('button[aria-label="選擇 Sugar Baby"]').click();
      await page.locator('input#displayName').fill(testUser.displayName);
      await page.locator('input#email').fill(testUser.email);
      await page.locator('input#password').fill(testUser.password);
      await page.locator('button[type="submit"]').click();
      
      // 等待註冊完成
      await page.waitForTimeout(3000);
      
      // 如果還在註冊頁面，可能需要驗證郵箱，直接跳到 feed
      if (page.url().includes('/register')) {
        await page.goto('/feed');
      }
    }
    
    await use(page);
    
    // 清理：登出
    // await page.goto('/logout');
  },
});

// 導出類型
export type { TestUser, ApiResponse, CustomFixtures };
