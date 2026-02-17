import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import CircuitBreaker from 'opossum';
import {
  CircuitBreakerConfig,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  toOpossumOptions,
} from './circuit-breaker.config';

/**
 * Circuit Breaker 狀態
 */
export interface CircuitBreakerStatus {
  /** 服務名稱 */
  name: string;
  /** 狀態：open（開啟/熔斷）、closed（關閉/正常）、halfOpen（半開/測試） */
  state: 'open' | 'closed' | 'halfOpen';
  /** 統計資訊 */
  stats: {
    /** 失敗次數 */
    failures: number;
    /** 成功次數 */
    successes: number;
    /** 拒絕次數（熔斷時拒絕的請求） */
    rejects: number;
    /** 超時次數 */
    timeouts: number;
    /** 總請求次數 */
    total: number;
    /** 錯誤率（百分比） */
    errorRate: number;
  };
  /** 配置 */
  config: CircuitBreakerConfig;
}

/**
 * Circuit Breaker 服務
 * 提供統一的熔斷器管理和監控
 */
@Injectable()
export class CircuitBreakerService implements OnModuleInit {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly breakers = new Map<string, CircuitBreaker>();

  async onModuleInit() {
    this.logger.log('Circuit Breaker Service initialized');
  }

  /**
   * 創建或取得 Circuit Breaker
   * @param name 服務名稱（唯一識別）
   * @param action 要保護的非同步函數
   * @param config 配置
   */
  createBreaker<T extends Array<unknown>, R>(
    name: string,
    action: (...args: T) => Promise<R>,
    config: CircuitBreakerConfig = DEFAULT_CIRCUIT_BREAKER_CONFIG
  ): CircuitBreaker<T, R> {
    // 如果已存在，直接返回
    if (this.breakers.has(name)) {
      return this.breakers.get(name) as CircuitBreaker<T, R>;
    }

    // 創建新的 Circuit Breaker
    const options = toOpossumOptions({ ...config, name });
    const breaker = new CircuitBreaker<T, R>(action, options);

    // 註冊事件監聽
    this.registerEventListeners(breaker, name);

    // 保存到 Map
    this.breakers.set(name, breaker);

    this.logger.log(`Circuit Breaker created: ${name}`);
    return breaker;
  }

  /**
   * 包裝函數並自動應用 Circuit Breaker
   * @param name 服務名稱
   * @param action 要保護的函數
   * @param config 配置
   * @param fallback 降級函數（熔斷時執行）
   */
  wrap<T extends Array<unknown>, R>(
    name: string,
    action: (...args: T) => Promise<R>,
    config?: CircuitBreakerConfig,
    fallback?: (...args: T) => Promise<R> | R
  ): (...args: T) => Promise<R> {
    const breaker = this.createBreaker(name, action, config);

    // 設置 fallback
    if (fallback) {
      breaker.fallback(fallback);
    }

    // 返回包裝後的函數
    return (...args: T) => breaker.fire(...args);
  }

  /**
   * 手動執行熔斷器保護的調用
   * @param name 服務名稱
   * @param args 參數
   */
  async fire<T extends Array<unknown>, R>(name: string, ...args: T): Promise<R> {
    const breaker = this.breakers.get(name);
    if (!breaker) {
      throw new Error(`Circuit Breaker not found: ${name}`);
    }
    return breaker.fire(...args) as Promise<R>;
  }

  /**
   * 手動開啟熔斷器（強制熔斷）
   * @param name 服務名稱
   */
  open(name: string): void {
    const breaker = this.breakers.get(name);
    if (breaker) {
      breaker.open();
      this.logger.warn(`Circuit Breaker manually opened: ${name}`);
    }
  }

  /**
   * 手動關閉熔斷器（恢復）
   * @param name 服務名稱
   */
  close(name: string): void {
    const breaker = this.breakers.get(name);
    if (breaker) {
      breaker.close();
      this.logger.log(`Circuit Breaker manually closed: ${name}`);
    }
  }

