# Jaeger 分散式追蹤系統完整指南

## 📖 目錄

- [概述](#概述)
- [架構設計](#架構設計)
- [快速開始](#快速開始)
- [OpenTelemetry 整合](#opentelemetry-整合)
- [使用指南](#使用指南)
- [自定義 Span](#自定義-span)
- [效能影響分析](#效能影響分析)
- [生產環境配置](#生產環境配置)
- [常見問題排查](#常見問題排查)

---

## 概述

### 什麼是分散式追蹤？

分散式追蹤（Distributed Tracing）是一種監控和診斷微服務架構的方法，它可以追蹤單個請求在多個服務之間的完整路徑。

### 為什麼需要 Jaeger？

在微服務架構中，單個用戶請求可能涉及多個服務的調用：

```
用戶請求 → API Gateway → Auth Service → User Service → Database
                      ↓
                  Kafka → DB Writer Service → PostgreSQL
```

Jaeger 可以幫助我們：

✅ **追蹤請求路徑** - 看到請求經過了哪些服務  
✅ **定位效能瓶頸** - 找出哪個服務響應慢  
✅ **排查錯誤** - 快速定位問題發生在哪裡  
✅ **依賴關係分析** - 理解服務之間的調用關係  

### Jaeger vs 其他工具

| 工具 | 優點 | 缺點 |
|------|------|------|
| **Jaeger** | 開源、輕量、UI 友好、支持 OpenTelemetry | 存儲需要額外配置 |
| **Zipkin** | 老牌工具、社區大 | UI 較舊、功能較少 |
| **Datadog APM** | 功能強大、整合完善 | 商業付費、貴 |
| **AWS X-Ray** | AWS 原生 | 僅限 AWS、功能有限 |

---

## 架構設計

### 系統架構圖

```
┌─────────────────────────────────────────────────────────────┐
│                      Suggar Daddy 微服務                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   API    │  │   Auth   │  │   User   │  │ Matching │   │
│  │ Gateway  │→ │ Service  │→ │ Service  │→ │ Service  │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │               │              │          │
│       └─────────────┴───────────────┴──────────────┘          │
│                            │                                   │
│                            ↓                                   │
│               ┌─────────────────────────┐                     │
│               │  OpenTelemetry SDK      │                     │
│               │  (Auto Instrumentation) │                     │
│               └──────────┬──────────────┘                     │
│                          │                                     │
│                          │ OTLP/HTTP (4318)                   │
│                          ↓                                     │
└──────────────────────────┼─────────────────────────────────────┘
                           │
                           ↓
               ┌───────────────────────┐
               │   Jaeger All-in-One   │
               ├───────────────────────┤
               │  • Collector (收集)   │
               │  • Storage (存儲)     │
               │  • Query (查詢)       │
               │  • UI (介面)          │
               └───────────────────────┘
                           │
                           ↓
                  http://localhost:16686
                     (Jaeger UI)
```

### 追蹤數據流

1. **應用產生追蹤** - 每個微服務使用 OpenTelemetry SDK
2. **數據收集** - Spans 通過 OTLP 協議發送到 Jaeger Collector
3. **數據存儲** - Jaeger 將 traces 存儲在內存或 Elasticsearch
4. **數據查詢** - 用戶通過 Jaeger UI 查詢和視覺化追蹤

---

## 快速開始

### 1. 啟動 Jaeger

```bash
# 方法一：使用啟動腳本（推薦）
./infrastructure/tracing/start.sh

# 方法二：直接使用 Docker Compose
cd infrastructure/tracing
docker-compose -f docker-compose.tracing.yml up -d
```

### 2. 驗證 Jaeger 運行

```bash
# 檢查容器狀態
docker ps | grep jaeger

# 檢查健康狀態
curl http://localhost:14269/
```

### 3. 訪問 Jaeger UI

在瀏覽器打開：**http://localhost:16686**

### 4. 啟動微服務

```bash
# 確保已安裝 OpenTelemetry 依賴
npm install

# 啟動所有服務
docker-compose up -d
```

### 5. 查看追蹤

1. 在 Jaeger UI 選擇服務（如 `api-gateway`）
2. 點擊 **"Find Traces"**
3. 查看請求的完整鏈路

---

## OpenTelemetry 整合

### 什麼是 OpenTelemetry？

OpenTelemetry 是一個開源的可觀測性框架，提供：

- **Traces** - 分散式追蹤
- **Metrics** - 指標收集
- **Logs** - 日誌關聯

### 自動 Instrumentation

我們使用 `@opentelemetry/auto-instrumentations-node`，它會自動追蹤：

✅ **HTTP/HTTPS** 請求和響應  
✅ **Express/Fastify** 路由  
✅ **PostgreSQL** 資料庫查詢  
✅ **Redis** 快取操作  
✅ **Kafka** 消息發送  

### 代碼示例

#### TracingService 初始化

```typescript
// libs/common/src/lib/tracing/tracing.service.ts
import { Injectable } from '@nestjs/common';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

@Injectable()
export class TracingService {
  private sdk: NodeSDK;

  init(serviceName: string) {
    const traceExporter = new OTLPTraceExporter({
      url: process.env.JAEGER_ENDPOINT || 'http://localhost:4318/v1/traces',
    });

    this.sdk = new NodeSDK({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION || '1.0.0',
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
      }),
      traceExporter,
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': {
            enabled: false, // 禁用文件系統追蹤
          },
        }),
      ],
    });

    this.sdk.start();
    console.log(`✅ Tracing initialized for ${serviceName}`);

    // 優雅關閉
    process.on('SIGTERM', () => {
      this.sdk
        .shutdown()
        .then(() => console.log('Tracing terminated'))
        .catch((error) => console.log('Error terminating tracing', error))
        .finally(() => process.exit(0));
    });
  }

  getSDK(): NodeSDK {
    return this.sdk;
  }
}
```

#### 在 main.ts 中使用

```typescript
// apps/api-gateway/src/main.ts
import { TracingService } from '@suggar-daddy/common';

async function bootstrap() {
  // 在創建應用之前初始化追蹤
  const tracingService = new TracingService();
  tracingService.init('api-gateway');

  const app = await NestFactory.create(AppModule);
  
  // ... 其他配置
  
  await app.listen(3000);
}

bootstrap();
```

---

## 使用指南

### 查看追蹤鏈路

#### 1. 選擇服務

在 Jaeger UI 左側選擇服務：
- `api-gateway`
- `auth-service`
- `user-service`
- 等

#### 2. 設定查詢條件

- **Lookback**: 查詢時間範圍（如 1h, 2h）
- **Limit Results**: 顯示結果數量

#### 3. 查看 Trace 詳情

點擊任意 trace，可以看到：

```
┌─ GET /api/users/profile ─────────────── 245ms
│
├─ HTTP GET ───────────────────────────── 5ms
│  └─ auth-service:3002/verify-token
│
├─ HTTP GET ───────────────────────────── 180ms
│  └─ user-service:3001/users/123
│     │
│     ├─ PostgreSQL Query ──────────────── 150ms
│     │  SELECT * FROM users WHERE id = $1
│     │
│     └─ Redis GET ────────────────────── 15ms
│        user:123:profile
│
└─ Kafka Publish ─────────────────────── 10ms
   user.profile.viewed
```

### 常見查詢

#### 查找慢請求

1. 在搜索框設定：`minDuration: 500ms`
2. 點擊 "Find Traces"
3. 按響應時間排序

#### 查找錯誤

1. 在 Tags 輸入：`error=true`
2. 查看錯誤堆棧和上下文

#### 查找特定端點

1. 在 Operation 選擇：`GET /api/users`
2. 查看該端點的所有請求

---

## 自定義 Span

### 手動創建 Span

```typescript
import { trace } from '@opentelemetry/api';

export class UserService {
  async getUserProfile(userId: string) {
    const tracer = trace.getTracer('user-service');
    
    // 創建自定義 span
    return tracer.startActiveSpan('getUserProfile', async (span) => {
      try {
        // 添加屬性
        span.setAttribute('user.id', userId);
        span.setAttribute('db.system', 'postgresql');
        
        // 執行業務邏輯
        const user = await this.userRepository.findOne(userId);
        
        span.setStatus({ code: SpanStatusCode.OK });
        return user;
      } catch (error) {
        // 記錄錯誤
        span.recordException(error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message,
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }
}
```

### 添加事件

```typescript
span.addEvent('cache.hit', {
  'cache.key': 'user:123',
  'cache.ttl': 3600,
});
```

### 添加自定義屬性

```typescript
span.setAttribute('user.role', 'admin');
span.setAttribute('request.body.size', 1024);
span.setAttribute('db.query.rows', 42);
```

---

## 效能影響分析

### 開銷評估

| 項目 | 影響 | 說明 |
|------|------|------|
| **CPU** | ~2-5% | 自動 instrumentation 的開銷 |
| **記憶體** | ~50-100MB | 每個服務的 SDK 記憶體 |
| **網路** | ~1KB/span | OTLP HTTP 傳輸 |
| **延遲** | <1ms | 發送 span 是異步的 |

### 優化建議

#### 1. 調整採樣率

在高流量環境中，不需要追蹤每個請求：

```typescript
// 生產環境：採樣 10% 的請求
const traceExporter = new OTLPTraceExporter({
  url: process.env.JAEGER_ENDPOINT,
});

this.sdk = new NodeSDK({
  // ...
  sampler: new TraceIdRatioBasedSampler(0.1), // 10%
});
```

環境變數配置：

```env
OTEL_SAMPLING_RATE=0.1  # 10% 採樣
```

#### 2. 禁用不需要的 Instrumentation

```typescript
instrumentations: [
  getNodeAutoInstrumentations({
    '@opentelemetry/instrumentation-fs': {
      enabled: false, // 禁用文件系統追蹤
    },
    '@opentelemetry/instrumentation-dns': {
      enabled: false, // 禁用 DNS 追蹤
    },
  }),
],
```

#### 3. 批次發送

```typescript
const traceExporter = new OTLPTraceExporter({
  url: process.env.JAEGER_ENDPOINT,
  // 批次配置
  maxExportBatchSize: 512,
  scheduledDelayMillis: 5000,
});
```

---

## 生產環境配置

### 持久化存儲

開發環境使用記憶體存儲，生產環境建議使用 **Elasticsearch**：

```yaml
# docker-compose.tracing.yml (生產版本)
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:7.17.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    volumes:
      - es-data:/usr/share/elasticsearch/data
    networks:
      - suggar-daddy-network

  jaeger:
    image: jaegertracing/all-in-one:latest
    environment:
      SPAN_STORAGE_TYPE: elasticsearch
      ES_SERVER_URLS: http://elasticsearch:9200
      COLLECTOR_OTLP_ENABLED: true
    depends_on:
      - elasticsearch
    networks:
      - suggar-daddy-network

volumes:
  es-data:

networks:
  suggar-daddy-network:
    external: true
```

### 高可用部署

生產環境應該分離 Jaeger 組件：

```yaml
services:
  # Collector - 收集追蹤數據
  jaeger-collector:
    image: jaegertracing/jaeger-collector:latest
    environment:
      SPAN_STORAGE_TYPE: elasticsearch
      ES_SERVER_URLS: http://elasticsearch:9200
    ports:
      - "4317:4317"
      - "4318:4318"
    deploy:
      replicas: 3  # 水平擴展

  # Query - 查詢服務
  jaeger-query:
    image: jaegertracing/jaeger-query:latest
    environment:
      SPAN_STORAGE_TYPE: elasticsearch
      ES_SERVER_URLS: http://elasticsearch:9200
    ports:
      - "16686:16686"
    deploy:
      replicas: 2

  # Agent - 本地代理（可選）
  jaeger-agent:
    image: jaegertracing/jaeger-agent:latest
    command:
      - "--reporter.grpc.host-port=jaeger-collector:14250"
    ports:
      - "6831:6831/udp"
```

### 數據保留策略

設定 Elasticsearch 索引生命週期：

```bash
# 保留 7 天的追蹤數據
curl -X PUT "http://elasticsearch:9200/_ilm/policy/jaeger-ilm-policy" \
  -H 'Content-Type: application/json' \
  -d '{
    "policy": {
      "phases": {
        "hot": {
          "actions": {
            "rollover": {
              "max_age": "1d",
              "max_size": "50GB"
            }
          }
        },
        "delete": {
          "min_age": "7d",
          "actions": {
            "delete": {}
          }
        }
      }
    }
  }'
```

---

## 常見問題排查

### 1. Jaeger UI 顯示空白

**問題**：打開 http://localhost:16686 但沒有數據

**解決方案**：

```bash
# 1. 檢查 Jaeger 容器狀態
docker ps | grep jaeger

# 2. 檢查 Jaeger 日誌
docker logs suggar-daddy-jaeger

# 3. 檢查服務是否發送追蹤
curl http://localhost:14269/metrics | grep spans_received

# 4. 確認環境變數
echo $JAEGER_ENDPOINT
```

### 2. 服務無法連接 Jaeger

**問題**：服務日誌顯示連接錯誤

**解決方案**：

```bash
# 1. 檢查網絡連接
docker network inspect suggar-daddy-network

# 2. 確認 Jaeger 端口開放
docker exec -it suggar-daddy-jaeger netstat -tlnp | grep 4318

# 3. 從服務容器測試連接
docker exec -it api-gateway curl http://jaeger:4318/v1/traces

# 4. 檢查防火牆設置
```

### 3. 追蹤數據不完整

**問題**：只能看到部分服務的追蹤

**原因**：

- 某些服務沒有正確初始化 TracingService
- 網絡分區導致數據丟失
- 採樣率設置過低

**解決方案**：

```typescript
// 確保每個服務都初始化了 tracing
const tracingService = new TracingService();
tracingService.init('service-name');

// 臨時提高採樣率進行調試
// .env
OTEL_SAMPLING_RATE=1.0  # 100% 採樣
```

### 4. 記憶體使用過高

**問題**：Jaeger 容器佔用大量記憶體

**解決方案**：

```yaml
# 限制 memory storage 的追蹤數量
environment:
  MEMORY_MAX_TRACES: 10000  # 從 100000 降低到 10000
```

或切換到 Elasticsearch 存儲：

```yaml
environment:
  SPAN_STORAGE_TYPE: elasticsearch
  ES_SERVER_URLS: http://elasticsearch:9200
```

### 5. 效能下降

**問題**：啟用追蹤後服務變慢

**解決方案**：

```typescript
// 1. 降低採樣率
OTEL_SAMPLING_RATE=0.1  // 只追蹤 10%

// 2. 禁用不必要的 instrumentation
instrumentations: [
  getNodeAutoInstrumentations({
    '@opentelemetry/instrumentation-fs': { enabled: false },
    '@opentelemetry/instrumentation-dns': { enabled: false },
  }),
],

// 3. 使用批次發送
maxExportBatchSize: 512,
scheduledDelayMillis: 5000,
```

---

## 最佳實踐

### ✅ DO

1. **為每個服務設定有意義的名稱**
   ```typescript
   tracingService.init('user-service'); // 好
   tracingService.init('service-1');    // 差
   ```

2. **為關鍵操作添加自定義 span**
   ```typescript
   tracer.startActiveSpan('payment.process', async (span) => {
     // 重要業務邏輯
   });
   ```

3. **記錄重要屬性**
   ```typescript
   span.setAttribute('user.id', userId);
   span.setAttribute('order.amount', amount);
   ```

4. **正確處理錯誤**
   ```typescript
   catch (error) {
     span.recordException(error);
     span.setStatus({ code: SpanStatusCode.ERROR });
   }
   ```

### ❌ DON'T

1. **不要在 span 中記錄敏感信息**
   ```typescript
   span.setAttribute('user.password', password); // ❌ 不要這樣做
   span.setAttribute('credit.card', cardNumber); // ❌ 不要這樣做
   ```

2. **不要創建過多細粒度的 span**
   ```typescript
   // ❌ 不要為每個簡單操作都創建 span
   tracer.startActiveSpan('add-1-to-counter', ...);
   tracer.startActiveSpan('log-message', ...);
   ```

3. **不要在生產環境使用 100% 採樣**
   ```typescript
   // ❌ 高流量生產環境
   OTEL_SAMPLING_RATE=1.0  // 太高了
   
   // ✅ 合理設置
   OTEL_SAMPLING_RATE=0.05  // 5%
   ```

---

## 進階主題

### 追蹤上下文傳播

OpenTelemetry 自動在 HTTP headers 中傳播追蹤上下文：

```
traceparent: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
tracestate: congo=t61rcWkgMzE
```

### 與 Prometheus 整合

```typescript
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';

const prometheusExporter = new PrometheusExporter({
  port: 9464,
});
```

### 自定義 Sampler

```typescript
import { Sampler, SamplingDecision } from '@opentelemetry/sdk-trace-base';

class CustomSampler implements Sampler {
  shouldSample(context, traceId, spanName, spanKind, attributes, links) {
    // 總是採樣錯誤請求
    if (attributes['http.status_code'] >= 400) {
      return { decision: SamplingDecision.RECORD_AND_SAMPLED };
    }
    
    // 高價值用戶：100% 採樣
    if (attributes['user.tier'] === 'premium') {
      return { decision: SamplingDecision.RECORD_AND_SAMPLED };
    }
    
    // 其他：10% 採樣
    return Math.random() < 0.1
      ? { decision: SamplingDecision.RECORD_AND_SAMPLED }
      : { decision: SamplingDecision.NOT_RECORD };
  }
}
```

---

## 監控指標

### Jaeger 自身監控

```bash
# 查看 Jaeger 指標
curl http://localhost:14269/metrics

# 關鍵指標
jaeger_collector_spans_received_total
jaeger_collector_spans_saved_by_svc
jaeger_query_requests_total
```

### 服務健康檢查

```typescript
// health-check.controller.ts
import { trace } from '@opentelemetry/api';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    const tracer = trace.getTracer('health-check');
    const span = tracer.startSpan('health.check');
    
    try {
      // 檢查追蹤是否正常
      return {
        status: 'healthy',
        tracing: span.isRecording() ? 'enabled' : 'disabled',
      };
    } finally {
      span.end();
    }
  }
}
```

---

## 參考資源

### 官方文檔

- [Jaeger Documentation](https://www.jaegertracing.io/docs/)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [OpenTelemetry Node.js](https://opentelemetry.io/docs/instrumentation/js/)

### 相關文檔

- [Infrastructure README](../infrastructure/tracing/README.md)
- [Monitoring Setup](../infrastructure/monitoring/README.md)
- [Performance Best Practices](./PERFORMANCE_OPTIMIZATION.md)

### 社區資源

- [CNCF Jaeger GitHub](https://github.com/jaegertracing/jaeger)
- [OpenTelemetry GitHub](https://github.com/open-telemetry/opentelemetry-js)

---

## 變更記錄

| 日期 | 版本 | 變更內容 |
|------|------|----------|
| 2024-01-XX | 1.0.0 | 初始版本 - Jaeger + OpenTelemetry 整合 |

---

**需要幫助？** 請查看 [常見問題排查](#常見問題排查) 或聯繫 DevOps 團隊。
