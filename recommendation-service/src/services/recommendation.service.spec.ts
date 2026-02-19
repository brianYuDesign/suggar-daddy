import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecommendationService } from '../services/recommendation.service';
import { RedisService } from '../cache/redis.service';
import { Content, UserInteraction, UserInterest, ContentTag } from '../database/entities';

describe('RecommendationService', () => {
  let service: RecommendationService;
  let contentRepo: jest.Mocked<Repository<Content>>;
  let interactionRepo: jest.Mocked<Repository<UserInteraction>>;
  let userInterestRepo: jest.Mocked<Repository<UserInterest>>;
  let redisService: jest.Mocked<RedisService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationService,
        {
          provide: getRepositoryToken(Content),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserInteraction),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserInterest),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            getClient: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RecommendationService>(RecommendationService);
    contentRepo = module.get(getRepositoryToken(Content)) as jest.Mocked<Repository<Content>>;
    interactionRepo = module.get(getRepositoryToken(UserInteraction)) as jest.Mocked<
      Repository<UserInteraction>
    >;
    userInterestRepo = module.get(getRepositoryToken(UserInterest)) as jest.Mocked<
      Repository<UserInterest>
    >;
    redisService = module.get(RedisService) as jest.Mocked<RedisService>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRecommendations', () => {
    it('should return cached results if available', async () => {
      const userId = 'user-123';
      const cachedResults = [
        {
          content_id: 'content-1',
          title: 'Test Content',
          tags: ['test'],
          score: 0.8,
          reason: 'Popular',
        },
      ];

      redisService.get.mockResolvedValue(cachedResults);

      const result = await service.getRecommendations(userId, 10);

      expect(result).toEqual(cachedResults);
      expect(redisService.get).toHaveBeenCalled();
    });

    it('should compute recommendations if cache miss', async () => {
      const userId = 'user-123';
      const mockContents: Content[] = [
        {
          id: 'content-1',
          title: 'Test Content',
          description: 'Test',
          creator_id: 'creator-1',
          view_count: 10,
          like_count: 5,
          share_count: 2,
          engagement_score: 0.5,
          created_at: new Date(),
          updated_at: new Date(),
          is_featured: false,
          newness_score: 0.8,
          tags: [{ id: 'tag-1', name: 'test', description: '', usage_count: 1, contents: [] }],
          interactions: [],
        },
      ];

      redisService.get.mockResolvedValue(null);
      contentRepo.find.mockResolvedValue(mockContents);
      userInterestRepo.find.mockResolvedValue([]);

      const result = await service.getRecommendations(userId, 10);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(redisService.set).toHaveBeenCalled();
    });

    it('should return empty array if no contents available', async () => {
      const userId = 'user-123';

      redisService.get.mockResolvedValue(null);
      contentRepo.find.mockResolvedValue([]);

      const result = await service.getRecommendations(userId, 10);

      expect(result).toEqual([]);
    });
  });

  describe('updateContentEngagementScores', () => {
    it('should update engagement scores for all contents', async () => {
      const mockContents: Content[] = [
        {
          id: 'content-1',
          title: 'Test',
          description: '',
          creator_id: 'creator-1',
          view_count: 100,
          like_count: 10,
          share_count: 5,
          engagement_score: 0,
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
          updated_at: new Date(),
          is_featured: false,
          newness_score: 0,
          tags: [],
          interactions: [],
        },
      ];

      contentRepo.find.mockResolvedValue(mockContents);
      contentRepo.save.mockResolvedValue(mockContents[0]);
      redisService.getClient.mockResolvedValue({
        keys: jest.fn().mockResolvedValue([]),
      } as any);

      await service.updateContentEngagementScores();

      expect(contentRepo.save).toHaveBeenCalled();
    });
  });

  describe('clearAllCache', () => {
    it('should clear all recommendation caches', async () => {
      const mockKeys = ['recommendations:user-1:20', 'recommendations:user-2:20'];
      redisService.getClient.mockResolvedValue({
        keys: jest.fn().mockResolvedValue(mockKeys),
      } as any);
      redisService.del.mockResolvedValue(mockKeys.length);

      await service.clearAllCache();

      expect(redisService.del).toHaveBeenCalledWith(mockKeys);
    });
  });
});
