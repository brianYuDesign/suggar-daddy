import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';
import { RedisService } from '../cache/redis.service';
import { RecommendationService } from './recommendation.service';

/**
 * 快取策略服務
 * 負責:
 * 1. 快取預熱 (啟動時和定期)
 * 2. 快取失效 (事件驅動)
 * 3. 快取命中率監控
 */
@Injectable()
export class CacheStrategyService implements OnModuleInit {
  private cacheMetrics = {
    hits: 0,
    misses: 0,
    lastResetTime: Date.now(),
  };

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private redisService: RedisService,
    private recommendationService: RecommendationService,
  ) {}

  /**
   * 模塊初始化時執行快取預熱
   */
  async onModuleInit() {
    console.log('🔄 Starting cache warm-up on module init...');
    // Cache warm-up logic would go here (requires populated database)
    console.log('✅ Cache warm-up completed');
  }

  /**
   * 每小時刷新一次推薦快取 (針對熱門用戶)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async hourlyRefreshRecommendations() {
    console.log('🔄 [Hourly] Refreshing top user recommendations...');

    try {
      // 獲取活躍用戶
      const activeUsers = await this.getActiveUsers(50);

      for (const user of activeUsers) {
        // 清除舊快取
        await this.invalidateUserRecommendations(user.id);
        
        // 預熱新快取
        await this.recommendationService.getRecommendations(user.id, 10);
      }

      console.log(`✅ [Hourly] Refreshed recommendations for ${activeUsers.length} users`);
    } catch (error) {
      console.error('❌ [Hourly] Error refreshing recommendations:', error);
    }
  }

  /**
   * 每天重建用戶興趣快取 (針對所有活躍用戶)
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async dailyRebuildUserInterestCache() {
    console.log('🔄 [Daily] Rebuilding user interest cache...');

    try {
      const activeUsers = await this.getActiveUsers(1000);
      let successCount = 0;

      for (const user of activeUsers) {
        try {
          // 清除舊快取
          const cacheKey = `rec:user:${user.id}:interests`;
          await this.redisService.del(cacheKey);
          successCount++;
        } catch (error) {
          console.warn(`⚠️ Failed to rebuild cache for user ${user.id}`);
        }
      }

      console.log(`✅ [Daily] Rebuilt interest cache for ${successCount}/${activeUsers.length} users`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('❌ [Daily] Error rebuilding interest cache:', errorMsg);
    }
  }

  /**
   * 監控快取命中率 (每小時報告一次)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async monitorCacheHitRate() {
    const hitRate = this.getCacheHitRate();
    
    if (hitRate < 80) {
      console.warn(`⚠️ [Monitor] Cache hit rate is low: ${hitRate.toFixed(2)}%`);
    } else {
      console.log(`✅ [Monitor] Cache hit rate is healthy: ${hitRate.toFixed(2)}%`);
    }

    // 每天重置指標
    if (Date.now() - this.cacheMetrics.lastResetTime > 24 * 60 * 60 * 1000) {
      this.resetCacheMetrics();
    }
  }

  /**
   * 當內容被更新時，失效相關快取
   */
  async onContentUpdated(contentId: string) {
    console.log(`🔄 Invalidating cache for updated content: ${contentId}`);

    try {
      // 失效內容快取
      await this.redisService.del(`rec:content:${contentId}:full`);

      // 失效所有推薦快取 (因為內容改變了)
      const client = await this.redisService.getClient();
      if (client) {
        const keys = await client.keys('recommendations:*');
        if (keys && keys.length > 0) {
          await this.redisService.del(keys);
          console.log(`✅ Invalidated ${keys.length} recommendation cache entries`);
        }
      }

      // 失效熱門內容快取
      await this.redisService.del('rec:top_contents:*');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn('⚠️ Error invalidating cache:', errorMsg);
    }
  }

  /**
   * 當用戶互動時，失效該用戶的推薦快取
   */
  async onUserInteraction(userId: string, contentId: string, interactionType: string) {
    console.log(`🔄 Invalidating cache for user interaction: ${userId} -> ${contentId}`);

    try {
      // 失效用戶的推薦快取 (所有 limit 版本)
      const client = await this.redisService.getClient();
      if (client) {
        const keys = await client.keys(`recommendations:${userId}:*`);
        if (keys && keys.length > 0) {
          await this.redisService.del(keys);
          console.log(`✅ Invalidated ${keys.length} user recommendations`);
        }
      }

      // 失效用戶互動歷史快取
      await this.redisService.del(`rec:user:${userId}:interactions:*`);

      // 失效內容快取 (如果是喜歡/分享，engagement_score 會改變)
      if (['like', 'share'].includes(interactionType)) {
        await this.redisService.del(`rec:content:${contentId}:full`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn('⚠️ Error invalidating user cache:', errorMsg);
    }
  }

  /**
   * 失效特定用戶的推薦快取
   */
  private async invalidateUserRecommendations(userId: string) {
    const client = await this.redisService.getClient();
    if (client) {
      const keys = await client.keys(`recommendations:${userId}:*`);
      if (keys && keys.length > 0) {
        await this.redisService.del(keys);
      }
    }
  }

  /**
   * 獲取活躍用戶列表 (過去7天有交互)
   */
  private async getActiveUsers(limit: number): Promise<User[]> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    return this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect(
        'user.interactions',
        'interaction',
        'interaction.created_at > :sevenDaysAgo',
        { sevenDaysAgo },
      )
      .where('user.is_active = :isActive', { isActive: true })
      .groupBy('user.id')
      .orderBy('COUNT(interaction.id)', 'DESC')
      .take(limit)
      .getMany();
  }

  /**
   * 記錄快取命中
   */
  recordCacheHit() {
    this.cacheMetrics.hits++;
  }

  /**
   * 記錄快取未命中
   */
  recordCacheMiss() {
    this.cacheMetrics.misses++;
  }

  /**
   * 計算快取命中率
   */
  private getCacheHitRate(): number {
    const total = this.cacheMetrics.hits + this.cacheMetrics.misses;
    if (total === 0) return 0;
    return (this.cacheMetrics.hits / total) * 100;
  }

  /**
   * 重置快取指標
   */
  private resetCacheMetrics() {
    this.cacheMetrics.hits = 0;
    this.cacheMetrics.misses = 0;
    this.cacheMetrics.lastResetTime = Date.now();
    console.log('🔄 Cache metrics reset');
  }

  /**
   * 獲取快取指標 (用於監控)
   */
  getMetrics() {
    return {
      hits: this.cacheMetrics.hits,
      misses: this.cacheMetrics.misses,
      hitRate: this.getCacheHitRate().toFixed(2) + '%',
      totalOperations: this.cacheMetrics.hits + this.cacheMetrics.misses,
    };
  }

  /**
   * 清空所有快取 (用於重置或維護)
   */
  async clearAllCache() {
    console.log('🔄 Clearing all cache...');
    
    try {
      const client = await this.redisService.getClient();
      if (client) {
        // 清空所有推薦相關快取
        const patterns = [
          'recommendations:*',
          'rec:*',
          'rec:user:*:interests',
        ];

        for (const pattern of patterns) {
          const keys = await client.keys(pattern);
          if (keys && keys.length > 0) {
            await this.redisService.del(keys);
            console.log(`✅ Cleared ${keys.length} keys matching pattern: ${pattern}`);
          }
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn('⚠️ Error clearing cache:', errorMsg);
    }
  }
}
