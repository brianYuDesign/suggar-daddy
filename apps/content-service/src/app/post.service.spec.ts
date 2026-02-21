import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PostService } from './post.service';
import { SubscriptionServiceClient } from './subscription-service.client';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';

describe('PostService', () => {
  let service: PostService;
  let redis: jest.Mocked<Pick<RedisService, 'get' | 'set' | 'setex' | 'del' | 'lPush' | 'lRange' | 'mget' | 'sCard'>>;
  let kafka: jest.Mocked<Pick<KafkaProducerService, 'sendEvent'>>;
  let subscriptionClient: jest.Mocked<Pick<SubscriptionServiceClient, 'hasActiveSubscription'>>;

  beforeEach(async () => {
    redis = {
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      lPush: jest.fn(),
      lRange: jest.fn(),
      mget: jest.fn().mockResolvedValue([]),
      sCard: jest.fn().mockResolvedValue(0),
    };
    kafka = { sendEvent: jest.fn() };
    subscriptionClient = {
      hasActiveSubscription: jest.fn().mockResolvedValue(false),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostService,
        { provide: RedisService, useValue: redis },
        { provide: KafkaProducerService, useValue: kafka },
        { provide: SubscriptionServiceClient, useValue: subscriptionClient },
      ],
    }).compile();

    service = module.get(PostService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('應建立貼文並發送 Kafka', async () => {
      redis.set!.mockResolvedValue(undefined);
      redis.lPush!.mockResolvedValue(0);

      const result = await service.create({
        creatorId: 'user-1',
        contentType: 'image',
        caption: 'Hello',
        visibility: 'public',
        mediaUrls: [],
      });

      expect(result.id).toMatch(/^post-/);
      expect(result.creatorId).toBe('user-1');
      expect(result.contentType).toBe('image');
      expect(result.likeCount).toBe(0);
      expect(result.commentCount).toBe(0);
      expect(redis.lPush).toHaveBeenCalledWith('posts:public:ids', result.id);
      expect(kafka.sendEvent).toHaveBeenCalledWith(
        'content.post.created',
        expect.objectContaining({
          creatorId: 'user-1',
          contentType: 'image',
        })
      );
    });
  });

  describe('findOne', () => {
    it('應在找不到時拋出 NotFoundException', async () => {
      redis.get!.mockResolvedValue(null);

      await expect(service.findOne('post-missing')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('post-missing')).rejects.toThrow('not found');
    });

    it('應回傳貼文內容', async () => {
      const post = {
        id: 'post-1',
        creatorId: 'u1',
        contentType: 'image',
        caption: 'Cap',
        mediaUrls: ['https://a/b.jpg'],
        ppvPrice: null,
        likeCount: 0,
        commentCount: 0,
        createdAt: new Date().toISOString(),
      };
      redis.get!.mockResolvedValue(JSON.stringify(post));

      const result = await service.findOne('post-1');
      expect(result.id).toBe('post-1');
      expect(result.caption).toBe('Cap');
    });
  });

  describe('findOneWithAccess', () => {
    it('創作者本人應看到完整內容', async () => {
      const post = {
        id: 'post-1',
        creatorId: 'user-1',
        ppvPrice: 100,
        mediaUrls: ['https://url'],
        caption: 'Secret',
        createdAt: new Date().toISOString(),
      };
      redis.get!.mockResolvedValue(JSON.stringify(post));

      const result = await service.findOneWithAccess('post-1', 'user-1');

      expect(result.locked).toBeUndefined();
      expect(result.mediaUrls).toEqual(['https://url']);
      expect(result.caption).toBe('Secret');
    });

    it('PPV 未解鎖時應回傳鎖定版', async () => {
      const post = {
        id: 'post-1',
        creatorId: 'user-1',
        ppvPrice: 100,
        mediaUrls: ['https://url'],
        caption: 'Secret',
        createdAt: new Date().toISOString(),
      };
      redis.get!
        .mockResolvedValueOnce(JSON.stringify(post))
        .mockResolvedValueOnce(null);

      const result = await service.findOneWithAccess('post-1', 'viewer-1');

      expect(result.locked).toBe(true);
      expect(result.mediaUrls).toEqual([]);
      expect(result.caption).toBe('(Purchase to view)');
    });

    it('PPV 已解鎖時應回傳完整內容', async () => {
      const post = {
        id: 'post-1',
        creatorId: 'user-1',
        ppvPrice: 100,
        mediaUrls: ['https://url'],
        caption: 'Secret',
        createdAt: new Date().toISOString(),
      };
      redis.get!
        .mockResolvedValueOnce(JSON.stringify(post))
        .mockResolvedValueOnce('1');

      const result = await service.findOneWithAccess('post-1', 'viewer-1');

      expect(result.locked).toBeUndefined();
      expect(result.mediaUrls).toEqual(['https://url']);
    });

    it('無 viewerId 且 PPV 時應回傳鎖定版', async () => {
      const post = {
        id: 'post-1',
        creatorId: 'user-1',
        ppvPrice: 50,
        mediaUrls: ['x'],
        caption: 'C',
        createdAt: new Date().toISOString(),
      };
      redis.get!.mockResolvedValue(JSON.stringify(post));

      const result = await service.findOneWithAccess('post-1');

      expect(result.locked).toBe(true);
      expect(result.mediaUrls).toEqual([]);
    });
  });

  // ✅ Bug 3 修復: 計數器邏輯測試
  describe('unlikePost - Counter Logic', () => {
    it('should handle unlike when likeCount is 0', async () => {
      const post = {
        id: 'post-1',
        creatorId: 'user-1',
        likeCount: 0,
        caption: 'Test',
        contentType: 'text',
        visibility: 'public',
        mediaUrls: [],
        createdAt: new Date().toISOString(),
      };
      
      redis.get = jest.fn().mockResolvedValue(JSON.stringify(post));
      redis.setex = jest.fn().mockResolvedValue('OK');
      
      const mockRedis = {
        sRem: jest.fn().mockResolvedValue(1),
      };
      (service as any).redis = { ...redis, sCard: jest.fn().mockResolvedValue(0), ...mockRedis };

      await service.unlikePost('post-1', 'user-1');
      
      const savedPost = JSON.parse((redis.setex as jest.Mock).mock.calls[0][2]);
      expect(savedPost.likeCount).toBe(0); // 不應變為負數
    });

    it('should handle unlike when likeCount is undefined', async () => {
      const post = {
        id: 'post-2',
        creatorId: 'user-1',
        likeCount: undefined,
        caption: 'Test',
        contentType: 'text',
        visibility: 'public',
        mediaUrls: [],
        createdAt: new Date().toISOString(),
      };
      
      redis.get = jest.fn().mockResolvedValue(JSON.stringify(post));
      redis.setex = jest.fn().mockResolvedValue('OK');
      
      const mockRedis = {
        sRem: jest.fn().mockResolvedValue(1),
      };
      (service as any).redis = { ...redis, sCard: jest.fn().mockResolvedValue(0), ...mockRedis };

      await service.unlikePost('post-2', 'user-1');
      
      const savedPost = JSON.parse((redis.setex as jest.Mock).mock.calls[0][2]);
      expect(savedPost.likeCount).toBe(0); // 應該是 0，不是 NaN 或負數
    });

    it('should correctly decrement from positive count', async () => {
      const post = {
        id: 'post-3',
        creatorId: 'user-1',
        likeCount: 5,
        caption: 'Test',
        contentType: 'text',
        visibility: 'public',
        mediaUrls: [],
        createdAt: new Date().toISOString(),
      };
      
      redis.get = jest.fn().mockResolvedValue(JSON.stringify(post));
      redis.setex = jest.fn().mockResolvedValue('OK');
      
      const mockRedis = {
        sRem: jest.fn().mockResolvedValue(1),
      };
      (service as any).redis = { ...redis, sCard: jest.fn().mockResolvedValue(0), ...mockRedis };

      await service.unlikePost('post-3', 'user-1');
      
      const savedPost = JSON.parse((redis.setex as jest.Mock).mock.calls[0][2]);
      expect(savedPost.likeCount).toBe(4);
    });
  });

  describe('unbookmarkPost - Counter Logic', () => {
    it('should handle unbookmark when bookmarkCount is 0', async () => {
      const post = {
        id: 'post-1',
        creatorId: 'user-1',
        bookmarkCount: 0,
        caption: 'Test',
        contentType: 'text',
        visibility: 'public',
        mediaUrls: [],
        createdAt: new Date().toISOString(),
      };
      
      redis.get = jest.fn().mockResolvedValue(JSON.stringify(post));
      redis.setex = jest.fn().mockResolvedValue('OK');
      
      const mockRedis = {
        zRem: jest.fn().mockResolvedValue(1),
      };
      (service as any).redis = { ...redis, sCard: jest.fn().mockResolvedValue(0), ...mockRedis };
      
      await service.unbookmarkPost('post-1', 'user-1');
      
      const savedPost = JSON.parse((redis.setex as jest.Mock).mock.calls[0][2]);
      expect(savedPost.bookmarkCount).toBe(0);
    });
  });
});
