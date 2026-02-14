import { test, expect } from '@playwright/test';
import { login, TEST_USERS, takeScreenshot, waitForAPIRequest } from '../utils/test-helpers';

test.describe('完整用戶旅程 - 創作者流程', () => {
  test('創作者完整工作流程', async ({ page, context }) => {
    // 開始完整錄影
    await context.tracing.start({ 
      screenshots: true, 
      snapshots: true,
      sources: true,
    });

    test.setTimeout(120000); // 2分鐘超時

    // 1. 登入
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', TEST_USERS.creator.email);
    await page.fill('input[name="password"]', TEST_USERS.creator.password);
    await takeScreenshot(page, 'journey-01-login-form');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(feed|dashboard)/);
    await takeScreenshot(page, 'journey-02-logged-in');

    // 2. 查看個人檔案
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, 'journey-03-profile', { fullPage: true });

    // 3. 查看錢包
    await page.goto('/wallet');
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, 'journey-04-wallet', { fullPage: true });

    // 4. 發布新動態
    await page.goto('/post/create');
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, 'journey-05-create-post');
    
    // 填寫表單（如果有輸入框）
    const titleInput = page.locator('input[name="title"], textarea[name="title"]').first();
    if (await titleInput.isVisible()) {
      await titleInput.fill('測試貼文標題');
    }
    
    const contentInput = page.locator('textarea[name="content"], [contenteditable]').first();
    if (await contentInput.isVisible()) {
      await contentInput.fill('這是一篇測試貼文內容');
      await takeScreenshot(page, 'journey-06-post-filled');
    }

    // 5. 查看動態牆
    await page.goto('/feed');
    await page.waitForSelector('[data-testid="post-card"], article, .post', { timeout: 5000 });
    await takeScreenshot(page, 'journey-07-feed', { fullPage: true });

    // 6. 查看通知
    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, 'journey-08-notifications', { fullPage: true });

    // 7. 查看訂閱管理
    await page.goto('/subscription');
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, 'journey-09-subscriptions', { fullPage: true });

    // 8. 查看交易記錄
    await page.goto('/wallet/history');
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, 'journey-10-transactions', { fullPage: true });

    // 停止錄影
    await context.tracing.stop({ path: 'test-results/creator-full-journey.zip' });
  });
});

test.describe('完整用戶旅程 - 探索者流程', () => {
  test('探索者完整工作流程', async ({ page, context }) => {
    await context.tracing.start({ 
      screenshots: true, 
      snapshots: true,
      sources: true,
    });

    test.setTimeout(120000);

    // 1. 登入
    await login(page, TEST_USERS.subscriber);
    await takeScreenshot(page, 'subscriber-01-logged-in');

    // 2. 探索卡片牆
    await page.goto('/discover');
    await page.waitForSelector('[data-testid="discover-card"], .card, .profile-card', { timeout: 5000 });
    await takeScreenshot(page, 'subscriber-02-discover', { fullPage: true });

    // 3. 點贊用戶
    const likeButton = page.locator('button:has-text("喜歡"), button:has-text("❤")').first();
    if (await likeButton.isVisible()) {
      await likeButton.click();
      await page.waitForTimeout(1000);
      await takeScreenshot(page, 'subscriber-03-liked');
    }

    // 4. 查看配對
    await page.goto('/matches');
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, 'subscriber-04-matches', { fullPage: true });

    // 5. 查看消息
    await page.goto('/messages');
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, 'subscriber-05-messages', { fullPage: true });

    // 6. 瀏覽動態牆
    await page.goto('/feed');
    await page.waitForSelector('[data-testid="post-card"], article, .post', { timeout: 5000 });
    await takeScreenshot(page, 'subscriber-06-feed', { fullPage: true });

    // 7. 滾動載入更多
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000);
    await takeScreenshot(page, 'subscriber-07-feed-scrolled', { fullPage: true });

    // 8. 點贊貼文
    const postLikeButton = page.locator('button:has-text("贊"), button:has-text("讚")').first();
    if (await postLikeButton.isVisible()) {
      await postLikeButton.click();
      await page.waitForTimeout(1000);
      await takeScreenshot(page, 'subscriber-08-post-liked');
    }

    // 9. 查看貼文詳情
    const firstPost = page.locator('[data-testid="post-card"], article, .post').first();
    await firstPost.click();
    await page.waitForURL(/\/post\/\d+/);
    await takeScreenshot(page, 'subscriber-09-post-detail', { fullPage: true });

    // 10. 查看創作者檔案
    const profileLink = page.locator('a[href*="/user/"], [data-testid="author-link"]').first();
    if (await profileLink.isVisible()) {
      await profileLink.click();
      await page.waitForURL(/\/user\/\d+/);
      await takeScreenshot(page, 'subscriber-10-creator-profile', { fullPage: true });
    }

    await context.tracing.stop({ path: 'test-results/subscriber-full-journey.zip' });
  });
});

