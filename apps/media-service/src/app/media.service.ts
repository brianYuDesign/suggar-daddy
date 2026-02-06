import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  findAll() {
    this.logger.log('Finding all media files');
    return [];
  }
}