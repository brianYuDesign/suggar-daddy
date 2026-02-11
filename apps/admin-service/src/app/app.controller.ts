/**
 * Admin Service 根控制器
 * 提供健康檢查端點
 */

import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /** 健康檢查 */
  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }
}
