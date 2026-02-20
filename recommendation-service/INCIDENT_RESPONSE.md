# 🚨 事故響應流程 - Incident Management

## 📋 目錄
1. [事故分類](#事故分類)
2. [P0 關鍵事故流程](#p0-關鍵事故流程)
3. [P1 重要事故流程](#p1-重要事故流程)
4. [P2 一般問題流程](#p2-一般問題流程)
5. [事後總結流程](#事後總結流程)
6. [檢查清單](#檢查清單)

---

## 事故分類

### 優先級定義

| 級別 | 名稱 | 定義 | 響應時間 | 處理時間 | 示例 |
|------|------|------|---------|---------|------|
| **P0** | 關鍵 | 服務完全不可用或嚴重故障 | 5 分鐘 | 30 分鐘 | 推薦服務宕機、所有 API 500 錯誤 |
| **P1** | 重要 | 部分功能不可用或嚴重性能下降 | 15 分鐘 | 2 小時 | 推薦延遲 > 5s、推薦結果全部為空 |
| **P2** | 一般 | 輕微問題或功能異常 | 24 小時 | 1 週 | 推薦結果不夠多樣、偶發超時 |
| **P3** | 低 | 改進建議、文檔更新 | 無限制 | 無限制 | 優化建議、功能增強 |

### 判斷標準

```
┌─ 是否影響所有用戶？
│  ├─ YES → P0
│  └─ NO ─┬─ 是否影響核心功能（推薦）？
│          ├─ YES → P1
│          └─ NO ──┬─ 是否影響 > 1% 用戶？
│                   ├─ YES → P1
│                   └─ NO ─→ P2
└─ 性能下降多少？
   ├─ > 10x (50ms → 500ms) → P0
   ├─ 5-10x (50ms → 250ms) → P1
   └─ < 5x → P2
```

---

## P0 關鍵事故流程

### 總體時間表

```
0m     - 檢測到問題，立即啟動響應
5m     - 快速診斷和重啟
15m    - 恢復服務或啟動降級方案
30m    - 完整恢復或支撑臨時方案
1h     - 開始根本原因分析
4h     - 完成分析，制定改進方案
```

### 詳細流程

#### 第 1 階段：檢測和告警（0-5 分鐘）

**負責人**: 值班工程師

```
[檢測到告警]
  ↓
[確認問題真實性]
  - 檢查監控告警是否誤報
  - 嘗試多個端點測試
  - 確認是應用側還是基礎設施側
  ↓
[啟動 P0 響應]
  - 在 Slack/釘釘 通知所有關聯團隊
  - 發起 war room（遠程會議）
  - 指定 Incident Commander（負責人）
  ↓
[初步信息收集]
  - 記錄問題首次檢測時間
  - 記錄影響範圍（多少用戶/多少 RPS）
  - 收集初步日誌
```

**檢測清單**:

```bash
# ✓ 第 1 步：確認服務不可用
curl -v http://localhost:3000/health
# 預期: 200 OK
# 故障: Connection refused / 500

# ✓ 第 2 步：查看應用日誌
docker-compose logs --tail=100 recommendation-service | head -50
# 查找 ERROR, FATAL, panic

# ✓ 第 3 步：檢查容器狀態
docker-compose ps
# 檢查: recommendation-service: Up 或 Exit?

# ✓ 第 4 步：查看系統資源
docker stats --no-stream
# 檢查: CPU, Memory, Network I/O

# ✓ 第 5 步：檢查依賴服務
docker-compose ps postgres redis
# 檢查: 都是 Up?
```

#### 第 2 階段：快速修復（5-15 分鐘）

**負責人**: Incident Commander

```
嘗試方案 1: 服務重啟
  ├─ docker-compose restart recommendation-service
  ├─ 等待 30 秒
  └─ 測試: curl http://localhost:3000/health
     ├─ 成功 ✅ → 轉到驗證階段
     └─ 失敗 ❌ → 嘗試方案 2

嘗試方案 2: 依賴服務重啟
  ├─ docker-compose restart postgres redis
  ├─ 等待 60 秒
  ├─ docker-compose restart recommendation-service
  └─ 等待 30 秒，測試
     ├─ 成功 ✅ → 轉到驗證階段
     └─ 失敗 ❌ → 嘗試方案 3

嘗試方案 3: 完整重建
  ├─ docker-compose down
  ├─ docker-compose up -d
  ├─ 等待 90 秒
  └─ 測試
     ├─ 成功 ✅ → 轉到驗證階段
     └─ 失敗 ❌ → 轉到降級階段
```

**恢復操作命令**:

```bash
# 監控恢復進度
watch -n 5 'docker-compose ps; docker stats --no-stream'

# 方案 1：輕量重啟
docker-compose restart recommendation-service
sleep 10

# 方案 2：依賴重啟
docker-compose restart postgres redis
sleep 60
docker-compose restart recommendation-service
sleep 10

# 方案 3：完整重建
docker-compose down -v  # -v 移除 volumes（謹慎！會丟失數據）
docker-compose up -d
sleep 90

# 測試恢復
for i in {1..5}; do
  echo "Test $i:"
  curl -s http://localhost:3000/health | jq .
  sleep 1
done
```

#### 第 3 階段：驗證和監控（15-30 分鐘）

**負責人**: Incident Commander + 工程師

```
驗證清單：
  ├─ [ ] API 正常響應 (< 500ms)
  ├─ [ ] 推薦結果有效 (返回 > 5 個推薦)
  ├─ [ ] 多個用戶都能正常工作
  ├─ [ ] 沒有新的錯誤日誌
  ├─ [ ] 資源使用正常 (CPU < 50%, Memory < 60%)
  └─ [ ] 發布到內部通知

監控時長: 15 分鐘
  ├─ 每 1 分鐘檢查一次關鍵指標
  ├─ 監控錯誤率是否反彈
  └─ 確認用戶反饋改善
```

**驗證命令**:

```bash
# 快速驗證腳本
USERS=("user-1" "user-2" "user-3" "user-4" "user-5")
for user in "${USERS[@]}"; do
  echo "Testing $user..."
  curl -s http://localhost:3000/api/recommendations/$user?limit=10 | jq '.count, .recommendations | length'
done

# 性能監控
for i in {1..15}; do
  echo "Minute $i:"
  curl -w "%{time_total}s\n" -o /dev/null http://localhost:3000/api/recommendations/user-123
  sleep 60
done
```

#### 第 4 階段：降級方案（如果恢復失敗）

**負責人**: Incident Commander + Architecture Team

```
降級選項：

選項 A: 使用備用實例（若有）
  ├─ 條件: 必須有備用環境
  ├─ 時間: 5-10 分鐘
  ├─ 操作:
  │  ├─ 啟動備用服務
  │  └─ 更新 DNS / LB 指向備用
  └─ 風險: 數據同步延遲

選項 B: 返回靜態推薦（降級）
  ├─ 條件: 有預計算好的 TOP 推薦
  ├─ 時間: 30 分鐘
  ├─ 操作:
  │  ├─ 部署簡化版推薦服務
  │  ├─ 返回全站 TOP 內容
  │  └─ 禁用個性化推薦
  └─ 影響: 用戶體驗下降，但服務可用

選項 C: 返回緩存數據
  ├─ 條件: 有舊版本緩存
  ├─ 時間: 10 分鐘
  ├─ 操作:
  │  ├─ 恢復昨天的 Redis 快照
  │  └─ 返回舊推薦（可能已過期）
  └─ 影響: 用戶看到陳舊推薦

選項 D: 完全下線該功能
  ├─ 條件: 推薦非核心功能
  ├─ 時間: 5 分鐘
  ├─ 操作:
  │  ├─ 在客戶端禁用推薦
  │  ├─ 返回 503 Service Unavailable
  │  └─ 顯示友好錯誤信息
  └─ 影響: 最小化，但無推薦
```

**降級實施**:

```bash
# 降級到靜態推薦（快速實施）
# 編輯 recommendation.controller.ts

# 臨時禁用推薦算法
if (process.env.DOWNGRADE_MODE === 'true') {
  // 返回預計算的 TOP 100 推薦
  return getTopRecommendations(limit);
}

# 啟用降級模式
export DOWNGRADE_MODE=true
docker-compose restart recommendation-service
```

#### 第 5 階段：根本原因分析（30+ 分鐘）

**負責人**: 技術深度最深的工程師

```
收集信息（30 分鐘）:
  ├─ 應用日誌（完整堆棧跟蹤）
  ├─ 數據庫日誌（慢查詢、連接）
  ├─ Redis 日誌（內存溢出、驅逐）
  ├─ 系統日誌（磁盤滿、OOM、CPU 限制）
  ├─ 最近變更（代碼、配置、基礎設施）
  └─ 告警時間軸

分析根本原因（1 小時）:
  ├─ 比較故障前後的日誌差異
  ├─ 檢查最近 24 小時的變更
  ├─ 重現問題（如果可能）
  ├─ 隔離故障組件
  └─ 驗證修復方案

制定長期方案（1 小時）:
  ├─ 如何永久修復（代碼/配置/架構）
  ├─ 如何預防重複發生
  ├─ 是否需要架構改進
  └─ 是否需要額外監控
```

**分析命令**:

```bash
# 收集完整診斷信息
cat << 'EOF' > diagnose_p0.sh
#!/bin/bash
echo "=== P0 Incident Diagnostics ==="
echo ""

echo "[1] Service Status"
docker-compose ps

echo "[2] Recent Logs (last 200 lines)"
docker-compose logs --tail=200 recommendation-service > logs/service.log
tail -50 logs/service.log

echo "[3] Database Status"
docker-compose exec postgres psql -U postgres -d recommendation_db -c "
  SELECT datname, numbackends, xact_commit, xact_rollback 
  FROM pg_stat_database WHERE datname = 'recommendation_db';" > logs/db_status.log
cat logs/db_status.log

echo "[4] Redis Status"
docker-compose exec redis redis-cli INFO server memory clients > logs/redis_status.log
cat logs/redis_status.log

echo "[5] System Resources"
docker stats --no-stream > logs/docker_stats.log
cat logs/docker_stats.log

echo "[6] Disk Space"
df -h > logs/disk_space.log
cat logs/disk_space.log

echo "[7] Recent Errors"
docker-compose logs recommendation-service | grep -i "error\|fatal\|panic" > logs/errors.log
tail -20 logs/errors.log

echo "Diagnostics complete. Results saved to logs/"
EOF

chmod +x diagnose_p0.sh
./diagnose_p0.sh
```

---

## P1 重要事故流程

### 時間表

```
0-15m   - 檢測、診斷和初步修復
15m-1h  - 驗證修復、根本原因分析開始
1-2h    - 詳細分析、制定改進方案
```

### 關鍵步驟

```
[檢測]
  ↓
通知相關團隊（Slack 通知，無需 war room）
  ↓
[診斷]
  ├─ 檢查日誌（5 分鐘）
  ├─ 確認影響範圍（5 分鐘）
  └─ 查看最近變更（5 分鐘）
  ↓
[初步修復嘗試]（順序執行）
  ├─ 清空快取：curl -X POST .../clear-cache
  ├─ 重啟服務：docker-compose restart
  └─ 如果上述不行，檢查數據庫/Redis
  ↓
[驗證]（10 分鐘持續監控）
  ├─ 檢查延遲是否降低
  ├─ 驗證功能是否恢復
  └─ 監控錯誤率
  ↓
[後續分析]
  ├─ 收集完整日誌
  ├─ 分析根本原因
  └─ 制定長期改進方案
```

### P1 常見案例和解決

| 案例 | 症狀 | 快速修復 | 根本原因 | 長期方案 |
|------|------|---------|---------|---------|
| 快取失效 | 響應 50ms→2s | 清空快取 | 快取算法有 bug | 修復 key 生成邏輯 |
| 數據庫連接耗盡 | 偶發超時 | 重啟應用 | 連接泄漏 | 使用連接池監控 |
| 新內容推薦不出 | 推薦結果空 | 更新分數計算 | 算法權重有問題 | 調整權重，添加 debug 日誌 |
| 磁盤空間不足 | 數據庫無法寫入 | 清理日誌 | 沒有磁盤清理策略 | 設置日誌輪轉 |

---

## P2 一般問題流程

### 時間表

```
檢測 → 記錄 → 排隊 → 在下一個迭代中修復 → 驗證
```

### 關鍵步驟

```
[記錄問題]
  ├─ 標題：清晰描述問題
  ├─ 重現步驟：如何重現
  ├─ 期望結果：應該如何
  └─ 實際結果：現在什麼樣
  ↓
[添加到 backlog]
  ├─ 估算工作量
  ├─ 優先化
  └─ 分配負責人
  ↓
[定期評審]
  ├─ 在 sprint 計劃會上討論
  ├─ 決定是否在本迭代修復
  └─ 如果修復，制定解決方案
```

### P2 問題模板

```markdown
## 問題描述
[簡短描述問題]

## 重現步驟
1. [第一步]
2. [第二步]
3. [第三步]

## 期望結果
[應該發生什麼]

## 實際結果
[現在發生什麼]

## 環境信息
- 版本: 
- 時間: 
- 用戶: 
- 重現頻率: 

## 日誌片段
```log
[相關日誌]
```

## 可能的根本原因
[推測可能的原因]

## 建議的修復方案
[如何修復]
```

---

## 事後總結流程

### 何時進行

- **P0 事故**: 事故完全恢復後 24 小時內
- **P1 事故**: 事故完全恢復後 3 天內
- **P2 問題**: 修復後進行

### 總結內容

#### 1. 事故時間軸

```markdown
## 事故時間軸

| 時間 | 事件 | 負責人 |
|------|------|--------|
| 10:30 | 用戶報告推薦不可用 | @user |
| 10:35 | 檢測到監控告警 | @oncall |
| 10:38 | 啟動 P0 響應 | @incident-commander |
| 10:42 | 重啟應用 | @engineer |
| 10:45 | 服務恢復 | @engineer |
| 11:00 | 驗證完成 | @oncall |
| 14:00 | 根本原因確認 | @tech-lead |
| 16:00 | 修復方案實施 | @engineer |
```

#### 2. 根本原因分析（RCA）

```markdown
## 根本原因分析

### 直接原因
- [發生了什麼]

### 根本原因
- [為什麼會發生]

### 導致因素
- [哪些環節沒有防護]

### 時間線圖
[可視化事件發生順序]

### 為什麼我們沒有早發現？
- [缺少什麼監控/告警]
```

#### 3. 教訓和改進

```markdown
## 教訓

### 我們做得好的事
- [正面的做法]

### 我們可以改進的事
- [應該改進的地方]

## 行動項目（Action Items）

| 項目 | 描述 | 優先級 | 負責人 | 完成期限 |
|------|------|--------|--------|---------|
| 添加監控 | 監控 Redis 內存溢出 | P0 | @engineer | 3 天 |
| 改進告警 | 響應時間 > 1s 告警 | P1 | @devops | 1 週 |
| 文檔更新 | 更新應急手冊 | P2 | @tech-lead | 1 週 |
```

### 事後總結會議

**與會者**: Incident Commander、主要參與者、相關團隊負責人

**時長**: 30-60 分鐘

**議程**:
1. 事故概述（5 分鐘）
2. 時間軸回顧（10 分鐘）
3. 根本原因討論（15 分鐘）
4. 改進方案討論（20 分鐘）
5. 確認行動項目（10 分鐘）

**輸出物**:
- 事故報告文檔
- 改進行動列表
- 負責人和截止期限

---

## 檢查清單

### 事故響應檢查清單

```markdown
## P0 事故響應檢查清單

- [ ] **0 分鐘**：檢測到告警，確認問題
  - [ ] 確認是應用側故障
  - [ ] 確認影響範圍（用戶數、功能）

- [ ] **2 分鐘**：啟動響應
  - [ ] 通知所有相關人員（Slack/釘釘）
  - [ ] 指定 Incident Commander
  - [ ] 創建 war room（遠程會議）

- [ ] **5 分鐘**：快速診斷
  - [ ] 查看應用日誌
  - [ ] 檢查系統資源（CPU/Memory/Disk）
  - [ ] 檢查依賴服務（PG/Redis）

- [ ] **8 分鐘**：初步修復
  - [ ] 嘗試服務重啟
  - [ ] 如果失敗，重啟依賴
  - [ ] 如果依然失敗，完整重建

- [ ] **20 分鐘**：驗證恢復
  - [ ] API 正常響應
  - [ ] 推薦結果有效
  - [ ] 資源使用正常
  - [ ] 多個用戶都能工作

- [ ] **30 分鐘**：根本原因分析開始
  - [ ] 收集完整日誌
  - [ ] 檢查最近變更
  - [ ] 初步定位問題

- [ ] **1-4 小時**：詳細分析和修復
  - [ ] 確認根本原因
  - [ ] 實施永久修復
  - [ ] 驗證修復有效

- [ ] **24 小時**：事後總結
  - [ ] 召開總結會議
  - [ ] 完成 RCA 文檔
  - [ ] 確認改進行動
  - [ ] 發布通知
```

### 恢復檢查清單

```markdown
## 服務恢復檢查清單

恢復後驗證（15 分鐘）:
- [ ] curl http://localhost:3000/health → 200 OK
- [ ] curl /api/recommendations/test-user → 返回推薦
- [ ] 多個用戶都能獲取推薦
- [ ] 響應時間 < 500ms
- [ ] 無新的 ERROR 日誌
- [ ] CPU < 50%, Memory < 60%

持續監控（15 分鐘）:
- [ ] 每分鐘測試一個 API 端點
- [ ] 監控錯誤率是否反彈
- [ ] 查看用戶反饋/投訴

通知相關方:
- [ ] 向管理層報告事故和恢復
- [ ] 向用戶發送恢復通知
- [ ] 向相關團隊通知恢復狀態
```

---

## 快速參考

### 常用電話和聯繫方式

```
Platform: Slack / 釘釘
Channel: #incidents, #recommendations

On-Call Rotation:
周一-周五 09:00-18:00: @oncall-day
周一-周五 18:00-09:00: @oncall-night
週末: @oncall-weekend

重要聯繫人:
- Tech Lead: @tech-lead (技術決策)
- Incident Commander: @incident-commander (指揮)
- DevOps: @devops (基礎設施)
- DBA: @dba (數據庫)
```

### 快速命令

```bash
# 檢查服務狀態
curl http://localhost:3000/health

# 查看日誌
docker-compose logs -f recommendation-service | tail -100

# 快速重啟
docker-compose restart recommendation-service

# 清空快取
curl -X POST http://localhost:3000/api/recommendations/clear-cache

# 完整診斷
./diagnose_p0.sh
```

---

**最後更新**: 2024-02-19  
**負責人**: Backend Team  
**版本**: 1.0.0
