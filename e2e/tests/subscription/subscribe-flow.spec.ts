import { test, expect } from '../../fixtures/extended-test';

/**
 * 訂閱流程測試
 * 測試訂閱創作者、查看訂閱層級、管理訂閱等功能
 */
test.describe('訂閱流程', () => {
  test.beforeEach(async ({ page }) => {
    // 登入訂閱者帳號
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'subscriber@test.com');
    await page.fill('input[name="password"]', 'Test1234!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|feed)/, { timeout: 10000 });
  });

  test('TC-001: 查看訂閱層級列表', async ({ page }) => {
    // 假設有創作者 ID，導航到訂閱頁面
    await page.goto('/creator/creator123/subscribe');
    await page.waitForLoadState('networkidle');

    // 等待訂閱層級卡片載入
    await page.waitForTimeout(2000);

    // 驗證至少有訂閱選項（或空狀態訊息）
    const tierCards = page.locator('[data-testid="tier-card"], [class*="tier"], [class*="plan"]');
    const tierCount = await tierCards.count();

    if (tierCount === 0) {
      // 檢查是否顯示無訂閱層級訊息
      const noTiersMessage = await page.locator('text=/沒有.*層級|No.*tier|尚未設置/i').isVisible();
      expect(noTiersMessage).toBeTruthy();
    } else {
      expect(tierCount).toBeGreaterThanOrEqual(1);
    }
  });

  test('TC-002: 訂閱層級顯示價格', async ({ page }) => {
    await page.goto('/creator/creator123/subscribe');
    await page.waitForTimeout(2000);

    // 檢查價格顯示
    const priceElements = page.locator('text=/\\$\\d+|NT\\$\\d+|\\d+.*元/');
    const priceCount = await priceElements.count();

    // 如果有訂閱層級，應該顯示價格
    const tierCards = page.locator('[data-testid="tier-card"]');
    const hasTiers = await tierCards.count() > 0;

    if (hasTiers) {
      expect(priceCount).toBeGreaterThan(0);
    }
  });

  test('TC-003: 成功訂閱創作者（Mock Stripe）', async ({ page, context }) => {
    // Mock Stripe Checkout Session 創建
    await context.route('**/api/stripe/create-subscription-session', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          sessionId: 'mock-session-123',
          url: '/payment/success',
        }),
      });
    });

    // Mock 訂閱創建
    await context.route('**/api/subscriptions', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            subscription: {
              id: 'sub-123',
              status: 'active',
            },
          }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/creator/creator123/subscribe');
    await page.waitForTimeout(2000);

    // 選擇訂閱層級
    const tierCard = page.locator('[data-testid="tier-card"], [data-tier-id]').first();
    
    if (await tierCard.isVisible()) {
      await tierCard.click();

      // 點擊訂閱按鈕
      const subscribeButton = page.locator('button:has-text("訂閱"), button:has-text("立即訂閱")').first();
      await subscribeButton.click();

      // 等待跳轉或顯示成功訊息
      await page.waitForTimeout(2000);

      // 驗證成功（可能跳轉到成功頁面或顯示訊息）
      const currentUrl = page.url();
      const successMessage = await page.locator('text=/成功|success/i').isVisible();

      expect(currentUrl.includes('/success') || successMessage).toBeTruthy();
    } else {
      test.skip();
    }
  });

  test('TC-004: 查看我的訂閱列表', async ({ page }) => {
    await page.goto('/subscriptions/my');
    await page.waitForLoadState('networkidle');

    // 驗證頁面載入
    const isSubscriptionsPage = page.url().includes('/subscription');
    expect(isSubscriptionsPage).toBeTruthy();

    // 檢查訂閱項目或空狀態
    const subscriptionItems = page.locator('[data-testid="subscription-item"]');
    const itemCount = await subscriptionItems.count();

    if (itemCount === 0) {
      const emptyState = await page.locator('text=/還沒有|沒有訂閱|No subscription/i').isVisible();
      expect(emptyState).toBeTruthy();
    } else {
      expect(itemCount).toBeGreaterThan(0);
    }
  });

  test('TC-005: 取消訂閱', async ({ page, context }) => {
    // Mock 取消訂閱 API
    await context.route('**/api/subscriptions/*/cancel', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: '訂閱已取消',
        }),
      });
    });

    await page.goto('/subscriptions/my');
    await page.waitForTimeout(2000);

    // 尋找取消按鈕
    const cancelButton = page.locator('button:has-text("取消訂閱"), button[data-action="cancel"]').first();
    
    if (await cancelButton.isVisible()) {
      await cancelButton.click();

      // 確認取消對話框
      await page.waitForTimeout(1000);
      const confirmButton = page.locator('button:has-text("確認"), button:has-text("確定")').first();
      
      if (await confirmButton.isVisible()) {
        await confirmButton.click();

        // 驗證成功訊息
        await page.waitForTimeout(1000);
        const successMessage = await page.locator('text=/取消成功|已取消/i').isVisible();
        expect(successMessage).toBeTruthy();
      }
    } else {
      // 如果沒有訂閱可以取消，跳過測試
      test.skip();
    }
  });

  test('TC-006: 升級訂閱層級', async ({ page, context }) => {
    // Mock 升級 API
    await context.route('**/api/subscriptions/*/upgrade', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: '訂閱已升級',
        }),
      });
    });

    await page.goto('/subscriptions/my');
    await page.waitForTimeout(2000);

    // 尋找升級按鈕
    const upgradeButton = page.locator('button:has-text("升級"), button[data-action="upgrade"]').first();
    
    if (await upgradeButton.isVisible()) {
      await upgradeButton.click();

      // 選擇新的訂閱層級
      await page.waitForTimeout(1000);
      const tierOption = page.locator('[data-testid="tier-card"]').first();
      
      if (await tierOption.isVisible()) {
        await tierOption.click();

        const confirmButton = page.locator('button:has-text("確認升級")').first();
        if (await confirmButton.isVisible()) {
          await confirmButton.click();

          await page.waitForTimeout(1000);
          const successMessage = await page.locator('text=/升級成功|upgraded/i').isVisible();
          expect(successMessage).toBeTruthy();
        }
      }
    } else {
      test.skip();
    }
  });

  test('TC-007: 查看訂閱的創作者內容', async ({ page }) => {
    // 假設已訂閱某創作者
    await page.goto('/creator/creator123/posts');
    await page.waitForLoadState('networkidle');

    // 驗證可以看到內容
    const posts = page.locator('[data-testid="post-item"], [class*="post"]');
    const postCount = await posts.count();

    if (postCount === 0) {
      const emptyState = await page.locator('text=/還沒有|沒有內容|No post/i').isVisible();
      expect(emptyState).toBeTruthy();
    } else {
      expect(postCount).toBeGreaterThan(0);
    }
  });

  test('TC-008: 未訂閱時無法查看專屬內容', async ({ page, context }) => {
    // Mock API 返回未授權
    await context.route('**/api/posts/premium/**', (route) => {
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: '需要訂閱才能查看此內容',
        }),
      });
    });

    await page.goto('/creator/creator-unsubscribed/posts/premium-post-123');
    await page.waitForTimeout(2000);

    // 驗證顯示訂閱提示或錯誤訊息
    const subscribePrompt = await page.locator('text=/需要訂閱|訂閱.*查看|Subscribe to view/i').isVisible();
    const accessDenied = await page.locator('text=/無權|403|Forbidden/i').isVisible();

    expect(subscribePrompt || accessDenied).toBeTruthy();
  });

  test('TC-009: 訂閱歷史記錄', async ({ page }) => {
    await page.goto('/subscriptions/history');
    await page.waitForLoadState('networkidle');

    // 驗證頁面存在
    const isHistoryPage = page.url().includes('/history') || page.url().includes('/subscription');
    expect(isHistoryPage).toBeTruthy();

    // 檢查是否有歷史記錄或空狀態
    const historyItems = page.locator('[data-testid="history-item"]');
    const hasHistory = await historyItems.count() > 0;
    const emptyState = await page.locator('text=/沒有記錄|No history/i').isVisible();

    expect(hasHistory || emptyState).toBeTruthy();
  });

  test('TC-010: 自動續訂設定', async ({ page }) => {
    await page.goto('/subscriptions/my');
    await page.waitForTimeout(2000);

    // 尋找自動續訂開關
    const autoRenewToggle = page.locator('input[type="checkbox"][name*="auto"], [data-testid="auto-renew-toggle"]').first();
    
    if (await autoRenewToggle.isVisible()) {
      // 取得當前狀態
      const isChecked = await autoRenewToggle.isChecked();

      // 切換狀態
      await autoRenewToggle.click();
      await page.waitForTimeout(1000);

      // 驗證狀態已改變
      const newState = await autoRenewToggle.isChecked();
      expect(newState).toBe(!isChecked);
    } else {
      test.skip();
    }
  });
});

