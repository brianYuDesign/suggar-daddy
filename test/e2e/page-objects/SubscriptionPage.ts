import { Page, Locator, expect } from '@playwright/test';

/**
 * 訂閱管理頁面對象模型
 */
export class SubscriptionPage {
  readonly page: Page;
  readonly url: string;
  
  // 訂閱計畫列表
  readonly plansList: Locator;
  readonly basicPlan: Locator;
  readonly premiumPlan: Locator;
  readonly vipPlan: Locator;
  
  // 計畫詳情
  readonly planName: Locator;
  readonly planPrice: Locator;
  readonly planFeatures: Locator;
  readonly subscribeCTA: Locator;
  
  // 當前訂閱
  readonly currentSubscription: Locator;
  readonly subscriptionStatus: Locator;
  readonly renewalDate: Locator;
  readonly cancelButton: Locator;
  readonly upgradeButton: Locator;
  readonly downgradeButton: Locator;
  
  // 訂閱歷史
  readonly subscriptionHistory: Locator;
  readonly historyList: Locator;
  
  // 發票
  readonly invoicesSection: Locator;
  readonly invoicesList: Locator;
  readonly downloadInvoiceButton: Locator;

  constructor(page: Page, baseURL: string = 'http://localhost:4200') {
    this.page = page;
    this.url = `${baseURL}/subscription`;
    
    // 訂閱計畫
    this.plansList = page.locator('[data-testid="subscription-plans"]');
    this.basicPlan = page.locator('[data-testid="plan-basic"]');
    this.premiumPlan = page.locator('[data-testid="plan-premium"]');
    this.vipPlan = page.locator('[data-testid="plan-vip"]');
    
    // 計畫詳情
    this.planName = page.locator('[data-testid="plan-name"]');
    this.planPrice = page.locator('[data-testid="plan-price"]');
    this.planFeatures = page.locator('[data-testid="plan-features"]');
    this.subscribeCTA = page.locator('button:has-text("訂閱"), button:has-text("立即訂閱")');
    
    // 當前訂閱
    this.currentSubscription = page.locator('[data-testid="current-subscription"]');
    this.subscriptionStatus = page.locator('[data-testid="subscription-status"]');
    this.renewalDate = page.locator('[data-testid="renewal-date"]');
    this.cancelButton = page.locator('button:has-text("取消訂閱")');
    this.upgradeButton = page.locator('button:has-text("升級")');
    this.downgradeButton = page.locator('button:has-text("降級")');
    
    // 訂閱歷史
    this.subscriptionHistory = page.locator('[data-testid="subscription-history"]');
    this.historyList = page.locator('[data-testid="history-list"]');
    
    // 發票
    this.invoicesSection = page.locator('[data-testid="invoices"]');
    this.invoicesList = page.locator('[data-testid="invoices-list"]');
    this.downloadInvoiceButton = page.locator('button:has-text("下載發票")');
  }

  /**
   * 導航到訂閱頁面
   */
  async goto() {
    await this.page.goto(this.url);
    await this.waitForPageLoad();
  }

  /**
   * 等待頁面加載完成
   */
  async waitForPageLoad() {
    await expect(this.plansList.or(this.currentSubscription)).toBeVisible({ timeout: 10000 });
  }

  /**
   * 選擇訂閱計畫
   */
  async selectPlan(plan: 'basic' | 'premium' | 'vip') {
    const planLocator = {
      basic: this.basicPlan,
      premium: this.premiumPlan,
      vip: this.vipPlan,
    }[plan];
    
    await planLocator.click();
    await expect(this.subscribeCTA).toBeVisible();
  }

  /**
   * 訂閱計畫
   */
  async subscribe(plan: 'basic' | 'premium' | 'vip') {
    await this.selectPlan(plan);
    await this.subscribeCTA.click();
    
    // 等待導航到付款頁面或確認對話框
    await Promise.race([
      this.page.waitForURL(/\/payment/),
      this.page.locator('[role="dialog"]:has-text("確認訂閱")').waitFor({ state: 'visible' }),
    ]);
  }

  /**
   * 取消訂閱
   */
  async cancelSubscription() {
    await this.cancelButton.click();
    
    // 確認取消
    const confirmDialog = this.page.locator('[role="dialog"]:has-text("確認取消")');
    await expect(confirmDialog).toBeVisible();
    
    const confirmButton = this.page.locator('button:has-text("確認取消")');
    await confirmButton.click();
    
    // 等待狀態更新
    await this.page.waitForTimeout(1000);
  }

  /**
   * 升級訂閱
   */
  async upgradeSubscription(newPlan: 'premium' | 'vip') {
    await this.upgradeButton.click();
    await this.selectPlan(newPlan);
    await this.subscribeCTA.click();
  }

  /**
   * 查看訂閱歷史
   */
  async viewHistory() {
    await this.page.goto(`${this.url}/history`);
    await expect(this.subscriptionHistory).toBeVisible();
  }

  /**
   * 查看發票
   */
  async viewInvoices() {
    await this.page.goto(`${this.url}/invoices`);
    await expect(this.invoicesSection).toBeVisible();
  }

  /**
   * 下載最新發票
   */
  async downloadLatestInvoice() {
    await this.viewInvoices();
    
    const downloadPromise = this.page.waitForEvent('download');
    await this.downloadInvoiceButton.first().click();
    const download = await downloadPromise;
    
    return download;
  }

  /**
   * 獲取當前訂閱狀態
   */
  async getSubscriptionStatus(): Promise<string> {
    return await this.subscriptionStatus.textContent() || '';
  }

  /**
   * 獲取續訂日期
   */
  async getRenewalDate(): Promise<string> {
    return await this.renewalDate.textContent() || '';
  }

  /**
   * 驗證訂閱處於活躍狀態
   */
  async expectActiveSubscription() {
    await expect(this.currentSubscription).toBeVisible();
    await expect(this.subscriptionStatus).toContainText(/活躍|Active/i);
  }

  /**
   * 驗證訂閱已取消
   */
  async expectSubscriptionCancelled() {
    await expect(this.subscriptionStatus).toContainText(/已取消|Cancelled/i);
  }

  /**
   * 驗證計畫特色已顯示
   */
  async expectPlanFeaturesVisible(plan: 'basic' | 'premium' | 'vip') {
    await this.selectPlan(plan);
    await expect(this.planFeatures).toBeVisible();
  }
}
