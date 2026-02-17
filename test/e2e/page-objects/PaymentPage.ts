import { Page, Locator, expect } from '@playwright/test';

/**
 * 付款頁面對象模型
 */
export class PaymentPage {
  readonly page: Page;
  readonly url: string;
  
  // 訂閱計畫
  readonly subscriptionPlans: Locator;
  readonly monthlyPlan: Locator;
  readonly yearlyPlan: Locator;
  readonly selectPlanButton: Locator;
  
  // 付款表單
  readonly paymentForm: Locator;
  readonly cardNumberInput: Locator;
  readonly expiryDateInput: Locator;
  readonly cvvInput: Locator;
  readonly cardholderNameInput: Locator;
  readonly billingAddressInput: Locator;
  readonly zipCodeInput: Locator;
  
  // Stripe Elements (iframe)
  readonly stripeCardElement: Locator;
  readonly stripeCardNumberFrame: Locator;
  readonly stripeCardExpiryFrame: Locator;
  readonly stripeCardCvcFrame: Locator;
  
  // 操作按鈕
  readonly payButton: Locator;
  readonly cancelButton: Locator;
  readonly backButton: Locator;
  
  // 訂單摘要
  readonly orderSummary: Locator;
  readonly subtotal: Locator;
  readonly tax: Locator;
  readonly total: Locator;
  readonly discountCode: Locator;
  readonly applyDiscountButton: Locator;
  
  // 狀態訊息
  readonly successMessage: Locator;
  readonly errorMessage: Locator;
  readonly processingIndicator: Locator;
  
  // 付款歷史
  readonly paymentHistory: Locator;
  readonly transactionsList: Locator;

  constructor(page: Page, baseURL: string = 'http://localhost:4200') {
    this.page = page;
    this.url = `${baseURL}/payment`;
    
    // 訂閱計畫
    this.subscriptionPlans = page.locator('[data-testid="subscription-plans"]');
    this.monthlyPlan = page.locator('[data-testid="plan-monthly"]');
    this.yearlyPlan = page.locator('[data-testid="plan-yearly"]');
    this.selectPlanButton = page.locator('button:has-text("選擇方案")');
    
    // 付款表單
    this.paymentForm = page.locator('form[name="payment"]').or(page.locator('[data-testid="payment-form"]'));
    this.cardNumberInput = page.locator('input[name="cardNumber"]');
    this.expiryDateInput = page.locator('input[name="expiryDate"]');
    this.cvvInput = page.locator('input[name="cvv"]');
    this.cardholderNameInput = page.locator('input[name="cardholderName"]');
    this.billingAddressInput = page.locator('input[name="billingAddress"]');
    this.zipCodeInput = page.locator('input[name="zipCode"]');
    
    // Stripe Elements
    this.stripeCardElement = page.locator('#card-element');
    this.stripeCardNumberFrame = page.frameLocator('iframe[name*="cardNumber"]');
    this.stripeCardExpiryFrame = page.frameLocator('iframe[name*="cardExpiry"]');
    this.stripeCardCvcFrame = page.frameLocator('iframe[name*="cardCvc"]');
    
    // 操作按鈕
    this.payButton = page.locator('button[type="submit"]:has-text("付款"), button:has-text("確認付款")');
    this.cancelButton = page.locator('button:has-text("取消")');
    this.backButton = page.locator('button:has-text("返回")');
    
    // 訂單摘要
    this.orderSummary = page.locator('[data-testid="order-summary"]');
    this.subtotal = page.locator('[data-testid="subtotal"]');
    this.tax = page.locator('[data-testid="tax"]');
    this.total = page.locator('[data-testid="total"]');
    this.discountCode = page.locator('input[name="discountCode"]');
    this.applyDiscountButton = page.locator('button:has-text("套用優惠碼")');
    
    // 狀態訊息
    this.successMessage = page.locator('.bg-green-50, [role="alert"]:has-text("成功")');
    this.errorMessage = page.locator('.bg-red-50, [role="alert"]:has-text("錯誤")');
    this.processingIndicator = page.locator('text=處理中...');
    
    // 付款歷史
    this.paymentHistory = page.locator('[data-testid="payment-history"]');
    this.transactionsList = page.locator('[data-testid="transactions-list"]');
  }

  /**
   * 導航到付款頁面
   */
  async goto(planId?: string) {
    const url = planId ? `${this.url}?plan=${planId}` : this.url;
    await this.page.goto(url);
    await this.waitForPageLoad();
  }

  /**
   * 等待頁面加載完成
   */
  async waitForPageLoad() {
    await Promise.race([
      this.subscriptionPlans.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
      this.paymentForm.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
    ]);
  }

