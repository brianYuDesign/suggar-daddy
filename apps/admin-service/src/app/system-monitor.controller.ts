/**
 * 系統監控控制器
 * 所有端點僅限 ADMIN 角色存取
 */

import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles, UserRole } from '@suggar-daddy/common';
import { SystemMonitorService } from './system-monitor.service';

@Controller('system')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class SystemMonitorController {
  constructor(private readonly systemMonitorService: SystemMonitorService) {}

  /** GET /api/v1/admin/system/health - 系統健康檢查（Redis + DB） */
  @Get('health')
  getSystemHealth() {
    return this.systemMonitorService.getSystemHealth();
  }

  /** GET /api/v1/admin/system/kafka - Kafka 消費者狀態 */
  @Get('kafka')
  getKafkaStatus() {
    return this.systemMonitorService.getKafkaStatus();
  }

  /** GET /api/v1/admin/system/dlq - DLQ 統計 */
  @Get('dlq')
  getDlqStats() {
    return this.systemMonitorService.getDlqStats();
  }

  /** GET /api/v1/admin/system/consistency - 資料一致性指標 */
  @Get('consistency')
  getConsistencyMetrics() {
    return this.systemMonitorService.getConsistencyMetrics();
  }
}
