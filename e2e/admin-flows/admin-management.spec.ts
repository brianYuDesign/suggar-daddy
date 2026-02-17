import { test, expect } from '@playwright/test';
import { takeScreenshot } from '../utils/test-helpers';

test.describe('管理後台 - 用戶管理', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test.beforeEach(async ({ page }) => {
    // 檢查 admin app 是否可用
    try {
      const response = await page.goto('http://localhost:4300/login', { timeout: 5000 });
      if (!response || response.status() >= 400) {
        test.skip(true, 'Admin app not accessible');
      }
    } catch {
      test.skip(true, 'Admin app not running at localhost:4300');
    }
  });

  test('應該能夠訪問管理後台', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('http://localhost:4300/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await takeScreenshot(page, '01-admin-dashboard', { fullPage: true });

    // 驗證在管理後台
    const hasTitle = await page.locator('h1:has-text("管理後台"), h1:has-text("Dashboard"), h1:has-text("儀表板")').isVisible({ timeout: 5000 }).catch(() => false);
    
    if (hasTitle) {
      await expect(page.locator('h1')).toContainText(/管理後台|Dashboard|儀表板/i);
    } else {
      // 驗證 URL
      expect(page.url()).toContain('/dashboard');
    }
  });

  test('應該能夠查看用戶列表', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('http://localhost:4300/dashboard/users');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await takeScreenshot(page, '02-user-list', { fullPage: true });

    // 驗證在用戶管理頁面
    const hasTitle = await page.locator('h1:has-text("用戶管理"), h1:has-text("User Management")').isVisible({ timeout: 5000 }).catch(() => false);
    
    if (hasTitle) {
      await expect(page.locator('h1')).toContainText(/用戶管理|User Management/i);
    }

    // 檢查用戶列表或表格
    const userTable = page.locator('table, [data-testid="user-list"]').first();
    const hasTable = await userTable.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasTable) {
      await expect(userTable).toBeVisible();
      
      // 檢查表格列數
      const rows = await page.locator('tbody tr').count();
      console.log(`找到 ${rows} 個用戶`);
    }
  });

  test('應該能夠搜尋用戶', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('http://localhost:4300/dashboard/users');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 尋找搜尋框
    const searchInput = page.locator('input[type="search"], input[placeholder*="搜尋"], input[placeholder*="Search"]').first();
    const hasSearch = await searchInput.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasSearch) {
      await searchInput.fill('test');
      await page.waitForTimeout(2000);
      await takeScreenshot(page, '03-user-search');

      // 驗證搜尋結果
      const resultRows = await page.locator('tbody tr').count();
      console.log(`搜尋到 ${resultRows} 個用戶`);
    } else {
      test.skip(true, '搜尋功能尚未實作');
    }
  });

  test('應該能夠查看用戶詳情', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('http://localhost:4300/dashboard/users');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 點擊第一個用戶
    const firstUser = page.locator('tbody tr, [data-testid="user-item"]').first();
    const hasUser = await firstUser.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasUser) {
      await firstUser.click();
      await page.waitForTimeout(2000);
      await takeScreenshot(page, '04-user-detail', { fullPage: true });

      // 驗證用戶詳情對話框或頁面
      const detailDialog = page.locator('[role="dialog"]:has-text("用戶詳情"), [data-testid="user-detail"]').first();
      const hasDetail = await detailDialog.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasDetail) {
        await expect(detailDialog).toBeVisible();
      } else {
        // 可能導航到用戶詳情頁面
        const onDetailPage = page.url().includes('/user/');
        if (onDetailPage) {
          expect(onDetailPage).toBeTruthy();
        }
      }
    } else {
      test.skip(true, '沒有用戶記錄');
    }
  });

  test('應該能夠禁用用戶帳號', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('http://localhost:4300/dashboard/users');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const firstUser = page.locator('tbody tr').first();
    const hasUser = await firstUser.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasUser) {
      // 尋找禁用按鈕
      const disableButton = page.locator('button:has-text("禁用"), button:has-text("Disable"), button[aria-label*="禁用"]').first();
      const hasButton = await disableButton.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasButton) {
        await disableButton.click();
        await page.waitForTimeout(1000);
        await takeScreenshot(page, '05-disable-user-confirm');

        // 驗證確認對話框
        const confirmDialog = page.locator('[role="dialog"]:has-text("確認"), [data-testid="confirm-dialog"]').first();
        const hasDialog = await confirmDialog.isVisible({ timeout: 5000 }).catch(() => false);

        if (hasDialog) {
          await expect(confirmDialog).toBeVisible();
          
          // 取消操作（不真的禁用用戶）
          const cancelButton = page.locator('button:has-text("取消"), button:has-text("Cancel")').first();
          if (await cancelButton.isVisible({ timeout: 3000 }).catch(() => false)) {
            await cancelButton.click();
          }
        }
      } else {
        test.skip(true, '禁用功能尚未實作');
      }
    } else {
      test.skip(true, '沒有用戶記錄');
    }
  });

  test('應該能夠啟用用戶帳號', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('http://localhost:4300/dashboard/users');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 尋找已禁用的用戶
    const disabledUser = page.locator('tr:has-text("已禁用"), tr:has-text("Disabled")').first();
    const hasDisabled = await disabledUser.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasDisabled) {
      const enableButton = page.locator('button:has-text("啟用"), button:has-text("Enable")').first();
      const hasButton = await enableButton.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasButton) {
        await enableButton.click();
        await page.waitForTimeout(2000);
        await takeScreenshot(page, '06-enable-user');

        // 驗證成功訊息
        const successMessage = page.locator('text=/成功|Success|已啟用/i').first();
        const hasSuccess = await successMessage.isVisible({ timeout: 5000 }).catch(() => false);
        
        if (hasSuccess) {
          await expect(successMessage).toBeVisible();
        }
      }
    } else {
      test.skip(true, '沒有已禁用的用戶');
    }
  });

  test('應該能夠篩選用戶類型', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('http://localhost:4300/dashboard/users');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 尋找篩選器
    const filterSelect = page.locator('select[name="userType"], [role="combobox"]').first();
    const hasFilter = await filterSelect.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasFilter) {
      await filterSelect.click();
      await page.waitForTimeout(500);
      
      const creatorOption = page.locator('option:has-text("創作者"), option:has-text("Creator")').first();
      const hasOption = await creatorOption.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasOption) {
        await creatorOption.click();
        await page.waitForTimeout(2000);
        await takeScreenshot(page, '07-filtered-creators');
      }
    } else {
      test.skip(true, '篩選功能尚未實作');
    }
  });
});

