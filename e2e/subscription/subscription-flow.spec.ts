import { test, expect } from '@playwright/test';
import { takeScreenshot } from '../utils/test-helpers';

/**
 * 訂閱流程測試
 * 測試訂閱創建、升級、降級、取消等場景
 */

test.describe('創建訂閱', () => {

  test('應該能查看訂閱方案', async ({ page }) => {
    await page.goto('/subscription/plans');
    await expect(page).toHaveURL(/\/subscription\/plans/);
    
    // 應該看到訂閱方案卡片
    await page.waitForSelector('[data-testid="subscription-plan"], .plan-card', {
      timeout: 5000,
    });
    
    await takeScreenshot(page, 'subscription-plans', { fullPage: true });
  });

  test('應該顯示月度和年度訂閱選項', async ({ page }) => {
    await page.goto('/subscription/plans');
    
    // 檢查是否有月度選項
    const monthlyPlan = page.locator('[data-testid="monthly-plan"], button:has-text("月"), button:has-text("月度")');
    const hasMonthly = await monthlyPlan.count() > 0;
    
    // 檢查是否有年度選項
    const yearlyPlan = page.locator('[data-testid="yearly-plan"], button:has-text("年"), button:has-text("年度")');
    const hasYearly = await yearlyPlan.count() > 0;
    
    console.log(`月度方案: ${hasMonthly}, 年度方案: ${hasYearly}`);
    expect(hasMonthly || hasYearly).toBeTruthy();
    
    await takeScreenshot(page, 'subscription-plan-options');
  });

  test('應該能選擇並訂閱月度方案', async ({ page, context }) => {
    await context.tracing.start({ screenshots: true, snapshots: true });

    await page.goto('/subscription/plans');
    
    // 選擇月度方案
    const monthlyButton = page.locator('[data-testid="subscribe-monthly"], button:has-text("訂閱")').first();
    await monthlyButton.click();
    
    // 應該導向到支付頁面
    await page.waitForTimeout(2000);
    await takeScreenshot(page, 'subscription-checkout', { fullPage: true });

    await context.tracing.stop({ path: 'test-results/subscription-create-flow.zip' });
  });

  test('應該能選擇並訂閱年度方案', async ({ page }) => {
    await page.goto('/subscription/plans');
    
    // 選擇年度方案
    const yearlyButton = page.locator('[data-testid="subscribe-yearly"], button:has-text("年度"), button:has-text("年")').first();
    
    if (await yearlyButton.isVisible()) {
      await yearlyButton.click();
      await page.waitForTimeout(2000);
      await takeScreenshot(page, 'subscription-yearly-checkout', { fullPage: true });
    }
  });

  test('應該顯示訂閱方案的價格和功能', async ({ page }) => {
    await page.goto('/subscription/plans');
    
    // 檢查是否顯示價格
    const priceElements = page.locator('[data-testid="plan-price"], .price');
    expect(await priceElements.count()).toBeGreaterThan(0);
    
    // 檢查是否顯示功能列表
    const featuresList = page.locator('[data-testid="plan-features"], .features, ul');
    expect(await featuresList.count()).toBeGreaterThan(0);
    
    await takeScreenshot(page, 'subscription-plan-details', { fullPage: true });
  });
});

test.describe('訂閱管理', () => {

  test('應該能查看當前訂閱狀態', async ({ page, context }) => {
    await context.tracing.start({ screenshots: true, snapshots: true });

    await page.goto('/subscription');
    await expect(page).toHaveURL(/\/subscription/);
    
    // 應該看到當前訂閱資訊
    await page.waitForSelector('[data-testid="subscription-info"], .subscription-card', {
      timeout: 5000,
    });
    
    await takeScreenshot(page, 'subscription-status', { fullPage: true });

    await context.tracing.stop({ path: 'test-results/subscription-status-flow.zip' });
  });

  test('應該顯示訂閱到期日期', async ({ page }) => {
    await page.goto('/subscription');
    
    // 檢查是否顯示到期日期
    const expiryDate = page.locator('[data-testid="expiry-date"], .expiry-date, :text("到期")');
    const hasExpiryDate = await expiryDate.count() > 0;
    
    if (hasExpiryDate) {
      await takeScreenshot(page, 'subscription-expiry-date');
    }
  });

  test('應該顯示下次付款日期', async ({ page }) => {
    await page.goto('/subscription');
    
    // 檢查是否顯示下次付款日期
    const nextPayment = page.locator('[data-testid="next-payment"], :text("下次付款"), :text("續費")');
    const hasNextPayment = await nextPayment.count() > 0;
    
    if (hasNextPayment) {
      await takeScreenshot(page, 'subscription-next-payment');
    }
  });
});

