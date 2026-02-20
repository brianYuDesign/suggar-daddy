import { Controller, Post, Get, Body, Param, Req, BadRequestException, Query } from '@nestjs/common';
import { UploadService } from '@/services/upload.service';
import { S3Service } from '@/services/s3.service';
import { InitiateUploadDto, CompleteUploadDto, UploadSessionResponseDto } from '@/dtos/video.dto';

@Controller('api/uploads')
export class UploadController {
  constructor(
    private uploadService: UploadService,
    private s3Service: S3Service,
  ) {}

  @Post('initiate')
  async initiateUpload(
    @Req() req: any,
    @Body() initiateUploadDto: InitiateUploadDto,
  ): Promise<{ session_id: string; chunk_size: number; total_chunks: number }> {
    const creatorId = req.user?.id || 'test-creator-1';
    return await this.uploadService.initiateUpload(creatorId, initiateUploadDto);
  }

  @Get(':sessionId')
  async getUploadSession(
    @Param('sessionId') sessionId: string,
    @Req() req: any,
  ): Promise<UploadSessionResponseDto> {
    const creatorId = req.user?.id || 'test-creator-1';
    const session = await this.uploadService.getUploadSession(sessionId);

    if (!session) {
      throw new BadRequestException(`Upload session ${sessionId} not found`);
    }

    if (session.creator_id !== creatorId) {
      throw new BadRequestException('Not authorized to access this session');
    }

    return {
      id: session.id,
      filename: session.filename,
      file_size: session.file_size,
      chunk_size: session.chunk_size,
      total_chunks: session.total_chunks,
      uploaded_chunks: session.uploaded_chunks,
      is_completed: session.is_completed,
    };
  }

  @Post(':sessionId/chunk')
  async uploadChunk(
    @Param('sessionId') sessionId: string,
    @Query('chunkIndex') chunkIndex: number,
    @Body() chunkData: { data: Buffer },
    @Req() req: any,
  ): Promise<{ uploaded: boolean; chunkIndex: number }> {
    const creatorId = req.user?.id || 'test-creator-1';
    const session = await this.uploadService.getUploadSession(sessionId);

    if (!session) {
      throw new BadRequestException(`Upload session ${sessionId} not found`);
    }

    if (session.creator_id !== creatorId) {
      throw new BadRequestException('Not authorized to access this session');
    }

    await this.uploadService.markChunkUploaded(sessionId, chunkIndex);

    return {
      uploaded: true,
      chunkIndex,
    };
  }

  @Post(':sessionId/complete')
  async completeUpload(
    @Param('sessionId') sessionId: string,
    @Body() completeUploadDto: CompleteUploadDto,
    @Req() req: any,
  ): Promise<{ message: string; video_id: string }> {
    const creatorId = req.user?.id || 'test-creator-1';
    const session = await this.uploadService.getUploadSession(sessionId);

    if (!session) {
      throw new BadRequestException(`Upload session ${sessionId} not found`);
    }

    if (session.creator_id !== creatorId) {
      throw new BadRequestException('Not authorized to access this session');
    }

    const isComplete = await this.uploadService.isUploadComplete(sessionId);
    if (!isComplete) {
      throw new BadRequestException('Not all chunks have been uploaded');
    }

    // Mock S3 key for completed upload
    const s3Key = `videos/uploads/${sessionId}/${session.filename}`;
    await this.uploadService.completeUpload(sessionId, s3Key);

    return {
      message: 'Upload completed successfully',
      video_id: sessionId, // Would return actual video ID
    };
  }
}