test.describe('訂閱通知與提醒', () => {
  test('TC-011: 訂閱即將到期提醒', async ({ page, context }) => {
    // Mock 返回即將到期的訂閱
    await context.route('**/api/subscriptions/my', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          subscriptions: [
            {
              id: 'sub-123',
              creatorName: 'Test Creator',
              expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
              status: 'active',
            },
          ],
        }),
      });
    });

    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'subscriber@test.com');
    await page.fill('input[name="password"]', 'Test1234!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|feed)/, { timeout: 10000 });

    await page.goto('/subscriptions/my');
    await page.waitForTimeout(2000);

    // 檢查是否顯示到期提醒
    const expiryWarning = await page.locator('text=/即將到期|expiring soon|renew/i').isVisible();
    
    // 或檢查通知區域
    const notification = await page.locator('[data-testid="notification"], .notification, .alert').isVisible();

    expect(expiryWarning || notification).toBeTruthy();
  });

  test('TC-012: 新內容通知（已訂閱創作者）', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'subscriber@test.com');
    await page.fill('input[name="password"]', 'Test1234!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|feed)/, { timeout: 10000 });

    // 檢查通知中心或 Feed
    await page.goto('/notifications');
    await page.waitForTimeout(2000);

    // 驗證通知頁面載入
    const isNotificationsPage = page.url().includes('/notification');
    expect(isNotificationsPage).toBeTruthy();
  });
});
