import { TranscodingService } from '@/services/transcoding.service';
import { ConfigService } from '@/config/config.service';
import { BadRequestException } from '@nestjs/common';

describe('TranscodingService', () => {
  let service: TranscodingService;
  let mockConfigService: any;

  beforeEach(() => {
    mockConfigService = {
      getTranscoding: jest.fn().mockReturnValue({
        enabled: true,
        qualities: [
          { name: '720p', resolution: '1280x720', bitrate: '2500k', fps: 30, codec: 'h264' },
          { name: '480p', resolution: '854x480', bitrate: '1500k', fps: 30, codec: 'h264' },
          { name: '360p', resolution: '640x360', bitrate: '800k', fps: 30, codec: 'h264' },
          { name: '240p', resolution: '426x240', bitrate: '400k', fps: 30, codec: 'h264' },
        ],
        timeout: 3600000,
        maxConcurrent: 2,
      }),
    };

    service = new TranscodingService(mockConfigService);
  });

  describe('startTranscoding', () => {
    it('should initiate transcoding for a video', async () => {
      const result = await service.startTranscoding('video-1', 's3://bucket/video.mp4');

      expect(result.jobIds).toHaveLength(4); // 4 qualities
      expect(result.estimatedTime).toBeGreaterThan(0);
    });

    it('should throw error if transcoding is disabled', async () => {
      mockConfigService.getTranscoding.mockReturnValue({
        enabled: false,
      });

      const disabledService = new TranscodingService(mockConfigService);

      await expect(disabledService.startTranscoding('video-1', 's3://bucket/video.mp4')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('mockTranscode', () => {
    it('should return mock transcoding result', async () => {
      const result = await service.mockTranscode('video-1', '720p', 1280, 720);

      expect(result.quality).toBe('720p');
      expect(result.s3Key).toContain('video-1');
      expect(result.fileSize).toBeGreaterThan(0);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.width).toBe(1280);
      expect(result.metadata.height).toBe(720);
    });
  });
});
