import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SubscriptionService } from '../services/subscription.service';
import { Subscription, SubscriptionStatus, BillingCycle } from '../entities/subscription.entity';
import { ConfigService } from '../services/config.service';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let mockSubscriptionRepository: any;
  let mockConfigService: any;

  beforeEach(async () => {
    mockSubscriptionRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOneBy: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
    };

    mockConfigService = {
      getStripeApiKey: jest.fn().mockReturnValue('sk_test_xxxxx'),
      getStripeWebhookSecret: jest.fn().mockReturnValue('whsec_xxxxx'),
      getStripeApiVersion: jest.fn().mockReturnValue('2024-04-10'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        {
          provide: getRepositoryToken(Subscription),
          useValue: mockSubscriptionRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserSubscription', () => {
    it('should retrieve user subscription', async () => {
      const userId = 'user-123';
      const mockSubscription = {
        id: 'sub-123',
        userId,
        planId: 'premium',
        status: SubscriptionStatus.ACTIVE,
      };

      mockSubscriptionRepository.findOne.mockResolvedValue(mockSubscription);

      const result = await service.getUserSubscription(userId);

      expect(result).toEqual(mockSubscription);
      expect(mockSubscriptionRepository.findOne).toHaveBeenCalled();
    });

    it('should return null if no subscription found', async () => {
      mockSubscriptionRepository.findOne.mockResolvedValue(null);

      const result = await service.getUserSubscription('user-123');

      expect(result).toBeNull();
    });
  });

  describe('pauseSubscription', () => {
    it('should pause an active subscription', async () => {
      const subscriptionId = 'sub-123';
      const mockSubscription = {
        id: subscriptionId,
        status: SubscriptionStatus.ACTIVE,
        autoRenew: true,
      };

      mockSubscriptionRepository.findOneBy.mockResolvedValue(mockSubscription);
      mockSubscriptionRepository.save.mockResolvedValue({
        ...mockSubscription,
        status: SubscriptionStatus.PAUSED,
        autoRenew: false,
      });

      const result = await service.pauseSubscription(subscriptionId);

      expect(result.status).toBe(SubscriptionStatus.PAUSED);
      expect(result.autoRenew).toBe(false);
    });
  });

  describe('resumeSubscription', () => {
    it('should resume a paused subscription', async () => {
      const subscriptionId = 'sub-123';
      const mockSubscription = {
        id: subscriptionId,
        status: SubscriptionStatus.PAUSED,
        autoRenew: false,
      };

      mockSubscriptionRepository.findOneBy.mockResolvedValue(mockSubscription);
      mockSubscriptionRepository.save.mockResolvedValue({
        ...mockSubscription,
        status: SubscriptionStatus.ACTIVE,
        autoRenew: true,
      });

      const result = await service.resumeSubscription(subscriptionId);

      expect(result.status).toBe(SubscriptionStatus.ACTIVE);
      expect(result.autoRenew).toBe(true);
    });
  });

  describe('getSubscription', () => {
    it('should retrieve a subscription by ID', async () => {
      const subscriptionId = 'sub-123';
      const mockSubscription = {
        id: subscriptionId,
        planId: 'premium',
        status: SubscriptionStatus.ACTIVE,
      };

      mockSubscriptionRepository.findOneBy.mockResolvedValue(mockSubscription);

      const result = await service.getSubscription(subscriptionId);

      expect(result).toEqual(mockSubscription);
    });

    it('should throw NotFoundException if subscription not found', async () => {
      mockSubscriptionRepository.findOneBy.mockResolvedValue(null);

      await expect(service.getSubscription('invalid-id')).rejects.toThrow(
        'Subscription not found',
      );
    });
  });

  describe('getAllSubscriptions', () => {
    it('should retrieve all subscriptions with pagination', async () => {
      const mockSubscriptions = [
        { id: 'sub-1', userId: 'user-1', planId: 'premium' },
        { id: 'sub-2', userId: 'user-2', planId: 'basic' },
      ];

      mockSubscriptionRepository.findAndCount.mockResolvedValue([mockSubscriptions, 2]);

      const result = await service.getAllSubscriptions(20, 0);

      expect(result.subscriptions).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  describe('handleRenewal', () => {
    it('should update subscription on renewal', async () => {
      const stripeSubscriptionId = 'sub_stripe_123';
      const mockSubscription = {
        id: 'sub-123',
        stripeSubscriptionId,
        renewalCount: 0,
        billingCycle: BillingCycle.MONTHLY,
        currentPeriodEnd: new Date(),
      };

      mockSubscriptionRepository.findOneBy.mockResolvedValue(mockSubscription);
      mockSubscriptionRepository.save.mockResolvedValue({
        ...mockSubscription,
        renewalCount: 1,
        lastRenewalDate: expect.any(Date),
      });

      await service.handleRenewal(stripeSubscriptionId);

      expect(mockSubscriptionRepository.save).toHaveBeenCalled();
      const savedData = mockSubscriptionRepository.save.mock.calls[0][0];
      expect(savedData.renewalCount).toBe(1);
    });
  });
});