  /**
   * 取得熔斷器狀態
   * @param name 服務名稱
   */
  getStatus(name: string): CircuitBreakerStatus | null {
    const breaker = this.breakers.get(name);
    if (!breaker) {
      return null;
    }

    const stats = breaker.stats;
    const total = stats.fires;
    const failures = stats.failures + stats.timeouts;
    const successes = stats.successes;
    const errorRate = total > 0 ? (failures / total) * 100 : 0;

    return {
      name,
      state: breaker.opened
        ? 'open'
        : breaker.halfOpen
          ? 'halfOpen'
          : 'closed',
      stats: {
        failures: stats.failures,
        successes: stats.successes,
        rejects: stats.rejects,
        timeouts: stats.timeouts,
        total,
        errorRate: Math.round(errorRate * 100) / 100,
      },
      config: (breaker as any).options as CircuitBreakerConfig,
    };
  }

  /**
   * 取得所有熔斷器狀態
   */
  getAllStatus(): CircuitBreakerStatus[] {
    const statuses: CircuitBreakerStatus[] = [];
    for (const name of this.breakers.keys()) {
      const status = this.getStatus(name);
      if (status) {
        statuses.push(status);
      }
    }
    return statuses;
  }

  /**
   * 清除指定熔斷器的統計資料
   * @param name 服務名稱
   */
  clearStats(name: string): void {
    const breaker = this.breakers.get(name);
    if (breaker) {
      (breaker.stats as any).reset();
      this.logger.log(`Circuit Breaker stats cleared: ${name}`);
    }
  }

  /**
   * 移除熔斷器
   * @param name 服務名稱
   */
  removeBreaker(name: string): void {
    const breaker = this.breakers.get(name);
    if (breaker) {
      breaker.shutdown();
      this.breakers.delete(name);
      this.logger.log(`Circuit Breaker removed: ${name}`);
    }
  }

  /**
   * 關閉所有熔斷器（清理資源）
   */
  shutdown(): void {
    for (const [name, breaker] of this.breakers.entries()) {
      breaker.shutdown();
      this.logger.log(`Circuit Breaker shutdown: ${name}`);
    }
    this.breakers.clear();
  }

  /**
   * 註冊事件監聽器，用於日誌和監控
   */
  private registerEventListeners(breaker: CircuitBreaker, name: string): void {
    // 熔斷器開啟（進入熔斷狀態）
    breaker.on('open', () => {
      this.logger.warn(`🔴 Circuit Breaker OPEN: ${name} - Too many failures, blocking requests`);
    });

    // 熔斷器關閉（恢復正常）
    breaker.on('close', () => {
      this.logger.log(`🟢 Circuit Breaker CLOSED: ${name} - Service recovered`);
    });

    // 熔斷器半開（測試恢復）
    breaker.on('halfOpen', () => {
      this.logger.log(`🟡 Circuit Breaker HALF-OPEN: ${name} - Testing service recovery`);
    });

    // 請求失敗
    breaker.on('failure', (error) => {
      this.logger.error(`❌ Circuit Breaker FAILURE: ${name} - ${error.message}`);
    });

    // 請求成功
    breaker.on('success', () => {
      this.logger.debug(`✅ Circuit Breaker SUCCESS: ${name}`);
    });

    // 請求超時
    breaker.on('timeout', () => {
      this.logger.warn(`⏱️  Circuit Breaker TIMEOUT: ${name}`);
    });

    // 請求被拒絕（熔斷中）
    breaker.on('reject', () => {
      this.logger.warn(`🚫 Circuit Breaker REJECT: ${name} - Request blocked by open circuit`);
    });

    // Fallback 被執行
    breaker.on('fallback', (result) => {
      this.logger.log(`🔄 Circuit Breaker FALLBACK: ${name} - Using fallback response`);
    });

    // 健康檢查（半開時成功）
    (breaker as any).on('health-check-success', () => {
      this.logger.log(`💚 Circuit Breaker HEALTH CHECK SUCCESS: ${name}`);
    });

    // 健康檢查失敗（半開時失敗）
    (breaker as any).on('health-check-failed', (error: Error) => {
      this.logger.warn(`💔 Circuit Breaker HEALTH CHECK FAILED: ${name} - ${error.message}`);
    });
  }
}
