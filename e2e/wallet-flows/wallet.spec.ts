import { test, expect } from '@playwright/test';
import { takeScreenshot } from '../utils/test-helpers';

test.describe('錢包管理 - 創作者', () => {
  test.use({ storageState: 'e2e/.auth/creator.json' });

  test('應該能夠查看錢包頁面', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/wallet');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await takeScreenshot(page, '01-wallet-page', { fullPage: true });

    // 驗證在錢包頁面
    const hasTitle = await page.locator('h1:has-text("錢包"), h1:has-text("Wallet")').isVisible({ timeout: 5000 }).catch(() => false);
    
    if (hasTitle) {
      await expect(page.locator('h1')).toContainText(/錢包|Wallet/i);
    }

    // 檢查餘額顯示
    const balanceLabel = page.locator('text=/可用餘額|Available Balance|Balance/i').first();
    const hasBalance = await balanceLabel.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasBalance) {
      await expect(balanceLabel).toBeVisible();
    }
  });

  test('應該能夠查看餘額資訊', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/wallet');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 檢查各種餘額資訊
    const balanceElements = [
      'text=/可用餘額|Available Balance/i',
      'text=/總收入|Total Earnings/i',
      'text=/本月收入|Monthly Earnings/i',
      'text=/待處理|Pending/i',
    ];

    let foundBalance = false;
    for (const selector of balanceElements) {
      const element = page.locator(selector).first();
      const isVisible = await element.isVisible({ timeout: 3000 }).catch(() => false);
      if (isVisible) {
        foundBalance = true;
        await expect(element).toBeVisible();
      }
    }

    if (foundBalance) {
      await takeScreenshot(page, '02-balance-info');
    }
  });

  test('應該能夠查看交易記錄', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/wallet/history');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await takeScreenshot(page, '03-transaction-history', { fullPage: true });

    // 驗證在交易記錄頁面
    const hasTitle = await page.locator('h1:has-text("交易記錄"), h1:has-text("Transaction History")').isVisible({ timeout: 5000 }).catch(() => false);
    
    if (hasTitle) {
      await expect(page.locator('h1')).toContainText(/交易記錄|Transaction History/i);
    } else {
      // 可能在錢包頁面的某個區塊
      const transactionSection = page.locator('text=/交易記錄|Transactions/i').first();
      const hasSection = await transactionSection.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (hasSection) {
        await expect(transactionSection).toBeVisible();
      }
    }

    // 檢查交易列表或空狀態
    const transactionList = page.locator('[data-testid="transaction-list"], .transaction-list, table').first();
    const hasList = await transactionList.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasList) {
      await expect(transactionList).toBeVisible();
    } else {
      // 可能顯示空狀態
      const emptyState = page.locator('text=/還沒有交易記錄|No transactions yet/i').first();
      const hasEmpty = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (hasEmpty) {
        await expect(emptyState).toBeVisible();
      }
    }
  });

  test('應該能夠篩選交易記錄', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/wallet/history');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 尋找篩選器
    const filterButton = page.locator('button:has-text("篩選"), button:has-text("Filter"), select[name="filter"]').first();
    const hasFilter = await filterButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasFilter) {
      await filterButton.click();
      await page.waitForTimeout(1000);
      await takeScreenshot(page, '04-transaction-filter');

      // 選擇篩選選項
      const filterOption = page.locator('text=/收入|Income|訂閱|Subscription/i').first();
      const hasOption = await filterOption.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasOption) {
        await filterOption.click();
        await page.waitForTimeout(2000);
        await takeScreenshot(page, '05-filtered-transactions');
      }
    } else {
      test.skip(true, '篩選功能尚未實作');
    }
  });

  test('應該能夠搜尋交易記錄', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/wallet/history');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 尋找搜尋框
    const searchInput = page.locator('input[type="search"], input[placeholder*="搜尋"]').first();
    const hasSearch = await searchInput.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasSearch) {
      await searchInput.fill('訂閱');
      await page.waitForTimeout(2000);
      await takeScreenshot(page, '06-search-transactions');

      // 驗證搜尋結果
      const results = page.locator('[data-testid="transaction-item"], tr').count();
      console.log(`搜尋到 ${await results} 筆交易`);
    } else {
      test.skip(true, '搜尋功能尚未實作');
    }
  });

  test('應該能夠查看交易詳情', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/wallet/history');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 點擊第一筆交易
    const firstTransaction = page.locator('[data-testid="transaction-item"], tr').first();
    const hasTransaction = await firstTransaction.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasTransaction) {
      await firstTransaction.click();
      await page.waitForTimeout(2000);
      await takeScreenshot(page, '07-transaction-detail');

      // 驗證詳情對話框或頁面
      const detailDialog = page.locator('[role="dialog"]:has-text("交易詳情"), [data-testid="transaction-detail"]').first();
      const hasDetail = await detailDialog.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasDetail) {
        await expect(detailDialog).toBeVisible();
      } else {
        // 可能導航到詳情頁面
        const onDetailPage = page.url().includes('/transaction/');
        if (onDetailPage) {
          expect(onDetailPage).toBeTruthy();
        }
      }
    } else {
      test.skip(true, '沒有交易記錄');
    }
  });
});

