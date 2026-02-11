import type { ApiClient } from './client';

export interface Tip {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  currency: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

export interface PostPurchase {
  id: string;
  userId: string;
  postId: string;
  amount: number;
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

export class PaymentsApi {
  constructor(private readonly client: ApiClient) {}

  sendTip(toUserId: string, amount: number) {
    return this.client.post<Tip>('/api/tips', { toUserId, amount });
  }

  purchasePost(postId: string) {
    return this.client.post<PostPurchase>('/api/post-purchases', { postId });
  }

  getTransactions(cursor?: string) {
    const params = cursor ? { cursor } : undefined;
    return this.client.get<{ transactions: Transaction[]; nextCursor?: string }>(
      '/api/transactions',
      { params }
    );
  }

  createStripeSession() {
    return this.client.post<{ sessionUrl: string }>('/api/stripe/checkout-session');
  }

  getStripePortal() {
    return this.client.post<{ portalUrl: string }>('/api/stripe/portal-session');
  }

  // Wallet
  getWallet() {
    return this.client.get<Wallet>('/api/wallet');
  }

  getEarningsSummary() {
    return this.client.get<{ wallet: Wallet; recentTransactions: unknown[]; pendingWithdrawals: Withdrawal[] }>(
      '/api/wallet/earnings'
    );
  }

  getWalletHistory() {
    return this.client.get<unknown[]>('/api/wallet/history');
  }

  requestWithdrawal(amount: number, payoutMethod: string, payoutDetails?: string) {
    return this.client.post<Withdrawal>('/api/wallet/withdraw', { amount, payoutMethod, payoutDetails });
  }

  getWithdrawals() {
    return this.client.get<Withdrawal[]>('/api/wallet/withdrawals');
  }
}
