# Kafka 死信佇列 (DLQ) 和重試機制使用指南

## 概述

本項目實現了完整的 Kafka 死信佇列（Dead Letter Queue, DLQ）和自動重試機制，用於處理消息消費失敗的場景。

## 核心功能

### 1. 自動重試機制
- **指數退避（Exponential Backoff）**：失敗後等待時間逐漸增加
- **可配置重試次數**：預設 3 次，可自定義
- **智能重試**：記錄每次重試的詳細信息

### 2. 死信佇列 (DLQ)
- **自動路由**：達到最大重試次數後自動發送到 DLQ
- **完整追踪**：保留原始消息、錯誤信息、重試次數等
- **監控告警**：DLQ 消息數量超過閾值時自動告警

### 3. 日誌和監控
- **詳細日誌**：記錄每次處理、重試、失敗的詳細信息
- **統計數據**：追踪各個 DLQ 主題的消息數量
- **告警機制**：可擴展整合 Email、Slack、PagerDuty 等

## 架構設計

```
消息消費 → 處理失敗 → 重試 (指數退避)
                         ↓
                    重試 N 次後
                         ↓
                  發送到 DLQ 主題
                         ↓
                    記錄和告警
```

## 使用方法

### 方法 1：使用 RetryHandler 包裝（推薦）

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { 
  KafkaConsumerService, 
  KafkaRetryStrategy 
} from '@suggar-daddy/kafka';

@Injectable()
export class MyConsumer implements OnModuleInit {
  private readonly logger = new Logger(MyConsumer.name);

  constructor(
    private readonly kafkaConsumer: KafkaConsumerService,
    private readonly retryStrategy: KafkaRetryStrategy,
  ) {}

  async onModuleInit() {
    // 定義消息處理邏輯
    const handler = async (payload) => {
      const event = JSON.parse(payload.message.value.toString());
      
      // 處理消息（可能拋出錯誤）
      await this.processMessage(event);
    };

    // 使用重試策略包裝處理器
    const retryHandler = this.retryStrategy.createRetryHandler(
      handler,
      {
        maxRetries: 3,           // 最大重試 3 次
        initialBackoffMs: 1000,  // 初始等待 1 秒
        backoffMultiplier: 2,    // 指數倍數為 2
        maxBackoffMs: 30000,     // 最大等待 30 秒
      },
      'my-consumer-group'        // 消費者群組 ID
    );

    // 訂閱主題
    await this.kafkaConsumer.subscribe('my.topic', retryHandler);
    await this.kafkaConsumer.startConsuming();
  }

  private async processMessage(event: any): Promise<void> {
    // 實際的業務邏輯
    // 如果處理失敗會拋出錯誤，觸發重試機制
  }
}
```

### 方法 2：手動控制重試流程

```typescript
import { Injectable } from '@nestjs/common';
import { 
  KafkaConsumerService, 
  KafkaRetryStrategy,
  RetryConfig 
} from '@suggar-daddy/kafka';

@Injectable()
export class AdvancedConsumer {
  constructor(
    private readonly kafkaConsumer: KafkaConsumerService,
    private readonly retryStrategy: KafkaRetryStrategy,
  ) {}

  async onModuleInit() {
    await this.kafkaConsumer.subscribe('advanced.topic', async (payload) => {
      const handler = async (p) => {
        const event = JSON.parse(p.message.value.toString());
        await this.complexProcessing(event);
      };

      // 自定義配置
      const config: RetryConfig = {
        maxRetries: 5,              // 重試 5 次
        initialBackoffMs: 2000,     // 初始等待 2 秒
      };

      // 手動調用重試處理
      const result = await this.retryStrategy.processWithRetry(
        payload,
        handler,
        config,
        'advanced-group'
      );

      if (result.success) {
        console.log(`處理成功，重試次數: ${result.retryCount}`);
      } else {
        console.error(`處理失敗，已發送到 DLQ`);
      }
    });
  }
}
```

## DLQ 主題命名規則

原始主題會自動添加 `.dlq` 後綴：

- `user.created` → `user.created.dlq`
- `message.sent` → `message.sent.dlq`
- `payment.processed` → `payment.processed.dlq`

## DLQ 消息格式

發送到 DLQ 的消息包含以下信息：

```json
{
  "originalTopic": "user.created",
  "originalPartition": 0,
  "originalOffset": "12345",
  "originalValue": "{\"userId\":\"123\",\"email\":\"user@example.com\"}",
  "error": "Database connection timeout",
  "retryCount": 3,
  "failedAt": "2026-02-12T12:34:56.789Z",
  "consumerGroupId": "user-service-group",
  "headers": {
    "x-request-id": "abc-123",
    "x-trace-id": "xyz-789"
  }
}
```

消息頭 (Headers) 也會包含關鍵信息：

```
x-dlq-original-topic: user.created
x-dlq-retry-count: 3
x-dlq-failed-at: 2026-02-12T12:34:56.789Z
x-dlq-error: Database connection timeout
```

## 監控和統計

### 獲取 DLQ 統計

```typescript
import { Injectable } from '@nestjs/common';
import { KafkaDLQService } from '@suggar-daddy/kafka';

@Injectable()
export class MonitoringService {
  constructor(private readonly dlqService: KafkaDLQService) {}

  getDLQStats() {
    // 獲取各個 DLQ 主題的消息數量
    const stats = this.dlqService.getDLQStatistics();
    
    console.log('DLQ Statistics:', stats);
    // 輸出：{ 'user.created.dlq': 15, 'payment.processed.dlq': 3 }
    
    return stats;
  }

