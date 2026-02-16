import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { StripePaymentService } from './stripe-payment.service';
import { StripeService } from '@suggar-daddy/common';
import { TransactionService } from '../transaction.service';

describe('StripePaymentService', () => {
  let service: StripePaymentService;
  let stripeService: Record<string, jest.Mock>;
  let transactionService: Record<string, jest.Mock>;

  beforeEach(async () => {
    stripeService = {
      createPaymentIntent: jest.fn().mockResolvedValue({
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret',
      }),
    };
    transactionService = {
      create: jest.fn().mockResolvedValue({
        id: 'tx-1',
        userId: 'user-1',
        amount: 100,
        status: 'pending',
      }),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripePaymentService,
        { provide: StripeService, useValue: stripeService },
        { provide: TransactionService, useValue: transactionService },
      ],
    }).compile();

    service = module.get(StripePaymentService);
    jest.clearAllMocks();
  });

  describe('purchasePost', () => {
    it('應建立 PaymentIntent 和 Transaction', async () => {
      const result = await service.purchasePost('user-1', 'post-1', 500, 'cus_123');

      expect(stripeService.createPaymentIntent).toHaveBeenCalledWith(
        500,
        'usd',
        'cus_123',
        { userId: 'user-1', postId: 'post-1', type: 'post_purchase' },
      );
      expect(transactionService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          type: 'ppv',
          amount: 500,
          stripePaymentId: 'pi_test_123',
          relatedEntityId: 'post-1',
          relatedEntityType: 'post',
        }),
      );
      expect(result.clientSecret).toBe('pi_test_123_secret');
      expect(result.transaction.id).toBe('tx-1');
    });
  });

  describe('tipCreator', () => {
    it('應建立打賞 PaymentIntent 和 Transaction', async () => {
      const result = await service.tipCreator('user-1', 'creator-1', 1000, 'cus_123', 'Great content!');

      expect(stripeService.createPaymentIntent).toHaveBeenCalledWith(
        1000,
        'usd',
        'cus_123',
        { userId: 'user-1', creatorId: 'creator-1', type: 'tip' },
      );
      expect(transactionService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          type: 'tip',
          amount: 1000,
          relatedEntityId: 'creator-1',
          relatedEntityType: 'creator',
        }),
      );
      expect(result.clientSecret).toBe('pi_test_123_secret');
    });
  });

  describe('getTransaction', () => {
    it('應回傳使用者的交易', async () => {
      const tx = { id: 'tx-1', userId: 'user-1', amount: 100 };
      transactionService.findOne.mockResolvedValue(tx);

      const result = await service.getTransaction('tx-1', 'user-1');

      expect(result).toEqual(tx);
    });

    it('應拋出 NotFoundException 當交易不屬於該使用者時', async () => {
      transactionService.findOne.mockResolvedValue({ id: 'tx-1', userId: 'other-user' });

      await expect(service.getTransaction('tx-1', 'user-1'))
        .rejects.toThrow(NotFoundException);
    });

    it('應傳遞 TransactionService 的 NotFoundException', async () => {
      transactionService.findOne.mockRejectedValue(new NotFoundException());

      await expect(service.getTransaction('tx-missing', 'user-1'))
        .rejects.toThrow(NotFoundException);
    });
  });
});
