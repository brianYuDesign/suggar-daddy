# 運營手冊

**版本**: v1.0  
**最後更新**: 2026-02-17  
**適用對象**: 運營團隊、客服團隊、On-call 工程師

---

## 📖 系統概覽

### 架構簡介
Suggar Daddy 採用 **NX monorepo** 架構，基於事件驅動的微服務設計：
- 11 個 NestJS 微服務
- 2 個 Next.js 前端（Web + Admin）
- PostgreSQL (Master-Replica) 資料庫
- Redis Cluster 快取
- Kafka 訊息佇列

### 核心資料流
```
Client → API Gateway (:3000)
  → Service (讀取 Redis cache)
  → Service (寫入 Kafka event)
    → db-writer-service
      → PostgreSQL (persist)
```

**關鍵特性**: 服務不直接寫入資料庫，透過 Kafka 事件由 db-writer-service 統一處理，確保最終一致性。

### 核心服務

| 服務 | 端口 | 職責 | 關鍵性 |
|------|------|------|--------|
| api-gateway | 3000 | API 路由代理 | Critical |
| auth-service | 3002 | 認證授權 | Critical |
| user-service | 3001 | 用戶管理 | Critical |
| payment-service | 3007 | 支付處理 | Critical |
| subscription-service | 3009 | 訂閱管理 | High |
| content-service | 3006 | 內容管理 | High |
| matching-service | 3003 | 配對系統 | Medium |
| media-service | 3010 | 媒體上傳 | High |
| messaging-service | 3005 | 私訊系統 | Medium |
| notification-service | 3008 | 通知推送 | Medium |
| admin-service | 3011 | 管理後台 | High |
| db-writer-service | — | 資料持久化 | Critical |

---

## 🏢 日常運營流程

### 1. 用戶支援流程

#### 用戶註冊問題

**常見問題**:
- 收不到驗證郵件
- 註冊失敗
- Email 格式錯誤

**處理步驟**:
1. 確認用戶輸入的 email 格式正確
2. 指導用戶檢查垃圾郵件夾
3. 查詢後台日誌：
   ```bash
   docker logs auth-service | grep "{email}"
   ```
4. 檢查 Admin Panel → Users → 搜尋用戶查看註冊狀態
5. 如果是系統問題，升級至工程團隊
6. 記錄問題至工單系統

**常見原因**:
- Email 服務暫時不可用
- Email 格式包含特殊字符
- 用戶 Email 已被註冊

#### 登入問題

**常見問題**:
- 忘記密碼
- 帳號被鎖定
- JWT Token 過期

**處理步驟**:
1. **忘記密碼**: 指導用戶使用「忘記密碼」功能
2. **帳號鎖定**: 
   - Admin Panel → Users → 搜尋用戶
   - 查看帳號狀態（active/suspended/banned）
   - 如需解鎖，點擊「解鎖帳戶」按鈕
   - 記錄解鎖原因
3. **Token 過期**: 指導用戶重新登入
4. 如持續失敗，檢查 auth-service 日誌

#### 支付問題

**常見問題**:
- 支付失敗
- 重複扣款
- 支付成功但未收到訂閱權限

**處理步驟**:
1. 查詢交易記錄：
   - Admin Panel → Payments → 搜尋交易
   - 記下 Transaction ID
2. 確認 Stripe 交易狀態：
   - 登入 Stripe Dashboard
   - 搜尋 Payment Intent ID
   - 確認實際扣款狀態
3. **支付成功但未授權**:
   - 檢查 Kafka 訊息是否處理
   - 查看 db-writer-service 日誌
   - 必要時手動授權訂閱
4. **重複扣款**:
   - 確認是否為幂等性問題
   - 發起退款（Stripe Dashboard）
   - 通知財務團隊
5. 通知用戶處理結果

**注意事項**:
- 所有退款需財務主管審核
- 記錄完整的處理過程
- 48 小時內回覆用戶

#### 訂閱問題

**常見問題**:
- 訂閱未生效
- 訂閱自動續費失敗
- 取消訂閱後仍然扣款

**處理步驟**:
1. Admin Panel → Subscriptions → 搜尋用戶訂閱
2. 查看訂閱狀態：
   - active: 正常
   - expired: 已過期
   - cancelled: 已取消
   - pending: 待處理
3. **訂閱未生效**:
   - 確認支付成功
   - 檢查訂閱記錄是否創建
   - 手動創建訂閱（如需要）
