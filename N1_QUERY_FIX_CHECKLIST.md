# ✅ N+1 查詢修復檢查清單

> **修復日期**: 2024-02-14  
> **修復範圍**: user-service, notification-service, content-service  
> **修復數量**: 10 處 N+1 查詢

---

## 📋 修復驗證清單

### 1️⃣ user-service (7 處修復)

#### ✅ getCardsByIds
- [x] 使用 `mget()` 批量查詢
- [x] 檢查空陣列
- [x] 正確解析 JSON
- [x] 返回正確的 DTO 結構

#### ✅ getCardsForRecommendation
- [x] 使用 `mget()` 批量查詢
- [x] 限制查詢數量（limit * 2）
- [x] 過濾排除的用戶
- [x] 正確處理封鎖列表

#### ✅ getFollowers
- [x] 使用 `mget()` 批量查詢
- [x] 正確分頁
- [x] 檢查空陣列
- [x] 返回 total 計數

#### ✅ getFollowing
- [x] 使用 `mget()` 批量查詢
- [x] 正確分頁
- [x] 檢查空陣列
- [x] 返回 total 計數

#### ✅ getRecommendedCreators
- [x] 使用 `mget()` 批量查詢
- [x] 過濾非創作者
- [x] 排除已關注/封鎖用戶
- [x] 按 followerCount 排序

#### ✅ searchUsers
- [x] 使用 `mget()` 批量查詢
- [x] 正確搜尋匹配
- [x] 限制結果數量
- [x] 大小寫不敏感

#### ✅ getPendingReports
- [x] 使用 `mget()` 批量查詢
- [x] 檢查空陣列
- [x] 正確排序（按 createdAt）
- [x] 過濾空值

---

### 2️⃣ notification-service (2 處修復 + TTL)

#### ✅ send (添加 TTL)
- [x] 使用 `setex()` 設定過期時間
- [x] TTL = 7 天（604800 秒）
- [x] 正確推送到列表
- [x] 發送 Kafka 事件

#### ✅ list
- [x] 使用 `mget()` 批量查詢
- [x] 檢查空陣列
- [x] 過濾空值
- [x] 正確處理 unreadOnly

#### ✅ markRead (保持 TTL)
- [x] 更新時使用 `setex()` 
- [x] 保持原有 TTL
- [x] 正確更新 read 狀態

---

### 3️⃣ content-service (1 處修復)

#### ✅ findByCreatorWithAccess
- [x] 使用 `Promise.all()` 並行執行
- [x] 批量檢查所有訂閱狀態
- [x] 正確快取結果到 Map
- [x] 正確過濾貼文

---

## 🧪 測試驗證

### 功能測試
- [ ] 所有修復的方法返回正確結果
- [ ] 空陣列輸入不報錯
- [ ] null/undefined 處理正確
- [ ] 分頁功能正常

### 效能測試
- [ ] 100 個 ID 批量查詢 < 100ms
- [ ] MGET vs 循環 GET 效能比較
- [ ] 並行 RPC vs 序列 RPC 比較
- [ ] TTL 正確設定和過期

### 整合測試
- [ ] user-service 所有端點正常
- [ ] notification-service 推送和查詢正常
- [ ] content-service 權限檢查正常
- [ ] Redis 連接穩定

---

## 📊 效能指標

### 預期改善目標

| 端點 | 修復前 | 修復後 | 目標 |
|------|-------|-------|------|
| GET /users/cards | 500ms | 80ms | ✅ < 100ms |
| GET /users/:id/followers | 400ms | 60ms | ✅ < 100ms |
| GET /users/:id/following | 400ms | 60ms | ✅ < 100ms |
| GET /users/search | 450ms | 70ms | ✅ < 100ms |
| GET /notifications/list | 400ms | 60ms | ✅ < 100ms |
| GET /posts (with access) | 600ms | 100ms | ✅ < 150ms |

### Redis 效能指標