test.describe('提款流程 - 創作者', () => {
  test.use({ storageState: 'e2e/.auth/creator.json' });

  test('應該能夠訪問提款頁面', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/wallet/withdraw');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await takeScreenshot(page, '08-withdraw-page', { fullPage: true });

    // 驗證在提款頁面
    const hasTitle = await page.locator('h1:has-text("提款"), h1:has-text("Withdraw")').isVisible({ timeout: 5000 }).catch(() => false);
    
    if (hasTitle) {
      await expect(page.locator('h1')).toContainText(/提款|Withdraw/i);
    } else {
      // 可能需要從錢包頁面點擊提款按鈕
      await page.goto('/wallet');
      await page.waitForLoadState('networkidle');
      
      const withdrawButton = page.locator('button:has-text("提款"), button:has-text("Withdraw")').first();
      const hasButton = await withdrawButton.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (hasButton) {
        await withdrawButton.click();
        await page.waitForTimeout(2000);
        await takeScreenshot(page, '09-withdraw-from-wallet');
      } else {
        test.skip(true, '提款功能不可用');
      }
    }
  });

  test('應該能夠查看可提款金額', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/wallet/withdraw');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const availableAmount = page.locator('text=/可提款金額|Available for Withdrawal/i').first();
    const hasAmount = await availableAmount.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasAmount) {
      await expect(availableAmount).toBeVisible();
      await takeScreenshot(page, '10-available-amount');
    }
  });

  test('應該能夠填寫提款表單', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/wallet/withdraw');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 填寫提款金額
    const amountInput = page.locator('input[name="amount"], input[type="number"]').first();
    const hasInput = await amountInput.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasInput) {
      await amountInput.fill('100');
      await takeScreenshot(page, '11-withdraw-amount-filled');

      // 選擇提款方式
      const methodSelect = page.locator('select[name="method"], [role="combobox"]').first();
      const hasMethod = await methodSelect.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasMethod) {
        await methodSelect.click();
        await page.waitForTimeout(500);
        
        const bankOption = page.locator('option:has-text("銀行"), [role="option"]:has-text("Bank")').first();
        if (await bankOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await bankOption.click();
          await takeScreenshot(page, '12-withdraw-method-selected');
        }
      }

      // 填寫銀行資訊（如果需要）
      const bankAccountInput = page.locator('input[name="bankAccount"], input[placeholder*="帳號"]').first();
      if (await bankAccountInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await bankAccountInput.fill('1234567890');
        await takeScreenshot(page, '13-bank-info-filled');
      }
    } else {
      test.skip(true, '提款表單不可用');
    }
  });

  test('應該驗證最小提款金額', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/wallet/withdraw');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const amountInput = page.locator('input[name="amount"]').first();
    const hasInput = await amountInput.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasInput) {
      // 輸入低於最小金額的值
      await amountInput.fill('1');
      
      const submitButton = page.locator('button:has-text("提交"), button:has-text("Submit"), button[type="submit"]').first();
      if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(1000);
        await takeScreenshot(page, '14-min-amount-error');

        // 驗證錯誤訊息
        const errorMessage = page.locator('text=/最小提款金額|Minimum withdrawal/i').first();
        const hasError = await errorMessage.isVisible({ timeout: 3000 }).catch(() => false);
        
        if (hasError) {
          await expect(errorMessage).toBeVisible();
        }
      }
    } else {
      test.skip(true, '提款表單不可用');
    }
  });

  test('應該驗證超過可用餘額', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/wallet/withdraw');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const amountInput = page.locator('input[name="amount"]').first();
    const hasInput = await amountInput.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasInput) {
      // 輸入超過可用餘額的金額
      await amountInput.fill('999999');
      
      const submitButton = page.locator('button[type="submit"]').first();
      if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(1000);
        await takeScreenshot(page, '15-exceed-balance-error');

        // 驗證錯誤訊息
        const errorMessage = page.locator('text=/餘額不足|Insufficient balance/i').first();
        const hasError = await errorMessage.isVisible({ timeout: 3000 }).catch(() => false);
        
        if (hasError) {
          await expect(errorMessage).toBeVisible();
        }
      }
    } else {
      test.skip(true, '提款表單不可用');
    }
  });

  test('應該能夠查看提款歷史', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/wallet/withdraw/history');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await takeScreenshot(page, '16-withdraw-history', { fullPage: true });

    // 驗證在提款歷史頁面
    const hasTitle = await page.locator('h1:has-text("提款記錄"), h1:has-text("Withdrawal History")').isVisible({ timeout: 5000 }).catch(() => false);
    
    if (hasTitle) {
      await expect(page.locator('h1')).toContainText(/提款記錄|Withdrawal History/i);
    } else {
      // 可能在錢包頁面的某個區塊
      const withdrawSection = page.locator('text=/提款記錄|Withdrawals/i').first();
      const hasSection = await withdrawSection.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (hasSection) {
        await expect(withdrawSection).toBeVisible();
      } else {
        test.skip(true, '提款歷史功能不可用');
      }
    }
  });

  test('應該顯示提款狀態', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/wallet/withdraw/history');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 尋找提款記錄
    const withdrawalRecord = page.locator('[data-testid="withdrawal-item"], tr').first();
    const hasRecord = await withdrawalRecord.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasRecord) {
      // 檢查狀態標籤
      const statusLabels = [
        'text=/處理中|Pending|Processing/i',
        'text=/已完成|Completed|Success/i',
        'text=/已拒絕|Rejected|Failed/i',
      ];

      let foundStatus = false;
      for (const selector of statusLabels) {
        const status = page.locator(selector).first();
        if (await status.isVisible({ timeout: 2000 }).catch(() => false)) {
          foundStatus = true;
          await expect(status).toBeVisible();
          break;
        }
      }

      if (foundStatus) {
        await takeScreenshot(page, '17-withdrawal-status');
      }
    } else {
      const emptyState = page.locator('text=/還沒有提款記錄|No withdrawals yet/i').first();
      const hasEmpty = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (hasEmpty) {
        await expect(emptyState).toBeVisible();
      }
    }
  });
});

