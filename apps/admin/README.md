# Admin (管理後台)

## 📖 簡介

Sugar Daddy 平台的管理後台應用，提供系統管理員全面的管理和監控功能，使用 Next.js 14 App Router + shadcn/ui 構建。

## 🎯 功能說明

- **儀表板**: 平台關鍵指標、圖表、即時數據
- **用戶管理**: 查看、編輯、封禁、刪除用戶
- **內容審核**: 審核貼文、評論、舉報處理
- **創作者管理**: 創作者審核、認證管理
- **財務管理**: 交易記錄、提現審核、收入統計
- **訂閱管理**: 訂閱方案審核、訂閱數據分析
- **系統設定**: 平台配置、手續費設定、功能開關
- **公告管理**: 系統公告、維護通知
- **操作日誌**: 管理員操作記錄、審計追蹤
- **數據報表**: 用戶增長、收入報表、內容統計

## 🚀 端口和技術棧

- **端口**: `4300`
- **框架**: Next.js 14 (App Router)
- **語言**: TypeScript
- **UI 庫**: shadcn/ui (Radix UI + Tailwind)
- **樣式**: Tailwind CSS
- **圖表**: Recharts
- **表格**: TanStack Table (React Table v8)
- **表單**: React Hook Form + Zod
- **狀態管理**: React Query (TanStack Query)
- **HTTP 客戶端**: Axios (透過 `@suggar-daddy/api-client`)

## ⚙️ 環境變數

創建 `.env.local` 檔案：

```bash
# API 端點
NEXT_PUBLIC_API_URL=http://localhost:3000

# Admin API (如果分開)
NEXT_PUBLIC_ADMIN_API_URL=http://localhost:3011

# 應用設定
NEXT_PUBLIC_APP_NAME=Sugar Daddy Admin
NEXT_PUBLIC_APP_URL=http://localhost:4300

# 分析工具 (可選)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Feature Flags
NEXT_PUBLIC_FEATURE_ANALYTICS=true
NEXT_PUBLIC_FEATURE_LOGS=true
```

## 💻 本地開發指令

```bash
# 安裝依賴
npm install

# 啟動開發伺服器
nx serve admin
# 或
npm run dev

# 建置生產版本
nx build admin
# 或
npm run build

# 啟動生產伺服器
npm run start

# Lint 檢查
nx lint admin

# 類型檢查
npm run type-check

# 添加 shadcn/ui 元件
npx shadcn-ui@latest add button
npx shadcn-ui@latest add table
npx shadcn-ui@latest add dialog
```

## 📁 目錄結構

```
apps/admin/
├── app/                      # Next.js 14 App Router
│   ├── (auth)/              # 認證相關
│   │   ├── login/
│   │   └── layout.tsx
│   ├── (dashboard)/         # 主後台
│   │   ├── dashboard/       # 儀表板
│   │   ├── users/           # 用戶管理
│   │   ├── content/         # 內容審核
│   │   ├── creators/        # 創作者管理
│   │   ├── transactions/    # 財務管理
│   │   ├── subscriptions/   # 訂閱管理
│   │   ├── settings/        # 系統設定
│   │   ├── announcements/   # 公告管理
│   │   ├── logs/            # 操作日誌
│   │   ├── reports/         # 數據報表
│   │   └── layout.tsx
│   ├── layout.tsx           # 根 Layout
│   ├── page.tsx             # 首頁 (重定向到 dashboard)
│   └── globals.css
├── components/              # React 元件
│   ├── ui/                  # shadcn/ui 元件
│   ├── dashboard/           # 儀表板元件
│   ├── users/               # 用戶相關元件
│   ├── charts/              # 圖表元件
│   ├── tables/              # 表格元件
│   └── layout/              # Layout 元件
├── lib/                     # 工具函數
│   ├── api-client.ts
│   ├── auth.ts
│   ├── utils.ts
│   └── cn.ts                # className 合併工具
├── hooks/                   # Custom Hooks
│   ├── useAuth.ts
│   ├── useUsers.ts
│   └── useStats.ts
├── types/                   # TypeScript 類型
├── public/                  # 靜態資源
├── components.json          # shadcn/ui 配置
├── next.config.js
├── tailwind.config.js
└── tsconfig.json
```

## 🔐 認證和權限

### Admin 角色檢查

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get('admin_token');
  
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // 驗證是否為 ADMIN 角色
  const user = verifyToken(token);
  if (user.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!login|api|_next/static|_next/image|favicon.ico).*)'],
};
```

## 📊 儀表板元件

### 統計卡片

```typescript
// components/dashboard/StatsCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
}

