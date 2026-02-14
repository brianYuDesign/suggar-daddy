import { test, expect } from '@playwright/test';
import { TEST_USERS, takeScreenshot } from '../utils/test-helpers';

/**
 * Admin 登入輔助函數
 */
async function loginAdmin(page: any) {
  await page.goto('http://localhost:4300/login');
  await page.fill('input[name="email"]', TEST_USERS.admin.email);
  await page.fill('input[name="password"]', TEST_USERS.admin.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 5000 });
}

test.describe('管理員登入', () => {
  test('應該能訪問登入頁面', async ({ page }) => {
    await page.goto('http://localhost:4300/login');
    await expect(page.locator('h1, h2')).toContainText(/登[入錄]|Admin/i);
    await takeScreenshot(page, 'admin-login-page', { fullPage: true });
  });

  test('登入失敗時應該顯示錯誤訊息', async ({ page }) => {
    await page.goto('http://localhost:4300/login');
    await page.fill('input[name="email"]', 'wrong@admin.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    await page.waitForSelector('[role="alert"], .error, .text-red', {
      timeout: 3000,
    });
    await takeScreenshot(page, 'admin-login-error');
  });
});

test.describe('管理儀表板總覽', () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test('應該能查看儀表板首頁', async ({ page, context }) => {
    await context.tracing.start({ screenshots: true, snapshots: true });

    await page.goto('http://localhost:4300/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    
    // 應該能看到統計卡片
    await page.waitForSelector('[data-testid="stat-card"], .stat, .metric-card', {
      timeout: 5000,
    });
    
    await takeScreenshot(page, 'admin-dashboard', { fullPage: true });

    await context.tracing.stop({ path: 'test-results/admin-dashboard-flow.zip' });
  });

  test('應該能查看關鍵指標', async ({ page }) => {
    await page.goto('http://localhost:4300/dashboard');
    
    // 檢查是否有數字統計
    const stats = page.locator('[data-testid="stat-card"], .stat, .metric-card');
    const count = await stats.count();
    expect(count).toBeGreaterThan(0);
    
    await takeScreenshot(page, 'admin-metrics');
  });
});

test.describe('用戶管理', () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test('應該能查看用戶列表', async ({ page, context }) => {
    await context.tracing.start({ screenshots: true, snapshots: true });

    await page.goto('http://localhost:4300/dashboard/users');
    await expect(page).toHaveURL(/\/dashboard\/users/);
    
    // 等待用戶列表載入
    await page.waitForSelector('table, [data-testid="user-list"], .user-table', {
      timeout: 5000,
    });
    
    await takeScreenshot(page, 'admin-users-list', { fullPage: true });

    await context.tracing.stop({ path: 'test-results/admin-users-flow.zip' });
  });

  test('應該能搜尋用戶', async ({ page }) => {
    await page.goto('http://localhost:4300/dashboard/users');
    
    const searchInput = page.locator('input[type="search"], input[placeholder*="搜"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(1000);
      await takeScreenshot(page, 'admin-users-search');
    }
  });

  test('應該能按角色篩選用戶', async ({ page }) => {
    await page.goto('http://localhost:4300/dashboard/users');
    
    // 尋找篩選或下拉選單
    const filterButton = page.locator('button:has-text("篩選"), select, [role="combobox"]').first();
    if (await filterButton.isVisible()) {
      await filterButton.click();
      await page.waitForTimeout(500);
      await takeScreenshot(page, 'admin-users-filter');
    }
  });

  test('應該能查看用戶詳情', async ({ page }) => {
    await page.goto('http://localhost:4300/dashboard/users');
    await page.waitForSelector('table tr, [data-testid="user-row"]');
    
    // 點擊第一個用戶
    const firstUser = page.locator('table tbody tr, [data-testid="user-row"]').first();
    await firstUser.click();
    
    // 應該導航到用戶詳情頁
    await page.waitForURL(/\/dashboard\/users\/\d+/);
    await takeScreenshot(page, 'admin-user-detail', { fullPage: true });
  });
});

test.describe('支付與營收分析', () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test('應該能查看支付分析', async ({ page, context }) => {
    await context.tracing.start({ screenshots: true, snapshots: true });

    await page.goto('http://localhost:4300/dashboard/payments');
    await expect(page).toHaveURL(/\/dashboard\/payments/);
    
    await takeScreenshot(page, 'admin-payments', { fullPage: true });

    await context.tracing.stop({ path: 'test-results/admin-payments-flow.zip' });
  });

  test('應該能查看營收圖表', async ({ page }) => {
    await page.goto('http://localhost:4300/dashboard/payments');
    
    // 等待圖表載入
    await page.waitForSelector('canvas, [data-testid="chart"], .chart', {
      timeout: 5000,
    });
    
    await takeScreenshot(page, 'admin-revenue-chart');
  });

  test('應該能查看訂閱管理', async ({ page }) => {
    await page.goto('http://localhost:4300/dashboard/subscriptions');
    await expect(page).toHaveURL(/\/dashboard\/subscriptions/);
    await takeScreenshot(page, 'admin-subscriptions', { fullPage: true });
  });

  test('應該能查看交易記錄', async ({ page }) => {
    await page.goto('http://localhost:4300/dashboard/transactions');
    await expect(page).toHaveURL(/\/dashboard\/transactions/);
    await takeScreenshot(page, 'admin-transactions', { fullPage: true });
  });
});

