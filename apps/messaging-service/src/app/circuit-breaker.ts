/**
 * [N-001] 輕量級斷路器 — 防止 Redis 故障級聯
 *
 * 狀態機：CLOSED → OPEN → HALF_OPEN → CLOSED
 *
 * - CLOSED（正常）：所有請求正常通過，失敗時遞增計數器
 * - OPEN（斷開）：所有請求立即失敗（快速失敗），不打 Redis
 * - HALF_OPEN（半開）：允許一個探測請求通過，成功則切回 CLOSED
 */

import { Logger } from '@nestjs/common';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  /** 斷路器名稱（用於日誌） */
  name: string;
  /** 窗口內允許的最大失敗次數，超過則打開斷路器 (default: 5) */
  failureThreshold?: number;
  /** 失敗計數窗口時間 (ms, default: 30000 = 30s) */
  failureWindow?: number;
  /** 斷路器打開後，多久嘗試半開 (ms, default: 10000 = 10s) */
  resetTimeout?: number;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures: number[] = [];
  private lastOpenTime = 0;

  private readonly name: string;
  private readonly failureThreshold: number;
  private readonly failureWindow: number;
  private readonly resetTimeout: number;
  private readonly logger = new Logger('CircuitBreaker');

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name;
    this.failureThreshold = options.failureThreshold ?? 5;
    this.failureWindow = options.failureWindow ?? 30_000;
    this.resetTimeout = options.resetTimeout ?? 10_000;
  }

  /**
   * 透過斷路器執行操作
   *
   * @param fn - 要保護的非同步操作
   * @param fallback - 斷路器打開時的回退值（選填）
   * @throws 若斷路器打開且無 fallback，拋出 CircuitOpenError
   */
  async execute<T>(fn: () => Promise<T>, fallback?: T): Promise<T> {
    if (this.state === 'OPEN') {
      // 檢查是否可以嘗試半開
      if (Date.now() - this.lastOpenTime >= this.resetTimeout) {
        this.state = 'HALF_OPEN';
        this.logger.log(`[${this.name}] 斷路器 HALF_OPEN — 嘗試探測`);
      } else {
        if (fallback !== undefined) return fallback;
        throw new CircuitOpenError(
          `[${this.name}] 斷路器已打開，服務暫時不可用`,
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.logger.log(`[${this.name}] 斷路器 CLOSED — 探測成功`);
    }
    this.state = 'CLOSED';
    this.failures = [];
  }

  private onFailure(): void {
    const now = Date.now();

    if (this.state === 'HALF_OPEN') {
      // 半開時失敗，直接重新打開
      this.state = 'OPEN';
      this.lastOpenTime = now;
      this.logger.warn(`[${this.name}] 斷路器 OPEN — 半開探測失敗`);
      return;
    }

    // 清除窗口外的失敗記錄
    this.failures = this.failures.filter(
      (t) => now - t < this.failureWindow,
    );
    this.failures.push(now);

    if (this.failures.length >= this.failureThreshold) {
      this.state = 'OPEN';
      this.lastOpenTime = now;
      this.failures = [];
      this.logger.warn(
        `[${this.name}] 斷路器 OPEN — ${this.failureThreshold} 次失敗`,
      );
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

export class CircuitOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitOpenError';
  }
}
