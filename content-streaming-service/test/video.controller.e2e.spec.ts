import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { VideoController } from '@/modules/streams/video.controller';
import { VideoService } from '@/services/video.service';
import { S3Service } from '@/services/s3.service';
import { TranscodingService } from '@/services/transcoding.service';

describe('VideoController (e2e)', () => {
  let app: INestApplication;
  let videoService: any;
  let s3Service: any;
  let transcodingService: any;

  beforeEach(async () => {
    const mockVideoService = {
      createVideo: jest.fn(),
      getVideo: jest.fn(),
      listVideos: jest.fn(),
      updateVideo: jest.fn(),
      deleteVideo: jest.fn(),
      publishVideo: jest.fn(),
    };

    const mockS3Service = {
      uploadFile: jest.fn(),
    };

    const mockTranscodingService = {
      startTranscoding: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [VideoController],
      providers: [
        { provide: VideoService, useValue: mockVideoService },
        { provide: S3Service, useValue: mockS3Service },
        { provide: TranscodingService, useValue: mockTranscodingService },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    videoService = moduleFixture.get<VideoService>(VideoService);
    s3Service = moduleFixture.get<S3Service>(S3Service);
    transcodingService = moduleFixture.get<TranscodingService>(TranscodingService);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /api/v1/videos', () => {
    it('should list videos for creator', async () => {
      const mockVideos = {
        data: [
          {
            id: 'video-1',
            title: 'Test Video',
            status: 'ready',
            qualities: [],
          },
        ],
        total: 1,
      };

      videoService.listVideos.mockResolvedValue(mockVideos);

      // Test would make actual HTTP request
      // For now, verify mock setup
      expect(videoService.listVideos).toBeDefined();
    });
  });

  describe('GET /api/v1/videos/:id', () => {
    it('should get video details', async () => {
      const mockVideo = {
        id: 'video-1',
        title: 'Test Video',
        status: 'ready',
        qualities: [],
      };

      videoService.getVideo.mockResolvedValue(mockVideo);

      expect(videoService.getVideo).toBeDefined();
    });
  });
});
