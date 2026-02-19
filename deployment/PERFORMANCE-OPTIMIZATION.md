# ⚡ 性能優化和 CDN 配置指南

## 📚 目錄

1. [應用性能優化](#應用性能優化)
2. [數據庫性能優化](#數據庫性能優化)
3. [CDN 和 Cloudflare 配置](#cdn-和-cloudflare-配置)
4. [S3 優化](#s3-優化)
5. [監控和指標](#監控和指標)

---

## 🚀 應用性能優化

### 1. Node.js 運行時優化

```bash
#!/bin/bash
# 文件: scripts/optimize-nodejs.sh

# 堆大小優化 (4GB 推薦)
export NODE_OPTIONS="--max-old-space-size=4096"

# GC 優化
export NODE_OPTIONS="$NODE_OPTIONS --gc-interval=100000"

# 並發優化
export UV_THREADPOOL_SIZE=128

# 禁用 V8 代碼快取 (可選)
export NODE_OPTIONS="$NODE_OPTIONS --nouse-idle-notification"

# 啟用 JIT 編譯優化
export NODE_OPTIONS="$NODE_OPTIONS --jitless=false"

# 監控
node --expose-gc app.js
```

### 2. HTTP 連接池優化

```typescript
// config/http-pool.ts

import http from 'http';
import https from 'https';

const httpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 200,
  maxFreeSockets: 10,
  timeout: 60000,
  freeSocketTimeout: 30000,
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 200,
  maxFreeSockets: 10,
  timeout: 60000,
  freeSocketTimeout: 30000,
});

export { httpAgent, httpsAgent };
```

### 3. 智能快取策略

```typescript
// middleware/caching.ts

import Redis from 'redis';

const redisClient = Redis.createClient({
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 500),
    keepAlive: true,
  },
});

// 分層快取
const CACHE_TIERS = {
  'user_profile': { ttl: 3600, memory: true },      // 1 小時
  'recommendations': { ttl: 1800, memory: true },   // 30 分鐘
  'content': { ttl: 7200, memory: false },          // 2 小時
  'config': { ttl: 86400, memory: true },           // 24 小時
};

// 快取預熱
async function warmCache() {
  const users = await db.query('SELECT id FROM users LIMIT 10000');
  for (const user of users) {
    const profile = await fetchUserProfile(user.id);
    await redisClient.setex(`user:${user.id}`, CACHE_TIERS['user_profile'].ttl, JSON.stringify(profile));
  }
}

// 快取失效
app.post('/cache/invalidate', (req, res) => {
  const pattern = req.body.pattern || '*';
  redisClient.del(pattern);
  res.json({ success: true });
});
```

### 4. 請求壓縮

```typescript
// middleware/compression.ts

import compression from 'compression';

app.use(compression({
  level: 6,                  // 1-9，推薦 6
  threshold: 1024,          // > 1KB 才壓縮
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
}));
```

### 5. 批量 API 優化

```typescript
// API for batch operations

app.post('/api/batch', async (req, res) => {
  const { operations } = req.body;
  
  // 限制批量大小
  if (operations.length > 100) {
    return res.status(400).json({ error: 'Max 100 operations per batch' });
  }
  
  // 並行執行，使用 Promise.all
  const results = await Promise.all(
    operations.map(op => executeOperation(op))
  );
  
  res.json({ results });
});
```

---

## 🗄️ 數據庫性能優化

### 1. 索引策略

```sql
-- 文件: scripts/create-indexes.sql

-- 頻繁查詢的字段
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_recommendations_user_id ON recommendations(user_id);
CREATE INDEX idx_content_status_type ON content(status, type);

-- 複合索引
CREATE INDEX idx_recommendations_user_date ON recommendations(user_id, created_at DESC);

-- 部分索引 (只索引活躍內容)
CREATE INDEX idx_active_content ON content(id) 
  WHERE status = 'active' AND deleted_at IS NULL;

-- 驗證索引使用
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### 2. 查詢優化

```sql
-- ❌ 不好: N+1 查詢
SELECT * FROM users;
-- 然後在應用中循環查詢 posts
for user in users:
  SELECT * FROM posts WHERE user_id = user.id;

-- ✅ 好: JOIN 查詢
SELECT u.*, p.*
FROM users u
LEFT JOIN posts p ON u.id = p.user_id
WHERE u.id IN (SELECT user_id FROM recommendations LIMIT 1000);

-- ✅ 好: 視圖快取
CREATE MATERIALIZED VIEW user_post_summary AS
SELECT user_id, COUNT(*) as post_count, MAX(created_at) as last_post
FROM posts
GROUP BY user_id;

REFRESH MATERIALIZED VIEW user_post_summary;
```

### 3. 連接池優化

```yaml
# docker-compose.yml 中的 PostgreSQL 配置

version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_MAX_CONNECTIONS: 200
    command:
      - "postgres"
      - "-c"
      - "max_connections=200"
      - "-c"
      - "shared_buffers=2GB"
      - "-c"
      - "effective_cache_size=6GB"
      - "-c"
      - "work_mem=10MB"
      - "-c"
      - "maintenance_work_mem=512MB"
      - "-c"
      - "random_page_cost=1.1"
      - "-c"
      - "effective_io_concurrency=200"
      - "-c"
      - "wal_buffers=16MB"
```

### 4. 慢查詢分析

```bash
#!/bin/bash
# scripts/analyze-slow-queries.sh

# 啟用慢查詢日誌
psql -h postgres.prod.internal -U postgres << EOF
ALTER SYSTEM SET log_min_duration_statement = 1000;  -- > 1 秒
ALTER SYSTEM SET log_statement = 'all';
SELECT pg_reload_conf();
EOF

# 分析慢查詢
tail -100 /var/log/postgresql/postgresql.log | grep "duration:"

# 使用 EXPLAIN 分析
psql -h postgres.prod.internal -U postgres -d sugar_daddy_prod << EOF
EXPLAIN ANALYZE
SELECT u.id, COUNT(r.id) as rec_count
FROM users u
LEFT JOIN recommendations r ON u.id = r.user_id
WHERE u.created_at > NOW() - INTERVAL '30 days'
GROUP BY u.id
ORDER BY rec_count DESC;
EOF

# 找出最大消耗 CPU 的查詢
psql -h postgres.prod.internal -U postgres << EOF
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
EOF
```

### 5. 分區策略

```sql
-- 按日期分區大表
CREATE TABLE recommendations_partitioned (
  id BIGSERIAL,
  user_id INTEGER,
  content_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- 為每個月創建分區
CREATE TABLE recommendations_2024_01 PARTITION OF recommendations_partitioned
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE recommendations_2024_02 PARTITION OF recommendations_partitioned
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- 自動管理分區
SELECT pg_partman.create_parent(
  'public.recommendations_partitioned',
  'created_at',
  'native',
  'monthly'
);
```

---

## 🌐 CDN 和 Cloudflare 配置

### 1. Cloudflare API 令牌設置

```bash
#!/bin/bash
# scripts/setup-cloudflare.sh

# 設置環境變量
export CLOUDFLARE_API_TOKEN="your_api_token"
export CLOUDFLARE_ACCOUNT_EMAIL="admin@sugar-daddy.com"
export CLOUDFLARE_ZONE_ID="your_zone_id"

# 驗證配置
curl -X GET "https://api.cloudflare.com/client/v4/user" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN"
```

### 2. 緩存規則配置

```bash
#!/bin/bash
# scripts/configure-cloudflare-cache.sh

ZONE_ID=$CLOUDFLARE_ZONE_ID
AUTH_TOKEN=$CLOUDFLARE_API_TOKEN

# 設置頁面規則 - 長期快取靜態資源
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/pagerules" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "targets": ["*.sugar-daddy.com/static/*"],
    "actions": [
      {
        "id": "cache_level",
        "value": "cache_everything"
      },
      {
        "id": "browser_cache_ttl",
        "value": 14400
      }
    ],
    "priority": 1,
    "status": "active"
  }'

# 設置頁面規則 - API 端點不快取
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/pagerules" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "targets": ["*.sugar-daddy.com/api/*"],
    "actions": [
      {
        "id": "cache_level",
        "value": "bypass"
      },
      {
        "id": "security_level",
        "value": "high"
      }
    ],
    "priority": 2,
    "status": "active"
  }'
```

### 3. 快取控制頭配置

```typescript
// middleware/cache-headers.ts

app.use((req, res, next) => {
  // 靜態資源 - 長期快取
  if (req.path.match(/\.(js|css|jpg|png|gif|woff|ttf)$/)) {
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.set('ETag', generateETag(req.path));
  }
  
  // API 響應 - 無快取
  else if (req.path.startsWith('/api/')) {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
  
  // 動態頁面 - 短期快取
  else {
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    res.set('Vary', 'Accept-Encoding');
  }
  
  next();
});
```

### 4. 圖像優化

```bash
#!/bin/bash
# scripts/configure-cloudflare-image-optimization.sh

ZONE_ID=$CLOUDFLARE_ZONE_ID
AUTH_TOKEN=$CLOUDFLARE_API_TOKEN

# 啟用 Cloudflare Image Optimization
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/image_resizing" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value":"on"}'

# 配置 Mirage (自動優化圖像)
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/mirage" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value":"on"}'

# 啟用 Polish (無損和有損壓縮)
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/polish" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value":"lossless"}'
```

### 5. 速率限制和 DDoS 保護

```bash
#!/bin/bash
# scripts/configure-cloudflare-security.sh

ZONE_ID=$CLOUDFLARE_ZONE_ID
AUTH_TOKEN=$CLOUDFLARE_API_TOKEN

# 設置速率限制
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/rate_limiting_rules" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "match": {
      "request": {
        "url": {
          "path": {
            "matches": "/api/*"
          }
        }
      }
    },
    "action": {
      "id": "block",
      "response": {
        "status_code": 429
      }
    },
    "threshold": 100,
    "period": 60,
    "characteristics": [
      "ip.src"
    ],
    "counting_expression": "true",
    "mitigation_timeout": 600
  }'

# 設置 Web 應用防火牆規則
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/firewall/rules" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "filter": {
      "expression": "(cf.bot_management.score < 30)"
    },
    "action": "challenge",
    "description": "Block suspected bot traffic"
  }'
```

---

## 🪣 S3 優化

### 1. S3 設置優化

```bash
#!/bin/bash
# scripts/optimize-s3.sh

BUCKET="sugar-daddy-prod-content"
REGION="us-east-1"

# 1. 啟用版本控制
aws s3api put-bucket-versioning \
  --bucket $BUCKET \
  --versioning-configuration Status=Enabled

# 2. 啟用服務端加密
aws s3api put-bucket-encryption \
  --bucket $BUCKET \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# 3. 設置生命週期策略
aws s3api put-bucket-lifecycle-configuration \
  --bucket $BUCKET \
  --lifecycle-configuration '{
    "Rules": [{
      "Id": "DeleteOldVersions",
      "Status": "Enabled",
      "NoncurrentVersionTransitions": [
        {
          "NoncurrentDays": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "NoncurrentDays": 90,
          "StorageClass": "GLACIER"
        }
      ],
      "NoncurrentVersionExpirations": [
        {
          "NoncurrentDays": 365
        }
      ]
    }]
  }'

# 4. 啟用多部分上傳加速
aws s3api put-bucket-accelerate-configuration \
  --bucket $BUCKET \
  --accelerate-configuration Status=Enabled

# 5. 設置跨域資源共享 (CORS)
aws s3api put-bucket-cors \
  --bucket $BUCKET \
  --cors-configuration '{
    "CORSRules": [{
      "AllowedOrigins": ["https://sugar-daddy.com"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }]
  }'
```

### 2. 多部分上傳優化

```typescript
// services/s3-upload.ts

import AWS from 'aws-sdk';

const s3 = new AWS.S3({
  maxRetries: 3,
  httpOptions: { timeout: 300000 },
});

async function uploadLargeFile(filePath: string, key: string) {
  const fileSize = fs.statSync(filePath).size;
  const chunkSize = 100 * 1024 * 1024;  // 100 MB chunks
  
  const multipartParams = {
    Bucket: 'sugar-daddy-prod-content',
    Key: key,
  };
  
  // 初始化多部分上傳
  const multipartUpload = await s3.createMultipartUpload(multipartParams).promise();
  const uploadId = multipartUpload.UploadId;
  
  // 並行上傳部分
  const parts: AWS.S3.Part[] = [];
  const numParts = Math.ceil(fileSize / chunkSize);
  
  const uploadPromises = [];
  for (let i = 0; i < numParts; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, fileSize);
    const partNumber = i + 1;
    
    const promise = uploadPart(filePath, uploadId, key, partNumber, start, end);
    uploadPromises.push(promise);
  }
  
  const uploadedParts = await Promise.all(uploadPromises);
  
  // 完成多部分上傳
  const completeParams = {
    Bucket: 'sugar-daddy-prod-content',
    Key: key,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: uploadedParts,
    },
  };
  
  return s3.completeMultipartUpload(completeParams).promise();
}

async function uploadPart(filePath, uploadId, key, partNumber, start, end) {
  const fileData = fs.readFileSync(filePath, { start, end });
  
  const uploadResult = await s3.uploadPart({
    Bucket: 'sugar-daddy-prod-content',
    Key: key,
    PartNumber: partNumber,
    UploadId: uploadId,
    Body: fileData,
  }).promise();
  
  return {
    ETag: uploadResult.ETag,
    PartNumber: partNumber,
  };
}
```

---

## 📊 監控和指標

### 關鍵性能指標

| 指標 | 目標 | 監控方式 |
|------|------|---------|
| 首字節時間 (TTFB) | < 200ms | Cloudflare Analytics |
| 頁面加載時間 | < 3s | Google Analytics |
| 核心網頁指標 | 良好 | Google PageSpeed |
| API 延遲 (P99) | < 2000ms | Prometheus |
| 快取命中率 | > 80% | CloudFront 日誌 |
| 錯誤率 | < 0.1% | Application logs |

### Prometheus 監控

```yaml
# monitoring/prometheus-cdn.yml

global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'cloudflare-cdn'
    static_configs:
      - targets: ['localhost:9100']
    metric_relabel_configs:
      - source_labels: [__name__]
        regex: 'cloudflare_(cache_hit|bandwidth|request_count)'
        action: keep
```

---

**最後更新**: 2026-02-19  
**維護者**: DevOps Team
