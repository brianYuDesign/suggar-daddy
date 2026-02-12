import { Controller, Get, Query } from '@nestjs/common';
import { MediaService } from './media.service';

@Controller()
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.mediaService.findAll(Number(page) || 1, Math.min(Number(limit) || 20, 100));
  }
}
