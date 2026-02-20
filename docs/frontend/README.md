# 前端團隊文檔

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
nx serve web          # 啟動 Web 應用
nx serve admin        # 啟動 Admin 應用
nx test web           # 運行 Web 測試
nx test admin         # 運行 Admin 測試
nx build web          # 構建 Web
nx build admin        # 構建 Admin
```

## 文檔索引

- [UI 組件指南](./UI_COMPONENTS_GUIDE.md)
- [組件開發規範](./component-guidelines.md)
