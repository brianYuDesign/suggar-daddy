// lib/performance/skeleton.tsx
// 骨架屏組件 - 改進用戶體驗

import React from 'react';

interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  className?: string;
  count?: number;
  animation?: 'pulse' | 'wave';
}

/**
 * 骨架屏組件 - 顯示加載狀態
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'rectangular',
  width = '100%',
  height = 24,
  className = '',
  count = 1,
  animation = 'pulse',
}) => {
  const baseClass = `bg-gray-200 dark:bg-gray-700 animate-${animation}`;
  
  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded',
  };

  const items = Array.from({ length: count }).map((_, i) => (
    <div
      key={i}
      className={`${baseClass} ${variantClasses[variant]} ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
    />
  ));

  return <>{items}</>;
};

/**
 * 卡片骨架屏
 */
export const CardSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 space-y-4">
    <Skeleton height={200} className="rounded-lg" />
    <div className="space-y-2">
      <Skeleton height={24} width="80%" />
      <Skeleton height={16} width="60%" />
      <Skeleton height={16} width="40%" />
    </div>
    <Skeleton height={40} />
  </div>
);

/**
 * 列表骨架屏
 */
export const ListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <div className="space-y-2">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex gap-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton height={16} width="60%" />
          <Skeleton height={14} width="40%" />
        </div>
      </div>
    ))}
  </div>
);

/**
 * 人物卡片骨架屏
 */
export const ProfileCardSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 space-y-4">
    <div className="flex flex-col items-center space-y-3">
      <Skeleton variant="circular" width={100} height={100} />
      <div className="w-full space-y-2 text-center">
        <Skeleton height={20} width="70%" />
        <Skeleton height={14} width="50%" />
      </div>
    </div>
    <Skeleton height={40} />
  </div>
);

/**
 * 網格骨架屏
 */
export const GridSkeleton: React.FC<{ columns?: number; count?: number }> = ({
  columns = 3,
  count = 6,
}) => (
  <div className={`grid grid-cols-${columns} gap-4`}>
    {Array.from({ length: count }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);