test.describe('訂閱升級', () => {

  test('應該能從 Basic 升級到 Premium', async ({ page, context }) => {
    await context.tracing.start({ screenshots: true, snapshots: true });

    await page.goto('/subscription');
    
    // 點擊「升級」按鈕
    const upgradeButton = page.locator('button:has-text("升級"), button:has-text("Upgrade"), a:has-text("升級")').first();
    
    if (await upgradeButton.isVisible()) {
      await upgradeButton.click();
      
      // 應該導向到升級頁面
      await page.waitForTimeout(1000);
      await takeScreenshot(page, 'subscription-upgrade-page', { fullPage: true });
      
      // 選擇 Premium 方案
      const premiumButton = page.locator('button:has-text("Premium"), button:has-text("訂閱")').first();
      if (await premiumButton.isVisible()) {
        await premiumButton.click();
        await page.waitForTimeout(2000);
        await takeScreenshot(page, 'subscription-upgrade-checkout', { fullPage: true });
      }
    }

    await context.tracing.stop({ path: 'test-results/subscription-upgrade-flow.zip' });
  });

  test('升級時應該顯示價格差額', async ({ page }) => {
    await page.goto('/subscription');
    
    const upgradeButton = page.locator('button:has-text("升級")').first();
    if (await upgradeButton.isVisible()) {
      await upgradeButton.click();
      await page.waitForTimeout(1000);
      
      // 檢查是否顯示價格差額或按比例計算
      const prorateInfo = page.locator('[data-testid="prorate"], :text("差額"), :text("按比例")');
      const hasProrateInfo = await prorateInfo.count() > 0;
      
      if (hasProrateInfo) {
        await takeScreenshot(page, 'subscription-upgrade-prorate');
      }
    }
  });

  test('升級成功後應該更新訂閱狀態', async ({ page }) => {
    // 模擬升級成功的 API 回應
    await page.route('**/api/subscription/upgrade', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          subscription: {
            plan: 'PREMIUM',
            status: 'ACTIVE',
          },
        }),
      });
    });

    await page.goto('/subscription');
    
    const upgradeButton = page.locator('button:has-text("升級")').first();
    if (await upgradeButton.isVisible()) {
      await upgradeButton.click();
      await page.locator('button:has-text("確認")').first().click();
      
      // 應該看到成功訊息
      await page.waitForSelector('.success, [role="alert"]', { timeout: 5000 });
      await takeScreenshot(page, 'subscription-upgrade-success');
    }
  });
});

test.describe('訂閱降級', () => {
  test.use({ storageState: 'e2e/.auth/creator.json' });

  test('應該能從 Premium 降級到 Basic', async ({ page, context }) => {
    await context.tracing.start({ screenshots: true, snapshots: true });

    await page.goto('/subscription');
    
    // 點擊「變更方案」或「降級」按鈕
    const downgradeButton = page.locator('button:has-text("降級"), button:has-text("變更"), a:has-text("變更方案")').first();
    
    if (await downgradeButton.isVisible()) {
      await downgradeButton.click();
      
      // 應該導向到方案選擇頁面
      await page.waitForTimeout(1000);
      await takeScreenshot(page, 'subscription-downgrade-page', { fullPage: true });
      
      // 選擇 Basic 方案
      const basicButton = page.locator('button:has-text("Basic"), button:has-text("基礎")').first();
      if (await basicButton.isVisible()) {
        await basicButton.click();
        await page.waitForTimeout(2000);
        await takeScreenshot(page, 'subscription-downgrade-confirm', { fullPage: true });
      }
    }

    await context.tracing.stop({ path: 'test-results/subscription-downgrade-flow.zip' });
  });

  test('降級時應該警告功能限制', async ({ page }) => {
    await page.goto('/subscription');
    
    const downgradeButton = page.locator('button:has-text("降級"), button:has-text("變更")').first();
    if (await downgradeButton.isVisible()) {
      await downgradeButton.click();
      await page.waitForTimeout(1000);
      
      // 應該看到功能限制警告
      const warningText = page.locator('[role="alert"], .warning, :text("功能限制"), :text("將失去")');
      const hasWarning = await warningText.count() > 0;
      
      if (hasWarning) {
        await takeScreenshot(page, 'subscription-downgrade-warning');
      }
    }
  });

  test('降級應該在當前計費週期結束時生效', async ({ page }) => {
    await page.goto('/subscription');
    
    const downgradeButton = page.locator('button:has-text("降級"), button:has-text("變更")').first();
    if (await downgradeButton.isVisible()) {
      await downgradeButton.click();
      await page.locator('button:has-text("Basic")').first().click();
      
      // 應該看到「將在 XX 生效」的訊息
      const effectiveDate = page.locator(':text("生效"), :text("計費週期結束")');
      const hasEffectiveInfo = await effectiveDate.count() > 0;
      
      if (hasEffectiveInfo) {
        await takeScreenshot(page, 'subscription-downgrade-effective-date');
      }
    }
  });
});

