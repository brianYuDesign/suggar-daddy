import { Controller, Get, Post, Delete, Body, Param, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaUploadService } from './media-upload.service';
import { CreateMediaUploadDto } from './dto/media-upload.dto';

@Controller('media')
export class MediaUploadController {
  constructor(private readonly mediaUploadService: MediaUploadService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() createDto: CreateMediaUploadDto,
  ) {
    return this.mediaUploadService.create(createDto);
  }

  @Get()
  findAll(@Query('userId') userId?: string) {
    if (userId) {
      return this.mediaUploadService.findByUser(userId);
    }
    return this.mediaUploadService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.mediaUploadService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.mediaUploadService.remove(id);
  }
}
