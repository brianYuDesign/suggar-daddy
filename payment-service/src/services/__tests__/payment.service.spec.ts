import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PaymentService } from '../services/payment.service';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import { ConfigService } from '../services/config.service';

describe('PaymentService', () => {
  let service: PaymentService;
  let mockPaymentRepository: any;
  let mockConfigService: any;

  beforeEach(async () => {
    mockPaymentRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOneBy: jest.fn(),
      findAndCount: jest.fn(),
    };

    mockConfigService = {
      getStripeApiKey: jest.fn().mockReturnValue('sk_test_xxxxx'),
      getStripeWebhookSecret: jest.fn().mockReturnValue('whsec_xxxxx'),
      getStripeApiVersion: jest.fn().mockReturnValue('2024-04-10'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: getRepositoryToken(Payment),
          useValue: mockPaymentRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPaymentIntent', () => {
    it('should create a payment intent successfully', async () => {
      const dto = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        amount: 9.99,
        currency: 'USD',
        description: 'Test payment',
      };

      const mockPayment = { id: 'payment-123', ...dto };
      mockPaymentRepository.create.mockReturnValue(mockPayment);
      mockPaymentRepository.save.mockResolvedValue(mockPayment);

      // Mock Stripe
      jest.spyOn(service['stripe'].paymentIntents, 'create').mockResolvedValue({
        id: 'pi_123',
        client_secret: 'pi_123_secret',
      } as any);

      const result = await service.createPaymentIntent(dto);

      expect(result.paymentId).toBeDefined();
      expect(result.clientSecret).toBeDefined();
      expect(mockPaymentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: dto.userId,
          amount: dto.amount,
          currency: dto.currency,
        }),
      );
    });
  });

  describe('getPayment', () => {
    it('should retrieve a payment by ID', async () => {
      const paymentId = 'payment-123';
      const mockPayment = {
        id: paymentId,
        userId: 'user-123',
        amount: 9.99,
        status: PaymentStatus.SUCCEEDED,
      };

      mockPaymentRepository.findOneBy.mockResolvedValue(mockPayment);

      const result = await service.getPayment(paymentId);

      expect(result).toEqual(mockPayment);
      expect(mockPaymentRepository.findOneBy).toHaveBeenCalledWith({ id: paymentId });
    });

    it('should throw NotFoundException if payment not found', async () => {
      mockPaymentRepository.findOneBy.mockResolvedValue(null);

      await expect(service.getPayment('invalid-id')).rejects.toThrow('Payment not found');
    });
  });

  describe('getUserPayments', () => {
    it('should retrieve user payments with pagination', async () => {
      const userId = 'user-123';
      const mockPayments = [
        { id: 'pay-1', userId, amount: 9.99, status: PaymentStatus.SUCCEEDED },
        { id: 'pay-2', userId, amount: 4.99, status: PaymentStatus.SUCCEEDED },
      ];

      mockPaymentRepository.findAndCount.mockResolvedValue([mockPayments, 2]);

      const result = await service.getUserPayments(userId, 20, 0);

      expect(result.payments).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockPaymentRepository.findAndCount).toHaveBeenCalled();
    });
  });

  describe('retryPayment', () => {
    it('should retry a failed payment', async () => {
      const paymentId = 'payment-123';
      const mockPayment = {
        id: paymentId,
        status: PaymentStatus.FAILED,
        retryCount: 0,
      };

      mockPaymentRepository.findOneBy.mockResolvedValue(mockPayment);
      mockPaymentRepository.save.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.PENDING,
        retryCount: 1,
      });

      const result = await service.retryPayment(paymentId);

      expect(result.retryCount).toBe(1);
      expect(result.status).toBe(PaymentStatus.PENDING);
    });

    it('should throw error if payment is not failed', async () => {
      const paymentId = 'payment-123';
      const mockPayment = {
        id: paymentId,
        status: PaymentStatus.SUCCEEDED,
      };

      mockPaymentRepository.findOneBy.mockResolvedValue(mockPayment);

      await expect(service.retryPayment(paymentId)).rejects.toThrow(
        'Only failed payments can be retried',
      );
    });

    it('should throw error if max retries exceeded', async () => {
      const paymentId = 'payment-123';
      const mockPayment = {
        id: paymentId,
        status: PaymentStatus.FAILED,
        retryCount: 3,
      };

      mockPaymentRepository.findOneBy.mockResolvedValue(mockPayment);

      await expect(service.retryPayment(paymentId)).rejects.toThrow(
        'Maximum retry attempts exceeded',
      );
    });
  });
});
