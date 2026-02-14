import { test, expect } from '@playwright/test';
import { login, TEST_USERS, takeScreenshot } from '../utils/test-helpers';

test.describe('用戶註冊與登入流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('應該能訪問首頁', async ({ page }) => {
    await expect(page).toHaveTitle(/Suggar Daddy/i);
    await takeScreenshot(page, 'homepage', { fullPage: true });
  });

  test('應該能導航到登入頁面', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.locator('h1, h2')).toContainText(/登[入錄]/);
    await takeScreenshot(page, 'login-page', { fullPage: true });
  });

  test('應該能導航到註冊頁面', async ({ page }) => {
    await page.goto('/auth/register');
    await expect(page.locator('h1, h2')).toContainText(/註冊|加入/);
    
    // 應該能看到角色選擇（創作者/探索者）
    await takeScreenshot(page, 'register-page', { fullPage: true });
  });

  test('登入失敗時應該顯示錯誤訊息', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'wrong@test.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // 應該看到錯誤訊息
    await page.waitForSelector('[role="alert"], .error, .text-red', {
      timeout: 3000,
    });
    await takeScreenshot(page, 'login-error');
  });
});

test.describe('內容動態牆 (Feed)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.subscriber);
  });

  test('應該能瀏覽動態牆', async ({ page, context }) => {
    // 開始錄影
    await context.tracing.start({ screenshots: true, snapshots: true });

    await page.goto('/feed');
    await expect(page).toHaveURL(/\/feed/);
    
    // 等待內容載入
    await page.waitForSelector('[data-testid="post-card"], article, .post', {
      timeout: 5000,
    });
    
    await takeScreenshot(page, 'feed-page', { fullPage: true });

    // 測試無限滾動
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000);
    await takeScreenshot(page, 'feed-scrolled');

    // 停止錄影
    await context.tracing.stop({ path: 'test-results/feed-flow.zip' });
  });

  test('應該能點贊貼文', async ({ page }) => {
    await page.goto('/feed');
    await page.waitForSelector('[data-testid="post-card"], article, .post');
    
    // 點擊第一個貼文的贊按鈕
    const likeButton = page
      .locator('button:has-text("贊"), button:has-text("讚"), button[aria-label*="like"]')
      .first();
    await likeButton.click();
    
    await page.waitForTimeout(1000);
    await takeScreenshot(page, 'post-liked');
  });

  test('應該能查看貼文詳情', async ({ page }) => {
    await page.goto('/feed');
    await page.waitForSelector('[data-testid="post-card"], article, .post');
    
    // 點擊第一個貼文
    const firstPost = page.locator('[data-testid="post-card"], article, .post').first();
    await firstPost.click();
    
    // 應該導航到貼文詳情頁
    await page.waitForURL(/\/post\/\d+/);
    await takeScreenshot(page, 'post-detail', { fullPage: true });
  });
});

test.describe('探索與配對功能', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.subscriber);
  });

  test('應該能瀏覽探索卡片牆', async ({ page, context }) => {
    await context.tracing.start({ screenshots: true, snapshots: true });

    await page.goto('/discover');
    await expect(page).toHaveURL(/\/discover/);
    
    // 等待卡片載入
    await page.waitForSelector('[data-testid="discover-card"], .card, .profile-card', {
      timeout: 5000,
    });
    
    await takeScreenshot(page, 'discover-page', { fullPage: true });

    // 測試滑動互動（如果有的話）
    const likeButton = page.locator('button:has-text("喜歡"), button:has-text("❤")').first();
    if (await likeButton.isVisible()) {
      await likeButton.click();
      await page.waitForTimeout(1000);
      await takeScreenshot(page, 'discover-liked');
    }

    await context.tracing.stop({ path: 'test-results/discover-flow.zip' });
  });

  test('應該能查看配對列表', async ({ page }) => {
    await page.goto('/matches');
    await expect(page).toHaveURL(/\/matches/);
    await takeScreenshot(page, 'matches-page', { fullPage: true });
  });
});

test.describe('消息與通知功能', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.subscriber);
  });

  test('應該能訪問消息列表', async ({ page }) => {
    await page.goto('/messages');
    await expect(page).toHaveURL(/\/messages/);
    await takeScreenshot(page, 'messages-list', { fullPage: true });
  });

  test('應該能查看通知中心', async ({ page }) => {
    await page.goto('/notifications');
    await expect(page).toHaveURL(/\/notifications/);
    await takeScreenshot(page, 'notifications-page', { fullPage: true });
  });
});

test.describe('個人檔案與設定', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.creator);
  });

  test('應該能查看個人檔案', async ({ page }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/profile/);
    await takeScreenshot(page, 'profile-page', { fullPage: true });
  });

  test('應該能編輯個人資料', async ({ page }) => {
    await page.goto('/profile/edit');
    await expect(page).toHaveURL(/\/profile\/edit/);
    await takeScreenshot(page, 'profile-edit', { fullPage: true });
  });

  test('應該能訪問帳號設定', async ({ page }) => {
    await page.goto('/profile/settings');
    await expect(page).toHaveURL(/\/profile\/settings/);
    await takeScreenshot(page, 'profile-settings', { fullPage: true });
  });
});

test.describe('錢包與交易功能', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.creator);
  });

  test('應該能查看錢包', async ({ page, context }) => {
    await context.tracing.start({ screenshots: true, snapshots: true });

    await page.goto('/wallet');
    await expect(page).toHaveURL(/\/wallet/);
    
    // 應該能看到餘額統計
    await takeScreenshot(page, 'wallet-page', { fullPage: true });

    await context.tracing.stop({ path: 'test-results/wallet-flow.zip' });
  });

  test('應該能查看交易記錄', async ({ page }) => {
    await page.goto('/wallet/history');
    await expect(page).toHaveURL(/\/wallet\/history/);
    await takeScreenshot(page, 'wallet-history', { fullPage: true });
  });

  test('應該能訪問提款頁面', async ({ page }) => {
    await page.goto('/wallet/withdraw');
    await expect(page).toHaveURL(/\/wallet\/withdraw/);
    await takeScreenshot(page, 'wallet-withdraw', { fullPage: true });
  });
});

test.describe('內容創作功能', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.creator);
  });

  test('應該能訪問發布動態頁面', async ({ page }) => {
    await page.goto('/post/create');
    await expect(page).toHaveURL(/\/post\/create/);
    await takeScreenshot(page, 'post-create', { fullPage: true });
  });

  test('應該能查看訂閱管理', async ({ page }) => {
    await page.goto('/subscription');
    await expect(page).toHaveURL(/\/subscription/);
    await takeScreenshot(page, 'subscription-page', { fullPage: true });
  });
});

test.describe('響應式設計測試', () => {
  test('手機版 - 首頁應該正確顯示', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await takeScreenshot(page, 'mobile-homepage', { fullPage: true });
  });

  test('平板版 - 首頁應該正確顯示', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await takeScreenshot(page, 'tablet-homepage', { fullPage: true });
  });

  test('桌面版 - 首頁應該正確顯示', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await takeScreenshot(page, 'desktop-homepage', { fullPage: true });
  });
});
