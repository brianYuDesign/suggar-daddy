import { Test, TestingModule } from '@nestjs/testing';
import { StripeWebhookController } from './stripe-webhook.controller';
import { TransactionService } from './transaction.service';
import { WalletService } from './wallet.service';
import { BadRequestException } from '@nestjs/common';

describe('StripeWebhookController', () => {
  let controller: StripeWebhookController;
  let transactionService: jest.Mocked<TransactionService>;
  let walletService: jest.Mocked<WalletService>;

  const mockTransactionService = {
    create: jest.fn(),
    findByStripePaymentId: jest.fn(),
    updateStatus: jest.fn(),
  };

  const mockWalletService = {
    creditWallet: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StripeWebhookController],
      providers: [
        {
          provide: TransactionService,
          useValue: mockTransactionService,
        },
        {
          provide: WalletService,
          useValue: mockWalletService,
        },
      ],
    }).compile();

    controller = module.get<StripeWebhookController>(StripeWebhookController);
    transactionService = module.get(TransactionService);
    walletService = module.get(WalletService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleWebhook', () => {
    it('should handle payment_intent.succeeded event', async () => {
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_123456',
            amount: 5000,
            currency: 'usd',
            metadata: {
              userId: 'user-123',
              type: 'subscription',
              relatedEntityId: 'sub-456',
            },
          },
        },
      };

      const mockTransaction = {
        id: 'tx-123',
        userId: 'user-123',
        amount: 5000,
        status: 'pending',
        stripePaymentId: 'pi_123456',
        type: 'subscription',
        relatedEntityId: 'sub-456',
        relatedEntityType: 'subscription',
        metadata: null,
        createdAt: new Date().toISOString(),
      };

      mockTransactionService.findByStripePaymentId.mockResolvedValue(
        mockTransaction
      );
      mockTransactionService.updateStatus.mockResolvedValue({
        ...mockTransaction,
        status: 'succeeded',
      });

      const result = await controller.handleWebhook(mockEvent);

      expect(result).toEqual({ received: true });
      expect(transactionService.updateStatus).toHaveBeenCalledWith(
        'tx-123',
        'succeeded'
      );
    });

    it('should handle payment_intent.payment_failed event', async () => {
      const mockEvent = {
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_failed',
            amount: 1000,
            metadata: {
              userId: 'user-123',
              type: 'tip',
            },
          },
        },
      };

      const mockTransaction = {
        id: 'tx-failed',
        userId: 'user-123',
        amount: 1000,
        status: 'pending',
        stripePaymentId: 'pi_failed',
        type: 'tip',
        relatedEntityId: null,
        relatedEntityType: null,
        metadata: null,
        createdAt: new Date().toISOString(),
      };

      mockTransactionService.findByStripePaymentId.mockResolvedValue(
        mockTransaction
      );
      mockTransactionService.updateStatus.mockResolvedValue({
        ...mockTransaction,
        status: 'failed',
      });

      const result = await controller.handleWebhook(mockEvent);

      expect(result).toEqual({ received: true });
      expect(transactionService.updateStatus).toHaveBeenCalledWith(
        'tx-failed',
        'failed'
      );
    });

    it('should handle checkout.session.completed event for subscription', async () => {
      const mockEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_123',
            payment_intent: 'pi_123456',
            amount_total: 2999,
            metadata: {
              userId: 'user-123',
              creatorId: 'creator-456',
              tierId: 'tier-gold',
              type: 'subscription',
            },
          },
        },
      };

      mockTransactionService.create.mockResolvedValue({
        id: 'tx-new',
        userId: 'user-123',
        amount: 2999,
        status: 'pending',
        stripePaymentId: 'pi_123456',
        type: 'subscription',
        relatedEntityId: 'tier-gold',
        relatedEntityType: 'subscription',
        metadata: { creatorId: 'creator-456' },
        createdAt: new Date().toISOString(),
      });

      const result = await controller.handleWebhook(mockEvent);

      expect(result).toEqual({ received: true });
      expect(transactionService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          amount: 2999,
          type: 'subscription',
          stripePaymentId: 'pi_123456',
        })
      );
    });

    it('should handle checkout.session.completed event for tip', async () => {
      const mockEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_tip',
            payment_intent: 'pi_tip_123',
            amount_total: 500,
            metadata: {
              userId: 'user-123',
              creatorId: 'creator-789',
              type: 'tip',
            },
          },
        },
      };

      mockTransactionService.create.mockResolvedValue({
        id: 'tx-tip',
        userId: 'user-123',
        amount: 500,
        status: 'pending',
        stripePaymentId: 'pi_tip_123',
        type: 'tip',
        relatedEntityId: null,
        relatedEntityType: null,
        metadata: { creatorId: 'creator-789' },
        createdAt: new Date().toISOString(),
      });

      const result = await controller.handleWebhook(mockEvent);

      expect(result).toEqual({ received: true });
      expect(transactionService.create).toHaveBeenCalled();
    });

    it('should handle charge.refunded event', async () => {
      const mockEvent = {
        type: 'charge.refunded',
        data: {
          object: {
            id: 'ch_refund',
            payment_intent: 'pi_refund',
            amount: 1000,
            amount_refunded: 1000,
          },
        },
      };

      const mockTransaction = {
        id: 'tx-refund',
        userId: 'user-123',
        amount: 1000,
        status: 'succeeded',
        stripePaymentId: 'pi_refund',
        type: 'subscription',
        relatedEntityId: null,
        relatedEntityType: null,
        metadata: null,
        createdAt: new Date().toISOString(),
      };

      mockTransactionService.findByStripePaymentId.mockResolvedValue(
        mockTransaction
      );
      mockTransactionService.updateStatus.mockResolvedValue({
        ...mockTransaction,
        status: 'refunded',
      });

      const result = await controller.handleWebhook(mockEvent);

      expect(result).toEqual({ received: true });
      expect(transactionService.updateStatus).toHaveBeenCalledWith(
        'tx-refund',
        'refunded'
      );
    });

    it('should handle customer.subscription.created event', async () => {
      const mockEvent = {
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_stripe_123',
            customer: 'cus_123',
            status: 'active',
            metadata: {
              userId: 'user-123',
              creatorId: 'creator-456',
              tierId: 'tier-premium',
            },
          },
        },
      };

      const result = await controller.handleWebhook(mockEvent);

      expect(result).toEqual({ received: true });
    });

    it('should handle customer.subscription.updated event', async () => {
      const mockEvent = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_stripe_123',
            customer: 'cus_123',
            status: 'active',
            cancel_at_period_end: false,
          },
        },
      };

      const result = await controller.handleWebhook(mockEvent);

      expect(result).toEqual({ received: true });
    });

    it('should handle customer.subscription.deleted event', async () => {
      const mockEvent = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_stripe_123',
            customer: 'cus_123',
            status: 'canceled',
          },
        },
      };

      const result = await controller.handleWebhook(mockEvent);

      expect(result).toEqual({ received: true });
    });

    it('should handle invoice.payment_succeeded event', async () => {
      const mockEvent = {
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'in_123',
            subscription: 'sub_stripe_123',
            amount_paid: 2999,
            metadata: {
              userId: 'user-123',
            },
          },
        },
      };

      const result = await controller.handleWebhook(mockEvent);

      expect(result).toEqual({ received: true });
    });

    it('should return received for unhandled event types', async () => {
      const mockEvent = {
        type: 'unknown.event.type',
        data: {
          object: {},
        },
      };

      const result = await controller.handleWebhook(mockEvent);

      expect(result).toEqual({ received: true });
      expect(transactionService.create).not.toHaveBeenCalled();
      expect(transactionService.updateStatus).not.toHaveBeenCalled();
    });

    it('should handle missing metadata gracefully', async () => {
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_no_metadata',
            amount: 1000,
            metadata: {},
          },
        },
      };

      const result = await controller.handleWebhook(mockEvent);

      expect(result).toEqual({ received: true });
    });

    it('should handle errors and log them', async () => {
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_error',
            amount: 1000,
            metadata: { userId: 'user-123' },
          },
        },
      };

      mockTransactionService.findByStripePaymentId.mockRejectedValue(
        new Error('Database error')
      );

      // Should not throw, but log the error
      const result = await controller.handleWebhook(mockEvent);

      expect(result).toEqual({ received: true });
    });
  });

  describe('verifyWebhook', () => {
    it('should verify webhook signature successfully', () => {
      const rawBody = 'webhook-payload';
      const signature = 'valid-signature';

      // This would use Stripe's actual verification in production
      const result = controller.verifyWebhook(rawBody, signature);

      expect(result).toBeDefined();
    });

    it('should throw BadRequestException for invalid signature', () => {
      const rawBody = 'webhook-payload';
      const invalidSignature = 'invalid-signature';

      expect(() => {
        controller.verifyWebhook(rawBody, invalidSignature);
      }).toThrow(BadRequestException);
    });
  });
});
