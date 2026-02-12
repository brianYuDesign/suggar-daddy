import { Injectable, Logger } from "@nestjs/common";
import { KafkaProducerService } from "./kafka-producer.service";

/**
 * 死信消息的詳細資訊
 */
export interface DeadLetterMessage {
  /** 原始主題 */
  originalTopic: string;
  /** 原始分區 */
  originalPartition: number;
  /** 原始偏移量 */
  originalOffset: string;
  /** 消息鍵 */
  key: string | null;
  /** 消息值 */
  value: string;
  /** 消息頭 */
  headers: Record<string, string>;
  /** 錯誤信息 */
  error: string;
  /** 重試次數 */
  retryCount: number;
  /** 失敗時間戳 */
  failedAt: Date;
  /** 消費者群組ID */
  consumerGroupId: string;
}

/**
 * Kafka 死信佇列服務
 *
 * 負責處理消費失敗的消息：
 * 1. 記錄失敗消息的詳細資訊
 * 2. 將失敗消息發送到死信主題 (DLQ)
 * 3. 提供查詢和重新處理死信消息的功能
 * 4. 監控和告警機制
 */
@Injectable()
export class KafkaDLQService {
  private readonly logger = new Logger(KafkaDLQService.name);

  /** 死信主題後綴 */
  private readonly DLQ_SUFFIX = ".dlq";

  /** 死信消息計數（用於監控） */
  private dlqMessageCount = new Map<string, number>();

  constructor(private readonly kafkaProducer: KafkaProducerService) {}

  /**
   * 獲取死信主題名稱
   * 例如：user.created -> user.created.dlq
   */
  private getDLQTopic(originalTopic: string): string {
    return `${originalTopic}${this.DLQ_SUFFIX}`;
  }

  /**
   * 發送消息到死信佇列
   *
   * @param message 死信消息詳情
   * @returns 是否成功發送到 DLQ
   */
  async sendToDeadLetterQueue(message: DeadLetterMessage): Promise<boolean> {
    const dlqTopic = this.getDLQTopic(message.originalTopic);

    try {
      // 準備 DLQ 消息，包含完整的故障診斷信息
      const dlqMessage = {
        key: message.key ?? undefined,
        value: JSON.stringify({
          originalTopic: message.originalTopic,
          originalPartition: message.originalPartition,
          originalOffset: message.originalOffset,
          originalValue: message.value,
          error: message.error,
          retryCount: message.retryCount,
          failedAt: message.failedAt.toISOString(),
          consumerGroupId: message.consumerGroupId,
          headers: message.headers,
        }),
        headers: {
          "x-dlq-original-topic": message.originalTopic,
          "x-dlq-retry-count": message.retryCount.toString(),
          "x-dlq-failed-at": message.failedAt.toISOString(),
          "x-dlq-error": message.error.substring(0, 500), // 限制長度
        },
      };

      // 發送到 DLQ 主題
      await this.kafkaProducer.send(dlqTopic, [dlqMessage]);

      // 更新計數器
      const currentCount = this.dlqMessageCount.get(dlqTopic) || 0;
      this.dlqMessageCount.set(dlqTopic, currentCount + 1);

      this.logger.warn(
        `消息已發送到死信佇列 topic=${dlqTopic} ` +
          `originalTopic=${message.originalTopic} ` +
          `retryCount=${message.retryCount} ` +
          `error="${message.error.substring(0, 100)}..."`,
      );

      // 檢查是否需要告警（例如：某個 DLQ 超過閾值）
      await this.checkAlertThreshold(dlqTopic);

      return true;
    } catch (error) {
      this.logger.error(
        `發送消息到死信佇列失敗 topic=${dlqTopic}:`,
        error instanceof Error ? error.message : String(error),
      );
      return false;
    }
  }

  /**
   * 檢查告警閾值
   * 當 DLQ 消息數量超過閾值時記錄警告
   */
  private async checkAlertThreshold(dlqTopic: string): Promise<void> {
    const count = this.dlqMessageCount.get(dlqTopic) || 0;
    const threshold = 100; // 可配置閾值

    if (count >= threshold && count % threshold === 0) {
      this.logger.error(
        `⚠️ 告警：死信佇列消息過多 topic=${dlqTopic} count=${count} ` +
          `請檢查消費者程序和上游服務狀態！`,
      );

      // TODO: 整合告警系統 (Email, Slack, PagerDuty 等)
      // await this.alertService.sendAlert({
      //   level: 'error',
      //   message: `DLQ threshold exceeded for ${dlqTopic}`,
      //   count,
      // });
    }
  }

  /**
   * 獲取死信消息統計
   *
   * @returns 各個 DLQ 主題的消息數量
   */
  getDLQStatistics(): Record<string, number> {
    const stats: Record<string, number> = {};
    this.dlqMessageCount.forEach((count, topic) => {
      stats[topic] = count;
    });
    return stats;
  }

  /**
   * 重置統計計數
   * 通常在監控系統定期讀取後重置
   */
  resetStatistics(): void {
    this.dlqMessageCount.clear();
    this.logger.log("DLQ 統計已重置");
  }

  /**
   * 記錄 DLQ 消息到日誌（用於除錯）
   *
   * @param topic 原始主題
   * @param message 失敗的消息
   * @param error 錯誤信息
   */
  logFailedMessage(topic: string, message: unknown, error: Error): void {
    this.logger.error(
      `消息處理失敗 topic=${topic} ` +
        `message=${JSON.stringify(message).substring(0, 200)} ` +
        `error=${error.message}`,
    );
  }
}
