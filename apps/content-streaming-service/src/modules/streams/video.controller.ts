import { Controller, Post, Get, Put, Delete, Body, Param, UseInterceptors, UploadedFile, BadRequestException, Req, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VideoService } from '@/services/video.service';
import { S3Service } from '@/services/s3.service';
import { TranscodingService } from '@/services/transcoding.service';
import { CreateVideoDto, UpdateVideoDto, VideoResponseDto, InitiateUploadDto, CompleteUploadDto } from '@/dtos/video.dto';

@Controller('api/videos')
export class VideoController {
  constructor(
    private videoService: VideoService,
    private s3Service: S3Service,
    private transcodingService: TranscodingService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadVideo(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() createVideoDto: CreateVideoDto,
  ): Promise<VideoResponseDto> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const creatorId = req.user?.id || 'test-creator-1';

    // Upload to S3
    const { key, url } = await this.s3Service.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      { creatorId },
    );

    // Create video record
    const video = await this.videoService.createVideo(creatorId, createVideoDto, {
      filename: file.originalname,
      size: file.size,
      s3Key: key,
      mimeType: file.mimetype,
    });

    // Start transcoding
    await this.transcodingService.startTranscoding(video.id, key);

    return video;
  }

  @Get(':id')
  async getVideo(@Param('id') videoId: string, @Req() req: any): Promise<VideoResponseDto> {
    const creatorId = req.user?.id;
    return await this.videoService.getVideo(videoId, creatorId);
  }

  @Get()
  async listVideos(
    @Req() req: any,
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0,
  ): Promise<{ data: VideoResponseDto[]; total: number }> {
    const creatorId = req.user?.id || 'test-creator-1';
    return await this.videoService.listVideos(creatorId, limit, offset);
  }

  @Put(':id')
  async updateVideo(
    @Param('id') videoId: string,
    @Body() updateVideoDto: UpdateVideoDto,
    @Req() req: any,
  ): Promise<VideoResponseDto> {
    const creatorId = req.user?.id || 'test-creator-1';
    return await this.videoService.updateVideo(videoId, creatorId, updateVideoDto);
  }

  @Delete(':id')
  async deleteVideo(@Param('id') videoId: string, @Req() req: any): Promise<{ message: string }> {
    const creatorId = req.user?.id || 'test-creator-1';
    await this.videoService.deleteVideo(videoId, creatorId);
    return { message: 'Video deleted successfully' };
  }

  @Post(':id/publish')
  async publishVideo(@Param('id') videoId: string, @Req() req: any): Promise<VideoResponseDto> {
    const creatorId = req.user?.id || 'test-creator-1';
    return await this.videoService.publishVideo(videoId, creatorId);
  }

  @Get(':id/transcoding-status')
  async getTranscodingStatus(
    @Param('id') videoId: string,
  ): Promise<{ status: string; progress: number }> {
    // Mock implementation - would fetch actual job status
    return {
      status: 'in_progress',
      progress: 75,
    };
  }
}