4. **自動續費失敗**:
   - 檢查用戶支付方式
   - 查看 Stripe webhook 日誌
   - 通知用戶更新支付方式
5. 記錄處理結果

#### 提現問題

**常見問題**:
- 提現申請卡住
- 提現金額錯誤
- 提現失敗

**處理步驟**:
1. 查詢提現記錄：
   - Admin Panel → Withdrawals
   - 搜尋用戶提現記錄
2. 確認用戶錢包餘額：
   - Admin Panel → Users → {user} → Wallet
   - 驗證可提現金額
3. 審核提現申請（見下節詳細流程）
4. **提現失敗**:
   - 查看失敗原因
   - 確認銀行資訊正確
   - 檢查支付網關狀態
   - 必要時聯繫財務團隊手動處理
5. 通知用戶處理結果

---

### 2. 內容審核流程

#### 內容審核標準

**禁止內容** ❌:
- 色情、裸露、性暗示內容（根據平台定位調整）
- 暴力、血腥內容
- 仇恨言論、歧視
- 非法內容、毒品
- 侵犯版權內容
- 未成年人相關內容

**謹慎內容** ⚠️:
- 爭議性話題
- 敏感政治內容
- 可能引起不適的內容

**允許內容** ✅:
- 符合平台規範的創作內容
- 教育性內容
- 娛樂內容
- 合法的商業宣傳

#### 審核步驟

1. **登入審核系統**:
   - Admin Panel → Content Moderation
   - 查看待審核內容佇列

2. **逐一審核**:
   - 點擊內容查看詳情
   - 查看內容類型（文字、圖片、影片）
   - 查看用戶歷史記錄（是否有違規紀錄）

3. **判斷與決策**:
   - ✅ **核准**: 內容符合規範
   - ❌ **拒絕**: 明顯違反規範
   - ⚠️ **標記為敏感**: 需警告提示的內容
   - 🔍 **升級審核**: 難以判斷的內容，交由主管審核

4. **記錄決策**:
   - 如拒絕，必須選擇拒絕理由
   - 添加內部備註（如需要）
   - 系統自動記錄審核人與時間

5. **通知用戶**:
   - 核准：內容正常發布
   - 拒絕：發送通知說明原因
   - 嚴重違規：警告或暫停帳戶

#### 用戶檢舉處理

1. **查看檢舉**:
   - Admin Panel → Reports
   - 查看檢舉佇列（按時間排序）

2. **評估檢舉**:
   - 查看被檢舉內容
   - 閱讀檢舉理由
   - 查看檢舉人資訊（是否為惡意檢舉）
   - 查看被檢舉人歷史記錄

3. **採取行動**:
   - **檢舉成立**:
     - 移除違規內容
     - 警告用戶（第一次）
     - 暫停帳戶（重複違規）
     - 永久封禁（嚴重違規）
   - **檢舉不成立**:
     - 駁回檢舉
     - 記錄原因

4. **通知結果**:
   - 通知檢舉人處理結果
   - 通知被檢舉人（如有處罰）

#### 審核時效要求

- **普通內容**: 24 小時內
- **用戶檢舉**: 12 小時內
- **緊急檢舉**（涉及安全）: 2 小時內

---

### 3. 提現審核流程

#### 審核檢查項目

基本檢查：
- [ ] 用戶身份已驗證（KYC 完成）
- [ ] 提現金額 ≤ 可用餘額
- [ ] 提現金額 ≥ 最低門檻（$50）
- [ ] 銀行/支付資訊完整且正確
- [ ] 帳戶狀態正常（無封禁/警告）

風險檢查：
- [ ] 無異常活動（如短時間大量訂閱）
- [ ] 收入來源合理（查看收入明細）
- [ ] 無退款/糾紛記錄
- [ ] 帳戶年齡 > 30 天（新帳戶需額外審核）

#### 審核步驟

1. **查看申請**:
   - Admin Panel → Withdrawals → Pending
   - 按提現金額排序（優先審核大額）

2. **審核用戶資訊**:
   - 點擊提現申請查看詳情
   - 確認用戶 KYC 狀態
   - 確認銀行資訊（帳戶名、帳號、銀行代碼）

3. **檢查餘額與金額**:
   - 查看當前錢包餘額
   - 確認可提現金額（餘額 - 凍結金額）
   - 驗證提現金額合理性