  resetStats() {
    // 重置統計（通常在監控系統定期讀取後）
    this.dlqService.resetStatistics();
  }
}
```

### 創建監控端點

```typescript
import { Controller, Get } from '@nestjs/common';
import { KafkaDLQService } from '@suggar-daddy/kafka';

@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly dlqService: KafkaDLQService) {}

  @Get('dlq/stats')
  getDLQStatistics() {
    return {
      statistics: this.dlqService.getDLQStatistics(),
      timestamp: new Date().toISOString(),
    };
  }
}
```

## 告警配置

### 告警閾值

預設當單個 DLQ 主題達到 100 條消息時會記錄錯誤日誌。可以在 `KafkaDLQService` 中修改閾值：

```typescript
// kafka-dlq.service.ts
private async checkAlertThreshold(dlqTopic: string): Promise<void> {
  const count = this.dlqMessageCount.get(dlqTopic) || 0;
  const threshold = 100; // 修改此處的閾值
  
  if (count >= threshold && count % threshold === 0) {
    // 發送告警
  }
}
```

### 整合告警系統

可以擴展 `checkAlertThreshold` 方法來整合第三方告警服務：

```typescript
// 示例：整合 Slack 告警
private async checkAlertThreshold(dlqTopic: string): Promise<void> {
  const count = this.dlqMessageCount.get(dlqTopic) || 0;
  const threshold = 100;

  if (count >= threshold && count % threshold === 0) {
    // 發送 Slack 通知
    await this.slackService.sendAlert({
      channel: '#alerts',
      message: `⚠️ DLQ Alert: ${dlqTopic} has ${count} messages`,
      severity: 'high',
    });

    // 或發送 Email
    await this.emailService.sendAlert({
      to: 'ops-team@example.com',
      subject: 'DLQ Alert',
      body: `DLQ ${dlqTopic} has exceeded threshold with ${count} messages`,
    });
  }
}
```

## 重試配置詳解

### 指數退避算法

重試等待時間計算公式：

```
waitTime = min(
  initialBackoffMs * (backoffMultiplier ^ retryAttempt),
  maxBackoffMs
)
```

示例配置：
```typescript
{
  maxRetries: 3,
  initialBackoffMs: 1000,
  backoffMultiplier: 2,
  maxBackoffMs: 30000,
}
```

重試時間表：
- 第 1 次重試：等待 1000ms (1 秒)
- 第 2 次重試：等待 2000ms (2 秒)
- 第 3 次重試：等待 4000ms (4 秒)
- 失敗後發送到 DLQ

## 最佳實踐

### 1. 選擇合適的重試次數

```typescript
// 快速失敗的場景（例如：參數驗證錯誤）
{ maxRetries: 1 }

// 網絡相關錯誤（例如：HTTP 請求超時）
{ maxRetries: 3 }

// 外部服務暫時不可用（例如：數據庫連接）
{ maxRetries: 5, maxBackoffMs: 60000 }
```

### 2. 區分可重試和不可重試錯誤

```typescript
async processMessage(event: any): Promise<void> {
  try {
    await this.businessLogic(event);
  } catch (error) {
    // 不應重試的錯誤（例如：數據格式錯誤）
    if (error instanceof ValidationError) {
      this.logger.error('數據驗證失敗，跳過重試', error);
      throw new Error('SKIP_RETRY: ' + error.message);
    }
    
    // 可以重試的錯誤（例如：網絡超時）
    throw error;
  }
}
```

### 3. 監控 DLQ 並定期處理

建議設置定期任務來檢查和處理 DLQ 消息：

```typescript
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class DLQProcessorService {
  constructor(private readonly dlqService: KafkaDLQService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async checkDLQHealth() {
    const stats = this.dlqService.getDLQStatistics();
    
    // 檢查是否有積壓的 DLQ 消息
    for (const [topic, count] of Object.entries(stats)) {
      if (count > 50) {
        this.logger.warn(
          `DLQ 積壓警告: ${topic} 有 ${count} 條消息待處理`
        );
      }
    }
  }
}
```

### 4. 保持消息冪等性

確保消息處理是冪等的，即使重試多次也不會產生重複效果：

```typescript
async processPayment(event: PaymentEvent): Promise<void> {
  // 檢查是否已經處理過
  const existing = await this.redis.get(`payment:${event.paymentId}`);
  if (existing) {
    this.logger.log(`Payment ${event.paymentId} 已處理，跳過`);
    return;
  }

  // 處理支付
  await this.paymentService.process(event);

  // 標記為已處理
  await this.redis.set(`payment:${event.paymentId}`, 'processed');
}
```

## 故障排除

### 常見問題

**Q: 消息一直重試但從不發送到 DLQ**
A: 檢查 KafkaProducerService 是否正常工作，確保可以發送消息到 DLQ 主題。

**Q: DLQ 消息數量一直增加**
A: 檢查下游服務（數據庫、外部 API）是否正常運行，並查看錯誤日誌定位問題根源。

**Q: 重試等待時間太長**
A: 減小 `maxBackoffMs` 或調整 `backoffMultiplier`。

**Q: 告警通知沒有收到**
A: 確保已經實現並配置告警集成（例如：Slack、Email）。

## 未來改進

- [ ] 支持從 DLQ 重新處理消息的 Admin UI
- [ ] 集成 Prometheus metrics
- [ ] 支持消息過期和自動清理
- [ ] 支持不同錯誤類型的自定義重試策略
- [ ] DLQ 消息的批量重新投遞功能

## 相關文件

- `libs/kafka/src/kafka-dlq.service.ts` - DLQ 核心服務
- `libs/kafka/src/kafka-retry-strategy.service.ts` - 重試策略實現
- `libs/kafka/src/kafka.module.ts` - Kafka 模組配置
