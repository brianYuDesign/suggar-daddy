import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  root() {
    return {
      service: 'api-gateway',
      message: 'Use /api/v1/auth, /api/v1/users, /api/v1/matching, /api/posts, etc.',
      health: '/health',
    };
  }
}
