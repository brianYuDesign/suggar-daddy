import { Controller, Post, Get, Logger } from '@nestjs/common';
import { ConsistencyService } from './consistency.service';

/**
 * 一致性管理 API 控制器
 *
 * 提供 Redis 與 DB 之間資料一致性的管理端點：
 * - 手動執行一致性檢查
 * - 自動修復不一致資料
 * - 重試失敗的寫入操作
 * - 查看失敗寫入統計
 * - 查看監控指標
 */
@Controller('consistency')
export class ConsistencyController {
  private readonly logger = new Logger(ConsistencyController.name);

  constructor(private readonly consistencyService: ConsistencyService) {}

  /**
   * 執行一致性檢查
   *
   * 比對 DB 與 Redis 中最近 100 筆使用者和貼文資料，
   * 回傳不一致的記錄清單。
   */
  @Post('check')
  async runConsistencyCheck() {
    this.logger.log('收到一致性檢查請求');
    const result = await this.consistencyService.runConsistencyCheck();
    this.logger.log(
      '一致性檢查完成: 不一致數量=' + result.totalInconsistencies,
    );
    return result;
  }

  /**
   * 自動修復
   *
   * 執行一致性檢查並自動修復所有不一致的資料。
   * 以 DB 為資料來源，將正確資料同步到 Redis。
   */
  @Post('repair')
  async autoRepair() {
    this.logger.log('收到自動修復請求');
    const result = await this.consistencyService.autoRepair();
    this.logger.log(
      '自動修復完成: 已修復=' + result.repaired + ', 錯誤=' + result.errors.length,
    );
    return result;
  }

  /**
   * 重試失敗的寫入操作
   *
   * 手動觸發重試所有待處理的失敗寫入。
   */
  @Post('retry-failed')
  async retryFailedWrites() {
    this.logger.log('收到手動重試失敗寫入請求');
    const result = await this.consistencyService.retryFailedWrites();
    this.logger.log(
      '重試完成: 總計=' + result.retried + ', 成功=' + result.succeeded + ', 失敗=' + result.failed,
    );
    return result;
  }

  /**
   * 查看失敗寫入統計
   *
   * 回傳目前佇列中待處理的失敗寫入數量及詳細記錄。
   */
  @Get('failed-writes')
  async getFailedWriteStats() {
    this.logger.log('查詢失敗寫入統計');
    return this.consistencyService.getFailedWriteStats();
  }

  /**
   * 查看監控指標
   *
   * 回傳失敗寫入統計及上次一致性檢查結果。
   */
  @Get('metrics')
  async getMonitoringMetrics() {
    this.logger.log('查詢監控指標');
    return this.consistencyService.getMonitoringMetrics();
  }
}