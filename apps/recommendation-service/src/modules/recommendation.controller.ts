import { Controller, Get, Param, Query } from '@nestjs/common';
import { RecommendationService } from '../services/recommendation.service';

/**
 * 推薦 API 控制器
 */
@Controller('api/recommendations')
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  /**
   * GET /recommendations/:userId
   * 獲取用戶的推薦內容
   */
  @Get(':userId')
  async getRecommendations(
    @Param('userId') userId: string,
    @Query('limit') limit?: number,
  ) {
    const parsedLimit = limit ? parseInt(String(limit), 10) : 10;

    if (parsedLimit < 1 || parsedLimit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }

    const recommendations =
      await this.recommendationService.getRecommendations(userId, parsedLimit);

    return {
      userId,
      count: recommendations.length,
      recommendations,
    };
  }

  /**
   * GET /recommendations/health
   * 健康檢查
   */
  @Get()
  health() {
    return { status: 'ok', service: 'recommendation-service' };
  }
}
