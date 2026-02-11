/**
 * 支付統計控制器
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
import { PaymentStatsService } from './payment-stats.service';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class PaymentStatsController {
  constructor(private readonly paymentStatsService: PaymentStatsService) {}

  /** GET /api/v1/admin/payments/revenue - 取得指定時間範圍營收報表 */
  @Get('revenue')
  getRevenueReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.paymentStatsService.getRevenueReport(startDate, endDate);
  }

  /** GET /api/v1/admin/payments/top-creators - 取得頂尖創作者排行 */
  @Get('top-creators')
  getTopCreators(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.paymentStatsService.getTopCreators(limit);
  }

  /** GET /api/v1/admin/payments/daily-revenue - 取得每日營收 */
  @Get('daily-revenue')
  getDailyRevenue(
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.paymentStatsService.getDailyRevenue(days);
  }

  /** GET /api/v1/admin/payments/stats - 取得支付概覽統計 */
  @Get('stats')
  getPaymentStats() {
    return this.paymentStatsService.getPaymentStats();
  }
}
