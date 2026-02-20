import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as Stripe from 'stripe';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import { CreatePaymentDto, RefundPaymentDto } from '../dtos/payment.dto';
import { ConfigService } from './config.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private stripe: Stripe.Stripe;

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    private configService: ConfigService,
  ) {
    this.stripe = new Stripe.Stripe(this.configService.getStripeApiKey(), {
      apiVersion: this.configService.getStripeApiVersion() as any,
    });
  }

  /**
   * 創建支付意圖 - 用於前端收集支付信息
   */
  async createPaymentIntent(dto: CreatePaymentDto) {
    this.logger.log(`Creating payment intent for user ${dto.userId}`);

    try {
      // 先在數據庫創建支付記錄
      const payment = this.paymentRepository.create({
        userId: dto.userId,
        amount: dto.amount,
        currency: dto.currency,
        contentId: dto.contentId,
        description: dto.description,
        paymentMethod: dto.paymentMethod,
        metadata: dto.metadata,
      });

      const savedPayment = await this.paymentRepository.save(payment);

      // 創建 Stripe PaymentIntent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(dto.amount * 100), // 轉換為分
        currency: dto.currency.toLowerCase(),
        description: dto.description || 'Payment for Sugar-Daddy content',
        metadata: {
          paymentId: savedPayment.id,
          userId: dto.userId,
          ...dto.metadata,
        },
      });

      // 更新支付記錄的 Stripe ID
      savedPayment.stripePaymentId = paymentIntent.id;
      await this.paymentRepository.save(savedPayment);

      return {
        paymentId: savedPayment.id,
        clientSecret: paymentIntent.client_secret,
        amount: dto.amount,
        currency: dto.currency,
      };
    } catch (error) {
      this.logger.error(`Payment intent creation failed: ${error.message}`);
      throw new BadRequestException('Failed to create payment intent');
    }
  }

  /**
   * 確認支付
   */
  async confirmPayment(paymentId: string, stripeToken: string) {
    this.logger.log(`Confirming payment ${paymentId}`);

    try {
      const payment = await this.paymentRepository.findOneBy({ id: paymentId });
      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      if (!payment.stripePaymentId) {
        throw new BadRequestException('Payment has no stripe intent');
      }

      // 確認支付意圖
      const paymentIntent = await this.stripe.paymentIntents.confirm(
        payment.stripePaymentId,
        {
          payment_method: stripeToken,
        },
      );

      if (paymentIntent.status === 'succeeded') {
        payment.status = PaymentStatus.SUCCEEDED;
        payment.stripeChargeId = paymentIntent.charges.data[0]?.id;
        payment.processedAt = new Date();
      } else if (paymentIntent.status === 'processing') {
        payment.status = PaymentStatus.PROCESSING;
      } else if (paymentIntent.status === 'requires_action') {
        // 需要進一步驗證
        return {
          status: 'requires_action',
          clientSecret: paymentIntent.client_secret,
        };
      } else {
        payment.status = PaymentStatus.FAILED;
        payment.failureReason = paymentIntent.last_payment_error?.message;
      }

      await this.paymentRepository.save(payment);

      return {
        paymentId: payment.id,
        status: payment.status,
        amount: payment.amount,
        processedAt: payment.processedAt,
      };
    } catch (error) {
      this.logger.error(`Payment confirmation failed: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * 退款
   */
  async refundPayment(dto: RefundPaymentDto) {
    this.logger.log(`Refunding payment ${dto.paymentId}`);

    try {
      const payment = await this.paymentRepository.findOneBy({ id: dto.paymentId });
      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      if (payment.status !== PaymentStatus.SUCCEEDED) {
        throw new BadRequestException('Only succeeded payments can be refunded');
      }

      if (!payment.stripeChargeId) {
        throw new BadRequestException('No charge to refund');
      }

      // 在 Stripe 中創建退款
      const refund = await this.stripe.refunds.create({
        charge: payment.stripeChargeId,
        reason: (dto.reason || 'requested_by_customer') as any,
      });

      if (refund.status === 'succeeded') {
        payment.status = PaymentStatus.REFUNDED;
        payment.refundedAt = new Date();
        await this.paymentRepository.save(payment);
      }

      return {
        paymentId: payment.id,
        refundId: refund.id,
        status: refund.status,
        amount: refund.amount / 100,
      };
    } catch (error) {
      this.logger.error(`Refund failed: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * 獲取支付詳情
   */
  async getPayment(paymentId: string) {
    const payment = await this.paymentRepository.findOneBy({ id: paymentId });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }

  /**
   * 獲取用戶的支付歷史
   */
  async getUserPayments(userId: string, limit: number = 20, offset: number = 0) {
    const [payments, total] = await this.paymentRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return {
      payments,
      total,
      limit,
      offset,
    };
  }

  /**
   * 重試失敗的支付
   */
  async retryPayment(paymentId: string) {
    this.logger.log(`Retrying payment ${paymentId}`);

    const payment = await this.paymentRepository.findOneBy({ id: paymentId });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== PaymentStatus.FAILED) {
      throw new BadRequestException('Only failed payments can be retried');
    }

    payment.retryCount += 1;
    if (payment.retryCount > 3) {
      throw new BadRequestException('Maximum retry attempts exceeded');
    }

    payment.status = PaymentStatus.PENDING;
    await this.paymentRepository.save(payment);

    return {
      paymentId: payment.id,
      retryCount: payment.retryCount,
      status: payment.status,
    };
  }
}
