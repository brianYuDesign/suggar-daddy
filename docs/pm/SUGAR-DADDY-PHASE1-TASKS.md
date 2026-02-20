# Sugar-Daddy 重新定位 - 技術任務卡分解

**開始日期**: 2026-02-19  
**階段**: Phase 1 (核心基礎) - 4-5 週

---

## 📋 任務總攬

**總任務數**: 23  
**優先級分布**: P0 (8) / P1 (10) / P2 (5)  
**預計工期**: 28-35 人天  
**建議團隊**: Backend 3 + Frontend 2 + DevOps 1 + QA 1

---

## 🖥️ Backend 任務 (12 個)

### P0 - 關鍵基礎

#### BACK-001: Content-Streaming Service 架構設計
**類型**: Service Design  
**優先級**: P0  
**Assignee**: Backend Lead  
**工期**: 3-4 天  
**描述**:
- 設計 Content-Streaming Service 架構
- 決定: 視頻存儲(S3/Aliyun)、CDN(Cloudflare/Aliyun)、直播(Agora/RTMP)
- 設計 API 端點
- 數據模型設計

**交付物**:
- [ ] Architecture Diagram
- [ ] API Specification (OpenAPI)
- [ ] Database Schema
- [ ] 技術選型文檔

**驗收標準**:
- 架構清晰、可擴展
- API 文檔完整
- 支持視頻 + 圖片 + 直播

---

#### BACK-002: Recommendation Service 架構設計
**類型**: Service Design  
**優先級**: P0  
**Assignee**: Backend Lead / Senior Developer  
**工期**: 3 天  
**描述**:
- Phase 1 MVP: 簡單推薦 (熱度排序 + 隨機)
- 設計推薦算法接口
- 決定: 存儲位置(Redis/ES) 、計算時機(實時/離線)
- 考慮後續升級到協作過濾

**交付物**:
- [ ] 推薦算法文檔
- [ ] API 設計
- [ ] Redis 鍵空間設計
- [ ] 測試計劃

**驗收標準**:
- 推薦 API <200ms
- 支持分類篩選
- 可配置演算法權重

---

#### BACK-003: Content-Service 改造 - 訂閱鎖定邏輯
**類型**: Modification  
**優先級**: P0  
**Assignee**: Backend Developer  
**工期**: 4-5 天  
**描述**:
- 在 Content 模型中加 `subscriptionLevel` (0=免費, 1=¥99, 2=¥199)
- 改造 GET /content/:id 端點
  - 檢查用戶是否已訂閱
  - 未訂閱: 返回預覽版 (縮小尺寸)
  - 已訂閱: 返回完整版
- 加 audit log

**交付物**:
- [ ] 改造後的 Content Schema
- [ ] 授權檢查中介軟體
- [ ] API 文檔更新
- [ ] 單元測試 (>90% 覆蓋)

**驗收標準**:
- 訂閱者能看完整內容
- 未訂閱者只看預覽
- 沒有 privilege escalation 漏洞

---

#### BACK-004: Payment-Service 改造 - 創作者分成計算
**類型**: Modification  
**優先級**: P0  
**Assignee**: Backend Developer  
**工期**: 4-5 天  
**描述**:
- 在 Payment 模型中加 `creator_payout` 記錄
- 設計分成邏輯: 平台 30% / 創作者 70%
- 實現 `/creator/earnings` 端點
- 實現 `/creator/payout-request` 端點
- 銀行卡驗證

**交付物**:
- [ ] Payment Schema 擴展
- [ ] Payout API 文檔
- [ ] 銀行卡驗證流程
- [ ] 單元測試

**驗收標準**:
- 收入計算精確 (±¥0.01)
- Payout 記錄完整
- 銀行卡驗證安全

---

#### BACK-005: Moderation Service (基礎審核)
**類型**: New Service  
**優先級**: P0  
**Assignee**: Backend Developer  
**工期**: 4-5 天  
**描述**:
- 新建 Moderation Service
- 實現內容審核隊列 (發佈後即進隊列)
- Phase 1: 自動審核 (文本敏感詞 + 圖片色情檢測)
  - 文本: 關鍵詞過濾 (已有解決方案)
  - 圖片: 調用三方 API (如 Aliyun Content Moderator)
- 人工審核隊列
- Status: PENDING → APPROVED/REJECTED

**交付物**:
- [ ] Moderation Service 完整實現
- [ ] 審核隊列 API
- [ ] 審核結果通知
- [ ] 測試覆蓋

**驗收標準**:
- 自動審核準確度 >80%
- 平均審核時間 <24h
- 支持人工複審

---

### P1 - 重要但非緊迫

#### BACK-006: User-Service 改造 - 創作者檔案
**類型**: Modification  
**優先級**: P1  
**Assignee**: Backend Developer  
**工期**: 2-3 天  
**描述**:
- 在 User 模型中加:
  - `type` (VIEWER / CREATOR)
  - `creator_profile` (存 Bio, 頻道封面, 定價, etc.)
  - `verification_status` (UNVERIFIED / VERIFIED / PREMIUM)
- 建立 Creator Profile API
- 身份驗證流程 (可選: 人臉識別)

**交付物**:
- [ ] User Schema 擴展
- [ ] Creator Profile API
- [ ] 驗證流程文檔
- [ ] 單元測試

---

#### BACK-007: Subscription-Service 改造 - 多層訂閱
**類型**: Modification  
**優先級**: P1  
**Assignee**: Backend Developer  
**工期**: 2-3 天  
**描述**:
- 支持多層訂閱 (¥99, ¥199, ¥299, etc.)
- 改造訂閱模型:
  - `subscription_tier` 欄位
  - `price_usd` / `price_rmb`
  - 自動續期邏輯
