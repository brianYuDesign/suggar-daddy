import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let redis: jest.Mocked<Pick<RedisService, 'get' | 'set' | 'lPush' | 'lRange' | 'keys' | 'sAdd' | 'sRem'>>;
  let kafka: jest.Mocked<Pick<KafkaProducerService, 'sendEvent'>>;

  beforeEach(async () => {
    redis = {
      get: jest.fn(),
      set: jest.fn(),
      lPush: jest.fn(),
      lRange: jest.fn(),
      keys: jest.fn(),
      sAdd: jest.fn(),
      sRem: jest.fn(),
    };
    kafka = { sendEvent: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        { provide: RedisService, useValue: redis },
        { provide: KafkaProducerService, useValue: kafka },
      ],
    }).compile();

    service = module.get(SubscriptionService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('應建立訂閱並發送 Kafka', async () => {
      redis.set!.mockResolvedValue(undefined);
      redis.lPush!.mockResolvedValue(0);

      const result = await service.create({
        subscriberId: 'user-1',
        creatorId: 'user-2',
        tierId: 'tier-1',
        stripeSubscriptionId: 'sub_stripe_1',
      });

      expect(result.id).toMatch(/^sub-/);
      expect(result.status).toBe('active');
      expect(result.subscriberId).toBe('user-1');
      expect(result.creatorId).toBe('user-2');
      expect(kafka.sendEvent).toHaveBeenCalledWith(
        'subscription.created',
        expect.objectContaining({
          subscriberId: 'user-1',
          creatorId: 'user-2',
          tierId: 'tier-1',
        })
      );
    });
  });

  describe('findOne', () => {
    it('應在找不到時拋出 NotFoundException', async () => {
      redis.get!.mockResolvedValue(null);

      await expect(service.findOne('sub-missing')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('sub-missing')).rejects.toThrow('not found');
    });

    it('應回傳訂閱內容', async () => {
      const sub = {
        id: 'sub-1',
        subscriberId: 'u1',
        creatorId: 'u2',
        tierId: 't1',
        status: 'active',
        currentPeriodEnd: '2025-12-31',
        createdAt: new Date().toISOString(),
      };
      redis.get!.mockResolvedValue(JSON.stringify(sub));

      const result = await service.findOne('sub-1');
      expect(result.id).toBe('sub-1');
      expect(result.status).toBe('active');
    });
  });

  describe('extendPeriod', () => {
    it('應在訂閱為 active 時更新 currentPeriodEnd', async () => {
      const sub = {
        id: 'sub-1',
        status: 'active',
        currentPeriodEnd: '2025-06-01',
        createdAt: new Date().toISOString(),
      };
      redis.get!.mockResolvedValue(JSON.stringify(sub));
      redis.set!.mockResolvedValue(undefined);

      const result = await service.extendPeriod('sub-1', '2025-07-01');

      expect(result.currentPeriodEnd).toBe('2025-07-01');
      expect(redis.set).toHaveBeenCalled();
      expect(kafka.sendEvent).toHaveBeenCalledWith(
        'subscription.updated',
        expect.objectContaining({ subscriptionId: 'sub-1', currentPeriodEnd: '2025-07-01' })
      );
    });

    it('應在訂閱非 active 時不更新', async () => {
      const sub = {
        id: 'sub-1',
        status: 'cancelled',
        currentPeriodEnd: '2025-06-01',
        createdAt: new Date().toISOString(),
      };
      redis.get!.mockResolvedValue(JSON.stringify(sub));

      const result = await service.extendPeriod('sub-1', '2025-07-01');

      expect(result.currentPeriodEnd).toBe('2025-06-01');
      expect(redis.set).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('應將狀態改為 cancelled 並發送 Kafka', async () => {
      const sub = {
        id: 'sub-1',
        status: 'active',
        cancelledAt: null,
        createdAt: new Date().toISOString(),
      };
      redis.get!.mockResolvedValue(JSON.stringify(sub));
      redis.set!.mockResolvedValue(undefined);

      const result = await service.cancel('sub-1');

      expect(result.status).toBe('cancelled');
      expect(result.cancelledAt).toBeDefined();
      expect(kafka.sendEvent).toHaveBeenCalledWith(
        'subscription.cancelled',
        expect.objectContaining({ subscriptionId: 'sub-1' })
      );
    });
  });
});
