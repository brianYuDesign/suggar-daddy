# Jaeger 分散式追蹤系統

## 概述
Jaeger 是開源的分散式追蹤系統，用於監控和排查微服務架構中的問題。

## 快速啟動

### 啟動 Jaeger
```bash
docker-compose -f infrastructure/tracing/docker-compose.tracing.yml up -d
```

### 停止 Jaeger
```bash
docker-compose -f infrastructure/tracing/docker-compose.tracing.yml down
```

### 查看日誌
```bash
docker logs -f suggar-daddy-jaeger
```

## 訪問方式

### Jaeger UI
- URL: http://localhost:16686
- 用途：查詢和視覺化分散式追蹤數據

### 端口說明
- **16686**: Jaeger UI (查詢介面)
- **4317**: OTLP gRPC Collector (推薦)
- **4318**: OTLP HTTP Collector
- **14268**: Jaeger Collector HTTP
- **6831/udp**: Jaeger Agent (legacy)
- **14269**: Admin port (健康檢查)

## 存儲配置

### 開發環境 (當前配置)
- 存儲類型: Memory
- 最大追蹤數: 100,000
- 特點: 簡單、快速、重啟後數據消失

### 生產環境建議
使用 Elasticsearch 持久化存儲：

```yaml
environment:
  SPAN_STORAGE_TYPE: elasticsearch
  ES_SERVER_URLS: http://elasticsearch:9200
  ES_USERNAME: elastic
  ES_PASSWORD: changeme
```

## 健康檢查
```bash
curl http://localhost:14269/
```

## 相關文檔
- [完整使用指南](../../docs/DISTRIBUTED_TRACING.md)
- [Jaeger 官方文檔](https://www.jaegertracing.io/docs/)