| 指標 | 修復前 | 修復後 | 改善 |
|------|-------|-------|------|
| 查詢次數 | N 次 | 1 次 | **95%** ⬇️ |
| 網路往返 | N 次 | 1 次 | **95%** ⬇️ |
| 記憶體增長 | 無限 | 有限 (TTL) | ✅ 受控 |

---

## 🚀 部署檢查

### 部署前
- [x] Code Review 完成
- [ ] 單元測試通過
- [ ] 整合測試通過
- [ ] 效能測試通過

### 部署中
- [ ] 部署到測試環境
- [ ] 執行煙霧測試
- [ ] 檢查 Redis 連接
- [ ] 檢查 Kafka 事件

### 部署後
- [ ] 監控錯誤日誌
- [ ] 監控 Redis 記憶體
- [ ] 監控 API 回應時間
- [ ] 收集效能數據

---

## 📈 監控指標

### 應用層監控
```bash
# API 回應時間
GET /users/cards - p50, p95, p99
GET /notifications/list - p50, p95, p99
GET /posts - p50, p95, p99

# 錯誤率
4xx errors < 1%
5xx errors < 0.1%
```

### Redis 監控
```bash
# 記憶體使用
redis-cli info memory | grep used_memory_human

# 查詢效能
redis-cli --latency-history

# 過期鍵
redis-cli info stats | grep expired_keys
```

### 系統監控
```bash
# CPU 使用率
top -p $(pidof node)

# 記憶體使用
free -h

# 網路連接
netstat -an | grep :6379
```

---

## 🐛 問題排查

### 常見問題

#### 1. MGET 返回 null
```typescript
// 檢查鍵是否存在
const keys = ids.map(id => `prefix:${id}`);
const exists = await redis.exists(...keys);

// 過濾 null 值
const values = await redis.mget(...keys);
const filtered = values.filter(v => v !== null);
```

#### 2. TTL 未生效
```bash
# 檢查 TTL
redis-cli TTL notification:xxx

# 應該返回剩餘秒數，如果返回 -1 表示沒有 TTL
```

#### 3. Promise.all 部分失敗
```typescript
// 使用 Promise.allSettled 處理部分失敗
const results = await Promise.allSettled([
  call1(),
  call2(),
  call3(),
]);

// 檢查每個結果
results.forEach((result, i) => {
  if (result.status === 'fulfilled') {
    console.log(`Call ${i} succeeded`);
  } else {
    console.error(`Call ${i} failed:`, result.reason);
  }
});
```

---

## 📝 回滾計畫

如果修復導致問題，使用以下步驟回滾：

### 快速回滾
```bash
# 1. 切換到上一個版本
git checkout HEAD~1

# 2. 重新部署
npm run build
npm run deploy

# 3. 驗證服務正常
curl http://localhost:3000/health
```

### 部分回滾
```bash
# 回滾特定文件
git checkout HEAD~1 -- apps/user-service/src/app/user.service.ts
git checkout HEAD~1 -- apps/notification-service/src/app/notification.service.ts
git checkout HEAD~1 -- apps/content-service/src/app/post.service.ts
```

---

## 📞 支援聯絡

### 問題回報
- **技術問題**: 聯絡 Tech Lead
- **效能問題**: 聯絡 DevOps 團隊
- **業務問題**: 聯絡 Product Owner

### 監控警報
- **錯誤率超過 1%**: 立即調查
- **回應時間超過 2 倍**: 檢查 Redis 連接
- **記憶體使用超過 80%**: 檢查 TTL 設定

---

## ✅ 最終檢查

部署到生產環境前，確認以下所有項目：

- [x] 所有程式碼已審查
- [ ] 所有測試通過
- [ ] 效能測試達標
- [ ] 文檔已更新
- [ ] 監控已設定
- [ ] 回滾計畫已準備
- [ ] 團隊已通知

---

**檢查人員**: _______________  
**檢查日期**: _______________  
**部署批准**: _______________
