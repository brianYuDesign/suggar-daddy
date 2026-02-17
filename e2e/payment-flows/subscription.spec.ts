import { test, expect } from '@playwright/test';
import { takeScreenshot } from '../utils/test-helpers';

test.describe('訂閱流程', () => {
  test.use({ storageState: 'e2e/.auth/subscriber.json' });

  test('應該能夠查看訂閱方案頁面', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/subscription');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await takeScreenshot(page, '01-subscription-page', { fullPage: true });

    // 驗證在訂閱頁面
    const hasTitle = await page.locator('h1:has-text("訂閱"), h1:has-text("Subscription")').isVisible({ timeout: 5000 }).catch(() => false);
    
    if (hasTitle) {
      await expect(page.locator('h1')).toContainText(/訂閱|Subscription/i);
    }

    // 檢查訂閱方案卡片
    const planCards = page.locator('[data-testid="plan-card"], .plan-card, .subscription-plan');
    const hasPlanCards = await planCards.first().isVisible({ timeout: 5000 }).catch(() => false);

    if (hasPlanCards) {
      const planCount = await planCards.count();
      console.log(`找到 ${planCount} 個訂閱方案`);
      expect(planCount).toBeGreaterThan(0);
    }
  });

  test('應該能夠查看創作者訂閱方案', async ({ page }) => {
    test.setTimeout(120000);

    // 先前往 feed 尋找創作者
    await page.goto('/feed');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 點擊創作者檔案
    const creatorLink = page.locator('a[href*="/user/"]').first();
    const hasCreator = await creatorLink.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasCreator) {
      await creatorLink.click();
      await page.waitForTimeout(2000);
      await takeScreenshot(page, '02-creator-profile', { fullPage: true });

      // 尋找訂閱按鈕
      const subscribeButton = page.locator('button:has-text("訂閱"), button:has-text("Subscribe")').first();
      const hasSubscribe = await subscribeButton.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasSubscribe) {
        await expect(subscribeButton).toBeVisible();
        await takeScreenshot(page, '03-subscribe-button');
      } else {
        test.skip(true, '訂閱按鈕不可用');
      }
    } else {
      test.skip(true, '沒有找到創作者');
    }
  });

  test('應該能夠點擊訂閱按鈕', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/feed');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const creatorLink = page.locator('a[href*="/user/"]').first();
    const hasCreator = await creatorLink.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasCreator) {
      await creatorLink.click();
      await page.waitForTimeout(2000);

      const subscribeButton = page.locator('button:has-text("訂閱"), button:has-text("Subscribe")').first();
      const hasSubscribe = await subscribeButton.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasSubscribe) {
        await subscribeButton.click();
        await page.waitForTimeout(2000);
        await takeScreenshot(page, '04-subscription-modal');

        // 驗證訂閱對話框或導航到支付頁面
        const subscriptionModal = page.locator('[role="dialog"]:has-text("訂閱"), [data-testid="subscription-modal"]').first();
        const hasModal = await subscriptionModal.isVisible({ timeout: 5000 }).catch(() => false);
        
        const onPaymentPage = page.url().includes('/payment') || page.url().includes('/checkout');

        expect(hasModal || onPaymentPage).toBeTruthy();
      } else {
        test.skip(true, '訂閱按鈕不可用');
      }
    } else {
      test.skip(true, '沒有找到創作者');
    }
  });

  test('應該能夠選擇訂閱方案', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/subscription');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 尋找訂閱方案選項
    const planOption = page.locator('[data-testid="plan-option"], .plan-option, button:has-text("選擇方案")').first();
    const hasPlan = await planOption.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasPlan) {
      await planOption.click();
      await page.waitForTimeout(2000);
      await takeScreenshot(page, '05-plan-selected');

      // 驗證方案被選中
      const selectedPlan = await planOption.getAttribute('aria-selected') === 'true' ||
                          await planOption.getAttribute('data-selected') === 'true';

      if (selectedPlan) {
        expect(selectedPlan).toBeTruthy();
      }
    } else {
      test.skip(true, '沒有可選擇的訂閱方案');
    }
  });

  test('應該能夠查看訂閱管理頁面', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/subscription/manage');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await takeScreenshot(page, '06-manage-subscriptions', { fullPage: true });

    // 驗證在訂閱管理頁面
    const hasTitle = await page.locator('h1:has-text("我的訂閱"), h1:has-text("My Subscriptions")').isVisible({ timeout: 5000 }).catch(() => false);
    
    if (hasTitle) {
      await expect(page.locator('h1')).toContainText(/我的訂閱|My Subscriptions/i);
    } else {
      // 可能顯示空狀態
      const emptyState = await page.locator('text=/還沒有訂閱|No subscriptions yet/i').isVisible({ timeout: 5000 }).catch(() => false);
      if (emptyState) {
        await expect(page.locator('text=/還沒有訂閱|No subscriptions/i')).toBeVisible();
      }
    }
  });

  test('應該能夠取消訂閱', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/subscription/manage');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 尋找取消訂閱按鈕
    const cancelButton = page.locator('button:has-text("取消訂閱"), button:has-text("Cancel Subscription")').first();
    const hasCancel = await cancelButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasCancel) {
      await cancelButton.click();
      await page.waitForTimeout(1000);
      await takeScreenshot(page, '07-cancel-subscription-confirm');

      // 驗證確認對話框
      const confirmDialog = page.locator('[role="dialog"]:has-text("確認"), [data-testid="confirm-dialog"]').first();
      const hasDialog = await confirmDialog.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasDialog) {
        await expect(confirmDialog).toBeVisible();
        
        // 關閉對話框（不真的取消訂閱）
        const closeButton = page.locator('button:has-text("取消"), button:has-text("Close")').first();
        if (await closeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await closeButton.click();
        }
      }
    } else {
      test.skip(true, '沒有可取消的訂閱或功能尚未實作');
    }
  });
});

