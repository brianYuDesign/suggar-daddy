import type { ApiClient } from './client';

export interface SubscriptionTier {
  id: string;
  name: string;
  price: number;
  currency: string;
  features: string[];
}

export interface Subscription {
  id: string;
  userId: string;
  tierId: string;
  status: string;
  currentPeriodEnd: string;
}

export class SubscriptionsApi {
  constructor(private readonly client: ApiClient) {}

  getTiers() {
    return this.client.get<SubscriptionTier[]>('/api/subscription-tiers');
  }

  getTier(tierId: string) {
    return this.client.get<SubscriptionTier>(`/api/subscription-tiers/${tierId}`);
  }

  getMySubscription() {
    return this.client.get<Subscription>('/api/subscriptions/me');
  }

  subscribe(tierId: string) {
    return this.client.post<Subscription>('/api/subscriptions', { tierId });
  }

  cancel() {
    return this.client.delete<void>('/api/subscriptions/me');
  }
}
