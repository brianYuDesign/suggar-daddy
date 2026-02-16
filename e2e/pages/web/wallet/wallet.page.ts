import { Page } from '@playwright/test';
import { BasePage } from '../../base.page';
import { smartWaitForAPI, smartWaitForElement } from '../../../utils/smart-wait';

/**
 * 錢包頁面 Page Object
 */
export class WalletPage extends BasePage {
  // Locators
  private balanceDisplay = () => this.page.locator('[data-testid="wallet-balance"], .balance-amount');
  private rechargeButton = () => this.page.locator('button:has-text("充值"), button:has-text("Recharge")');
  private withdrawButton = () => this.page.locator('button:has-text("提現"), button:has-text("Withdraw")');
  private transactionHistory = () => this.page.locator('[data-testid="transaction-item"], .transaction-item, table tbody tr');
  private withdrawAmountInput = () => this.page.locator('input[name="amount"], input[placeholder*="金額"]');
  private withdrawMethodSelect = () => this.page.locator('select[name="method"], [data-testid="withdraw-method"]');
  private confirmWithdrawButton = () => this.page.locator('button:has-text("確認提現"), button:has-text("Confirm")');

  /**
   * 導航到錢包頁面
   */
  async navigateToWallet() {
    await this.navigate('/wallet');
    await this.waitForLoadState('domcontentloaded');
  }

  /**
   * 取得當前餘額
   */
  async getBalance(): Promise<number> {
    const balanceText = await this.balanceDisplay().textContent();
    if (!balanceText) return 0;
    
    // 提取數字
    const match = balanceText.match(/[\d,]+(\.\d+)?/);
    if (match) {
      return parseFloat(match[0].replace(/,/g, ''));
    }
    
    return 0;
  }

  /**
   * 點擊充值按鈕
   */
  async clickRecharge() {
    await this.rechargeButton().click();
  }

  /**
   * 點擊提現按鈕
   */
  async clickWithdraw() {
    await this.withdrawButton().click();
  }

  /**
   * 申請提現
   */
  async requestWithdrawal(amount: number, method: string = 'bank') {
    await this.clickWithdraw();

    // 填寫提現金額
    await this.withdrawAmountInput().fill(amount.toString());

    // 選擇提現方式
    const methodSelect = this.withdrawMethodSelect();
    if (await methodSelect.isVisible().catch(() => false)) {
      await methodSelect.selectOption(method);
    }

    // 等待 API 回應
    const withdrawPromise = smartWaitForAPI(this.page, {
      urlPattern: /\/api\/(wallet\/withdraw|withdrawals)/,
      timeout: 10000,
    }).catch(() => null);

    await this.confirmWithdrawButton().click();

    await withdrawPromise;
  }

  /**
   * 取得交易記錄數量
   */
  async getTransactionCount(): Promise<number> {
    return await this.transactionHistory().count();
  }

  /**
   * 取得最近的交易
   */
  async getRecentTransaction(): Promise<{
    type: string;
    amount: string;
    date: string;
  } | null> {
    const firstTransaction = this.transactionHistory().first();
    
    if (await firstTransaction.isVisible().catch(() => false)) {
      const text = await firstTransaction.textContent() || '';
      return {
        type: text.includes('充值') ? 'deposit' : text.includes('提現') ? 'withdraw' : 'other',
        amount: text.match(/[\d,]+(\.\d+)?/)?.[0] || '0',
        date: text,
      };
    }
    
    return null;
  }

  /**
   * 導航到交易記錄頁面
   */
  async navigateToTransactionHistory() {
    await this.navigate('/wallet/history');
    await this.waitForLoadState('domcontentloaded');
  }
}
