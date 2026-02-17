import { Injectable, Logger } from '@nestjs/common';

// 使用 @InjectLogger 裝飾器（從父目錄導入）
function InjectLogger() {
  return function (target: any, propertyKey: string) {
    Object.defineProperty(target, propertyKey, {
      get() {
        if (!this._logger) {
          this._logger = new Logger(this.constructor.name);
        }
        return this._logger;
      },
      enumerable: true,
      configurable: true,
    });
  };
}

/**
 * Payment Metrics Service
 * 
 * Collects and exposes Prometheus metrics for payment operations
 * Focus: Orphan transaction detection and monitoring
 */
@Injectable()
export class PaymentMetricsService {
  @InjectLogger() private readonly logger!: Logger;

  // In-memory metrics store
  private metrics = {
    orphanTransactionsDetected: 0,
    orphanTransactionProcessingFailures: 0,
    orphanTransactionProcessingDelaySeconds: 0,
    lastOrphanDetectionTime: Date.now(),
    transactionsByStatus: {
      pending: 0,
      succeeded: 0,
      failed: 0,
      refunded: 0,
    },
  };

  /**
   * 記錄檢測到的孤兒交易
   */
  recordOrphanTransactionDetected(transactionId: string, metadata?: Record<string, any>): void {
    this.metrics.orphanTransactionsDetected++;
    this.metrics.lastOrphanDetectionTime = Date.now();
    
    this.logger.warn('Orphan transaction detected', {
      transactionId,
      totalOrphans: this.metrics.orphanTransactionsDetected,
      ...metadata,
    });
  }

  /**
   * 記錄孤兒交易處理失敗
   */
  recordOrphanProcessingFailure(transactionId: string, error: Error): void {
    this.metrics.orphanTransactionProcessingFailures++;
    
    this.logger.error('Orphan transaction processing failed', {
      transactionId,
      error: error.message,
      totalFailures: this.metrics.orphanTransactionProcessingFailures,
    });
  }

  /**
   * 記錄孤兒交易處理延遲
   */
  recordOrphanProcessingDelay(delaySeconds: number): void {
    this.metrics.orphanTransactionProcessingDelaySeconds = delaySeconds;
    
    if (delaySeconds > 300) {
      this.logger.warn('High orphan transaction processing delay', {
        delaySeconds,
        delayMinutes: Math.floor(delaySeconds / 60),
      });
    }
  }

  /**
   * 記錄交易狀態變更
   */
  recordTransactionStatus(status: 'pending' | 'succeeded' | 'failed' | 'refunded'): void {
    if (status in this.metrics.transactionsByStatus) {
      this.metrics.transactionsByStatus[status]++;
    }
  }

  /**
   * 獲取孤兒交易檢測頻率 (每分鐘)
   */
  getOrphanDetectionRate(): number {
    const now = Date.now();
    const timeSinceLastDetection = (now - this.metrics.lastOrphanDetectionTime) / 1000 / 60;
    return timeSinceLastDetection > 0 
      ? this.metrics.orphanTransactionsDetected / timeSinceLastDetection 
      : 0;
  }

  /**
   * 導出 Prometheus 格式的 metrics
   */
  exportPrometheusMetrics(): string {
    const lines: string[] = [];

    lines.push('# HELP orphan_transactions_detected_total Total number of orphan transactions detected');
    lines.push('# TYPE orphan_transactions_detected_total counter');
    lines.push(`orphan_transactions_detected_total ${this.metrics.orphanTransactionsDetected}`);

    lines.push('# HELP orphan_transaction_processing_failures_total Total number of orphan transaction processing failures');
    lines.push('# TYPE orphan_transaction_processing_failures_total counter');
    lines.push(`orphan_transaction_processing_failures_total ${this.metrics.orphanTransactionProcessingFailures}`);

    lines.push('# HELP orphan_transaction_processing_delay_seconds Current orphan transaction processing delay');
    lines.push('# TYPE orphan_transaction_processing_delay_seconds gauge');
    lines.push(`orphan_transaction_processing_delay_seconds ${this.metrics.orphanTransactionProcessingDelaySeconds}`);

    lines.push('# HELP payment_transactions_total Total number of payment transactions by status');
    lines.push('# TYPE payment_transactions_total counter');
    for (const [status, count] of Object.entries(this.metrics.transactionsByStatus)) {
      lines.push(`payment_transactions_total{status="${status}"} ${count}`);
    }

    lines.push('# HELP orphan_detection_rate_per_minute Current rate of orphan transaction detection per minute');
    lines.push('# TYPE orphan_detection_rate_per_minute gauge');
    lines.push(`orphan_detection_rate_per_minute ${this.getOrphanDetectionRate().toFixed(4)}`);

    return lines.join('\n') + '\n';
  }

  /**
   * 獲取所有 metrics 數據（JSON 格式）
   */
  getMetrics() {
    return {
      orphanTransactions: {
        detected: this.metrics.orphanTransactionsDetected,
        processingFailures: this.metrics.orphanTransactionProcessingFailures,
        processingDelaySeconds: this.metrics.orphanTransactionProcessingDelaySeconds,
        detectionRatePerMinute: this.getOrphanDetectionRate(),
        lastDetectionTime: new Date(this.metrics.lastOrphanDetectionTime).toISOString(),
      },
      transactions: {
        byStatus: this.metrics.transactionsByStatus,
      },
    };
  }

  /**
   * 重置 metrics（僅用於測試）
   */
  resetMetrics(): void {
    this.metrics = {
      orphanTransactionsDetected: 0,
      orphanTransactionProcessingFailures: 0,
      orphanTransactionProcessingDelaySeconds: 0,
      lastOrphanDetectionTime: Date.now(),
      transactionsByStatus: {
        pending: 0,
        succeeded: 0,
        failed: 0,
        refunded: 0,
      },
    };
    this.logger.log('Metrics reset');
  }
}
