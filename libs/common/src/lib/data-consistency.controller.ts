import { Controller, Get, Post, Param, UseGuards, Query } from "@nestjs/common";
import { JwtAuthGuard } from "@suggar-daddy/auth";
import {
  DataConsistencyService,
  InconsistencyRecord,
} from "./data-consistency.service";
import { DataConsistencyScheduler } from "./data-consistency-scheduler.service";

/**
 * 數據一致性管理 Controller
 *
 * 提供以下 API：
 * - 手動觸發一致性檢查
 * - 查看不一致記錄
 * - 查看統計信息
 * - 管理調度任務
 *
 * ⚠️ 僅供管理員使用，需要認證
 */
@Controller("admin/data-consistency")
@UseGuards(JwtAuthGuard)
export class DataConsistencyController {
  constructor(
    private readonly consistencyService: DataConsistencyService,
    private readonly scheduler: DataConsistencyScheduler,
  ) {}

  /**
   * 獲取所有不一致記錄
   * GET /admin/data-consistency/inconsistencies
   */
  @Get("inconsistencies")
  getInconsistencies(
    @Query("entityType") entityType?: string,
    @Query("type") type?: string,
    @Query("fixed") fixed?: string,
  ): {
    total: number;
    records: InconsistencyRecord[];
  } {
    let records = this.consistencyService.getInconsistencies();

    // 過濾條件
    if (entityType) {
      records = records.filter((r) => r.entityType === entityType);
    }
    if (type) {
      records = records.filter((r) => r.type === type);
    }
    if (fixed !== undefined) {
      const isFixed = fixed === "true";
      records = records.filter((r) => r.fixed === isFixed);
    }

    return {
      total: records.length,
      records,
    };
  }

  /**
   * 獲取統計信息
   * GET /admin/data-consistency/statistics
   */
  @Get("statistics")
  getStatistics(): {
    total: number;
    fixed: number;
    pending: number;
    byType: Record<string, number>;
    lastCheckTime: Date | null;
  } {
    const stats = this.consistencyService.getStatistics();
    const lastCheckTime = this.scheduler.getLastCheckTime();

    return {
      ...stats,
      lastCheckTime,
    };
  }

  /**
   * 手動觸發所有實體的一致性檢查
   * POST /admin/data-consistency/check
   *
   * @returns 檢查結果摘要
   */
  @Post("check")
  async runManualCheck(): Promise<{
    success: boolean;
    message: string;
    total: number;
    fixed: number;
    pending: number;
    details: any;
  }> {
    try {
      const result = await this.scheduler.runManualCheck();

      return {
        success: true,
        message: "一致性檢查完成",
        ...result,
      };
    } catch (error) {
      return {
        success: false,
        message: `檢查失敗: ${error instanceof Error ? error.message : String(error)}`,
        total: 0,
        fixed: 0,
        pending: 0,
        details: null,
      };
    }
  }

  /**
   * 手動觸發特定實體的一致性檢查
   * POST /admin/data-consistency/check/:entityName
   *
   * @param entityName 實體名稱（例如：User, Post）
   * @returns 檢查結果
   */
  @Post("check/:entityName")
  async runManualCheckForEntity(
    @Param("entityName") entityName: string,
  ): Promise<{
    success: boolean;
    message: string;
    entityName: string;
    inconsistenciesFound: number;
    fixed: number;
  }> {
    try {
      const result = await this.scheduler.runManualCheckForEntity(entityName);

      return {
        success: true,
        message: `${entityName} 檢查完成`,
        ...result,
      };
    } catch (error) {
      return {
        success: false,
        message: `檢查失敗: ${error instanceof Error ? error.message : String(error)}`,
        entityName,
        inconsistenciesFound: 0,
        fixed: 0,
      };
    }
  }

  /**
   * 獲取已註冊的調度任務列表
   * GET /admin/data-consistency/scheduled-checks
   */
  @Get("scheduled-checks")
  getScheduledChecks(): Array<{
    entityName: string;
    enabled: boolean;
    cronExpression: string;
  }> {
    return this.scheduler.getScheduledChecks();
  }

  /**
   * 啟用/禁用調度任務
   * POST /admin/data-consistency/scheduled-checks/:entityName/toggle
   *
   * @param entityName 實體名稱
   * @param enabled 是否啟用
   */
  @Post("scheduled-checks/:entityName/toggle")
  toggleScheduledCheck(
    @Param("entityName") entityName: string,
    @Query("enabled") enabled: string,
  ): {
    success: boolean;
    message: string;
  } {
    const isEnabled = enabled === "true";
    const success = this.scheduler.toggleScheduledCheck(entityName, isEnabled);

    return {
      success,
      message: success
        ? `已${isEnabled ? "啟用" : "禁用"}檢查任務: ${entityName}`
        : `未找到檢查任務: ${entityName}`,
    };
  }

  /**
   * 設置告警閾值
   * POST /admin/data-consistency/alert-threshold
   *
   * @param threshold 閾值（不一致數量超過此值則告警）
   */
  @Post("alert-threshold")
  setAlertThreshold(@Query("threshold") threshold: string): {
    success: boolean;
    message: string;
    threshold: number;
  } {
    const thresholdNum = parseInt(threshold, 10);

    if (isNaN(thresholdNum) || thresholdNum < 0) {
      return {
        success: false,
        message: "無效的閾值",
        threshold: 0,
      };
    }

    this.scheduler.setAlertThreshold(thresholdNum);

    return {
      success: true,
      message: `告警閾值已設置為 ${thresholdNum}`,
      threshold: thresholdNum,
    };
  }

  /**
   * 清除不一致記錄
   * POST /admin/data-consistency/clear
   */
  @Post("clear")
  clearInconsistencies(): {
    success: boolean;
    message: string;
  } {
    this.consistencyService.clearInconsistencies();

    return {
      success: true,
      message: "已清除所有不一致記錄",
    };
  }

  /**
   * 健康檢查
   * GET /admin/data-consistency/health
   */
  @Get("health")
  healthCheck(): {
    status: string;
    timestamp: string;
    lastCheckTime: Date | null;
    scheduledChecks: number;
  } {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      lastCheckTime: this.scheduler.getLastCheckTime(),
      scheduledChecks: this.scheduler.getScheduledChecks().length,
    };
  }
}
