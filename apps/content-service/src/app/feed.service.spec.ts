import { Test, TestingModule } from '@nestjs/testing';
import { FeedService } from './feed.service';
import { RedisService } from '@suggar-daddy/redis';

describe('FeedService', () => {
  let service: FeedService;
  let redis: Record<string, jest.Mock>;

  const mockPost = (overrides = {}) => ({
    id: 'post-1',
    creatorId: 'creator-1',
    contentType: 'image',
    caption: 'Hello',
    visibility: 'public',
    mediaUrls: [],
    likeCount: 0,
    commentCount: 0,
    createdAt: new Date().toISOString(),
    ...overrides,
  });

  beforeEach(async () => {
    redis = {
      zCard: jest.fn().mockResolvedValue(0),
      zRevRange: jest.fn().mockResolvedValue([]),
      zAdd: jest.fn().mockResolvedValue(undefined),
      zRemRangeByRank: jest.fn().mockResolvedValue(undefined),
      mget: jest.fn().mockResolvedValue([]),
      sUnion: jest.fn().mockResolvedValue([]),
      lRange: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedService,
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get(FeedService);
    jest.clearAllMocks();
  });

  describe('getFeed', () => {
    it('應回傳空 feed 當沒有貼文時', async () => {
      redis.zCard.mockResolvedValue(0);
      redis.zRevRange.mockResolvedValue([]);

      const result = await service.getFeed('user-1');

      expect(result).toEqual({ data: [], total: 0, page: 1, limit: 20 });
    });

    it('應回傳分頁的 feed 貼文', async () => {
      const post = mockPost();
      redis.zCard.mockResolvedValue(1);
      redis.zRevRange.mockResolvedValue(['post-1']);
      redis.mget.mockResolvedValue([JSON.stringify(post)]);
      redis.sUnion.mockResolvedValue([]);

      const result = await service.getFeed('user-1', 1, 20);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('post-1');
      expect(result.total).toBe(1);
    });

    it('應過濾已封鎖使用者的貼文', async () => {
      const post1 = mockPost({ id: 'post-1', creatorId: 'blocked-user' });
      const post2 = mockPost({ id: 'post-2', creatorId: 'normal-user' });
      redis.zCard.mockResolvedValue(2);
      redis.zRevRange.mockResolvedValue(['post-1', 'post-2']);
      redis.mget.mockResolvedValue([JSON.stringify(post1), JSON.stringify(post2)]);
      redis.sUnion.mockResolvedValue(['blocked-user']);

      const result = await service.getFeed('user-1');

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('post-2');
    });

    it('應過濾非公開且非自己的貼文', async () => {
      const publicPost = mockPost({ id: 'post-1', visibility: 'public', creatorId: 'other' });
      const privatePost = mockPost({ id: 'post-2', visibility: 'subscribers', creatorId: 'other' });
      const ownPrivate = mockPost({ id: 'post-3', visibility: 'subscribers', creatorId: 'user-1' });
      redis.zCard.mockResolvedValue(3);
      redis.zRevRange.mockResolvedValue(['post-1', 'post-2', 'post-3']);
      redis.mget.mockResolvedValue([
        JSON.stringify(publicPost),
        JSON.stringify(privatePost),
        JSON.stringify(ownPrivate),
      ]);
      redis.sUnion.mockResolvedValue([]);

      const result = await service.getFeed('user-1');

      expect(result.data).toHaveLength(2);
      expect(result.data.map((p) => p.id)).toEqual(['post-1', 'post-3']);
    });
  });

  describe('addToFeed', () => {
    it('應新增貼文到 feed', async () => {
      redis.zCard.mockResolvedValue(1);

      await service.addToFeed('user-1', 'post-1', Date.now());

      expect(redis.zAdd).toHaveBeenCalledWith('feed:user-1', expect.any(Number), 'post-1');
    });

    it('應在超過最大 feed 大小時裁剪', async () => {
      redis.zCard.mockResolvedValue(1001);

      await service.addToFeed('user-1', 'post-1', Date.now());

      expect(redis.zRemRangeByRank).toHaveBeenCalledWith('feed:user-1', 0, 0);
    });

    it('feed 未超過上限時不應裁剪', async () => {
      redis.zCard.mockResolvedValue(500);

      await service.addToFeed('user-1', 'post-1', Date.now());

      expect(redis.zRemRangeByRank).not.toHaveBeenCalled();
    });
  });

  describe('backfillFeed', () => {
    it('沒有貼文時應直接返回', async () => {
      redis.lRange.mockResolvedValue([]);

      await service.backfillFeed('user-1', 'creator-1');

      expect(redis.mget).not.toHaveBeenCalled();
    });

    it('應只回填公開貼文', async () => {
      const publicPost = mockPost({ id: 'post-1', visibility: 'public', createdAt: '2024-01-01T00:00:00Z' });
      const privatePost = mockPost({ id: 'post-2', visibility: 'subscribers', createdAt: '2024-01-02T00:00:00Z' });
      redis.lRange.mockResolvedValue(['post-1', 'post-2']);
      redis.mget.mockResolvedValue([JSON.stringify(publicPost), JSON.stringify(privatePost)]);
      redis.zCard.mockResolvedValue(1);

      await service.backfillFeed('user-1', 'creator-1');

      expect(redis.zAdd).toHaveBeenCalledTimes(1);
      expect(redis.zAdd).toHaveBeenCalledWith(
        'feed:user-1',
        new Date('2024-01-01T00:00:00Z').getTime(),
        'post-1',
      );
    });

    it('應跳過 null 值', async () => {
      redis.lRange.mockResolvedValue(['post-1', 'post-2']);
      redis.mget.mockResolvedValue([null, JSON.stringify(mockPost({ id: 'post-2', visibility: 'public', createdAt: '2024-01-01T00:00:00Z' }))]);
      redis.zCard.mockResolvedValue(1);

      await service.backfillFeed('user-1', 'creator-1');

      expect(redis.zAdd).toHaveBeenCalledTimes(1);
    });
  });
});
