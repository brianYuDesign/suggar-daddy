# 微服務整合測試

這個目錄包含跨服務的整合測試，用於驗證微服務之間的交互和資料一致性。

## 📋 目錄結構

```
test/integration/
├── docker-compose.test.yml       # 測試環境 Docker 配置
├── run-tests.sh                  # 測試執行腳本
├── cleanup.sh                    # 清理腳本
├── setup/                        # 測試環境設置
│   ├── test-environment.ts       # Docker 服務管理
│   ├── test-clients.ts           # 測試客戶端
│   └── index.ts
├── helpers/                      # 測試幫助函數
│   ├── test-helpers.ts           # 通用幫助函數
│   ├── test-fixtures.ts          # 測試數據工廠
│   └── index.ts
└── scenarios/                    # 測試場景
    ├── auth-service.integration.spec.ts         # 認證服務測試
    ├── payment-service.integration.spec.ts      # 付款服務測試
    ├── content-service.integration.spec.ts      # 內容服務測試
    └── data-consistency.integration.spec.ts     # 數據一致性測試
```

## 🚀 快速開始

### 前置需求

- Docker 和 Docker Compose
- Node.js 18+
- 至少 4GB 可用記憶體

### 執行所有測試

```bash
# 使用測試腳本（推薦）
./test/integration/run-tests.sh

# 或使用 npm script
npm run test:integration
```

### 執行特定測試套件

```bash
# 認證服務測試
./test/integration/run-tests.sh auth

# 付款服務測試
./test/integration/run-tests.sh payment

# 內容服務測試
./test/integration/run-tests.sh content

# 數據一致性測試
./test/integration/run-tests.sh consistency
```

### 只啟動測試環境

```bash
# 啟動環境但不執行測試
./test/integration/run-tests.sh -s

# 手動執行特定測試
npm run test:integration -- --testPathPattern=auth

# 清理環境
./test/integration/run-tests.sh -c
```

## 📊 測試覆蓋範圍

### 1. 認證服務整合測試

**檔案**: `scenarios/auth-service.integration.spec.ts`

測試項目：
- ✅ 使用者註冊流程
  - 註冊並建立 User Service 記錄
  - 防止重複郵箱
- ✅ 使用者登入流程
  - 正確憑證登入
  - 拒絕錯誤密碼
  - Session 儲存到 Redis
- ✅ JWT Token 驗證
  - 有效 Token 驗證
  - 拒絕無效 Token
  - 拒絕過期 Token
- ✅ Token 刷新流程
- ✅ 登出流程
- ✅ API Gateway 路由整合

**服務依賴**:
- Auth Service (port 3002)
- User Service (port 3001)
- API Gateway (port 3000)
- PostgreSQL
- Redis

### 2. 付款服務整合測試

**檔案**: `scenarios/payment-service.integration.spec.ts`

測試項目：
- ✅ Stripe 整合
  - 建立 Stripe Customer
  - 建立 Payment Intent
  - 處理 Webhook 事件
- ✅ Kafka 事件處理
  - 發送 payment.created 事件
  - 發送 payment.completed 事件
- ✅ DB Writer Service 整合
  - 消費 Kafka 事件並寫入資料庫
  - 處理批次事件
- ✅ 訂閱創建端到端流程
- ✅ 錯誤處理和重試
- ✅ 資料一致性

**服務依賴**:
- Payment Service (port 3007)
- DB Writer Service (port 3010)
- Auth Service (port 3002)
- PostgreSQL
- Redis
- Kafka

### 3. 內容服務整合測試

**檔案**: `scenarios/content-service.integration.spec.ts`

測試項目：
- ✅ 貼文創建流程
  - 文字貼文
  - 帶媒體的貼文
  - 付費貼文
- ✅ Media Service 整合
  - 圖片上傳
  - 影片上傳
  - 檔案大小限制
  - 錯誤處理
- ✅ 貼文購買流程
  - 完整購買流程
  - 防止重複購買
- ✅ Redis 快取機制
  - 快取熱門貼文
  - 更新時清除快取
  - 快取列表
  - 快取過期時間
- ✅ 內容權限控制
- ✅ 效能測試

**服務依賴**:
- Content Service (port 3006)
- Media Service (port 3008)
- Payment Service (port 3007)
- Auth Service (port 3002)
- PostgreSQL
- Redis

### 4. 數據一致性測試

