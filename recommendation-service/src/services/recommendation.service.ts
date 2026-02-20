import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Content, UserInteraction, UserInterest } from '../database/entities';
import { RedisService } from '../cache/redis.service';

export interface IRecommendationResult {
  contentId: string;
  score: number;
  reason: string;
}

export interface RecommendationResult {
  content_id: string;
  title: string;
  tags: string[];
  score: number;
  reason: string;
}

/**
 * 推薦演算法服務
 */
@Injectable()
export class RecommendationService {
  constructor(
    @InjectRepository(Content)
    private contentRepository: Repository<Content>,
    @InjectRepository(UserInteraction)
    private interactionRepository: Repository<UserInteraction>,
    @InjectRepository(UserInterest)
    private userInterestRepository: Repository<UserInterest>,
    private redisService: RedisService,
  ) {}

  /**
   * 根據用戶興趣和交互歷史生成推薦
   */
  async getRecommendations(userId: string, limit: number = 10): Promise<RecommendationResult[]> {
    const cacheKey = `recommendations:${userId}:${limit}`;

    // 嘗試從快取獲取
    const cached = await this.redisService.get<RecommendationResult[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // 快取未命中，獲取所有內容
    const contents = await this.contentRepository.find({
      relations: ['tags'],
      take: limit,
      order: { engagement_score: 'DESC' },
    });

    if (!contents || contents.length === 0) {
      return [];
    }

    // 獲取用戶興趣
    const userInterests = await this.userInterestRepository.find({
      where: { user_id: userId },
    });

    // 構建推薦結果
    const recommendations: RecommendationResult[] = contents
      .slice(0, limit)
      .map((content) => ({
        content_id: content.id,
        title: content.title,
        tags: content.tags?.map((t) => t.name) || [],
        score: this.calculateScore(userInterests, content),
        reason: 'Based on interests and engagement',
      }));

    // 存入快取（3600 秒）
    await this.redisService.set(cacheKey, recommendations, 3600);

    return recommendations;
  }

  /**
   * 計算推薦分數
   */
  private calculateScore(
    userInterests: UserInterest[],
    content: Content,
  ): number {
    // 簡化實現：基於參與度分數
    return Math.min(content.engagement_score || 0.5, 1);
  }

  /**
   * 驗證推薦結果
   */
  validateResult(result: IRecommendationResult): boolean {
    return (
      !!result.contentId &&
      result.score >= 0 &&
      result.score <= 1 &&
      !!result.reason
    );
  }

  /**
   * 更新內容的參與度分數
   */
  async updateContentEngagementScores(): Promise<void> {
    const contents = await this.contentRepository.find();

    for (const content of contents) {
      // 計算參與度分數 = (view_count + like_count * 5 + share_count * 10) / (1 + time_decay)
      const engagementScore =
        (content.view_count + content.like_count * 5 + content.share_count * 10) /
        (1 + Math.pow(2, -(Date.now() - content.created_at.getTime()) / (24 * 60 * 60 * 1000)));

      content.engagement_score = Math.min(engagementScore / 100, 1);
      await this.contentRepository.save(content);
    }
  }

  /**
   * 清空所有推薦快取
   */
  async clearAllCache(): Promise<void> {
    try {
      const client = await this.redisService.getClient();
      if (client) {
        const keys = await client.keys('recommendations:*');
        if (keys && keys.length > 0) {
          await this.redisService.del(keys);
        }
      }
    } catch (err) {
      // 如果 Redis 不可用，優雅地忽略
      return;
    }
  }
}
