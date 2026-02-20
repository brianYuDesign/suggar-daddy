import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SubscriptionService } from '../services/subscription.service';
import { CreateSubscriptionDto, UpdateSubscriptionDto } from '../dtos/subscription.dto';

@Controller('api/subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('plans')
  async getPlans() {
    const plans = await this.subscriptionService.getAllPlans();
    return {
      success: true,
      data: plans,
    };
  }

  @Get('plans/:planId')
  async getPlan(@Param('planId') planId: string) {
    const plan = await this.subscriptionService.getPlan(planId);
    return {
      success: true,
      data: plan,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createSubscription(@Body() dto: CreateSubscriptionDto) {
    const subscription = await this.subscriptionService.createSubscription(dto);
    return {
      success: true,
      data: subscription,
    };
  }

  @Get(':subscriptionId')
  async getSubscription(@Param('subscriptionId') subscriptionId: string) {
    const subscription = await this.subscriptionService.getSubscription(subscriptionId);
    return {
      success: true,
      data: subscription,
    };
  }

  @Get('user/:userId')
  async getUserSubscription(@Param('userId') userId: string) {
    const subscription = await this.subscriptionService.getUserSubscription(userId);
    return {
      success: true,
      data: subscription,
    };
  }

  @Patch(':subscriptionId')
  async updateSubscription(
    @Param('subscriptionId') subscriptionId: string,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    const subscription = await this.subscriptionService.updateSubscription(
      subscriptionId,
      dto,
    );
    return {
      success: true,
      data: subscription,
    };
  }

  @Post(':subscriptionId/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelSubscription(@Param('subscriptionId') subscriptionId: string) {
    const subscription = await this.subscriptionService.cancelSubscription(subscriptionId);
    return {
      success: true,
      data: subscription,
      message: 'Subscription cancelled successfully',
    };
  }

  @Post(':subscriptionId/pause')
  @HttpCode(HttpStatus.OK)
  async pauseSubscription(@Param('subscriptionId') subscriptionId: string) {
    const subscription = await this.subscriptionService.pauseSubscription(subscriptionId);
    return {
      success: true,
      data: subscription,
      message: 'Subscription paused successfully',
    };
  }

  @Post(':subscriptionId/resume')
  @HttpCode(HttpStatus.OK)
  async resumeSubscription(@Param('subscriptionId') subscriptionId: string) {
    const subscription = await this.subscriptionService.resumeSubscription(subscriptionId);
    return {
      success: true,
      data: subscription,
      message: 'Subscription resumed successfully',
    };
  }

  @Get(':subscriptionId/billing-history')
  async getBillingHistory(@Param('subscriptionId') subscriptionId: string) {
    const history = await this.subscriptionService.getBillingHistory(subscriptionId);
    return {
      success: true,
      data: history,
    };
  }
}
