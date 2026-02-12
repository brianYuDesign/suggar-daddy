/**
 * 數據分析控制器
 * 所有端點僅限 ADMIN 角色存取
 */

import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles, UserRole } from '@suggar-daddy/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /** GET /api/v1/admin/analytics/dau-mau - 取得 DAU/MAU 指標 */
  @Get('dau-mau')
  getDauMau(
    @Query('days', new DefaultValuePipe(7), ParseIntPipe) days: number,
  ) {
    return this.analyticsService.getDauMau(days);
  }

  /** GET /api/v1/admin/analytics/creator-revenue - 創作者營收排行 */
  @Get('creator-revenue')
  getCreatorRevenueRanking(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.analyticsService.getCreatorRevenueRanking(limit);
  }

  /** GET /api/v1/admin/analytics/popular-content - 熱門內容排行 */
  @Get('popular-content')
  getPopularContent(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.analyticsService.getPopularContent(limit);
  }

  /** GET /api/v1/admin/analytics/churn-rate - 訂閱流失率 */
  @Get('churn-rate')
  getSubscriptionChurnRate(
    @Query('period', new DefaultValuePipe('month')) period: string,
  ) {
    return this.analyticsService.getSubscriptionChurnRate(period);
  }

  /** GET /api/v1/admin/analytics/matching - 匹配統計 */
  @Get('matching')
  getMatchingStats() {
    return this.analyticsService.getMatchingStats();
  }
}
