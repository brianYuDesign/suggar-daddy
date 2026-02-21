import { Test, TestingModule } from '@nestjs/testing';
import { DiamondPurchaseService } from './diamond-purchase.service';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { DiamondService } from './diamond.service';
import { DiamondPackageService } from './diamond-package.service';

describe('DiamondPurchaseService', () => {
  let service: DiamondPurchaseService;
  let redis: Record<string, jest.Mock>;
  let kafka: Record<string, jest.Mock>;
  let diamondService: Record<string, jest.Mock>;
  let packageService: Record<string, jest.Mock>;

  const mockPkg = {
    id: 'pkg-value',
    name: 'Value',
    diamondAmount: 500,
    bonusDiamonds: 50,
    priceUsd: 12.99,
    isActive: true,
    sortOrder: 2,
  };

  beforeEach(async () => {
    redis = {
      get: jest.fn(),
      set: jest.fn(),
      lPush: jest.fn(),
      lRange: jest.fn().mockResolvedValue([]),
      mget: jest.fn().mockResolvedValue([]),
    };
    kafka = {
      sendEvent: jest.fn().mockResolvedValue(undefined),
    };
    diamondService = {
      creditDiamonds: jest.fn().mockResolvedValue({ balance: 550 }),
    };
    packageService = {
      getPackageById: jest.fn().mockResolvedValue(mockPkg),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiamondPurchaseService,
        { provide: RedisService, useValue: redis },
        { provide: KafkaProducerService, useValue: kafka },
        { provide: DiamondService, useValue: diamondService },
        { provide: DiamondPackageService, useValue: packageService },
      ],
    }).compile();

    service = module.get(DiamondPurchaseService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('createCheckoutSession', () => {
    it('should create Stripe checkout session and record purchase', async () => {
      const mockStripe = {
        checkout: {
          sessions: {
            create: jest.fn().mockResolvedValue({
              id: 'cs_test_123',
              url: 'https://checkout.stripe.com/test',
            }),
          },
        },
      };

      const result = await service.createCheckoutSession(
        'user-1',
        'pkg-value',
        mockStripe as any,
        'https://app.com/success',
        'https://app.com/cancel',
      );

      expect(result.sessionId).toBe('cs_test_123');
      expect(result.sessionUrl).toBe('https://checkout.stripe.com/test');
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'payment',
          metadata: expect.objectContaining({
            type: 'diamond_purchase',
            userId: 'user-1',
            packageId: 'pkg-value',
            diamondAmount: '550', // 500 + 50 bonus
          }),
        }),
      );
      expect(redis.set).toHaveBeenCalledWith(
        expect.stringMatching(/^diamond:purchase:dp-/),
        expect.stringContaining('"status":"pending"'),
      );
      expect(redis.lPush).toHaveBeenCalledWith(
        'diamond:purchases:user:user-1',
        expect.stringMatching(/^dp-/),
      );
    });

    it('should throw when package is inactive', async () => {
      packageService.getPackageById.mockResolvedValue({
        ...mockPkg,
        isActive: false,
      });

      const mockStripe = { checkout: { sessions: { create: jest.fn() } } };

      await expect(
        service.createCheckoutSession('user-1', 'pkg-value', mockStripe as any, 'url', 'url'),
      ).rejects.toThrow('This package is no longer available');
    });
  });

  describe('handlePaymentSuccess', () => {
    it('should credit diamonds and update purchase record', async () => {
      const purchase = {
        id: 'dp-1',
        userId: 'user-1',
        packageId: 'pkg-value',
        diamondAmount: 500,
        bonusDiamonds: 50,
        totalDiamonds: 550,
        amountUsd: 12.99,
        stripeSessionId: 'cs_test_123',
        stripePaymentId: null,
        status: 'pending',
        createdAt: '2026-01-01T00:00:00Z',
      };
      redis.get.mockResolvedValue(JSON.stringify(purchase));

      await service.handlePaymentSuccess('pi_test_456', {
        purchaseId: 'dp-1',
        userId: 'user-1',
        diamondAmount: '550',
      });

      expect(diamondService.creditDiamonds).toHaveBeenCalledWith(
        'user-1', 550, 'purchase', 'dp-1', 'diamond_purchase', 'Purchased 550 diamonds',
      );
      // Should update purchase status to completed
      expect(redis.set).toHaveBeenCalledWith(
        'diamond:purchase:dp-1',
        expect.stringContaining('"status":"completed"'),
      );
      // Should create stripe reverse index
      expect(redis.set).toHaveBeenCalledWith(
        'diamond:purchase:stripe:pi_test_456',
        'dp-1',
      );
      expect(kafka.sendEvent).toHaveBeenCalledWith(
        'diamond.purchased',
        expect.objectContaining({ purchaseId: 'dp-1', userId: 'user-1' }),
      );
    });

    it('should skip already completed purchases (idempotent)', async () => {
      const purchase = {
        id: 'dp-1',
        status: 'completed',
        completedAt: '2026-01-01T01:00:00Z',
      };
      redis.get.mockResolvedValue(JSON.stringify(purchase));

      await service.handlePaymentSuccess('pi_test_456', {
        purchaseId: 'dp-1',
        userId: 'user-1',
        diamondAmount: '550',
      });

      expect(diamondService.creditDiamonds).not.toHaveBeenCalled();
    });

    it('should handle missing purchase record gracefully', async () => {
      redis.get.mockResolvedValue(null);

      await service.handlePaymentSuccess('pi_test_456', {
        purchaseId: 'dp-missing',
        userId: 'user-1',
        diamondAmount: '550',
      });

      expect(diamondService.creditDiamonds).not.toHaveBeenCalled();
    });

    it('should handle invalid metadata gracefully', async () => {
      await service.handlePaymentSuccess('pi_test', {});

      expect(diamondService.creditDiamonds).not.toHaveBeenCalled();
    });
  });

  describe('getUserPurchases', () => {
    it('should return sorted purchase list', async () => {
      redis.lRange.mockResolvedValue(['dp-1', 'dp-2']);
      redis.mget.mockResolvedValue([
        JSON.stringify({ id: 'dp-1', createdAt: '2026-01-01T00:00:00Z', status: 'completed' }),
        JSON.stringify({ id: 'dp-2', createdAt: '2026-01-02T00:00:00Z', status: 'completed' }),
      ]);

      const result = await service.getUserPurchases('user-1');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('dp-2'); // newer first
      expect(redis.lRange).toHaveBeenCalledWith('diamond:purchases:user:user-1', 0, -1);
    });

    it('should return empty for user with no purchases', async () => {
      redis.lRange.mockResolvedValue([]);

      const result = await service.getUserPurchases('user-new');
      expect(result).toHaveLength(0);
    });
  });
});