test.describe('提現管理', () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test('應該能查看提現列表', async ({ page, context }) => {
    await context.tracing.start({ screenshots: true, snapshots: true });

    await page.goto('http://localhost:4300/dashboard/withdrawals');
    await expect(page).toHaveURL(/\/dashboard\/withdrawals/);
    
    await takeScreenshot(page, 'admin-withdrawals', { fullPage: true });

    await context.tracing.stop({ path: 'test-results/admin-withdrawals-flow.zip' });
  });

  test('應該能篩選待審批提現', async ({ page }) => {
    await page.goto('http://localhost:4300/dashboard/withdrawals');
    
    const pendingFilter = page.locator('button:has-text("待審"), [value="PENDING"]').first();
    if (await pendingFilter.isVisible()) {
      await pendingFilter.click();
      await page.waitForTimeout(1000);
      await takeScreenshot(page, 'admin-withdrawals-pending');
    }
  });
});

test.describe('內容審核', () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test('應該能查看內容列表', async ({ page }) => {
    await page.goto('http://localhost:4300/dashboard/content');
    await expect(page).toHaveURL(/\/dashboard\/content/);
    await takeScreenshot(page, 'admin-content', { fullPage: true });
  });

  test('應該能查看舉報列表', async ({ page, context }) => {
    await context.tracing.start({ screenshots: true, snapshots: true });

    await page.goto('http://localhost:4300/dashboard/content/reports');
    await expect(page).toHaveURL(/\/dashboard\/content\/reports/);
    await takeScreenshot(page, 'admin-content-reports', { fullPage: true });

    await context.tracing.stop({ path: 'test-results/admin-reports-flow.zip' });
  });
});

test.describe('系統管理與分析', () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test('應該能查看高級分析', async ({ page }) => {
    await page.goto('http://localhost:4300/dashboard/analytics');
    await expect(page).toHaveURL(/\/dashboard\/analytics/);
    await takeScreenshot(page, 'admin-analytics', { fullPage: true });
  });

  test('應該能查看審計日誌', async ({ page, context }) => {
    await context.tracing.start({ screenshots: true, snapshots: true });

    await page.goto('http://localhost:4300/dashboard/audit-log');
    await expect(page).toHaveURL(/\/dashboard\/audit-log/);
    await takeScreenshot(page, 'admin-audit-log', { fullPage: true });

    await context.tracing.stop({ path: 'test-results/admin-audit-flow.zip' });
  });

  test('應該能訪問系統設定', async ({ page }) => {
    await page.goto('http://localhost:4300/dashboard/system');
    await expect(page).toHaveURL(/\/dashboard\/system/);
    await takeScreenshot(page, 'admin-system-settings', { fullPage: true });
  });
});

test.describe('Admin 響應式設計', () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test('平板版 - 儀表板應該正確顯示', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('http://localhost:4300/dashboard');
    await takeScreenshot(page, 'admin-tablet-dashboard', { fullPage: true });
  });

  test('桌面版 - 儀表板應該正確顯示', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:4300/dashboard');
    await takeScreenshot(page, 'admin-desktop-dashboard', { fullPage: true });
  });

  test('大螢幕 - 儀表板應該正確顯示', async ({ page }) => {
    await page.setViewportSize({ width: 2560, height: 1440 });
    await page.goto('http://localhost:4300/dashboard');
    await takeScreenshot(page, 'admin-large-dashboard', { fullPage: true });
  });
});

test.describe('Admin 導航測試', () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test('應該能在不同頁面之間導航', async ({ page, context }) => {
    await context.tracing.start({ screenshots: true, snapshots: true });

    // 儀表板
    await page.goto('http://localhost:4300/dashboard');
    await takeScreenshot(page, 'nav-01-dashboard');

    // 用戶管理
    await page.goto('http://localhost:4300/dashboard/users');
    await takeScreenshot(page, 'nav-02-users');

    // 支付分析
    await page.goto('http://localhost:4300/dashboard/payments');
    await takeScreenshot(page, 'nav-03-payments');

    // 提現管理
    await page.goto('http://localhost:4300/dashboard/withdrawals');
    await takeScreenshot(page, 'nav-04-withdrawals');

    // 內容審核
    await page.goto('http://localhost:4300/dashboard/content');
    await takeScreenshot(page, 'nav-05-content');

    // 系統設定
    await page.goto('http://localhost:4300/dashboard/system');
    await takeScreenshot(page, 'nav-06-system');

    await context.tracing.stop({ path: 'test-results/admin-navigation-flow.zip' });
  });
});