**檔案**: `scenarios/data-consistency.integration.spec.ts`

測試項目：
- ✅ Kafka 事件順序保證
  - 按順序處理相關事件
  - 處理並行事件而不衝突
- ✅ DB Writer Service 資料一致性
  - Kafka 事件和資料庫一致性
  - 冪等性處理
  - 失敗重試
- ✅ 跨服務事務一致性
  - 訂閱創建事務一致性
  - 付款失敗回滾
  - 部分失敗處理
- ✅ 資料完整性驗證
  - 參照完整性
  - 防止孤立記錄
  - 狀態轉換有效性
- ✅ 最終一致性

**服務依賴**:
- 所有微服務
- PostgreSQL
- Redis
- Kafka

## 🛠️ 測試基礎設施

### Docker 服務

測試環境使用輕量化的 Docker 配置：

```yaml
services:
  postgres-test:    # PostgreSQL (port 5434)
  redis-test:       # Redis (port 6380)
  zookeeper-test:   # Zookeeper (port 2182)
  kafka-test:       # Kafka (port 9095)
```

**特點**：
- ✅ 使用 tmpfs 提升效能
- ✅ 健康檢查確保服務就緒
- ✅ 獨立的測試網路
- ✅ 自動清理資料

### 測試客戶端

提供以下客戶端：

```typescript
import { TestClients } from './setup';

// PostgreSQL
const dataSource = TestClients.getDataSource();

// Redis
const redis = TestClients.getRedis();

// Kafka Producer
const producer = TestClients.getKafkaProducer();

// Kafka Consumer
const consumer = TestClients.createKafkaConsumer('group-id');
```

### 測試幫助函數

```typescript
import { TestHelpers, TestFixtures } from './helpers';

// HTTP 客戶端
const client = TestHelpers.createHttpClient('http://localhost:3000', token);

// 生成 JWT Token
const token = TestHelpers.generateToken({ userId: '123' });

// 等待條件
await TestHelpers.waitFor(async () => condition, { timeout: 5000 });

// 等待 Kafka 訊息
const message = await TestHelpers.waitForKafkaMessage(consumer, 'topic', predicate);

// 等待資料庫記錄
const record = await TestHelpers.waitForDbRecord(repository, criteria);

// 建立測試數據
const user = TestFixtures.createUser();
const post = TestFixtures.createPost(userId);
const payment = TestFixtures.createPayment(userId, 100);
```

## 📝 編寫測試

### 基本模板

```typescript
import { TestEnvironment, TestClients } from '../../setup';
import { TestHelpers, TestFixtures } from '../../helpers';

describe('My Integration Test', () => {
  beforeAll(async () => {
    await TestEnvironment.setup();
    await TestClients.initialize();
  }, 60000);

  afterAll(async () => {
    await TestClients.close();
    await TestEnvironment.cleanup();
  });

  beforeEach(async () => {
    await TestClients.clearDatabase();
    await TestClients.clearRedis();
  });

  it('should test something', async () => {
    // Arrange
    const data = TestFixtures.createUser();
    
    // Act
    const response = await client.post('/endpoint', data);
    
    // Assert
    expect(response.status).toBe(200);
  });
});
```

### 測試 Kafka 事件

```typescript
it('should publish event to Kafka', async () => {
  // 訂閱 topic
  await kafkaConsumer.subscribe({ topic: 'test-events' });

  let receivedEvent: any = null;
  
  kafkaConsumer.run({
    eachMessage: async ({ message }) => {
      receivedEvent = JSON.parse(message.value!.toString());
    },
  });

  // 觸發事件
  await client.post('/action');

  // 等待事件
  await TestHelpers.sleep(1000);

  // 驗證
  expect(receivedEvent).toBeTruthy();
  expect(receivedEvent.eventType).toBe('expected.type');
});
```

### 測試資料一致性

```typescript
it('should maintain data consistency', async () => {
  // 執行操作
  const response = await client.post('/create', data);

  // 等待事件處理
  await TestHelpers.sleep(2000);

  // 驗證多個資料源一致
  const dbRecord = await repository.findOne({ where: { id } });
  const cacheData = await redis.get(cacheKey);
  
  expect(dbRecord.value).toBe(JSON.parse(cacheData).value);
});
```

## 🐛 除錯技巧

### 查看服務日誌