4. **審查收入記錄**:
   - Admin Panel → Users → {user} → Transactions
   - 查看近期收入來源
   - 確認無異常交易

5. **決策**:
   - ✅ **核准**: 符合所有條件
   - ❌ **拒絕**: 說明拒絕原因
   - ⏸️ **暫緩**: 需進一步調查

6. **處理與通知**:
   - 核准後，系統自動發起轉帳
   - 發送通知給用戶
   - 記錄審核結果

#### 特殊情況處理

**大額提現** (≥ $5,000):
- 需財務主管雙重審核
- 額外驗證身份
- 可要求提供收入證明

**新帳戶提現** (註冊 < 30 天):
- 額外審核收入來源
- 限制首次提現金額（建議 ≤ $500）
- 必要時電話確認

**可疑活動**:
- 短時間大量訂閱（可能為洗錢）
- 收入模式異常
- 暫緩提現，升級至風控團隊調查
- 必要時凍結帳戶

#### 處理時效

- **一般提現**: 3 個工作日內審核並處理
- **大額提現**: 5 個工作日內
- **緊急提現**: 24 小時內（需特殊理由）

---

## ⚠️ 異常處理流程

### 1. 系統故障

#### 服務無法訪問

**症狀**: 
- 用戶無法訪問網站
- API 回應 502/504 錯誤
- 頁面載入緩慢或超時

**處理步驟**:

1. **確認問題範圍**:
   - 詢問用戶具體錯誤訊息
   - 確認是所有用戶還是部分用戶
   - 檢查監控 Dashboard（Grafana）

2. **檢查服務狀態**:
   ```bash
   # SSH 到服務器
   docker ps | grep -v "Up"  # 查看未運行的容器
   
   # 檢查特定服務
   docker ps | grep api-gateway
   docker logs --tail 100 api-gateway
   ```

3. **嘗試重啟服務**:
   ```bash
   # 重啟單個服務
   docker-compose restart api-gateway
   
   # 如果問題持續，重啟所有服務
   docker-compose restart
   ```

4. **檢查資源使用**:
   ```bash
   # CPU 和記憶體
   docker stats --no-stream
   
   # 磁碟空間
   df -h
   ```

5. **升級處理**:
   - 如果 5 分鐘內無法解決，立即聯繫 On-call 工程師
   - 提供錯誤日誌和問題描述
   - 在狀態頁面更新事件（如有）

#### 資料庫連線問題

**症狀**:
- 服務日誌出現 "DB connection error"
- API 回應緩慢
- 查詢超時

**處理步驟**:

1. **檢查 PostgreSQL 狀態**:
   ```bash
   docker logs postgres-master --tail 100
   docker logs postgres-replica --tail 100
   ```

2. **檢查連線數**:
   ```bash
   docker exec -it postgres-master psql -U suggar_user -d suggar_db -c "SELECT count(*) FROM pg_stat_activity;"
   ```

3. **檢查慢查詢**:
   ```bash
   docker exec -it postgres-master psql -U suggar_user -d suggar_db -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query FROM pg_stat_activity WHERE (now() - pg_stat_activity.query_start) > interval '5 seconds';"
   ```

4. **臨時緩解措施**:
   - 如連線數接近上限，考慮重啟消耗最多連線的服務
   - 檢查是否有長時間運行的查詢，必要時 kill

5. **升級至 DBA**:
   - 如涉及資料庫層級問題
   - 提供日誌和查詢記錄

**注意**: ⚠️ 不要輕易重啟資料庫，可能導致資料遺失

#### Redis 連線問題

**症狀**:
- 快取失效
- 系統響應變慢
- 日誌出現 "Redis connection error"

**處理步驟**:

1. **檢查 Redis 狀態**:
   ```bash
   docker logs redis-master --tail 100
   docker exec -it redis-master redis-cli ping
   # 應該回應 PONG
   ```

2. **檢查記憶體使用**:
   ```bash
   docker exec -it redis-master redis-cli info memory
   ```

3. **清理快取（如需要）**:
   ```bash
   # 謹慎操作！會清除所有快取
   docker exec -it redis-master redis-cli FLUSHDB
   ```

4. **重啟 Redis**:
   ```bash
   docker-compose restart redis-master redis-replica
   ```

**影響**: Redis 故障時，系統應能降級至直接查詢資料庫，但性能會下降。

#### Kafka 訊息堆積

