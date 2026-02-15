# OpenTelemetry & Jaeger 配置指南

## 🎯 概述

本項目已整合 OpenTelemetry 進行分散式追蹤，使用 Jaeger 作為追蹤後端。這使您能夠：

- 追蹤跨微服務的完整請求流程
- 監測 HTTP、資料庫、Redis、Kafka 等操作的性能
- 識別效能瓶頸和故障

## ✅ 已配置的內容

### OpenTelemetry 依賴

```json
{
  "@opentelemetry/auto-instrumentations-node": "^0.69.0",
  "@opentelemetry/exporter-trace-otlp-http": "^0.212.0",
  "@opentelemetry/resources": "^2.5.1",
  "@opentelemetry/sdk-node": "^0.212.0",
  "@opentelemetry/semantic-conventions": "^1.39.0"
}
```

### 自動追蹤的操作

✅ **HTTP/HTTPS** 請求和響應  
✅ **PostgreSQL** 資料庫查詢  
✅ **Redis** 快取操作  
✅ **Kafka** 消息發送  
✅ **Express/Fastify** 路由  
✅ **DNS** 查詢  

### 所有微服務已配置

- ✅ api-gateway
- ✅ auth-service
- ✅ user-service
- ✅ payment-service
- ✅ subscription-service
- ✅ content-service
- ✅ media-service
- ✅ db-writer-service
- ✅ matching-service
- ✅ notification-service
- ✅ messaging-service
- ✅ admin-service

## 🚀 快速開始

### 1. 啟動 Jaeger

使用 docker-compose 啟動所有服務（包含 Jaeger）：

```bash
docker-compose up -d
```

Jaeger 會在多個端口運行：
- **UI 介面**: http://localhost:16686
- **OTLP HTTP**: http://localhost:4318
- **OTLP gRPC**: http://localhost:4317

### 2. 啟動微服務

```bash
# 啟動 API Gateway
npm run serve:api-gateway

# 啟動其他微服務（在不同終端）
npm run serve:auth-service
npm run serve:user-service
# 等等...
```

### 3. 發送測試請求

```bash
# 範例：登入請求
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### 4. 查看追蹤

1. 打開 Jaeger UI: http://localhost:16686
2. 在左側選擇服務（如 `api-gateway`）
3. 點擊 **"Find Traces"**
4. 查看剛才發送的請求的完整追蹤鏈路

## ⚙️ 環境變數配置

### 必需變數

```bash
# Jaeger 端點（OTLP HTTP 收集器）
JAEGER_ENDPOINT=http://jaeger:4318/v1/traces

# 採樣率 (0.0 - 1.0)
OTEL_SAMPLING_RATE=1.0

# 應用版本
APP_VERSION=1.0.0
```

### 採樣率建議

| 環境 | 採樣率 | 說明 |
|------|--------|------|
| 開發 | `1.0` | 100% 採樣，輕鬆除錯 |
| 測試 | `0.5` | 50% 採樣，平衡性能與可觀測性 |
| 生產 | `0.1` | 10% 採樣，減少開銷 |

## 📊 Jaeger UI 使用指南

### 查詢追蹤

1. **選擇服務**: 下拉菜單選擇要查詢的微服務
2. **設定時間範圍**: 選擇 Lookback 時間（如 1h, 2h）
3. **設定結果限制**: 選擇要顯示的最大結果數
4. **應用篩選**: 可根據操作名稱、Tag 等篩選
5. **點擊查詢**: 按 "Find Traces"

### 分析單個追蹤

在搜索結果中點擊任何追蹤，可以看到：

- **服務時間線**: 各個 Span 的執行順序和耗時
- **Span 詳情**: 每個操作的標籤、日誌、錯誤等
- **依賴關係**: 操作之間的調用關係

## 🔧 常見配置

### 禁用特定的 Instrumentation

編輯 [libs/common/src/lib/tracing/tracing.service.ts](libs/common/src/lib/tracing/tracing.service.ts)，修改 `getNodeAutoInstrumentations()` 配置：

```typescript
instrumentations: [
  getNodeAutoInstrumentations({
    '@opentelemetry/instrumentation-fs': {
      enabled: false,  // 禁用文件系統追蹤
    },
    '@opentelemetry/instrumentation-dns': {
      enabled: false,  // 禁用 DNS 追蹤
    },
  }),
],
```

### 自定義追蹤

在 NestJS 控制器或服務中添加自定義 Span：

```typescript
import { trace } from '@opentelemetry/api';

