import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@/config/config.service';
import { TranscodingJobStatus } from '@/entities/transcoding-job.entity';

export interface TranscodingResult {
  quality: string;
  s3Key: string;
  fileSize: number;
  metadata: Record<string, any>;
}

@Injectable()
export class TranscodingService {
  private queue: Map<string, { videoId: string; status: TranscodingJobStatus }> = new Map();

  constructor(private configService: ConfigService) {}

  async startTranscoding(
    videoId: string,
    s3Key: string,
  ): Promise<{ jobIds: string[]; estimatedTime: number }> {
    const config = this.configService.getTranscoding();

    if (!config.enabled) {
      throw new BadRequestException('Transcoding is disabled');
    }

    const qualities = config.qualities;
    const jobIds: string[] = [];

    for (const quality of qualities) {
      const jobId = `${videoId}-${quality.name}-${Date.now()}`;
      this.queue.set(jobId, { videoId, status: TranscodingJobStatus.PENDING });
      jobIds.push(jobId);
    }

    // Simulate transcoding queue processing
    this.processTranscodingQueue();

    return {
      jobIds,
      estimatedTime: 300, // 5 minutes estimate
    };
  }

  async getTranscodingStatus(jobId: string): Promise<{ status: TranscodingJobStatus; progress: number }> {
    const job = this.queue.get(jobId);

    if (!job) {
      throw new BadRequestException(`Transcoding job ${jobId} not found`);
    }

    return {
      status: job.status,
      progress: job.status === TranscodingJobStatus.COMPLETED ? 100 : 50,
    };
  }

  private async processTranscodingQueue(): Promise<void> {
    // Mock implementation - in production, this would:
    // 1. Pick jobs from queue
    // 2. Download video from S3
    // 3. Run FFmpeg for each quality
    // 4. Upload transcoded versions to S3
    // 5. Update database with results

    // For now, simulate completion after delay
    setTimeout(() => {
      for (const [jobId, job] of this.queue.entries()) {
        if (job.status === TranscodingJobStatus.PENDING) {
          job.status = TranscodingJobStatus.IN_PROGRESS;
        }
      }
    }, 1000);

    setTimeout(() => {
      for (const [jobId, job] of this.queue.entries()) {
        if (job.status === TranscodingJobStatus.IN_PROGRESS) {
          job.status = TranscodingJobStatus.COMPLETED;
        }
      }
    }, 5000);
  }

  async mockTranscode(
    videoId: string,
    quality: string,
    width: number,
    height: number,
  ): Promise<TranscodingResult> {
    // Mock FFmpeg result
    return {
      quality,
      s3Key: `videos/transcoded/${videoId}/${quality}/video.mp4`,
      fileSize: Math.floor(Math.random() * 1000000000), // Random size
      metadata: {
        width,
        height,
        duration: 300,
        bitrate: '2500k',
        codec: 'h264',
      },
    };
  }
}
