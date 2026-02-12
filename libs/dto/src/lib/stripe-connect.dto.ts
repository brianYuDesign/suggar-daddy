/**
 * Stripe Connect DTOs
 *
 * 用於處理 Stripe Connect 創作者分潤相關的數據傳輸
 */

// ── Account Creation ───────────────────────────────────────────

export class CreateConnectAccountDto {
  /**
   * 創作者 email
   */
  email: string;

  /**
   * 國家代碼 (ISO 3166-1 alpha-2)
   * 例如: 'US', 'TW', 'JP', 'GB'
   */
  country: string;

  /**
   * 帳號類型
   * - express: Stripe 處理 Onboarding (推薦)
   * - custom: 自定義 Onboarding (進階)
   */
  accountType?: "express" | "custom";
}

export class ConnectAccountResponseDto {
  /**
   * Stripe Account ID
   */
  accountId: string;

  /**
   * 帳號類型
   */
  type: "express" | "custom";

  /**
   * 創作者 email
   */
  email: string;

  /**
   * 國家代碼
   */
  country: string;

  /**
   * 帳號狀態
   */
  status: {
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
  };
}

// ── Onboarding ─────────────────────────────────────────────────

export class CreateOnboardingLinkDto {
  /**
   * Stripe Account ID
   */
  accountId: string;

  /**
   * Onboarding 過程中點擊返回的 URL
   * 例如: https://yourdomain.com/creator/settings
   */
  refreshUrl: string;

  /**
   * 完成 Onboarding 後返回的 URL
   * 例如: https://yourdomain.com/creator/onboarding/success
   */
  returnUrl: string;
}

export class OnboardingLinkResponseDto {
  /**
   * Stripe Account ID
   */
  accountId: string;

  /**
   * Onboarding URL (重定向到此 URL)
   */
  url: string;

  /**
   * 連結過期時間 (Unix timestamp)
   */
  expiresAt: number;
}

// ── Account Status ─────────────────────────────────────────────

export class ConnectAccountStatusDto {
  /**
   * Stripe Account ID
   */
  accountId: string;

  /**
   * 是否可以收款
   */
  chargesEnabled: boolean;

  /**
   * 是否可以提現
   */
  payoutsEnabled: boolean;

  /**
   * 是否已完成資料提交
   */
  detailsSubmitted: boolean;

  /**
   * 需要提供的資料
   */
  requirements: {
    /**
     * 當前需要提供的資料
     * 例如: ['individual.id_number', 'individual.dob']
     */
    currentlyDue: string[];

    /**
     * 未來需要提供的資料
     */
    eventuallyDue: string[];

    /**
     * 逾期未提供的資料
     */
    pastDue: string[];
  };
}

// ── Payment with Split ─────────────────────────────────────────

export class CreateSplitPaymentDto {
  /**
   * 總金額（分）
   * 例如: 10000 = $100.00
   */
  amount: number;

  /**
   * 貨幣代碼
   * 例如: 'usd', 'twd'
   */
  currency: string;

  /**
   * 買家的 Stripe Customer ID
   */
  customerId: string;

  /**
   * 創作者的 Stripe Account ID
   */
  creatorAccountId: string;

  /**
   * 支付描述
   * 例如: 'PPV purchase for post #123'
   */
  description?: string;

  /**
   * 額外的 metadata
   */
  metadata?: Record<string, string>;
}

export class SplitPaymentResponseDto {
  /**
   * PaymentIntent ID
   */
  paymentIntentId: string;

  /**
   * Client Secret (傳給前端 Stripe.js)
   */
  clientSecret: string;

  /**
   * 總金額（分）
   */
  amount: number;

  /**
   * 平台抽成金額（分）
   */
  platformFee: number;

  /**
   * 創作者實收金額（分）
   */
  creatorAmount: number;

  /**
   * 創作者 Stripe Account ID
   */
  destinationAccountId: string;
}

// ── Subscription with Split ────────────────────────────────────

export class CreateSplitSubscriptionDto {
  /**
   * 買家的 Stripe Customer ID
   */
  customerId: string;

  /**
   * Stripe Price ID
   * 例如: 'price_1234567890'
   */
  priceId: string;

  /**
   * 創作者的 Stripe Account ID
   */
  creatorAccountId: string;

  /**
   * 額外的 metadata
   */
  metadata?: Record<string, string>;
}

export class SplitSubscriptionResponseDto {
  /**
   * Subscription ID
   */
  subscriptionId: string;

  /**
   * Client Secret (如果需要額外認證)
   */
  clientSecret?: string;

  /**
   * 訂閱狀態
   * - incomplete: 等待付款
   * - active: 已啟用
   * - past_due: 逾期
   */
  status: string;

  /**
   * 平台抽成百分比
   */
  platformFeePercent: number;

  /**
   * 創作者 Stripe Account ID
   */
  destinationAccountId: string;
}

// ── Transfer ───────────────────────────────────────────────────

export class CreateTransferDto {
  /**
   * 轉帳金額（分）
   */
  amount: number;

  /**
   * 貨幣代碼
   */
  currency: string;

  /**
   * 目標 Stripe Account ID
   */
  destinationAccountId: string;

  /**
   * 來源交易 ID（可選）
   */
  sourceTransaction?: string;

  /**
   * 轉帳描述
   */
  description?: string;

  /**
   * 額外的 metadata
   */
  metadata?: Record<string, string>;
}

export class TransferResponseDto {
  /**
   * Transfer ID
   */
  transferId: string;

  /**
   * 轉帳金額（分）
   */
  amount: number;

  /**
   * 貨幣代碼
   */
  currency: string;

  /**
   * 目標 Stripe Account ID
   */
  destinationAccountId: string;

  /**
   * 轉帳狀態
   * - pending: 處理中
   * - paid: 已完成
   * - failed: 失敗
   */
  status: string;

  /**
   * 創建時間 (Unix timestamp)
   */
  createdAt: number;
}

// ── Batch Transfer ─────────────────────────────────────────────

export class BatchTransferDto {
  /**
   * 多筆轉帳
   */
  transfers: CreateTransferDto[];
}

export class BatchTransferResponseDto {
  /**
   * 成功的轉帳 IDs
   */
  successfulTransfers: string[];

  /**
   * 失敗的轉帳
   */
  failedTransfers: Array<{
    destinationAccountId: string;
    error: string;
  }>;

  /**
   * 總計
   */
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
}

// ── Platform Fee Calculation ───────────────────────────────────

export class CalculateFeeDto {
  /**
   * 總金額（分）
   */
  amount: number;

  /**
   * 平台抽成百分比（可選，預設使用配置值）
   */
  feePercent?: number;
}

export class FeeCalculationResponseDto {
  /**
   * 總金額（分）
   */
  totalAmount: number;

  /**
   * 平台抽成金額（分）
   */
  platformFee: number;

  /**
   * 創作者實收金額（分）
   */
  creatorAmount: number;

  /**
   * 抽成百分比
   */
  feePercent: number;
}

// ── Dashboard Login ────────────────────────────────────────────

export class CreateDashboardLoginLinkDto {
  /**
   * Stripe Account ID
   */
  accountId: string;
}

export class DashboardLoginLinkResponseDto {
  /**
   * Dashboard login URL
   */
  url: string;

  /**
   * 連結過期時間 (通常 5 分鐘)
   */
  expiresAt: number;
}
