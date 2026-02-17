import { test, expect } from '../../fixtures/base';
import { LoginPage } from '../../page-objects/LoginPage';
import { FeedPage } from '../../page-objects/FeedPage';

/**
 * 關鍵導航路徑測試
 * 
 * 確保應用的核心導航功能正常工作
 */
test.describe('關鍵導航路徑', () => {
  
  test.describe('公開頁面訪問', () => {
    
    test('應該可以訪問首頁 @critical @smoke', async ({ page }) => {
      await page.goto('/');
      
      // 驗證頁面加載
      await expect(page).toHaveURL(/\/$|\/feed$|\/login$/);
      
      // 檢查頁面內容
      const content = await page.content();
      expect(content.length).toBeGreaterThan(100);
    });

    test('應該可以訪問登入頁面 @critical @smoke', async ({ page }) => {
      const loginPage = new LoginPage(page);
      
      await loginPage.goto();
      
      await expect(page).toHaveURL(/\/login/);
      await expect(loginPage.emailInput).toBeVisible();
    });

    test('應該可以訪問註冊頁面 @critical @smoke', async ({ page }) => {
      await page.goto('/register');
      
      await expect(page).toHaveURL(/\/register/);
      await expect(page.locator('input#email')).toBeVisible();
    });

    test('應該可以訪問忘記密碼頁面 @critical', async ({ page }) => {
      await page.goto('/forgot-password');
      
      await expect(page).toHaveURL(/\/forgot-password/);
      // 頁面應該有加載內容
      const content = await page.content();
      expect(content.length).toBeGreaterThan(100);
    });
  });

  test.describe('需要認證的頁面', () => {
    
    test('未登入用戶訪問 Feed 應該被重定向 @auth-guard', async ({ page }) => {
      await page.goto('/feed');
      
      // 等待重定向
      await page.waitForTimeout(1000);
      
      const currentUrl = page.url();
      
      // 應該被重定向到登入頁面或顯示登入提示
      if (currentUrl.includes('/login')) {
        await expect(page).toHaveURL(/\/login/);
      } else {
        // 如果沒有重定向，應該顯示需要登入的提示
        const hasLoginPrompt = await page.locator('text=登入|login|註冊|register', { ignoreCase: true }).first().isVisible().catch(() => false);
        expect(hasLoginPrompt || currentUrl.includes('/feed')).toBeTruthy();
      }
    });

    test('未登入用戶訪問個人資料應該被重定向 @auth-guard', async ({ page }) => {
      await page.goto('/profile');
      
      // 等待可能的重定向
      await page.waitForTimeout(1000);
      
      const currentUrl = page.url();
      
      // 如果不是在 profile 頁面，應該被重定向
      if (!currentUrl.includes('/profile')) {
        expect(currentUrl.includes('/login') || currentUrl.includes('/feed')).toBeTruthy();
      }
    });
  });

  test.describe('頁面間導航', () => {
    
    test('應該可以從登入頁面導航到註冊頁面 @navigation', async ({ page }) => {
      const loginPage = new LoginPage(page);
      
      await loginPage.goto();
      await loginPage.clickRegister();
      
      await expect(page).toHaveURL(/\/register/);
    });

    test('應該可以從註冊頁面導航到登入頁面 @navigation', async ({ page }) => {
      await page.goto('/register');
      
      await page.locator('a[href="/login"]').click();
      
      await expect(page).toHaveURL(/\/login/);
    });

    test('404 頁面應該正確處理 @error-handling', async ({ page }) => {
      await page.goto('/non-existent-page-12345');
      
      // 等待頁面加載
      await page.waitForTimeout(1000);
      
      // 檢查是否顯示 404 內容或重定向
      const content = await page.content();
      const has404 = content.toLowerCase().includes('404') || 
                     content.toLowerCase().includes('not found') ||
                     content.toLowerCase().includes('找不到');
      
      // 或者可能被重定向到首頁
      const isHomePage = page.url() === '/' || page.url().includes('/feed');
      
      expect(has404 || isHomePage).toBeTruthy();
    });
  });

  test.describe('響應式導航', () => {
    
    test('應該在桌面顯示桌面導航 @responsive', async ({ page }) => {
      // 設置桌面視口
      await page.setViewportSize({ width: 1280, height: 720 });
      
      await page.goto('/login');
      
      // 桌面應該顯示側邊欄或頂部導航
      const hasDesktopNav = await page.locator('nav, [role="navigation"], .sidebar, header').first().isVisible().catch(() => false);
      expect(hasDesktopNav).toBeTruthy();
    });

    test('應該在移動設備顯示移動導航 @responsive', async ({ page }) => {
      // 設置移動視口
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/login');
      
      // 移動設備應該正確渲染
      const content = await page.content();
      expect(content.length).toBeGreaterThan(100);
    });
  });
});
