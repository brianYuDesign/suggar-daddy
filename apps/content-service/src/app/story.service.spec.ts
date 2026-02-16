import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { StoryService } from './story.service';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';

describe('StoryService', () => {
  let service: StoryService;
  let redis: Record<string, jest.Mock>;
  let kafka: Record<string, jest.Mock>;

  const mockStory = (overrides = {}) => ({
    id: 'story-123',
    creatorId: 'creator-1',
    contentType: 'image',
    mediaUrl: 'https://cdn.example.com/story.jpg',
    caption: 'My story',
    viewCount: 0,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides,
  });

  beforeEach(async () => {
    redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      lPush: jest.fn().mockResolvedValue(0),
      lRange: jest.fn().mockResolvedValue([]),
      lRem: jest.fn().mockResolvedValue(0),
      expire: jest.fn().mockResolvedValue(undefined),
      sMembers: jest.fn().mockResolvedValue([]),
      sAdd: jest.fn().mockResolvedValue(0),
      sIsMember: jest.fn().mockResolvedValue(false),
      zAdd: jest.fn().mockResolvedValue(undefined),
      zRevRange: jest.fn().mockResolvedValue([]),
      zRem: jest.fn().mockResolvedValue(undefined),
      zScore: jest.fn().mockResolvedValue(null),
      exists: jest.fn().mockResolvedValue(false),
      mget: jest.fn().mockResolvedValue([]),
      batchSIsMember: jest.fn().mockResolvedValue([]),
      zRevRangeWithScores: jest.fn().mockResolvedValue([]),
      batchLRange: jest.fn().mockResolvedValue([]),
      batchExists: jest.fn().mockResolvedValue([]),
      batchZRem: jest.fn().mockResolvedValue(undefined),
    };
    kafka = { sendEvent: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoryService,
        { provide: RedisService, useValue: redis },
        { provide: KafkaProducerService, useValue: kafka },
      ],
    }).compile();

    service = module.get(StoryService);
    jest.clearAllMocks();
  });

  describe('createStory', () => {
    it('應建立限時動態並發送 Kafka 事件', async () => {
      redis.sMembers.mockResolvedValue(['follower-1', 'follower-2']);

      const result = await service.createStory('creator-1', {
        contentType: 'image',
        mediaUrl: 'https://cdn.example.com/story.jpg',
        caption: 'My story',
      });

      expect(result.id).toMatch(/^story-/);
      expect(result.creatorId).toBe('creator-1');
      expect(result.viewCount).toBe(0);
      expect(redis.set).toHaveBeenCalled();
      expect(redis.lPush).toHaveBeenCalled();
      expect(kafka.sendEvent).toHaveBeenCalledWith(
        'content.story.created',
        expect.objectContaining({ creatorId: 'creator-1' }),
      );
    });

    it('應更新所有 followers 的 feed', async () => {
      redis.sMembers.mockResolvedValue(['f-1', 'f-2']);

      await service.createStory('creator-1', {
        contentType: 'image',
        mediaUrl: 'https://cdn.example.com/story.jpg',
      });

      expect(redis.zAdd).toHaveBeenCalledTimes(2);
      expect(redis.expire).toHaveBeenCalled();
    });

    it('caption 為空時應設為 null', async () => {
      redis.sMembers.mockResolvedValue([]);

      const result = await service.createStory('creator-1', {
        contentType: 'image',
        mediaUrl: 'https://cdn.example.com/story.jpg',
      });

      expect(result.caption).toBeNull();
    });
  });

  describe('getStoryFeed', () => {
    it('沒有 feed 時應回傳空陣列', async () => {
      redis.zRevRangeWithScores.mockResolvedValue([]);

      const result = await service.getStoryFeed('user-1');

      expect(result).toEqual([]);
    });

    it('應回傳有活躍限時動態的創作者', async () => {
      const now = Date.now();
      redis.zRevRangeWithScores.mockResolvedValue([
        { member: 'creator-1', score: now },
      ]);
      redis.batchLRange.mockResolvedValue([['story-1']]);
      redis.batchExists.mockResolvedValue([true]);

      const result = await service.getStoryFeed('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].creatorId).toBe('creator-1');
    });

    it('應清理沒有活躍限時動態的創作者', async () => {
      redis.zRevRangeWithScores.mockResolvedValue([
        { member: 'creator-1', score: Date.now() },
      ]);
      redis.batchLRange.mockResolvedValue([[]]);
      redis.batchExists.mockResolvedValue([]);

      const result = await service.getStoryFeed('user-1');

      expect(result).toHaveLength(0);
      expect(redis.batchZRem).toHaveBeenCalled();
    });

    it('應清理限時動態已過期的創作者', async () => {
      redis.zRevRangeWithScores.mockResolvedValue([
        { member: 'creator-1', score: Date.now() },
      ]);
      redis.batchLRange.mockResolvedValue([['story-1']]);
      redis.batchExists.mockResolvedValue([false]);

      const result = await service.getStoryFeed('user-1');

      expect(result).toHaveLength(0);
      expect(redis.batchZRem).toHaveBeenCalled();
    });
  });

  describe('getCreatorStories', () => {
    it('沒有限時動態時應回傳空陣列', async () => {
      redis.lRange.mockResolvedValue([]);

      const result = await service.getCreatorStories('creator-1');

      expect(result).toEqual([]);
    });

    it('應回傳創作者的限時動態', async () => {
      const story = mockStory();
      redis.lRange.mockResolvedValue(['story-123']);
      redis.mget.mockResolvedValue([JSON.stringify(story)]);

      const result = await service.getCreatorStories('creator-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('story-123');
    });

    it('有 viewerId 時應標記已觀看狀態', async () => {
      const story = mockStory();
      redis.lRange.mockResolvedValue(['story-123']);
      redis.mget.mockResolvedValue([JSON.stringify(story)]);
      redis.batchSIsMember.mockResolvedValue([true]);

      const result = await service.getCreatorStories('creator-1', 'viewer-1');

      expect(result[0].viewed).toBe(true);
    });

    it('應清理過期的限時動態 ID', async () => {
      redis.lRange.mockResolvedValue(['story-1', 'story-expired']);
      redis.mget.mockResolvedValue([JSON.stringify(mockStory({ id: 'story-1' })), null]);

      const result = await service.getCreatorStories('creator-1');

      expect(result).toHaveLength(1);
      expect(redis.lRem).toHaveBeenCalledWith(expect.stringContaining('stories:creator:'), 1, 'story-expired');
    });
  });

  describe('viewStory', () => {
    it('應拋出 NotFoundException 當限時動態不存在時', async () => {
      redis.get.mockResolvedValue(null);

      await expect(service.viewStory('story-missing', 'viewer-1'))
        .rejects.toThrow(NotFoundException);
    });

    it('首次觀看應增加觀看計數', async () => {
      const story = mockStory();
      redis.get.mockResolvedValue(JSON.stringify(story));
      redis.sAdd.mockResolvedValue(1);

      const result = await service.viewStory('story-123', 'viewer-1');

      expect(result.viewCount).toBe(1);
      expect(result.viewed).toBe(true);
      expect(redis.set).toHaveBeenCalled();
      expect(kafka.sendEvent).toHaveBeenCalledWith(
        'content.story.viewed',
        expect.objectContaining({ storyId: 'story-123', viewerId: 'viewer-1' }),
      );
    });

    it('重複觀看不應增加計數', async () => {
      const story = mockStory({ viewCount: 5 });
      redis.get.mockResolvedValue(JSON.stringify(story));
      redis.sAdd.mockResolvedValue(0);

      const result = await service.viewStory('story-123', 'viewer-1');

      expect(result.viewed).toBe(true);
      // set 不應被呼叫（viewCount 不變）
      expect(redis.set).not.toHaveBeenCalled();
    });
  });

  describe('getStoryViewers', () => {
    it('應拋出 NotFoundException 當限時動態不存在時', async () => {
      redis.get.mockResolvedValue(null);

      await expect(service.getStoryViewers('story-missing', 'creator-1'))
        .rejects.toThrow(NotFoundException);
    });

    it('非創作者應拋出 ForbiddenException', async () => {
      redis.get.mockResolvedValue(JSON.stringify(mockStory({ creatorId: 'creator-1' })));

      await expect(service.getStoryViewers('story-123', 'other-user'))
        .rejects.toThrow(ForbiddenException);
    });

    it('應回傳分頁的觀看者列表', async () => {
      redis.get.mockResolvedValue(JSON.stringify(mockStory({ creatorId: 'creator-1' })));
      redis.sMembers.mockResolvedValue(['viewer-1', 'viewer-2', 'viewer-3']);

      const result = await service.getStoryViewers('story-123', 'creator-1', 1, 2);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
    });
  });

  describe('deleteStory', () => {
    it('應拋出 NotFoundException 當限時動態不存在時', async () => {
      redis.get.mockResolvedValue(null);

      await expect(service.deleteStory('story-missing', 'creator-1'))
        .rejects.toThrow(NotFoundException);
    });

    it('非創作者應拋出 ForbiddenException', async () => {
      redis.get.mockResolvedValue(JSON.stringify(mockStory({ creatorId: 'creator-1' })));

      await expect(service.deleteStory('story-123', 'other-user'))
        .rejects.toThrow(ForbiddenException);
    });

    it('應刪除限時動態並發送 Kafka 事件', async () => {
      redis.get.mockResolvedValue(JSON.stringify(mockStory({ creatorId: 'creator-1' })));

      await service.deleteStory('story-123', 'creator-1');

      expect(redis.del).toHaveBeenCalledWith('story:story-123');
      expect(redis.del).toHaveBeenCalledWith('story:story-123:viewers');
      expect(redis.lRem).toHaveBeenCalled();
      expect(kafka.sendEvent).toHaveBeenCalledWith(
        'content.story.deleted',
        expect.objectContaining({ storyId: 'story-123', creatorId: 'creator-1' }),
      );
    });
  });
});
