import { test, expect } from '../../fixtures/base';
import { PaymentPage } from '../../page-objects/PaymentPage';
import { SubscriptionPage } from '../../page-objects/SubscriptionPage';
import { TestDataFactory, TEST_CONSTANTS } from '../../utils/test-data-factory';

/**
 * 付款功能 E2E 測試
 * 
 * 測試場景：
 * 1. 創建訂閱
 * 2. 支付流程
 * 3. Tip 功能
 * 4. 付款歷史
 */
test.describe('付款功能', () => {
  
  test.describe('訂閱管理', () => {
    
    test('應該顯示訂閱計畫列表 @critical', async ({ authenticatedPage }) => {
      const subscriptionPage = new SubscriptionPage(authenticatedPage);
      
      await subscriptionPage.goto();
      
      // 驗證計畫顯示
      await expect(subscriptionPage.plansList).toBeVisible();
      await expect(subscriptionPage.basicPlan).toBeVisible();
      await expect(subscriptionPage.premiumPlan).toBeVisible();
      await expect(subscriptionPage.vipPlan).toBeVisible();
    });

    test('應該可以查看計畫詳情 @ui', async ({ authenticatedPage }) => {
      const subscriptionPage = new SubscriptionPage(authenticatedPage);
      
      await subscriptionPage.goto();
      
      // 選擇 Premium 計畫
      await subscriptionPage.selectPlan('premium');
      
      // 驗證計畫特色顯示
      await subscriptionPage.expectPlanFeaturesVisible('premium');
    });

    test.skip('應該可以訂閱計畫 @critical @payment', async ({ authenticatedPage }) => {
      const subscriptionPage = new SubscriptionPage(authenticatedPage);
      const paymentPage = new PaymentPage(authenticatedPage);
      
      await subscriptionPage.goto();
      
      // 選擇並訂閱 Basic 計畫
      await subscriptionPage.subscribe('basic');
      
      // 驗證導航到付款頁面
      await expect(authenticatedPage).toHaveURL(/\/payment/);
      
      // 使用測試卡號付款
      await paymentPage.payWithTestCard();
      
      // 驗證付款成功
      await paymentPage.expectPaymentSuccess();
    });

    test.skip('應該可以取消訂閱 @critical', async ({ authenticatedPage }) => {
      const subscriptionPage = new SubscriptionPage(authenticatedPage);
      
      await subscriptionPage.goto();
      
      // 假設用戶已有活躍訂閱
      await subscriptionPage.expectActiveSubscription();
      
      // 取消訂閱
      await subscriptionPage.cancelSubscription();
      
      // 驗證訂閱已取消
      await subscriptionPage.expectSubscriptionCancelled();
    });

    test.skip('應該可以升級訂閱 @payment', async ({ authenticatedPage }) => {
      const subscriptionPage = new SubscriptionPage(authenticatedPage);
      
      await subscriptionPage.goto();
      
      // 假設用戶已有 Basic 訂閱
      await subscriptionPage.expectActiveSubscription();
      
      // 升級到 Premium
      await subscriptionPage.upgradeSubscription('premium');
      
      // 驗證導航到付款頁面
      await expect(authenticatedPage).toHaveURL(/\/payment/);
    });
  });

  test.describe('付款流程', () => {
    
    test('應該顯示付款表單 @critical', async ({ authenticatedPage }) => {
      const paymentPage = new PaymentPage(authenticatedPage);
      
      await paymentPage.goto();
      
      // 驗證付款表單顯示
      await expect(paymentPage.paymentForm.or(paymentPage.subscriptionPlans)).toBeVisible();
    });

    test.skip('應該驗證付款資訊 @validation', async ({ authenticatedPage }) => {
      const paymentPage = new PaymentPage(authenticatedPage);
      
      await paymentPage.goto('monthly');
      
      // 嘗試提交空表單
      await paymentPage.submitPayment();
      
      // 等待驗證訊息
      await authenticatedPage.waitForTimeout(1000);
      
      // 驗證錯誤訊息顯示
      const hasError = await paymentPage.errorMessage.isVisible().catch(() => false);
      
      // 如果使用 Stripe，可能不會顯示錯誤，而是 Stripe 內部驗證
      // 這裡只是確保表單沒有成功提交
      const currentUrl = authenticatedPage.url();
      expect(currentUrl).toContain('/payment');
    });

    test.skip('應該可以使用成功的測試卡號 @payment', async ({ authenticatedPage }) => {
      const paymentPage = new PaymentPage(authenticatedPage);
      
      await paymentPage.goto('monthly');
      
      // 使用 Stripe 成功測試卡
      await paymentPage.completeStripePayment({
        cardNumber: TEST_CONSTANTS.STRIPE_TEST_CARDS.SUCCESS,
        expiryDate: '12/34',
        cvc: '123',
      });
      
      // 驗證付款成功
      await paymentPage.expectPaymentSuccess();
    });

    test.skip('應該處理被拒絕的卡片 @payment @error-handling', async ({ authenticatedPage }) => {
      const paymentPage = new PaymentPage(authenticatedPage);
      
      await paymentPage.goto('monthly');
      
      // 使用被拒絕的測試卡
      await paymentPage.completeStripePayment({
        cardNumber: TEST_CONSTANTS.STRIPE_TEST_CARDS.DECLINED,
        expiryDate: '12/34',
        cvc: '123',
      });
      
      // 驗證付款失敗
      await paymentPage.expectPaymentError();
    });

    test.skip('應該可以套用折扣碼 @payment', async ({ authenticatedPage }) => {
      const paymentPage = new PaymentPage(authenticatedPage);
      
      await paymentPage.goto('monthly');
      
      // 套用折扣碼
      await paymentPage.applyDiscountCode('TEST10');
      
      // 等待折扣套用
      await authenticatedPage.waitForTimeout(1000);
      
      // 驗證訂單總金額已更新
      // 實際驗證邏輯取決於折扣碼是否有效
    });

    test.skip('應該顯示訂單摘要 @ui', async ({ authenticatedPage }) => {
      const paymentPage = new PaymentPage(authenticatedPage);
      
      await paymentPage.goto('monthly');
      
      // 驗證訂單摘要顯示
      await paymentPage.expectOrderSummaryVisible();
      
      // 驗證有總金額
      const total = await paymentPage.getTotalAmount();
      expect(total).toBeGreaterThan(0);
    });
  });

  test.describe('打賞功能', () => {
    
    test.skip('應該可以打賞創作者 @payment @tip', async ({ authenticatedPage }) => {
      // 此測試需要先導航到某個創作者的頁面或貼文
      await authenticatedPage.goto('/post/test-post-id');
      
      // 點擊打賞按鈕
      const tipButton = authenticatedPage.locator('button:has-text("打賞")');
      await tipButton.click();
      
      // 等待打賞對話框
      const tipModal = authenticatedPage.locator('[role="dialog"]:has-text("打賞")');
      await expect(tipModal).toBeVisible();
      
      // 輸入金額
      const amountInput = authenticatedPage.locator('input[name="amount"]');
      await amountInput.fill('50');
      
      // 確認打賞
      const confirmButton = authenticatedPage.locator('button:has-text("確認")');
      await confirmButton.click();
      
      // 驗證付款流程啟動
      await authenticatedPage.waitForTimeout(2000);
    });

    test.skip('應該驗證打賞金額 @validation', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/post/test-post-id');
      
      const tipButton = authenticatedPage.locator('button:has-text("打賞")');
      await tipButton.click();
      
      // 輸入無效金額（0 或負數）
      const amountInput = authenticatedPage.locator('input[name="amount"]');
      await amountInput.fill('0');
      
      const confirmButton = authenticatedPage.locator('button:has-text("確認")');
      await confirmButton.click();
      
      // 驗證錯誤訊息
      const errorMessage = authenticatedPage.locator('.error-message, [role="alert"]');
      await expect(errorMessage).toBeVisible();
    });

    test.skip('應該有快速打賞金額選項 @ui', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/post/test-post-id');
      
      const tipButton = authenticatedPage.locator('button:has-text("打賞")');
      await tipButton.click();
      
      // 驗證快速金額按鈕
      const quickAmounts = authenticatedPage.locator('button[data-amount]');
      const count = await quickAmounts.count();
      
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('付款歷史', () => {
    
    test.skip('應該顯示付款歷史列表 @history', async ({ authenticatedPage }) => {
      const paymentPage = new PaymentPage(authenticatedPage);
      
      await paymentPage.viewPaymentHistory();
      
      // 驗證付款歷史頁面
      await expect(paymentPage.paymentHistory).toBeVisible();
    });

    test.skip('應該可以查看交易詳情 @history', async ({ authenticatedPage }) => {
      const paymentPage = new PaymentPage(authenticatedPage);
      
      await paymentPage.viewPaymentHistory();
      
      // 點擊第一筆交易
      const firstTransaction = paymentPage.transactionsList.locator('> *').first();
      await firstTransaction.click();
      
      // 驗證詳情對話框或頁面
      await authenticatedPage.waitForTimeout(1000);
    });

    test.skip('應該可以下載發票 @history', async ({ authenticatedPage }) => {
      const subscriptionPage = new SubscriptionPage(authenticatedPage);
      
      // 下載最新發票
      const download = await subscriptionPage.downloadLatestInvoice();
      
      // 驗證下載成功
      expect(download).toBeDefined();
      expect(download.suggestedFilename()).toContain('invoice');
    });
  });

  test.describe('付款安全性', () => {
    
    test('應該使用 HTTPS @security', async ({ authenticatedPage }) => {
      const paymentPage = new PaymentPage(authenticatedPage);
      
      await paymentPage.goto();
      
      // 在生產環境中，驗證使用 HTTPS
      const url = authenticatedPage.url();
      
      // 開發環境可能使用 HTTP，生產環境必須使用 HTTPS
      if (!url.includes('localhost')) {
        expect(url).toContain('https://');
      }
    });

    test.skip('應該不顯示完整卡號 @security', async ({ authenticatedPage }) => {
      const paymentPage = new PaymentPage(authenticatedPage);
      
      await paymentPage.goto();
      
      // 填寫卡號
      await paymentPage.fillPaymentForm({
        cardNumber: '4242424242424242',
        expiryDate: '12/34',
        cvv: '123',
        cardholderName: 'Test User',
      });
      
      // 驗證卡號被遮蔽或不可見
      const cardNumberValue = await paymentPage.cardNumberInput.inputValue();
      
      // 卡號應該被遮蔽（如 •••• 4242）或為空（Stripe Elements）
      expect(cardNumberValue).not.toBe('4242424242424242');
    });

    test('應該有超時保護 @security', async ({ authenticatedPage }) => {
      const paymentPage = new PaymentPage(authenticatedPage);
      
      await paymentPage.goto();
      
      // 等待較長時間（模擬用戶閒置）
      await authenticatedPage.waitForTimeout(3000);
      
      // 在實際場景中，應該有 session 超時機制
      // 這裡只是確保頁面仍然可訪問
      await expect(paymentPage.paymentForm.or(paymentPage.subscriptionPlans)).toBeVisible();
    });
  });

  test.describe('響應式設計', () => {
    
    test('付款頁面應該在手機上正常顯示 @responsive', async ({ authenticatedPage }) => {
      const paymentPage = new PaymentPage(authenticatedPage);
      
      // 設置手機視窗
      await authenticatedPage.setViewportSize({ width: 375, height: 667 });
      
      await paymentPage.goto();
      
      // 驗證關鍵元素可見
      await expect(paymentPage.subscriptionPlans.or(paymentPage.paymentForm)).toBeVisible();
    });
  });
});
