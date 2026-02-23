import { Controller, Get, Logger } from '@nestjs/common';
import { InjectLogger } from '@suggar-daddy/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  @InjectLogger() private readonly logger!: Logger;

  constructor(private readonly appService: AppService) {}

  /** [N-002] 深度健康檢查（Redis、Kafka、WebSocket） */
  @Get('health')
  async getHealth() {
    return this.appService.getHealth();
  }
}
