import { test, expect } from '@playwright/test';
import { login, TEST_USERS, takeScreenshot } from '../utils/test-helpers';

/**
 * 支付流程測試
 * 測試 Stripe 支付整合和各種支付場景
 */

test.describe('Stripe 支付流程', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.subscriber);
  });

  test('應該能訪問支付頁面', async ({ page }) => {
    await page.goto('/payment');
    await expect(page).toHaveURL(/\/payment/);
    
    // 應該看到支付金額選項
    await page.waitForSelector('[data-testid="payment-amount"], .payment-option', {
      timeout: 5000,
    });
    
    await takeScreenshot(page, 'payment-page', { fullPage: true });
  });

  test('應該能選擇支付金額', async ({ page }) => {
    await page.goto('/payment');
    
    // 選擇第一個金額選項
    const firstOption = page.locator('[data-testid="payment-amount"], .payment-option').first();
    await firstOption.click();
    await page.waitForTimeout(500);
    
    await takeScreenshot(page, 'payment-amount-selected');
    
    // 應該能看到「繼續支付」按鈕
    const continueButton = page.locator('button:has-text("繼續"), button:has-text("支付")').first();
    await expect(continueButton).toBeVisible();
  });

  test('應該能導航到 Stripe 支付表單', async ({ page, context }) => {
    await context.tracing.start({ screenshots: true, snapshots: true });

    await page.goto('/payment');
    
    // 選擇金額
    await page.locator('[data-testid="payment-amount"]').first().click();
    
    // 點擊繼續支付
    await page.click('button:has-text("繼續"), button:has-text("支付")');
    
    // 等待導向到 Stripe Checkout 或支付表單
    await page.waitForTimeout(2000);
    
    // 檢查是否有 Stripe 元素（iframe 或表單）
    const hasStripeIframe = await page.locator('iframe[name*="stripe"]').count() > 0;
    const hasPaymentForm = await page.locator('[data-testid="stripe-form"], .stripe-form').count() > 0;
    
    expect(hasStripeIframe || hasPaymentForm).toBeTruthy();
    
    await takeScreenshot(page, 'stripe-payment-form', { fullPage: true });
    await context.tracing.stop({ path: 'test-results/stripe-checkout-flow.zip' });
  });

  test('支付失敗時應該顯示錯誤訊息', async ({ page }) => {
    // 模擬支付失敗的 API 回應
    await page.route('**/api/payment/create', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: '支付失敗：卡片被拒絕',
        }),
      });
    });

    await page.goto('/payment');
    await page.locator('[data-testid="payment-amount"]').first().click();
    await page.click('button:has-text("繼續"), button:has-text("支付")');
    
    // 應該看到錯誤訊息
    await page.waitForSelector('[role="alert"], .error, .text-red', {
      timeout: 5000,
    });
    
    await expect(page.locator('[role="alert"], .error')).toContainText(/失敗|拒絕|錯誤/);
    await takeScreenshot(page, 'payment-error');
  });

  test('應該能驗證最小支付金額', async ({ page }) => {
    await page.goto('/payment');
    
    // 如果有自定義金額輸入
    const customAmountInput = page.locator('input[name="customAmount"], input[type="number"]').first();
    
    if (await customAmountInput.isVisible()) {
      // 嘗試輸入過低的金額
      await customAmountInput.fill('1');
      await page.click('button:has-text("繼續"), button:has-text("支付")');
      
      // 應該看到驗證錯誤
      await expect(page.locator('.error, [role="alert"]')).toContainText(/最小|minimum|至少/i);
      await takeScreenshot(page, 'payment-min-amount-error');
    }
  });

  test('應該能驗證最大支付金額', async ({ page }) => {
    await page.goto('/payment');
    
    const customAmountInput = page.locator('input[name="customAmount"], input[type="number"]').first();
    
    if (await customAmountInput.isVisible()) {
      // 嘗試輸入過高的金額
      await customAmountInput.fill('100000');
      await page.click('button:has-text("繼續"), button:has-text("支付")');
      
      // 應該看到驗證錯誤
      await expect(page.locator('.error, [role="alert"]')).toContainText(/最大|maximum|超過/i);
      await takeScreenshot(page, 'payment-max-amount-error');
    }
  });
});