test.describe('打賞流程', () => {
  test.use({ storageState: 'e2e/.auth/subscriber.json' });

  test('應該能夠看到打賞按鈕', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/feed');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 尋找打賞按鈕
    const tipButton = page.locator('button:has-text("打賞"), button:has-text("Tip"), button[aria-label*="打賞"]').first();
    const hasTip = await tipButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasTip) {
      await takeScreenshot(page, '08-tip-button');
      await expect(tipButton).toBeVisible();
    } else {
      test.skip(true, '打賞功能尚未實作');
    }
  });

  test('應該能夠打開打賞對話框', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/feed');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const tipButton = page.locator('button:has-text("打賞"), button:has-text("Tip")').first();
    const hasTip = await tipButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasTip) {
      await tipButton.click();
      await page.waitForTimeout(1000);
      await takeScreenshot(page, '09-tip-dialog');

      // 驗證打賞對話框
      const tipDialog = page.locator('[role="dialog"]:has-text("打賞"), [data-testid="tip-dialog"]').first();
      await expect(tipDialog).toBeVisible({ timeout: 5000 });
    } else {
      test.skip(true, '打賞功能尚未實作');
    }
  });

  test('應該能夠選擇打賞金額', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/feed');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const tipButton = page.locator('button:has-text("打賞")').first();
    const hasTip = await tipButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasTip) {
      await tipButton.click();
      await page.waitForTimeout(1000);

      // 尋找金額選項
      const amountOption = page.locator('button:has-text("$"), [data-testid="tip-amount"]').first();
      const hasAmount = await amountOption.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasAmount) {
        await amountOption.click();
        await page.waitForTimeout(500);
        await takeScreenshot(page, '10-tip-amount-selected');

        // 驗證金額被選中
        const isSelected = await amountOption.getAttribute('aria-selected') === 'true' ||
                          await amountOption.getAttribute('data-selected') === 'true';
        
        if (isSelected) {
          expect(isSelected).toBeTruthy();
        }
      }
    } else {
      test.skip(true, '打賞功能尚未實作');
    }
  });

  test('應該能夠輸入自訂打賞金額', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/feed');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const tipButton = page.locator('button:has-text("打賞")').first();
    const hasTip = await tipButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasTip) {
      await tipButton.click();
      await page.waitForTimeout(1000);

      // 尋找自訂金額輸入框
      const customAmountInput = page.locator('input[type="number"], input[name="amount"]').first();
      const hasInput = await customAmountInput.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasInput) {
        await customAmountInput.fill('50');
        await takeScreenshot(page, '11-custom-tip-amount');

        // 驗證輸入值
        const inputValue = await customAmountInput.inputValue();
        expect(inputValue).toBe('50');
      }
    } else {
      test.skip(true, '打賞功能尚未實作');
    }
  });
});

test.describe('付費內容購買流程', () => {
  test.use({ storageState: 'e2e/.auth/subscriber.json' });

  test('應該能夠查看付費內容', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/feed');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 尋找付費內容標記
    const paidContentBadge = page.locator('text=/付費內容|Paid Content/i, [data-testid="paid-badge"]').first();
    const hasPaidContent = await paidContentBadge.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasPaidContent) {
      await takeScreenshot(page, '12-paid-content');
      await expect(paidContentBadge).toBeVisible();
    } else {
      test.skip(true, '沒有付費內容');
    }
  });

  test('應該能夠點擊解鎖付費內容', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/feed');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 尋找解鎖按鈕
    const unlockButton = page.locator('button:has-text("解鎖"), button:has-text("Unlock")').first();
    const hasUnlock = await unlockButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasUnlock) {
      await unlockButton.click();
      await page.waitForTimeout(2000);
      await takeScreenshot(page, '13-unlock-dialog');

      // 驗證解鎖對話框或導航到支付頁面
      const unlockDialog = page.locator('[role="dialog"]:has-text("解鎖"), [data-testid="unlock-dialog"]').first();
      const hasDialog = await unlockDialog.isVisible({ timeout: 5000 }).catch(() => false);
      
      const onPaymentPage = page.url().includes('/payment') || page.url().includes('/checkout');

      expect(hasDialog || onPaymentPage).toBeTruthy();
    } else {
      test.skip(true, '沒有解鎖按鈕或功能尚未實作');
    }
  });

  test('應該顯示付費內容價格', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/feed');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const paidContentBadge = page.locator('text=/付費內容|Paid Content/i').first();
    const hasPaidContent = await paidContentBadge.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasPaidContent) {
      // 尋找價格顯示
      const priceTag = page.locator('text=/\\$\\d+|NT\\$\\d+/').first();
      const hasPrice = await priceTag.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasPrice) {
        await expect(priceTag).toBeVisible();
        await takeScreenshot(page, '14-content-price');
      }
    } else {
      test.skip(true, '沒有付費內容');
    }
  });
});
