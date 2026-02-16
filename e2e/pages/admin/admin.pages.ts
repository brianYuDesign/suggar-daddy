import { Page } from '@playwright/test';
import { BasePage } from '../base.page';
import { smartWaitForAPI } from '../../utils/smart-wait';

/**
 * 管理員儀表板頁面 Page Object
 */
export class AdminDashboardPage extends BasePage {
  // Locators
  private statsCards = () => this.page.locator('[data-testid="stat-card"], .stat-card, .dashboard-card');
  private userCountStat = () => this.page.locator('[data-testid="user-count"], .user-count-stat');
  private revenuestat = () => this.page.locator('[data-testid="revenue"], .revenue-stat');
  private transactionsStat = () => this.page.locator('[data-testid="transactions"], .transactions-stat');

  /**
   * 導航到管理員儀表板
   */
  async navigateToDashboard() {
    await this.navigate('/admin/dashboard');
    await this.waitForLoadState('domcontentloaded');
  }

  /**
   * 取得統計卡片數量
   */
  async getStatsCardCount(): Promise<number> {
    return await this.statsCards().count();
  }

  /**
   * 取得用戶總數
   */
  async getUserCount(): Promise<number> {
    const text = await this.userCountStat().textContent().catch(() => '0');
    const match = text?.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  }

  /**
   * 檢查儀表板是否載入完成
   */
  async isDashboardLoaded(): Promise<boolean> {
    return await this.statsCards().first().isVisible({ timeout: 10000 }).catch(() => false);
  }
}

/**
 * 管理員用戶管理頁面 Page Object
 */
export class AdminUsersPage extends BasePage {
  // Locators
  private searchInput = () => this.page.locator('input[placeholder*="搜尋"], input[name="search"]');
  private userList = () => this.page.locator('[data-testid="user-row"], .user-row, table tbody tr');
  private suspendButton = (userId?: string) => {
    if (userId) {
      return this.page.locator(`tr[data-user-id="${userId}"] button:has-text("停權"), tr[data-user-id="${userId}"] button:has-text("Suspend")`);
    }
    return this.page.locator('button:has-text("停權"), button:has-text("Suspend")').first();
  };
  private activateButton = () => this.page.locator('button:has-text("啟用"), button:has-text("Activate")').first();
  private viewDetailsButton = () => this.page.locator('button:has-text("查看"), button:has-text("View")').first();
  private filterSelect = () => this.page.locator('select[name="userType"], select[name="status"]');

  /**
   * 導航到用戶管理頁面
   */
  async navigateToUsers() {
    await this.navigate('/admin/users');
    await this.waitForLoadState('domcontentloaded');
  }

  /**
   * 搜尋用戶
   */
  async searchUser(query: string) {
    await this.searchInput().fill(query);
    
    // 等待搜尋 API
    await smartWaitForAPI(this.page, {
      urlPattern: /\/api\/admin\/users/,
      timeout: 10000,
    }).catch(() => null);
  }

  /**
   * 取得用戶列表數量
   */
  async getUserCount(): Promise<number> {
    return await this.userList().count();
  }

  /**
   * 停權用戶
   */
  async suspendUser(index: number = 0) {
    const suspendBtn = this.page.locator('button:has-text("停權"), button:has-text("Suspend")').nth(index);
    
    if (await suspendBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await suspendBtn.click();

      // 填寫停權原因
      const reasonInput = this.page.locator('textarea[name="reason"], input[name="reason"]');
      if (await reasonInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await reasonInput.fill('違反社群規範');
      }

      // 確認停權
      const confirmBtn = this.page.locator('button:has-text("確認"), button:has-text("Confirm")');
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click();
        
        // 等待 API
        await smartWaitForAPI(this.page, {
          urlPattern: /\/api\/admin\/users.*suspend/,
          timeout: 10000,
        }).catch(() => null);
      }
    }
  }

  /**
   * 查看用戶詳情
   */
  async viewUserDetails(index: number = 0) {
    const viewBtn = this.page.locator('button:has-text("查看"), button:has-text("View"), a:has-text("詳情")').nth(index);
    
    if (await viewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await viewBtn.click();
      await this.page.waitForTimeout(1000);
    }
  }
}

/**
 * 管理員內容審核頁面 Page Object
 */
export class AdminModerationPage extends BasePage {
  // Locators
  private pendingList = () => this.page.locator('[data-testid="pending-item"], .pending-item, .moderation-item');
  private approveButton = () => this.page.locator('button:has-text("批准"), button:has-text("Approve")').first();
  private rejectButton = () => this.page.locator('button:has-text("拒絕"), button:has-text("Reject")').first();
  private reportsList = () => this.page.locator('[data-testid="report-item"], .report-item');
  private contentPreview = () => this.page.locator('[data-testid="content-preview"], .content-preview');

  /**
   * 導航到內容審核頁面
   */
  async navigateToModeration() {
    await this.navigate('/admin/moderation');
    await this.waitForLoadState('domcontentloaded');
  }

  /**
   * 取得待審核內容數量
   */
  async getPendingCount(): Promise<number> {
    return await this.pendingList().count();
  }

  /**
   * 批准內容
   */
  async approveContent(index: number = 0) {
    const approveBtn = this.page.locator('button:has-text("批准"), button:has-text("Approve")').nth(index);
    
    if (await approveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await approveBtn.click();

      // 等待 API
      await smartWaitForAPI(this.page, {
        urlPattern: /\/api\/admin\/(moderation|content).*approve/,
        timeout: 10000,
      }).catch(() => null);
    }
  }