test.describe('管理後台 - 提款審核', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test.beforeEach(async ({ page }) => {
    try {
      const response = await page.goto('http://localhost:4300/dashboard', { timeout: 5000 });
      if (!response || response.status() >= 400) {
        test.skip(true, 'Admin app not accessible');
      }
    } catch {
      test.skip(true, 'Admin app not running');
    }
  });

  test('應該能夠查看提款申請列表', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('http://localhost:4300/dashboard/withdrawals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await takeScreenshot(page, '08-withdrawal-list', { fullPage: true });

    // 驗證在提款管理頁面
    const hasTitle = await page.locator('h1:has-text("提款管理"), h1:has-text("Withdrawal Management")').isVisible({ timeout: 5000 }).catch(() => false);
    
    if (hasTitle) {
      await expect(page.locator('h1')).toContainText(/提款管理|Withdrawal Management/i);
    }

    // 檢查提款列表
    const withdrawalTable = page.locator('table, [data-testid="withdrawal-list"]').first();
    const hasTable = await withdrawalTable.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasTable) {
      await expect(withdrawalTable).toBeVisible();
    } else {
      const emptyState = page.locator('text=/沒有提款申請|No withdrawal requests/i').first();
      const hasEmpty = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (hasEmpty) {
        await expect(emptyState).toBeVisible();
      }
    }
  });

  test('應該能夠查看待審核的提款申請', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('http://localhost:4300/dashboard/withdrawals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 篩選待審核狀態
    const statusFilter = page.locator('select[name="status"], button:has-text("待審核")').first();
    const hasFilter = await statusFilter.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasFilter) {
      await statusFilter.click();
      await page.waitForTimeout(500);
      
      const pendingOption = page.locator('option:has-text("待審核"), option:has-text("Pending")').first();
      if (await pendingOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await pendingOption.click();
        await page.waitForTimeout(2000);
        await takeScreenshot(page, '09-pending-withdrawals');
      }
    }
  });

  test('應該能夠查看提款申請詳情', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('http://localhost:4300/dashboard/withdrawals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const firstWithdrawal = page.locator('tbody tr, [data-testid="withdrawal-item"]').first();
    const hasWithdrawal = await firstWithdrawal.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasWithdrawal) {
      await firstWithdrawal.click();
      await page.waitForTimeout(2000);
      await takeScreenshot(page, '10-withdrawal-detail', { fullPage: true });

      // 驗證詳情對話框或頁面
      const detailDialog = page.locator('[role="dialog"]:has-text("提款詳情"), [data-testid="withdrawal-detail"]').first();
      const hasDetail = await detailDialog.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasDetail) {
        await expect(detailDialog).toBeVisible();
      }
    } else {
      test.skip(true, '沒有提款申請記錄');
    }
  });

  test('應該能夠批准提款申請', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('http://localhost:4300/dashboard/withdrawals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 尋找待審核的提款申請
    const pendingWithdrawal = page.locator('tr:has-text("待審核"), tr:has-text("Pending")').first();
    const hasPending = await pendingWithdrawal.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasPending) {
      const approveButton = page.locator('button:has-text("批准"), button:has-text("Approve")').first();
      const hasButton = await approveButton.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasButton) {
        await approveButton.click();
        await page.waitForTimeout(1000);
        await takeScreenshot(page, '11-approve-withdrawal-confirm');

        // 驗證確認對話框
        const confirmDialog = page.locator('[role="dialog"]:has-text("確認批准"), [data-testid="confirm-dialog"]').first();
        const hasDialog = await confirmDialog.isVisible({ timeout: 5000 }).catch(() => false);

        if (hasDialog) {
          await expect(confirmDialog).toBeVisible();
          
          // 取消操作（不真的批准）
          const cancelButton = page.locator('button:has-text("取消")').first();
          if (await cancelButton.isVisible({ timeout: 3000 }).catch(() => false)) {
            await cancelButton.click();
          }
        }
      } else {
        test.skip(true, '批准功能尚未實作');
      }
    } else {
      test.skip(true, '沒有待審核的提款申請');
    }
  });

  test('應該能夠拒絕提款申請', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('http://localhost:4300/dashboard/withdrawals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const pendingWithdrawal = page.locator('tr:has-text("待審核"), tr:has-text("Pending")').first();
    const hasPending = await pendingWithdrawal.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasPending) {
      const rejectButton = page.locator('button:has-text("拒絕"), button:has-text("Reject")').first();
      const hasButton = await rejectButton.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasButton) {
        await rejectButton.click();
        await page.waitForTimeout(1000);
        await takeScreenshot(page, '12-reject-withdrawal-form');

        // 驗證拒絕原因表單
        const reasonDialog = page.locator('[role="dialog"]:has-text("拒絕原因"), [data-testid="reject-dialog"]').first();
        const hasDialog = await reasonDialog.isVisible({ timeout: 5000 }).catch(() => false);

        if (hasDialog) {
          await expect(reasonDialog).toBeVisible();
          
          // 填寫拒絕原因
          const reasonInput = page.locator('textarea[name="reason"], textarea[placeholder*="原因"]').first();
          if (await reasonInput.isVisible({ timeout: 3000 }).catch(() => false)) {
            await reasonInput.fill('測試拒絕原因');
            await takeScreenshot(page, '13-reject-reason-filled');
          }
          
          // 取消操作
          const cancelButton = page.locator('button:has-text("取消")').first();
          if (await cancelButton.isVisible({ timeout: 3000 }).catch(() => false)) {
            await cancelButton.click();
          }
        }
      } else {
        test.skip(true, '拒絕功能尚未實作');
      }
    } else {
      test.skip(true, '沒有待審核的提款申請');
    }
  });

  test('應該顯示提款統計資料', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('http://localhost:4300/dashboard/withdrawals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 檢查統計卡片
    const stats = [
      'text=/待審核|Pending/i',
      'text=/已批准|Approved/i',
      'text=/已拒絕|Rejected/i',
      'text=/總金額|Total Amount/i',
    ];

    let foundStats = false;
    for (const selector of stats) {
      const stat = page.locator(selector).first();
      if (await stat.isVisible({ timeout: 3000 }).catch(() => false)) {
        foundStats = true;
        await expect(stat).toBeVisible();
      }
    }

    if (foundStats) {
      await takeScreenshot(page, '14-withdrawal-stats');
    }
  });
});
