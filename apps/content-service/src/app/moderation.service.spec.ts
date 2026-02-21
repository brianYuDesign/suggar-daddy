import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { PostService } from './post.service';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';

describe('ModerationService', () => {
  let service: ModerationService;
  let redis: jest.Mocked<Pick<RedisService, 'get' | 'set' | 'lPush' | 'lRange' | 'sAdd' | 'sRem' | 'sMembers' | 'mget'>>;
  let kafka: { sendEvent: jest.Mock };
  let postService: jest.Mocked<Pick<PostService, 'findOne'>>;

  const samplePost = {
    id: 'post-1',
    creatorId: 'creator-1',
    contentType: 'image' as const,
    visibility: 'public' as const,
    caption: 'Hello',
    mediaUrls: ['url1'],
    requiredTierId: null,
    ppvPrice: null,
    likeCount: 0,
    commentCount: 0,
    bookmarkCount: 0,
    tipCount: 0,
    createdAt: '2025-01-01T00:00:00.000Z',
  };

  beforeEach(async () => {
    redis = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined),
      lPush: jest.fn().mockResolvedValue(0),
      lRange: jest.fn().mockResolvedValue([]),
      sAdd: jest.fn().mockResolvedValue(1),
      sRem: jest.fn().mockResolvedValue(1),
      sMembers: jest.fn().mockResolvedValue([]),
      mget: jest.fn().mockResolvedValue([]),
    };
    kafka = { sendEvent: jest.fn().mockResolvedValue(null) };
    postService = {
      findOne: jest.fn().mockResolvedValue({ ...samplePost }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModerationService,
        { provide: RedisService, useValue: redis },
        { provide: KafkaProducerService, useValue: kafka },
        { provide: PostService, useValue: postService },
      ],
    }).compile();

    service = module.get(ModerationService);
    jest.clearAllMocks();
    // Reset mocks after clearAllMocks to keep default resolved values
    redis.set.mockResolvedValue(undefined);
    redis.lPush.mockResolvedValue(0);
    redis.sAdd.mockResolvedValue(1);
    redis.sRem.mockResolvedValue(1);
    kafka.sendEvent.mockResolvedValue(null);
    postService.findOne.mockResolvedValue({ ...samplePost });
  });

  // ── reportPost ──────────────────────────────────────────────

  describe('reportPost', () => {
    it('should create a content report', async () => {
      redis.lRange.mockResolvedValue([]); // report count for auto-takedown check

      const result = await service.reportPost('reporter-1', 'post-1', 'spam', 'spammy content');

      expect(result.id).toMatch(/^cr-/);
      expect(result.reporterId).toBe('reporter-1');
      expect(result.postId).toBe('post-1');
      expect(result.reason).toBe('spam');
      expect(result.description).toBe('spammy content');
      expect(result.status).toBe('pending');
    });

    it('should verify post exists before creating report', async () => {
      postService.findOne.mockRejectedValue(new NotFoundException('Post not found'));

      await expect(
        service.reportPost('reporter-1', 'post-missing', 'spam'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when reason is empty', async () => {
      redis.lRange.mockResolvedValue([]);

      await expect(
        service.reportPost('reporter-1', 'post-1', '' as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should store report in Redis and add to queues', async () => {
      redis.lRange.mockResolvedValue([]);

      const result = await service.reportPost('reporter-1', 'post-1', 'nudity');

      expect(redis.set).toHaveBeenCalledWith(
        `content:report:${result.id}`,
        expect.any(String),
      );
      expect(redis.lPush).toHaveBeenCalledWith('content:reports:queue', result.id);
      expect(redis.lPush).toHaveBeenCalledWith('content:reports:post:post-1', result.id);
      expect(redis.lPush).toHaveBeenCalledWith('content:reports:reporter:reporter-1', result.id);
    });

    it('should send POST_REPORTED Kafka event', async () => {
      redis.lRange.mockResolvedValue([]);

      await service.reportPost('reporter-1', 'post-1', 'harassment');

      expect(kafka.sendEvent).toHaveBeenCalledWith(
        'content.post.reported',
        expect.objectContaining({
          reporterId: 'reporter-1',
          postId: 'post-1',
          reason: 'harassment',
        }),
      );
    });

    it('should auto-takedown post when report count reaches 5', async () => {
      // 4 existing reports + this one = 5
      redis.lRange.mockResolvedValue(['cr-1', 'cr-2', 'cr-3', 'cr-4', 'cr-5']);

      await service.reportPost('reporter-5', 'post-1', 'spam');

      // Verify takedown was triggered - post should be updated with hidden visibility
      expect(redis.set).toHaveBeenCalledWith(
        'post:post-1',
        expect.stringContaining('"visibility":"hidden"'),
      );
      expect(redis.sAdd).toHaveBeenCalledWith('content:taken-down', 'post-1');
    });

    it('should NOT auto-takedown when report count is below 5', async () => {
      redis.lRange.mockResolvedValue(['cr-1', 'cr-2', 'cr-3']);

      await service.reportPost('reporter-3', 'post-1', 'spam');

      // Should not call sAdd for taken-down set
      expect(redis.sAdd).not.toHaveBeenCalledWith('content:taken-down', 'post-1');
    });

    it('should trim whitespace from description', async () => {
      redis.lRange.mockResolvedValue([]);

      const result = await service.reportPost('reporter-1', 'post-1', 'other', '  some description  ');

      expect(result.description).toBe('some description');
    });

    it('should handle all valid report reasons', async () => {
      redis.lRange.mockResolvedValue([]);

      for (const reason of ['spam', 'nudity', 'harassment', 'violence', 'copyright', 'other'] as const) {
        const result = await service.reportPost('reporter-1', 'post-1', reason);
        expect(result.reason).toBe(reason);
      }
    });
  });

  // ── reviewReport ──────────────────────────────────────────────

  describe('reviewReport', () => {
    const pendingReport = {
      id: 'cr-1',
      reporterId: 'reporter-1',
      postId: 'post-1',
      reason: 'spam',
      status: 'pending',
      createdAt: '2025-01-01T00:00:00.000Z',
    };

    it('should throw NotFoundException for non-existent report', async () => {
      redis.get.mockResolvedValue(null);

      await expect(
        service.reviewReport('cr-missing', 'dismiss', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for already reviewed report', async () => {
      redis.get.mockResolvedValue(
        JSON.stringify({ ...pendingReport, status: 'dismissed' }),
      );

      await expect(
        service.reviewReport('cr-1', 'dismiss', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.reviewReport('cr-1', 'dismiss', 'admin-1'),
      ).rejects.toThrow('already dismissed');
    });

    describe('dismiss', () => {
      it('should mark report as dismissed', async () => {
        redis.get.mockResolvedValue(JSON.stringify(pendingReport));

        const result = await service.reviewReport('cr-1', 'dismiss', 'admin-1');

        expect(result.status).toBe('dismissed');
        expect(result.reviewedBy).toBe('admin-1');
        expect(result.reviewedAt).toBeDefined();
      });

      it('should persist dismissed report to Redis', async () => {
        redis.get.mockResolvedValue(JSON.stringify(pendingReport));

        await service.reviewReport('cr-1', 'dismiss', 'admin-1');

        expect(redis.set).toHaveBeenCalledWith(
          'content:report:cr-1',
          expect.stringContaining('"status":"dismissed"'),
        );
      });

      it('should NOT take down post when dismissing', async () => {
        redis.get.mockResolvedValue(JSON.stringify(pendingReport));

        await service.reviewReport('cr-1', 'dismiss', 'admin-1');

        expect(redis.sAdd).not.toHaveBeenCalledWith('content:taken-down', expect.any(String));
      });
    });

    describe('takedown', () => {
      it('should mark report as actioned and take down the post', async () => {
        redis.get.mockResolvedValue(JSON.stringify(pendingReport));

        const result = await service.reviewReport('cr-1', 'takedown', 'admin-1');

        expect(result.status).toBe('actioned');
        expect(result.reviewedBy).toBe('admin-1');
      });

      it('should trigger post takedown', async () => {
        redis.get.mockResolvedValue(JSON.stringify(pendingReport));

        await service.reviewReport('cr-1', 'takedown', 'admin-1');

        expect(redis.set).toHaveBeenCalledWith(
          'post:post-1',
          expect.stringContaining('"visibility":"hidden"'),
        );
        expect(redis.sAdd).toHaveBeenCalledWith('content:taken-down', 'post-1');
      });
    });
  });

  // ── takeDownPost ──────────────────────────────────────────────

  describe('takeDownPost', () => {
    it('should set post visibility to hidden', async () => {
      await service.takeDownPost('post-1', 'admin-1');

      const postSave = redis.set.mock.calls.find(
        (c) => (c[0] as string) === 'post:post-1',
      );
      expect(postSave).toBeDefined();
      const saved = JSON.parse(postSave![1] as string);
      expect(saved.visibility).toBe('hidden');
      expect(saved.moderationStatus).toBe('taken_down');
      expect(saved.moderationActionBy).toBe('admin-1');
    });

    it('should add post ID to taken-down set', async () => {
      await service.takeDownPost('post-1', 'admin-1');

      expect(redis.sAdd).toHaveBeenCalledWith('content:taken-down', 'post-1');
    });

    it('should send POST_TAKEN_DOWN Kafka event', async () => {
      await service.takeDownPost('post-1', 'admin-1');

      expect(kafka.sendEvent).toHaveBeenCalledWith(
        'content.post.taken_down',
        expect.objectContaining({
          postId: 'post-1',
          creatorId: 'creator-1',
          actionBy: 'admin-1',
        }),
      );
    });

    it('should return success: true', async () => {
      const result = await service.takeDownPost('post-1', 'admin-1');

      expect(result).toEqual({ success: true });
    });

    it('should throw if post does not exist', async () => {
      postService.findOne.mockRejectedValue(new NotFoundException('Post not found'));

      await expect(
        service.takeDownPost('post-missing', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── reinstatePost ──────────────────────────────────────────────

  describe('reinstatePost', () => {
    it('should set post visibility to public', async () => {
      await service.reinstatePost('post-1', 'admin-1');

      const postSave = redis.set.mock.calls.find(
        (c) => (c[0] as string) === 'post:post-1',
      );
      expect(postSave).toBeDefined();
      const saved = JSON.parse(postSave![1] as string);
      expect(saved.visibility).toBe('public');
      expect(saved.moderationStatus).toBe('cleared');
      expect(saved.moderationActionBy).toBe('admin-1');
    });

    it('should remove post ID from taken-down set', async () => {
      await service.reinstatePost('post-1', 'admin-1');

      expect(redis.sRem).toHaveBeenCalledWith('content:taken-down', 'post-1');
    });

    it('should send POST_REINSTATED Kafka event', async () => {
      await service.reinstatePost('post-1', 'admin-1');

      expect(kafka.sendEvent).toHaveBeenCalledWith(
        'content.post.reinstated',
        expect.objectContaining({
          postId: 'post-1',
          creatorId: 'creator-1',
          actionBy: 'admin-1',
        }),
      );
    });

    it('should return success: true', async () => {
      const result = await service.reinstatePost('post-1', 'admin-1');

      expect(result).toEqual({ success: true });
    });
  });

  // ── getReportQueue ──────────────────────────────────────────────

  describe('getReportQueue', () => {
    it('should return only pending reports', async () => {
      const pending = {
        id: 'cr-1',
        status: 'pending',
        postId: 'p1',
        reason: 'spam',
        createdAt: '2025-01-01T00:00:00.000Z',
      };
      const dismissed = {
        id: 'cr-2',
        status: 'dismissed',
        postId: 'p2',
        reason: 'other',
        createdAt: '2025-01-01T00:00:00.000Z',
      };

      redis.lRange.mockResolvedValue(['cr-1', 'cr-2']);
      redis.mget.mockResolvedValueOnce([
        JSON.stringify(pending),
        JSON.stringify(dismissed),
      ]);

      const result = await service.getReportQueue();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('cr-1');
    });

    it('should respect custom limit', async () => {
      redis.lRange.mockResolvedValue([]);

      await service.getReportQueue(10);

      expect(redis.lRange).toHaveBeenCalledWith('content:reports:queue', 0, 9);
    });
  });

  // ── getReportsForPost ──────────────────────────────────────────

  describe('getReportsForPost', () => {
    it('should return all reports for a post sorted by date', async () => {
      const r1 = { id: 'cr-1', postId: 'post-1', createdAt: '2025-01-01T00:00:00.000Z' };
      const r2 = { id: 'cr-2', postId: 'post-1', createdAt: '2025-01-02T00:00:00.000Z' };

      redis.lRange.mockResolvedValue(['cr-1', 'cr-2']);
      redis.mget.mockResolvedValueOnce([
        JSON.stringify(r1),
        JSON.stringify(r2),
      ]);

      const result = await service.getReportsForPost('post-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('cr-2'); // newer first
    });
  });

  // ── getTakenDownPosts ──────────────────────────────────────────

  describe('getTakenDownPosts', () => {
    it('should return taken-down post IDs', async () => {
      redis.sMembers.mockResolvedValue(['post-1', 'post-2']);

      const result = await service.getTakenDownPosts();

      expect(result).toEqual(['post-1', 'post-2']);
      expect(redis.sMembers).toHaveBeenCalledWith('content:taken-down');
    });
  });
});
