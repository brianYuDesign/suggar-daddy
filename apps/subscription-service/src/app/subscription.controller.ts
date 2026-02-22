import {
  Controller,
  Delete,
  Get,
  NotFoundException,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  JwtAuthGuard,
  CurrentUser,
  CurrentUserData,
  Roles,
  Public,
} from '@suggar-daddy/auth';
import { UserRole } from '@suggar-daddy/common';
import { SubscriptionService } from './subscription.service';
import { SubscriptionTierService } from './subscription-tier.service';
import { SubscribeDto } from './dto/subscription.dto';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
export class SubscriptionController {
  constructor(
    private subscriptionService: SubscriptionService,
    private subscriptionTierService: SubscriptionTierService,
  ) {}

  /** 訂閱創作者方案 */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Subscribe to a creator tier' })
  async subscribe(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: SubscribeDto,
  ) {
    const tier = await this.subscriptionTierService.findOne(dto.tierId);
    return this.subscriptionService.create({
      subscriberId: user.userId,
      creatorId: tier.creatorId,
      tierId: dto.tierId,
    });
  }

  /** 檢查訂閱者是否對創作者有有效訂閱（供 content-service 訂閱牆可見性使用） */
  @Public()
  @Get('check')
  @ApiOperation({ summary: 'Check if subscriber has access to creator (optional tier)' })
  async checkAccess(
    @Query('subscriberId') subscriberId: string,
    @Query('creatorId') creatorId: string,
    @Query('tierId') tierId?: string
  ) {
    if (!subscriberId || !creatorId) {
      return { hasAccess: false };
    }
    const hasAccess = await this.subscriptionService.hasActiveSubscription(
      subscriberId,
      creatorId,
      tierId ?? null
    );
    return { hasAccess };
  }

  // Public endpoint - anyone can view subscription tiers
  @Public()
  @Get('tiers')
  @ApiOperation({ summary: 'Get all subscription tiers' })
  async getTiers() {
    return { message: 'Public: Get all tiers' };
  }

  // Protected endpoint - requires authentication
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user subscription' })
  async getMySubscription(@CurrentUser() user: CurrentUserData) {
    return this.subscriptionService.getMySubscription(user.userId);
  }

  /** 取消當前訂閱 */
  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cancel current user subscription' })
  async cancelMySubscription(@CurrentUser() user: CurrentUserData) {
    const sub = await this.subscriptionService.getMySubscription(user.userId);
    if (!sub) {
      throw new NotFoundException('No active subscription found');
    }
    return this.subscriptionService.cancel(sub.id);
  }

  // Creator-only endpoint
  @Post('create-tier')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new subscription tier (Creator only)' })
  async createTier(
    @CurrentUser() user: CurrentUserData,
    @Body() body: Record<string, unknown>,
  ) {
    return {
      message: 'Creator only: Create tier',
      creatorId: user.userId,
      body,
    };
  }

  // Admin-only endpoint
  @Get('admin/all')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all subscriptions (Admin only)' })
  async getAllSubscriptions(@CurrentUser('userId') userId: string) {
    return {
      message: 'Admin only: Get all subscriptions',
      adminId: userId,
    };
  }
}
