/**
 * Admin Service 基礎服務
 */

import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  /** 回傳服務健康狀態 */
  getHealth() {
    return {
      status: 'ok',
      service: 'admin-service',
      timestamp: new Date().toISOString(),
    };
  }
}