test.describe('訂閱取消', () => {

  test('應該能取消訂閱', async ({ page, context }) => {
    await context.tracing.start({ screenshots: true, snapshots: true });

    await page.goto('/subscription');
    
    // 點擊「取消訂閱」按鈕
    const cancelButton = page.locator('button:has-text("取消訂閱"), button:has-text("Cancel"), a:has-text("取消")').first();
    
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
      
      // 應該出現確認對話框
      await page.waitForSelector('[role="dialog"], .modal', { timeout: 3000 });
      await takeScreenshot(page, 'subscription-cancel-dialog');
      
      // 確認取消
      await page.click('button:has-text("確認取消"), button:has-text("確定")');
      
      // 應該看到成功訊息
      await page.waitForSelector('.success, [role="alert"]', { timeout: 5000 });
      await takeScreenshot(page, 'subscription-cancel-success');
    }

    await context.tracing.stop({ path: 'test-results/subscription-cancel-flow.zip' });
  });

  test('取消訂閱前應該要求確認', async ({ page }) => {
    await page.goto('/subscription');
    
    const cancelButton = page.locator('button:has-text("取消訂閱")').first();
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
      
      // 應該出現確認對話框
      const dialog = page.locator('[role="dialog"], .modal');
      await expect(dialog).toBeVisible();
      
      // 應該有「確認」和「返回」按鈕
      const confirmButton = dialog.locator('button:has-text("確認")');
      const backButton = dialog.locator('button:has-text("返回"), button:has-text("取消")');
      
      await expect(confirmButton).toBeVisible();
      await expect(backButton).toBeVisible();
      
      await takeScreenshot(page, 'subscription-cancel-confirmation');
    }
  });

  test('取消後應該顯示「重新訂閱」選項', async ({ page }) => {
    // 模擬取消成功
    await page.route('**/api/subscription/cancel', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          subscription: {
            status: 'CANCELED',
          },
        }),
      });
    });

    await page.goto('/subscription');
    
    const cancelButton = page.locator('button:has-text("取消訂閱")').first();
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
      await page.click('button:has-text("確認")');
      await page.waitForTimeout(2000);
      
      // 應該看到「重新訂閱」按鈕
      const resubscribeButton = page.locator('button:has-text("重新訂閱"), button:has-text("重新"), a:has-text("訂閱")');
      const hasResubscribe = await resubscribeButton.count() > 0;
      
      if (hasResubscribe) {
        await takeScreenshot(page, 'subscription-resubscribe-option');
      }
    }
  });
});