test.describe('完整用戶旅程 - 管理員流程', () => {
  test('管理員完整工作流程', async ({ page, context }) => {
    await context.tracing.start({ 
      screenshots: true, 
      snapshots: true,
      sources: true,
    });

    test.setTimeout(180000); // 3分鐘

    // 1. 登入管理後台
    await page.goto('http://localhost:4300/login');
    await page.fill('input[name="email"]', TEST_USERS.admin.email);
    await page.fill('input[name="password"]', TEST_USERS.admin.password);
    await takeScreenshot(page, 'admin-journey-01-login');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/);
    await takeScreenshot(page, 'admin-journey-02-dashboard', { fullPage: true });

    // 2. 查看用戶管理
    await page.goto('http://localhost:4300/dashboard/users');
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, 'admin-journey-03-users', { fullPage: true });

    // 3. 搜尋用戶
    const searchInput = page.locator('input[type="search"], input[placeholder*="搜"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(1000);
      await takeScreenshot(page, 'admin-journey-04-user-search');
    }

    // 4. 查看支付分析
    await page.goto('http://localhost:4300/dashboard/payments');
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, 'admin-journey-05-payments', { fullPage: true });

    // 5. 查看提現管理
    await page.goto('http://localhost:4300/dashboard/withdrawals');
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, 'admin-journey-06-withdrawals', { fullPage: true });

    // 6. 查看內容審核
    await page.goto('http://localhost:4300/dashboard/content');
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, 'admin-journey-07-content', { fullPage: true });

    // 7. 查看舉報列表
    await page.goto('http://localhost:4300/dashboard/content/reports');
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, 'admin-journey-08-reports', { fullPage: true });

    // 8. 查看交易記錄
    await page.goto('http://localhost:4300/dashboard/transactions');
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, 'admin-journey-09-transactions', { fullPage: true });

    // 9. 查看分析報表
    await page.goto('http://localhost:4300/dashboard/analytics');
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, 'admin-journey-10-analytics', { fullPage: true });

    // 10. 查看審計日誌
    await page.goto('http://localhost:4300/dashboard/audit-log');
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, 'admin-journey-11-audit-log', { fullPage: true });

    // 11. 查看系統設定
    await page.goto('http://localhost:4300/dashboard/system');
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, 'admin-journey-12-system', { fullPage: true });

    // 12. 回到儀表板
    await page.goto('http://localhost:4300/dashboard');
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, 'admin-journey-13-final-dashboard', { fullPage: true });

    await context.tracing.stop({ path: 'test-results/admin-full-journey.zip' });
  });
});

test.describe('跨瀏覽器相容性測試', () => {
  test('Chromium - 完整流程', async ({ page }) => {
    await login(page, TEST_USERS.subscriber);
    await page.goto('/feed');
    await takeScreenshot(page, 'chromium-feed', { fullPage: true });
  });
});

test.describe('效能測試', () => {
  test('首頁載入效能', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    console.log(`首頁載入時間: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000); // 應該在5秒內載入
    
    await takeScreenshot(page, 'performance-homepage');
  });

  test('動態牆載入效能', async ({ page }) => {
    await login(page, TEST_USERS.subscriber);
    
    const startTime = Date.now();
    await page.goto('/feed');
    await page.waitForSelector('[data-testid="post-card"], article, .post');
    const loadTime = Date.now() - startTime;
    
    console.log(`動態牆載入時間: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(3000);
    
    await takeScreenshot(page, 'performance-feed');
  });
});