**症狀**:
- 寫入操作延遲
- db-writer-service 日誌顯示消費緩慢
- Kafka lag 增加

**處理步驟**:

1. **檢查 Kafka 狀態**:
   ```bash
   docker logs kafka --tail 100
   docker exec -it kafka kafka-topics.sh --list --bootstrap-server localhost:9092
   ```

2. **檢查 Consumer Lag**:
   ```bash
   docker exec -it kafka kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --all-groups
   ```

3. **檢查 db-writer-service**:
   ```bash
   docker logs db-writer-service --tail 100
   # 查看是否有錯誤或處理緩慢
   ```

4. **臨時緩解**:
   - 增加 db-writer-service 實例數（如架構支援）
   - 檢查資料庫是否為瓶頸

5. **升級處理**: 
   - 如 lag 持續增加超過 10,000 訊息
   - 聯繫工程團隊

---

### 2. 支付異常

#### 支付失敗但用戶已扣款

**處理步驟**:

1. **確認扣款狀態**:
   - 登入 Stripe Dashboard
   - 搜尋 Payment Intent ID
   - 確認 Charge 狀態（succeeded/failed）

2. **檢查內部記錄**:
   - Admin Panel → Payments → 搜尋交易
   - 查看是否為「孤兒交易」（Stripe 成功但內部未記錄）

3. **處理方案**:
   - **如確認扣款但未授權服務**:
     - 手動授權訂閱（Admin Panel → Subscriptions → Create）
     - 記錄為孤兒交易處理案例
   - **如確認扣款為錯誤**:
     - 發起退款（Stripe Dashboard → Refund）
     - 通知財務團隊
     - 記錄退款原因

4. **通知用戶**:
   - 說明處理結果
   - 提供交易明細
   - 致歉（如為系統問題）

5. **後續追蹤**:
   - 記錄至工單系統
   - 通知工程團隊檢查孤兒交易機制

#### 訂閱未生效

**處理步驟**:

1. **確認支付成功**:
   - Admin Panel → Payments
   - 確認 Transaction 狀態為 "completed"

2. **檢查 Kafka 訊息**:
   ```bash
   docker logs db-writer-service | grep "subscription.created"
   # 查看是否有處理該訂閱的日誌
   ```

3. **檢查訂閱記錄**:
   - Admin Panel → Subscriptions → 搜尋用戶
   - 確認訂閱是否存在

4. **手動授權**:
   - 如確認支付但無訂閱記錄
   - Admin Panel → Subscriptions → Create Subscription
   - 填寫必要資訊（User, Tier, Start Date）
   - 點擊「建立訂閱」

5. **驗證權限**:
   - 確認用戶可以訪問訂閱內容
   - 通知用戶已處理完成

#### Webhook 失敗

**症狀**:
- Stripe webhook 端點回應錯誤
- 訂閱續費未自動處理
- 退款未同步

**處理步驟**:

1. **檢查 Webhook 日誌**:
   - Stripe Dashboard → Developers → Webhooks
   - 查看失敗的 webhook events
   - 記下 Event ID

2. **檢查 payment-service 日誌**:
   ```bash
   docker logs payment-service | grep "webhook"
   ```

3. **重試 Webhook**:
   - Stripe Dashboard → 找到失敗的 event
   - 點擊「Resend」重新發送

4. **手動處理**:
   - 如 webhook 無法成功
   - 根據 event 類型手動處理（如手動更新訂閱狀態）

---

### 3. 提現問題

#### 提現處理失敗

**處理步驟**:

1. **查看失敗原因**:
   - Admin Panel → Withdrawals → {withdrawal_id}
   - 查看錯誤訊息

2. **確認銀行資訊**:
   - 用戶銀行帳號正確
   - 銀行代碼有效
   - 帳戶名稱匹配

3. **檢查支付網關**:
   - 確認支付網關服務正常
   - 檢查 API 回應

4. **重試處理**:
   - 如為暫時性錯誤（如網路問題）
   - Admin Panel → Withdrawals → 點擊「重試」

5. **手動處理**:
   - 如系統無法處理
   - 聯繫財務團隊手動轉帳
   - 在系統中標記為「手動處理完成」

6. **通知用戶**:
   - 說明延遲原因
   - 提供預計處理時間

---

## 📊 監控與告警

### 關鍵指標

#### 系統健康指標

