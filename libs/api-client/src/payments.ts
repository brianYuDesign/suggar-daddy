import type { ApiClient } from './client';

// ==================== Types ====================

export interface Tip {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  currency: string;
  createdAt: string;
}

/**
 * Transaction status enum
 */
export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'CANCELLED';

/**
 * Transaction type enum
 */
export type TransactionType = 'TIP' | 'SUBSCRIPTION' | 'POST_PURCHASE' | 'DM_PURCHASE' | 'WITHDRAWAL';

export interface Transaction {
  id: string;
  userId: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

/**
 * Detailed transaction information
 */
export interface TransactionDetail {
  /** Unique transaction identifier */
  transactionId: string;
  /** ID of the user involved in the transaction */
  userId: string;
  /** Type of transaction */
  type: TransactionType;
  /** Amount in cents */
  amount: number;
  /** Currency code */
  currency: string;
  /** Current transaction status */
  status: TransactionStatus;
  /** Optional description or notes */
  description?: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
  /** Timestamp when the transaction was created */
  createdAt: string;
  /** Timestamp when the transaction was last updated */
  updatedAt: string;
}

export interface PostPurchase {
  id: string;
  userId: string;
  postId: string;
  amount: number;
  createdAt: string;
}

/**
 * DM purchase record
 */
export interface DmPurchase {
  /** Unique purchase identifier */
  purchaseId: string;
  /** ID of the user purchasing DM access */
  buyerId: string;
  /** ID of the user whose DM access is being purchased */
  sellerId: string;
  /** Purchase amount in cents */
  amount: number;
  /** Currency code */
  currency: string;
  /** Purchase status */
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  /** Timestamp when the purchase was created */
  createdAt: string;
}

export interface Wallet {
  userId: string;
  balance: number;
  pendingBalance: number;
  totalEarnings: number;
  totalWithdrawn: number;
  updatedAt: string;
}

export interface Withdrawal {
  id: string;
  userId: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  payoutMethod: string;
  requestedAt: string;
  processedAt?: string;
}

// ==================== API Class ====================

export class PaymentsApi {
  constructor(private readonly client: ApiClient) {}

  // ==================== Basic Payment APIs ====================

  /**
   * Send a tip to another user
   * @param toUserId - ID of the user receiving the tip
   * @param amount - Tip amount in cents
   * @returns Tip transaction record
   */
  sendTip(toUserId: string, amount: number) {
    return this.client.post<Tip>('/api/tips', { toUserId, amount });
  }

  /**
   * Purchase access to a premium post
   * @param postId - ID of the post to purchase
   * @returns Purchase record
   */
  purchasePost(postId: string) {
    return this.client.post<PostPurchase>('/api/post-purchases', { postId });
  }

  /**
   * Get transaction history with cursor-based pagination
   * @param cursor - Optional pagination cursor
   * @returns List of transactions and next cursor
   */
  getTransactions(cursor?: string) {
    const params = cursor ? { cursor } : undefined;
    return this.client.get<{ transactions: Transaction[]; nextCursor?: string }>(
      '/api/transactions',
      { params }
    );
  }

  /**
   * Create a Stripe checkout session for adding funds
   * @returns Stripe checkout session URL
   */
  createStripeSession() {
    return this.client.post<{ sessionUrl: string }>('/api/stripe/checkout-session');
  }

  /**
   * Get Stripe customer portal URL
   * @returns Stripe portal URL for managing payment methods
   */
  getStripePortal() {
    return this.client.post<{ portalUrl: string }>('/api/stripe/portal-session');
  }

  // ==================== Wallet APIs ====================

  /**
   * Get current wallet balance and earnings
   * @returns Wallet information
   */
  getWallet() {
    return this.client.get<Wallet>('/api/wallet');
  }

  /**
   * Get comprehensive earnings summary
   * @returns Wallet info, recent transactions, and pending withdrawals
   */
  getEarningsSummary() {
    return this.client.get<{ wallet: Wallet; recentTransactions: unknown[]; pendingWithdrawals: Withdrawal[] }>(
      '/api/wallet/earnings'
    );
  }

  /**
   * Get complete wallet transaction history
   * @returns List of wallet transactions
   */
  getWalletHistory() {
    return this.client.get<unknown[]>('/api/wallet/history');
  }

  /**
   * Request a withdrawal from wallet
   * @param amount - Amount to withdraw in cents
   * @param payoutMethod - Payment method (e.g., 'bank_account', 'paypal')
   * @param payoutDetails - Optional payment details
   * @returns Withdrawal request record
   */
  requestWithdrawal(amount: number, payoutMethod: string, payoutDetails?: string) {
    return this.client.post<Withdrawal>('/api/wallet/withdraw', { amount, payoutMethod, payoutDetails });
  }

  /**
   * Get all withdrawal requests for the current user
   * @returns List of withdrawal records
   */
  getWithdrawals() {
    return this.client.get<Withdrawal[]>('/api/wallet/withdrawals');
  }

  // ==================== DM Monetization (P1 APIs) ====================

  /**
   * Purchase DM access to a specific user
   * @param targetUserId - ID of the user whose DM access is being purchased
   * @returns DM purchase record
   */
  purchaseDmAccess(targetUserId: string) {
    return this.client.post<DmPurchase>('/api/dm-purchases', { targetUserId });
  }

  /**
   * Update transaction status
   * @permission Admin only
   * @param transactionId - ID of the transaction to update
   * @param status - New transaction status
   * @param notes - Optional notes about the status change
   * @returns Updated transaction details
   */
  updateTransaction(transactionId: string, status: TransactionStatus, notes?: string) {
    return this.client.put<TransactionDetail>(`/api/transactions/${transactionId}`, { status, notes });
  }
}
