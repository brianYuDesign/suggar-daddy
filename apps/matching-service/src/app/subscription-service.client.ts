import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface UserTierInfo {
  isSubscriber: boolean;
  tierName: string;
}

@Injectable()
export class SubscriptionServiceClient {
  private readonly logger = new Logger(SubscriptionServiceClient.name);
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config
      .get<string>('SUBSCRIPTION_SERVICE_URL', 'http://localhost:3005')
      .replace(/\/$/, '');
  }

  async getUserTier(
    userId: string,
    authToken: string,
  ): Promise<UserTierInfo> {
    try {
      const url = `${this.baseUrl}/subscriptions/user/${userId}/tier`;
      this.logger.debug(`getUserTier userId=${userId}`);

      const res = await axios.get<UserTierInfo>(url, {
        timeout: 5000,
        headers: { Authorization: `Bearer ${authToken}` },
      });

      return res.data;
    } catch (err) {
      this.logger.warn(
        `Failed to get user tier userId=${userId}, defaulting to free`,
        err instanceof Error ? err.message : err,
      );
      return { isSubscriber: false, tierName: 'free' };
    }
  }
}
