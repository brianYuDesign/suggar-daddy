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
    const url = `${this.baseUrl}/api/users/cards`;
    const params = new URLSearchParams();
    if (excludeIds.length) params.set('exclude', excludeIds.join(','));
    params.set('limit', String(limit));
    const fullUrl = `${url}?${params.toString()}`;
    this.logger.debug(`getCardsForRecommendation exclude=${excludeIds.length} limit=${limit}`);
    const res = await axios.get<UserCardDto[]>(fullUrl, { timeout: 10000 });
    const data = Array.isArray(res.data) ? res.data : [];
    this.parseDates(data);
    return data;
  }

  /** 根據指定 userId 列表取得卡片（供地理篩選後使用） */
  async getCardsByIds(userIds: string[]): Promise<UserCardDto[]> {
    if (userIds.length === 0) return [];
    const url = `${this.baseUrl}/api/users/cards/by-ids`;
    this.logger.debug(`getCardsByIds count=${userIds.length}`);
    const res = await axios.post<UserCardDto[]>(url, { userIds }, { timeout: 10000 });
    const data = Array.isArray(res.data) ? res.data : [];
    this.parseDates(data);
    return data;
  }

  private parseDates(data: UserCardDto[]): void {
    data.forEach((c) => {
      if (c.lastActiveAt && typeof c.lastActiveAt === 'string') {
        (c as UserCardDto & { lastActiveAt: Date | string }).lastActiveAt = new Date(c.lastActiveAt);
      }
    });
  }
}
