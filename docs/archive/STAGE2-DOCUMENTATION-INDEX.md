# 📚 階段 2 文檔索引

> **狀態:** ✅ 完成 | **基礎設施:** 🟢 全系統運行正常

## 🎯 快速導覽

### 剛開始？從這裡開始 👇
📖 **[STAGE2-QUICKSTART.md](./STAGE2-QUICKSTART.md)**
- 快速開始指南
- 連線資訊
- 下一步行動
- 常見問題

### 需要命令參考？👇
📖 **[INFRASTRUCTURE-QUICKREF.md](./INFRASTRUCTURE-QUICKREF.md)**
- 啟動/停止命令
- 連線字串
- 健康檢查
- 故障排除

### 想了解系統架構？👇
📖 **[INFRASTRUCTURE-DIAGRAM.md](./INFRASTRUCTURE-DIAGRAM.md)**
- 架構圖
- 服務依賴
- 資源使用
- 連線模式

### 需要完整報告？👇
📖 **[infrastructure-health-report.md](./infrastructure-health-report.md)**
- 詳細健康狀態
- 配置修復說明
- 監控指南
- 安全警告

### 想看執行記錄？👇
📖 **[STAGE2-COMPLETION-SUMMARY.md](./STAGE2-COMPLETION-SUMMARY.md)**
- 任務執行清單
- 問題修復記錄
- 驗證結果
- 檢查清單

---

## 📋 文檔分類

### 🚀 操作指南
| 文檔 | 用途 | 適合人員 |
|------|------|----------|
| STAGE2-QUICKSTART.md | 快速開始 | 新手、第一次使用 |
| INFRASTRUCTURE-QUICKREF.md | 命令參考 | 日常開發、維運 |

### 📊 技術文檔
| 文檔 | 用途 | 適合人員 |
|------|------|----------|
| infrastructure-health-report.md | 健康報告 | DevOps、系統管理員 |
| INFRASTRUCTURE-DIAGRAM.md | 架構圖 | 架構師、技術負責人 |

### 📝 記錄文檔
| 文檔 | 用途 | 適合人員 |
|------|------|----------|
| STAGE2-COMPLETION-SUMMARY.md | 執行總結 | 專案經理、稽核 |
| STAGE2-DOCUMENTATION-INDEX.md | 文檔索引 | 所有人 |

### ⚙️ 配置文件
| 文件 | 說明 |
|------|------|
| .env | 環境變數配置 |
| docker-compose.yml | Docker 服務配置 |
| scripts/init-db.sql | 資料庫初始化 |

---

## 🔍 按需求查找

### 我想... 

#### 🚀 啟動基礎設施
→ 閱讀 **STAGE2-QUICKSTART.md** 的「快速測試」章節
```bash
docker-compose up -d postgres redis zookeeper kafka
```

#### 🔌 連接到服務
→ 查看 **INFRASTRUCTURE-QUICKREF.md** 的「連線字串」章節
- PostgreSQL: `postgresql://postgres:postgres@localhost:5432/suggar_daddy`
- Redis: `redis://localhost:6379`
- Kafka: `localhost:9094`

#### 🧪 測試健康狀態
→ 參考 **infrastructure-health-report.md** 的「健康檢查」章節
```bash
docker exec suggar-daddy-postgres pg_isready -U postgres
docker exec suggar-daddy-redis redis-cli ping
docker exec suggar-daddy-kafka kafka-topics --list --bootstrap-server localhost:9092
```

#### 📊 查看資源使用
→ 使用命令
```bash
docker stats
docker-compose ps
```

#### 🛠️ 故障排除
→ 閱讀 **INFRASTRUCTURE-QUICKREF.md** 的「故障排除」章節

#### 🏗️ 理解架構
→ 查看 **INFRASTRUCTURE-DIAGRAM.md**

#### 📈 監控系統
→ 閱讀 **infrastructure-health-report.md** 的「監控」章節

---

## 📞 常用命令速查

### 狀態檢查
```bash
# 查看所有容器狀態
docker-compose ps

# 查看資源使用
docker stats

# 查看日誌
docker-compose logs -f
```

### 健康檢查
```bash
# PostgreSQL
docker exec suggar-daddy-postgres pg_isready -U postgres

# Redis  
docker exec suggar-daddy-redis redis-cli ping

# Kafka
docker exec suggar-daddy-kafka kafka-broker-api-versions --bootstrap-server localhost:9092
```

### 服務管理
```bash
# 啟動
docker-compose up -d postgres redis zookeeper kafka

# 停止
docker-compose stop postgres redis zookeeper kafka

# 重啟
docker-compose restart postgres redis zookeeper kafka
```

---

## 🎓 學習路徑

### Level 1: 初學者
1. 閱讀 **STAGE2-QUICKSTART.md**
2. 執行快速測試命令
3. 理解連線資訊

### Level 2: 開發者
1. 熟悉 **INFRASTRUCTURE-QUICKREF.md**
2. 掌握常用命令
3. 學習故障排除

### Level 3: 維運人員
1. 深入 **infrastructure-health-report.md**
2. 理解監控指標
3. 規劃資源配置

### Level 4: 架構師
1. 研究 **INFRASTRUCTURE-DIAGRAM.md**
2. 優化架構設計
3. 制定擴展策略

---

## ✅ 檢查清單

### 基礎設施驗證
- [ ] 閱讀 STAGE2-QUICKSTART.md
- [ ] 執行 `docker-compose ps` 確認所有服務運行
- [ ] 測試 PostgreSQL 連線
- [ ] 測試 Redis 連線
- [ ] 測試 Kafka 連線
- [ ] 查看資源使用情況
- [ ] 閱讀健康報告

### 準備下一階段
- [ ] 理解連線字串使用方式
- [ ] 知道如何查看日誌
- [ ] 掌握基本故障排除
- [ ] 規劃資料庫遷移
- [ ] 準備啟動應用服務

---

## 🆘 需要幫助？

### 問題類型對應文檔
- **服務無法啟動** → INFRASTRUCTURE-QUICKREF.md > 故障排除
- **不知道連線字串** → STAGE2-QUICKSTART.md > 連線資訊
- **想了解資源使用** → INFRASTRUCTURE-DIAGRAM.md > 資源概覽
- **需要完整狀態報告** → infrastructure-health-report.md
- **尋找執行記錄** → STAGE2-COMPLETION-SUMMARY.md

---

## 📊 當前系統狀態

```
PostgreSQL  ✅ Healthy    57.45 MiB    :5432
Redis       ✅ Healthy    12.15 MiB    :6379
Kafka       ✅ Healthy   479.10 MiB    :9092, :9094
Zookeeper   ✅ Running   205.90 MiB    :2181
────────────────────────────────────────────
Total                    ~754 MiB      4 services
```

---

## 🚀 下一步

基礎設施已就緒，建議按以下順序進行：

1. **資料庫遷移** 
   - 執行 schema 遷移
   - 創建必要的表和索引

2. **啟動應用服務**
   - API Gateway
   - Auth Service
   - User Service
   - 其他微服務

3. **整合測試**
   - 端到端測試
   - 效能測試
   - 壓力測試

---

**文檔版本:** 1.0  
**最後更新:** 2026-02-13  
**基礎設施狀態:** 🟢 全系統正常  
**下一階段:** 資料庫遷移與應用部署
