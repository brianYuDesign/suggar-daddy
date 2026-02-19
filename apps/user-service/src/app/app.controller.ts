import { Controller, Get, Logger } from '@nestjs/common';
import { Public } from '@suggar-daddy/auth';
import { AppService } from './app.service';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly appService: AppService) {}

  @Public()
  @Get('health')
  getHealth(): { status: string; service: string } {
    this.logger.log('health check');
    return this.appService.getHealth();
  }
}
