# ❓ 常見問題 (FAQ)

Sugar Daddy 項目開發中的常見問題解答

---

## 📑 目錄

- [環境設置](#環境設置)
- [開發環境](#開發環境)
- [測試](#測試)
- [資料庫](#資料庫)
- [建置和部署](#建置和部署)
- [疑難排解](#疑難排解)
- [腳本系統](#腳本系統)

---

## 🛠️ 環境設置

### Q: 需要安裝哪些工具？

**A**: 必需工具：
- Node.js 18+
- npm 8+
- Docker 和 Docker Compose
- Git

可選工具：
- PostgreSQL 客戶端（psql）
- Redis CLI
- VS Code（推薦 IDE）

### Q: 如何檢查我的環境是否正確設置？

**A**: 運行以下命令：
```bash
node --version    # 應該 >= 18
npm --version     # 應該 >= 8
docker --version
docker-compose --version
```

如果所有命令都成功，環境設置正確。

### Q: 我需要安裝 PostgreSQL 嗎？

**A**: **不需要**。我們使用 Docker 運行 PostgreSQL，不需要本地安裝。

只有在需要使用 `psql` 客戶端時才需要安裝。

### Q: `.env` 文件需要配置什麼？

**A**: 對於開發環境，`.env.example` 的預設值通常就足夠了：

```bash
# 複製範例檔案
cp .env.example .env

# 開發環境通常不需要修改
# 所有預設值都已設置好
```

唯一可能需要配置的是：
- `STRIPE_SECRET_KEY` - 如果測試支付功能
- `JWT_SECRET` - 生產環境必須更改

---

## 🚀 開發環境

### Q: 如何啟動開發環境？

**A**: 最簡單的方式：
```bash
npm run dev
```

這會自動：
1. 啟動 Docker 容器
2. 運行資料庫遷移
3. 啟動所有後端服務
4. 啟動前端應用

### Q: 啟動失敗，如何排查？

**A**: 逐步檢查：

1. **檢查 Docker**:
   ```bash
   docker ps
   docker-compose ps
   ```

2. **檢查端口**:
   ```bash
   ./scripts/core/port-checker.sh
   # 或
   lsof -i :3000  # 檢查特定端口
   ```

3. **查看日誌**:
   ```bash
   docker-compose logs postgres
   docker-compose logs redis
   ```

4. **強制重啟**:
   ```bash
   npm run dev:stop
   ./scripts/dev/start.sh --force
   ```

### Q: 如何只啟動特定服務？

**A**: 有多種方式：

**方式 1 - 只啟動核心服務**:
```bash
npm run dev:core
# 或
./scripts/dev/start.sh --core-only
```

**方式 2 - 使用 Nx 啟動單個服務**:
```bash
nx serve api-gateway
nx serve auth-service
nx serve web
```

**方式 3 - 自訂組合**:
```bash
# 只啟動核心 + 不啟動前端
./scripts/dev/start.sh --core-only --no-web

# 啟動 admin 而不是 web
./scripts/dev/start.sh --admin
```

### Q: 如何停止所有服務？

**A**: 
```bash
npm run dev:stop

# 同時停止 Docker
npm run dev:stop -- --docker

# 並清理日誌
npm run dev:stop -- --clean-logs
```

### Q: 服務啟動很慢，如何加速？

**A**: 新腳本系統已經優化了啟動速度（並行啟動），但還可以：

1. **跳過已運行的 Docker**:
   ```bash
   ./scripts/dev/start.sh --skip-docker
   ```

2. **只啟動需要的服務**:
   ```bash
   ./scripts/dev/start.sh --core-only
   ```

3. **使用 SSD** 和 **分配更多 Docker 資源**

---

## 🧪 測試

### Q: 如何運行測試？

**A**: 

**單元測試**:
```bash
npm run test:unit
```

**E2E 測試**:
```bash
npm run test:e2e
```

**整合測試**:
```bash
npm run test:integration
```

**覆蓋率報告**:
```bash
npm run test:coverage --open
```

### Q: 如何測試特定項目？

**A**:
```bash
# 只測試 api-gateway
npm run test:unit -- api-gateway

# 只測試 auth-service
npm run test:unit -- auth-service
```

### Q: 如何在監聽模式下運行測試？

**A**:
```bash
npm run test:unit -- --watch
```

保存文件時會自動重新運行測試。

### Q: E2E 測試失敗，如何調試？

**A**: 

1. **使用調試模式**:
   ```bash
   npm run test:e2e -- --headed --debug
   ```

2. **查看瀏覽器**:
   ```bash
   npm run test:e2e -- --headed
   ```

3. **不自動啟動服務**（假設服務已運行）:
   ```bash
   npm run test:e2e -- --no-start
   ```

4. **查看 Playwright 報告**:
   ```bash
   npm run e2e:report
   ```

### Q: 如何更新測試快照？

**A**:
```bash
npm run test:e2e -- --update-snapshots
```

---

## 💾 資料庫

### Q: 如何運行資料庫遷移？

**A**:
```bash
npm run db:migrate
```

### Q: 如何回滾遷移？

**A**:
```bash
npm run db:migrate -- --rollback
```

### Q: 如何預覽遷移而不實際執行？

**A**:
```bash
npm run db:migrate -- --dry-run
```

### Q: 如何載入測試資料？

**A**:
```bash
npm run db:seed
```

強制重新載入（清除現有資料）:
```bash
npm run db:seed -- --force
```

### Q: 如何備份資料庫？

**A**:
```bash
npm run db:backup
```

備份文件會保存在 `backups/` 目錄。

### Q: 如何重置整個資料庫？

**A**:
```bash
npm run dev:reset -- --db
```

⚠️ **警告**: 這會刪除所有資料！

完全重置（包含 Redis、Kafka）:
```bash
npm run dev:reset -- --all
```

### Q: 如何直接連接到資料庫？

**A**:

**使用 psql**:
```bash
# 本地 Docker PostgreSQL
psql -h localhost -p 5432 -U postgres -d suggar_daddy

# 或使用環境變數
docker-compose exec postgres psql -U postgres suggar_daddy
```

**使用 GUI 工具** (如 pgAdmin, DBeaver):
- Host: localhost
- Port: 5432
- User: postgres
- Password: postgres
- Database: suggar_daddy

---

## 🔨 建置和部署

### Q: 如何建置項目？

**A**:
```bash
# 建置所有項目
npm run build:all

# 只建置後端
npm run build:backend

# 只建置前端
npm run build:frontend
```

### Q: 如何生產環境建置？

**A**:
```bash
npm run build:all -- --production
```

### Q: 建置失敗，如何排查？

**A**:

1. **清理並重新建置**:
   ```bash
   rm -rf dist
   npm run build:all
   ```

2. **檢查依賴**:
   ```bash
   npm install
   ```

3. **查看詳細輸出**:
   ```bash
   npm run build:all -- --verbose
   ```

---

## 🔧 疑難排解

### Q: 端口被佔用，怎麼辦？

**A**:

**方式 1 - 停止所有服務**:
```bash
npm run dev:stop
```

**方式 2 - 強制重啟**:
```bash
./scripts/dev/start.sh --force
```

**方式 3 - 手動查找並終止進程**:
```bash
# 查找佔用端口的進程
lsof -i :3000

# 終止進程（使用上面找到的 PID）
kill -9 <PID>
```

### Q: Docker 容器無法啟動

**A**:

1. **重啟 Docker**:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

2. **清理 Docker**:
   ```bash
   docker-compose down -v  # 刪除卷
   docker system prune     # 清理未使用資源
   ```

3. **檢查 Docker 狀態**:
   ```bash
   docker-compose ps
   docker-compose logs
   ```

### Q: 依賴安裝失敗

**A**:

1. **清理並重新安裝**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **使用 npm cache clean**:
   ```bash
   npm cache clean --force
   npm install
   ```

3. **檢查 Node 版本**:
   ```bash
   node --version  # 應該 >= 18
   ```

### Q: 前端無法訪問後端 API

**A**:

1. **檢查 API Gateway 是否運行**:
   ```bash
   curl http://localhost:3000/health
   ```

2. **檢查環境變數**:
   ```bash
   cat .env | grep API_GATEWAY
   ```

3. **查看 API Gateway 日誌**:
   ```bash
   nx serve api-gateway
   ```

4. **檢查 CORS 配置**

### Q: Redis 連接失敗

**A**:

1. **檢查 Redis 容器**:
   ```bash
   docker-compose ps redis
   ```

2. **測試 Redis 連接**:
   ```bash
   redis-cli -h localhost -p 6379 ping
   # 應該返回 PONG
   ```

3. **重啟 Redis**:
   ```bash
   docker-compose restart redis
   ```

---

## 📜 腳本系統

### Q: 如何查看腳本的所有選項？

**A**: 所有腳本都支援 `--help`:
```bash
./scripts/dev/start.sh --help
./scripts/test/unit.sh --help
./scripts/db/migrate.sh --help
```

### Q: 如何直接使用腳本而不是 npm scripts？

**A**:
```bash
# 開發環境
./scripts/dev/start.sh
./scripts/dev/stop.sh
./scripts/dev/reset.sh

# 測試
./scripts/test/unit.sh
./scripts/test/e2e.sh

# 建置
./scripts/build/build-all.sh

# 資料庫
./scripts/db/migrate.sh
./scripts/db/seed.sh
./scripts/db/backup.sh
```

直接使用腳本可以獲得更多控制和選項。

### Q: 新腳本和舊腳本有什麼區別？

**A**: 主要改進：

| 特性 | 舊腳本 | 新腳本 |
|------|--------|--------|
| 啟動速度 | 慢（順序） | 快（並行） |
| 等待機制 | sleep | 健康檢查 |
| 錯誤處理 | 不一致 | 統一 |
| 文檔 | 缺乏 | 完整 |
| 日誌 | 混亂 | 彩色結構化 |

詳見: [腳本遷移指南](./SCRIPT_MIGRATION_GUIDE.md)

### Q: 我還能使用舊腳本嗎？

**A**: 可以，舊腳本在 `scripts/legacy/` 目錄。

但**強烈建議使用新腳本**，因為更快、更可靠、更易用。

### Q: 腳本在 Windows 上能用嗎？

**A**:
- ✅ **WSL**: 完美支援（推薦）
- ✅ **Git Bash**: 基本支援
- ❌ **CMD/PowerShell**: 不支援

建議 Windows 用戶使用 WSL。

---

## 🎓 學習資源

### Q: 我是新人，應該從哪裡開始？

**A**: 建議閱讀順序：

1. [快速開始指南](./QUICK_START.md) - 5 分鐘設置
2. [腳本系統指南](../scripts/README.md) - 了解工具
3. [架構文檔](./architecture/README.md) - 理解系統
4. [API 文檔](./api/README.md) - 學習 API
5. [測試指南](./testing/README.md) - 編寫測試

### Q: 哪裡可以找到 API 文檔？

**A**: Swagger 文檔：
- API Gateway: http://localhost:3000/api/docs
- 所有服務文檔: [API 文檔指南](./api/README.md)

### Q: 如何貢獻代碼？

**A**: 
1. Fork 項目
2. 創建分支: `git checkout -b feature/my-feature`
3. 提交變更: `git commit -m "Add my feature"`
4. 推送分支: `git push origin feature/my-feature`
5. 創建 Pull Request

---

## 🆘 獲取幫助

### Q: 我找不到問題的答案，怎麼辦？

**A**: 多種方式獲取幫助：

1. **查看文檔**:
   - [文檔索引](./INDEX.md)
   - [腳本指南](../scripts/README.md)
   - [DevOps 指南](./devops/README.md)

2. **聯繫團隊**:
   - 💬 Slack: `#dev-support`
   - 📧 Email: dev-team@example.com
   - 📝 GitHub Issues

3. **查看日誌**:
   - Docker 日誌: `docker-compose logs`
   - 應用日誌: `logs/` 目錄
   - 錯誤日誌: `/tmp/suggar-daddy-logs/`

### Q: 如何報告 Bug？

**A**: 
1. 在 GitHub 創建 Issue
2. 包含以下信息：
   - 問題描述
   - 重現步驟
   - 預期行為
   - 實際行為
   - 環境信息（OS, Node 版本等）
   - 相關日誌

### Q: 如何建議改進？

**A**:
1. GitHub Issue 或 Discussion
2. 團隊 Slack 頻道
3. 直接聯繫技術主管

---

## 📚 相關文檔

- [快速開始](./QUICK_START.md)
- [腳本遷移指南](./SCRIPT_MIGRATION_GUIDE.md)
- [最佳實踐](./BEST_PRACTICES.md)
- [測試報告](../PHASE_B_TEST_REPORT.md)
- [文檔索引](./INDEX.md)

---

**還有問題？** 隨時在 Slack 或 GitHub 提問！我們隨時準備幫助。 🚀
