import { Controller, Post, Get, Body, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, CurrentUser, type CurrentUserData } from '@suggar-daddy/auth';
import { InjectLogger } from '@suggar-daddy/common';
import { ConfigService } from '@nestjs/config';
import { DiamondPurchaseService } from './diamond-purchase.service';
import { PurchaseDiamondsDto } from './dto/diamond.dto';
import Stripe from 'stripe';

@ApiTags('Diamond Purchases')
@ApiBearerAuth('JWT-auth')
@Controller('diamonds')
export class DiamondPurchaseController {
  @InjectLogger() private readonly logger!: Logger;
  private readonly stripe: Stripe;

  constructor(
    private readonly purchaseService: DiamondPurchaseService,
    private readonly config: ConfigService,
  ) {
    this.stripe = new Stripe(this.config.get<string>('STRIPE_SECRET_KEY', ''), {
      apiVersion: '2024-04-10' as Stripe.LatestApiVersion,
    });
  }

  private isStripeConfigured(): boolean {
    const key = this.config.get<string>('STRIPE_SECRET_KEY', '');
    return key.startsWith('sk_') && !key.includes('your_stripe') && !key.includes('placeholder') && key.length > 20;
  }

  @Post('purchase')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Purchase diamonds via Stripe checkout' })
  @ApiResponse({ status: 201, description: 'Stripe checkout session created' })
  @ApiResponse({ status: 400, description: 'Invalid package or package inactive' })
  async purchase(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: PurchaseDiamondsDto,
  ) {
    this.logger.log(`Diamond purchase request userId=${user.userId} packageId=${dto.packageId}`);

    if (!this.isStripeConfigured()) {
      return this.purchaseService.mockPurchase(user.userId, dto.packageId);
    }

    const baseUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:4200');
    return this.purchaseService.createCheckoutSession(
      user.userId,
      dto.packageId,
      this.stripe,
      `${baseUrl}/diamonds?success=true`,
      `${baseUrl}/diamonds?cancelled=true`,
    );
  }

  @Get('purchases')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get diamond purchase history' })
  @ApiResponse({ status: 200, description: 'Purchase history retrieved' })
  async getPurchases(@CurrentUser() user: CurrentUserData) {
    return this.purchaseService.getUserPurchases(user.userId);
  }
}
