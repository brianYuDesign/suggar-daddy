'use client';

import React from 'react';
import { cn } from './utils';
import { Card } from './card';
import { ChevronRight } from 'lucide-react';

export interface Column<T> {
  /** 列的唯一鍵 */
  key: string;
  /** 列標題 */
  header: string;
  /** 渲染函數 */
  render: (item: T) => React.ReactNode;
  /** 是否在移動端隱藏 */
  hideOnMobile?: boolean;
  /** 列寬度類名 */
  className?: string;
}

export interface ResponsiveTableProps<T> {
  /** 數據列表 */
  data: T[];
  /** 列定義 */
  columns: Column<T>[];
  /** 獲取行的唯一鍵 */
  getRowKey: (item: T) => string;
  /** 點擊行的回調（移動端） */
  onRowClick?: (item: T) => void;
  /** 加載狀態 */
  isLoading?: boolean;
  /** 空狀態組件 */
  emptyState?: React.ReactNode;
  /** 表格容器類名 */
  className?: string;
  /** 移動端卡片渲染（完全自定義） */
  mobileCard?: (item: T) => React.ReactNode;
}

/**
 * 響應式表格組件
 * 桌面端顯示表格，移動端顯示卡片列表
 */
export function ResponsiveTable<T>({
  data,
  columns,
  getRowKey,
  onRowClick,
  isLoading,
  emptyState,
  className,
  mobileCard,
}: ResponsiveTableProps<T>) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        <span className="sr-only">載入中...</span>
      </div>
    );
  }

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <>
      {/* 桌面版 - 表格 */}
      <div className={cn('hidden md:block overflow-x-auto', className)}>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map(column => (
                <th
                  key={column.key}
                  className={cn(
                    'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                    column.className
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map(item => (
              <tr
                key={getRowKey(item)}
                className={cn(
                  'hover:bg-gray-50 transition-colors',
                  onRowClick && 'cursor-pointer'
                )}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map(column => (
                  <td
                    key={column.key}
                    className={cn(
                      'px-6 py-4 whitespace-nowrap text-sm text-gray-900',
                      column.className
                    )}
                  >
                    {column.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 移動版 - 卡片列表 */}
      <div className="md:hidden space-y-3">
        {data.map(item => (
          <Card
            key={getRowKey(item)}
            className={cn(
              'p-4',
              onRowClick && 'cursor-pointer active:bg-gray-50'
            )}
            onClick={() => onRowClick?.(item)}
          >
            {mobileCard ? (
              mobileCard(item)
            ) : (
              <DefaultMobileCard
                item={item}
                columns={columns}
                showArrow={!!onRowClick}
              />
            )}
          </Card>
        ))}
      </div>
    </>
  );
}

interface DefaultMobileCardProps<T> {
  item: T;
  columns: Column<T>[];
  showArrow: boolean;
}

function DefaultMobileCard<T>({
  item,
  columns,
  showArrow,
}: DefaultMobileCardProps<T>) {
  // 過濾掉在移動端隱藏的列
  const visibleColumns = columns.filter(col => !col.hideOnMobile);

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 space-y-2">
        {visibleColumns.map(column => (
          <div key={column.key}>
            <p className="text-xs text-gray-500 mb-0.5">{column.header}</p>
            <div className="text-sm text-gray-900">{column.render(item)}</div>
          </div>
        ))}
      </div>
      
      {showArrow && (
        <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" aria-hidden="true" />
      )}
    </div>
  );
}

/**
 * 簡單的表格加載骨架屏
 */
export function ResponsiveTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {/* 桌面版骨架屏 */}
      <div className="hidden md:block">
        <div className="animate-pulse space-y-4">
          {Array.from({ length: rows }).map((_, idx) => (
            <div key={idx} className="h-12 bg-gray-200 rounded" />
          ))}
        </div>
      </div>

      {/* 移動版骨架屏 */}
      <div className="md:hidden space-y-3">
        {Array.from({ length: rows }).map((_, idx) => (
          <Card key={idx} className="p-4">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
