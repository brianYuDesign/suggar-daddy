import { Controller, Get, Post, Delete, Body, Param, Query, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '@suggar-daddy/auth';
import { MediaUploadService } from './media-upload.service';
import { CreateMediaUploadDto } from './dto/media-upload.dto';

@Controller('media')
export class MediaUploadController {
  constructor(private readonly mediaUploadService: MediaUploadService) {}

  // ✅ Bug 4 修復: 添加認證保護
  @Post('upload')
  @UseGuards(JwtAuthGuard)
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

  // ✅ Bug 4 修復: 添加認證保護
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.mediaUploadService.remove(id);
  }
}