export function StatsCard({ title, value, change, icon }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <p className="text-xs text-muted-foreground">
            <span className={change >= 0 ? 'text-green-600' : 'text-red-600'}>
              {change >= 0 ? '+' : ''}{change}%
            </span>{' '}
            from last month
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

### 使用範例

```typescript
// app/(dashboard)/dashboard/page.tsx
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Users, DollarSign, FileText, TrendingUp } from 'lucide-react';

export default async function DashboardPage() {
  const stats = await getStats();
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="Total Users"
        value={stats.users.total}
        change={stats.users.growthRate}
        icon={<Users className="h-4 w-4 text-muted-foreground" />}
      />
      <StatsCard
        title="Revenue"
        value={`$${stats.revenue.total.toLocaleString()}`}
        change={stats.revenue.growthRate}
        icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
      />
      <StatsCard
        title="Posts"
        value={stats.content.posts}
        icon={<FileText className="h-4 w-4 text-muted-foreground" />}
      />
      <StatsCard
        title="Active Subs"
        value={stats.subscriptions.active}
        change={stats.subscriptions.growthRate}
        icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
      />
    </div>
  );
}
```

## 📈 圖表元件

```typescript
// components/charts/RevenueChart.tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function RevenueChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Line 
          type="monotone" 
          dataKey="revenue" 
          stroke="#8884d8" 
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

## 🗃️ 數據表格

使用 TanStack Table：

```typescript
// components/tables/UsersTable.tsx
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function UsersTable({ users }) {
  const columns = [
    { accessorKey: 'username', header: 'Username' },
    { accessorKey: 'email', header: 'Email' },
    { accessorKey: 'role', header: 'Role' },
    { accessorKey: 'createdAt', header: 'Joined', cell: ({ getValue }) => 
      new Date(getValue()).toLocaleDateString() 
    },
    { 
      id: 'actions',
      cell: ({ row }) => <UserActions user={row.original} />
    }
  ];
  
  const table = useReactTable({
    data: users,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });
  
  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map(headerGroup => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map(header => (
              <TableHead key={header.id}>
                {flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map(row => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map(cell => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

## 🎨 UI 元件 (shadcn/ui)

### 常用元件

```typescript
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
```

### 使用範例

```typescript
<Dialog>
  <DialogTrigger asChild>
    <Button variant="destructive">Ban User</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Ban User</DialogTitle>
      <DialogDescription>
        Are you sure you want to ban this user?
      </DialogDescription>
    </DialogHeader>
    <form onSubmit={handleBan}>
      <Select name="duration">
        <SelectTrigger>
          <SelectValue placeholder="Duration" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7">7 days</SelectItem>
          <SelectItem value="30">30 days</SelectItem>
          <SelectItem value="permanent">Permanent</SelectItem>
        </SelectContent>
      </Select>
      <Button type="submit">Confirm</Button>
    </form>
  </DialogContent>
</Dialog>
```

## 🔍 搜尋和過濾

```typescript
// components/users/UserFilters.tsx
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

export function UserFilters({ onFilter }) {
  return (
    <div className="flex gap-4">
      <Input 
        placeholder="Search users..." 
        onChange={(e) => onFilter({ search: e.target.value })}
      />
      <Select onValueChange={(role) => onFilter({ role })}>
        <SelectItem value="all">All Roles</SelectItem>
        <SelectItem value="SUBSCRIBER">Subscribers</SelectItem>
        <SelectItem value="CREATOR">Creators</SelectItem>
        <SelectItem value="ADMIN">Admins</SelectItem>
      </Select>
      <Select onValueChange={(status) => onFilter({ status })}>
        <SelectItem value="all">All Status</SelectItem>
        <SelectItem value="active">Active</SelectItem>
        <SelectItem value="banned">Banned</SelectItem>
      </Select>
    </div>
  );
}
```

## 📊 數據導出

```typescript
// lib/export.ts
export function exportToCSV(data: any[], filename: string) {
  const csv = [
    Object.keys(data[0]).join(','),
    ...data.map(row => Object.values(row).join(','))
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
}
```

## 🧪 測試

```bash
# 單元測試
npm run test

# E2E 測試
npm run test:e2e

# 覆蓋率報告
npm run test:coverage
```

## 📦 建置和部署

```bash
# 建置
npm run build

# 部署
vercel deploy --prod
```

## 📚 相關文檔

- [Next.js 文檔](https://nextjs.org/docs)
- [shadcn/ui 文檔](https://ui.shadcn.com/)
- [Tailwind CSS 文檔](https://tailwindcss.com/docs)
- [Recharts 文檔](https://recharts.org/)
- [TanStack Table 文檔](https://tanstack.com/table/latest)
- [Admin Service API](../admin-service/README.md)

## 🤝 依賴服務

- **API Gateway**: API 請求
- **Admin Service**: 管理功能 API

## 🚨 已知問題

- 即時數據更新（WebSocket）待實作
- 批次操作效能待優化
- 進階篩選和搜尋功能待擴充
- 自定義報表功能待開發

## 📝 開發注意事項

1. **權限檢查**: 所有 API 請求都需 ADMIN 角色
2. **敏感操作**: 封禁、刪除等操作需二次確認
3. **操作日誌**: 所有管理操作需記錄
4. **資料驗證**: 使用 Zod schema 驗證表單
5. **載入狀態**: 長時間操作需顯示進度
6. **錯誤處理**: 清楚顯示錯誤訊息
7. **響應式設計**: 確保在不同螢幕尺寸下可用
