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
 * 推薦演算法服務 - 優化版本
 * 優化改進:
 * 1. 修復 N+1 查詢問題 - 使用 QueryBuilder with leftJoinAndSelect
 * 2. 批量更新 engagement_score 而非逐個保存
 * 3. 改進快取策略
 * 4. 添加查詢性能監控
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
   * 根據用戶興趣和交互歷史生成推薦 - 優化版本
   * 
   * 優化:
   * - 使用 QueryBuilder 避免 N+1 (單一查詢而非多個查詢)
   * - 使用 leftJoinAndSelect 減少數據庫往返
   * - 添加索引利用 (engagement_score DESC, created_at DESC)
   * - 實現分層快取 (用戶推薦 -> 內容 -> 標籤)
   */
  async getRecommendations(userId: string, limit: number = 10): Promise<RecommendationResult[]> {
    const cacheKey = `recommendations:${userId}:${limit}`;

    // 層級 1: 嘗試從快取獲取完整結果
    const cached = await this.redisService.get<RecommendationResult[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // 層級 2: 使用 QueryBuilder 單一高效查詢 (避免 N+1)
    // ✅ 最佳實踐: leftJoinAndSelect 在一個查詢中加載 tags
    const startTime = Date.now();
    
    const contents = await this.contentRepository
      .createQueryBuilder('content')
      .leftJoinAndSelect('content.tags', 'tags')
      .orderBy('content.engagement_score', 'DESC')
      .addOrderBy('content.created_at', 'DESC')
      .take(limit)
      .getMany();

    const queryTime = Date.now() - startTime;
    console.log(`✅ Query optimization: loaded ${contents.length} contents with tags in ${queryTime}ms (single query)`);

    if (!contents || contents.length === 0) {
      return [];
    }

    // 層級 3: 快取個別內容
    for (const content of contents) {
      const contentKey = `rec:content:${content.id}:full`;
      await this.redisService.set(contentKey, content, 24 * 3600); // 24h TTL
    }

    // 層級 4: 獲取用戶興趣 (優化: 使用索引查詢)
    const userInterests = await this.userInterestRepository
      .createQueryBuilder('interest')
      .where('interest.user_id = :userId', { userId })
      .getMany();

    // 層級 5: 構建推薦結果
    const recommendations: RecommendationResult[] = contents.map((content) => ({
      content_id: content.id,
      title: content.title,
      tags: content.tags?.map((t) => t.name) || [],
      score: this.calculateScore(userInterests, content),
      reason: 'Based on interests and engagement',
    }));

    // 層級 6: 快取完整結果 (1小時)
    await this.redisService.set(cacheKey, recommendations, 3600);

    return recommendations;
  }

  /**
   * 計算推薦分數 - 改進版本
   */
  private calculateScore(
    userInterests: UserInterest[],
    content: Content,
  ): number {
    // 基於參與度分數 + 用戶標籤興趣匹配
    const engagementScore = Math.min(content.engagement_score || 0.5, 1);
    
    // 如果內容標籤與用戶興趣匹配，增加分數
    const tagInterestBonus = content.tags && content.tags.length > 0
      ? content.tags.reduce((bonus, tag) => {
          const interest = userInterests.find(ui => ui.tag_id === tag.id);
          return bonus + (interest?.interest_score || 0);
        }, 0) / Math.max(content.tags.length, 1)
      : 0;

    return Math.min(engagementScore * 0.7 + tagInterestBonus * 0.3, 1);
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
   * 更新內容的參與度分數 - 優化版本
   * 
   * 優化:
   * - ❌ OLD: 逐個內容循環並保存 (O(n) 次資料庫寫入!)
   * - ✅ NEW: 單一 SQL UPDATE 語句 (O(1) 次資料庫寫入!)
   */
  async updateContentEngagementScores(): Promise<void> {
    const startTime = Date.now();

    try {
      // ✅ 單一批量更新查詢
      const result = await this.contentRepository
        .createQueryBuilder()
        .update(Content)
        .set({
          engagement_score: () => `
            LEAST(
              1.0,
              (view_count + like_count * 5 + share_count * 10) /
              (1 + POW(2, 
                -(EXTRACT(EPOCH FROM (NOW() - created_at)) / (24 * 60 * 60))
              ))
            )
          `,
        })
        .execute();

      const duration = Date.now() - startTime;
      console.log(`✅ Batch update optimization: updated ${result.affected} contents in ${duration}ms (single query)`);

      // 清空相關快取
      await this.clearAllCache();
    } catch (error) {
      console.error('❌ Error updating engagement scores:', error);
      throw error;
    }
  }

  /**
   * 清空所有推薦快取 - 改進版本
   */
  async clearAllCache(): Promise<void> {
    try {
      const client = await this.redisService.getClient();
      if (client) {
        const keys = await client.keys('recommendations:*');
        if (keys && keys.length > 0) {
          await this.redisService.del(keys);
          console.log(`🔄 Cleared ${keys.length} recommendation cache keys`);
        }

        // 也清空內容快取
        const contentKeys = await client.keys('rec:content:*');
        if (contentKeys && contentKeys.length > 0) {
          await this.redisService.del(contentKeys);
          console.log(`🔄 Cleared ${contentKeys.length} content cache keys`);
        }
      }
    } catch (err) {
      console.warn('⚠️ Warning: Could not clear cache (Redis might be unavailable):', err.message);
      // 優雅地處理 - Redis 不可用時不中斷服務
      return;
    }
  }

  /**
   * 批量獲取內容 - 用於預熱快取
   */
  async getTopContents(limit: number = 100): Promise<Content[]> {
    const cacheKey = `rec:top_contents:${limit}`;
    
    // 檢查快取
    const cached = await this.redisService.get<Content[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // 數據庫查詢 (使用索引)
    const contents = await this.contentRepository
      .createQueryBuilder('content')
      .leftJoinAndSelect('content.tags', 'tags')
      .orderBy('content.engagement_score', 'DESC')
      .take(limit)
      .getMany();

    // 快取結果
    await this.redisService.set(cacheKey, contents, 3600);

    return contents;
  }

  /**
   * 獲取用戶互動歷史 - 優化版本
   */
  async getUserInteractionHistory(userId: string, limit: number = 50): Promise<UserInteraction[]> {
    const cacheKey = `rec:user:${userId}:interactions:${limit}`;

    // 檢查快取
    const cached = await this.redisService.get<UserInteraction[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // ✅ 使用複合索引 (user_id, created_at DESC)
    const interactions = await this.interactionRepository
      .createQueryBuilder('interaction')
      .where('interaction.user_id = :userId', { userId })
      .orderBy('interaction.created_at', 'DESC')
      .take(limit)
      .getMany();

    // 快取結果 (12小時)
    await this.redisService.set(cacheKey, interactions, 12 * 3600);

    return interactions;
  }

  /**
   * 預熱推薦快取 - 用於啟動或定期重建
   */
  async warmUpCache(activeUserIds: string[], limit: number = 10): Promise<void> {
    console.log(`🔄 Warming up cache for ${activeUserIds.length} users...`);
    
    const startTime = Date.now();
    let successCount = 0;

    for (const userId of activeUserIds) {
      try {
        await this.getRecommendations(userId, limit);
        successCount++;
      } catch (error) {
        console.warn(`⚠️ Failed to warm cache for user ${userId}:`, error.message);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Cache warm-up complete: ${successCount}/${activeUserIds.length} users in ${duration}ms`);
  }
}
