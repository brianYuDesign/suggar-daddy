import { Controller, Get } from '@nestjs/common';

@Controller('api/v1/quality')
export class QualityController {
  @Get('profiles')
  async getQualityProfiles(): Promise<any> {
    return {
      profiles: [
        {
          name: '720p',
          resolution: '1280x720',
          bitrate: '2500k',
          fps: 30,
          codec: 'h264',
          description: 'High definition - Recommended for desktop',
        },
        {
          name: '480p',
          resolution: '854x480',
          bitrate: '1500k',
          fps: 30,
          codec: 'h264',
          description: 'Standard definition - Good balance',
        },
        {
          name: '360p',
          resolution: '640x360',
          bitrate: '800k',
          fps: 30,
          codec: 'h264',
          description: 'Low bandwidth - Mobile friendly',
        },
        {
          name: '240p',
          resolution: '426x240',
          bitrate: '400k',
          fps: 30,
          codec: 'h264',
          description: 'Minimal bandwidth - Emergency mode',
        },
      ],
    };
  }

  @Get('recommendations')
  async getQualityRecommendations(): Promise<any> {
    return {
      recommendations: {
        wifi: '720p',
        '4g': '480p',
        '3g': '360p',
        '2g': '240p',
      },
    };
  }
}