| 指標 | 正常範圍 | 警告 | Critical |
|------|----------|------|----------|
| 服務可用性 | ≥ 99.5% | < 99.5% | < 99% |
| API 響應時間 (P95) | < 500ms | 500-1000ms | > 1000ms |
| 錯誤率 | < 0.5% | 0.5-1% | > 1% |
| CPU 使用率 | < 70% | 70-85% | > 85% |
| 記憶體使用率 | < 80% | 80-90% | > 90% |
| 磁碟使用率 | < 80% | 80-90% | > 90% |
| DB 連線數 | < 80% | 80-95% | > 95% |

#### 業務指標

追蹤頻率：每日

- **註冊數**: 新用戶註冊數量
- **活躍用戶**: DAU (Daily Active Users)
- **訂閱轉化率**: 訂閱用戶 / 註冊用戶
- **GMV**: 總交易金額（Gross Merchandise Value）
- **ARPU**: 平均每用戶收入
- **留存率**: Day 1, Day 7, Day 30 留存
- **支付成功率**: 成功支付 / 總支付嘗試

### 告警處理

#### 告警級別

- 🔴 **Critical**: 立即處理（15 分鐘內響應）
  - 服務完全不可用
  - 資料遺失風險
  - 安全事件
  
- 🟡 **Warning**: 盡快處理（1 小時內響應）
  - 性能下降
  - 錯誤率上升
  - 資源使用率高

- 🟢 **Info**: 記錄追蹤
  - 一般資訊
  - 趨勢通知

#### 常見告警與處理

**High Error Rate** 🔴

觸發條件：錯誤率 > 1%

處理步驟：
1. 檢查 Grafana 確認影響範圍
2. 查看錯誤日誌識別錯誤模式
3. 確定是哪個服務產生錯誤
4. 如為程式碼問題，建立緊急 Bug ticket
5. 如影響嚴重，考慮回滾至上一版本

**High Response Time** 🟡

觸發條件：P95 響應時間 > 1000ms

處理步驟：
1. 檢查 Jaeger 追蹤慢請求
2. 識別瓶頸（資料庫、外部 API、程式碼）
3. 檢查資料庫慢查詢日誌
4. 檢查外部 API（如 Stripe）延遲
5. 檢查系統資源使用（CPU、記憶體）
6. 臨時緩解：增加快取、重啟服務
7. 長期解決：優化代碼、加索引

**Service Down** 🔴

觸發條件：服務健康檢查失敗

處理步驟：
1. 立即確認哪個服務掛掉
2. 檢查服務日誌：
   ```bash
   docker logs {service-name} --tail 100
   ```
3. 嘗試重啟：
   ```bash
   docker-compose restart {service-name}
   ```
4. 如無法恢復，啟動災難恢復流程
5. 通知 On-call 工程師
6. 更新狀態頁面

**Database Connection Pool Exhausted** 🔴

觸發條件：DB 連線數 > 95% pool size

處理步驟：
1. 檢查是否有慢查詢
2. 檢查是否有 connection leak
3. 臨時解決：增加 pool size
4. 重啟消耗最多連線的服務
5. 升級至工程團隊調查根本原因

**Kafka Lag High** 🟡

觸發條件：Consumer lag > 5,000

處理步驟：
1. 檢查 db-writer-service 健康狀態
2. 檢查資料庫寫入是否緩慢
3. 監控 lag 變化趨勢
4. 如持續增加，升級至工程團隊

---

## 🔄 備份與恢復

### 備份策略

#### 資料庫備份
- **全量備份**: 每日 02:00 AM
- **增量備份**: 每小時
- **保留期限**: 30 天
- **儲存位置**: AWS S3 (生產環境)

#### 檔案備份
- **媒體檔案**: 已儲存在 S3（自動備份）
- **配置檔案**: Git 版本控制

#### 備份驗證
- 每週測試備份恢復
- 每月完整災難恢復演練

### 恢復流程

#### 資料庫恢復

**場景**: 資料庫損壞或誤刪資料

**步驟**:

1. **停止所有寫入**:
   ```bash
   # 停止 db-writer-service
   docker-compose stop db-writer-service
   
   # 停止其他服務（防止新資料寫入）
   docker-compose stop
   ```

2. **確認備份檔案**:
   ```bash
   # 列出可用備份
   aws s3 ls s3://suggar-daddy-backups/postgres/
   
   # 下載最新備份
   aws s3 cp s3://suggar-daddy-backups/postgres/backup-2026-02-17.sql.gz ./
   ```

