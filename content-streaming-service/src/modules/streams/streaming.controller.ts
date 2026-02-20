import { Controller, Get, Post, Param, BadRequestException, Req } from '@nestjs/common';
import { CloudflareService } from '@/services/cloudflare.service';

export interface StreamPlaylist {
  video_id: string;
  qualities: QualityInfo[];
  default_quality: string;
  hls_url: string;
}

export interface QualityInfo {
  name: string;
  resolution: string;
  bitrate: string;
  url: string;
}

@Controller('api/streaming')
export class StreamingController {
  constructor(private cloudflareService: CloudflareService) {}

  @Get(':videoId/playlist')
  async getStreamingPlaylist(@Param('videoId') videoId: string, @Req() req: any): Promise<StreamPlaylist> {
    // In production, fetch video and qualities from database
    // For now, mock response

    const qualities: QualityInfo[] = [
      {
        name: '720p',
        resolution: '1280x720',
        bitrate: '2500k',
        url: await this.cloudflareService.generatePlaylistUrl(
          `videos/transcoded/${videoId}/720p/video.mp4`,
          '720p',
        ),
      },
      {
        name: '480p',
        resolution: '854x480',
        bitrate: '1500k',
        url: await this.cloudflareService.generatePlaylistUrl(
          `videos/transcoded/${videoId}/480p/video.mp4`,
          '480p',
        ),
      },
      {
        name: '360p',
        resolution: '640x360',
        bitrate: '800k',
        url: await this.cloudflareService.generatePlaylistUrl(
          `videos/transcoded/${videoId}/360p/video.mp4`,
          '360p',
        ),
      },
      {
        name: '240p',
        resolution: '426x240',
        bitrate: '400k',
        url: await this.cloudflareService.generatePlaylistUrl(
          `videos/transcoded/${videoId}/240p/video.mp4`,
          '240p',
        ),
      },
    ];

    return {
      video_id: videoId,
      qualities,
      default_quality: '720p',
      hls_url: `https://cdn.example.com/hls/${videoId}/playlist.m3u8`,
    };
  }

  @Post(':videoId/quality-switch')
  async switchQuality(
    @Param('videoId') videoId: string,
    @Req() req: any,
  ): Promise<{ message: string; quality: string }> {
    // Track quality switches for analytics
    const quality = req.query?.quality || '720p';

    return {
      message: 'Quality switched successfully',
      quality,
    };
  }

  @Get(':videoId/analytics')
  async getStreamingAnalytics(@Param('videoId') videoId: string): Promise<any> {
    return {
      video_id: videoId,
      total_views: Math.floor(Math.random() * 100000),
      average_watch_time: Math.floor(Math.random() * 3600),
      quality_distribution: {
        '720p': 40,
        '480p': 35,
        '360p': 20,
        '240p': 5,
      },
      bandwidth_saved_by_cdn: '2.5TB',
    };
  }
}
