# 📚 文檔目錄

Sugar Daddy 專案的完整文檔索引。

## 📂 目錄結構

### 🏗️ 架構與技術

- **[architecture/](./architecture/)** - 系統架構設計文檔
  - ADR (Architecture Decision Records)
  - 架構審查報告
  - 擴展性分析
  - 技術債務追蹤

- **[technical/](./technical/)** - 技術實作文檔
  - API 設計
  - 系統部署
  - 開發指南
  - Circuit Breaker、Rate Limiting 等技術細節

### 👥 團隊文檔

- **[backend/](./backend/)** - 後端開發文檔
- **[frontend/](./frontend/)** - 前端開發文檔
- **[devops/](./devops/)** - DevOps 與基礎設施
- **[qa/](./qa/)** - 測試與品質保證
- **[pm/](./pm/)** - 專案管理文檔
- **[shared/](./shared/)** - 跨團隊共享文檔

### 📖 指南與最佳實踐

- **[guides/](./guides/)** - 操作指南
  - 快速開始
  - 最佳實踐
  - FAQ
  - 部署指南
  - 遷移指南

### 📊 報告與總結

- **[reports/](./reports/)** - 各類報告
  - `backend/` - 後端報告
  - `frontend/` - 前端報告
  - `qa/` - QA 測試報告
  - `devops/` - DevOps 報告
  - 專案執行報告
  - 上線前審查報告

- **[summaries/](./summaries/)** - 階段總結
  - Phase A/B 總結
  - 各團隊進度摘要
  - 任務完成總結

## 🚀 快速導航

### 新手入門
1. [快速開始](./guides/QUICK_START.md)
2. [開發指南](./technical/development.md)
3. [FAQ](./guides/FAQ.md)

### 開發者
- [API 文檔](./technical/api.md)
- [架構概覽](./technical/architecture.md)
- [最佳實踐](./guides/BEST_PRACTICES.md)

### 部署與維運
- [部署指南](./technical/deployment.md)
- [監控告警](./devops/MONITORING_ALERTING_SETUP.md)
- [災難恢復](./devops/DISASTER_RECOVERY.md)

### 專案管理
- [上線檢查清單](./pm/LAUNCH_CHECKLIST.md)
- [營運手冊](./pm/OPERATIONS_MANUAL.md)
- [專案進度](./pm/PROGRESS.md)

## 📝 文檔維護原則

1. **根目錄保持乾淨** - 只保留 README.md 和 CLAUDE.md
2. **分類明確** - 按照功能和團隊分類
3. **命名規範** - 使用描述性名稱，避免重複
4. **定期更新** - 保持文檔與代碼同步
5. **連結有效** - 定期檢查內部連結

## 🔍 搜尋技巧

```bash
# 搜尋特定關鍵字
grep -r "關鍵字" docs/

# 列出所有 README
find docs -name "README.md"

# 列出所有報告
find docs/reports -name "*.md"
```
