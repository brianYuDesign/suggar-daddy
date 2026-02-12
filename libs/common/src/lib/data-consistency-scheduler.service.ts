import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import {
  DataConsistencyService,
  ConsistencyCheckConfig,
} from "./data-consistency.service";

/**
 * 定期任務配置
 */
export interface ScheduledCheckConfig {
  /** 實體配置 */
  config: ConsistencyCheckConfig;
  /** Cron 表達式（預設：每天凌晨 3 點） */
  cronExpression?: string;
  /** 是否啟用（預設：true） */
  enabled?: boolean;
}

/**
 * 一致性檢查調度服務
 *
 * 功能：
 * 1. 定期自動執行一致性檢查
 * 2. 支持多個實體類型的調度
 * 3. 提供手動觸發接口
 * 4. 監控和告警
 */
@Injectable()
export class DataConsistencyScheduler {
  private readonly logger = new Logger(DataConsistencyScheduler.name);

  /** 已註冊的調度任務 */
  private scheduledChecks: ScheduledCheckConfig[] = [];

  /** 最後一次檢查時間 */
  private lastCheckTime: Date | null = null;

  /** 告警閾值（不一致數量超過此值則告警，預設：10） */
  private alertThreshold = 10;

  constructor(private readonly consistencyService: DataConsistencyService) {}

  /**
   * 註冊定期檢查任務
   */
  registerScheduledCheck(config: ScheduledCheckConfig): void {
    this.scheduledChecks.push(config);
    this.logger.log(
      `已註冊定期檢查: ${config.config.entityName} ` +
        `(${config.cronExpression ?? "default: 3:00 AM"})`,
    );
  }

  /**
   * 批量註冊多個檢查任務
   */
  registerMultipleChecks(configs: ScheduledCheckConfig[]): void {
    configs.forEach((config) => this.registerScheduledCheck(config));
  }

  /**
   * 每天凌晨 3 點執行一致性檢查（預設調度）
   * 生產環境建議選擇低峰期時段
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async runScheduledChecks(): Promise<void> {
    this.logger.log("開始執行定期一致性檢查...");

    await this.executeAllChecks();

    this.lastCheckTime = new Date();
    this.logger.log("定期一致性檢查完成");
  }

  /**
   * 手動觸發所有檢查
   */
  async runManualCheck(): Promise<{
    total: number;
    fixed: number;
    pending: number;
    details: Record<string, number>;
  }> {
    this.logger.log("手動觸發一致性檢查...");

    await this.executeAllChecks();

    const stats = this.consistencyService.getStatistics();

    return {
      total: stats.total,
      fixed: stats.fixed,
      pending: stats.pending,
      details: stats.byType,
    };
  }

  /**
   * 手動觸發特定實體的檢查
   */
  async runManualCheckForEntity(entityName: string): Promise<{
    entityName: string;
    inconsistenciesFound: number;
    fixed: number;
  }> {
    const config = this.scheduledChecks.find(
      (sc) => sc.config.entityName === entityName,
    );

    if (!config) {
      throw new Error(`未找到實體 ${entityName} 的檢查配置`);
    }

    this.logger.log(`手動檢查實體: ${entityName}`);

    const inconsistencies = await this.consistencyService.checkConsistency(
      config.config,
    );

    return {
      entityName,
      inconsistenciesFound: inconsistencies.length,
      fixed: inconsistencies.filter((i) => i.fixed).length,
    };
  }

  /**
   * 執行所有已註冊的檢查
   */
  private async executeAllChecks(): Promise<void> {
    const enabledChecks = this.scheduledChecks.filter(
      (sc) => sc.enabled !== false,
    );

    if (enabledChecks.length === 0) {
      this.logger.warn("沒有已啟用的檢查任務");
      return;
    }

    this.logger.log(`準備執行 ${enabledChecks.length} 個檢查任務`);

    // 清除之前的記錄
    this.consistencyService.clearInconsistencies();

    // 執行所有檢查
    for (const scheduleConfig of enabledChecks) {
      try {
        await this.consistencyService.checkConsistency(scheduleConfig.config);
      } catch (error: unknown) {
        this.logger.error(
          `檢查 ${scheduleConfig.config.entityName} 時發生錯誤:`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    // 檢查是否需要告警
    await this.checkAndAlert();
  }

  /**
   * 檢查是否需要發送告警
   */
  private async checkAndAlert(): Promise<void> {
    const stats = this.consistencyService.getStatistics();

    if (stats.pending >= this.alertThreshold) {
      this.logger.error(
        `⚠️  數據一致性告警！`,
        `發現 ${stats.pending} 條待修復的不一致（閾值：${this.alertThreshold}）`,
        JSON.stringify(stats.byType, null, 2),
      );

      // TODO: 整合告警系統（Slack, Email, PagerDuty 等）
      // await this.notificationService.sendAlert({
      //   title: '數據一致性告警',
      //   message: `發現 ${stats.pending} 條數據不一致`,
      //   severity: 'high',
      //   details: stats,
      // });
    }
  }

  /**
   * 設置告警閾值
   */
  setAlertThreshold(threshold: number): void {
    this.alertThreshold = threshold;
    this.logger.log(`告警閾值已設置為: ${threshold}`);
  }

  /**
   * 獲取最後一次檢查時間
   */
  getLastCheckTime(): Date | null {
    return this.lastCheckTime;
  }

  /**
   * 獲取已註冊的檢查任務列表
   */
  getScheduledChecks(): Array<{
    entityName: string;
    enabled: boolean;
    cronExpression: string;
  }> {
    return this.scheduledChecks.map((sc) => ({
      entityName: sc.config.entityName,
      enabled: sc.enabled !== false,
      cronExpression: sc.cronExpression ?? CronExpression.EVERY_DAY_AT_3AM,
    }));
  }

  /**
   * 移除特定實體的調度任務
   */
  removeScheduledCheck(entityName: string): boolean {
    const index = this.scheduledChecks.findIndex(
      (sc) => sc.config.entityName === entityName,
    );

    if (index !== -1) {
      this.scheduledChecks.splice(index, 1);
      this.logger.log(`已移除檢查任務: ${entityName}`);
      return true;
    }

    return false;
  }

  /**
   * 啟用/禁用特定調度任務
   */
  toggleScheduledCheck(entityName: string, enabled: boolean): boolean {
    const config = this.scheduledChecks.find(
      (sc) => sc.config.entityName === entityName,
    );

    if (config) {
      config.enabled = enabled;
      this.logger.log(`已${enabled ? "啟用" : "禁用"}檢查任務: ${entityName}`);
      return true;
    }

    return false;
  }
}
