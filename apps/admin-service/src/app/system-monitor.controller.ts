/**
 * 系統監控控制器
 * 所有端點僅限 ADMIN 角色存取
 */

import { Controller, Get, Post, Delete, Param, UseGuards, HttpCode } from '@nestjs/common';
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

  /** GET /api/v1/admin/system/dlq/messages - DLQ 訊息列表 */
  @Get('dlq/messages')
  getDlqMessages() {
    return this.systemMonitorService.getDlqMessages();
  }

  /** POST /api/v1/admin/system/dlq/retry/:messageId - 重試單一 DLQ 訊息 */
  @Post('dlq/retry/:messageId')
  @HttpCode(200)
  retryDlqMessage(@Param('messageId') messageId: string) {
    return this.systemMonitorService.retryDlqMessage(messageId);
  }

  /** POST /api/v1/admin/system/dlq/retry-all - 重試所有 DLQ 訊息 */
  @Post('dlq/retry-all')
  @HttpCode(200)
  retryAllDlqMessages() {
    return this.systemMonitorService.retryAllDlqMessages();
  }

  /** DELETE /api/v1/admin/system/dlq/messages/:messageId - 刪除單一 DLQ 訊息 */
  @Delete('dlq/messages/:messageId')
  deleteDlqMessage(@Param('messageId') messageId: string) {
    return this.systemMonitorService.deleteDlqMessage(messageId);
  }

  /** DELETE /api/v1/admin/system/dlq/purge - 清除全部 DLQ 訊息 */
  @Delete('dlq/purge')
  purgeDlqMessages() {
    return this.systemMonitorService.purgeDlqMessages();
  }
}
