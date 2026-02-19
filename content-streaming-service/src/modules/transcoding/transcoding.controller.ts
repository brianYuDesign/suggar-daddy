import { Controller, Get, Param } from '@nestjs/common';
import { TranscodingService } from '@/services/transcoding.service';

@Controller('api/v1/transcoding')
export class TranscodingController {
  constructor(private transcodingService: TranscodingService) {}

  @Get(':jobId/status')
  async getTranscodingStatus(@Param('jobId') jobId: string): Promise<{ status: string; progress: number }> {
    const result = await this.transcodingService.getTranscodingStatus(jobId);
    return {
      status: result.status,
      progress: result.progress,
    };
  }

  @Get(':jobId/logs')
  async getTranscodingLogs(@Param('jobId') jobId: string): Promise<any> {
    // Mock logs
    return {
      jobId,
      logs: [
        'Starting transcoding...',
        'Downloading from S3...',
        'Processing video...',
        '25% completed',
        '50% completed',
        '75% completed',
        'Uploading to S3...',
        'Completed successfully',
      ],
    };
  }
}
