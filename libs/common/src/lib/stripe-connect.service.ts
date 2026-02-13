import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export interface ConnectAccountOnboardingResult {
  accountId: string;
  onboardingUrl: string;
  expiresAt: number;
}

export interface ConnectAccountStatus {
  accountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirements: {
    currentlyDue: string[];
    eventuallyDue: string[];
    pastDue: string[];
  };
}

export interface ConnectTransferOptions {
  amount: number; // in cents
  currency: string;
  destinationAccountId: string;
  sourceTransaction?: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface ConnectPaymentIntentOptions {
  amount: number; // in cents
  currency: string;
  customerId: string;
  destinationAccountId: string;
  applicationFeeAmount: number; // Platform fee in cents
  description?: string;
  metadata?: Record<string, string>;
}

/**
 * Stripe Connect Service
 * 
 * 功能:
 * 1. 創建 Connect 帳號（Express/Custom）
 * 2. 生成 Onboarding 連結
 * 3. 檢查帳號狀態
 * 4. 處理分潤支付（Direct Charges + Application Fee）
 * 5. 處理轉帳（Transfers）
 * 6. 管理 Connect 帳號
 * 
 * Stripe Connect 兩種收款模式:
 * 
 * 1. **Direct Charges** (推薦):
 *    - 資金直接進入創作者帳戶
 *    - 平台抽取 application_fee
 *    - 創作者承擔 Stripe 手續費
 * 
 * 2. **Destination Charges**:
 *    - 資金先進平台帳戶
 *    - 再 Transfer 給創作者
 *    - 平台承擔 Stripe 手續費
 * 
 * 本實現使用 Direct Charges 模式
 */
@Injectable()
export class StripeConnectService {
  private readonly logger = new Logger(StripeConnectService.name);
  private stripe: Stripe | null = null;
  private readonly platformFeePercent: number;

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    
    if (secretKey) {
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2023-10-16',
      });
      this.logger.log('Stripe Connect initialized successfully');
    } else {
      this.logger.warn('Stripe Connect not configured (STRIPE_SECRET_KEY missing)');
    }

    // 平台抽成百分比 (預設 20%)
    this.platformFeePercent = this.configService.get<number>('PLATFORM_FEE_PERCENT') || 20;
  }

  private ensureConfigured(): Stripe {
    if (!this.stripe) {
      throw new BadRequestException('Stripe Connect is not configured');
    }
    return this.stripe;
  }

  // ── Account Management ─────────────────────────────────────────

  /**
   * 創建 Stripe Connect Express 帳號
   * 
   * Express Account 特點:
   * - Stripe 處理所有 KYC/合規流程
   * - 品牌化的 Stripe Onboarding 體驗
   * - 較少自定義選項
   * - 適合大多數創作者平台
   * 
   * @param email - 創作者 email
   * @param userId - 內部用戶 ID（存在 metadata）
   * @param country - 國家代碼 (ISO 3166-1 alpha-2, 例如: 'US', 'TW')
   * @returns Stripe Account ID
   */
  async createExpressAccount(
    email: string,
    userId: string,
    country: string = 'US',
  ): Promise<string> {
    const stripe = this.ensureConfigured();

    const account = await stripe.accounts.create({
      type: 'express',
      email,
      country,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: {
        userId,
        createdAt: new Date().toISOString(),
      },
    });

    this.logger.log(`Created Express account: ${account.id} for user ${userId}`);
    return account.id;
  }

  /**
   * 創建 Stripe Connect Custom 帳號
   * 
   * Custom Account 特點:
   * - 完全自定義 Onboarding UI
   * - 平台負責收集和驗證資料
   * - 更多控制權
   * - 需要更多開發工作
   * 
   * @param email - 創作者 email
   * @param userId - 內部用戶 ID
   * @param country - 國家代碼
   * @returns Stripe Account ID
   */
  async createCustomAccount(
    email: string,
    userId: string,
    country: string = 'US',
  ): Promise<string> {
    const stripe = this.ensureConfigured();

    const account = await stripe.accounts.create({
      type: 'custom',
      email,
      country,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      metadata: {
        userId,
        createdAt: new Date().toISOString(),
      },
    });

    this.logger.log(`Created Custom account: ${account.id} for user ${userId}`);
    return account.id;
  }

  /**
   * 生成 Onboarding 連結
   * 
   * 創作者需要完成 Onboarding 流程才能接收付款:
   * 1. 提供個人資訊
   * 2. 驗證身份
   * 3. 設置銀行帳戶
   * 
   * @param accountId - Stripe Account ID
   * @param refreshUrl - Onboarding 過程中點擊返回的 URL
   * @param returnUrl - 完成 Onboarding 後返回的 URL
   * @returns Onboarding URL 和過期時間
   */
  async createOnboardingLink(
    accountId: string,
    refreshUrl: string,
    returnUrl: string,
  ): Promise<ConnectAccountOnboardingResult> {
    const stripe = this.ensureConfigured();

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    this.logger.log(`Created onboarding link for account ${accountId}`);

    return {
      accountId,
      onboardingUrl: accountLink.url,
      expiresAt: accountLink.expires_at,
    };
  }

  /**
   * 生成 Dashboard 登入連結
   * 
   * 讓創作者可以登入 Stripe Express Dashboard:
   * - 查看收入
   * - 管理付款方式
   * - 查看報告
   * 
   * @param accountId - Stripe Account ID
   * @returns Dashboard login URL
   */
  async createDashboardLoginLink(accountId: string): Promise<string> {
    const stripe = this.ensureConfigured();

    const loginLink = await stripe.accounts.createLoginLink(accountId);

    this.logger.log(`Created dashboard login link for account ${accountId}`);
    return loginLink.url;
  }

  /**
   * 獲取 Connect 帳號狀態
   * 
   * 檢查帳號是否可以接收付款和提現
   * 
   * @param accountId - Stripe Account ID
   * @returns 帳號狀態資訊
   */
  async getAccountStatus(accountId: string): Promise<ConnectAccountStatus> {
    const stripe = this.ensureConfigured();

    const account = await stripe.accounts.retrieve(accountId);

    return {
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      requirements: {
        currentlyDue: account.requirements?.currently_due || [],
        eventuallyDue: account.requirements?.eventually_due || [],
        pastDue: account.requirements?.past_due || [],
      },
    };
  }

  /**
   * 檢查帳號是否可以接收付款
   * 
   * @param accountId - Stripe Account ID
   * @returns true if ready to receive payments
   */
  async isAccountReady(accountId: string): Promise<boolean> {
    const status = await this.getAccountStatus(accountId);
    return status.chargesEnabled && status.detailsSubmitted;
  }

  // ── Payment Processing (Direct Charges) ───────────────────────

  /**
   * 創建分潤支付 (Direct Charge)
   * 
   * 資金流:
   * 1. 買家付款 -> 創作者 Stripe 帳戶
   * 2. 平台抽取 application_fee (20%)
   * 3. 創作者獲得 80%
   * 4. Stripe 手續費由創作者承擔
   * 
   * 範例:
   * - 買家付款: $100
   * - 平台抽成: $20 (20%)
   * - 創作者實收: $80 - Stripe 手續費
   * 
   * @param options - Payment options
   * @returns PaymentIntent client secret
   */
  async createDirectChargePayment(
    options: ConnectPaymentIntentOptions,
  ): Promise<{ clientSecret: string; paymentIntentId: string }> {
    const stripe = this.ensureConfigured();

    // 驗證帳號狀態
    const isReady = await this.isAccountReady(options.destinationAccountId);
    if (!isReady) {
      throw new BadRequestException(
        'Creator account is not ready to receive payments. Please complete onboarding.',
      );
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: options.amount,
      currency: options.currency,
      customer: options.customerId,
      description: options.description,
      metadata: options.metadata || {},
      // Direct Charge: 資金直接進入創作者帳戶
      on_behalf_of: options.destinationAccountId,
      transfer_data: {
        destination: options.destinationAccountId,
      },
      // 平台抽成
      application_fee_amount: options.applicationFeeAmount,
    });

    this.logger.log(
      `Created direct charge PaymentIntent: ${paymentIntent.id}, ` +
      `amount: ${options.amount}, fee: ${options.applicationFeeAmount}, ` +
      `destination: ${options.destinationAccountId}`,
    );

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
    };
  }

  /**
   * 計算平台抽成金額
   * 
   * @param amount - 總金額（分）
   * @param feePercent - 抽成百分比（可選，預設使用配置值）
   * @returns 平台抽成金額（分）
   */
  calculatePlatformFee(amount: number, feePercent?: number): number {
    const percent = feePercent ?? this.platformFeePercent;
    return Math.round((amount * percent) / 100);
  }

  /**
   * 為訂閱創建支付（帶分潤）
   * 
   * 訂閱場景:
   * - 粉絲訂閱創作者
   * - 每月自動扣款
   * - 平台抽成 20%
   * 
   * @param customerId - Stripe Customer ID
   * @param priceId - Stripe Price ID
   * @param creatorAccountId - Creator's Stripe Account ID
   * @param metadata - Additional metadata
   * @returns Subscription ID and client secret (if setup required)
   */
  async createSubscriptionWithSplit(
    customerId: string,
    priceId: string,
    creatorAccountId: string,
    metadata?: Record<string, string>,
  ): Promise<{ subscriptionId: string; clientSecret?: string }> {
    const stripe = this.ensureConfigured();

    // 驗證創作者帳號
    const isReady = await this.isAccountReady(creatorAccountId);
    if (!isReady) {
      throw new BadRequestException('Creator account is not ready for subscriptions');
    }

    // 獲取 Price 資訊以計算平台費用
    const price = await stripe.prices.retrieve(priceId);
    const _amount = typeof price.unit_amount === 'number' ? price.unit_amount : 0;
    const applicationFeePercent = this.platformFeePercent;

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      metadata: metadata || {},
      // 為訂閱設置分潤
      application_fee_percent: applicationFeePercent,
      transfer_data: {
        destination: creatorAccountId,
      },
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });

    this.logger.log(
      `Created subscription with split: ${subscription.id}, ` +
      `fee: ${applicationFeePercent}%, destination: ${creatorAccountId}`,
    );

    const invoice = subscription.latest_invoice as Stripe.Invoice;
    const paymentIntent = invoice?.payment_intent as Stripe.PaymentIntent;

    return {
      subscriptionId: subscription.id,
      clientSecret: paymentIntent?.client_secret || undefined,
    };
  }

  // ── Transfers (Alternative: Destination Charges) ───────────────

  /**
   * 創建轉帳（用於已收款項的分潤）
   * 
   * 使用場景:
   * - 平台已收到款項
   * - 需要將部分資金轉給創作者
   * - 例如: 批次結算、月結
   * 
   * 注意: Direct Charges 通常比 Transfers 更好用
   * 
   * @param options - Transfer options
   * @returns Transfer ID
   */
  async createTransfer(options: ConnectTransferOptions): Promise<string> {
    const stripe = this.ensureConfigured();

    const transfer = await stripe.transfers.create({
      amount: options.amount,
      currency: options.currency,
      destination: options.destinationAccountId,
      source_transaction: options.sourceTransaction,
      description: options.description,
      metadata: options.metadata || {},
    });

    this.logger.log(
      `Created transfer: ${transfer.id}, amount: ${options.amount}, ` +
      `destination: ${options.destinationAccountId}`,
    );

    return transfer.id;
  }

  /**
   * 批次轉帳（月結場景）
   * 
   * @param transfers - Array of transfer options
   * @returns Array of transfer IDs
   */
  async batchTransfer(transfers: ConnectTransferOptions[]): Promise<string[]> {
    const transferIds: string[] = [];

    for (const transfer of transfers) {
      try {
        const id = await this.createTransfer(transfer);
        transferIds.push(id);
      } catch (error: unknown) {
        this.logger.error(
          `Failed to create transfer to ${transfer.destinationAccountId}: ${error instanceof Error ? error.message : String(error)}`,
        );
        // Continue with other transfers
      }
    }

    this.logger.log(`Completed batch transfer: ${transferIds.length}/${transfers.length} succeeded`);
    return transferIds;
  }

  // ── Account Deletion ───────────────────────────────────────────

  /**
   * 刪除 Connect 帳號
   * 
   * ⚠️ 警告: 此操作不可逆！
   * 
   * @param accountId - Stripe Account ID
   */
  async deleteAccount(accountId: string): Promise<void> {
    const stripe = this.ensureConfigured();

    await stripe.accounts.del(accountId);
    this.logger.warn(`Deleted Connect account: ${accountId}`);
  }
}
