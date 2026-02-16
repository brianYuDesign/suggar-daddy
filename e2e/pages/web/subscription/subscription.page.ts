import { Page } from '@playwright/test';
import { BasePage } from '../../base.page';
import { smartWaitForAPI, smartWaitForElement, smartWaitForModal } from '../../../utils/smart-wait';

/**
 * 訂閱頁面 Page Object
 */
export class SubscriptionPage extends BasePage {
  // Locators
  private subscriptionTiers = () => this.page.locator('[data-testid="subscription-tier"], .subscription-tier, .pricing-card');
  private subscribeButton = (tierName?: string) => {
    if (tierName) {
      return this.page.locator(`.subscription-tier:has-text("${tierName}") button, .pricing-card:has-text("${tierName}") button`);
    }
    return this.page.locator('button:has-text("訂閱"), button:has-text("Subscribe")');
  };
  private paymentModal = () => this.page.locator('[role="dialog"], .modal, [data-testid="payment-modal"]');
  private cardNumberInput = () => this.page.locator('input[name="cardNumber"], #cardNumber');
  private cardExpiryInput = () => this.page.locator('input[name="expiry"], #cardExpiry');
  private cardCvcInput = () => this.page.locator('input[name="cvc"], #cardCvc');
  private confirmPaymentButton = () => this.page.locator('button:has-text("確認付款"), button:has-text("Confirm Payment")');
  private successMessage = () => this.page.locator('.toast-success, [data-testid="success-message"]');
  private mySubscriptionsList = () => this.page.locator('[data-testid="my-subscription"], .subscription-item');

  /**
   * 導航到創作者訂閱頁面
   */
  async navigateToCreatorSubscription(creatorId: string) {
    await this.navigate(`/creators/${creatorId}/subscribe`);
    await this.waitForLoadState('domcontentloaded');
  }

  /**
   * 導航到我的訂閱頁面
   */
  async navigateToMySubscriptions() {
    await this.navigate('/subscriptions');
    await this.waitForLoadState('domcontentloaded');
  }

  /**
   * 取得可用的訂閱層級數量
   */
  async getAvailableTiersCount(): Promise<number> {
    return await this.subscriptionTiers().count();
  }

  /**
   * 選擇訂閱層級
   */
  async selectSubscriptionTier(tierName: string) {
    const tierButton = this.subscribeButton(tierName);
    await tierButton.click();

    // 等待支付模態框出現
    await smartWaitForModal(this.page, {
      state: 'open',
      timeout: 5000,
    }).catch(() => {
      // 模態框可能沒有出現，繼續執行
    });
  }

  /**
   * 填寫支付資訊（Stripe 測試模式）
   */
  async fillPaymentInfo(cardInfo: {
    number?: string;
    expiry?: string;
    cvc?: string;
  } = {}) {
    // 使用 Stripe 測試卡號
    const cardNumber = cardInfo.number || '4242424242424242';
    const expiry = cardInfo.expiry || '12/25';
    const cvc = cardInfo.cvc || '123';

    // 檢查是否有 Stripe iframe（可能需要切換到 iframe）
    const stripeFrame = this.page.frameLocator('iframe[name*="stripe"]').first();
    
    try {
      // 嘗試在 iframe 中填寫
      const frameCardInput = stripeFrame.locator('input[name="cardnumber"]');
      if (await frameCardInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await frameCardInput.fill(cardNumber);
        await stripeFrame.locator('input[name="exp-date"]').fill(expiry);
        await stripeFrame.locator('input[name="cvc"]').fill(cvc);
        return;
      }
    } catch {
      // 不在 iframe 中，繼續使用普通選擇器
    }

    // 普通輸入框
    const cardInput = this.cardNumberInput();
    if (await cardInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cardInput.fill(cardNumber);
      await this.cardExpiryInput().fill(expiry);
      await this.cardCvcInput().fill(cvc);
    }
  }

  /**
   * 確認訂閱付款
   */
  async confirmSubscription() {
    // 等待 API 回應
    const subscribePromise = smartWaitForAPI(this.page, {
      urlPattern: /\/api\/(subscriptions|payment)/,
      timeout: 15000,
    }).catch(() => null);

    await this.confirmPaymentButton().click();

    await subscribePromise;

    // 等待成功訊息或模態框關閉
    await Promise.race([
      this.successMessage().waitFor({ state: 'visible', timeout: 5000 }),
      smartWaitForModal(this.page, { state: 'closed', timeout: 5000 }),
    ]).catch(() => {});
  }

  /**
   * 完整的訂閱流程
   */
  async subscribe(tierName: string, cardInfo?: {
    number?: string;
    expiry?: string;
    cvc?: string;
  }) {
    await this.selectSubscriptionTier(tierName);
    await this.fillPaymentInfo(cardInfo);
    await this.confirmSubscription();
  }

  /**
   * 檢查是否訂閱成功
   */
  async isSubscriptionSuccessful(): Promise<boolean> {
    return await this.successMessage().isVisible({ timeout: 5000 }).catch(() => false);
  }

  /**
   * 取得我的訂閱數量
   */
  async getMySubscriptionsCount(): Promise<number> {
    await this.navigateToMySubscriptions();
    return await this.mySubscriptionsList().count();
  }

  /**
   * 取消訂閱
   */
  async cancelSubscription(creatorName: string) {
    await this.navigateToMySubscriptions();
    
    const cancelButton = this.page.locator(
      `[data-testid="my-subscription"]:has-text("${creatorName}") button:has-text("取消"), ` +
      `.subscription-item:has-text("${creatorName}") button:has-text("Cancel")`
    );

    if (await cancelButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cancelButton.click();

      // 確認取消
      const confirmButton = this.page.locator('button:has-text("確認"), button:has-text("Confirm")');
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
      }
    }
  }
}