export class PaymentService {
  async processPayment(userId: string, amount: number) {
    const tracer = trace.getTracer('payment-service');
    
    return tracer.startActiveSpan('payment.process', async (span) => {
      try {
        span.setAttribute('user.id', userId);
        span.setAttribute('payment.amount', amount);
        
        // 你的支付邏輯
        const result = await this.stripe.charges.create({
          amount: amount * 100,
          currency: 'usd',
        });
        
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.recordException(error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message,
        });
        throw error;
      }
    });
  }
}
```

## 📈 效能影響

- **平均開銷**: ~5% CPU 和延遲增加
- **批次發送**: 自動批量發送 Span，減少網絡開銷
- **低採樣率**: 在生產環境使用 10% 採樣可進一步降低開銷

## 🛠️ 故障排除

### 問題 1: 追蹤數據未出現

**檢查清單:**

1. ✅ Jaeger 容器正在運行
   ```bash
   docker ps | grep jaeger
   ```

2. ✅ JAEGER_ENDPOINT 環境變數正確設置
   ```bash
   echo $JAEGER_ENDPOINT
   # 應該輸出: http://jaeger:4318/v1/traces（Docker）或 http://localhost:4318/v1/traces（本地）
   ```

3. ✅ 微服務啟動日誌顯示 "Tracing initialized"
   ```bash
   # 運行時日誌應包含:
   # [api-gateway] Tracing initialized for api-gateway
   ```

4. ✅ 檢查 Jaeger 健康狀況
   ```bash
   curl http://localhost:14269/
   ```

### 問題 2: "TracingService is not defined" 錯誤

原因: 依賴未正確匯入。

解決方案: 確保在 main.ts 中正確導入：

```typescript
import { TracingService } from '@suggar-daddy/common';
```

### 問題 3: 追蹤不完整

**解決方案:**

1. 檢查採樣率是否過低
   
   ```bash
   # 臨時設為 100% 進行除錯
   OTEL_SAMPLING_RATE=1.0
   ```

2. 檢查是否有禁用的 Instrumentation
   
3. 確保所有相關微服務都已啟動

### 問題 4: 性能下降明顯

**優化建議:**

1. **降低採樣率**
   
   ```bash
   OTEL_SAMPLING_RATE=0.1  # 生產環境
   ```

2. **禁用不需要的追蹤**
   
   ```typescript
   '@opentelemetry/instrumentation-fs': { enabled: false },
   '@opentelemetry/instrumentation-dns': { enabled: false },
   ```

3. **增加批次大小**
   
   在 TracingService 中修改 `maxExportBatchSize`

## 📚 相關文檔

- [Distributed Tracing Guide](/docs/DISTRIBUTED_TRACING.md)
- [OpenTelemetry 官方文檔](https://opentelemetry.io/docs/)
- [Jaeger 官方文檔](https://www.jaegertracing.io/docs/)

## 🎓 最佳實踐

### DO ✅

1. **為每個服務設定有意義的名稱**
   ```typescript
   tracingService.init('payment-service');  // 好
   tracingService.init('service-1');        // 差
   ```

2. **為關鍵業務操作添加自定義 Span**
   ```typescript
   tracer.startActiveSpan('payment.process', ...);
   tracer.startActiveSpan('user.verification', ...);
   ```

3. **記錄重要的業務屬性**
   ```typescript
   span.setAttribute('user.id', userId);
   span.setAttribute('order.amount', amount);
   span.setAttribute('payment.method', 'card');
   ```

4. **正確處理錯誤**
   ```typescript
   catch (error) {
     span.recordException(error);
     span.setStatus({ code: SpanStatusCode.ERROR });
   }
   ```

### DON'T ❌

1. ❌ 記錄敏感信息（如密碼、API 密鑰）
2. ❌ 在高流量路由設置 100% 採樣
3. ❌ 在生產環境中啟用所有 DNS/FS 追蹤

## 📞 支持

有任何問題嗎？查看：

- 日誌: `docker logs suggar-daddy-jaeger`
- Jaeger 健康檢查: http://localhost:14269/
- 貢獻: 提交 Issue 或 Pull Request