3. **恢復資料庫**:
   ```bash
   # 解壓縮
   gunzip backup-2026-02-17.sql.gz
   
   # 恢復
   docker exec -i postgres-master psql -U suggar_user -d suggar_db < backup-2026-02-17.sql
   ```

4. **驗證資料完整性**:
   ```bash
   # 檢查表數量
   docker exec -it postgres-master psql -U suggar_user -d suggar_db -c "\dt"
   
   # 檢查關鍵資料
   docker exec -it postgres-master psql -U suggar_user -d suggar_db -c "SELECT COUNT(*) FROM users;"
   ```

5. **重啟服務**:
   ```bash
   docker-compose up -d
   ```

6. **監控與驗證**:
   - 檢查所有服務正常運行
   - 測試關鍵功能（登入、支付、查詢）
   - 監控錯誤日誌

#### 服務回滾

**場景**: 新版本部署後發現重大問題

**步驟**:

1. **確認需要回滾的版本**:
   ```bash
   git log --oneline -10
   # 記下穩定版本的 commit hash
   ```

2. **執行回滾**:
   ```bash
   # 回滾代碼
   git revert {commit-hash}
   
   # 或使用 Git reset（注意：會丟失後續 commit）
   git reset --hard {stable-commit-hash}
   ```

3. **重新建置**:
   ```bash
   npm run build:all
   ```

4. **重新部署**:
   ```bash
   docker-compose down
   docker-compose build
   docker-compose up -d
   ```

5. **驗證回滾成功**:
   - 檢查服務版本
   - 測試關鍵功能
   - 監控錯誤日誌

6. **通知相關人員**:
   - 團隊成員
   - 用戶（如有影響）

#### 快速回滾（使用 Docker tag）

如果使用 Docker image tags：

```bash
# 回滾至上一個穩定版本
docker-compose down
docker-compose -f docker-compose.prod.yml up -d --scale api-gateway=1 --image api-gateway:stable
```

---

## 📞 升級流程

### 升級路徑

```
Level 1: 客服團隊（一般用戶問題）
  ↓ 無法解決或技術問題
Level 2: On-call 工程師（技術問題、服務故障）
  ↓ 複雜或需決策
Level 3: 團隊 Lead（複雜技術問題、業務決策）
  ↓ 重大事件
Level 4: 技術總監/CTO（系統級故障、重大決策）
```

### 升級標準

#### 立即升級（Level 2+）
- 🔴 Critical 告警觸發
- 🔴 服務完全不可用
- 🔴 資料遺失風險
- 🔴 安全事件或漏洞
- 🔴 支付系統故障
- 🔴 大量用戶反映同一問題

#### 1 小時內升級（Level 2）
- 🟡 無法解決的技術問題
- 🟡 多個服務同時故障
- 🟡 性能嚴重下降
- 🟡 Kafka/Redis 故障

#### 工作時間升級（Level 2-3）
- 一般技術問題諮詢
- 功能需求變更
- 設定調整請求
- 非緊急 Bug

### 升級溝通模板

**Slack 訊息範本**:

```
🚨 [Priority] Issue Report

**Issue**: [簡短描述]
**Affected**: [影響範圍 - 所有用戶/部分用戶/特定功能]
**Severity**: [Critical/High/Medium]
**Started**: [發生時間]
**Current Status**: [當前狀態]

**Actions Taken**:
- [已採取的步驟 1]
- [已採取的步驟 2]

**Logs/Errors**:
```
[關鍵錯誤訊息]
```

**Request**: [需要的支援]

Reported by: @username
```

---

## 📚 參考資源

### 文檔連結

- [系統架構文檔](../architecture.md)
- [API 文檔](../02-開發指南.md)
- [開發指南](../../CLAUDE.md)
- [測試指南](../qa/README.md)
- [部署腳本文檔](../../scripts/README.md)

### 監控工具連結

- **Grafana**: http://localhost:3030
  - 用戶: admin
  - 密碼: [在 secrets/grafana_password]
  
- **Prometheus**: http://localhost:9090
  
- **Jaeger**: http://localhost:16686

### 管理工具

- **Admin Panel**: http://localhost:4300
  - 用戶管理、內容審核、提現審核

- **PostgreSQL Admin (pgAdmin)**: http://localhost:5050 (如有配置)

