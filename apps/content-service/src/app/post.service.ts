import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PostService {
  private readonly logger = new Logger(PostService.name);

  findAll() {
    this.logger.log('Finding all posts');
    return [];
  }
}