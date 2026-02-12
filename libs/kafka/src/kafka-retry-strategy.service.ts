import { Injectable, Logger } from "@nestjs/common";
import { EachMessagePayload } from "kafkajs";
import { KafkaDLQService, DeadLetterMessage } from "./kafka-dlq.service";

/**
 * 重試配置選項
 */
export interface RetryConfig {
  /** 最大重試次數（預設：3） */
  maxRetries?: number;
  /** 初始退避時間（毫秒，預設：1000） */
  initialBackoffMs?: number;
  /** 退避倍數（預設：2，即指數退避） */
  backoffMultiplier?: number;
  /** 最大退避時間（毫秒，預設：30000） */
  maxBackoffMs?: number;
}

/**
 * 消息處理結果
 */
export interface ProcessResult {
  success: boolean;
  error?: Error;
  retryCount: number;
}

/**
 * 帶有重試和死信佇列的消息處理策略
 *
 * 功能：
 * 1. 自動重試失敗的消息（指數退避）
 * 2. 達到最大重試次數後發送到 DLQ
 * 3. 詳細的錯誤日誌和監控
 * 4. 優雅降級（DLQ 失敗不影響主流程）
 */
@Injectable()
export class KafkaRetryStrategy {
  private readonly logger = new Logger(KafkaRetryStrategy.name);

  constructor(private readonly dlqService: KafkaDLQService) {}

  /**
   * 處理消息，帶有重試邏輯
   *
   * @param payload Kafka 消息負載
   * @param handler 消息處理函數
   * @param config 重試配置
   * @param consumerGroupId 消費者群組ID
   * @returns 處理結果
   */
  async processWithRetry(
    payload: EachMessagePayload,
    handler: (payload: EachMessagePayload) => Promise<void>,
    config: RetryConfig = {},
    consumerGroupId: string = "default-group",
  ): Promise<ProcessResult> {
    const {
      maxRetries = 3,
      initialBackoffMs = 1000,
      backoffMultiplier = 2,
      maxBackoffMs = 30000,
    } = config;

    const { topic, partition, message } = payload;
    let retryCount = 0;
    let lastError: Error | null = null;

    // 檢查消息頭是否包含之前的重試次數
    const retryHeader = message.headers?.["x-retry-count"];
    if (retryHeader) {
      retryCount = parseInt(retryHeader.toString(), 10) || 0;
    }

    while (retryCount <= maxRetries) {
      try {
        // 嘗試處理消息
        await handler(payload);

        // 成功處理
        if (retryCount > 0) {
          this.logger.log(
            `消息處理成功（經過 ${retryCount} 次重試） ` +
              `topic=${topic} partition=${partition} offset=${message.offset}`,
          );
        }

        return { success: true, retryCount };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        retryCount++;

        this.logger.warn(
          `消息處理失敗 (嘗試 ${retryCount}/${maxRetries + 1}) ` +
            `topic=${topic} partition=${partition} offset=${message.offset} ` +
            `error="${lastError.message}"`,
        );

        // 如果還沒達到最大重試次數，等待後重試
        if (retryCount <= maxRetries) {
          const backoffMs = Math.min(
            initialBackoffMs * Math.pow(backoffMultiplier, retryCount - 1),
            maxBackoffMs,
          );

          this.logger.log(
            `等待 ${backoffMs}ms 後重試... ` +
              `(重試 ${retryCount}/${maxRetries})`,
          );

          await this.sleep(backoffMs);
        }
      }
    }

    // 達到最大重試次數，發送到 DLQ
    await this.sendToDLQ(payload, lastError!, retryCount, consumerGroupId);

    return { success: false, error: lastError!, retryCount };
  }

  /**
   * 將失敗的消息發送到死信佇列
   */
  private async sendToDLQ(
    payload: EachMessagePayload,
    error: Error,
    retryCount: number,
    consumerGroupId: string,
  ): Promise<void> {
    const { topic, partition, message } = payload;

    // 記錄失敗消息
    this.dlqService.logFailedMessage(topic, message, error);

    // 準備死信消息
    const deadLetterMessage: DeadLetterMessage = {
      originalTopic: topic,
      originalPartition: partition,
      originalOffset: message.offset,
      key: message.key?.toString() || null,
      value: message.value?.toString() || "",
      headers: this.extractHeaders(message.headers),
      error: error.message,
      retryCount,
      failedAt: new Date(),
      consumerGroupId,
    };

    // 發送到 DLQ
    const success =
      await this.dlqService.sendToDeadLetterQueue(deadLetterMessage);

    if (!success) {
      this.logger.error(
        `⚠️ 嚴重：無法發送消息到 DLQ！消息可能丟失 ` +
          `topic=${topic} partition=${partition} offset=${message.offset}`,
      );
      // TODO: 考慮備份到文件系統或其他持久化存儲
    }
  }

  /**
   * 提取消息頭
   */
  private extractHeaders(headers: Record<string, unknown> | undefined): Record<string, string> {
    const result: Record<string, string> = {};

    if (!headers) return result;

    for (const [key, value] of Object.entries(headers)) {
      if (value) {
        result[key] = Buffer.isBuffer(value) ? value.toString() : String(value);
      }
    }

    return result;
  }

  /**
   * 睡眠函數
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 創建帶有自動重試的消息處理器
   *
   * @param handler 原始處理函數
   * @param config 重試配置
   * @param consumerGroupId 消費者群組ID
   * @returns 包裝後的處理函數
   */
  createRetryHandler(
    handler: (payload: EachMessagePayload) => Promise<void>,
    config: RetryConfig = {},
    consumerGroupId: string = "default-group",
  ): (payload: EachMessagePayload) => Promise<void> {
    return async (payload: EachMessagePayload) => {
      const result = await this.processWithRetry(
        payload,
        handler,
        config,
        consumerGroupId,
      );

      if (!result.success) {
        // 記錄最終失敗（已發送到 DLQ）
        this.logger.error(
          `消息最終處理失敗，已發送到 DLQ ` +
            `topic=${payload.topic} ` +
            `partition=${payload.partition} ` +
            `offset=${payload.message.offset} ` +
            `totalRetries=${result.retryCount}`,
        );
      }
    };
  }
}
