import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class SubscriptionServiceClient {
  private readonly logger = new Logger(SubscriptionServiceClient.name);
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>(
      'SUBSCRIPTION_SERVICE_URL',
      'http://localhost:3009'
    ).replace(/\/$/, '');
  }

  async hasActiveSubscription(
    subscriberId: string,
    creatorId: string,
    tierId?: string | null
  ): Promise<boolean> {
    const params = new URLSearchParams({
      subscriberId,
      creatorId,
    });
    if (tierId) params.set('tierId', tierId);
    const url = `${this.baseUrl}/api/subscriptions/check?${params.toString()}`;
    try {
      const res = await axios.get<{ hasAccess: boolean }>(url, { timeout: 5000 });
      return res.data?.hasAccess === true;
    } catch (e) {
      this.logger.warn('subscription check failed', e);
      return false;
    }
  }
}
