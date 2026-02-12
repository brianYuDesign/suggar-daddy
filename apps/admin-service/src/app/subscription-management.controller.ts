/**
 * 訂閱管理控制器
 * 所有端點僅限 ADMIN 角色存取
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles, UserRole } from '@suggar-daddy/common';
import { SubscriptionManagementService } from './subscription-management.service';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class SubscriptionManagementController {
  constructor(
    private readonly subscriptionService: SubscriptionManagementService,
  ) {}

  /** GET /api/v1/admin/subscriptions — 分頁查詢訂閱列表 */
  @Get()
  listSubscriptions(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) {
    return this.subscriptionService.listSubscriptions(page, limit, status);
  }

  /** GET /api/v1/admin/subscriptions/stats — 訂閱統計 */
  @Get('stats')
  getSubscriptionStats() {
    return this.subscriptionService.getSubscriptionStats();
  }

  /** GET /api/v1/admin/subscriptions/tiers — 方案列表 */
  @Get('tiers')
  listTiers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('creatorId') creatorId?: string,
  ) {
    return this.subscriptionService.listTiers(page, limit, creatorId);
  }

  /** POST /api/v1/admin/subscriptions/tiers/:tierId/toggle — 切換方案狀態 */
  @Post('tiers/:tierId/toggle')
  toggleTierActive(@Param('tierId') tierId: string) {
    return this.subscriptionService.toggleTierActive(tierId);
  }
}
