# 前端團隊文檔

## 團隊職責

- 用戶介面開發與優化
- 前端架構設計
- 組件庫維護
- 前端測試
- 用戶體驗優化

## 技術棧

- **框架**: Next.js 14 (App Router)
- **樣式**: Tailwind CSS
- **組件庫**: shadcn/ui
- **狀態管理**: React Context + Hooks
- **HTTP 客戶端**: libs/api-client (axios-based)
- **測試**: Jest + React Testing Library

## 專案結構

```
apps/
├── web/              # 用戶前端 (localhost:4200)
└── admin/            # 管理後台 (localhost:4300)

libs/
├── ui/               # 共用 React 組件
└── api-client/       # 型別安全的 API 客戶端
```

## 快速開始

```bash
# 啟動 Web 應用
npm run serve:web

# 啟動 Admin 應用
npm run serve:admin

# 運行前端測試
npm run test -- --project=web
npm run test -- --project=admin

# 構建
npm run build:web
npm run build:admin
```

## 文檔索引

- [測試覆蓋率報告](./test-coverage-report.md)
- [組件開發規範](./component-guidelines.md)
- [UI/UX 問題清單](./ui-ux-issues.md)
- [優化計劃](./optimization-plan.md)
- [業務邏輯驗證](./business-logic-validation.md)

## 聯繫方式

**負責人**: Frontend Developer Agent  
**代碼審查**: Tech Lead