  /**
   * 拒絕內容
   */
  async rejectContent(index: number = 0, reason: string = '不符合社群規範') {
    const rejectBtn = this.page.locator('button:has-text("拒絕"), button:has-text("Reject")').nth(index);
    
    if (await rejectBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await rejectBtn.click();

      // 填寫拒絕原因
      const reasonInput = this.page.locator('textarea[name="reason"], input[name="reason"]');
      if (await reasonInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await reasonInput.fill(reason);
      }

      // 確認拒絕
      const confirmBtn = this.page.locator('button:has-text("確認"), button:has-text("Confirm")');
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click();
        
        // 等待 API
        await smartWaitForAPI(this.page, {
          urlPattern: /\/api\/admin\/(moderation|content).*reject/,
          timeout: 10000,
        }).catch(() => null);
      }
    }
  }

  /**
   * 處理用戶舉報
   */
  async handleReport(index: number = 0, action: 'dismiss' | 'take-action') {
    const reportItem = this.reportsList().nth(index);
    
    if (await reportItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      if (action === 'dismiss') {
        const dismissBtn = reportItem.locator('button:has-text("忽略"), button:has-text("Dismiss")');
        await dismissBtn.click();
      } else {
        const actionBtn = reportItem.locator('button:has-text("處理"), button:has-text("Take Action")');
        await actionBtn.click();
      }

      await this.page.waitForTimeout(1000);
    }
  }

  /**
   * 取得舉報數量
   */
  async getReportCount(): Promise<number> {
    return await this.reportsList().count();
  }
}

/**
 * 管理員財務頁面 Page Object
 */
export class AdminFinancePage extends BasePage {
  // Locators
  private transactionList = () => this.page.locator('[data-testid="transaction-row"], .transaction-row, table tbody tr');
  private withdrawalList = () => this.page.locator('[data-testid="withdrawal-row"], .withdrawal-row');
  private approveWithdrawalButton = () => this.page.locator('button:has-text("批准提現"), button:has-text("Approve")').first();
  private rejectWithdrawalButton = () => this.page.locator('button:has-text("拒絕提現"), button:has-text("Reject")').first();
  private totalRevenue = () => this.page.locator('[data-testid="total-revenue"], .total-revenue');

  /**
   * 導航到支付分析頁面
   */
  async navigateToPayments() {
    await this.navigate('/admin/payments');
    await this.waitForLoadState('domcontentloaded');
  }

  /**
   * 導航到提現審核頁面
   */
  async navigateToWithdrawals() {
    await this.navigate('/admin/withdrawals');
    await this.waitForLoadState('domcontentloaded');
  }

  /**
   * 取得交易記錄數量
   */
  async getTransactionCount(): Promise<number> {
    return await this.transactionList().count();
  }

  /**
   * 批准提現申請
   */
  async approveWithdrawal(index: number = 0) {
    const approveBtn = this.page.locator('button:has-text("批准"), button:has-text("Approve")').nth(index);
    
    if (await approveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await approveBtn.click();

      // 確認批准
      const confirmBtn = this.page.locator('button:has-text("確認"), button:has-text("Confirm")');
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click();
        
        // 等待 API
        await smartWaitForAPI(this.page, {
          urlPattern: /\/api\/admin\/withdrawals.*approve/,
          timeout: 10000,
        }).catch(() => null);
      }
    }
  }

  /**
   * 取得待審核提現數量
   */
  async getPendingWithdrawalCount(): Promise<number> {
    const pendingItems = this.page.locator('[data-testid="withdrawal-row"][data-status="pending"], .withdrawal-row.pending');
    return await pendingItems.count().catch(() => 0);
  }

  /**
   * 查看交易詳情
   */
  async viewTransactionDetails(index: number = 0) {
    const viewBtn = this.page.locator('button:has-text("詳情"), button:has-text("Details")').nth(index);
    
    if (await viewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await viewBtn.click();
      await this.page.waitForTimeout(1000);
    }
  }
}

/**
 * 管理員審計日誌頁面 Page Object
 */
export class AdminAuditLogPage extends BasePage {
  // Locators
  private logList = () => this.page.locator('[data-testid="audit-log-row"], .audit-log-row, table tbody tr');
  private filterSelect = () => this.page.locator('select[name="action"], select[name="entityType"]');
  private searchInput = () => this.page.locator('input[placeholder*="搜尋"], input[name="search"]');

  /**
   * 導航到審計日誌頁面
   */
  async navigateToAuditLog() {
    await this.navigate('/admin/audit-log');
    await this.waitForLoadState('domcontentloaded');
  }

  /**
   * 取得日誌數量
   */
  async getLogCount(): Promise<number> {
    return await this.logList().count();
  }

  /**
   * 過濾日誌
   */
  async filterLogs(filterType: string, value: string) {
    const filter = this.page.locator(`select[name="${filterType}"]`);
    
    if (await filter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await filter.selectOption(value);
      
      // 等待過濾結果
      await smartWaitForAPI(this.page, {
        urlPattern: /\/api\/admin\/audit-log/,
        timeout: 10000,
      }).catch(() => null);
    }
  }

  /**
   * 搜尋日誌
   */
  async searchLogs(query: string) {
    await this.searchInput().fill(query);
    
    // 等待搜尋結果
    await smartWaitForAPI(this.page, {
      urlPattern: /\/api\/admin\/audit-log/,
      timeout: 10000,
    }).catch(() => null);
  }
}
