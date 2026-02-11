import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';

/** 死信佇列訊息結構 */
export interface DlqMessage {
  id: string;
  originalTopic: string;
  payload: any;
  error: string;
  attempts: number;
  createdAt: string;
  lastAttemptAt: string;
}

/** Redis 鍵名常數 */
const DLQ_LIST_KEY = 'dlq:messages';
const DLQ_MSG_KEY = (id: string) => `dlq:msg:${id}`;
const DLQ_TOPIC = 'dead-letter-queue';
const DLQ_ALERT_THRESHOLD = 100;

@Injectable()
export class DlqService {
  private readonly logger = new Logger(DlqService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  /**
   * 將失敗的訊息加入死信佇列
   * @param originalTopic 原始 Kafka topic
   * @param payload 訊息內容
   * @param error 錯誤訊息
   * @param attempts 已重試次數
   */
  async addToDeadLetterQueue(
    originalTopic: string,
    payload: any,
    error: string,
    attempts: number,
  ): Promise<DlqMessage> {
    const now = new Date().toISOString();
    const id =
      'dlq-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);

    const message: DlqMessage = {
      id,
      originalTopic,
      payload,
      error,
      attempts,
      createdAt: now,
      lastAttemptAt: now,
    };

    const serialized = JSON.stringify(message);

    // 儲存訊息詳情到獨立 key
    await this.redis.set(DLQ_MSG_KEY(id), serialized);

    // 將訊息 ID 推入列表
    await this.redis.lPush(DLQ_LIST_KEY, id);

    // 發送到 dead-letter-queue topic 供監控系統消費
    await this.kafkaProducer.sendEvent(DLQ_TOPIC, message);

    this.logger.warn(
      `訊息已加入死信佇列: id=${id}, topic=${originalTopic}, error=${error}`,
    );

    // 檢查佇列大小，超過閾值時發出警告
    await this.checkQueueSizeAlert();

    return message;
  }

  /**
   * 列出死信佇列中的訊息
   * @param limit 回傳數量上限
   * @param offset 起始偏移量
   */
  async listMessages(limit = 50, offset = 0): Promise<DlqMessage[]> {
    const ids = await this.redis.lRange(
      DLQ_LIST_KEY,
      offset,
      offset + limit - 1,
    );

    const messages: DlqMessage[] = [];
    for (const id of ids) {
      const data = await this.redis.get(DLQ_MSG_KEY(id));
      if (data) {
        messages.push(JSON.parse(data));
      }
    }

    return messages;
  }

  /**
   * 取得單一死信訊息
   * @param id 訊息 ID
   */
  async getMessage(id: string): Promise<DlqMessage | null> {
    const data = await this.redis.get(DLQ_MSG_KEY(id));
    if (!data) {
      return null;
    }
    return JSON.parse(data);
  }

  /**
   * 重試單一死信訊息 — 重新發送到原始 topic
   * @param id 訊息 ID
   */
  async retryMessage(id: string): Promise<boolean> {
    const message = await this.getMessage(id);
    if (!message) {
      this.logger.warn('重試失敗：找不到訊息 id=' + id);
      return false;
    }

    try {
      // 重新發送到原始 topic
      await this.kafkaProducer.sendEvent(
        message.originalTopic,
        message.payload,
      );

      // 更新重試次數與時間
      message.attempts += 1;
      message.lastAttemptAt = new Date().toISOString();
      await this.redis.set(DLQ_MSG_KEY(id), JSON.stringify(message));

      this.logger.log(
        `已重試訊息: id=${id}, topic=${message.originalTopic}`,
      );

      // 重試成功後從佇列中清理
      await this.removeFromList(id);
      await this.redis.del(DLQ_MSG_KEY(id));

      return true;
    } catch (err) {
      // 更新最後嘗試時間與錯誤
      message.attempts += 1;
      message.lastAttemptAt = new Date().toISOString();
      message.error = err instanceof Error ? err.message : String(err);
      await this.redis.set(DLQ_MSG_KEY(id), JSON.stringify(message));

      this.logger.error('重試訊息失敗: id=' + id, err);
      return false;
    }
  }

  /**
   * 重試所有死信佇列中的訊息
   */
  async retryAll(): Promise<{
    total: number;
    succeeded: number;
    failed: number;
  }> {
    const allIds = await this.redis.lRange(DLQ_LIST_KEY, 0, -1);
    let succeeded = 0;
    let failed = 0;

    for (const id of allIds) {
      const result = await this.retryMessage(id);
      if (result) {
        succeeded++;
      } else {
        failed++;
      }
    }

    this.logger.log(
      `批次重試完成: total=${allIds.length}, succeeded=${succeeded}, failed=${failed}`,
    );

    return { total: allIds.length, succeeded, failed };
  }

  /**
   * 刪除單一死信訊息
   * @param id 訊息 ID
   */
  async deleteMessage(id: string): Promise<boolean> {
    const exists = await this.redis.get(DLQ_MSG_KEY(id));
    if (!exists) {
      return false;
    }

    await this.removeFromList(id);
    await this.redis.del(DLQ_MSG_KEY(id));

    this.logger.log('已刪除死信訊息: id=' + id);
    return true;
  }

  /**
   * 清除所有死信佇列訊息
   */
  async purgeAll(): Promise<number> {
    const allIds = await this.redis.lRange(DLQ_LIST_KEY, 0, -1);

    // 刪除每個訊息的獨立 key
    for (const id of allIds) {
      await this.redis.del(DLQ_MSG_KEY(id));
    }

    // 刪除列表本身
    await this.redis.del(DLQ_LIST_KEY);

    this.logger.log('已清除所有死信佇列訊息，共 ' + allIds.length + ' 筆');
    return allIds.length;
  }

  /**
   * 取得死信佇列統計資訊
   */
  async getStats(): Promise<{
    totalMessages: number;
    topicCounts: Record<string, number>;
    oldestMessage: string | null;
    newestMessage: string | null;
  }> {
    const allIds = await this.redis.lRange(DLQ_LIST_KEY, 0, -1);
    const topicCounts: Record<string, number> = {};
    let oldestDate: string | null = null;
    let newestDate: string | null = null;

    for (const id of allIds) {
      const data = await this.redis.get(DLQ_MSG_KEY(id));
      if (data) {
        const msg: DlqMessage = JSON.parse(data);
        topicCounts[msg.originalTopic] =
          (topicCounts[msg.originalTopic] || 0) + 1;

        if (!oldestDate || msg.createdAt < oldestDate) {
          oldestDate = msg.createdAt;
        }
        if (!newestDate || msg.createdAt > newestDate) {
          newestDate = msg.createdAt;
        }
      }
    }

    return {
      totalMessages: allIds.length,
      topicCounts,
      oldestMessage: oldestDate,
      newestMessage: newestDate,
    };
  }

  /**
   * 從 Redis 列表中移除指定 ID（使用 lrem 精確移除）
   */
  private async removeFromList(id: string): Promise<void> {
    await this.redis.getClient().lrem(DLQ_LIST_KEY, 0, id);
  }

  /**
   * 檢查佇列大小並在超過閾值時發出警告
   */
  private async checkQueueSizeAlert(): Promise<void> {
    const allIds = await this.redis.lRange(DLQ_LIST_KEY, 0, -1);
    const size = allIds.length;

    if (size > DLQ_ALERT_THRESHOLD) {
      this.logger.error(
        `死信佇列警告：當前佇列大小 (${size}) 已超過閾值 (${DLQ_ALERT_THRESHOLD})，請儘速處理！`,
      );

      // 發送警告事件到 Kafka 供監控系統處理
      await this.kafkaProducer.sendEvent('dlq.alert', {
        type: 'queue_size_exceeded',
        currentSize: size,
        threshold: DLQ_ALERT_THRESHOLD,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