- 實現層級升降級

**交付物**:
- [ ] Subscription Schema 擴展
- [ ] API 更新
- [ ] 自動續期邏輯
- [ ] 測試

---

#### BACK-008: Media-Service 優化 - 大文件上傳
**類型**: Modification  
**優先級**: P1  
**Assignee**: DevOps / Backend  
**工期**: 3-4 天  
**描述**:
- 支持大文件上傳 (視頻 >500MB)
- 分片上傳 + 斷點續傳
- 上傳進度追蹤
- CDN 集成 (選定 Cloudflare 或 Aliyun)

**交付物**:
- [ ] 分片上傳 API
- [ ] 斷點續傳邏輯
- [ ] CDN 集成
- [ ] 上傳進度追蹤

---

### P2 - 優化項目

#### BACK-009 ~ 012: (進階功能)
暫時不列，Phase 1 重點完成核心 8 個 P0/P1

---

## 🎨 Frontend 任務 (8 個)

### P0 - 關鍵 UI

#### FRONT-001: 推薦卡片頁面設計 & 實現
**類型**: UI/Component Development  
**優先級**: P0  
**Assignee**: Frontend Lead + Developer  
**工期**: 5-6 天  
**描述**:
- 設計推薦卡片 UI (垂直滑動)
  - 創作者頭像 + 名稱
  - 內容預覽 (圖片/視頻縮略圖)
  - 標題 + 訂閱價格
  - 「訂閱」按鈕
  - 互動按鈕 (like, share, comment)
- 實現無限滑動 (intersection observer)
- 手機適配

**交付物**:
- [ ] 卡片組件
- [ ] 頁面完整實現
- [ ] 響應式設計測試
- [ ] 性能優化 (首屏 <1s)

**驗收標準**:
- 卡片流暢滑動
- 首屏加載 <1s
- 移動端適配 100%

---

#### FRONT-002: 創作者主頁設計 & 實現
**類型**: UI/Page Development  
**優先級**: P0  
**Assignee**: Frontend Developer  
**工期**: 4-5 天  
**描述**:
- 頁面包含:
  - 創作者頭像 + 信息 (粉絲數, 內容數)
  - 「訂閱」按鈕
  - 內容網格 (所有內容)
  - 粉絲互動區 (評論, 打賞)
  - 粉絲列表 (僅創作者自己能看)

**交付物**:
- [ ] 頁面完整實現
- [ ] 評論區組件
- [ ] 粉絲列表頁面
- [ ] 單元測試

---

#### FRONT-003: 訂閱管理頁面
**類型**: UI/Page Development  
**優先級**: P0  
**Assignee**: Frontend Developer  
**工期**: 3 天  
**描述**:
- 粉絲視角: 我的訂閱列表、續期提醒、一鍵取消
- 創作者視角: 粉絲訂閱統計、收入明細

**交付物**:
- [ ] 訂閱列表頁面
- [ ] 續期提醒組件
- [ ] 收入明細表
- [ ] 測試

---

### P1 - 重要組件

#### FRONT-004 ~ 008: (進階 UI)
- Creator Dashboard (儀表板)
- Payment Flow (支付流程)
- Comment System (評論系統)
- Notification Center (通知中心)
- User Profile Editor (檔案編輯)

---

## 🧪 QA 任務 (2 個)

#### QA-001: 測試計劃 & 自動化框架
**優先級**: P1  
**工期**: 3-4 天  
**描述**:
- 定義測試策略 (單元/集成/E2E)
- 設定目標覆蓋率 >90%
- 建立 E2E 測試框架 (Playwright/Cypress)
- 關鍵流程 E2E 測試:
  - 創作者發佈內容
  - 粉絲發現 + 訂閱
  - 支付成功 + 分成計算

---

#### QA-002: 性能 & 安全測試
**優先級**: P1  
**工期**: 2-3 天  
**描述**:
- 推薦 API 性能測試 (<200ms)
- 並發用戶測試 (模擬 1000 並發)
- 安全測試 (授權繞過, SQL injection)
- 支付安全測試 (金額篡改)

---

## 🚀 DevOps 任務 (1 個)

#### DEVOPS-001: 基礎設施 & CI/CD 更新
**優先級**: P0  
**工期**: 3-4 天  
**描述**:
- 新增容器:
  - content-streaming-service
  - recommendation-service
  - moderation-service
- 更新 docker-compose.yml
- 更新 CI/CD (新 Services 自動測試+構建)
- 監控配置 (新 Services 健康檢查)

**交付物**:
- [ ] Dockerfile for new services
- [ ] Updated docker-compose.yml
- [ ] CI/CD Pipeline 更新
- [ ] 監控告警配置

---

## 📊 進度追蹤

### 里程碑

| 週次 | 重點任務 | 狀態 |
|------|---------|------|
| Week 1 | BACK-001, 002, 003 + FRONT-001 | TBD |
| Week 2 | BACK-004, 005 + FRONT-002, 003 | TBD |
| Week 3 | BACK-006, 007, 008 + DEVOPS-001 | TBD |
| Week 4 | 集成測試 + 性能優化 | TBD |
| Week 5 | 部署 + 灰度測試 | TBD |

---

## 📝 下一步

1. **團隊確認** - 確認人員分配
2. **詳細設計** - 每個任務產出設計文檔
3. **Sprint 規劃** - 按 2 週 Sprint 組織任務
4. **開始開發** - Week 1 Monday

---

_任務卡完成 | Javis | 2026-02-19_
