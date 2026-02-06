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
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { UploadService } from '@suggar-daddy/common';
import { MediaService } from '../media.service';

@Controller('upload')
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly mediaService: MediaService,
  ) {}

  @Post('single')
  @UseInterceptors(FileInterceptor('file'))
  async uploadSingle(
    @UploadedFile() file: Express.Multer.File,
    @Body('userId') userId: string,
    @Body('folder') folder?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

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
      duration: result.duration,
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
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadMultiple(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('userId') userId: string,
    @Body('folder') folder?: string,
  ) {
    if (!files?.length || !userId) {
      throw new BadRequestException('files and userId are required');
    }
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
  async delete(@Param('id') id: string, @Body('userId') userId: string) {
    const media = await this.mediaService.findOne(id);
    if (media.userId !== userId) {
      throw new BadRequestException('Forbidden');
    }
    await this.mediaService.remove(id);
    return { deleted: id };
  }
}