```bash
# 查看所有服務日誌
docker-compose -f test/integration/docker-compose.test.yml -p suggar-daddy-test logs

# 查看特定服務日誌
docker-compose -f test/integration/docker-compose.test.yml -p suggar-daddy-test logs postgres-test
docker-compose -f test/integration/docker-compose.test.yml -p suggar-daddy-test logs kafka-test
```

### 連接測試資料庫

```bash
# PostgreSQL
docker exec -it suggar-daddy-test-postgres-test-1 psql -U test_user -d suggar_daddy_test

# Redis
docker exec -it suggar-daddy-test-redis-test-1 redis-cli
```

### 保留測試環境

```bash
# 執行測試但保留環境
./test/integration/run-tests.sh -k

# 手動執行測試
npm run test:integration -- --testPathPattern=auth

# 完成後清理
./test/integration/run-tests.sh -c
```

### 單獨測試某個檔案

```bash
npm run test:integration -- test/integration/scenarios/auth-service.integration.spec.ts
```

## ⚙️ 配置

### Jest 配置

整合測試使用專門的 Jest 配置：

```typescript
// test/config/jest/jest.integration.config.ts
{
  testEnvironment: 'node',
  testMatch: ['**/*.integration.spec.ts'],
  testTimeout: 30000,
  maxWorkers: 2,
}
```

### 環境變數

測試使用以下連接配置：

```typescript
{
  postgres: {
    host: 'localhost',
    port: 5434,
    username: 'test_user',
    password: 'test_password',
    database: 'suggar_daddy_test',
  },
  redis: {
    host: 'localhost',
    port: 6380,
  },
  kafka: {
    brokers: ['localhost:9095'],
  },
}
```

## 🔧 故障排除

### 問題：容器啟動失敗

**解決方案**：
```bash
# 清理所有資源
./test/integration/cleanup.sh

# 重新啟動
./test/integration/run-tests.sh
```

### 問題：Port 衝突

**檢查**：
```bash
# 檢查 Port 使用
lsof -i :5434  # PostgreSQL
lsof -i :6380  # Redis
lsof -i :9095  # Kafka
```

**解決**：修改 `docker-compose.test.yml` 中的 Port 映射

### 問題：測試超時

**原因**：
- 服務啟動緩慢
- Kafka 事件處理延遲
- 資料庫查詢慢

**解決方案**：
- 增加 `testTimeout` 設定
- 使用 `waitFor` 函數等待條件
- 檢查服務日誌

### 問題：記憶體不足

**解決方案**：
```bash
# 調整 Docker 記憶體限制
# 在 docker-compose.test.yml 中降低 resources.limits.memory
```

## 📈 持續整合

### GitHub Actions 範例

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run integration tests
        run: ./test/integration/run-tests.sh
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./test/coverage/integration/lcov.info
```

## 📊 測試報告

測試執行後會生成以下報告：

```
test/coverage/integration/
├── lcov.info              # LCOV 格式覆蓋率
├── coverage-summary.json  # JSON 格式摘要
└── html/                  # HTML 報告
    └── index.html
```

查看報告：
```bash
open test/coverage/integration/html/index.html
```

## 🎯 最佳實踐

1. **測試隔離**
   - 每個測試前清空資料
   - 使用獨立的測試資料
   - 避免測試之間的依賴

2. **資料管理**
   - 使用 TestFixtures 建立測試資料
   - 清楚的 Arrange-Act-Assert 結構
   - 完整的資料清理

3. **非同步處理**
   - 使用 `waitFor` 等待條件
   - 設置合理的超時時間
   - 處理事件傳播延遲

4. **錯誤處理**
   - 測試正常流程和錯誤流程
   - 驗證錯誤訊息和狀態碼
   - 測試邊界條件

5. **效能考量**
   - 並行執行獨立測試
   - 使用快取和 tmpfs
   - 限制測試資料量

## 📚 相關文件

- [整合測試策略](../../docs/testing/integration-strategy.md)
- [微服務架構](../../docs/architecture/microservices.md)
- [Kafka 事件設計](../../docs/architecture/kafka-events.md)
- [API 文檔](../../docs/api/README.md)

## 🤝 貢獻指南

新增測試時請：

1. 遵循現有測試結構
2. 加入清楚的測試描述
3. 確保測試可重複執行
4. 更新此 README
5. 驗證 CI/CD 通過

## 📞 支援

如有問題，請：
- 查看故障排除章節
- 檢查服務日誌
- 提交 Issue