- **Redis Commander**: http://localhost:8081 (如有配置)

### 外部服務

- **Stripe Dashboard**: https://dashboard.stripe.com
  - 支付記錄、退款、webhook 管理

### 緊急聯絡

| 角色 | 聯絡方式 | 負責範圍 |
|------|----------|----------|
| On-call 工程師 | [Slack: #oncall] | 技術問題、緊急修復 |
| Tech Lead | [待填寫] | 複雜技術決策 |
| DevOps Lead | [待填寫] | 基礎設施、部署 |
| QA Lead | [待填寫] | 測試、品質問題 |
| Product Manager | [待填寫] | 業務決策、優先級 |
| 財務主管 | [待填寫] | 提現審核、退款 |
| 法務 | [待填寫] | 合規、法律問題 |

### Slack 頻道

- **#general**: 一般討論
- **#tech-support**: 技術支援
- **#incidents**: 事件報告與追蹤
- **#alerts**: 自動告警通知
- **#deployments**: 部署通知
- **#customer-support**: 客服團隊

---

## 📝 日常檢查清單

### 每日檢查（運營團隊）

- [ ] 查看監控 Dashboard，確認所有服務正常
- [ ] 檢查錯誤日誌，識別異常模式
- [ ] 處理待審核內容（目標：24 小時內）
- [ ] 處理用戶檢舉（目標：12 小時內）
- [ ] 審核提現申請（目標：3 工作日內）
- [ ] 回覆用戶支援工單
- [ ] 記錄關鍵業務指標（註冊數、GMV 等）

### 每週檢查（技術團隊）

- [ ] 測試資料庫備份恢復
- [ ] 檢查磁碟空間使用
- [ ] 審查告警歷史，識別趨勢
- [ ] 更新運營文檔（如有變更）
- [ ] 團隊 sync 會議（回顧問題與改進）

### 每月檢查（管理層）

- [ ] 完整災難恢復演練
- [ ] 審查 SLA 達成率
- [ ] 審查關鍵業務指標趨勢
- [ ] 更新緊急聯絡清單
- [ ] 審查運營流程，識別改進機會

---

## 📖 附錄

### A. 常見錯誤代碼

| 錯誤代碼 | 說明 | 常見原因 | 處理方式 |
|----------|------|----------|----------|
| AUTH_001 | JWT Token 無效 | Token 過期或被撤銷 | 重新登入 |
| AUTH_002 | 未授權訪問 | 無權限訪問資源 | 檢查用戶角色 |
| PAY_001 | 支付處理失敗 | Stripe API 錯誤 | 檢查 Stripe 狀態 |
| PAY_002 | 餘額不足 | 錢包餘額 < 提現金額 | 通知用戶儲值 |
| SUB_001 | 訂閱不存在 | 訂閱已過期或取消 | 檢查訂閱狀態 |
| MEDIA_001 | 檔案上傳失敗 | 檔案過大或格式錯誤 | 檢查檔案限制 |

### B. 快速命令參考

```bash
# 查看所有服務狀態
docker-compose ps

# 查看服務日誌
docker logs {service-name} -f --tail 100

# 重啟服務
docker-compose restart {service-name}

# 進入容器 shell
docker exec -it {service-name} sh

# 查看資料庫
docker exec -it postgres-master psql -U suggar_user -d suggar_db

# 查看 Redis
docker exec -it redis-master redis-cli

# 檢查系統資源
docker stats --no-stream

# 清理磁碟空間
docker system prune -a
```

### C. 業務規則速查

**訂閱層級** (範例，需根據實際調整):
- Free: $0/月，基本功能
- Bronze: $9.99/月，訪問部分內容
- Silver: $19.99/月，訪問大部分內容
- Gold: $49.99/月，訪問所有內容 + 優先支援

**提現規則**:
- 最低提現金額: $50
- 手續費: 2% (最低 $1)
- 處理時間: 3-5 個工作日
- KYC 要求: 提現金額 > $500 需完成身份驗證

**內容審核**:
- 普通內容: 24 小時內
- 用戶檢舉: 12 小時內
- 緊急檢舉: 2 小時內

---

**文檔維護**: 此文檔應隨系統更新而更新  
**審查週期**: 每季度審查一次  
**文檔擁有者**: Product Manager + DevOps Lead  
**最後審查日期**: 2026-02-17

---

**版本歷史**:
- v1.0 (2026-02-17): 初版發布
