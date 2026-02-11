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
}
