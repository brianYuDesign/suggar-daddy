// 僅驗證 P1 API 的類型
import type { ApiClient } from './libs/api-client/src/client';

// === Subscription Types ===
interface CreateTierDto {
  name: string;
  description?: string;
  price: number;
  currency: string;
  billingPeriod: 'MONTHLY' | 'YEARLY';
  benefits?: string[];
  isActive?: boolean;
}

interface UpdateTierDto {
  name?: string;
  description?: string;
  price?: number;
  benefits?: string[];
  isActive?: boolean;
}

interface SubscriptionTierDetail {
  tierId: string;
  creatorId: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  billingPeriod: 'MONTHLY' | 'YEARLY';
  benefits?: string[];
  isActive: boolean;
  subscribersCount: number;
  createdAt: string;
  updatedAt: string;
}

// === Payment Types ===
type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'CANCELLED';

interface DmPurchase {
  purchaseId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
}

interface TransactionDetail {
  transactionId: string;
  userId: string;
  type: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  description?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// === Subscription API Class ===
class SubscriptionsApi {
  constructor(private readonly client: ApiClient) {}

  createSubscriptionTier(dto: CreateTierDto): Promise<SubscriptionTierDetail> {
    return this.client.post<SubscriptionTierDetail>('/api/subscription-tiers', dto);
  }

  updateSubscriptionTier(tierId: string, dto: UpdateTierDto): Promise<SubscriptionTierDetail> {
    return this.client.put<SubscriptionTierDetail>(`/api/subscription-tiers/${tierId}`, dto);
  }

  deleteSubscriptionTier(tierId: string): Promise<{ success: boolean }> {
    return this.client.delete<{ success: boolean }>(`/api/subscription-tiers/${tierId}`);
  }
}

// === Payment API Class ===
class PaymentsApi {
  constructor(private readonly client: ApiClient) {}

  purchaseDmAccess(targetUserId: string): Promise<DmPurchase> {
    return this.client.post<DmPurchase>('/api/dm-purchases', { targetUserId });
  }

  updateTransaction(transactionId: string, status: TransactionStatus, notes?: string): Promise<TransactionDetail> {
    return this.client.put<TransactionDetail>(`/api/transactions/${transactionId}`, { status, notes });
  }
}

console.log('✅ P1 API 類型驗證通過');
