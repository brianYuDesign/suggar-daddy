import { Controller, Get, Logger } from '@nestjs/common';
import { InjectLogger } from '@suggar-daddy/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  @InjectLogger() private readonly logger!: Logger;

  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth() {
    this.logger.log('health check');
    return this.appService.getHealth();
  }
}
