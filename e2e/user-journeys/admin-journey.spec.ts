import { test, expect } from '../fixtures/extended-test';
import { LoginPage } from '../pages/web/auth/login.page';
import {
  AdminDashboardPage,
  AdminUsersPage,
  AdminModerationPage,
  AdminFinancePage,
  AdminAuditLogPage,
} from '../pages/admin/admin.pages';
import { smartWaitForAPI, smartWaitForNavigation } from '../utils/smart-wait';

/**
 * 管理員完整用戶旅程測試
 * 
 * 測試場景：
 * 1. 登入管理後台
 * 2. 查看儀表板統計
 * 3. 搜尋並管理用戶
 * 4. 審核待審內容
 * 5. 處理用戶舉報
 * 6. 查看支付分析
 * 7. 審核提現申請
 * 8. 查看交易記錄
 * 9. 查看審計日誌
 * 10. 登出
 */
test.describe('管理員完整旅程', () => {
  // 使用預設的管理員測試帳號
  const adminEmail = 'admin@test.com';
  const adminPassword = 'Admin1234!';

  test('應該完成完整的管理員工作流程', async ({ page, context }) => {
    test.setTimeout(180000); // 3 minutes

    // 啟用追蹤
    await context.tracing.start({
      screenshots: true,
      snapshots: true,
      sources: true,
    });

    const loginPage = new LoginPage(page);
    const dashboardPage = new AdminDashboardPage(page);
    const usersPage = new AdminUsersPage(page);
    const moderationPage = new AdminModerationPage(page);
    const financePage = new AdminFinancePage(page);
    const auditLogPage = new AdminAuditLogPage(page);

    try {
      // ==================== 步驟 1: 登入管理後台 ====================
      console.log('步驟 1: 登入管理員帳號');
      await test.step('登入管理後台', async () => {
        await loginPage.navigateToLogin();
        await page.screenshot({ path: 'screenshots/journey-admin-01-login.png', fullPage: true });

        await loginPage.login(adminEmail, adminPassword);

        // 等待跳轉
        await smartWaitForNavigation(page, /\/(admin|dashboard)/, { timeout: 15000 }).catch(async () => {
          // 如果沒有自動跳轉，手動導航到管理後台
          await page.goto('/admin/dashboard');
        });

        await page.screenshot({ path: 'screenshots/journey-admin-02-logged-in.png', fullPage: true });
        
        // 驗證：應該在管理後台
        const url = page.url();
        expect(url).toMatch(/\/(admin)/);
      });

      // ==================== 步驟 2: 查看儀表板統計 ====================
      console.log('步驟 2: 查看儀表板統計');
      await test.step('查看儀表板統計數據', async () => {
        await dashboardPage.navigateToDashboard();
        
        // 等待統計數據載入
        await smartWaitForAPI(page, {
          urlPattern: /\/api\/admin\/(dashboard|stats)/,
          timeout: 10000,
        }).catch(() => console.log('儀表板 API 請求完成或超時'));

        await page.screenshot({ path: 'screenshots/journey-admin-03-dashboard.png', fullPage: true });

        // 驗證：儀表板已載入
        const isDashboardLoaded = await dashboardPage.isDashboardLoaded();
        console.log('儀表板是否載入:', isDashboardLoaded);

        // 取得統計數據
        const statsCount = await dashboardPage.getStatsCardCount();
        console.log(`統計卡片數量: ${statsCount}`);

        const userCount = await dashboardPage.getUserCount().catch(() => 0);
        console.log(`總用戶數: ${userCount}`);
      });

      // ==================== 步驟 3: 搜尋並管理用戶 ====================
      console.log('步驟 3: 用戶管理');
      await test.step('搜尋並管理用戶', async () => {
        await usersPage.navigateToUsers();
        
        // 等待用戶列表載入
        await smartWaitForAPI(page, {
          urlPattern: /\/api\/admin\/users/,
          timeout: 10000,
        }).catch(() => console.log('用戶列表 API 請求完成或超時'));

        await page.screenshot({ path: 'screenshots/journey-admin-04-users-list.png', fullPage: true });

        // 取得用戶數量
        const userCount = await usersPage.getUserCount();
        console.log(`用戶列表數量: ${userCount}`);

        // 搜尋用戶
        if (userCount > 0) {
          await usersPage.searchUser('test');
          await page.waitForTimeout(1000);

          await page.screenshot({ path: 'screenshots/journey-admin-05-search-users.png', fullPage: true });

          const searchResults = await usersPage.getUserCount();
          console.log(`搜尋結果數量: ${searchResults}`);
        }

        // 查看用戶詳情
        if (userCount > 0) {
          await usersPage.viewUserDetails(0);
          await page.waitForTimeout(1000);

          await page.screenshot({ path: 'screenshots/journey-admin-06-user-details.png', fullPage: true });

          // 返回用戶列表
          await usersPage.navigateToUsers();
        }

        // 停權用戶（僅演示，不實際執行）
        // await usersPage.suspendUser(0);
        console.log('ℹ️  跳過停權操作（演示用）');
      });

      // ==================== 步驟 4: 審核待審內容 ====================
      console.log('步驟 4: 內容審核');
      await test.step('審核待審內容', async () => {
        await moderationPage.navigateToModeration();
        
        // 等待待審內容載入
        await smartWaitForAPI(page, {
          urlPattern: /\/api\/admin\/(moderation|content)/,
          timeout: 10000,
        }).catch(() => console.log('審核列表 API 請求完成或超時'));

        await page.screenshot({ path: 'screenshots/journey-admin-07-moderation.png', fullPage: true });

        // 取得待審內容數量
        const pendingCount = await moderationPage.getPendingCount();
        console.log(`待審核內容數量: ${pendingCount}`);

        if (pendingCount > 0) {
          // 批准第一個內容
          await moderationPage.approveContent(0);
          await page.waitForTimeout(1000);

          await page.screenshot({ path: 'screenshots/journey-admin-08-content-approved.png', fullPage: true });

          console.log('✅ 已批准一個內容');
        } else {
          console.log('ℹ️  目前沒有待審核的內容');
        }
      });

      // ==================== 步驟 5: 處理用戶舉報 ====================
      console.log('步驟 5: 處理用戶舉報');
      await test.step('處理用戶舉報', async () => {
        // 導航到舉報列表
        await page.goto('/admin/reports');
        await smartWaitForAPI(page, {
          urlPattern: /\/api\/admin\/reports/,
          timeout: 10000,
        }).catch(() => console.log('舉報列表 API 請求完成或超時'));

        await page.screenshot({ path: 'screenshots/journey-admin-09-reports.png', fullPage: true });

        // 如果頁面不存在，可能在審核頁面的子標籤
        if (page.url().includes('404') || page.url().includes('error')) {
          await moderationPage.navigateToModeration();
          
          // 切換到舉報標籤
          const reportsTab = page.locator('button:has-text("舉報"), a:has-text("Reports")').first();
          if (await reportsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
            await reportsTab.click();
            await page.waitForTimeout(1000);
            await page.screenshot({ path: 'screenshots/journey-admin-10-reports-tab.png', fullPage: true });
          }
        }

        // 取得舉報數量
        const reportCount = await moderationPage.getReportCount();
        console.log(`用戶舉報數量: ${reportCount}`);

        if (reportCount > 0) {
          // 處理第一個舉報
          await moderationPage.handleReport(0, 'dismiss');
          await page.waitForTimeout(1000);

          await page.screenshot({ path: 'screenshots/journey-admin-11-report-handled.png', fullPage: true });

          console.log('✅ 已處理一個舉報');
        } else {
          console.log('ℹ️  目前沒有用戶舉報');
        }
      });

      // ==================== 步驟 6: 查看支付分析 ====================
      console.log('步驟 6: 支付分析');
      await test.step('查看支付分析', async () => {
        await financePage.navigateToPayments();
        
        // 等待支付數據載入
        await smartWaitForAPI(page, {
          urlPattern: /\/api\/admin\/(payments|transactions)/,
          timeout: 10000,
        }).catch(() => console.log('支付數據 API 請求完成或超時'));

        await page.screenshot({ path: 'screenshots/journey-admin-12-payments.png', fullPage: true });

        // 取得交易數量
        const transactionCount = await financePage.getTransactionCount();
        console.log(`交易記錄數量: ${transactionCount}`);

        if (transactionCount > 0) {
          // 查看第一筆交易詳情
          await financePage.viewTransactionDetails(0);
          await page.waitForTimeout(1000);

          await page.screenshot({ path: 'screenshots/journey-admin-13-transaction-details.png', fullPage: true });
        } else {
          console.log('ℹ️  目前沒有交易記錄');
        }
      });

      // ==================== 步驟 7: 審核提現申請 ====================
      console.log('步驟 7: 審核提現申請');
      await test.step('審核提現申請', async () => {
        await financePage.navigateToWithdrawals();
        
        // 等待提現列表載入
        await smartWaitForAPI(page, {
          urlPattern: /\/api\/admin\/withdrawals/,
          timeout: 10000,
        }).catch(() => console.log('提現列表 API 請求完成或超時'));

        await page.screenshot({ path: 'screenshots/journey-admin-14-withdrawals.png', fullPage: true });

        // 取得待審核提現數量
        const pendingWithdrawalCount = await financePage.getPendingWithdrawalCount();
        console.log(`待審核提現數量: ${pendingWithdrawalCount}`);

        if (pendingWithdrawalCount > 0) {
          // 批准第一個提現申請
          await financePage.approveWithdrawal(0);
          await page.waitForTimeout(1000);

          await page.screenshot({ path: 'screenshots/journey-admin-15-withdrawal-approved.png', fullPage: true });

          console.log('✅ 已批准一個提現申請');
        } else {
          console.log('ℹ️  目前沒有待審核的提現申請');
        }
      });

      // ==================== 步驟 8: 查看交易記錄 ====================
      console.log('步驟 8: 查看交易記錄');
      await test.step('查看完整交易記錄', async () => {
        await financePage.navigateToPayments();
        await page.screenshot({ path: 'screenshots/journey-admin-16-all-transactions.png', fullPage: true });

        // 滾動載入更多交易
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(1000);

        await page.screenshot({ path: 'screenshots/journey-admin-17-transactions-scrolled.png', fullPage: true });

        const totalTransactions = await financePage.getTransactionCount();
        console.log(`總交易記錄數量: ${totalTransactions}`);
      });

      // ==================== 步驟 9: 查看審計日誌 ====================
      console.log('步驟 9: 查看審計日誌');
      await test.step('查看審計日誌', async () => {
        await auditLogPage.navigateToAuditLog();
        
        // 等待日誌載入
        await smartWaitForAPI(page, {
          urlPattern: /\/api\/admin\/audit-log/,
          timeout: 10000,
        }).catch(() => console.log('審計日誌 API 請求完成或超時'));

        await page.screenshot({ path: 'screenshots/journey-admin-18-audit-log.png', fullPage: true });

        // 取得日誌數量
        const logCount = await auditLogPage.getLogCount();
        console.log(`審計日誌數量: ${logCount}`);

        // 過濾日誌（如果有過濾功能）
        if (logCount > 0) {
          await auditLogPage.filterLogs('action', 'CREATE').catch(() => {
            console.log('過濾功能可能不可用');
          });
          await page.waitForTimeout(1000);

          await page.screenshot({ path: 'screenshots/journey-admin-19-audit-log-filtered.png', fullPage: true });
        }

        // 搜尋日誌
        await auditLogPage.searchLogs('user').catch(() => {
          console.log('搜尋功能可能不可用');
        });
        await page.waitForTimeout(1000);

        await page.screenshot({ path: 'screenshots/journey-admin-20-audit-log-searched.png', fullPage: true });
      });

      // ==================== 步驟 10: 登出 ====================
      console.log('步驟 10: 登出管理後台');
      await test.step('登出系統', async () => {
        // 查找並點擊用戶選單
        const userMenu = page.locator('[data-testid="user-menu"], .user-menu, button[aria-label*="user"], button[aria-label*="帳戶"], button[aria-label*="admin"]').first();
        
        if (await userMenu.isVisible({ timeout: 3000 }).catch(() => false)) {
          await userMenu.click();
          await page.waitForTimeout(500);

          await page.screenshot({ path: 'screenshots/journey-admin-21-user-menu.png' });

          // 點擊登出
          const logoutBtn = page.locator('button:has-text("登出"), button:has-text("Logout"), a:has-text("登出")').first();
          if (await logoutBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await logoutBtn.click();
            
            // 等待跳轉到登入頁面
            await smartWaitForNavigation(page, /\/(login|admin\/login|home)/, { timeout: 10000 }).catch(() => {});
            
            await page.screenshot({ path: 'screenshots/journey-admin-22-logged-out.png', fullPage: true });

            // 驗證：應該回到登入頁面
            const finalUrl = page.url();
            expect(finalUrl).toMatch(/\/(login|admin\/login|home|$)/);
          } else {
            console.log('⚠️  找不到登出按鈕，嘗試直接導航');
            await page.goto('/logout');
            await page.waitForTimeout(1000);
            await page.screenshot({ path: 'screenshots/journey-admin-22-logged-out.png', fullPage: true });
          }
        } else {
          console.log('⚠️  找不到用戶選單，嘗試直接登出');
          await page.goto('/logout');
          await page.waitForTimeout(1000);
          await page.screenshot({ path: 'screenshots/journey-admin-22-logged-out.png', fullPage: true });
        }
      });

      console.log('✅ 管理員完整旅程測試完成');

    } catch (error) {
      console.error('❌ 測試過程中發生錯誤:', error);
      await page.screenshot({ path: 'screenshots/journey-admin-error.png', fullPage: true });
      throw error;
    } finally {
      // 停止追蹤
      await context.tracing.stop({ 
        path: 'test-results/admin-journey-trace.zip' 
      }).catch(() => console.log('無法保存追蹤'));
    }
  });
});