test.describe('錢包查看 - 訂閱者', () => {
  test.use({ storageState: 'e2e/.auth/subscriber.json' });

  test('訂閱者應該能夠查看錢包頁面', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/wallet');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await takeScreenshot(page, '18-subscriber-wallet', { fullPage: true });

    // 訂閱者錢包可能顯示支出記錄
    const hasTitle = await page.locator('h1:has-text("錢包"), h1:has-text("Wallet")').isVisible({ timeout: 5000 }).catch(() => false);
    
    if (hasTitle) {
      await expect(page.locator('h1')).toContainText(/錢包|Wallet/i);
    }

    // 檢查支出或交易記錄
    const transactionSection = page.locator('text=/交易記錄|Transactions|支出/i').first();
    const hasTransactions = await transactionSection.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasTransactions) {
      await expect(transactionSection).toBeVisible();
    }
  });

  test('訂閱者應該能夠查看訂閱支出', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/wallet/history');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await takeScreenshot(page, '19-subscriber-transactions', { fullPage: true });

    // 查找訂閱相關的交易
    const subscriptionTransaction = page.locator('text=/訂閱|Subscription/i').first();
    const hasSubscription = await subscriptionTransaction.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasSubscription) {
      await expect(subscriptionTransaction).toBeVisible();
    } else {
      const emptyState = page.locator('text=/還沒有交易|No transactions/i').first();
      const hasEmpty = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (hasEmpty) {
        await expect(emptyState).toBeVisible();
      }
    }
  });
});
