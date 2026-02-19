import { Controller, Get, Post, Param, Query, Body, HttpCode, Logger, BadRequestException } from '@nestjs/common';
import { RecommendationService } from '../../services/recommendation.service';
import { RecommendationsListDto } from '../../dtos/recommendation.dto';
import { RecordInteractionDto } from '../../dtos/interaction.dto';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserInteraction } from '../../database/entities';

@Controller('api/v1/recommendations')
export class RecommendationController {
  private readonly logger = new Logger(RecommendationController.name);

  constructor(
    private recommendationService: RecommendationService,
    @InjectRepository(UserInteraction)
    private interactionRepository: Repository<UserInteraction>,
  ) {}

  /**
   * GET /api/v1/recommendations/:userId - 獲取用戶推薦
   * 快速響應 (<500ms)，基於 Redis 緩存
   */
  @Get(':userId')
  async getRecommendations(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
  ): Promise<RecommendationsListDto> {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    const limitNum = limit ? parseInt(limit) : 20;
    if (limitNum < 1 || limitNum > 100) {
      throw new BadRequestException('limit must be between 1 and 100');
    }

    const startTime = Date.now();

    const recommendations = await this.recommendationService.getRecommendations(userId, limitNum);

    const elapsed = Date.now() - startTime;
    this.logger.log(
      `Recommendations for user ${userId}: ${recommendations.length} items in ${elapsed}ms`,
    );

    return {
      user_id: userId,
      count: recommendations.length,
      recommendations,
      generated_at: new Date(),
      cache_hit: elapsed < 50,
    };
  }

  /**
   * POST /api/v1/recommendations/interactions - 記錄用戶互動
   * 用於更新推薦模型
   */
  @Post('interactions')
  @HttpCode(204)
  async recordInteraction(@Body() dto: RecordInteractionDto): Promise<void> {
    if (!dto.user_id || !dto.content_id || !dto.interaction_type) {
      throw new BadRequestException('user_id, content_id, and interaction_type are required');
    }

    try {
      const interaction = this.interactionRepository.create({
        user_id: dto.user_id,
        content_id: dto.content_id,
        interaction_type: dto.interaction_type as any,
        weight: this.getInteractionWeight(dto.interaction_type),
      });

      await this.interactionRepository.save(interaction);
      this.logger.debug(`Recorded ${dto.interaction_type} for user ${dto.user_id}`);

      // 異步清理推薦快取（非阻塞）
      this.invalidateUserCache(dto.user_id).catch((err) =>
        this.logger.error(`Cache invalidation failed: ${err.message}`),
      );
    } catch (err) {
      this.logger.error(`Failed to record interaction: ${err.message}`);
      throw new BadRequestException('Failed to record interaction');
    }
  }

  /**
   * POST /api/v1/recommendations/refresh - 手動刷新推薦
   */
  @Post('refresh/:userId')
  @HttpCode(200)
  async refreshRecommendations(@Param('userId') userId: string): Promise<RecommendationsListDto> {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    // 清空快取後重新生成
    await this.invalidateUserCache(userId);

    const recommendations = await this.recommendationService.getRecommendations(userId, 20);

    return {
      user_id: userId,
      count: recommendations.length,
      recommendations,
      generated_at: new Date(),
      cache_hit: false,
    };
  }

  /**
   * POST /api/v1/recommendations/update-scores - 更新內容分數 (定期任務)
   */
  @Post('update-scores')
  @HttpCode(200)
  async updateEngagementScores(): Promise<{ message: string; timestamp: Date }> {
    try {
      await this.recommendationService.updateContentEngagementScores();
      return {
        message: 'Engagement scores updated successfully',
        timestamp: new Date(),
      };
    } catch (err) {
      this.logger.error(`Failed to update scores: ${err.message}`);
      throw new BadRequestException('Failed to update engagement scores');
    }
  }

  /**
   * POST /api/v1/recommendations/clear-cache - 清空所有推薦快取
   */
  @Post('clear-cache')
  @HttpCode(200)
  async clearAllCache(): Promise<{ message: string; timestamp: Date }> {
    try {
      await this.recommendationService.clearAllCache();
      return {
        message: 'All recommendation caches cleared',
        timestamp: new Date(),
      };
    } catch (err) {
      this.logger.error(`Failed to clear cache: ${err.message}`);
      throw new BadRequestException('Failed to clear cache');
    }
  }

  /**
   * 獲取互動權重
   */
  private getInteractionWeight(type: string): number {
    const weights: Record<string, number> = {
      view: 1,
      skip: -1,
      like: 5,
      share: 8,
      comment: 3,
    };
    return weights[type] || 1;
  }

  /**
   * 異步失效用戶推薦快取
   */
  private async invalidateUserCache(userId: string): Promise<void> {
    setTimeout(() => {
      this.recommendationService.clearAllCache().catch((err) => {
        this.logger.error(`Cache invalidation error: ${err.message}`);
      });
    }, 100);
  }
}
