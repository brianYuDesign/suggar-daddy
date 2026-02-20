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
import { MEDIA_EVENTS } from '@suggar-daddy/common';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { MediaService } from '../media.service';
import { VideoProcessorService } from '../video/video-processor';
import { LocalStorageService } from '../storage/local-storage.service';

@Controller('upload')
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  constructor(
    private readonly localStorageService: LocalStorageService,
    private readonly mediaService: MediaService,
    private readonly videoProcessor: VideoProcessorService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  @Post('single')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }),
  )
  async uploadSingle(
    @CurrentUser() user: CurrentUserData,
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') _folder?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const userId = user.userId;
    const relativePath = await this.localStorageService.saveFile(
      file.buffer,
      userId,
      file.originalname,
    );
    const url = this.localStorageService.getPublicUrl(relativePath);

    const mediaFile = await this.mediaService.create({
      userId,
      originalUrl: url,
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      processingStatus: 'completed',
      metadata: { storagePath: relativePath },
    });

    return {
      id: mediaFile.id,
      url,
      thumbnailUrl: null,
      format: file.mimetype.split('/')[1],
      resourceType: file.mimetype.split('/')[0],
      width: null,
      height: null,
      size: file.size,
    };
  }

  @Post('multiple')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('files', 10, { limits: { fileSize: 50 * 1024 * 1024 } }),
  )
  async uploadMultiple(
    @CurrentUser() user: CurrentUserData,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('folder') _folder?: string,
  ) {
    if (!files?.length) {
      throw new BadRequestException('files are required');
    }
    const userId = user.userId;
    const results = [];
    for (const file of files) {
      const relativePath = await this.localStorageService.saveFile(
        file.buffer,
        userId,
        file.originalname,
      );
      const url = this.localStorageService.getPublicUrl(relativePath);
      const mediaFile = await this.mediaService.create({
        userId,
        originalUrl: url,
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        metadata: { storagePath: relativePath },
      });
      results.push({ id: mediaFile.id, url });
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
    const metadata = media.metadata as Record<string, unknown>;
    if (metadata?.storagePath) {
      await this.localStorageService.deleteFile(metadata.storagePath as string);
    }
    await this.mediaService.remove(id);
    return { deleted: id };
  }

  /**
   * Upload a video file to local storage.
   * Triggers background processing: thumbnail + 15s preview.
   */
  @Post('video')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }),
  )
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
      originalUrl: '',
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
    const ext = '.' + (file.originalname?.split('.').pop() || 'mp4');

    // 4. Save original to local storage
    const originalPath = await this.localStorageService.saveVideoOriginal(
      file.buffer,
      userId,
      mediaId,
      ext,
    );
    const originalUrl = this.localStorageService.getPublicUrl(originalPath);

    // Update with the original URL
    await this.mediaService.updateFields(mediaId, {
      metadata: { codec: metadata.codec, storagePath: originalPath },
    });

    // 5. Immediately return
    const response = {
      id: mediaId,
      url: originalUrl,
      processingStatus: 'processing',
      duration: metadata.duration,
      width: metadata.width,
      height: metadata.height,
    };

    // 6. Background processing (fire-and-forget)
    this.processVideoInBackground(mediaId, userId, originalPath, tmpInputPath).catch(
      (err) => this.logger.error(`Background video processing failed mediaId=${mediaId}`, err),
    );

    return response;
  }

  private async processVideoInBackground(
    mediaId: string,
    userId: string,
    originalPath: string,
    tmpInputPath: string,
  ): Promise<void> {
    let thumbnailUrl = '';
    let previewUrl = '';
    let processingStatus: 'ready' | 'failed' = 'ready';

    try {
      const fs = await import('fs');

      // Extract thumbnail (JPEG at 1s mark)
      const tmpThumbPath = tmpInputPath.replace('.mp4', '-thumb.jpg');
      await this.videoProcessor.extractThumbnail(tmpInputPath, tmpThumbPath);

      const thumbBuffer = await fs.promises.readFile(tmpThumbPath);
      const thumbPath = await this.localStorageService.saveThumbnail(thumbBuffer, userId, mediaId);
      thumbnailUrl = this.localStorageService.getPublicUrl(thumbPath);
      await this.videoProcessor.cleanupTemp(tmpThumbPath);

      // Extract 15s preview clip
      const tmpPreviewPath = tmpInputPath.replace('.mp4', '-preview.mp4');
      await this.videoProcessor.extractPreview(tmpInputPath, tmpPreviewPath, 15);

      const previewBuffer = await fs.promises.readFile(tmpPreviewPath);
      const previewPath = await this.localStorageService.savePreview(previewBuffer, userId, mediaId);
      previewUrl = this.localStorageService.getPublicUrl(previewPath);
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
          storagePath: originalPath,
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
      thumbnailUrl,
      previewUrl,
      duration: 0,
      processingStatus,
    });
  }
}
