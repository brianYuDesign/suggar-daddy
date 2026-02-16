import {
  Controller,
  Post,
  Delete,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Body,
  Param,
  BadRequestException,
  ForbiddenException,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard, CurrentUser, type CurrentUserData } from '@suggar-daddy/auth';
import {
  UploadService,
  S3Service,
  MEDIA_EVENTS,
} from '@suggar-daddy/common';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { MediaService } from '../media.service';
import { VideoProcessorService } from '../video/video-processor';

@Controller('upload')
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  constructor(
    private readonly uploadService: UploadService,
    private readonly mediaService: MediaService,
    private readonly s3Service: S3Service,
    private readonly videoProcessor: VideoProcessorService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  @Post('single')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadSingle(
    @CurrentUser() user: CurrentUserData,
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const userId = user.userId;
    const result = await this.uploadService.uploadFile(file.buffer, {
      folder: folder || `suggar-daddy/${userId}`,
      resourceType: 'auto',
    });

    const mediaFile = await this.mediaService.create({
      userId,
      originalUrl: result.secure_url,
      fileName: file.originalname || result.public_id,
      mimeType: file.mimetype,
      fileSize: file.size,
      thumbnailUrl: result.resource_type === 'video'
        ? this.uploadService.getVideoThumbnail?.(result.public_id)
        : undefined,
      width: result.width,
      height: result.height,
      duration: result['duration'],
      processingStatus: 'completed',
      metadata: {
        format: result.format,
        resourceType: result.resource_type,
        publicId: result.public_id,
      },
    });

    return {
      id: mediaFile.id,
      url: result.secure_url,
      thumbnailUrl: mediaFile.thumbnailUrl,
      publicId: result.public_id,
      format: result.format,
      resourceType: result.resource_type,
      width: result.width,
      height: result.height,
      size: result.bytes,
    };
  }

  @Post('multiple')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadMultiple(
    @CurrentUser() user: CurrentUserData,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('folder') folder?: string,
  ) {
    if (!files?.length) {
      throw new BadRequestException('files are required');
    }
    const userId = user.userId;
    const results = [];
    for (const file of files) {
      const result = await this.uploadService.uploadFile(file.buffer, {
        folder: folder || `suggar-daddy/${userId}`,
        resourceType: 'auto',
      });
      const mediaFile = await this.mediaService.create({
        userId,
        originalUrl: result.secure_url,
        fileName: file.originalname || result.public_id,
        mimeType: file.mimetype,
        fileSize: file.size,
        metadata: { publicId: result.public_id, format: result.format },
      });
      results.push({ id: mediaFile.id, url: result.secure_url });
    }
    return results;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    const media = await this.mediaService.findOne(id);
    if (media.userId !== user.userId) {
      throw new ForbiddenException('You can only delete your own media');
    }
    await this.mediaService.remove(id);
    return { deleted: id };
  }

  /**
   * Upload a video file to S3 (private bucket).
   * Triggers background processing: thumbnail + 15s preview → Cloudinary.
   */
  @Post('video')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadVideo(
    @CurrentUser() user: CurrentUserData,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    if (!file.mimetype.startsWith('video/')) {
      throw new BadRequestException('File must be a video');
    }

    const userId = user.userId;

    // 1. Write to temp file for ffprobe
    const tmpInputPath = await this.videoProcessor.writeToTemp(file.buffer, '.mp4');

    // 2. Get metadata
    let metadata;
    try {
      metadata = await this.videoProcessor.getMetadata(tmpInputPath);
    } catch (_err) {
      await this.videoProcessor.cleanupTemp(tmpInputPath);
      throw new BadRequestException('Invalid video file — could not read metadata');
    }

    // 3. Create media record (processing status)
    const mediaRecord = await this.mediaService.create({
      userId,
      fileType: 'video',
      originalUrl: '', // Will be S3, not a public URL
      fileName: file.originalname || 'video.mp4',
      mimeType: file.mimetype,
      fileSize: file.size,
      width: metadata.width,
      height: metadata.height,
      duration: metadata.duration,
      processingStatus: 'processing',
      metadata: { codec: metadata.codec },
    });

    const mediaId = mediaRecord.id;
    const s3Key = `videos/${userId}/${mediaId}/original.mp4`;

    // 4. Upload original to S3
    await this.s3Service.uploadVideo(s3Key, file.buffer, file.mimetype);

    // 5. Immediately return
    const response = {
      id: mediaId,
      s3Key,
      processingStatus: 'processing',
      duration: metadata.duration,
      width: metadata.width,
      height: metadata.height,
    };

    // 6. Background processing (fire-and-forget)
    this.processVideoInBackground(mediaId, userId, s3Key, tmpInputPath).catch(
      (err) => this.logger.error(`Background video processing failed mediaId=${mediaId}`, err),
    );

    return response;
  }

  private async processVideoInBackground(
    mediaId: string,
    userId: string,
    s3Key: string,
    tmpInputPath: string,
  ): Promise<void> {
    let thumbnailUrl = '';
    let previewUrl = '';
    let processingStatus: 'ready' | 'failed' = 'ready';

    try {
      // Extract thumbnail (JPEG at 1s mark)
      const tmpThumbPath = tmpInputPath.replace('.mp4', '-thumb.jpg');
      await this.videoProcessor.extractThumbnail(tmpInputPath, tmpThumbPath);

      // Upload thumbnail to Cloudinary (public)
      const fs = await import('fs');
      const thumbBuffer = await fs.promises.readFile(tmpThumbPath);
      const thumbResult = await this.uploadService.uploadFile(thumbBuffer, {
        folder: `suggar-daddy/${userId}/thumbnails`,
        resourceType: 'image',
      });
      thumbnailUrl = thumbResult.secure_url;
      await this.videoProcessor.cleanupTemp(tmpThumbPath);

      // Extract 15s preview clip
      const tmpPreviewPath = tmpInputPath.replace('.mp4', '-preview.mp4');
      await this.videoProcessor.extractPreview(tmpInputPath, tmpPreviewPath, 15);

      // Upload preview to Cloudinary (public, as video)
      const previewBuffer = await fs.promises.readFile(tmpPreviewPath);
      const previewResult = await this.uploadService.uploadFile(previewBuffer, {
        folder: `suggar-daddy/${userId}/previews`,
        resourceType: 'video',
      });
      previewUrl = previewResult.secure_url;
      await this.videoProcessor.cleanupTemp(tmpPreviewPath);

      this.logger.log(`Video processing complete mediaId=${mediaId}`);
    } catch (err) {
      this.logger.error(`Video processing failed mediaId=${mediaId}`, err);
      processingStatus = 'failed';
    } finally {
      await this.videoProcessor.cleanupTemp(tmpInputPath);
    }

    // Update media record in Redis
    try {
      const existing = await this.mediaService.findOne(mediaId);
      await this.mediaService.updateFields(mediaId, {
        thumbnailUrl,
        processedUrl: previewUrl,
        processingStatus,
        metadata: {
          ...(existing.metadata as Record<string, unknown>),
          s3Key,
          thumbnailUrl,
          previewUrl,
        },
      });
    } catch {
      this.logger.warn(`Could not update media record for mediaId=${mediaId}`);
    }

    // Emit Kafka event for content-service to pick up
    await this.kafkaProducer.sendEvent(MEDIA_EVENTS.VIDEO_PROCESSED, {
      mediaId,
      userId,
      s3Key,
      thumbnailUrl,
      previewUrl,
      duration: 0,
      processingStatus,
    });
  }
}
