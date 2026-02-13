import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  root() {
    return {
      service: 'api-gateway',
      message: 'Use /api/auth, /api/users, /api/matching, /api/posts, etc.',
      health: '/health',
    };
  }
}
