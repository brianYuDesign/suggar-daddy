import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import type { UserCardDto } from '@suggar-daddy/dto';

@Injectable()
export class UserServiceClient {
  private readonly logger = new Logger(UserServiceClient.name);
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>(
      'USER_SERVICE_URL',
      'http://localhost:3001'
    ).replace(/\/$/, '');
  }

  async getCardsForRecommendation(
    excludeIds: string[],
    limit: number
  ): Promise<UserCardDto[]> {
    const url = `${this.baseUrl}/api/v1/users/cards`;
    const params = new URLSearchParams();
    if (excludeIds.length) params.set('exclude', excludeIds.join(','));
    params.set('limit', String(limit));
    const fullUrl = `${url}?${params.toString()}`;
    this.logger.debug(`getCardsForRecommendation exclude=${excludeIds.length} limit=${limit}`);
    const res = await axios.get<UserCardDto[]>(fullUrl, { timeout: 10000 });
    const data = Array.isArray(res.data) ? res.data : [];
    data.forEach((c) => {
      if (c.lastActiveAt && typeof c.lastActiveAt === 'string') {
        (c as any).lastActiveAt = new Date(c.lastActiveAt);
      }
    });
    return data;
  }
}
