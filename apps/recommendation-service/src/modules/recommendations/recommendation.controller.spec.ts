import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { RecommendationController } from './recommendation.controller';
import { RecommendationService } from '../../services/recommendation.service';
import { UserInteraction } from '../../database/entities';

describe('RecommendationController', () => {
  let controller: RecommendationController;
  let recommendationService: jest.Mocked<RecommendationService>;
  let interactionRepo: jest.Mocked<Repository<UserInteraction>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecommendationController],
      providers: [
        {
          provide: RecommendationService,
          useValue: {
            getRecommendations: jest.fn(),
            updateContentEngagementScores: jest.fn(),
            clearAllCache: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserInteraction),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<RecommendationController>(RecommendationController);
    recommendationService = module.get(RecommendationService) as jest.Mocked<RecommendationService>;
    interactionRepo = module.get(getRepositoryToken(UserInteraction)) as jest.Mocked<
      Repository<UserInteraction>
    >;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getRecommendations', () => {
    const mockUser = { userId: 'user-123', email: 'test@test.com' } as any;

    it('should return recommendations for user', async () => {
      const mockRecs = [
        {
          content_id: 'content-1',
          title: 'Test',
          tags: ['tag1'],
          score: 0.8,
          reason: 'Popular',
        },
      ];

      recommendationService.getRecommendations.mockResolvedValue(mockRecs as any);

      const result = await controller.getRecommendations(mockUser, '20');

      expect(result.user_id).toBe('user-123');
      expect(result.count).toBe(1);
      expect(result.recommendations).toEqual(mockRecs);
    });

    it('should throw error if limit is out of range', async () => {
      await expect(controller.getRecommendations(mockUser, '200')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('recordInteraction', () => {
    it('should record user interaction', async () => {
      const dto = {
        user_id: 'user-123',
        content_id: 'content-1',
        interaction_type: 'like' as const,
      };

      const mockInteraction: Partial<UserInteraction> = {
        id: 'interaction-1',
        user_id: dto.user_id,
        content_id: dto.content_id,
        interaction_type: 'like' as any,
        weight: 5,
        created_at: new Date(),
      };

      interactionRepo.create.mockReturnValue(mockInteraction as UserInteraction);
      interactionRepo.save.mockResolvedValue(mockInteraction as UserInteraction);

      await controller.recordInteraction(dto);

      expect(interactionRepo.save).toHaveBeenCalled();
    });

    it('should throw error if required fields missing', async () => {
      const dto = {
        user_id: 'user-123',
        content_id: '',
        interaction_type: 'like' as const,
      };

      await expect(controller.recordInteraction(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('refreshRecommendations', () => {
    it('should refresh recommendations for user', async () => {
      const mockUser = { userId: 'user-123', email: 'test@test.com' } as any;
      const mockRecs = [
        {
          content_id: 'content-1',
          title: 'Test',
          tags: ['tag1'],
          score: 0.8,
          reason: 'Popular',
        },
      ];

      recommendationService.getRecommendations.mockResolvedValue(mockRecs as any);

      const result = await controller.refreshRecommendations(mockUser);

      expect(result.user_id).toBe('user-123');
      expect(result.cache_hit).toBe(false);
      expect(recommendationService.clearAllCache).toHaveBeenCalled();
    });
  });

  describe('updateEngagementScores', () => {
    it('should update engagement scores', async () => {
      recommendationService.updateContentEngagementScores.mockResolvedValue(undefined);

      const result = await controller.updateEngagementScores();

      expect(result.message).toContain('successfully');
      expect(recommendationService.updateContentEngagementScores).toHaveBeenCalled();
    });

    it('should throw error on failure', async () => {
      recommendationService.updateContentEngagementScores.mockRejectedValue(new Error('DB error'));

      await expect(controller.updateEngagementScores()).rejects.toThrow(BadRequestException);
    });
  });

  describe('clearAllCache', () => {
    it('should clear all caches', async () => {
      recommendationService.clearAllCache.mockResolvedValue(undefined);

      const result = await controller.clearAllCache();

      expect(result.message).toContain('cleared');
      expect(recommendationService.clearAllCache).toHaveBeenCalled();
    });
  });
});
