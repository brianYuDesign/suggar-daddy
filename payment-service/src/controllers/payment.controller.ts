import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { PaymentService } from '../services/payment.service';
import { SubscriptionService } from '../services/subscription.service';
import { InvoiceService } from '../services/invoice.service';
import { CreatePaymentDto, RefundPaymentDto } from '../dtos/payment.dto';
import { CreateSubscriptionDto, UpdateSubscriptionDto, CancelSubscriptionDto } from '../dtos/subscription.dto';
import { CreateInvoiceDto, SendInvoiceDto } from '../dtos/invoice.dto';

@Controller('api/payments')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  /**
   * 創建支付意圖
   * POST /api/payments/intent
   */
  @Post('intent')
  async createPaymentIntent(@Body() dto: CreatePaymentDto) {
    return this.paymentService.createPaymentIntent(dto);
  }

  /**
   * 確認支付
   * POST /api/payments/confirm
   */
  @Post('confirm')
  async confirmPayment(@Body() body: { paymentId: string; stripeToken: string }) {
    return this.paymentService.confirmPayment(body.paymentId, body.stripeToken);
  }

  /**
   * 退款
   * POST /api/payments/refund
   */
  @Post('refund')
  async refundPayment(@Body() dto: RefundPaymentDto) {
    return this.paymentService.refundPayment(dto);
  }

  /**
   * 獲取支付詳情
   * GET /api/payments/:paymentId
   */
  @Get(':paymentId')
  async getPayment(@Param('paymentId') paymentId: string) {
    return this.paymentService.getPayment(paymentId);
  }

  /**
   * 獲取用戶的支付歷史
   * GET /api/payments/user/:userId
   */
  @Get('user/:userId')
  async getUserPayments(
    @Param('userId') userId: string,
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0,
  ) {
    return this.paymentService.getUserPayments(userId, limit, offset);
  }

  /**
   * 重試支付
   * POST /api/payments/:paymentId/retry
   */
  @Post(':paymentId/retry')
  async retryPayment(@Param('paymentId') paymentId: string) {
    return this.paymentService.retryPayment(paymentId);
  }
}

@Controller('api/subscriptions')
export class SubscriptionController {
  constructor(private subscriptionService: SubscriptionService) {}

  /**
   * 創建訂閱
   * POST /api/subscriptions
   */
  @Post()
  async createSubscription(@Body() dto: CreateSubscriptionDto) {
    return this.subscriptionService.createSubscription(dto);
  }

  /**
   * 更新訂閱（升級/降級）
   * PATCH /api/subscriptions/:subscriptionId
   */
  @Patch(':subscriptionId')
  async updateSubscription(
    @Param('subscriptionId') subscriptionId: string,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    return this.subscriptionService.updateSubscription(subscriptionId, dto);
  }

  /**
   * 取消訂閱
   * POST /api/subscriptions/:subscriptionId/cancel
   */
  @Post(':subscriptionId/cancel')
  async cancelSubscription(
    @Param('subscriptionId') subscriptionId: string,
    @Body() dto: CancelSubscriptionDto,
  ) {
    return this.subscriptionService.cancelSubscription(dto);
  }

  /**
   * 暫停訂閱
   * POST /api/subscriptions/:subscriptionId/pause
   */
  @Post(':subscriptionId/pause')
  async pauseSubscription(@Param('subscriptionId') subscriptionId: string) {
    return this.subscriptionService.pauseSubscription(subscriptionId);
  }

  /**
   * 恢復訂閱
   * POST /api/subscriptions/:subscriptionId/resume
   */
  @Post(':subscriptionId/resume')
  async resumeSubscription(@Param('subscriptionId') subscriptionId: string) {
    return this.subscriptionService.resumeSubscription(subscriptionId);
  }

  /**
   * 獲取訂閱詳情
   * GET /api/subscriptions/:subscriptionId
   */
  @Get(':subscriptionId')
  async getSubscription(@Param('subscriptionId') subscriptionId: string) {
    return this.subscriptionService.getSubscription(subscriptionId);
  }

  /**
   * 獲取用戶的訂閱
   * GET /api/subscriptions/user/:userId
   */
  @Get('user/:userId')
  async getUserSubscription(@Param('userId') userId: string) {
    return this.subscriptionService.getUserSubscription(userId);
  }

  /**
   * 列出所有訂閱（分頁）
   * GET /api/subscriptions?limit=20&offset=0
   */
  @Get()
  async getAllSubscriptions(
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0,
  ) {
    return this.subscriptionService.getAllSubscriptions(limit, offset);
  }
}

@Controller('api/invoices')
export class InvoiceController {
  constructor(private invoiceService: InvoiceService) {}

  /**
   * 創建發票
   * POST /api/invoices
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createInvoice(@Body() dto: CreateInvoiceDto) {
    return this.invoiceService.createInvoice(dto);
  }

  /**
   * 發送發票
   * POST /api/invoices/:invoiceId/send
   */
  @Post(':invoiceId/send')
  async sendInvoice(
    @Param('invoiceId') invoiceId: string,
    @Body() body: { email: string },
  ) {
    return this.invoiceService.sendInvoice({
      invoiceId,
      email: body.email,
    });
  }

  /**
   * 標記發票為已支付
   * PATCH /api/invoices/:invoiceId/mark-paid
   */
  @Patch(':invoiceId/mark-paid')
  async markAsPaid(@Param('invoiceId') invoiceId: string) {
    return this.invoiceService.markAsPaid(invoiceId);
  }

  /**
   * 取消發票
   * PATCH /api/invoices/:invoiceId/cancel
   */
  @Patch(':invoiceId/cancel')
  async cancelInvoice(@Param('invoiceId') invoiceId: string) {
    return this.invoiceService.cancelInvoice(invoiceId);
  }

  /**
   * 獲取發票詳情
   * GET /api/invoices/:invoiceId
   */
  @Get(':invoiceId')
  async getInvoice(@Param('invoiceId') invoiceId: string) {
    return this.invoiceService.getInvoice(invoiceId);
  }

  /**
   * 獲取用戶的發票列表
   * GET /api/invoices/user/:userId
   */
  @Get('user/:userId')
  async getUserInvoices(
    @Param('userId') userId: string,
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0,
  ) {
    return this.invoiceService.getUserInvoices(userId, limit, offset);
  }
}

@Controller('api/webhooks')
export class WebhookController {
  constructor(private webhookService: any) {}

  /**
   * Stripe webhook 端點
   * POST /api/webhooks/stripe
   */
  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Body() body: any,
    // 在實際應用中，使用 @Headers('stripe-signature')
  ) {
    // 由於 NestJS 的 @Body() 會自動解析，我們需要訪問原始請求
    // 這需要在中間件中進行特殊處理
    // 這是簡化版本
    return { received: true };
  }
}
