import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SubscriptionTierService } from './subscription-tier.service';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';

describe('SubscriptionTierService', () => {
  let service: SubscriptionTierService;
  let redis: Record<string, jest.Mock>;
  let kafka: Record<string, jest.Mock>;

  const mockTier = (overrides = {}) => ({
    id: 'tier-1',
    creatorId: 'creator-1',
    name: 'Gold',
    description: 'Gold tier',
    priceMonthly: 9.99,
    priceYearly: 99.99,
    benefits: ['Exclusive content'],
    isActive: true,
    stripePriceId: null,
    createdAt: '2024-01-15T00:00:00Z',
    ...overrides,
  });

  beforeEach(async () => {
    redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      lPush: jest.fn().mockResolvedValue(0),
      lRange: jest.fn().mockResolvedValue([]),
      sAdd: jest.fn().mockResolvedValue(0),
      sMembers: jest.fn().mockResolvedValue([]),
      mget: jest.fn().mockResolvedValue([]),
    };
    kafka = { sendEvent: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionTierService,
        { provide: RedisService, useValue: redis },
        { provide: KafkaProducerService, useValue: kafka },
      ],
    }).compile();

    service = module.get(SubscriptionTierService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('應建立訂閱方案並發送 Kafka 事件', async () => {
      const dto = {
        creatorId: 'creator-1',
        name: 'Gold',
        priceMonthly: 9.99,
        benefits: ['Exclusive content'],
      };

      const result = await service.create(dto);

      expect(result.id).toMatch(/^tier-/);
      expect(result.creatorId).toBe('creator-1');
      expect(result.name).toBe('Gold');
      expect(result.isActive).toBe(true);
      expect(redis.set).toHaveBeenCalled();
      expect(redis.lPush).toHaveBeenCalled();
      expect(redis.sAdd).toHaveBeenCalledWith('tiers:all', result.id);
      expect(kafka.sendEvent).toHaveBeenCalledWith(
        'subscription.tier.created',
        expect.objectContaining({ creatorId: 'creator-1', name: 'Gold' }),
      );
    });

    it('應使用預設值處理可選欄位', async () => {
      const dto = {
        creatorId: 'creator-1',
        name: 'Basic',
        priceMonthly: 4.99,
        benefits: [],
      };

      const result = await service.create(dto);

      expect(result.description).toBeNull();
      expect(result.priceYearly).toBeNull();
      expect(result.benefits).toEqual([]);
      expect(result.stripePriceId).toBeNull();
    });
  });

  describe('findAll', () => {
    it('應回傳所有啟用的方案', async () => {
      const active = mockTier({ id: 'tier-1', isActive: true });
      const inactive = mockTier({ id: 'tier-2', isActive: false });
      redis.sMembers.mockResolvedValue(['tier-1', 'tier-2']);
      redis.mget.mockResolvedValue([JSON.stringify(active), JSON.stringify(inactive)]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('tier-1');
    });

    it('無方案時應回傳空陣列', async () => {
      redis.sMembers.mockResolvedValue([]);
      redis.mget.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });

    it('應依 createdAt 降序排列', async () => {
      const older = mockTier({ id: 'tier-1', createdAt: '2024-01-01T00:00:00Z' });
      const newer = mockTier({ id: 'tier-2', createdAt: '2024-02-01T00:00:00Z' });
      redis.sMembers.mockResolvedValue(['tier-1', 'tier-2']);
      redis.mget.mockResolvedValue([JSON.stringify(older), JSON.stringify(newer)]);

      const result = await service.findAll();

      expect(result[0].id).toBe('tier-2');
      expect(result[1].id).toBe('tier-1');
    });
  });

  describe('findByCreator', () => {
    it('應回傳特定創作者的啟用方案', async () => {
      const tier = mockTier();
      redis.lRange.mockResolvedValue(['tier-1']);
      redis.mget.mockResolvedValue([JSON.stringify(tier)]);

      const result = await service.findByCreator('creator-1');

      expect(result).toHaveLength(1);
      expect(result[0].creatorId).toBe('creator-1');
    });

    it('應依價格升序排列', async () => {
      const expensive = mockTier({ id: 'tier-1', priceMonthly: 19.99 });
      const cheap = mockTier({ id: 'tier-2', priceMonthly: 4.99 });
      redis.lRange.mockResolvedValue(['tier-1', 'tier-2']);
      redis.mget.mockResolvedValue([JSON.stringify(expensive), JSON.stringify(cheap)]);

      const result = await service.findByCreator('creator-1');

      expect(result[0].priceMonthly).toBe(4.99);
      expect(result[1].priceMonthly).toBe(19.99);
    });
  });

  describe('findOne', () => {
    it('應回傳單一方案', async () => {
      redis.get.mockResolvedValue(JSON.stringify(mockTier()));

      const result = await service.findOne('tier-1');

      expect(result.id).toBe('tier-1');
    });

    it('找不到時應拋出 NotFoundException', async () => {
      redis.get.mockResolvedValue(null);

      await expect(service.findOne('tier-missing'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('應更新方案並發送 Kafka 事件', async () => {
      redis.get.mockResolvedValue(JSON.stringify(mockTier()));

      const result = await service.update('tier-1', { name: 'Platinum', priceMonthly: 14.99 });

      expect(result.name).toBe('Platinum');
      expect(result.priceMonthly).toBe(14.99);
      expect(redis.set).toHaveBeenCalled();
      expect(kafka.sendEvent).toHaveBeenCalledWith(
        'subscription.tier.updated',
        expect.objectContaining({ tierId: 'tier-1', name: 'Platinum' }),
      );
    });

    it('找不到時應拋出 NotFoundException', async () => {
      redis.get.mockResolvedValue(null);

      await expect(service.update('tier-missing', { name: 'X' }))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('應將方案設為 inactive（軟刪除）', async () => {
      redis.get.mockResolvedValue(JSON.stringify(mockTier()));

      await service.remove('tier-1');

      expect(redis.set).toHaveBeenCalledWith(
        'tier:tier-1',
        expect.stringContaining('"isActive":false'),
      );
    });

    it('找不到時應拋出 NotFoundException', async () => {
      redis.get.mockResolvedValue(null);

      await expect(service.remove('tier-missing'))
        .rejects.toThrow(NotFoundException);
    });
  });
});
