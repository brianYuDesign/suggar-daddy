import { Test, TestingModule } from '@nestjs/testing';
import { DiscoveryService } from './discovery.service';
import { RedisService } from '@suggar-daddy/redis';

describe('DiscoveryService', () => {
  let service: DiscoveryService;
  let redis: Record<string, jest.Mock>;

  const mockPost = (overrides = {}) => ({
    id: 'post-1',
    creatorId: 'creator-1',
    contentType: 'image',
    caption: 'Hello world',
    visibility: 'public',
    mediaUrls: [],
    likeCount: 5,
    commentCount: 2,
    createdAt: '2024-01-15T00:00:00Z',
    ...overrides,
  });

  beforeEach(async () => {
    redis = {
      zCard: jest.fn().mockResolvedValue(0),
      zRevRange: jest.fn().mockResolvedValue([]),
      zRevRangeWithScores: jest.fn().mockResolvedValue([]),
      zScore: jest.fn().mockResolvedValue(null),
      zIncrBy: jest.fn().mockResolvedValue(undefined),
      zRem: jest.fn().mockResolvedValue(undefined),
      mget: jest.fn().mockResolvedValue([]),
      lRange: jest.fn().mockResolvedValue([]),
      lLen: jest.fn().mockResolvedValue(0),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscoveryService,
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get(DiscoveryService);
    jest.clearAllMocks();
  });

  describe('getTrendingPosts', () => {
    it('應回傳空結果當沒有貼文時', async () => {
      redis.zCard.mockResolvedValue(0);
      redis.zRevRangeWithScores.mockResolvedValue([]);

      const result = await service.getTrendingPosts();

      expect(result).toEqual({ data: [], total: 0, page: 1, limit: 20 });
    });

    it('應回傳帶 engagementScore 的公開貼文', async () => {
      const post = mockPost({ visibility: 'public' });
      redis.zCard.mockResolvedValue(1);
      redis.zRevRangeWithScores.mockResolvedValue([{ member: 'post-1', score: 42 }]);
      redis.mget.mockResolvedValue([JSON.stringify(post)]);

      const result = await service.getTrendingPosts();

      expect(result.data).toHaveLength(1);
      expect(result.data[0].engagementScore).toBe(42);
    });

    it('應過濾非公開貼文', async () => {
      const publicPost = mockPost({ id: 'post-1', visibility: 'public' });
      const privatePost = mockPost({ id: 'post-2', visibility: 'subscribers' });
      redis.zCard.mockResolvedValue(2);
      redis.zRevRangeWithScores.mockResolvedValue([
        { member: 'post-1', score: 10 },
        { member: 'post-2', score: 10 },
      ]);
      redis.mget.mockResolvedValue([JSON.stringify(publicPost), JSON.stringify(privatePost)]);

      const result = await service.getTrendingPosts();

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('post-1');
    });

    it('應跳過已刪除（null）的貼文', async () => {
      redis.zCard.mockResolvedValue(2);
      redis.zRevRangeWithScores.mockResolvedValue([
        { member: 'post-1', score: 5 },
        { member: 'post-2', score: 5 },
      ]);
      redis.mget.mockResolvedValue([null, JSON.stringify(mockPost({ id: 'post-2' }))]);

      const result = await service.getTrendingPosts();

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('post-2');
    });
  });

  describe('searchPosts', () => {
    it('空查詢應回傳空結果', async () => {
      const result = await service.searchPosts('');

      expect(result).toEqual({ data: [], total: 0, page: 1, limit: 20 });
    });

    it('空白查詢應回傳空結果', async () => {
      const result = await service.searchPosts('   ');

      expect(result).toEqual({ data: [], total: 0, page: 1, limit: 20 });
    });

    it('應依 caption 搜尋貼文', async () => {
      const matchPost = mockPost({ id: 'post-1', caption: 'TypeScript is great' });
      const noMatchPost = mockPost({ id: 'post-2', caption: 'Python is cool' });
      redis.lLen.mockResolvedValue(2);
      redis.lRange.mockResolvedValue(['post-1', 'post-2']);
      redis.mget.mockResolvedValue([JSON.stringify(matchPost), JSON.stringify(noMatchPost)]);

      const result = await service.searchPosts('typescript');

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('post-1');
      expect(result.total).toBe(1);
    });

    it('搜尋應不區分大小寫', async () => {
      const post = mockPost({ caption: 'HELLO World' });
      redis.lLen.mockResolvedValue(1);
      redis.lRange.mockResolvedValue(['post-1']);
      redis.mget.mockResolvedValue([JSON.stringify(post)]);

      const result = await service.searchPosts('hello');

      expect(result.data).toHaveLength(1);
    });

    it('應只搜尋公開貼文', async () => {
      const publicPost = mockPost({ id: 'post-1', visibility: 'public', caption: 'test' });
      const privatePost = mockPost({ id: 'post-2', visibility: 'subscribers', caption: 'test' });
      redis.lLen.mockResolvedValue(2);
      redis.lRange.mockResolvedValue(['post-1', 'post-2']);
      redis.mget.mockResolvedValue([JSON.stringify(publicPost), JSON.stringify(privatePost)]);

      const result = await service.searchPosts('test');

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('post-1');
    });

    it('應支援分頁', async () => {
      const posts = Array.from({ length: 5 }, (_, i) =>
        mockPost({ id: `post-${i}`, caption: 'test', createdAt: `2024-01-${15 + i}T00:00:00Z` }),
      );
      redis.lLen.mockResolvedValue(5);
      redis.lRange.mockResolvedValue(posts.map((p) => p.id));
      redis.mget.mockResolvedValue(posts.map((p) => JSON.stringify(p)));

      const result = await service.searchPosts('test', 2, 2);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(5);
      expect(result.page).toBe(2);
    });

    it('無公開貼文時應回傳空結果', async () => {
      redis.lLen.mockResolvedValue(0);
      redis.lRange.mockResolvedValue([]);

      const result = await service.searchPosts('test');

      expect(result).toEqual({ data: [], total: 0, page: 1, limit: 20 });
    });
  });

  describe('updateTrendingScore', () => {
    it('like 應增加 1 分', async () => {
      await service.updateTrendingScore('post-1', 'like');

      expect(redis.zIncrBy).toHaveBeenCalledWith('trending:posts', 1, 'post-1');
    });

    it('comment 應增加 2 分', async () => {
      await service.updateTrendingScore('post-1', 'comment');

      expect(redis.zIncrBy).toHaveBeenCalledWith('trending:posts', 2, 'post-1');
    });

    it('bookmark 應增加 3 分', async () => {
      await service.updateTrendingScore('post-1', 'bookmark');

      expect(redis.zIncrBy).toHaveBeenCalledWith('trending:posts', 3, 'post-1');
    });
  });

  describe('cleanupOldTrending', () => {
    it('沒有趨勢貼文時應直接返回', async () => {
      redis.zRevRange.mockResolvedValue([]);

      await service.cleanupOldTrending();

      expect(redis.zRem).not.toHaveBeenCalled();
    });

    it('應移除超過 7 天的貼文', async () => {
      const oldPost = mockPost({
        id: 'post-old',
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      });
      const newPost = mockPost({
        id: 'post-new',
        createdAt: new Date().toISOString(),
      });
      redis.zRevRange.mockResolvedValue(['post-old', 'post-new']);
      redis.mget.mockResolvedValue([JSON.stringify(oldPost), JSON.stringify(newPost)]);

      await service.cleanupOldTrending();

      expect(redis.zRem).toHaveBeenCalledWith('trending:posts', 'post-old');
    });

    it('應移除已刪除（null）的貼文', async () => {
      redis.zRevRange.mockResolvedValue(['post-deleted']);
      redis.mget.mockResolvedValue([null]);

      await service.cleanupOldTrending();

      expect(redis.zRem).toHaveBeenCalledWith('trending:posts', 'post-deleted');
    });
  });
});