test.describe('支付歷史記錄', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.subscriber);
  });

  test('應該能查看支付歷史', async ({ page, context }) => {
    await context.tracing.start({ screenshots: true, snapshots: true });

    await page.goto('/payment/history');
    await expect(page).toHaveURL(/\/payment\/history/);
    
    // 等待支付記錄載入
    await page.waitForSelector('[data-testid="payment-record"], table, .payment-list', {
      timeout: 5000,
    });
    
    await takeScreenshot(page, 'payment-history', { fullPage: true });

    await context.tracing.stop({ path: 'test-results/payment-history-flow.zip' });
  });

  test('應該能篩選支付記錄', async ({ page }) => {
    await page.goto('/payment/history');
    
    // 尋找篩選按鈕或下拉選單
    const filterButton = page.locator('select, [role="combobox"], button:has-text("篩選")').first();
    
    if (await filterButton.isVisible()) {
      await filterButton.click();
      await page.waitForTimeout(500);
      await takeScreenshot(page, 'payment-history-filter');
    }
  });

  test('應該能查看支付收據', async ({ page }) => {
    await page.goto('/payment/history');
    await page.waitForSelector('[data-testid="payment-record"], table tr');
    
    // 點擊第一個支付記錄的「查看收據」按鈕
    const receiptButton = page.locator('button:has-text("收據"), a:has-text("收據")').first();
    
    if (await receiptButton.isVisible()) {
      await receiptButton.click();
      await page.waitForTimeout(1000);
      await takeScreenshot(page, 'payment-receipt', { fullPage: true });
    }
  });
});

test.describe('退款流程', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.subscriber);
  });

  test('應該能申請退款', async ({ page, context }) => {
    await context.tracing.start({ screenshots: true, snapshots: true });

    await page.goto('/payment/history');
    await page.waitForSelector('[data-testid="payment-record"], table tr');
    
    // 點擊第一個支付記錄的「申請退款」按鈕
    const refundButton = page.locator('button:has-text("退款"), a:has-text("退款")').first();
    
    if (await refundButton.isVisible()) {
      await refundButton.click();
      
      // 應該出現退款確認對話框
      await page.waitForSelector('[role="dialog"], .modal', { timeout: 3000 });
      await takeScreenshot(page, 'refund-dialog');
      
      // 填寫退款原因
      const reasonTextarea = page.locator('textarea[name="reason"], textarea').first();
      if (await reasonTextarea.isVisible()) {
        await reasonTextarea.fill('測試退款原因');
      }
      
      // 確認退款
      await page.click('button:has-text("確認"), button:has-text("提交")');
      
      // 應該看到成功訊息
      await page.waitForSelector('.success, [role="alert"]', { timeout: 5000 });
      await takeScreenshot(page, 'refund-success');
    }

    await context.tracing.stop({ path: 'test-results/refund-flow.zip' });
  });

  test('退款失敗時應該顯示錯誤訊息', async ({ page }) => {
    // 模擬退款失敗的 API 回應
    await page.route('**/api/payment/refund', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: '退款失敗：超過退款期限',
        }),
      });
    });

    await page.goto('/payment/history');
    
    const refundButton = page.locator('button:has-text("退款")').first();
    if (await refundButton.isVisible()) {
      await refundButton.click();
      await page.click('button:has-text("確認")');
      
      // 應該看到錯誤訊息
      await page.waitForSelector('[role="alert"], .error', { timeout: 5000 });
      await expect(page.locator('[role="alert"], .error')).toContainText(/失敗|期限|錯誤/);
      await takeScreenshot(page, 'refund-error');
    }
  });
});

test.describe('支付安全性測試', () => {
  test('未登入用戶應該無法訪問支付頁面', async ({ page }) => {
    // 不登入直接訪問支付頁面
    await page.goto('/payment');
    
    // 應該被導向到登入頁面
    await page.waitForURL(/\/(auth\/login|login)/, { timeout: 5000 });
    await takeScreenshot(page, 'payment-unauthorized-redirect');
  });
});
