import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RecommendationService } from './recommendation.service';

@Injectable()
export class ScheduledTasksService {
  private readonly logger = new Logger(ScheduledTasksService.name);

  constructor(private recommendationService: RecommendationService) {}

  /**
   * 每小時更新一次內容分數
   */
  @Cron(CronExpression.EVERY_HOUR)
  async updateEngagementScores(): Promise<void> {
    this.logger.log('📊 Starting hourly engagement score update...');
    try {
      await this.recommendationService.updateContentEngagementScores();
      this.logger.log('✅ Engagement scores updated successfully');
    } catch (err: any) {
      this.logger.error(`❌ Failed to update engagement scores: ${err.message}`);
    }
  }

  /**
   * 每 6 小時清理一次過期快取
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async clearExpiredCache(): Promise<void> {
    this.logger.log('🧹 Clearing expired recommendation cache...');
    try {
      await this.recommendationService.clearAllCache();
      this.logger.log('✅ Cache cleared successfully');
    } catch (err: any) {
      this.logger.error(`❌ Failed to clear cache: ${err.message}`);
    }
  }
}
