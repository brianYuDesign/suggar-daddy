import {
  Controller,
  Get,
  Post,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  CurrentUser,
  CurrentUserData,
  Roles,
  UserRole,
  Public,
} from '@suggar-daddy/common';
import { SubscriptionService } from './subscription.service';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
export class SubscriptionController {
  constructor(private subscriptionService: SubscriptionService) {}

  // Public endpoint - anyone can view subscription tiers
  @Public()
  @Get('tiers')
  @ApiOperation({ summary: 'Get all subscription tiers' })
  async getTiers() {
    return { message: 'Public: Get all tiers' };
  }

  // Protected endpoint - requires authentication
  @Get('my-subscription')
  @ApiOperation({ summary: 'Get current user subscription' })
  async getMySubscription(@CurrentUser() user: CurrentUserData) {
    return {
      message: 'Protected: Get my subscription',
      userId: user.userId,
      email: user.email,
    };
  }

  // Creator-only endpoint
  @Post('create-tier')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new subscription tier (Creator only)' })
  async createTier(
    @CurrentUser() user: CurrentUserData,
    @Body() body: any,
  ) {
    return {
      message: 'Creator only: Create tier',
      creatorId: user.userId,
      body,
    };
  }

  // Admin-only endpoint
  @Get('admin/all')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all subscriptions (Admin only)' })
  async getAllSubscriptions(@CurrentUser('userId') userId: string) {
    return {
      message: 'Admin only: Get all subscriptions',
      adminId: userId,
    };
  }
}