  /**
   * 選擇訂閱計畫
   */
  async selectPlan(plan: 'monthly' | 'yearly') {
    const planLocator = plan === 'monthly' ? this.monthlyPlan : this.yearlyPlan;
    await planLocator.click();
    
    // 點擊選擇按鈕
    await this.selectPlanButton.first().click();
    
    // 等待導航到付款表單
    await expect(this.paymentForm).toBeVisible();
  }

  /**
   * 填寫付款資訊（非 Stripe）
   */
  async fillPaymentForm(data: {
    cardNumber: string;
    expiryDate: string;
    cvv: string;
    cardholderName: string;
    billingAddress?: string;
    zipCode?: string;
  }) {
    await this.cardNumberInput.fill(data.cardNumber);
    await this.expiryDateInput.fill(data.expiryDate);
    await this.cvvInput.fill(data.cvv);
    await this.cardholderNameInput.fill(data.cardholderName);
    
    if (data.billingAddress) {
      await this.billingAddressInput.fill(data.billingAddress);
    }
    
    if (data.zipCode) {
      await this.zipCodeInput.fill(data.zipCode);
    }
  }

  /**
   * 填寫 Stripe 付款資訊
   */
  async fillStripeCard(data: {
    cardNumber: string;
    expiryDate: string;
    cvc: string;
  }) {
    // Stripe 測試卡號
    // 4242424242424242 - 成功
    // 4000000000000002 - 卡片被拒絕
    
    // 填寫卡號
    const cardNumberInput = this.stripeCardNumberFrame.locator('input[name="cardnumber"]');
    await cardNumberInput.fill(data.cardNumber);
    
    // 填寫有效期限
    const expiryInput = this.stripeCardExpiryFrame.locator('input[name="exp-date"]');
    await expiryInput.fill(data.expiryDate);
    
    // 填寫 CVC
    const cvcInput = this.stripeCardCvcFrame.locator('input[name="cvc"]');
    await cvcInput.fill(data.cvc);
  }

  /**
   * 套用折扣碼
   */
  async applyDiscountCode(code: string) {
    await this.discountCode.fill(code);
    await this.applyDiscountButton.click();
    
    // 等待套用結果
    await this.page.waitForTimeout(1000);
  }

  /**
   * 提交付款
   */
  async submitPayment() {
    await this.payButton.click();
    
    // 等待處理完成
    await expect(this.processingIndicator).toBeVisible().catch(() => {});
    await expect(this.processingIndicator).toBeHidden({ timeout: 30000 }).catch(() => {});
  }

  /**
   * 完整付款流程（非 Stripe）
   */
  async completePayment(paymentData: {
    cardNumber: string;
    expiryDate: string;
    cvv: string;
    cardholderName: string;
    billingAddress?: string;
    zipCode?: string;
  }) {
    await this.fillPaymentForm(paymentData);
    await this.submitPayment();
  }

  /**
   * 完整 Stripe 付款流程
   */
  async completeStripePayment(cardData: {
    cardNumber: string;
    expiryDate: string;
    cvc: string;
  }) {
    await this.fillStripeCard(cardData);
    await this.submitPayment();
  }

  /**
   * 使用測試卡號快速付款
   */
  async payWithTestCard() {
    await this.fillStripeCard({
      cardNumber: '4242424242424242',
      expiryDate: '12/34',
      cvc: '123',
    });
    await this.submitPayment();
  }

  /**
   * 取消付款
   */
  async cancelPayment() {
    await this.cancelButton.click();
  }

  /**
   * 獲取訂單總金額
   */
  async getTotalAmount(): Promise<number> {
    const text = await this.total.textContent();
    const match = text?.match(/[\d,]+\.?\d*/);
    return match ? parseFloat(match[0].replace(/,/g, '')) : 0;
  }

  /**
   * 查看付款歷史
   */
  async viewPaymentHistory() {
    await this.page.goto(`${this.url}/history`);
    await expect(this.paymentHistory).toBeVisible();
  }

  /**
   * 獲取交易數量
   */
  async getTransactionsCount(): Promise<number> {
    await this.viewPaymentHistory();
    return await this.transactionsList.locator('> *').count();
  }

  /**
   * 驗證付款成功
   */
  async expectPaymentSuccess() {
    await expect(this.successMessage).toBeVisible({ timeout: 15000 });
  }

  /**
   * 驗證付款失敗
   */
  async expectPaymentError(errorText?: string) {
    await expect(this.errorMessage).toBeVisible({ timeout: 15000 });
    
    if (errorText) {
      await expect(this.errorMessage).toContainText(errorText);
    }
  }

  /**
   * 驗證訂單摘要顯示
   */
  async expectOrderSummaryVisible() {
    await expect(this.orderSummary).toBeVisible();
    await expect(this.total).toBeVisible();
  }
}
