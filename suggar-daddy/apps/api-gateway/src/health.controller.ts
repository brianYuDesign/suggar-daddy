import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'api-gateway',
    };
  }

  @Get('ready')
  ready() {
    // TODO: Check dependencies (DB, Redis, Kafka)
    return {
      status: 'ready',
      checks: {
        database: 'ok',
        redis: 'ok',
        kafka: 'ok',
      },
    };
  }
}
