import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { VideoService } from '@/services/video.service';
import { Video, VideoStatus } from '@/entities/video.entity';
import { VideoQuality } from '@/entities/video-quality.entity';
import { CreateVideoDto, UpdateVideoDto } from '@/dtos/video.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('VideoService', () => {
  let service: VideoService;
  let mockVideoRepository: any;
  let mockQualityRepository: any;

  beforeEach(async () => {
    mockVideoRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    mockQualityRepository = {
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideoService,
        {
          provide: getRepositoryToken(Video),
          useValue: mockVideoRepository,
        },
        {
          provide: getRepositoryToken(VideoQuality),
          useValue: mockQualityRepository,
        },
      ],
    }).compile();

    service = module.get<VideoService>(VideoService);
  });

  describe('createVideo', () => {
    it('should create a new video', async () => {
      const createVideoDto: CreateVideoDto = {
        title: 'Test Video',
        description: 'Test Description',
      };

      const uploadedFile = {
        filename: 'test.mp4',
        size: 1000,
        s3Key: 's3://bucket/test.mp4',
        mimeType: 'video/mp4',
      };

      const mockVideo = {
        id: 'video-1',
        creator_id: 'creator-1',
        ...createVideoDto,
        ...uploadedFile,
        status: VideoStatus.PROCESSING,
        qualities: [],
      };

      mockVideoRepository.create.mockReturnValue(mockVideo);
      mockVideoRepository.save.mockResolvedValue(mockVideo);

      const result = await service.createVideo('creator-1', createVideoDto, uploadedFile);

      expect(mockVideoRepository.create).toHaveBeenCalled();
      expect(mockVideoRepository.save).toHaveBeenCalled();
      expect(result.id).toBe('video-1');
      expect(result.title).toBe('Test Video');
    });
  });

  describe('getVideo', () => {
    it('should return a video by id', async () => {
      const mockVideo = {
        id: 'video-1',
        creator_id: 'creator-1',
        title: 'Test Video',
        status: VideoStatus.READY,
        qualities: [],
      };

      mockVideoRepository.findOne.mockResolvedValue(mockVideo);

      const result = await service.getVideo('video-1');

      expect(mockVideoRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'video-1' },
        relations: ['qualities'],
      });
      expect(result.id).toBe('video-1');
    });

    it('should throw NotFoundException if video not found', async () => {
      mockVideoRepository.findOne.mockResolvedValue(null);

      await expect(service.getVideo('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateVideo', () => {
    it('should update a video', async () => {
      const updateVideoDto: UpdateVideoDto = {
        title: 'Updated Title',
      };

      const mockVideo = {
        id: 'video-1',
        creator_id: 'creator-1',
        title: 'Old Title',
        qualities: [],
      };

      mockVideoRepository.findOne.mockResolvedValue(mockVideo);
      mockVideoRepository.save.mockResolvedValue({
        ...mockVideo,
        ...updateVideoDto,
      });

      const result = await service.updateVideo('video-1', 'creator-1', updateVideoDto);

      expect(mockVideoRepository.save).toHaveBeenCalled();
      expect(result.title).toBe('Updated Title');
    });

    it('should throw error if not creator', async () => {
      const mockVideo = {
        id: 'video-1',
        creator_id: 'creator-1',
        title: 'Test',
      };

      mockVideoRepository.findOne.mockResolvedValue(mockVideo);

      await expect(
        service.updateVideo('video-1', 'different-creator', {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('publishVideo', () => {
    it('should publish a ready video', async () => {
      const mockVideo = {
        id: 'video-1',
        creator_id: 'creator-1',
        status: VideoStatus.READY,
        is_published: false,
        qualities: [],
      };

      mockVideoRepository.findOne.mockResolvedValue(mockVideo);
      mockVideoRepository.save.mockResolvedValue({
        ...mockVideo,
        is_published: true,
      });

      const result = await service.publishVideo('video-1', 'creator-1');

      expect(result.is_published).toBe(true);
    });

    it('should throw error if video is not ready', async () => {
      const mockVideo = {
        id: 'video-1',
        creator_id: 'creator-1',
        status: VideoStatus.PROCESSING,
        qualities: [],
      };

      mockVideoRepository.findOne.mockResolvedValue(mockVideo);

      await expect(service.publishVideo('video-1', 'creator-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
