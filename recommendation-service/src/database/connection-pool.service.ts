import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * 熔斷器模式實現
 * 用於保護數據庫連接不被過度使用
 * 
 * 狀態:
 * - CLOSED: 正常運行，請求通過
 * - OPEN: 故障多次，拒絕請求 (快速失敗)
 * - HALF_OPEN: 測試恢復，嘗試一個請求
 */
@Injectable()
export class CircuitBreaker {
  private readonly logger = new Logger('CircuitBreaker');
  
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;

  // 配置
  private readonly failureThreshold = 5;        // 5次故障後打開
  private readonly successThreshold = 2;        // 2次成功後關閉
  private readonly resetTimeout = 60000;        // 60秒後嘗試半開
  private readonly metrics = {
    totalRequests: 0,
    totalFailures: 0,
    totalSuccesses: 0,
  };

  /**
   * 執行受保護的操作
   */
  async execute<T>(
    fn: () => Promise<T>,
    fallback?: T,
    operationName: string = 'database-operation',
  ): Promise<T> {
    this.metrics.totalRequests++;

    // 如果熔斷器打開
    if (this.state === 'OPEN') {
      // 檢查是否應該進入半開狀態
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.logger.log(`🔄 [${operationName}] Attempting recovery (HALF_OPEN)`);
        this.state = 'HALF_OPEN';
        this.failureCount = 0;
        this.successCount = 0;
      } else {
        // 仍在開啟狀態，使用降級方案
        if (fallback) {
          this.logger.warn(`⚠️ [${operationName}] Circuit breaker OPEN, using fallback`);
          return fallback;
        }
        throw new Error(`Circuit breaker is OPEN for ${operationName}`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess(operationName);
      return result;
    } catch (error) {
      this.onFailure(operationName, error);
      
      if (fallback) {
        this.logger.warn(`⚠️ [${operationName}] Operation failed, using fallback`);
        return fallback;
      }
      throw error;
    }
  }

  /**
   * 操作成功
   */
  private onSuccess(operationName: string) {
    this.metrics.totalSuccesses++;
    this.failureCount = 0;

    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      
      if (this.successCount >= this.successThreshold) {
        this.state = 'CLOSED';
        this.successCount = 0;
        this.logger.log(`✅ [${operationName}] Circuit breaker CLOSED (recovered)`);
      }
    }
  }

  /**
   * 操作失敗
   */
  private onFailure(operationName: string, error: Error) {
    this.metrics.totalFailures++;
    this.lastFailureTime = Date.now();
    
    if (this.state === 'HALF_OPEN') {
      // 在半開狀態下失敗，重新打開
      this.state = 'OPEN';
      this.failureCount = 0;
      this.successCount = 0;
      this.logger.error(
        `❌ [${operationName}] Circuit breaker re-opened (recovery failed)`,
        error.message,
      );
      return;
    }

    this.failureCount++;
    this.logger.warn(
      `⚠️ [${operationName}] Failure ${this.failureCount}/${this.failureThreshold}: ${error.message}`,
    );

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.logger.error(
        `🔴 Circuit breaker OPENED after ${this.failureCount} failures`,
      );
    }
  }

  /**
   * 獲取熔斷器狀態
   */
  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextRetryTime:
        this.state === 'OPEN'
          ? new Date(this.lastFailureTime + this.resetTimeout)
          : null,
      metrics: this.metrics,
    };
  }

  /**
   * 手動重置熔斷器
   */
  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.logger.log('🔄 Circuit breaker manually reset');
  }
}

/**
 * 數據庫連接池監控和管理服務
 */
@Injectable()
export class ConnectionPoolService {
  private readonly logger = new Logger('ConnectionPool');
  private readonly circuitBreaker = new CircuitBreaker();
  private poolStats = {
    activeConnections: 0,
    idleConnections: 0,
    waitingRequests: 0,
    totalChecks: 0,
  };

  constructor(private dataSource: DataSource) {
    this.startMonitoring();
  }

  /**
   * 啟動連接池監控
   */
  private startMonitoring() {
    // 每30秒檢查一次連接池狀態
    setInterval(() => {
      this.checkPoolHealth();
    }, 30000);
  }

  /**
   * 檢查連接池健康狀態
   */
  private async checkPoolHealth() {
    try {
      this.poolStats.totalChecks++;

      // 測試數據庫連接
      await this.circuitBreaker.execute(
        async () => {
          const result = await this.dataSource.query('SELECT 1');
          return result;
        },
        [],
        'pool-health-check',
      );

      // 如果連接成功且熔斷器是開的，嘗試恢復
      if (this.circuitBreaker.getState().state === 'HALF_OPEN') {
        this.logger.log('✅ Connection pool health check passed');
      }
    } catch (error) {
      this.logger.error('❌ Connection pool health check failed:', error.message);
    }
  }

  /**
   * 執行受保護的數據庫查詢
   */
  async executeQuery<T>(
    fn: () => Promise<T>,
    fallback?: T,
  ): Promise<T> {
    return this.circuitBreaker.execute(fn, fallback, 'database-query');
  }

  /**
   * 獲取連接池指標
   */
  getMetrics() {
    return {
      ...this.poolStats,
      circuitBreaker: this.circuitBreaker.getState(),
    };
  }

  /**
   * 獲取連接池狀態端點
   */
  getHealthStatus() {
    const cbState = this.circuitBreaker.getState();
    
    return {
      status:
        cbState.state === 'CLOSED'
          ? 'healthy'
          : cbState.state === 'HALF_OPEN'
            ? 'recovering'
            : 'unhealthy',
      circuitBreaker: cbState,
      poolMetrics: this.poolStats,
      recommendations: this.getRecommendations(),
    };
  }

  /**
   * 根據當前狀態生成建議
   */
  private getRecommendations(): string[] {
    const recommendations: string[] = [];
    const cbState = this.circuitBreaker.getState();

    if (cbState.state === 'OPEN') {
      recommendations.push('🔴 Database connection pool is failing');
      recommendations.push('💡 Suggest: Check database health, restart service if necessary');
    }

    if (cbState.state === 'HALF_OPEN') {
      recommendations.push('🟡 Database connection pool is recovering');
      recommendations.push('💡 Suggest: Monitor closely, avoid heavy operations');
    }

    if (cbState.failureCount > 2) {
      recommendations.push(
        `⚠️ ${cbState.failureCount} connection failures detected`,
      );
      recommendations.push('💡 Suggest: Check network connectivity, database resource usage');
    }

    if (this.poolStats.waitingRequests > 5) {
      recommendations.push('⚠️ Connection pool queue is backing up');
      recommendations.push(
        '💡 Suggest: Increase pool size or optimize slow queries',
      );
    }

    return recommendations;
  }

  /**
   * 重置熔斷器 (手動干預)
   */
  resetCircuitBreaker() {
    this.circuitBreaker.reset();
    this.logger.log('🔄 Connection pool circuit breaker reset');
  }
}
