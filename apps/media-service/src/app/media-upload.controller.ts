import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard, OptionalJwtGuard, CurrentUser, type CurrentUserData } from '@suggar-daddy/auth';
import { LocalStorageService } from './storage/local-storage.service';
import { MediaService } from './media.service';
import { imageFileFilter } from './upload/file-filter';

@Controller('media')
export class MediaUploadController {
  constructor(
    private readonly localStorageService: LocalStorageService,
    private readonly mediaService: MediaService,
  ) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 }, fileFilter: imageFileFilter }),
  )
  async upload(
    @CurrentUser() user: CurrentUserData,
    @UploadedFile() file: Express.Multer.File,
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
      originalUrl: url,
      thumbnailUrl: null,
    };
  }

  @Get()
  @UseGuards(OptionalJwtGuard)
  findAll(
    @Query('userId') userId?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    if (userId) {
      return this.mediaService.findByUser(userId, Number(page) || 1, Math.min(Number(limit) || 20, 100));
    }
    return this.mediaService.findAll(Number(page) || 1, Math.min(Number(limit) || 20, 100));
  }

  @Get(':id')
  @UseGuards(OptionalJwtGuard)
  findOne(@Param('id') id: string) {
    return this.mediaService.findOne(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
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
}
