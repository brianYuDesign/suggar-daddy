import type { ApiClient } from './client';

// ==================== Types ====================

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

/**
 * DTO for creating a new subscription tier
 */
export interface CreateTierDto {
  /** Name of the subscription tier */
  name: string;
  /** Description of the tier benefits */
  description?: string;
  /** Price in cents (e.g., 999 for $9.99) */
  price: number;
  /** Currency code (e.g., 'USD', 'TWD') */
  currency: string;
  /** Billing period */
  billingPeriod: 'MONTHLY' | 'YEARLY';
  /** List of benefits included in this tier */
  benefits?: string[];
  /** Whether the tier is active and available for subscription */
  isActive?: boolean;
}

/**
 * DTO for updating an existing subscription tier
 */
export interface UpdateTierDto {
  /** Name of the subscription tier */
  name?: string;
  /** Description of the tier benefits */
  description?: string;
  /** Price in cents */
  price?: number;
  /** List of benefits included in this tier */
  benefits?: string[];
  /** Whether the tier is active and available for subscription */
  isActive?: boolean;
}

/**
 * Complete subscription tier information including metadata
 */
export interface SubscriptionTierDetail {
  /** Unique identifier for the tier */
  tierId: string;
  /** ID of the creator who owns this tier */
  creatorId: string;
  /** Name of the subscription tier */
  name: string;
  /** Description of the tier benefits */
  description?: string;
  /** Price in cents */
  price: number;
  /** Currency code */
  currency: string;
  /** Billing period */
  billingPeriod: 'MONTHLY' | 'YEARLY';
  /** List of benefits included in this tier */
  benefits?: string[];
  /** Whether the tier is active */
  isActive: boolean;
  /** Number of current subscribers */
  subscribersCount: number;
  /** Timestamp when the tier was created */
  createdAt: string;
  /** Timestamp when the tier was last updated */
  updatedAt: string;
}

// ==================== API Class ====================

export class SubscriptionsApi {
  constructor(private readonly client: ApiClient) {}

  // ==================== Public APIs ====================

  /**
   * Get all available subscription tiers
   * @returns List of subscription tiers
   */
  getTiers() {
    return this.client.get<SubscriptionTier[]>('/api/subscription-tiers');
  }

  /**
   * Get details of a specific subscription tier
   * @param tierId - ID of the tier to retrieve
   * @returns Subscription tier details
   */
  getTier(tierId: string) {
    return this.client.get<SubscriptionTier>(`/api/subscription-tiers/${tierId}`);
  }

  /**
   * Get the current user's subscription
   * @returns Current subscription information
   */
  getMySubscription() {
    return this.client.get<Subscription>('/api/subscriptions/my-subscription');
  }

  /**
   * Subscribe to a tier
   * @param tierId - ID of the tier to subscribe to
   * @returns New subscription information
   */
  subscribe(tierId: string) {
    return this.client.post<Subscription>('/api/subscriptions', { tierId });
  }

  /**
   * Cancel the current subscription
   */
  cancel() {
    return this.client.delete<void>('/api/subscriptions/my-subscription');
  }

  // ==================== Creator Tools (P1 APIs) ====================

  /**
   * Create a new subscription tier
   * @permission Creator only
   * @param dto - Tier creation data
   * @returns Created subscription tier with full details
   */
  createSubscriptionTier(dto: CreateTierDto) {
    return this.client.post<SubscriptionTierDetail>('/api/subscription-tiers', dto);
  }

  /**
   * Update an existing subscription tier
   * @permission Creator only - must own the tier
   * @param tierId - ID of the tier to update
   * @param dto - Updated tier data
   * @returns Updated subscription tier with full details
   */
  updateSubscriptionTier(tierId: string, dto: UpdateTierDto) {
    return this.client.put<SubscriptionTierDetail>(`/api/subscription-tiers/${tierId}`, dto);
  }

  /**
   * Delete a subscription tier
   * @permission Creator only - must own the tier
   * @param tierId - ID of the tier to delete
   * @returns Success status
   */
  deleteSubscriptionTier(tierId: string) {
    return this.client.delete<{ success: boolean }>(`/api/subscription-tiers/${tierId}`);
  }
}
