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
import { MediaFilesService } from '../media-files/media-files.service';
import { MediaProducer } from '../events/media.producer';

@Controller('upload')
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly mediaFilesService: MediaFilesService,
    private readonly mediaProducer: MediaProducer,
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

    // Upload to Cloudinary
    const result = await this.uploadService.uploadFile(file.buffer, {
      folder: folder || `suggar-daddy/${userId}`,
      resourceType: 'auto',
    });

    // Save to database
    const mediaFile = await this.mediaFilesService.create({
      userId,
      filename: result.public_id,
      originalName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      storageProvider: 'cloudinary',
      storageUrl: result.secure_url,
      thumbnailUrl: result.resource_type === 'video' 
        ? this.uploadService.getVideoThumbnail(result.public_id)
        : undefined,
      width: result.width,
      height: result.height,
      duration: result.duration,
      uploadStatus: 'completed',
      metadata: {
        format: result.format,
        resourceType: result.resource_type,
        publicId: result.public_id,
      },
    });

    // Emit event
    await this.mediaProducer.emitMediaUploaded({
      mediaId: mediaFile.id,
      userId: mediaFile.userId,
      storageUrl: mediaFile.storageUrl,
      mimeType: mediaFile.mimeType,
      fileSize: mediaFile.fileSize,
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
  @UseInterceptors(FilesInterceptor('files', 10)) // Max 10 files
  async uploadMultiple(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('userId') userId: string,
    @Body('folder') folder?: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    // Upload all files to Cloudinary
    const results = await this.uploadService.uploadMultiple(files, {
      folder: folder || `suggar-daddy/${userId}`,
      resourceType: 'auto',
    });

    // Save all to database and emit events
    const mediaFiles = await Promise.all(
      results.map(async (result, index) => {
        const file = files[index];
        const mediaFile = await this.mediaFilesService.create({
          userId,
          filename: result.public_id,
          originalName: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size,
          storageProvider: 'cloudinary',
          storageUrl: result.secure_url,
          thumbnailUrl: result.resource_type === 'video'
            ? this.uploadService.getVideoThumbnail(result.public_id)
            : undefined,
          width: result.width,
          height: result.height,
          duration: result.duration,
          uploadStatus: 'completed',
          metadata: {
            format: result.format,
            resourceType: result.resource_type,
            publicId: result.public_id,
          },
        });

        await this.mediaProducer.emitMediaUploaded({
          mediaId: mediaFile.id,
          userId: mediaFile.userId,
          storageUrl: mediaFile.storageUrl,
          mimeType: mediaFile.mimeType,
          fileSize: mediaFile.fileSize,
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
      }),
    );

    return mediaFiles;
  }

  @Delete(':id')
  async deleteMedia(@Param('id') id: string) {
    const mediaFile = await this.mediaFilesService.findOne(id);
    
    if (!mediaFile) {
      throw new BadRequestException('Media file not found');
    }

    // Extract public_id from metadata or filename
    const publicId = mediaFile.metadata?.publicId || mediaFile.filename;
    const resourceType = mediaFile.mimeType.startsWith('video/') ? 'video' : 'image';

    // Delete from Cloudinary
    await this.uploadService.deleteFile(publicId, resourceType);

    // Delete from database
    await this.mediaFilesService.remove(id);

    // Emit event
    await this.mediaProducer.emitMediaDeleted(mediaFile.id, mediaFile.userId);

    return { message: 'Media deleted successfully' };
  }
}