import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { DIAMOND_EVENTS, InjectLogger } from '@suggar-daddy/common';
import { DiamondService } from './diamond.service';
import { DiamondPackageService } from './diamond-package.service';
import Stripe from 'stripe';

const PURCHASE_KEY = (id: string) => `diamond:purchase:${id}`;
const PURCHASES_USER = (userId: string) => `diamond:purchases:user:${userId}`;
const PURCHASE_STRIPE_INDEX = (stripePaymentId: string) => `diamond:purchase:stripe:${stripePaymentId}`;

export interface DiamondPurchaseRecord {
  id: string;
  userId: string;
  packageId: string;
  diamondAmount: number;
  bonusDiamonds: number;
  totalDiamonds: number;
  amountUsd: number;
  stripeSessionId: string | null;
  stripePaymentId: string | null;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
}

@Injectable()
export class DiamondPurchaseService {
  @InjectLogger() private readonly logger!: Logger;

  constructor(
    private readonly redis: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
    private readonly diamondService: DiamondService,
    private readonly packageService: DiamondPackageService,
  ) {}

  private genId(): string {
    return `dp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  /**
   * Create a Stripe checkout session for purchasing diamonds
   */
  async createCheckoutSession(
    userId: string,
    packageId: string,
    stripe: Stripe,
    successUrl: string,
    cancelUrl: string,
  ): Promise<{ sessionId: string; sessionUrl: string }> {
    const pkg = await this.packageService.getPackageById(packageId);

    if (!pkg.isActive) {
      throw new BadRequestException('This package is no longer available');
    }

    const purchaseId = this.genId();
    const totalDiamonds = pkg.diamondAmount + pkg.bonusDiamonds;

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${pkg.name} - ${totalDiamonds} Diamonds`,
            description: pkg.bonusDiamonds > 0
              ? `${pkg.diamondAmount} diamonds + ${pkg.bonusDiamonds} bonus`
              : `${pkg.diamondAmount} diamonds`,
          },
          unit_amount: Math.round(pkg.priceUsd * 100), // cents
        },
        quantity: 1,
      }],
      metadata: {
        type: 'diamond_purchase',
        purchaseId,
        userId,
        packageId,
        diamondAmount: String(totalDiamonds),
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    // Record purchase in Redis
    const purchase: DiamondPurchaseRecord = {
      id: purchaseId,
      userId,
      packageId,
      diamondAmount: pkg.diamondAmount,
      bonusDiamonds: pkg.bonusDiamonds,
      totalDiamonds,
      amountUsd: pkg.priceUsd,
      stripeSessionId: session.id,
      stripePaymentId: null,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    await this.redis.set(PURCHASE_KEY(purchaseId), JSON.stringify(purchase));
    await this.redis.lPush(PURCHASES_USER(userId), purchaseId);

    this.logger.log(`Diamond checkout created userId=${userId} packageId=${packageId} purchaseId=${purchaseId}`);

    return { sessionId: session.id, sessionUrl: session.url! };
  }

  /**
   * Handle successful Stripe payment → credit diamonds
   */
  async handlePaymentSuccess(
    stripePaymentId: string,
    metadata: Record<string, string>,
  ): Promise<void> {
    const purchaseId = metadata.purchaseId;
    const userId = metadata.userId;
    const diamondAmount = parseInt(metadata.diamondAmount, 10);

    if (!purchaseId || !userId || !diamondAmount) {
      this.logger.error('Invalid diamond purchase metadata', metadata);
      return;
    }

    // Update purchase record
    const raw = await this.redis.get(PURCHASE_KEY(purchaseId));
    if (!raw) {
      this.logger.error(`Diamond purchase record not found: ${purchaseId}`);
      return;
    }

    const purchase: DiamondPurchaseRecord = JSON.parse(raw);
    if (purchase.status === 'completed') {
      this.logger.warn(`Diamond purchase already completed: ${purchaseId}`);
      return;
    }

    purchase.status = 'completed';
    purchase.stripePaymentId = stripePaymentId;
    purchase.completedAt = new Date().toISOString();
    await this.redis.set(PURCHASE_KEY(purchaseId), JSON.stringify(purchase));
    await this.redis.set(PURCHASE_STRIPE_INDEX(stripePaymentId), purchaseId);

    // Credit diamonds to user
    await this.diamondService.creditDiamonds(
      userId,
      diamondAmount,
      'purchase',
      purchaseId,
      'diamond_purchase',
      `Purchased ${diamondAmount} diamonds`,
    );

    this.kafkaProducer.sendEvent(DIAMOND_EVENTS.DIAMOND_PURCHASED, {
      purchaseId,
      userId,
      diamondAmount,
      amountUsd: purchase.amountUsd,
      stripePaymentId,
      purchasedAt: purchase.completedAt,
    }).catch(err => this.logger.error('Failed to send DIAMOND_PURCHASED event', err));

    this.logger.log(`Diamonds credited userId=${userId} amount=${diamondAmount} purchaseId=${purchaseId}`);
  }

  /**
   * Local dev bypass: skip Stripe, directly credit diamonds
   */
  async mockPurchase(
    userId: string,
    packageId: string,
  ): Promise<{ sessionId: string; sessionUrl: string }> {
    const pkg = await this.packageService.getPackageById(packageId);
    const purchaseId = this.genId();
    const totalDiamonds = pkg.diamondAmount + pkg.bonusDiamonds;

    const purchase: DiamondPurchaseRecord = {
      id: purchaseId,
      userId,
      packageId,
      diamondAmount: pkg.diamondAmount,
      bonusDiamonds: pkg.bonusDiamonds,
      totalDiamonds,
      amountUsd: pkg.priceUsd,
      stripeSessionId: null,
      stripePaymentId: `mock_${purchaseId}`,
      status: 'completed',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
    await this.redis.set(PURCHASE_KEY(purchaseId), JSON.stringify(purchase));
    await this.redis.lPush(PURCHASES_USER(userId), purchaseId);

    await this.diamondService.creditDiamonds(
      userId,
      totalDiamonds,
      'purchase',
      purchaseId,
      'diamond_purchase',
      `[DEV] Purchased ${totalDiamonds} diamonds`,
    );

    this.logger.warn(`[DEV] Mock diamond purchase userId=${userId} packageId=${packageId} diamonds=${totalDiamonds}`);
    return { sessionId: `mock_${purchaseId}`, sessionUrl: '' };
  }

  async getUserPurchases(userId: string): Promise<DiamondPurchaseRecord[]> {
    const ids = await this.redis.lRange(PURCHASES_USER(userId), 0, -1);
    if (ids.length === 0) return [];
    const keys = ids.map(id => PURCHASE_KEY(id));
    const values = await this.redis.mget(...keys);
    return values
      .filter(Boolean)
      .map(raw => JSON.parse(raw!) as DiamondPurchaseRecord)
      .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  }
}
