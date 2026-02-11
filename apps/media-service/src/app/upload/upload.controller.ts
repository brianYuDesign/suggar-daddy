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
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { UploadService, JwtAuthGuard, CurrentUser } from '@suggar-daddy/common';
import type { CurrentUserData } from '@suggar-daddy/common';
import { MediaService } from '../media.service';

@Controller('upload')
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly mediaService: MediaService,
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
}
