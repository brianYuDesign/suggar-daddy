# 微服務整合測試快速參考

## 🚀 快速開始

```bash
# 執行所有整合測試
./test/integration/run-tests.sh

# 執行特定測試
./test/integration/run-tests.sh auth        # 認證服務
./test/integration/run-tests.sh payment     # 付款服務
./test/integration/run-tests.sh content     # 內容服務
./test/integration/run-tests.sh consistency # 數據一致性

# 開發模式（保留環境）
./test/integration/run-tests.sh -k

# 只啟動環境
./test/integration/run-tests.sh -s

# 清理環境
./test/integration/run-tests.sh -c
```

## 📁 檔案結構

```
test/integration/
├── docker-compose.test.yml          # Docker 測試環境
├── run-tests.sh                     # 測試執行腳本
├── cleanup.sh                       # 清理腳本
├── setup/                           # 測試環境設置
│   ├── test-environment.ts          # Docker 服務管理
│   ├── test-clients.ts              # 測試客戶端
│   └── index.ts
├── helpers/                         # 測試幫助函數
│   ├── test-helpers.ts              # 通用工具
│   ├── test-fixtures.ts             # 測試數據工廠
│   └── index.ts
└── scenarios/                       # 測試場景
    ├── auth-service.integration.spec.ts
    ├── payment-service.integration.spec.ts
    ├── content-service.integration.spec.ts
    └── data-consistency.integration.spec.ts
```

## 🛠️ 常用命令

### NPM Scripts

```bash
# 整合測試
npm run test:integration
npm run test:integration:watch
npm run test:integration:coverage

# 單元測試
npm run test:unit
npm run test:unit:coverage

# 所有測試
npm run test
```

### Docker 操作

```bash
# 啟動測試環境
docker-compose -f test/integration/docker-compose.test.yml -p suggar-daddy-test up -d

# 查看日誌
docker-compose -f test/integration/docker-compose.test.yml -p suggar-daddy-test logs

# 停止環境
docker-compose -f test/integration/docker-compose.test.yml -p suggar-daddy-test down -v

# 連接 PostgreSQL
docker exec -it suggar-daddy-test-postgres-test-1 psql -U test_user -d suggar_daddy_test

# 連接 Redis
docker exec -it suggar-daddy-test-redis-test-1 redis-cli
```

## 📝 測試模板

### 基本測試

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

### Kafka 事件測試

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

## 🔧 測試工具

### HTTP 客戶端

```typescript
// 建立客戶端
const client = TestHelpers.createHttpClient('http://localhost:3000', token);

// 發送請求
const response = await client.post('/endpoint', data);
const response = await client.get('/endpoint');
const response = await client.patch('/endpoint', data);
```

### 資料庫操作

```typescript
// 取得 DataSource
const dataSource = TestClients.getDataSource();

// 取得 Repository
const userRepo = dataSource.getRepository('User');

// 等待記錄
const user = await TestHelpers.waitForDbRecord(
  userRepo, 
  { email: 'test@example.com' }
);
```

### Redis 操作

```typescript
// 取得 Redis 客戶端
const redis = TestClients.getRedis();

// 操作
await redis.set('key', 'value');
const value = await redis.get('key');

// 等待鍵值
const value = await TestHelpers.waitForRedisKey(redis, 'key');
```

### Kafka 操作

```typescript
// 取得 Producer
const producer = TestClients.getKafkaProducer();

// 發送訊息
await producer.send({
  topic: 'test-topic',
  messages: [{ value: JSON.stringify(data) }],
});

// 建立 Consumer
const consumer = TestClients.createKafkaConsumer('group-id');
await consumer.subscribe({ topic: 'test-topic' });
```

### 測試數據

```typescript
// 建立使用者
const user = TestFixtures.createUser();
const creator = TestFixtures.createCreator();

// 建立貼文
const post = TestFixtures.createPost(userId);
const paidPost = TestFixtures.createPaidPost(userId, 9.99);

// 建立付款
const payment = TestFixtures.createPayment(userId, 100);
const subscription = TestFixtures.createSubscription(userId, creatorId);

// 建立事件
const event = TestFixtures.createKafkaEvent('type', data);
```

## 🐛 除錯技巧

### 查看日誌

```bash
# 所有服務
docker-compose -f test/integration/docker-compose.test.yml -p suggar-daddy-test logs

# 特定服務
docker-compose -f test/integration/docker-compose.test.yml -p suggar-daddy-test logs postgres-test
docker-compose -f test/integration/docker-compose.test.yml -p suggar-daddy-test logs kafka-test

# 持續查看
docker-compose -f test/integration/docker-compose.test.yml -p suggar-daddy-test logs -f
```

### 檢查服務狀態

```bash
# 查看容器狀態
docker-compose -f test/integration/docker-compose.test.yml -p suggar-daddy-test ps

# 檢查健康狀態
docker ps | grep suggar-daddy-test
```

### 資料庫查詢

```bash
# 連接 PostgreSQL
docker exec -it suggar-daddy-test-postgres-test-1 psql -U test_user -d suggar_daddy_test

# 查看表
\dt

# 查詢資料
SELECT * FROM users;
SELECT * FROM payments;
```

### Redis 檢查

```bash
# 連接 Redis
docker exec -it suggar-daddy-test-redis-test-1 redis-cli

# 查看所有鍵
KEYS *

# 取得值
GET key

# 查看 TTL
TTL key
```

## ⚠️ 常見問題

### Port 衝突

```bash
# 檢查 Port
lsof -i :5434  # PostgreSQL
lsof -i :6380  # Redis
lsof -i :9095  # Kafka

# 停止佔用的服務
kill -9 <PID>
```

### 容器啟動失敗

```bash
# 完全清理
./test/integration/cleanup.sh

# 重新啟動
./test/integration/run-tests.sh
```

### 測試超時

```typescript
// 增加超時時間
it('slow test', async () => {
  // ...
}, 60000); // 60 秒

// 使用 waitFor
await TestHelpers.waitFor(
  async () => condition,
  { timeout: 10000 }
);
```

### 記憶體不足

```bash
# 檢查 Docker 記憶體
docker stats

# 調整 docker-compose.test.yml 中的 limits
```

## 📊 測試覆蓋範圍

| 服務 | 測試數量 | 覆蓋項目 |
|------|---------|---------|
| Auth Service | 15+ | 註冊、登入、Token、Session |
| Payment Service | 20+ | Stripe、Kafka、訂閱、一致性 |
| Content Service | 25+ | 貼文、媒體、快取、權限 |
| Data Consistency | 15+ | 事件、事務、完整性、一致性 |

## 🎯 測試重點

- ✅ 服務間 API 呼叫
- ✅ JWT Token 驗證流程
- ✅ Kafka 事件發布和消費
- ✅ 資料庫事務一致性
- ✅ Redis 快取機制
- ✅ 錯誤處理和重試
- ✅ 權限控制
- ✅ 最終一致性

## 📚 相關文件

- [詳細 README](README.md)
- [實施報告](INTEGRATION-TEST-REPORT.md)
- [Jest 配置](../config/jest/jest.integration.config.ts)

## 💡 提示

1. **測試前清空資料**：確保測試隔離
2. **使用 waitFor**：處理非同步操作
3. **檢查日誌**：出錯時查看服務日誌
4. **保留環境**：開發時使用 `-k` 選項
5. **並行執行**：測試應該可以並行執行

## 🚦 CI/CD 整合

```yaml
# .github/workflows/integration-tests.yml
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
```

---

**最後更新**: 2024-02-17
**維護者**: Backend Team