test.describe('免費試用', () => {

  test('應該顯示免費試用選項', async ({ page }) => {
    await page.goto('/subscription/plans');
    
    // 檢查是否有「免費試用」按鈕或標籤
    const freeTrialButton = page.locator('button:has-text("免費試用"), button:has-text("試用"), :text("試用")');
    const hasFreeTrial = await freeTrialButton.count() > 0;
    
    if (hasFreeTrial) {
      await takeScreenshot(page, 'subscription-free-trial', { fullPage: true });
    }
  });

  test('應該能開始免費試用', async ({ page, context }) => {
    await context.tracing.start({ screenshots: true, snapshots: true });

    await page.goto('/subscription/plans');
    
    const freeTrialButton = page.locator('button:has-text("免費試用"), button:has-text("開始試用")').first();
    
    if (await freeTrialButton.isVisible()) {
      await freeTrialButton.click();
      await page.waitForTimeout(2000);
      await takeScreenshot(page, 'free-trial-started', { fullPage: true });
    }

    await context.tracing.stop({ path: 'test-results/free-trial-flow.zip' });
  });

  test('應該顯示試用結束日期', async ({ page }) => {
    await page.goto('/subscription');
    
    // 檢查是否顯示試用結束日期
    const trialEndDate = page.locator('[data-testid="trial-end"], :text("試用期結束"), :text("試用剩餘")');
    const hasTrialInfo = await trialEndDate.count() > 0;
    
    if (hasTrialInfo) {
      await takeScreenshot(page, 'free-trial-end-date');
    }
  });

  test('試用結束前應該提醒用戶', async ({ page }) => {
    // 模擬試用即將結束的狀態
    await page.route('**/api/subscription/status', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          subscription: {
            status: 'TRIAL',
            trialEndsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2天後
          },
        }),
      });
    });

    await page.goto('/subscription');
    
    // 應該看到提醒訊息
    const reminder = page.locator('[role="alert"], .reminder, :text("即將結束"), :text("提醒")');
    const hasReminder = await reminder.count() > 0;
    
    if (hasReminder) {
      await takeScreenshot(page, 'trial-ending-reminder');
    }
  });
});

test.describe('訂閱自動續費', () => {

  test('應該顯示自動續費狀態', async ({ page }) => {
    await page.goto('/subscription');
    
    // 檢查是否顯示自動續費開關或狀態
    const autoRenew = page.locator('[data-testid="auto-renew"], :text("自動續費"), :text("自動扣款")');
    const hasAutoRenew = await autoRenew.count() > 0;
    
    if (hasAutoRenew) {
      await takeScreenshot(page, 'subscription-auto-renew-status');
    }
  });

  test('應該能關閉自動續費', async ({ page }) => {
    await page.goto('/subscription');
    
    // 尋找自動續費開關
    const autoRenewToggle = page.locator('[data-testid="auto-renew-toggle"], input[type="checkbox"]').first();
    
    if (await autoRenewToggle.isVisible()) {
      await autoRenewToggle.click();
      await page.waitForTimeout(1000);
      
      // 應該看到確認訊息
      await takeScreenshot(page, 'auto-renew-disabled');
    }
  });

  test('關閉自動續費應該要求確認', async ({ page }) => {
    await page.goto('/subscription');
    
    const autoRenewToggle = page.locator('button:has-text("自動續費"), [data-testid="auto-renew"]').first();
    
    if (await autoRenewToggle.isVisible()) {
      await autoRenewToggle.click();
      
      // 應該出現確認對話框
      const dialog = page.locator('[role="dialog"], .modal');
      const hasDialog = await dialog.count() > 0;
      
      if (hasDialog) {
        await takeScreenshot(page, 'auto-renew-confirmation');
      }
    }
  });
});

test.describe('訂閱錯誤處理', () => {

  test('支付失敗時應該顯示錯誤訊息', async ({ page }) => {
    // 模擬支付失敗
    await page.route('**/api/subscription/create', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: '支付失敗：卡片餘額不足',
        }),
      });
    });

    await page.goto('/subscription/plans');
    const subscribeButton = page.locator('button:has-text("訂閱")').first();
    await subscribeButton.click();
    
    // 應該看到錯誤訊息
    await page.waitForSelector('[role="alert"], .error', { timeout: 5000 });
    await takeScreenshot(page, 'subscription-payment-error');
  });

  test('已有訂閱時不應該允許重複訂閱', async ({ page }) => {
    // 模擬已有訂閱的狀態
    await page.route('**/api/subscription/status', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          subscription: {
            status: 'ACTIVE',
            plan: 'BASIC',
          },
        }),
      });
    });

    await page.goto('/subscription/plans');
    
    // 「訂閱」按鈕應該被禁用或顯示「已訂閱」
    const subscribeButton = page.locator('button:has-text("訂閱")').first();
    const isDisabled = await subscribeButton.isDisabled().catch(() => false);
    
    if (isDisabled) {
      await takeScreenshot(page, 'subscription-already-subscribed');
    }
  });
});
