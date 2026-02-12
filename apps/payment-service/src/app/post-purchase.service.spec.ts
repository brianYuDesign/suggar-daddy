import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PostPurchaseService } from './post-purchase.service';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';

describe('PostPurchaseService', () => {
  let service: PostPurchaseService;
  let redis: jest.Mocked<Pick<RedisService, 'get' | 'set' | 'lPush' | 'lRange' | 'mget'>>;
  let kafka: jest.Mocked<Pick<KafkaProducerService, 'sendEvent'>>;

  beforeEach(async () => {
    redis = {
      get: jest.fn(),
      set: jest.fn(),
      lPush: jest.fn(),
      lRange: jest.fn(),
      mget: jest.fn().mockResolvedValue([]),
    };
    kafka = { sendEvent: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostPurchaseService,
        { provide: RedisService, useValue: redis },
        { provide: KafkaProducerService, useValue: kafka },
      ],
    }).compile();

    service = module.get(PostPurchaseService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('應建立 PPV 購買記錄並發送 Kafka', async () => {
      redis.get!.mockResolvedValue(null);
      redis.set!.mockResolvedValue(undefined);
      redis.lPush!.mockResolvedValue(0);

      const dto = {
        buyerId: 'user-1',
        postId: 'post-1',
        amount: 999,
      };

      const result = await service.create(dto);

      expect(result.id).toMatch(/^ppv-/);
      expect(result.postId).toBe('post-1');
      expect(result.buyerId).toBe('user-1');
      expect(result.amount).toBe(999);
      expect(kafka.sendEvent).toHaveBeenCalledWith(
        'payment.post.purchased',
        expect.objectContaining({
          userId: 'user-1',
          postId: 'post-1',
          amount: 999,
        })
      );
    });

    it('應在重複購買同一貼文時拋出 ConflictException', async () => {
      redis.get!.mockImplementation((key: string) => {
        if (key.includes('by-buyer-post')) return Promise.resolve('ppv-existing-id');
        if (key.startsWith('post-purchase:ppv-')) return Promise.resolve(JSON.stringify({ id: 'ppv-existing-id' }));
        return Promise.resolve(null);
      });

      await expect(
        service.create({ buyerId: 'user-1', postId: 'post-1', amount: 100 })
      ).rejects.toThrow(ConflictException);
      await expect(
        service.create({ buyerId: 'user-1', postId: 'post-1', amount: 100 })
      ).rejects.toThrow(/already purchased/);
    });
  });

  describe('findByBuyer', () => {
    it('應回傳該買家的購買列表並依時間倒序', async () => {
      redis.lRange!.mockResolvedValue(['ppv-1', 'ppv-2']);
      redis.mget!.mockResolvedValue([
        JSON.stringify({ id: 'ppv-1', createdAt: '2025-01-02T00:00:00.000Z' }),
        JSON.stringify({ id: 'ppv-2', createdAt: '2025-01-03T00:00:00.000Z' }),
      ]);

      const result = await service.findByBuyer('user-1');

      expect(result.length).toBe(2);
      expect(result[0].id).toBe('ppv-2');
      expect(result[1].id).toBe('ppv-1');
    });
  });

  describe('findOne', () => {
    it('應在找不到時拋出 NotFoundException', async () => {
      redis.get!.mockResolvedValue(null);

      await expect(service.findOne('ppv-missing')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('ppv-missing')).rejects.toThrow('not found');
    });
  });
});
