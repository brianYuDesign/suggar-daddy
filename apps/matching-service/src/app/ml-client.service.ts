import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '@suggar-daddy/redis';
import axios from 'axios';

export interface MlRecommendation {
  userId: string;
  score: number;
}

@Injectable()
export class MlClientService {
  private readonly logger = new Logger(MlClientService.name);
  private readonly baseUrl: string;
  private readonly ML_RECS_PREFIX = 'ml_recs:';
  private readonly ML_RECS_TTL = 3600; // 1 hour
  private readonly REQUEST_TIMEOUT = 2000; // 2 seconds

  constructor(
    private readonly redisService: RedisService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config
      .get<string>('ML_SERVICE_URL', 'http://localhost:5000')
      .replace(/\/$/, '');
  }

  async getRecommendations(
    userId: string,
    limit: number,
    excludeIds: string[],
  ): Promise<MlRecommendation[] | null> {
    try {
      // Check Redis cache first
      const cacheKey = `${this.ML_RECS_PREFIX}${userId}`;
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        this.logger.debug(`ML recommendations cache hit userId=${userId}`);
        const recs: MlRecommendation[] = JSON.parse(cached);
        const excludeSet = new Set(excludeIds);
        return recs
          .filter((r) => !excludeSet.has(r.userId))
          .slice(0, limit);
      }

      // Fetch from ML service
      const url = `${this.baseUrl}/recommendations`;
      this.logger.debug(
        `getRecommendations userId=${userId} limit=${limit} excludeCount=${excludeIds.length}`,
      );

      const res = await axios.post<MlRecommendation[]>(
        url,
        { userId, limit, excludeIds },
        { timeout: this.REQUEST_TIMEOUT },
      );

      const recs = Array.isArray(res.data) ? res.data : [];

      // Cache the result
      if (recs.length > 0) {
        await this.redisService.set(
          cacheKey,
          JSON.stringify(recs),
          this.ML_RECS_TTL,
        );
      }

      return recs.slice(0, limit);
    } catch (err) {
      this.logger.warn(
        `ML service unavailable, returning null (fallback to compat score) userId=${userId}`,
        err instanceof Error ? err.message : err,
      );
      return null;
    }
  }

  async getHealth(): Promise<boolean> {
    try {
      const res = await axios.get(`${this.baseUrl}/health`, {
        timeout: this.REQUEST_TIMEOUT,
      });
      return res.status === 200;
    } catch {
      return false;
    }
  }
}
