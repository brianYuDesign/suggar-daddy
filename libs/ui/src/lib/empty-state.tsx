'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from './utils';

export interface EmptyStateProps {
  /** 圖標組件 */
  icon: LucideIcon;
  /** 標題 */
  title: string;
  /** 描述文字 */
  description?: string;
  /** 操作按鈕或連結 */
  action?: React.ReactNode;
  /** 自定義類名 */
  className?: string;
  /** 圖標大小 */
  iconSize?: 'sm' | 'md' | 'lg';
}

const iconSizes = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
};

const iconBgSizes = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

/**
 * 空狀態組件
 * 用於顯示列表為空、無搜尋結果、無數據等情況
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  iconSize = 'md',
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
      role="status"
      aria-live="polite"
    >
      {/* 圖標背景 */}
      <div
        className={cn(
          'mb-4 rounded-full bg-gray-100',
          iconBgSizes[iconSize]
        )}
      >
        <Icon
          className={cn('text-gray-400', iconSizes[iconSize])}
          aria-hidden="true"
        />
      </div>

      {/* 標題 */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {title}
      </h3>

      {/* 描述 */}
      {description && (
        <p className="max-w-sm text-sm text-gray-500 mb-6">
          {description}
        </p>
      )}

      {/* 操作按鈕 */}
      {action && <div>{action}</div>}
    </div>
  );
}
