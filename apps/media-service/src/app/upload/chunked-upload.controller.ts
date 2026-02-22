import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  BadRequestException,
  ForbiddenException,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  JwtAuthGuard,
  CurrentUser,
  type CurrentUserData,
} from '@suggar-daddy/auth';
import {
  InitiateUploadDto,
  CompleteUploadDto,
  UploadSessionResponseDto,
} from '@suggar-daddy/dto';
import { ChunkedUploadService } from './chunked-upload.service';

@Controller('media/uploads')
@UseGuards(JwtAuthGuard)
export class ChunkedUploadController {
  private readonly logger = new Logger(ChunkedUploadController.name);

  constructor(private readonly chunkedUploadService: ChunkedUploadService) {}

  @Post('initiate')
  async initiateUpload(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: InitiateUploadDto,
  ): Promise<{ session_id: string; chunk_size: number; total_chunks: number }> {
    return this.chunkedUploadService.initiateUpload(user.userId, dto);
  }

  @Get(':sessionId')
  async getUploadSession(
    @CurrentUser() user: CurrentUserData,
    @Param('sessionId') sessionId: string,
  ): Promise<UploadSessionResponseDto> {
    const session =
      await this.chunkedUploadService.getUploadSession(sessionId);

    if (session.creator_id !== user.userId) {
      throw new ForbiddenException('Not authorized to access this session');
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
    @CurrentUser() user: CurrentUserData,
    @Param('sessionId') sessionId: string,
    @Query('chunkIndex') chunkIndex: number,
  ): Promise<{ uploaded: boolean; chunkIndex: number }> {
    const session =
      await this.chunkedUploadService.getUploadSession(sessionId);

    if (session.creator_id !== user.userId) {
      throw new ForbiddenException('Not authorized to access this session');
    }

    await this.chunkedUploadService.markChunkUploaded(sessionId, chunkIndex);

    return { uploaded: true, chunkIndex };
  }

  @Post(':sessionId/complete')
  async completeUpload(
    @CurrentUser() user: CurrentUserData,
    @Param('sessionId') sessionId: string,
    @Body() dto: CompleteUploadDto,
  ): Promise<{ message: string; video_id: string }> {
    const session =
      await this.chunkedUploadService.getUploadSession(sessionId);

    if (session.creator_id !== user.userId) {
      throw new ForbiddenException('Not authorized to access this session');
    }

    const isComplete =
      await this.chunkedUploadService.isUploadComplete(sessionId);
    if (!isComplete) {
      throw new BadRequestException('Not all chunks have been uploaded');
    }

    const s3Key = `videos/uploads/${sessionId}/${session.filename}`;
    await this.chunkedUploadService.completeUpload(sessionId, s3Key);

    return {
      message: 'Upload completed successfully',
      video_id: sessionId,
    };
  }
}
