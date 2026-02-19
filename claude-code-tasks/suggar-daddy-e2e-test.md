# Sugar-Daddy E2E 功能測試任務

## 測試目標
驗證 Sugar-Daddy 前台與後台系統的完整功能流程：
1. 後台系統登入 & 基本操作
2. 前台系統登入 & 用戶功能
3. 確保無 API 限制或功能缺陷

## 測試環境信息
- **項目位置**: `~/Project/suggar-daddy`
- **後台 URL**: http://localhost:3001 (Next.js Admin)
- **前台 URL**: http://localhost:3000 (Next.js Frontend)
- **API Gateway**: http://localhost:3000 (Port 3000)
- **Docker Status**: 所有基礎設施健康 (PostgreSQL, Redis, Kafka)
- **PM2 Status**: 需檢查服務是否正常運行

## 需要驗證的功能

### 後台系統 (Admin)
- [ ] 管理員登入 (使用合法測試帳號)
- [ ] 登入後查看 Dashboard
- [ ] 檢查用戶管理功能
- [ ] 檢查內容管理功能
- [ ] 檢查訂閱管理功能
- [ ] 檢查支付/計費管理
- [ ] 確保無權限錯誤或 API 限制

### 前台系統 (User App)
- [ ] 用戶註冊或登入
- [ ] 登入後查看首頁 Dashboard
- [ ] 訪問內容列表/詳情頁
- [ ] 測試訂閱功能
- [ ] 測試支付流程 (測試模式)
- [ ] 訪問個人帳戶設置
- [ ] 確保無 API 限制或超時

## 技術檢查清單
- [ ] 確認所有 PM2 服務正常運行
- [ ] 檢查 Node.js 日誌 (有無錯誤堆棧)
- [ ] 驗證 API Gateway 健康狀態
- [ ] 檢查 Redis 連接狀態
- [ ] 驗證 PostgreSQL 連接狀態
- [ ] 檢查 Kafka 消息隊列運行狀態

## 輸出要求
請提供：
1. **測試報告** - 每個功能的測試結果 (✅ Pass / ❌ Fail)
2. **截圖** - 登入成功、主要頁面的截圖
3. **問題清單** - 如有任何失敗，詳細列出:
   - 錯誤信息
   - 出現位置
   - 影響範圍
4. **建議** - 是否可以上線，或需要修復的項目

## 特殊說明
- 後台/前台可能需要使用不同的測試帳號 (具體帳號信息請從 .env.test 或文檔獲取)
- 如無測試帳號，請檢查 seeded 數據或建立新帳號進行測試
- 注意檢查 API 返回速度 (是否有超時或延遲)

## 啟動步驟
1. 進入項目目錄: `cd ~/Project/suggar-daddy`
2. 確認 Docker 容器運行: `docker ps | grep suggar`
3. 啟動 PM2 服務: `pm2 start ecosystem.config.js` (如未啟動)
4. 等待服務穩定 (~30 秒)
5. 開始測試流程

---

**派發時間**: 2026-02-18 20:53 GMT+8
**優先級**: High
**超時**: 45 分鐘
