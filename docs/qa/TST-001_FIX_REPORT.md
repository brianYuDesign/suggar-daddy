# TST-001 修復報告

**問題編號**: TST-001  
**問題類型**: E2E 測試環境配置問題  
**優先級**: P0 (阻擋測試執行)  
**修復日期**: 2026-02-17  
**修復人員**: QA Engineer Agent

---

## 📋 問題描述

### 症狀
- E2E 測試認證設置失敗
- 錯誤訊息: `connect ECONNREFUSED ::1:3000`
- 影響範圍: 294 個 E2E 測試無法執行

### 根本原因
`localhost` 在某些環境下被解析為 IPv6 地址 (::1)，但應用服務運行在 IPv4 (127.0.0.1)，導致連接失敗。

---

## 🔧 修復方案

### 1. playwright.config.ts
**修改內容**: 將所有 `localhost` 引用改為 `127.0.0.1`

```typescript
// Before
use: {
  baseURL: 'http://localhost:4200',
}

// After
use: {
  baseURL: 'http://127.0.0.1:4200', // 使用 IPv4 避免 IPv6 連接問題
}
```

```typescript
// Before
webServer: {
  url: 'http://localhost:4200',
}

// After
webServer: {
  url: 'http://127.0.0.1:4200', // 使用 IPv4
}
```

### 2. e2e/auth.setup.ts
**修改內容**: 更新 API 和前端基礎 URL

```typescript
// Before
const API_BASE = 'http://localhost:3000';

// After
const API_BASE = 'http://127.0.0.1:3000';
const WEB_BASE = 'http://127.0.0.1:4200';
const ADMIN_BASE = 'http://127.0.0.1:4300';
```

### 3. e2e/utils/api-helper.ts
**修改內容**: 更新預設 API URL

```typescript
// Before
constructor(private request: APIRequestContext, baseURL = 'http://localhost:3000') {

// After
constructor(private request: APIRequestContext, baseURL = 'http://127.0.0.1:3000') {
```

### 4. e2e/utils/test-helpers.ts
**修改內容**: 更新登入助手函數的預設 URL

```typescript
// Before
export async function login(
  page: Page,
  credentials: { email: string; password: string },
  baseURL = 'http://localhost:4200'
) {
  const apiBase = 'http://localhost:3000';

// After
export async function login(
  page: Page,
  credentials: { email: string; password: string },
  baseURL = 'http://127.0.0.1:4200'
) {
  const apiBase = 'http://127.0.0.1:3000';
```

---

## 📝 修改文件清單

| 文件路徑 | 修改類型 | 說明 |
|---------|---------|------|
| `playwright.config.ts` | 配置更新 | baseURL 和 webServer URL |
| `e2e/auth.setup.ts` | URL 常量 | API/Web/Admin 基礎 URL |
| `e2e/utils/api-helper.ts` | 預設參數 | ApiHelper 預設 baseURL |
| `e2e/utils/test-helpers.ts` | 預設參數 | login 函數預設 URL |

---

## ✅ 驗證計劃

### Phase 1: 環境檢查
```bash
# 1. 確認服務運行狀態
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:4200

# 2. 檢查 DNS 解析
ping -c 1 127.0.0.1
```

### Phase 2: 認證設置測試
```bash
# 運行 auth setup 測試
npm run e2e -- auth.setup.ts
```

**預期結果**:
- ✅ Redis 清理成功
- ✅ Subscriber 認證成功
- ✅ Creator 認證成功  
- ✅ Admin 認證成功（如果 admin app 運行）
- ✅ 生成 3 個 .auth/*.json 檔案

### Phase 3: 完整 E2E 測試套件
```bash
# 運行完整 E2E 測試
npm run e2e
```

**預期結果**:
- ✅ 298 個測試案例全部執行
- ✅ 通過率 > 95%
- ✅ 無 ECONNREFUSED 錯誤

### Phase 4: 關鍵用戶旅程測試
```bash
# 運行用戶旅程測試
npm run e2e -- user-journeys.spec.ts
```

**預期結果**:
- ✅ 探索者完整流程通過
- ✅ 創作者完整流程通過
- ✅ 管理員完整流程通過

---

## 📊 預期改善

| 指標 | 修復前 | 修復後（預期） | 改善 |
|------|--------|--------------|------|
| E2E 測試通過率 | 0.3% | > 95% | +94.7% |
| 可執行測試數 | 1/298 | 298/298 | +297 |
| 認證設置成功率 | 0/3 | 3/3 | +100% |
| 系統就緒度評分 | 88.25/100 | > 92/100 | +3.75 |

---

## 🎯 成功標準

- [ ] 所有 auth setup 測試通過
- [ ] E2E 測試套件可以正常執行
- [ ] 無 IPv6 連接錯誤
- [ ] 用戶旅程測試全部通過
- [ ] 系統就緒度評分 > 92

---

## 📋 後續工作

### 立即執行（接下來）
1. 啟動所需服務（如果未運行）
2. 執行驗證計劃
3. 記錄測試結果
4. 更新 TEST_EXECUTION_REPORT.md

### 優化建議
1. 考慮添加服務健康檢查到測試前置條件
2. 添加自動服務啟動腳本
3. 建立測試環境檢查清單
4. 配置 CI/CD 環境變數

---

## 🔍 技術說明

### 為什麼使用 127.0.0.1 而非 localhost？

**localhost 的問題**:
- `localhost` 可能解析為 IPv4 (127.0.0.1) 或 IPv6 (::1)
- 解析行為依賴於系統配置（/etc/hosts）
- macOS 和某些 Linux 發行版優先使用 IPv6
- 如果服務只監聽 IPv4，IPv6 連接會失敗

**127.0.0.1 的優勢**:
- 明確指定 IPv4 地址
- 不依賴 DNS/hosts 解析
- 行為一致且可預測
- 避免 IPv6 相關問題

**最佳實踐**:
- 測試環境使用明確的 IP 地址
- 生產環境可使用域名
- 配置文件中明確註明原因

---

## ✅ 修復狀態

**當前狀態**: 🟡 已修復，待驗證  
**修復時間**: ~30 分鐘  
**預計驗證時間**: 1-2 小時  
**風險等級**: 🟢 低風險（僅配置修改）

---

**報告產生時間**: 2026-02-17  
**下一步**: 執行驗證計劃
